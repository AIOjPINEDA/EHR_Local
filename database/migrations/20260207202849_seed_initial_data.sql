-- ============================================================================
-- DATOS INICIALES: Practitioners con password hash
-- Password: piloto2026 (bcrypt hash)
-- ============================================================================

INSERT INTO practitioners (
  identifier_value,
  name_given,
  name_family,
  qualification_code,
  telecom_email,
  password_hash
) VALUES 
(
  '282886589',
  'Sara Isabel',
  'Muñoz Mejía',
  'Medicina Familiar y Comunitaria',
  'sara@consultamed.es',
  '$2b$12$wbGUiLX75v0buQJbIh1vQ.7lrFqZep1/TaaAwNeNSjXUD/dKnK65W'
),
(
  '282888890',
  'Jaime A.',
  'Pineda Moreno',
  'Medicina de Urgencias',
  'jaime@consultamed.es',
  '$2b$12$wbGUiLX75v0buQJbIh1vQ.7lrFqZep1/TaaAwNeNSjXUD/dKnK65W'
);

-- ============================================================================
-- DATOS INICIALES: Treatment Templates
-- ============================================================================

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

-- Pacientes de ejemplo para testing
INSERT INTO patients (identifier_value, name_given, name_family, birth_date, gender, telecom_phone) VALUES
('12345678Z', 'María', 'García López', '1985-03-15', 'female', '612345678'),
('87654321X', 'Juan', 'Martínez Ruiz', '1970-07-22', 'male', '698765432'),
('11223344A', 'Ana', 'Fernández Soto', '1992-11-08', 'female', '655443322');;
