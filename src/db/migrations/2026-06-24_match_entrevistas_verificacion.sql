-- ============================================================================
-- Migración: Calendarización de entrevistas + Verificación de empresas por SMS
--
-- Contexto: backend NestJS/TypeORM. `synchronize` está apagado en producción
-- (src/config/database.ts), por lo que los cambios de esquema se aplican a mano.
-- El motor de "match" (afinidad oferta↔postulante) NO requiere cambios de
-- esquema: solo lee `oferta.data` y `postulante.data` existentes.
--
-- Entorno destino: PRODUCCIÓN — MariaDB 10.11 (base sql_tuempleo_cl)
-- Charset/collation alineados con la convención del proyecto: utf8mb4_unicode_ci
--
-- ⚠️ Antes de correr en producción:
--   1) Backup:  mysqldump sql_tuempleo_cl > backup_pre_entrevistas_verif.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla `entrevista` (Feature 2: calendarización del cierre del proceso)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `entrevista` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `postulacion_id` INT NOT NULL,
  `creado_por` INT NULL,
  `fecha_propuesta` DATETIME NOT NULL,
  `duracion_min` INT NULL DEFAULT 30,
  `modalidad_contacto` ENUM('presencial','telefonica','videollamada','otro') NOT NULL DEFAULT 'presencial',
  `detalle_contacto` TEXT NULL,
  `mensaje` TEXT NULL,
  `estado` ENUM('propuesta','confirmada','reprogramada','cancelada','completada') NOT NULL DEFAULT 'propuesta',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entrevista_postulacion` (`postulacion_id`),
  KEY `idx_entrevista_creado_por` (`creado_por`),
  CONSTRAINT `fk_entrevista_postulacion`
    FOREIGN KEY (`postulacion_id`) REFERENCES `postulacion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_entrevista_creado_por`
    FOREIGN KEY (`creado_por`) REFERENCES `empleador` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2) Insignia de empresa verificada (Feature 3)
-- ----------------------------------------------------------------------------
ALTER TABLE `empresa`
  ADD COLUMN `verificada` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `fecha_verificacion` DATETIME NULL,
  ADD COLUMN `telefono_verificado` VARCHAR(20) NULL;

-- ----------------------------------------------------------------------------
-- 3) Tabla `verificacion_empresa` (códigos SMS de verificación)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `verificacion_empresa` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresa_id` INT NOT NULL,
  `telefono` VARCHAR(20) NOT NULL,
  `codigo` VARCHAR(6) NOT NULL,
  `estado` ENUM('pendiente','verificada','expirada') NOT NULL DEFAULT 'pendiente',
  `intentos` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiraEn` DATETIME NOT NULL,
  `verifiedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_verif_empresa` (`empresa_id`),
  KEY `idx_verif_estado` (`empresa_id`, `estado`),
  CONSTRAINT `fk_verif_empresa`
    FOREIGN KEY (`empresa_id`) REFERENCES `empresa` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
