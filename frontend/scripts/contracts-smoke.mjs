import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const encounterPagePath = join(projectRoot, "src", "app", "encounters", "[id]", "page.tsx");
  const source = await readFile(encounterPagePath, "utf8");

  assert(source.includes("subject_id"), "encounters/[id] debe usar subject_id en el contrato.");
  assert(!source.includes("patient_id:"), "encounters/[id] no debe tipar patient_id en EncounterDetail.");
  assert(
    source.includes("api.downloadPdf(`/prescriptions/${encounterId}/pdf`)"),
    "encounters/[id] debe descargar PDF vía api.downloadPdf con prefijo /api/v1."
  );

  console.log("Frontend contract smoke checks passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
