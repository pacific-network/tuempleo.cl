-- ======================================================
-- Seed: Regiones de Chile (vigente post-2018)
-- Motor: MySQL / MariaDB
-- Fuente: División político-administrativa actual
-- ======================================================

INSERT IGNORE INTO region (id, nombre, zona, activo, orden)
VALUES
  -- =========================
  -- NORTE GRANDE
  -- =========================
  (15, 'Arica y Parinacota', 'norte_grande', 1, 1),
  (1,  'Tarapacá',           'norte_grande', 1, 2),
  (2,  'Antofagasta',        'norte_grande', 1, 3),

  -- =========================
  -- NORTE CHICO
  -- =========================
  (3,  'Atacama',            'norte_chico',  1, 4),
  (4,  'Coquimbo',           'norte_chico',  1, 5),

  -- =========================
  -- ZONA CENTRAL
  -- =========================
  (5,  'Valparaíso',                                    'zona_central', 1, 6),
  (13, 'Metropolitana de Santiago',                     'zona_central', 1, 7),
  (6,  'Libertador General Bernardo O''Higgins',        'zona_central', 1, 8),
  (7,  'Maule',                                         'zona_central', 1, 9),
  (16, 'Ñuble',                                         'zona_central', 1, 10),

  -- =========================
  -- ZONA SUR
  -- =========================
  (8,  'Biobío',            'zona_sur',     1, 11),
  (9,  'La Araucanía',      'zona_sur',     1, 12),
  (14, 'Los Ríos',          'zona_sur',     1, 13),
  (10, 'Los Lagos',         'zona_sur',     1, 14),

  -- =========================
  -- ZONA AUSTRAL
  -- =========================
  (11, 'Aysén del General Carlos Ibáñez del Campo',     'zona_austral', 1, 15),
  (12, 'Magallanes y la Antártica Chilena',             'zona_austral', 1, 16);

-- ======================================================
-- Fin seed regiones
-- ======================================================
