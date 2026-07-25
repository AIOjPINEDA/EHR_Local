-- Migration: enforce a unique login email per practitioner
-- Purpose: el login busca al profesional por telecom_email. Sin restricción de
--          unicidad, dos perfiles con el mismo email rompen la autenticación
--          (la consulta devolvería varias filas). Necesario ahora que cualquier
--          médico puede darse de alta desde la aplicación.
-- Date: 2026-07-25

-- El backend guarda y compara siempre el email en minúsculas; se normalizan
-- los registros existentes antes de crear el índice.
UPDATE practitioners
SET telecom_email = lower(trim(telecom_email))
WHERE telecom_email IS NOT NULL
  AND telecom_email <> lower(trim(telecom_email));

-- Índice parcial: telecom_email sigue siendo opcional (perfiles históricos
-- pueden no tenerlo), pero si existe debe ser único.
-- Si esta sentencia falla por duplicados, resuélvelos manualmente antes de
-- reintentar: son perfiles que hoy ya no podrían iniciar sesión.
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_email_unique
  ON practitioners (telecom_email)
  WHERE telecom_email IS NOT NULL;

COMMENT ON COLUMN practitioners.telecom_email IS 'Email de acceso (único, en minúsculas)';
