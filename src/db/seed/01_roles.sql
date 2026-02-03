/* src/db/seed/01_roles.sql */-- ======================================================
-- Seed: Roles del sistema
-- Archivo: 01_roles.sql
-- Descripción:
--   Datos transversales del sistema.
--   Este script es IDEMPOTENTE y puede ejecutarse múltiples veces.
-- ======================================================

-- =========================================
-- ROLES
-- =========================================
-- Convención de IDs:
-- 1 = postulante
-- 2 = empleador
-- 3 = administrador
-- =========================================

INSERT INTO role (
    id,
    nombre,
    descripcion
)
VALUES
    (
        1,
        'postulante',
        'Persona que postula a una oferta laboral'
    ),
    (
        2,
        'empleador',
        'Persona que pertenece a una empresa y ofrece empleo'
    ),
    (
        3,
        'administrador',
        'Administrador del sitio'
    )
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- Fin seed roles
-- =========================================
