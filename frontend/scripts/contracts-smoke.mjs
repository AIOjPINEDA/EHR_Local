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
  const dashboardPath = join(projectRoot, "src", "app", "dashboard", "page.tsx");
  const dashboardSource = await readFile(dashboardPath, "utf8");
  const patientsListPath = join(projectRoot, "src", "app", "patients", "page.tsx");
  const patientsListSource = await readFile(patientsListPath, "utf8");
  const templatesPath = join(projectRoot, "src", "app", "settings", "templates", "page.tsx");
  const templatesSource = await readFile(templatesPath, "utf8");
  const primaryNavPath = join(projectRoot, "src", "components", "navigation", "primary-nav.tsx");
  const primaryNavSource = await readFile(primaryNavPath, "utf8");
  const patientsDirectoryPath = join(projectRoot, "src", "lib", "patients", "directory.ts");
  const patientsDirectorySource = await readFile(patientsDirectoryPath, "utf8");
  const autocompleteHookPath = join(projectRoot, "src", "lib", "hooks", "useAutocompleteList.ts");
  const autocompleteHookSource = await readFile(autocompleteHookPath, "utf8");
  const newEncounterPath = join(
    projectRoot,
    "src",
    "app",
    "patients",
    "[id]",
    "encounters",
    "new",
    "page.tsx",
  );
  const newEncounterSource = await readFile(newEncounterPath, "utf8");

  assert(source.includes("subject_id"), "encounters/[id] debe usar subject_id en el contrato.");
  assert(!source.includes("patient_id:"), "encounters/[id] no debe tipar patient_id en EncounterDetail.");
  assert(
    source.includes("subjective_text") &&
      source.includes("objective_text") &&
      source.includes("assessment_text") &&
      source.includes("plan_text") &&
      source.includes("recommendations_text"),
    "encounters/[id] debe incluir campos SOAP en el contrato y render."
  );
  assert(
    source.includes("api.downloadPdf(`/prescriptions/${encounterId}/pdf`)"),
    "encounters/[id] debe descargar PDF vía api.downloadPdf con prefijo /api/v1."
  );

  assert(
    newEncounterSource.includes("useDebouncedValue"),
    "patients/[id]/encounters/new debe usar debounce para autocompletado."
  );
  assert(
    newEncounterSource.includes("useAutocompleteList"),
    "patients/[id]/encounters/new debe usar navegación por teclado en listas de sugerencias."
  );
  assert(
    newEncounterSource.includes("diagnosisSuggestions"),
    "patients/[id]/encounters/new debe resolver sugerencias de diagnóstico."
  );
  assert(
    newEncounterSource.includes("medicationSuggestions"),
    "patients/[id]/encounters/new debe resolver sugerencias de medicamentos."
  );
  assert(
    !newEncounterSource.includes("confirmTemplateOverwrite"),
    "patients/[id]/encounters/new no debe bloquear el cambio de template con confirmación."
  );
  assert(
    newEncounterSource.includes("xl:grid-cols-12"),
    "patients/[id]/encounters/new debe optimizar layout SOAP para pantallas anchas."
  );
  assert(
    !newEncounterSource.includes("Expandir") && !newEncounterSource.includes("Contraer"),
    "patients/[id]/encounters/new no debe mostrar botones Expandir/Contraer."
  );
  assert(
    newEncounterSource.includes("max-w-[1400px]"),
    "patients/[id]/encounters/new debe aprovechar mejor pantallas widescreen."
  );
  assert(
    newEncounterSource.includes("h-8 w-8") && newEncounterSource.includes("Eliminar tratamiento"),
    "patients/[id]/encounters/new debe tener control de borrado de tratamiento más grande y claro."
  );
  assert(
    newEncounterSource.includes("Receta para el paciente") &&
      newEncounterSource.includes("Guardar y abrir receta para imprimir"),
    "patients/[id]/encounters/new debe mostrar flujo visible de receta para impresión."
  );
  assert(
    !newEncounterSource.includes("Guardar y descargar receta PDF"),
    "patients/[id]/encounters/new no debe usar acción de descarga como flujo principal."
  );

  assert(
    source.includes("Resumen para receta") &&
      source.includes("Abrir receta para imprimir"),
    "encounters/[id] debe mantener una sección clara de receta para impresión."
  );
  assert(
    (source.match(/Abrir receta para imprimir/g) ?? []).length === 1,
    "encounters/[id] debe renderizar un único botón de receta para evitar redundancia."
  );
  assert(
    !source.includes("Descargar Receta PDF"),
    "encounters/[id] no debe usar texto de descarga para el flujo principal."
  );
  assert(
    !dashboardSource.includes("Centro de navegación clínico") &&
      dashboardSource.includes("Listado rápido de pacientes"),
    "dashboard debe evitar caja de navegación redundante y mantener listado rápido de pacientes."
  );
  assert(
    !dashboardSource.includes("Ver listado completo"),
    "dashboard no debe mostrar botón redundante de listado completo."
  );
  assert(
    !dashboardSource.includes("Abrir ficha"),
    "dashboard no debe mostrar columna redundante de abrir ficha."
  );
  assert(
    dashboardSource.includes(
      "<Link href={`/patients/${patient.id}`} className=\"text-blue-600 hover:text-blue-700\">",
    ),
    "dashboard debe abrir la ficha al hacer clic en el nombre del paciente."
  );
  assert(
    dashboardSource.includes("<PrimaryNav"),
    "dashboard debe renderizar navegación superior reutilizable."
  );
  assert(
    patientsListSource.includes("<PrimaryNav"),
    "patients/page debe usar navegación superior reutilizable."
  );
  assert(
    templatesSource.includes("<PrimaryNav"),
    "settings/templates/page debe usar navegación superior reutilizable."
  );
  assert(
    primaryNavSource.includes("PRIMARY_NAV_ITEMS") &&
      primaryNavSource.includes("Control de navegación"),
    "el componente de navegación primaria debe centralizar rutas y título."
  );
  assert(
    !primaryNavSource.includes("/patients/new"),
    "la navegación superior no debe duplicar botón de nuevo paciente."
  );
  assert(
    dashboardSource.includes("Consultas") &&
      dashboardSource.includes("Última consulta") &&
      dashboardSource.includes("last_encounter_at"),
    "dashboard debe mostrar consultas y última consulta por paciente."
  );
  assert(
    dashboardSource.includes("Género") && dashboardSource.includes("patient.gender"),
    "dashboard debe mostrar género del paciente en el listado."
  );
  assert(
    patientsListSource.includes("Consultas") &&
      patientsListSource.includes("Última consulta") &&
      patientsListSource.includes("last_encounter_at"),
    "patients/page debe mostrar consultas y última consulta por paciente."
  );
  assert(
    patientsListSource.includes("Género") && patientsListSource.includes("patient.gender"),
    "patients/page debe mostrar género del paciente en el listado."
  );
  assert(
    dashboardSource.includes("formatLastEncounterDate(") &&
      !dashboardSource.includes("function formatLastEncounterDate("),
    "dashboard debe reutilizar formatter compartido para última consulta."
  );
  assert(
    patientsListSource.includes("formatLastEncounterDate(") &&
      !patientsListSource.includes("function formatLastEncounterDate("),
    "patients/page debe reutilizar formatter compartido para última consulta."
  );
  assert(
    patientsDirectorySource.includes("export function formatLastEncounterDate"),
    "debe existir un helper compartido para formateo de última consulta."
  );
  assert(
    templatesSource.includes('from "@/types/api"') &&
      !templatesSource.includes("interface Template"),
    "settings/templates debe reutilizar tipos API compartidos."
  );
  assert(
    !autocompleteHookSource.includes("activeItem"),
    "useAutocompleteList no debe exponer estado no utilizado."
  );

  console.log("Frontend contract smoke checks passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
