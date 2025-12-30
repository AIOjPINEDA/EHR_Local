-- ============================================================================
-- ConsultaMed MVP - Datos Iniciales (Seed)
-- ============================================================================

-- Este archivo contiene los datos iniciales necesarios para iniciar el sistema.
-- Ejecutar DESPUÉS de schema.sql

-- ============================================================================
-- MÉDICOS DEL CONSULTORIO
-- ============================================================================
INSERT INTO practitioners (
  identifier_value,
  name_given,
  name_family,
  qualification_code,
  telecom_email,
  active
) VALUES 
(
  '282886589',
  'Sara Isabel',
  'Muñoz Mejía',
  'Medicina Familiar y Comunitaria',
  'sara@consultamed.es',
  true
),
(
  '282888890',
  'Jaime A.',
  'Pineda Moreno',
  'Medicina de Urgencias',
  'jaime@consultamed.es',
  true
)
ON CONFLICT (identifier_value) DO UPDATE SET
  telecom_email = EXCLUDED.telecom_email;

-- ============================================================================
-- TEMPLATES DE TRATAMIENTO INICIALES
-- Basados en las patologías más frecuentes
-- ============================================================================
INSERT INTO treatment_templates (
  name, 
  diagnosis_text, 
  diagnosis_code, 
  medications, 
  instructions, 
  is_favorite
) VALUES
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
),
(
  'Gastroenteritis aguda adulto',
  'Gastroenteritis aguda',
  'A09',
  '[
    {"medication": "Suero oral hiposódico", "dosage": "Beber a pequeños sorbos frecuentes", "duration": "2-3 días"},
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas si fiebre", "duration": "3 días"}
  ]'::jsonb,
  'Dieta astringente (arroz, zanahoria, manzana). Evitar lácteos y grasas. Consultar si vómitos persistentes o sangre en heces.',
  true
),
(
  'Lumbalgia mecánica',
  'Lumbalgia',
  'M54.5',
  '[
    {"medication": "Ibuprofeno 600mg", "dosage": "1 comprimido cada 8 horas", "duration": "5-7 días"},
    {"medication": "Paracetamol 1g", "dosage": "1 comprimido cada 8 horas alternando con ibuprofeno si necesario", "duration": "5 días"},
    {"medication": "Diazepam 5mg", "dosage": "1 comprimido por la noche", "duration": "5 días"}
  ]'::jsonb,
  'Reposo relativo. Evitar esfuerzos. Aplicar calor local. Consultar si dolor irradiado a piernas o pérdida de fuerza.',
  true
),
(
  'Otitis media aguda adulto',
  'Otitis media aguda',
  'H66',
  '[
    {"medication": "Amoxicilina/Clavulánico 875/125mg", "dosage": "1 comprimido cada 8 horas", "duration": "7 días"},
    {"medication": "Ibuprofeno 600mg", "dosage": "1 comprimido cada 8 horas si dolor", "duration": "3-5 días"}
  ]'::jsonb,
  'No introducir agua en oído. Consultar si fiebre alta o supuración.',
  false
),
(
  'Dermatitis alérgica',
  'Dermatitis de contacto alérgica',
  'L23',
  '[
    {"medication": "Cetirizina 10mg", "dosage": "1 comprimido al día", "duration": "7-10 días"},
    {"medication": "Hidrocortisona crema 1%", "dosage": "Aplicar 2 veces al día en zona afectada", "duration": "7 días"}
  ]'::jsonb,
  'Evitar rascado. Identificar y evitar el alérgeno causante. Usar ropa de algodón.',
  false
),
(
  'Ansiedad leve-moderada',
  'Trastorno de ansiedad',
  'F41',
  '[
    {"medication": "Alprazolam 0.25mg", "dosage": "1 comprimido cada 12 horas si necesario", "duration": "2 semanas"},
    {"medication": "Hidroxizina 25mg", "dosage": "1 comprimido por la noche si insomnio", "duration": "2 semanas"}
  ]'::jsonb,
  'Técnicas de relajación. Evitar cafeína y alcohol. Valorar derivación a salud mental si persiste.',
  false
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN SEED DATA
-- ============================================================================
