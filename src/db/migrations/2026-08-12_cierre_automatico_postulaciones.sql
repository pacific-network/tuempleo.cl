-- ============================================================
-- Cierre automático de postulaciones
-- MariaDB 10.11 / sql_tuempleo_cl
--
-- Objetivo: ninguna postulación queda en silencio. Cuando la oferta
-- termina (expirada / completada / eliminada) o la postulación queda
-- inactiva N días, el sistema la cierra y deja constancia del motivo.
--
-- IMPORTANTE: el deploy a dev NO corre migraciones. Ejecutar a mano.
-- Idempotente: se puede correr más de una vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1) postulacion: motivo y trazabilidad del cierre
-- ------------------------------------------------------------
-- OJO con fecha_actualizacion: si se declara DEFAULT CURRENT_TIMESTAMP, el ALTER
-- estampa la hora de la migración en TODAS las filas existentes, y entonces
-- ninguna postulación histórica se vería inactiva hasta 30 días después.
-- Con DEFAULT NULL las filas viejas quedan en NULL y el COALESCE del servicio
-- cae en fecha_postulacion, que es la antigüedad real.
ALTER TABLE postulacion
  ADD COLUMN IF NOT EXISTS fecha_actualizacion DATETIME NULL
    DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    AFTER fecha_postulacion,
  ADD COLUMN IF NOT EXISTS cierre_motivo
    ENUM('oferta_expirada','vacante_completada','oferta_eliminada','inactividad') NULL
    AFTER estado,
  ADD COLUMN IF NOT EXISTS fecha_cierre DATETIME NULL AFTER cierre_motivo,
  ADD COLUMN IF NOT EXISTS cierre_automatico TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_cierre,
  ADD COLUMN IF NOT EXISTS cierre_notificado_at DATETIME NULL AFTER cierre_automatico;

-- No hace falta backfill: el servicio usa COALESCE(fecha_actualizacion, fecha_postulacion).

-- ------------------------------------------------------------
-- 2) oferta: inicio del periodo de gracia para candidatos avanzados
-- ------------------------------------------------------------
ALTER TABLE oferta
  ADD COLUMN IF NOT EXISTS aviso_cierre_pendientes_at DATETIME NULL;

-- ------------------------------------------------------------
-- 3) Índices para los barridos del cron
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_postulacion_estado_actualizacion
  ON postulacion (estado, fecha_actualizacion);

CREATE INDEX IF NOT EXISTS idx_postulacion_oferta_estado
  ON postulacion (oferta_id, estado);

-- ------------------------------------------------------------
-- 4) Configuración (apagada por defecto; se prende desde el panel admin)
--    notificarEmail arranca en false a propósito: primero medimos el
--    volumen real de cierres antes de mandar un solo correo.
-- ------------------------------------------------------------
INSERT INTO system_config (clave, valor, descripcion, updated_by)
VALUES (
  'CIERRE_AUTOMATICO',
  '{"enabled":false,"diasInactividad":30,"diasGraciaAvanzados":5,"notificarEmail":false,"messageIdCandidato":null,"messageIdEmpleador":null,"maxCorreosPorEjecucion":200}',
  'Cierre automático de postulaciones: activación, plazos y notificación',
  NULL
)
ON DUPLICATE KEY UPDATE clave = clave;
