#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend");
const FRONTEND_OPENAPI = path.join(FRONTEND_DIR, "openapi.json");
const FRONTEND_HASH = path.join(FRONTEND_DIR, ".openapi-hash");
const FRONTEND_TYPES = path.join(FRONTEND_DIR, "src", "types", "api.generated.ts");
const IS_WINDOWS = process.platform === "win32";
// Must match the bind address published in docker-compose.yml.
const LOCAL_POSTGRES_BIND_IP = "127.0.0.1";
const SLEEP_STATE = new Int32Array(new SharedArrayBuffer(4));

const [command, ...restArgs] = process.argv.slice(2);

function fail(message, exitCode = 1) {
  console.error(message);
  process.exit(exitCode);
}

function execute(commandName, args, options = {}) {
  // When input is provided but output is inherited, stdin must be an explicit
  // pipe so the child process sees EOF once the input is consumed.  On Windows
  // the shorthand "inherit" keeps all three streams attached to the console and
  // the stdin pipe never closes, which hangs commands like `docker exec -i psql`.
  let stdio = options.captureOutput ? "pipe" : "inherit";
  if (!options.captureOutput && options.input !== undefined) {
    stdio = ["pipe", "inherit", "inherit"];
  }

  // Default to utf8 when capturing text; callers needing raw bytes (e.g.
  // pg_dump output for gzip) pass encoding: "buffer".
  let encoding;
  if (options.encoding) {
    encoding = options.encoding === "buffer" ? undefined : options.encoding;
  } else if (options.captureOutput) {
    encoding = "utf8";
  }

  const result = spawnSync(commandName, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: options.shell ?? false,
    stdio,
    encoding,
    input: options.input,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
  });

  if (result.error) {
    // A spawn error (e.g. ENOENT for a missing binary) must honour allowFailure
    // so callers like probe()/resolvePython() can try the next candidate instead
    // of aborting the whole process. On Windows the .venv/Scripts path exists so
    // this path never triggered; on macOS the first candidate is absent.
    if (options.allowFailure) {
      return result;
    }
    fail(`Failed to execute ${commandName}: ${result.error.message}`);
  }

  if (!options.allowFailure && result.status !== 0) {
    if (options.captureOutput && result.stderr) {
      // With encoding: "buffer" (used by backup/pg_dump) stderr is a Buffer, which
      // has no .trim(). Calling it threw a TypeError that replaced the real
      // failure message with a Node stack trace, hiding why the backup failed.
      const stderr = result.stderr.toString().trim();
      if (stderr) {
        console.error(stderr);
      }
    }
    process.exit(result.status ?? 1);
  }

  return result;
}

function run(commandName, args, options = {}) {
  execute(commandName, args, options);
}

function capture(commandName, args, options = {}) {
  const result = execute(commandName, args, {
    ...options,
    allowFailure: options.allowFailure ?? false,
    captureOutput: true,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function probe(commandName, args, cwd = REPO_ROOT) {
  const result = capture(commandName, args, {
    cwd,
    allowFailure: true,
  });

  return result.status === 0;
}

function sleepMs(milliseconds) {
  Atomics.wait(SLEEP_STATE, 0, 0, milliseconds);
}

function readIntegerEnv(name, fallback) {
  const rawValue = process.env[name] ?? String(fallback);

  if (!/^\d+$/.test(rawValue)) {
    fail(`${name} must be an integer (current: ${rawValue})`);
  }

  return Number.parseInt(rawValue, 10);
}

/**
 * Windows reserves blocks of TCP ports for Hyper-V/WinNAT (see
 * `netsh interface ipv4 show excludedportrange protocol=tcp`). The reserved
 * blocks are chosen dynamically at boot from the ephemeral range (49152-65535),
 * so a host port in that range can silently become unbindable after a reboot and
 * Docker then fails with a bare "access permissions" error. Returns the matching
 * excluded range, or null.
 */
function findWindowsExcludedRange(port) {
  if (!IS_WINDOWS) {
    return null;
  }

  const result = capture("netsh", ["interface", "ipv4", "show", "excludedportrange", "protocol=tcp"], {
    allowFailure: true,
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\d+)/);

    if (!match) {
      continue;
    }

    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2], 10);

    if (port >= start && port <= end) {
      return { start, end };
    }
  }

  return null;
}

/**
 * Fail early, and with an actionable message, when the configured host port
 * cannot be published. Without this the user only sees Docker's opaque
 * "An attempt was made to access a socket in a way forbidden by its access
 * permissions" and has no idea the fix is to pick a different port.
 */
