/* src/db/seed/08_admin.sql */
-- ======================================================
-- Seed: Promover usuario existente a administrador
-- Archivo: 08_admin.sql
-- Descripción:
--   Marca un usuario ya registrado como administrador.
--   Reemplaza 'admin@tuempleo.cl' por el email real.
--   Este script es IDEMPOTENTE y puede ejecutarse múltiples veces.
--
-- ⚠️  REQUISITO: el usuario debe haber hecho login al menos
--     una vez para existir en la tabla `usuario`.
--     Si no existe aún, usa: npm run seed:admin
-- ======================================================

UPDATE usuario
SET isAdmin = true
WHERE email = 'admin@tuempleo.cl';

-- ======================================================
-- Fin seed admin
-- ======================================================
