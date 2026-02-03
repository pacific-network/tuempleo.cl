/* src/db/seed/02_planes.sql */
-- ======================================================
-- Seed: Planes / Tipos de aviso
-- Archivo: 02_planes.sql
-- Descripción:
--   Planes base del sistema (Gratis, Básico, Estándar, Premium)
--   Usados para controlar límites, duración y visibilidad
--   Script IDEMPOTENTE
-- ======================================================

-- ======================================================
-- TABLA: plan
-- Convención:
-- tipo_aviso:
--   0 = GRATIS
--   1 = BASICO
--   2 = ESTANDAR
--   3 = PREMIUM
--
-- prioridad:
--   A mayor número, mayor visibilidad
-- ======================================================

INSERT INTO plan (
    id,
    nombre,
    configuracion,
    precio,
    created_at,
    updated_at,
    activo,
    tipo_aviso,
    prioridad
)
VALUES
-- ======================================================
-- PLAN GRATIS
-- ======================================================
(
    4,
    'Gratis',
    '{
        "cantidad_avisos": 3,
        "duracion_avisos": 30,
        "cantidad_curriculums": 10,
        "cantidad_postulantes": 5,
        "duracion_curriculums": 30,
        "duracion_postulantes": 30,
        "cantidad_postulaciones": 10,
        "duracion_postulaciones": 30
    }'::jsonb,
    0.00,
    now(),
    now(),
    true,
    0,
    10
),

-- ======================================================
-- PLAN BASICO
-- ======================================================
(
    5,
    'Basica',
    '{
        "cantidad_avisos": 9999,
        "duracion_avisos": 45,
        "cantidad_curriculums": 999999,
        "cantidad_postulantes": 999999,
        "duracion_curriculums": 45,
        "duracion_postulantes": 45,
        "cantidad_postulaciones": 999999,
        "duracion_postulaciones": 45
    }'::jsonb,
    80000.00,
    now(),
    now(),
    true,
    1,
    25
),

-- ======================================================
-- PLAN ESTANDAR
-- ======================================================
(
    6,
    'Estandar',
    '{
        "cantidad_avisos": 9999,
        "duracion_avisos": 45,
        "cantidad_curriculums": 999999,
        "cantidad_postulantes": 999999,
        "duracion_curriculums": 45,
        "duracion_postulantes": 45,
        "cantidad_postulaciones": 999999,
        "duracion_postulaciones": 45
    }'::jsonb,
    140000.00,
    now(),
    now(),
    true,
    2,
    50
),

-- ======================================================
-- PLAN PREMIUM
-- ======================================================
(
    7,
    'Premium',
    '{
        "cantidad_avisos": 9999,
        "duracion_avisos": 60,
        "cantidad_curriculums": 999999,
        "cantidad_postulantes": 999999,
        "duracion_curriculums": 60,
        "duracion_postulantes": 60,
        "cantidad_postulaciones": 999999,
        "duracion_postulaciones": 60
    }'::jsonb,
    180000.00,
    now(),
    now(),
    true,
    3,
    100
)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- Fin seed planes
-- ======================================================