function assertHostPortAvailable(port) {
  const excluded = findWindowsExcludedRange(port);

  if (excluded) {
    fail(
      [
        `El puerto ${port} esta reservado por Windows (rango excluido ${excluded.start}-${excluded.end}).`,
        "Windows asigna estos rangos a Hyper-V/WinNAT en cada arranque, por lo que un puerto",
        "por encima de 49152 puede dejar de funcionar tras reiniciar el equipo.",
        "",
        "Solucion: elige un puerto por debajo de 49152 y manten DATABASE_URL en sincronia:",
        "  1. set LOCAL_POSTGRES_PORT=15432   (o edita docker-compose.yml)",
        "  2. actualiza el puerto en backend/.env -> DATABASE_URL",
        "",
        "Rangos reservados actuales: netsh interface ipv4 show excludedportrange protocol=tcp",
      ].join("\n"),
    );
  }

  if (portInUse(port)) {
    const owner = capture("docker", ["ps", "--format", "{{.Names}} {{.Ports}}"], { allowFailure: true })
      .stdout.split(/\r?\n/)
      .find((line) => line.includes(`:${port}->`));

    // Our own database container already holding the port is the normal case.
    if (owner && owner.startsWith("consultamed-db")) {
      return;
    }

    fail(
      [
        `El puerto ${port} ya esta ocupado por otro proceso.`,
        "Comprueba quien lo usa y libera el puerto, o define otro:",
        IS_WINDOWS ? `  netstat -ano | findstr :${port}` : `  lsof -i :${port}`,
        "  set LOCAL_POSTGRES_PORT=<puerto libre>",
      ].join("\n"),
    );
  }
}

/**
 * The host port lives in two places that must agree: LOCAL_POSTGRES_PORT (which
 * docker-compose publishes) and DATABASE_URL in backend/.env (which the backend
 * dials). Drift between them produces a backend that cannot reach a database
 * that is demonstrably running, which is a confusing failure to debug.
 */
