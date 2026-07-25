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
  const encounterSoapSectionsPath = join(
    projectRoot,
    "src",
    "components",
    "encounters",
    "encounter-soap-sections.tsx",
  );
  const encounterSoapSectionsSource = await readFile(encounterSoapSectionsPath, "utf8");
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
  const debouncedValueHookPath = join(projectRoot, "src", "lib", "hooks", "useDebouncedValue.ts");
  const debouncedValueHookSource = await readFile(debouncedValueHookPath, "utf8");
  const patientListComponentPath = join(projectRoot, "src", "components", "patients", "patient-list.tsx");
  const patientListComponentSource = await readFile(patientListComponentPath, "utf8");
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
  const useEncounterFormPath = join(projectRoot, "src", "lib", "hooks", "use-encounter-form.ts");
  const useEncounterFormSource = await readFile(useEncounterFormPath, "utf8");
  const medicationSectionPath = join(projectRoot, "src", "components", "encounters", "medication-section.tsx");
  const medicationSectionSource = await readFile(medicationSectionPath, "utf8");
  const encounterFormActionsPath = join(projectRoot, "src", "components", "encounters", "encounter-form-actions.tsx");
  const encounterFormActionsSource = await readFile(encounterFormActionsPath, "utf8");
  const loginPath = join(projectRoot, "src", "app", "login", "page.tsx");
  const loginSource = await readFile(loginPath, "utf8");
  const registerPagePath = join(projectRoot, "src", "app", "register", "page.tsx");
  const registerPageSource = await readFile(registerPagePath, "utf8");
  const registerFormPath = join(projectRoot, "src", "components", "auth", "register-form.tsx");
  const registerFormSource = await readFile(registerFormPath, "utf8");
  const practitionerPickerPath = join(projectRoot, "src", "components", "auth", "practitioner-picker.tsx");
  const practitionerPickerSource = await readFile(practitionerPickerPath, "utf8");
  const authApiPath = join(projectRoot, "src", "lib", "api", "auth.ts");
  const authApiSource = await readFile(authApiPath, "utf8");
  const authStorePath = join(projectRoot, "src", "lib", "stores", "auth-store.ts");
  const authStoreSource = await readFile(authStorePath, "utf8");
  const apiClientPath = join(projectRoot, "src", "lib", "api", "client.ts");
  const apiClientSource = await readFile(apiClientPath, "utf8");
  const authGuardPath = join(projectRoot, "src", "lib", "hooks", "useAuthGuard.ts");
  const authGuardSource = await readFile(authGuardPath, "utf8");
  const appShellPath = join(projectRoot, "src", "components", "layout", "app-shell.tsx");
  const appShellSource = await readFile(appShellPath, "utf8");
  const sessionBadgePath = join(projectRoot, "src", "components", "layout", "session-badge.tsx");
  const sessionBadgeSource = await readFile(sessionBadgePath, "utf8");
  const activityPagePath = join(projectRoot, "src", "app", "activity", "page.tsx");
  const activityPageSource = await readFile(activityPagePath, "utf8");
  const activityChartPath = join(projectRoot, "src", "components", "activity", "activity-bar-chart.tsx");
  const activityChartSource = await readFile(activityChartPath, "utf8");
  const activitySummaryPath = join(projectRoot, "src", "components", "activity", "activity-summary.tsx");
  const activitySummarySource = await readFile(activitySummaryPath, "utf8");
  const activitySeriesPath = join(projectRoot, "src", "lib", "activity", "series.ts");
  const activitySeriesSource = await readFile(activitySeriesPath, "utf8");
  const compliancePagePath = join(projectRoot, "src", "components", "compliance", "compliance-page.tsx");
  const compliancePageSource = await readFile(compliancePagePath, "utf8");
  const patientSortTogglePath = join(projectRoot, "src", "components", "patients", "patient-sort-toggle.tsx");
  const patientSortToggleSource = await readFile(patientSortTogglePath, "utf8");
  const navItemsPath = join(projectRoot, "src", "lib", "navigation", "primary-nav.ts");
  const navItemsSource = await readFile(navItemsPath, "utf8");

  assert(source.includes("subject_id"), "encounters/[id] debe usar subject_id en el contrato.");
  assert(!source.includes("patient_id:"), "encounters/[id] no debe tipar patient_id en EncounterDetail.");
  assert(
    source.includes("EncounterSoapSections"),
    "encounters/[id] debe renderizar las secciones SOAP vía EncounterSoapSections."
  );
  assert(
    encounterSoapSectionsSource.includes("subjective_text") &&
      encounterSoapSectionsSource.includes("objective_text") &&
      encounterSoapSectionsSource.includes("assessment_text") &&
      encounterSoapSectionsSource.includes("plan_text") &&
      encounterSoapSectionsSource.includes("recommendations_text"),
    "EncounterSoapSections debe incluir todos los campos SOAP en el render."
  );
  assert(
    source.includes("api.downloadPdf(`/prescriptions/${encounterId}/pdf`)"),
    "encounters/[id] debe descargar PDF vía api.downloadPdf con prefijo /api/v1."
  );

  assert(
    useEncounterFormSource.includes("useDebouncedValue"),
    "use-encounter-form hook debe usar debounce para autocompletado."
  );
  assert(
    useEncounterFormSource.includes("useAutocompleteList"),
    "use-encounter-form hook debe usar navegación por teclado en listas de sugerencias."
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
    medicationSectionSource.includes("h-8 w-8") && medicationSectionSource.includes("Eliminar tratamiento"),
    "MedicationSection debe tener control de borrado de tratamiento más grande y claro."
  );
  assert(
    newEncounterSource.includes("Receta para el paciente"),
    "patients/[id]/encounters/new debe mostrar información de receta para el paciente."
  );
  assert(
    encounterFormActionsSource.includes("Guardar y abrir receta para imprimir"),
    "EncounterFormActions debe mostrar flujo visible de receta para impresión."
  );
  assert(
    !encounterFormActionsSource.includes("Guardar y descargar receta PDF"),
    "EncounterFormActions no debe usar acción de descarga como flujo principal."
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
      dashboardSource.includes("Últimos pacientes atendidos"),
    "dashboard debe evitar caja de navegación redundante y abrir con los últimos atendidos."
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
    dashboardSource.includes("<PatientList"),
    "dashboard debe usar componente PatientList reutilizable."
  );
  assert(
    patientsListSource.includes("<PatientList") &&
      patientsListSource.includes("showPhone") &&
      patientsListSource.includes("showActionLink"),
    "patients/page debe usar componente PatientList con showPhone y showActionLink."
  );
  assert(
    patientListComponentSource.includes("href={`/patients/${patient.id}`}") &&
      patientListComponentSource.includes("text-blue-600 hover:text-blue-700"),
    "PatientList debe abrir la ficha al hacer clic en el nombre del paciente."
  );
  assert(
    [dashboardSource, patientsListSource, templatesSource, activityPageSource, compliancePageSource]
      .every((source) => source.includes("<AppShell")),
    "las pantallas autenticadas deben compartir el marco AppShell (marca + navegación + sesión)."
  );
  assert(
    [dashboardSource, patientsListSource, templatesSource].every(
      (source) => !source.includes("<PrimaryNav") && !source.includes("<HospitalBrand"),
    ),
    "ninguna pantalla debe volver a montar su propia cabecera a mano."
  );
  assert(
    appShellSource.includes("<PrimaryNav") && appShellSource.includes("<SessionBadge"),
    "AppShell debe centralizar navegación y sesión activa."
  );
  assert(
    sessionBadgeSource.includes("authStore.logout") &&
      sessionBadgeSource.includes("formatPractitionerName"),
    "la sesión activa debe verse y poder cerrarse desde cualquier pantalla."
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
    patientListComponentSource.includes("Consultas") &&
      patientListComponentSource.includes("Última visita") &&
      patientListComponentSource.includes("last_encounter_at"),
    "PatientList debe mostrar consultas y última visita por paciente."
  );
  assert(
    (patientListComponentSource.match(/text-left font-semibold">Paciente</g) ?? []).length === 1 &&
      !patientListComponentSource.includes('showPhone ? "DNI" : "Paciente"'),
    "PatientList no debe reordenar columnas según showPhone: solo añadir o quitar."
  );
  assert(
    patientListComponentSource.includes("Género") &&
      patientListComponentSource.includes("patient.gender"),
    "PatientList debe mostrar género del paciente en el listado."
  );
  assert(
    patientListComponentSource.includes("formatLastEncounterAge(") &&
      !patientListComponentSource.includes("function formatLastEncounterAge("),
    "PatientList debe reutilizar formatter compartido para última consulta."
  );
  assert(
    patientsDirectorySource.includes("export function formatLastEncounterDate") &&
      patientsDirectorySource.includes("export function formatLastEncounterAge"),
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

  // --- Perfiles profesionales (alta y selección de acceso) ---
  assert(
    !loginSource.includes("AVAILABLE_USERS") && !loginSource.includes("@consultamed.es"),
    "login no debe llevar una lista fija de médicos: los perfiles vienen del backend."
  );
  assert(
    loginSource.includes("fetchAvailablePractitioners") &&
      loginSource.includes("<PractitionerPicker"),
    "login debe cargar los perfiles activos desde la API vía PractitionerPicker."
  );
  assert(
    practitionerPickerSource.includes('href="/register"'),
    "el selector de acceso debe ofrecer el alta de un perfil nuevo."
  );
  assert(
    registerPageSource.includes("<RegisterForm"),
    "register/page debe delegar el formulario en RegisterForm."
  );
  assert(
    registerFormSource.includes("registration_password") &&
      registerFormSource.includes("registerPractitioner"),
    "RegisterForm debe exigir la clave de administración al dar de alta un perfil."
  );
  assert(
    !registerFormSource.includes("Guadalix") && !authApiSource.includes("Guadalix"),
    "la clave de alta nunca debe viajar en el bundle del frontend."
  );
  assert(
    authApiSource.includes("export async function registerPractitioner") &&
      authApiSource.includes("export async function fetchAvailablePractitioners") &&
      authApiSource.includes("export function formatPractitionerName"),
    "lib/api/auth debe centralizar login, alta y presentación de perfiles."
  );
  assert(
    !loginSource.includes("api.postForm") && !dashboardSource.includes("Dr/Dra. {"),
    "las páginas deben usar los helpers de lib/api/auth en vez de armar el contrato a mano."
  );
  assert(
    !authStoreSource.includes("listeners") && !authStoreSource.includes("notify()"),
    "auth-store no debe mantener suscriptores sin consumidores."
  );
  assert(
    apiClientSource.includes("extractErrorDetail") && apiClientSource.includes("Array.isArray(detail)"),
    "el cliente API debe traducir los errores de validación 422 de FastAPI a texto legible."
  );
  assert(
    apiClientSource.includes("export class ApiError") && apiClientSource.includes("response.status"),
    "el cliente API debe propagar el código HTTP para distinguir 401 de un fallo de red."
  );
  assert(
    authGuardSource.includes("fetchCurrentPractitioner") &&
      authGuardSource.includes("error.status !== 401"),
    "useAuthGuard debe cerrar la sesión cuando el backend revoca el perfil, no ante un fallo de red."
  );

  // --- Vista de urgencias: últimos atendidos y panel de actividad ---
  assert(
    patientsDirectorySource.includes('PATIENT_SORT_RECENT = "recent"') &&
      patientsDirectorySource.includes("params.set(\"sort\", sort)"),
    "el constructor de URL del directorio debe soportar el orden por última visita."
  );
  assert(
    patientsListSource.includes("useState<PatientSort>(PATIENT_SORT_RECENT)") &&
      patientsListSource.includes("<PatientSortToggle"),
    "patients/page debe abrir en 'últimos atendidos' y permitir volver al directorio."
  );
  assert(
    patientSortToggleSource.includes("Últimos atendidos") &&
      patientSortToggleSource.includes("Directorio A-Z"),
    "el conmutador debe nombrar ambas vistas del listado."
  );
  assert(
    dashboardSource.includes("PATIENT_SORT_RECENT") && dashboardSource.includes("PATIENT_SORT_NAME"),
    "el dashboard debe listar los últimos atendidos y buscar en todo el directorio."
  );
  assert(
    navItemsSource.includes('href: "/activity"'),
    "la navegación principal debe incluir la pestaña de actividad."
  );
  assert(
    activityPageSource.includes("<ActivitySummary") && activityPageSource.includes("<ActivityBarChart"),
    "la pestaña de actividad debe mostrar totales y series por día y semana."
  );
  assert(
    (activityPageSource.match(/<ActivityBarChart/g) ?? []).length === 2,
    "la actividad debe cubrir la serie diaria y la semanal."
  );
  assert(
    activityPageSource.includes("ACTIVITY_WINDOWS") &&
      activityPageSource.indexOf("ACTIVITY_WINDOWS") < activityPageSource.indexOf("<ActivitySummary"),
    "el filtro de periodo debe ir por encima de todo lo que reescala."
  );
  assert(
    !activityChartSource.includes("Legend") && activityChartSource.includes("#2a78d6"),
    "serie única: un solo color secuencial y sin leyenda."
  );
  assert(
    activityChartSource.includes("Ver datos en tabla"),
    "cada gráfico necesita su equivalente en tabla: el tooltip no puede ser la única vía al dato."
  );
  assert(
    activityChartSource.includes("peakIndex") &&
      activityChartSource.includes("onFocus") &&
      activityChartSource.includes("aria-label"),
    "el gráfico debe etiquetar solo el pico y ser navegable por teclado."
  );
  assert(
    activitySeriesSource.includes("export function niceCeiling") &&
      activitySeriesSource.includes("export function percentDelta"),
    "la aritmética del gráfico debe vivir en helpers puros, fuera del JSX."
  );
  assert(
    !activitySummarySource.includes("text-green-") && !activitySummarySource.includes("text-red-"),
    "más urgencias no es 'bueno' ni 'malo': la variación no lleva color de estado."
  );

  console.log("Frontend contract smoke checks passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
