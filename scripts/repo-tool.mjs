#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
      const stderr = result.stderr.trim();
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
  const localPostgresPort = readIntegerEnv("LOCAL_POSTGRES_PORT", 54329);
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

  const existingContainerId = capture("docker", ["ps", "-aq", "-f", `name=^/${containerName}$`], {
    cwd: REPO_ROOT,
  }).stdout.trim();

  if (existingContainerId) {
    const currentMappedPort = capture(
      "docker",
      [
        "inspect",
        "-f",
        '{{with index .NetworkSettings.Ports "5432/tcp"}}{{(index . 0).HostPort}}{{end}}',
        containerName,
      ],
      { allowFailure: true },
    ).stdout.trim();

    if (!currentMappedPort || currentMappedPort !== String(localPostgresPort)) {
      const currentMappedPortDisplay = currentMappedPort || "<none>";
      console.log(
        `Found existing container '${containerName}' with host port ${currentMappedPortDisplay} (expected: ${localPostgresPort}).`,
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

  if (runBuild) {
    runNpm(["run", "build"], { cwd: FRONTEND_DIR });
  }
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
  default:
    fail(
      "Usage: node scripts/repo-tool.mjs <generate-types|verify-schema-hash|setup-local-db|backend-checks|frontend-checks|test-gate|start-backend|bootstrap|backup|restore|smoke> [options]",
    );
}
