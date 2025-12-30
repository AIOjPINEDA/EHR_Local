-- ============================================================================
-- ConsultaMed MVP - Schema SQL para Supabase/PostgreSQL
-- Versión: 1.0
-- Fecha: Diciembre 2025
-- Basado en: HL7 FHIR R5 + SQL on FHIR v2
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: practitioners (FHIR Resource: Practitioner)
-- Médicos que usan el sistema
-- ============================================================================
CREATE TABLE practitioners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifier (Nº Colegiado)
  identifier_value    VARCHAR(20) UNIQUE NOT NULL,
  identifier_system   VARCHAR(100) DEFAULT 'urn:oid:2.16.724.4.9.10.5',
  
  -- Name
  name_given          VARCHAR(100) NOT NULL,
  name_family         VARCHAR(100) NOT NULL,
  
  -- Qualification
  qualification_code  VARCHAR(50),  -- Especialidad
  
  -- Telecom
  telecom_email       VARCHAR(100),
  
  -- Status
  active              BOOLEAN DEFAULT true,
  
  -- Meta
  meta_created_at     TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para practitioners
CREATE INDEX idx_practitioners_identifier ON practitioners(identifier_value);
CREATE INDEX idx_practitioners_name ON practitioners(name_family, name_given);

-- ============================================================================
-- TABLA: patients (FHIR Resource: Patient)
-- Pacientes del consultorio
-- ============================================================================
CREATE TABLE patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifier (DNI/NIE)
  identifier_value    VARCHAR(20) UNIQUE NOT NULL,
  identifier_system   VARCHAR(100) DEFAULT 'urn:oid:1.3.6.1.4.1.19126.3',
  
  -- Name
  name_given          VARCHAR(100) NOT NULL,
  name_family         VARCHAR(100) NOT NULL,
  
  -- Demographics
  birth_date          DATE NOT NULL,
  gender              VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  
  -- Telecom
  telecom_phone       VARCHAR(20),
  telecom_email       VARCHAR(100),
  
  -- Status
  active              BOOLEAN DEFAULT true,
  
  -- Meta
  meta_created_at     TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para patients
CREATE INDEX idx_patients_identifier ON patients(identifier_value);
CREATE INDEX idx_patients_name ON patients(name_family, name_given);
CREATE INDEX idx_patients_birth_date ON patients(birth_date);

-- Función para calcular edad
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN DATE_PART('year', AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TABLA: allergy_intolerances (FHIR Resource: AllergyIntolerance)
-- Alergias e intolerancias del paciente
-- ============================================================================
CREATE TABLE allergy_intolerances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Status
  clinical_status     VARCHAR(20) DEFAULT 'active' 
                      CHECK (clinical_status IN ('active', 'inactive', 'resolved')),
  
  -- Type & Category
  type                VARCHAR(20) CHECK (type IN ('allergy', 'intolerance')),
  category            VARCHAR(20) CHECK (category IN ('food', 'medication', 'environment', 'biologic')),
  criticality         VARCHAR(20) CHECK (criticality IN ('low', 'high', 'unable-to-assess')),
  
  -- Code
  code_text           VARCHAR(200) NOT NULL,
  code_coding_code    VARCHAR(20),
  code_coding_system  VARCHAR(100),
  
  -- Meta
  recorded_date       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para allergy_intolerances
CREATE INDEX idx_allergies_patient ON allergy_intolerances(patient_id);
CREATE INDEX idx_allergies_status ON allergy_intolerances(clinical_status) WHERE clinical_status = 'active';

-- ============================================================================
-- TABLA: encounters (FHIR Resource: Encounter)
-- Consultas/visitas médicas
-- ============================================================================
CREATE TABLE encounters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Status & Class
  status              VARCHAR(20) DEFAULT 'finished' 
                      CHECK (status IN ('planned', 'in-progress', 'on-hold', 'discharged', 'finished', 'cancelled')),
  class_code          VARCHAR(10) DEFAULT 'AMB',  -- Ambulatorio
  
  -- References
  subject_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  participant_id      UUID NOT NULL REFERENCES practitioners(id),
  
  -- Period
  period_start        TIMESTAMPTZ DEFAULT NOW(),
  period_end          TIMESTAMPTZ,
  
  -- Reason
  reason_text         VARCHAR(500),  -- Motivo de consulta
  
  -- Note
  note                TEXT
);

-- Índices para encounters
CREATE INDEX idx_encounters_subject ON encounters(subject_id);
CREATE INDEX idx_encounters_participant ON encounters(participant_id);
CREATE INDEX idx_encounters_date ON encounters(period_start DESC);
CREATE INDEX idx_encounters_status ON encounters(status);

