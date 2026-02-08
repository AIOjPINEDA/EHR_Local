-- ============================================================================
-- ConsultaMed MVP - Schema SQL para Supabase/PostgreSQL
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: practitioners
-- ============================================================================
CREATE TABLE practitioners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_value    VARCHAR(20) UNIQUE NOT NULL,
  identifier_system   VARCHAR(100) DEFAULT 'urn:oid:2.16.724.4.9.10.5',
  name_given          VARCHAR(100) NOT NULL,
  name_family         VARCHAR(100) NOT NULL,
  qualification_code  VARCHAR(50),
  telecom_email       VARCHAR(100),
  password_hash       VARCHAR(255) NOT NULL,
  active              BOOLEAN DEFAULT true,
  meta_created_at     TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practitioners_identifier ON practitioners(identifier_value);
CREATE INDEX idx_practitioners_name ON practitioners(name_family, name_given);

-- ============================================================================
-- TABLA: patients
-- ============================================================================
CREATE TABLE patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_value    VARCHAR(20) UNIQUE NOT NULL,
  identifier_system   VARCHAR(100) DEFAULT 'urn:oid:1.3.6.1.4.1.19126.3',
  name_given          VARCHAR(100) NOT NULL,
  name_family         VARCHAR(100) NOT NULL,
  birth_date          DATE NOT NULL,
  gender              VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  telecom_phone       VARCHAR(20),
  telecom_email       VARCHAR(100),
  active              BOOLEAN DEFAULT true,
  meta_created_at     TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at     TIMESTAMPTZ DEFAULT NOW()
);

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
-- TABLA: allergy_intolerances
-- ============================================================================
CREATE TABLE allergy_intolerances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinical_status     VARCHAR(20) DEFAULT 'active' 
                      CHECK (clinical_status IN ('active', 'inactive', 'resolved')),
  type                VARCHAR(20) CHECK (type IN ('allergy', 'intolerance')),
  category            VARCHAR(20) CHECK (category IN ('food', 'medication', 'environment', 'biologic')),
  criticality         VARCHAR(20) CHECK (criticality IN ('low', 'high', 'unable-to-assess')),
  code_text           VARCHAR(200) NOT NULL,
  code_coding_code    VARCHAR(20),
  code_coding_system  VARCHAR(100),
  recorded_date       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allergies_patient ON allergy_intolerances(patient_id);
CREATE INDEX idx_allergies_status ON allergy_intolerances(clinical_status) WHERE clinical_status = 'active';

-- ============================================================================
-- TABLA: encounters
-- ============================================================================
CREATE TABLE encounters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status              VARCHAR(20) DEFAULT 'finished' 
                      CHECK (status IN ('planned', 'in-progress', 'on-hold', 'discharged', 'finished', 'cancelled')),
  class_code          VARCHAR(10) DEFAULT 'AMB',
  subject_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  participant_id      UUID NOT NULL REFERENCES practitioners(id),
  period_start        TIMESTAMPTZ DEFAULT NOW(),
  period_end          TIMESTAMPTZ,
  reason_text         VARCHAR(500),
  note                TEXT
);

CREATE INDEX idx_encounters_subject ON encounters(subject_id);
CREATE INDEX idx_encounters_participant ON encounters(participant_id);
CREATE INDEX idx_encounters_date ON encounters(period_start DESC);
CREATE INDEX idx_encounters_status ON encounters(status);

-- ============================================================================
-- TABLA: conditions
-- ============================================================================
CREATE TABLE conditions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id          UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  code_text             VARCHAR(200) NOT NULL,
  code_coding_code      VARCHAR(20),
  code_coding_system    VARCHAR(100) DEFAULT 'http://hl7.org/fhir/sid/icd-10',
  code_coding_display   VARCHAR(200),
  clinical_status       VARCHAR(20) DEFAULT 'active'
                        CHECK (clinical_status IN ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved')),
  recorded_date         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conditions_subject ON conditions(subject_id);
CREATE INDEX idx_conditions_encounter ON conditions(encounter_id);
CREATE INDEX idx_conditions_code ON conditions(code_coding_code) WHERE code_coding_code IS NOT NULL;

-- ============================================================================
-- TABLA: medication_requests
-- ============================================================================
CREATE TABLE medication_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status                VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active', 'on-hold', 'ended', 'stopped', 'completed', 'cancelled', 'draft')),
  intent                VARCHAR(20) DEFAULT 'order'
                        CHECK (intent IN ('proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option')),
  subject_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id          UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  requester_id          UUID NOT NULL REFERENCES practitioners(id),
  medication_text       VARCHAR(200) NOT NULL,
  medication_code       VARCHAR(20),
  medication_system     VARCHAR(100) DEFAULT 'http://snomed.info/sct',
  dosage_text           VARCHAR(500) NOT NULL,
  dosage_timing_code    VARCHAR(20),
  duration_value        INTEGER,
  duration_unit         VARCHAR(10) CHECK (duration_unit IN ('s', 'min', 'h', 'd', 'wk', 'mo', 'a')),
  authored_on           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medrequests_subject ON medication_requests(subject_id);
CREATE INDEX idx_medrequests_encounter ON medication_requests(encounter_id);
CREATE INDEX idx_medrequests_date ON medication_requests(authored_on DESC);

-- ============================================================================
-- TABLA: treatment_templates
-- ============================================================================
CREATE TABLE treatment_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  diagnosis_text        VARCHAR(200),
  diagnosis_code        VARCHAR(20),
  medications           JSONB NOT NULL DEFAULT '[]',
  instructions          TEXT,
  is_favorite           BOOLEAN DEFAULT false,
  sort_order            INTEGER DEFAULT 0,
  practitioner_id       UUID REFERENCES practitioners(id),
  meta_created_at       TIMESTAMPTZ DEFAULT NOW(),
  meta_updated_at       TIMESTAMPTZ DEFAULT NOW()
);

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
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE patients IS 'FHIR Patient - Datos demográficos del paciente';
COMMENT ON TABLE practitioners IS 'FHIR Practitioner - Profesionales sanitarios';
COMMENT ON TABLE encounters IS 'FHIR Encounter - Consultas/visitas médicas';
COMMENT ON TABLE conditions IS 'FHIR Condition - Diagnósticos clínicos';
COMMENT ON TABLE medication_requests IS 'FHIR MedicationRequest - Prescripciones';
COMMENT ON TABLE allergy_intolerances IS 'FHIR AllergyIntolerance - Alergias';
COMMENT ON TABLE treatment_templates IS 'Templates de tratamiento';;
