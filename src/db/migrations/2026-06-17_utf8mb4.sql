-- ============================================================================
-- Migración: convertir la base a utf8mb4 (soporte de emojis 🚀 ✨ y demás
-- caracteres de 4 bytes en descripciones de oferta, etc.)
--
-- Contexto: la conexión ya usa charset utf8mb4 (src/config/database.ts), pero
-- las columnas/tablas creadas antes seguían en utf8 (3 bytes), provocando
-- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD ("Incorrect string value: '\xF0\x9F...'")
-- al insertar emojis en `oferta`.`data`.
--
-- Entorno destino: PRODUCCIÓN — MariaDB 10.11.10
-- Collation elegida: utf8mb4_unicode_ci
--   (NO usar utf8mb4_0900_ai_ci: es exclusiva de MySQL 8 y no existe en MariaDB)
--
-- ⚠️ Antes de correr en producción:
--   1) Hacer backup:  mysqldump sql_tuempleo_cl > backup_pre_utf8mb4.sql
--   2) Correr preferentemente en ventana de baja carga (CONVERT TO reescribe
--      la tabla y toma lock metadata mientras dura).
-- ============================================================================

-- Reemplaza el nombre si corre en otra base. En prod es: sql_tuempleo_cl
SET @schema := DATABASE();

-- ----------------------------------------------------------------------------
-- 1) Default de la base (afecta SOLO tablas nuevas, no convierte las existentes)
-- ----------------------------------------------------------------------------
-- Ejecutar manualmente (no admite parámetros):
--   ALTER DATABASE `sql_tuempleo_cl` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2) Fix inmediato y crítico: tabla `oferta` (es la que está fallando hoy)
-- ----------------------------------------------------------------------------
ALTER TABLE `oferta` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3) Resto de tablas: generador de sentencias ALTER para TODAS las tablas que
--    todavía no estén en utf8mb4. Corré este SELECT, revisá la salida y ejecutá
--    las sentencias que devuelve. (Se hace así, y no automático, para que en
--    prod puedas revisar/aplicar tabla por tabla con control.)
-- ----------------------------------------------------------------------------
SELECT CONCAT(
         'ALTER TABLE `', T.TABLE_NAME,
         '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
       ) AS sentencia_alter
FROM information_schema.TABLES T
JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
  ON CCSA.COLLATION_NAME = T.TABLE_COLLATION
WHERE T.TABLE_SCHEMA = @schema
  AND T.TABLE_TYPE = 'BASE TABLE'
  AND CCSA.CHARACTER_SET_NAME <> 'utf8mb4'
ORDER BY T.TABLE_NAME;

-- ----------------------------------------------------------------------------
-- 4) Verificación post-migración: no debería devolver filas. Lista cualquier
--    columna que siga sin utf8mb4.
-- ----------------------------------------------------------------------------
SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema
  AND CHARACTER_SET_NAME IS NOT NULL
  AND CHARACTER_SET_NAME <> 'utf8mb4'
ORDER BY TABLE_NAME, COLUMN_NAME;