-- ============================================================================
-- TABLA: conditions (FHIR Resource: Condition)
-- Diagnósticos clínicos
-- ============================================================================
CREATE TABLE conditions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  subject_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id          UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  
  -- Code (Diagnóstico)
  code_text             VARCHAR(200) NOT NULL,
  code_coding_code      VARCHAR(20),  -- CIE-10
  code_coding_system    VARCHAR(100) DEFAULT 'http://hl7.org/fhir/sid/icd-10',
  code_coding_display   VARCHAR(200),
  
  -- Status
  clinical_status       VARCHAR(20) DEFAULT 'active'
                        CHECK (clinical_status IN ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved')),
  
  -- Meta
  recorded_date         TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conditions
CREATE INDEX idx_conditions_subject ON conditions(subject_id);
CREATE INDEX idx_conditions_encounter ON conditions(encounter_id);
CREATE INDEX idx_conditions_code ON conditions(code_coding_code) WHERE code_coding_code IS NOT NULL;
CREATE INDEX idx_conditions_text ON conditions USING gin(to_tsvector('spanish', code_text));

-- ============================================================================
-- TABLA: medication_requests (FHIR Resource: MedicationRequest)
-- Prescripciones de medicamentos
-- ============================================================================
CREATE TABLE medication_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Status & Intent
  status                VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active', 'on-hold', 'ended', 'stopped', 'completed', 'cancelled', 'draft')),
  intent                VARCHAR(20) DEFAULT 'order'
                        CHECK (intent IN ('proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option')),
  
  -- References
  subject_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id          UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  requester_id          UUID NOT NULL REFERENCES practitioners(id),
  
  -- Medication
  medication_text       VARCHAR(200) NOT NULL,  -- Nombre del medicamento
  medication_code       VARCHAR(20),            -- SNOMED-CT opcional
  medication_system     VARCHAR(100) DEFAULT 'http://snomed.info/sct',
  
  -- Dosage
  dosage_text           VARCHAR(500) NOT NULL,  -- Pauta completa en texto
  dosage_timing_code    VARCHAR(20),            -- TID, BID, QD, etc.
  
  -- Duration
  duration_value        INTEGER,
  duration_unit         VARCHAR(10) CHECK (duration_unit IN ('s', 'min', 'h', 'd', 'wk', 'mo', 'a')),
  
  -- Meta
  authored_on           TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para medication_requests
CREATE INDEX idx_medrequests_subject ON medication_requests(subject_id);
CREATE INDEX idx_medrequests_encounter ON medication_requests(encounter_id);
CREATE INDEX idx_medrequests_date ON medication_requests(authored_on DESC);

-- ============================================================================
-- TABLA: treatment_templates (Simplificación de FHIR PlanDefinition)
-- Plantillas de tratamiento por diagnóstico
-- ============================================================================
CREATE TABLE treatment_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  name                  VARCHAR(100) NOT NULL,
  
  -- Diagnóstico asociado (para autocarga)
  diagnosis_text        VARCHAR(200),
  diagnosis_code        VARCHAR(20),  -- CIE-10
  
  -- Tratamiento (JSONB array de medicamentos)
  -- Estructura: [{ "medication": "...", "dosage": "...", "duration": "..." }, ...]
  medications           JSONB NOT NULL DEFAULT '[]',
  
  -- Indicaciones adicionales
  instructions          TEXT,
  
  -- Organización
  is_favorite           BOOLEAN DEFAULT false,
  sort_order            INTEGER DEFAULT 0,
  
  -- Pertenencia
  practitioner_id       UUID REFERENCES practitioners(id),
  
  -- Meta
  meta_created_at       TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para treatment_templates
CREATE INDEX idx_templates_diagnosis ON treatment_templates(diagnosis_text);
CREATE INDEX idx_templates_diagnosis_code ON treatment_templates(diagnosis_code) WHERE diagnosis_code IS NOT NULL;
CREATE INDEX idx_templates_practitioner ON treatment_templates(practitioner_id);
CREATE INDEX idx_templates_favorite ON treatment_templates(is_favorite) WHERE is_favorite = true;

-- ============================================================================
-- TRIGGERS: Actualización automática de meta_updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_meta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.meta_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_meta_updated_at();

CREATE TRIGGER trg_practitioners_updated
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION update_meta_updated_at();

CREATE TRIGGER trg_templates_updated
  BEFORE UPDATE ON treatment_templates
  FOR EACH ROW EXECUTE FUNCTION update_meta_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Básico para MVP
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergy_intolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_templates ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: usuarios autenticados tienen acceso completo
-- (En producción se refinará para multi-tenant)

CREATE POLICY "Practitioners: authenticated users" ON practitioners
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Patients: authenticated users" ON patients
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allergies: authenticated users" ON allergy_intolerances
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Encounters: authenticated users" ON encounters
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Conditions: authenticated users" ON conditions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MedicationRequests: authenticated users" ON medication_requests
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Templates: authenticated users" ON treatment_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Pacientes con edad calculada
CREATE VIEW v_patients_with_age AS
SELECT 
  p.*,
  calculate_age(p.birth_date) AS age,
  CONCAT(p.name_given, ' ', p.name_family) AS full_name
FROM patients p
WHERE p.active = true;

-- Vista: Consultas con datos de paciente y médico
CREATE VIEW v_encounters_detail AS
SELECT 
  e.id,
  e.period_start,
  e.reason_text,
  e.status,
  p.id AS patient_id,
  CONCAT(p.name_given, ' ', p.name_family) AS patient_name,
  p.identifier_value AS patient_dni,
  calculate_age(p.birth_date) AS patient_age,
  pr.id AS practitioner_id,
  CONCAT(pr.name_given, ' ', pr.name_family) AS practitioner_name
FROM encounters e
JOIN patients p ON e.subject_id = p.id
JOIN practitioners pr ON e.participant_id = pr.id;

-- Vista: Historial clínico de paciente
CREATE VIEW v_patient_history AS
SELECT 
  e.subject_id AS patient_id,
  e.id AS encounter_id,
  e.period_start AS encounter_date,
  c.code_text AS diagnosis,
  c.code_coding_code AS diagnosis_code,
  mr.medication_text,
  mr.dosage_text
FROM encounters e
LEFT JOIN conditions c ON c.encounter_id = e.id
LEFT JOIN medication_requests mr ON mr.encounter_id = e.id
ORDER BY e.period_start DESC;

-- ============================================================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================================================

-- Médicos del consultorio
INSERT INTO practitioners (
  identifier_value,
  name_given,
  name_family,
  qualification_code
) VALUES 
(
  '282886589',
  'Sara Isabel',
  'Muñoz Mejía',
  'Medicina Familiar y Comunitaria'
),
(
  '282888890',
  'Jaime A.',
  'Pineda Moreno',
  'Medicina de Urgencias'
);

-- Templates de tratamiento iniciales (top 5 patologías del Excel)
INSERT INTO treatment_templates (name, diagnosis_text, diagnosis_code, medications, instructions, is_favorite) VALUES
(
  'Catarro común adulto',
  'Catarro común',
  'J00',
  '[
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas", "duration": "5 días"},
    {"medication": "Ibuprofeno 600mg", "dosage": "1 comprimido cada 8 horas si dolor", "duration": "3 días"}
  ]'::jsonb,
  'Reposo relativo. Abundantes líquidos. Consultar si fiebre >38.5°C por más de 48h.',
  true
),
(
  'ITU no complicada adulto',
  'Infección del tracto urinario',
  'N39.0',
  '[
    {"medication": "Fosfomicina 3g", "dosage": "1 sobre en dosis única", "duration": "1 día"},
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas si molestias", "duration": "3 días"}
  ]'::jsonb,
  'Abundante ingesta de líquidos. Consultar si fiebre o dolor lumbar.',
  true
),
(
  'Bronquitis aguda adulto',
  'Bronquitis aguda',
  'J20',
  '[
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas", "duration": "5 días"},
    {"medication": "Acetilcisteína 600mg", "dosage": "1 sobre al día", "duration": "7 días"}
  ]'::jsonb,
  'Evitar tabaco. Abundantes líquidos. Consultar si dificultad respiratoria.',
  true
),
(
  'Conjuntivitis bacteriana',
  'Conjuntivitis aguda',
  'H10',
  '[
    {"medication": "Tobramicina colirio", "dosage": "1 gota cada 4 horas en ojo afectado", "duration": "7 días"}
  ]'::jsonb,
  'No compartir toallas. Lavado de manos frecuente. No usar lentillas durante tratamiento.',
  false
),
(
  'Amigdalitis bacteriana adulto',
  'Amigdalitis aguda',
  'J03',
  '[
    {"medication": "Amoxicilina 500mg", "dosage": "1 cápsula cada 8 horas", "duration": "7 días"},
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas si fiebre o dolor", "duration": "3 días"}
  ]'::jsonb,
  'Completar todo el tratamiento antibiótico aunque mejore. Reposo.',
  true
);

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE patients IS 'FHIR Patient - Datos demográficos del paciente';
COMMENT ON TABLE practitioners IS 'FHIR Practitioner - Profesionales sanitarios';
COMMENT ON TABLE encounters IS 'FHIR Encounter - Consultas/visitas médicas';
COMMENT ON TABLE conditions IS 'FHIR Condition - Diagnósticos clínicos';
COMMENT ON TABLE medication_requests IS 'FHIR MedicationRequest - Prescripciones';
COMMENT ON TABLE allergy_intolerances IS 'FHIR AllergyIntolerance - Alergias';
COMMENT ON TABLE treatment_templates IS 'Simplificación de FHIR PlanDefinition - Templates de tratamiento';

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
