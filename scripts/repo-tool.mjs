#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
  const result = spawnSync(commandName, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: options.shell ?? false,
    stdio: options.captureOutput ? "pipe" : "inherit",
    encoding: options.captureOutput ? "utf8" : undefined,
    input: options.input,
  });

  if (result.error) {
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
  const migrationsDir = path.join(REPO_ROOT, "supabase", "migrations");
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
  default:
    fail(
      "Usage: node scripts/repo-tool.mjs <generate-types|verify-schema-hash|setup-local-db|backend-checks|frontend-checks|test-gate> [options]",
    );
}