function warnOnDatabaseUrlPortDrift(port) {
  const envFile = path.join(BACKEND_DIR, ".env");

  if (!fs.existsSync(envFile)) {
    return;
  }

  const match = fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .map((line) => line.match(/^\s*DATABASE_URL\s*=.*?@[^:/]+:(\d+)\//))
    .find(Boolean);

  if (!match) {
    return;
  }

  const envPort = Number.parseInt(match[1], 10);

  if (envPort !== port) {
    console.warn("");
    console.warn(`AVISO: backend/.env apunta al puerto ${envPort} pero la base de datos se publica en ${port}.`);
    console.warn("El backend no podra conectar hasta que ambos coincidan.");
    console.warn(`Corrige DATABASE_URL en backend/.env para que use el puerto ${port}.`);
    console.warn("");
  }
}

function getPythonCandidates() {
  const candidates = [];
  const envPython = process.env.CONSULTAMED_PYTHON;

  if (envPython) {
    candidates.push({ command: envPython, args: [], label: envPython });
  }

  candidates.push(
    {
      command: path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe"),
      args: [],
      label: "backend/.venv/Scripts/python.exe",
    },
    {
      command: path.join(BACKEND_DIR, ".venv", "bin", "python"),
      args: [],
      label: "backend/.venv/bin/python",
    },
  );

  if (IS_WINDOWS) {
    candidates.push(
      { command: "py", args: ["-3.11"], label: "py -3.11" },
      { command: "py", args: ["-3"], label: "py -3" },
    );
  }

  candidates.push(
    { command: "python3.11", args: [], label: "python3.11" },
    { command: "python3", args: [], label: "python3" },
    { command: "python", args: [], label: "python" },
  );

  return candidates;
}

function resolvePython(requiredImports = []) {
  const importSnippet =
    requiredImports.length === 0
      ? "import sys"
      : requiredImports.map((moduleName) => `import ${moduleName}`).join("; ");

  for (const candidate of getPythonCandidates()) {
    if (probe(candidate.command, [...candidate.args, "-c", importSnippet], BACKEND_DIR)) {
      return candidate;
    }
  }

  const requiredLabel =
    requiredImports.length === 0 ? "usable" : `with imports: ${requiredImports.join(", ")}`;
  fail(`No Python interpreter found ${requiredLabel}. Bootstrap backend/.venv first.`);
}

function pythonHasModule(python, moduleName) {
  return probe(python.command, [...python.args, "-c", `import ${moduleName}`], BACKEND_DIR);
}

function runPython(python, args, options = {}) {
  run(python.command, [...python.args, ...args], options);
}

function quoteForCmd(arg) {
  if (/^[A-Za-z0-9_./:-]+$/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '""')}"`;
}

function runNpm(args, options = {}) {
  if (IS_WINDOWS) {
    run("cmd.exe", ["/d", "/s", "/c", `npm ${args.map(quoteForCmd).join(" ")}`], options);
    return;
  }

  run("npm", args, options);
}

function resolveOpenApiTypesCommand() {
  const cliPath = path.join(FRONTEND_DIR, "node_modules", "openapi-typescript", "bin", "cli.js");

  if (!fs.existsSync(cliPath)) {
    fail("openapi-typescript is not installed in frontend/node_modules. Run npm install in frontend.");
  }

  return {
    command: process.execPath,
    args: [cliPath],
  };
}

function getCurrentSchemaHash() {
  if (!fs.existsSync(FRONTEND_OPENAPI)) {
    fail(`openapi.json not found at ${FRONTEND_OPENAPI}\nRun: npm run generate:types`);
  }

  return createHash("sha256").update(fs.readFileSync(FRONTEND_OPENAPI)).digest("hex");
}

function updateSchemaHash() {
  const currentHash = getCurrentSchemaHash();
  fs.writeFileSync(FRONTEND_HASH, `${currentHash}\n`, "utf-8");
  console.log(`Schema hash updated: ${currentHash.slice(0, 12)}...`);
}

function verifySchemaHash({ update = false } = {}) {
  const currentHash = getCurrentSchemaHash();

  if (update) {
    updateSchemaHash();
    return;
  }

  if (!fs.existsSync(FRONTEND_HASH)) {
    fs.writeFileSync(FRONTEND_HASH, `${currentHash}\n`, "utf-8");
    console.log(`Initial schema hash created: ${currentHash.slice(0, 12)}...`);
    return;
  }

  const storedHash = fs.readFileSync(FRONTEND_HASH, "utf-8").trim();

  if (currentHash !== storedHash) {
    fail(
      [
        "OpenAPI schema has drifted.",
        `Stored:  ${storedHash.slice(0, 12)}...`,
        `Current: ${currentHash.slice(0, 12)}...`,
        "To fix: npm run generate:types",
      ].join("\n"),
    );
  }

  console.log(`OpenAPI schema hash verified: ${currentHash.slice(0, 12)}...`);
}

function exportOpenApi() {
  const python = resolvePython(["fastapi"]);
  runPython(python, ["scripts/export-openapi.py", FRONTEND_OPENAPI], {
    cwd: BACKEND_DIR,
  });
}

function generateTypes() {
  exportOpenApi();

  const typeGenerator = resolveOpenApiTypesCommand();
  run(typeGenerator.command, [...typeGenerator.args, FRONTEND_OPENAPI, "-o", FRONTEND_TYPES], {
    cwd: FRONTEND_DIR,
  });

  updateSchemaHash();
  console.log("Type generation pipeline completed.");
}

function resolveComposeCommand() {
  if (probe("docker", ["compose", "version"])) {
    return { command: "docker", args: ["compose"] };
  }

  if (probe("docker-compose", ["--version"])) {
    return { command: "docker-compose", args: [] };
  }

  fail("Neither 'docker compose' nor 'docker-compose' is available.");
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

function setupLocalDb() {
  const migrationsDir = path.join(REPO_ROOT, "database", "migrations");
  const composeFile = path.join(REPO_ROOT, "docker-compose.yml");
  const containerName = "consultamed-db";
  const dbUser = "postgres";
  const dbName = "consultamed";
  const localPostgresPort = readIntegerEnv("LOCAL_POSTGRES_PORT", 15432);
  const readinessTimeoutSeconds = readIntegerEnv("READINESS_TIMEOUT_SECONDS", 180);
  const readinessIntervalSeconds = 2;

  if (readinessTimeoutSeconds < readinessIntervalSeconds) {
    fail(`READINESS_TIMEOUT_SECONDS must be >= ${readinessIntervalSeconds}`);
  }

  if (!fs.existsSync(migrationsDir)) {
    fail(`Migrations directory not found: ${migrationsDir}`);
  }

  if (!fs.existsSync(composeFile)) {
    fail(`Compose file not found: ${composeFile}`);
  }

  if (!probe("docker", ["--version"])) {
    fail("Docker is not installed or not available in PATH.");
  }

  const compose = resolveComposeCommand();

  if (!probe("docker", ["info"])) {
    fail("Docker daemon is not running. Start Docker Desktop/Engine and try again.");
  }

  assertHostPortAvailable(localPostgresPort);
  warnOnDatabaseUrlPortDrift(localPostgresPort);

  const existingContainerId = capture("docker", ["ps", "-aq", "-f", `name=^/${containerName}$`], {
    cwd: REPO_ROOT,
  }).stdout.trim();

  if (existingContainerId) {
    // Compare the full published endpoint (bind address AND port), not just the
    // port. docker-compose publishes on 127.0.0.1 so the patient database is not
    // reachable from the clinic network; comparing only the port meant an
    // existing container kept an older 0.0.0.0 binding forever.
    const currentMapping = capture(
      "docker",
      [
        "inspect",
        "-f",
        '{{with index .NetworkSettings.Ports "5432/tcp"}}{{(index . 0).HostIp}}:{{(index . 0).HostPort}}{{end}}',
        containerName,
      ],
      { allowFailure: true },
    ).stdout.trim();

    const expectedMapping = `${LOCAL_POSTGRES_BIND_IP}:${localPostgresPort}`;

    if (currentMapping !== expectedMapping) {
      const currentMappingDisplay = currentMapping || "<none>";
      console.log(
        `Found existing container '${containerName}' published on ${currentMappingDisplay} (expected: ${expectedMapping}).`,
      );
      console.log("Recreating container to apply current port mapping...");
      run("docker", ["rm", "-f", containerName]);
      run(compose.command, [...compose.args, "-f", composeFile, "up", "-d", "db"]);
    } else {
      console.log(`Found existing container '${containerName}' (id: ${existingContainerId}). Reusing it.`);
      const existingContainerStatus = capture(
        "docker",
        ["inspect", "-f", "{{.State.Status}}", containerName],
        { allowFailure: true },
      ).stdout.trim() || "unknown";

      if (existingContainerStatus !== "running") {
        console.log(`Starting existing container '${containerName}'...`);
        run("docker", ["start", containerName]);
      }
    }
  } else {
    console.log("Starting PostgreSQL container...");
    run(compose.command, [...compose.args, "-f", composeFile, "up", "-d", "db"]);
  }

  console.log(`Local PostgreSQL host port: ${localPostgresPort}`);
  console.log(`Waiting for database readiness (timeout: ${readinessTimeoutSeconds}s)...`);

  const maxAttempts = Math.floor(readinessTimeoutSeconds / readinessIntervalSeconds);
  let ready = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (probe("docker", ["exec", containerName, "pg_isready", "-U", dbUser, "-d", dbName])) {
      ready = true;
      break;
    }

    if (attempt % 5 === 0) {
      console.log(`Still waiting for PostgreSQL... ${attempt * readinessIntervalSeconds}s elapsed`);
    }

    sleepMs(readinessIntervalSeconds * 1000);
  }

  if (!ready) {
    console.error(`Database did not become ready in time (${readinessTimeoutSeconds}s).`);
    const logs = capture("docker", ["logs", "--tail", "40", containerName], {
      allowFailure: true,
    }).stdout.trim();

    if (logs) {
      console.error("Last container logs:");
      console.error(logs);
    }

    process.exit(1);
  }

  console.log("Ensuring schema_migrations table exists...");
  run(
    "docker",
    ["exec", "-i", containerName, "psql", "-U", dbUser, "-d", dbName, "-v", "ON_ERROR_STOP=1"],
    {
      input: [
        "CREATE TABLE IF NOT EXISTS schema_migrations (",
        "  filename TEXT PRIMARY KEY,",
        "  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        ");",
      ].join("\n"),
    },
  );

  const migrationFiles = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  if (migrationFiles.length === 0) {
    fail(`No SQL migrations found in ${migrationsDir}`);
  }

  console.log(`Found ${migrationFiles.length} migration files.`);

  for (const filename of migrationFiles) {
    const escapedFilename = escapeSqlLiteral(filename);
    const alreadyApplied = capture(
      "docker",
      [
        "exec",
        containerName,
        "psql",
        "-U",
        dbUser,
        "-d",
        dbName,
        "-tAc",
        `SELECT 1 FROM schema_migrations WHERE filename = '${escapedFilename}' LIMIT 1;`,
      ],
      { allowFailure: false },
    ).stdout.trim();

    if (alreadyApplied === "1") {
      console.log(`Skipping already applied migration: ${filename}`);
      continue;
    }

    console.log(`Applying migration: ${filename}`);
    run(
      "docker",
      ["exec", "-i", containerName, "psql", "-U", dbUser, "-d", dbName, "-v", "ON_ERROR_STOP=1"],
      {
        input: fs.readFileSync(path.join(migrationsDir, filename), "utf-8"),
      },
    );

    run("docker", [
      "exec",
      containerName,
      "psql",
      "-U",
      dbUser,
      "-d",
      dbName,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `INSERT INTO schema_migrations (filename) VALUES ('${escapedFilename}') ON CONFLICT (filename) DO NOTHING;`,
    ]);
  }

  console.log("Local database setup complete.");
}

function backendChecks({ runIntegration = false } = {}) {
  const python = resolvePython(["pytest"]);

  runPython(
    python,
    ["-m", "pytest", "tests/unit", "tests/contracts", "-v", "--tb=short", "--ignore=.env"],
    { cwd: BACKEND_DIR },
  );

  if (pythonHasModule(python, "ruff")) {
    runPython(python, ["-m", "ruff", "check", "app", "tests"], { cwd: BACKEND_DIR });
  } else {
    console.log("Skipping ruff: module not available in selected Python.");
  }

  if (pythonHasModule(python, "mypy")) {
    runPython(python, ["-m", "mypy", "app", "--ignore-missing-imports"], { cwd: BACKEND_DIR });
  } else {
    console.log("Skipping mypy: module not available in selected Python.");
  }

  if (runIntegration || process.env.RUN_INTEGRATION === "1") {
    runPython(python, ["-m", "pytest", "tests/integration", "-v", "--tb=short", "--ignore=.env"], {
      cwd: BACKEND_DIR,
    });
  }
}

function frontendChecks({ runBuild = true } = {}) {
  runNpm(["run", "lint"], { cwd: FRONTEND_DIR });
  runNpm(["run", "type-check"], { cwd: FRONTEND_DIR });
  runNpm(["test"], { cwd: FRONTEND_DIR });

  if (!runBuild) {
    return;
  }

  // `next build` and `next dev` write incompatible artefacts into the same
  // frontend/.next directory. Building while a dev server is live leaves that
  // server serving a directory it no longer understands, which surfaces as
  // "missing required error components" or "Cannot find module './819.js'" and
  // reads as "the app stopped working" rather than "the gate broke it".
  if (portInUse(3000)) {
    console.warn("");
    console.warn("AVISO: hay un servidor de desarrollo escuchando en el puerto 3000.");
    console.warn("'npm run build' va a sobrescribir frontend/.next y ese servidor dejara de");
    console.warn("funcionar (error tipico: \"missing required error components\").");
    console.warn("");
    console.warn("  - Para evitarlo: para el dev server, o usa test-gate --skip-build.");
    console.warn("  - Si ya ha pasado: start.bat limpia frontend/.next automaticamente,");
    console.warn("    o ejecuta 'node scripts/repo-tool.mjs clean-frontend-cache'.");
    console.warn("");
  }

  runNpm(["run", "build"], { cwd: FRONTEND_DIR });
}

function testGate({ runIntegration = false, runBuild = true } = {}) {
  backendChecks({ runIntegration });
  frontendChecks({ runBuild });
  verifySchemaHash();
  console.log("Test gate passed.");
}

function resolveGtkBin() {
  // WeasyPrint on Windows needs the GTK3 runtime DLLs on PATH (Pango/cairo/gdk).
  // On macOS/Linux the system/brew libraries are discovered automatically, so
  // this resolves to null and the caller leaves PATH untouched.
  const override = process.env.CONSULTAMED_GTK_BIN;
  if (override) {
    return fs.existsSync(override) ? override : null;
  }

  if (IS_WINDOWS) {
    const defaultGtkBin = "C:\\Program Files\\GTK3-Runtime Win64\\bin";
    if (fs.existsSync(defaultGtkBin)) {
      return defaultGtkBin;
    }
  }

  return null;
}

function startBackend({ reload = false } = {}) {
  const python = resolvePython([]);

  const gtkBin = resolveGtkBin();
  const childEnv = gtkBin
    ? { PATH: `${gtkBin}${path.delimiter}${process.env.PATH ?? ""}` }
    : {};

  // Fail fast if WeasyPrint cannot render: surfacing a missing GTK runtime here
  // beats a 500 error mid-consultation when a prescription PDF is requested.
  const guard = capture(
    python.command,
    [
      ...python.args,
      "-c",
      "import weasyprint; weasyprint.HTML(string='<p>ok</p>').write_pdf()",
    ],
    { cwd: BACKEND_DIR, env: childEnv, allowFailure: true },
  );

  if (guard.status !== 0) {
    const detail = guard.stderr ? guard.stderr.trim().split("\n").pop() : "";
    fail(
      [
        "No se pudo inicializar WeasyPrint (generacion de recetas PDF).",
        "Falta el runtime GTK3 requerido en Windows.",
        "Solucion: instala 'GTK3-Runtime Win64' o define CONSULTAMED_GTK_BIN",
        "apuntando a la carpeta 'bin' de GTK3.",
        detail ? `Detalle: ${detail}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const uvicornArgs = ["-m", "uvicorn", "app.main:app", "--port", "8000"];
  if (reload) {
    uvicornArgs.push("--reload");
  }

  runPython(python, uvicornArgs, { cwd: BACKEND_DIR, env: childEnv });
}

function resolveSystemPython() {
  // Unlike resolvePython() (which targets the existing venv), this finds an
  // interpreter able to CREATE the venv on a fresh machine.
  const candidates = [];

  if (process.env.CONSULTAMED_PYTHON) {
    candidates.push({ command: process.env.CONSULTAMED_PYTHON, args: [] });
  }

  if (IS_WINDOWS) {
    candidates.push({ command: "py", args: ["-3.11"] });
    candidates.push({ command: "py", args: ["-3"] });
  }

  candidates.push(
    { command: "python3.11", args: [] },
    { command: "python3", args: [] },
    { command: "python", args: [] },
  );

  for (const candidate of candidates) {
    if (probe(candidate.command, [...candidate.args, "--version"])) {
      return candidate;
    }
  }

  return null;
}

function bootstrap() {
  console.log("== ConsultaMed bootstrap ==");

  const venvPython = IS_WINDOWS
    ? path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    : path.join(BACKEND_DIR, ".venv", "bin", "python");

  // 1. Backend: venv + dependencies
  if (!fs.existsSync(venvPython)) {
    const systemPython = resolveSystemPython();
    if (!systemPython) {
      fail("No se encontro Python 3.11+. Instala Python 3.11 y vuelve a ejecutar.");
    }
    console.log("[backend] creando entorno virtual (.venv)...");
    run(systemPython.command, [
      ...systemPython.args,
      "-m",
      "venv",
      path.join(BACKEND_DIR, ".venv"),
    ]);
    console.log("[backend] instalando dependencias...");
    run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: BACKEND_DIR });
    run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: BACKEND_DIR });
  } else {
    console.log("[backend] .venv ya existe; omitiendo creacion.");
  }

  // 2. Frontend: node_modules
  if (!fs.existsSync(path.join(FRONTEND_DIR, "node_modules"))) {
    if (!probe("node", ["--version"])) {
      fail("No se encontro Node.js. Instala Node 20+ y vuelve a ejecutar.");
    }
    console.log("[frontend] instalando dependencias (npm install)...");
    runNpm(["install"], { cwd: FRONTEND_DIR });
  } else {
    console.log("[frontend] node_modules ya existe; omitiendo install.");
  }

  // 3. Env files (copy from examples if missing)
  const backendEnv = path.join(BACKEND_DIR, ".env");
  const backendEnvExample = path.join(BACKEND_DIR, ".env.example");
  if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
    fs.copyFileSync(backendEnvExample, backendEnv);
    console.log("[backend] .env creado desde .env.example.");
  } else {
    console.log("[backend] .env ya existe; sin cambios.");
  }

  const frontendEnv = path.join(FRONTEND_DIR, ".env.local");
  if (!fs.existsSync(frontendEnv)) {
    fs.writeFileSync(frontendEnv, "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000\n", "utf-8");
    console.log("[frontend] .env.local creado.");
  } else {
    console.log("[frontend] .env.local ya existe; sin cambios.");
  }

  // 4. Docker (PostgreSQL runtime)
  if (probe("docker", ["--version"])) {
    console.log("[docker] CLI disponible.");
  } else {
    console.log("[docker] AVISO: Docker no detectado. Instala Docker Desktop para la base de datos.");
  }

  // 5. WeasyPrint / GTK runtime (prescription PDFs)
  if (IS_WINDOWS) {
    const gtkBin = resolveGtkBin();
    if (gtkBin) {
      console.log(`[pdf] GTK3 detectado en: ${gtkBin}`);
    } else {
      console.log("[pdf] AVISO: runtime GTK3 no detectado (necesario para recetas PDF).");
      console.log(
        "      Instala 'GTK3-Runtime Win64' o define CONSULTAMED_GTK_BIN apuntando a su carpeta bin.",
      );
    }
    console.log(
      "[deps] Si el backend falla con 'greenlet DLL load failed', instala VC++ redist:",
    );
    console.log("      winget install --id abbodi1406.vcredist --exact --silent");
  } else if (fs.existsSync(venvPython) && !probe(venvPython, ["-c", "import weasyprint"], BACKEND_DIR)) {
    console.log("[pdf] AVISO: WeasyPrint no importable. En macOS: brew install weasyprint");
  } else {
    console.log("[pdf] WeasyPrint disponible.");
  }

  console.log("== bootstrap completado ==");
}

function resolveBackupDir() {
  if (process.env.CONSULTAMED_BACKUP_DIR) {
    return process.env.CONSULTAMED_BACKUP_DIR;
  }
  const home = process.env.HOME || process.env.USERPROFILE || REPO_ROOT;
  return path.join(home, "ConsultaMed-Backups");
}

function ensureDbRunning() {
  if (!probe("docker", ["exec", "consultamed-db", "pg_isready", "-U", "postgres", "-d", "consultamed"])) {
    fail(
      "La base de datos 'consultamed-db' no esta lista. Arranca primero con: setup-local-db.",
    );
  }
}

function backupDb() {
  ensureDbRunning();

  const backupDir = resolveBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const outPath = path.join(backupDir, `consultamed-${stamp}.sql.gz`);

  // pg_dump writes plain SQL to stdout; capture it and gzip in-process so the
  // command works the same on Windows (no shell pipe / gzip dependency).
  // --clean --if-exists makes the dump self-contained for restore onto an
  // existing database (drops objects before recreating them).
  const dump = capture(
    "docker",
    ["exec", "-i", "consultamed-db", "pg_dump", "-U", "postgres", "--clean", "--if-exists", "consultamed"],
    { encoding: "buffer" },
  );

  const compressed = zlib.gzipSync(dump.stdout);
  fs.writeFileSync(outPath, compressed);
  console.log(`Backup creado: ${outPath} (${compressed.length} bytes)`);

  // Rotation: keep the most recent CONSULTAMED_BACKUP_KEEP (default 14).
  const keep = readIntegerEnv("CONSULTAMED_BACKUP_KEEP", 14);
  const backups = fs
    .readdirSync(backupDir)
    .filter((name) => /^consultamed-.*\.sql\.gz$/.test(name))
    .sort();

  if (backups.length > keep) {
    for (const stale of backups.slice(0, backups.length - keep)) {
      fs.unlinkSync(path.join(backupDir, stale));
      console.log(`Backup antiguo eliminado: ${stale}`);
    }
  }
}

function restoreDb() {
  const fileArg = restArgs.find((arg) => !arg.startsWith("--"));
  if (!fileArg) {
    fail("Uso: restore <fichero.sql.gz> [--yes]");
  }
  if (!fs.existsSync(fileArg)) {
    fail(`Fichero de backup no encontrado: ${fileArg}`);
  }
  if (!parseFlag("--yes")) {
    fail(
      "restore SOBRESCRIBE los datos actuales. Repite el comando con --yes para confirmar.",
    );
  }

  ensureDbRunning();

  const sql = zlib.gunzipSync(fs.readFileSync(fileArg)).toString("utf-8");
  run(
    "docker",
    ["exec", "-i", "consultamed-db", "psql", "-U", "postgres", "-d", "consultamed", "-v", "ON_ERROR_STOP=1"],
    { input: sql },
  );
  console.log(`Restauracion completada desde: ${fileArg}`);
}

function smokeCheck() {
  let ok = true;

  // 1. Health endpoint
  const health = capture(
    "curl",
    ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "5", "http://127.0.0.1:8000/health"],
    { allowFailure: true },
  );
  if (health.stdout.trim() === "200") {
    console.log("[smoke] /health: OK (200)");
  } else {
    ok = false;
    console.log(`[smoke] /health: FALLO (codigo: ${health.stdout.trim() || "sin respuesta"})`);
  }

  // 2. WeasyPrint PDF render (verifies GTK wiring)
  const python = resolvePython([]);
  const gtkBin = resolveGtkBin();
  const childEnv = gtkBin
    ? { PATH: `${gtkBin}${path.delimiter}${process.env.PATH ?? ""}` }
    : {};
  const pdf = capture(
    python.command,
    [
      ...python.args,
      "-c",
      "import weasyprint,sys; sys.exit(0 if len(weasyprint.HTML(string='<h1>smoke</h1>').write_pdf())>0 else 1)",
    ],
    { cwd: BACKEND_DIR, env: childEnv, allowFailure: true },
  );
  if (pdf.status === 0) {
    console.log("[smoke] WeasyPrint PDF: OK");
  } else {
    ok = false;
    console.log("[smoke] WeasyPrint PDF: FALLO (revisa el runtime GTK3)");
  }

  if (!ok) {
    process.exit(1);
  }
  console.log("[smoke] Todo OK.");
}

function readStringArg(flag, fallback = null) {
  const index = restArgs.indexOf(flag);

  if (index === -1 || index === restArgs.length - 1) {
    return fallback;
  }

  return restArgs[index + 1];
}

/**
 * Poll an HTTP endpoint until it answers. The Windows launcher previously used
 * fixed `timeout /t 3` waits, which are simultaneously too long on a warm start
 * and far too short on a cold one (first Next.js compile, or a backend waiting
 * on the database). Polling makes the launcher both faster and reliable.
 */
function waitForHttp({ url, timeoutSeconds, label }) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastCode = "sin respuesta";

  process.stdout.write(`Esperando a ${label} `);

  while (Date.now() < deadline) {
    const result = capture(
      "curl",
      ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "3", url],
      { allowFailure: true },
    );

    lastCode = result.stdout.trim() || "sin respuesta";

    if (/^[23]\d\d$/.test(lastCode)) {
      console.log(` OK (${lastCode})`);
      return true;
    }

    process.stdout.write(".");
    sleepMs(1000);
  }

  console.log(` TIMEOUT tras ${timeoutSeconds}s (ultimo codigo: ${lastCode})`);
  return false;
}

/**
 * Report whether something is already listening on a local TCP port.
 *
 * This connects rather than binding. On Windows a bind test is not reliable:
 * sockets opened with SO_REUSEADDR (Node/Next.js, and Docker's port proxy) let a
 * second process bind the same address, so a bind probe reports a busy port as
 * free. A successful connect proves a listener exists.
 *
 * Runs in a child process because sockets are asynchronous while this tool is
 * synchronous. Exit codes: 0 free, 3 listener present.
 */
function portInUse(port) {
  const script = [
    "const net = require('node:net');",
    "const port = Number(process.argv[1]);",
    "const hosts = ['127.0.0.1', '::1'];",
    "let pending = hosts.length;",
    "let found = false;",
    "const done = () => { if (--pending === 0) process.exit(found ? 3 : 0); };",
    "for (const host of hosts) {",
    "  const socket = new net.Socket();",
    "  socket.setTimeout(1500);",
    "  socket.once('connect', () => { found = true; socket.destroy(); done(); });",
    "  socket.once('timeout', () => { socket.destroy(); done(); });",
    "  socket.once('error', () => { socket.destroy(); done(); });",
    "  socket.connect(port, host);",
    "}",
  ].join("");

  const result = execute(process.execPath, ["-e", script, String(port)], {
    allowFailure: true,
    captureOutput: true,
  });

  return result.status === 3;
}

/**
 * `next dev` and `next build` share the .next directory but write incompatible
 * artefacts into it. Running the full gate (which builds) while a dev server is
 * live leaves a production build behind, and the next `npm run dev` then fails
 * with "missing required error components" or "Cannot find module './819.js'".
 * BUILD_ID is only written by a production build, so it is a reliable marker.
 */
function clearStaleNextBuild({ quiet = false } = {}) {
  const nextDir = path.join(FRONTEND_DIR, ".next");

  if (!fs.existsSync(path.join(nextDir, "BUILD_ID"))) {
    return false;
  }

  if (!quiet) {
    console.log("Detectado build de produccion en frontend/.next (rompe 'npm run dev'). Limpiando...");
  }

  fs.rmSync(nextDir, { recursive: true, force: true });
  return true;
}

/**
 * Verify everything the one-click launcher depends on, and say precisely what to
 * do when something is missing, before any service is started.
 */
function preflight() {
  const problems = [];
  const notes = [];

  if (!probe("docker", ["--version"])) {
    problems.push("Docker CLI no disponible en PATH. Instala Docker Desktop.");
  } else if (!probe("docker", ["info"])) {
    problems.push("Docker daemon parado. Abre Docker Desktop y espera a que arranque.");
  } else {
    notes.push("Docker: OK");
  }

  const venvPython = path.join(BACKEND_DIR, ".venv", IS_WINDOWS ? "Scripts" : "bin", IS_WINDOWS ? "python.exe" : "python");

  if (!fs.existsSync(venvPython)) {
    problems.push(`Falta el entorno Python (${venvPython}). Ejecuta scripts\bootstrap.bat.`);
  } else {
    notes.push("Backend venv: OK");
  }

  if (!fs.existsSync(path.join(FRONTEND_DIR, "node_modules"))) {
    problems.push("Falta frontend/node_modules. Ejecuta scripts\bootstrap.bat.");
  } else {
    notes.push("Frontend node_modules: OK");
  }

  if (!fs.existsSync(path.join(BACKEND_DIR, ".env"))) {
    problems.push("Falta backend/.env. Copialo desde backend/.env.example.");
  } else {
    notes.push("backend/.env: OK");
  }

  const localPostgresPort = readIntegerEnv("LOCAL_POSTGRES_PORT", 15432);
  const excluded = findWindowsExcludedRange(localPostgresPort);

  if (excluded) {
    problems.push(
      `El puerto de PostgreSQL ${localPostgresPort} esta reservado por Windows (${excluded.start}-${excluded.end}). ` +
        "Usa LOCAL_POSTGRES_PORT con un valor por debajo de 49152.",
    );
  } else {
    notes.push(`Puerto PostgreSQL ${localPostgresPort}: OK`);
  }

  if (clearStaleNextBuild()) {
    notes.push("frontend/.next: build de produccion obsoleto eliminado");
  }

  for (const [port, service] of [
    [8000, "backend"],
    [3000, "frontend"],
  ]) {
    if (portInUse(port)) {
      notes.push(`AVISO: el puerto ${port} (${service}) ya esta ocupado; probablemente ConsultaMed ya esta arrancado.`);
    }
  }

  for (const note of notes) {
    console.log(`[preflight] ${note}`);
  }

  if (problems.length > 0) {
    console.error("");
    console.error("Preflight FALLIDO:");

    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }

    process.exit(1);
  }

  console.log("[preflight] Todo listo.");
}

function parseFlag(flag) {
  return restArgs.includes(flag);
}

switch (command) {
  case "generate-types":
    generateTypes();
    break;
  case "verify-schema-hash":
    verifySchemaHash({ update: parseFlag("--update") });
    break;
  case "setup-local-db":
    setupLocalDb();
    break;
  case "backend-checks":
    backendChecks({ runIntegration: parseFlag("--integration") });
    break;
  case "frontend-checks":
    frontendChecks({ runBuild: !parseFlag("--skip-build") });
    break;
  case "test-gate":
    testGate({
      runIntegration: parseFlag("--integration"),
      runBuild: !parseFlag("--skip-build"),
    });
    break;
  case "start-backend":
    startBackend({ reload: parseFlag("--reload") });
    break;
  case "bootstrap":
    bootstrap();
    break;
  case "backup":
    backupDb();
    break;
  case "restore":
    restoreDb();
    break;
  case "smoke":
    smokeCheck();
    break;
  case "preflight":
    preflight();
    break;
  case "clean-frontend-cache":
    if (!clearStaleNextBuild()) {
      console.log("frontend/.next no contiene un build de produccion; nada que limpiar.");
    }
    break;
  case "wait-for": {
    const url = readStringArg("--url");

    if (!url) {
      fail("wait-for requiere --url <url>");
    }

    const timeoutSeconds = Number.parseInt(readStringArg("--timeout", "90"), 10);

    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds <= 0) {
      fail("wait-for requiere --timeout <segundos> como entero positivo");
    }

    if (!waitForHttp({ url, timeoutSeconds, label: readStringArg("--label", url) })) {
      process.exit(1);
    }

    break;
  }
  default:
    fail(
      "Usage: node scripts/repo-tool.mjs <generate-types|verify-schema-hash|setup-local-db|backend-checks|frontend-checks|test-gate|start-backend|bootstrap|backup|restore|smoke|preflight|wait-for|clean-frontend-cache> [options]",
    );
}
