-- ======================================================
-- Seed: Comunas de Chile (346 comunas - COMPLETO)
-- Motor: MySQL / MariaDB
-- Estrategia: INSERT IGNORE (solo inserta lo que falta)
-- Dependencia: tabla `region` debe estar poblada
-- ======================================================

-- =========================
-- Arica y Parinacota (ID 15) — 4 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Arica', 15, 1, 1),
('Camarones', 15, 1, 2),
('Putre', 15, 1, 3),
('General Lagos', 15, 1, 4);

-- =========================
-- Tarapacá (ID 1) — 7 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Iquique', 1, 1, 1),
('Alto Hospicio', 1, 1, 2),
('Pozo Almonte', 1, 1, 3),
('Camiña', 1, 1, 4),
('Colchane', 1, 1, 5),
('Huara', 1, 1, 6),
('Pica', 1, 1, 7);

-- =========================
-- Antofagasta (ID 2) — 9 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Antofagasta', 2, 1, 1),
('Mejillones', 2, 1, 2),
('Sierra Gorda', 2, 1, 3),
('Taltal', 2, 1, 4),
('Calama', 2, 1, 5),
('Ollagüe', 2, 1, 6),
('San Pedro de Atacama', 2, 1, 7),
('Tocopilla', 2, 1, 8),
('María Elena', 2, 1, 9);

-- =========================
-- Atacama (ID 3) — 9 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Copiapó', 3, 1, 1),
('Caldera', 3, 1, 2),
('Tierra Amarilla', 3, 1, 3),
('Chañaral', 3, 1, 4),
('Diego de Almagro', 3, 1, 5),
('Vallenar', 3, 1, 6),
('Alto del Carmen', 3, 1, 7),
('Freirina', 3, 1, 8),
('Huasco', 3, 1, 9);

-- =========================
-- Coquimbo (ID 4) — 15 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('La Serena', 4, 1, 1),
('Coquimbo', 4, 1, 2),
('Andacollo', 4, 1, 3),
('La Higuera', 4, 1, 4),
('Paiguano', 4, 1, 5),
('Vicuña', 4, 1, 6),
('Illapel', 4, 1, 7),
('Canela', 4, 1, 8),
('Los Vilos', 4, 1, 9),
('Salamanca', 4, 1, 10),
('Ovalle', 4, 1, 11),
('Combarbalá', 4, 1, 12),
('Monte Patria', 4, 1, 13),
('Punitaqui', 4, 1, 14),
('Río Hurtado', 4, 1, 15);

-- =========================
-- Valparaíso (ID 5) — 38 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Valparaíso', 5, 1, 1),
('Casablanca', 5, 1, 2),
('Concón', 5, 1, 3),
('Juan Fernández', 5, 1, 4),
('Puchuncaví', 5, 1, 5),
('Quintero', 5, 1, 6),
('Viña del Mar', 5, 1, 7),
('Isla de Pascua', 5, 1, 8),
('Los Andes', 5, 1, 9),
('Calle Larga', 5, 1, 10),
('Rinconada', 5, 1, 11),
('San Esteban', 5, 1, 12),
('La Ligua', 5, 1, 13),
('Cabildo', 5, 1, 14),
('Papudo', 5, 1, 15),
('Petorca', 5, 1, 16),
('Zapallar', 5, 1, 17),
('Quillota', 5, 1, 18),
('Calera', 5, 1, 19),
('Hijuelas', 5, 1, 20),
('La Cruz', 5, 1, 21),
('Nogales', 5, 1, 22),
('San Antonio', 5, 1, 23),
('Algarrobo', 5, 1, 24),
('Cartagena', 5, 1, 25),
('El Quisco', 5, 1, 26),
('El Tabo', 5, 1, 27),
('Santo Domingo', 5, 1, 28),
('San Felipe', 5, 1, 29),
('Catemu', 5, 1, 30),
('Llaillay', 5, 1, 31),
('Panquehue', 5, 1, 32),
('Putaendo', 5, 1, 33),
('Santa María', 5, 1, 34),
('Quilpué', 5, 1, 35),
('Limache', 5, 1, 36),
('Olmué', 5, 1, 37),
('Villa Alemana', 5, 1, 38);

-- =========================
-- Metropolitana de Santiago (ID 13) — 52 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Santiago', 13, 1, 1),
('Cerrillos', 13, 1, 2),
('Cerro Navia', 13, 1, 3),
('Conchalí', 13, 1, 4),
('El Bosque', 13, 1, 5),
('Estación Central', 13, 1, 6),
('Huechuraba', 13, 1, 7),
('Independencia', 13, 1, 8),
('La Cisterna', 13, 1, 9),
('La Florida', 13, 1, 10),
('La Granja', 13, 1, 11),
('La Pintana', 13, 1, 12),
('La Reina', 13, 1, 13),
('Las Condes', 13, 1, 14),
('Lo Barnechea', 13, 1, 15),
('Lo Espejo', 13, 1, 16),
('Lo Prado', 13, 1, 17),
('Macul', 13, 1, 18),
('Maipú', 13, 1, 19),
('Ñuñoa', 13, 1, 20),
('Pedro Aguirre Cerda', 13, 1, 21),
('Peñalolén', 13, 1, 22),
('Providencia', 13, 1, 23),
('Pudahuel', 13, 1, 24),
('Quilicura', 13, 1, 25),
('Quinta Normal', 13, 1, 26),
('Recoleta', 13, 1, 27),
('Renca', 13, 1, 28),
('San Joaquín', 13, 1, 29),
('San Miguel', 13, 1, 30),
('San Ramón', 13, 1, 31),
('Vitacura', 13, 1, 32),
('Puente Alto', 13, 1, 33),
('Pirque', 13, 1, 34),
('San José de Maipo', 13, 1, 35),
('Colina', 13, 1, 36),
('Lampa', 13, 1, 37),
('Tiltil', 13, 1, 38),
('San Bernardo', 13, 1, 39),
('Buin', 13, 1, 40),
('Calera de Tango', 13, 1, 41),
('Paine', 13, 1, 42),
('Melipilla', 13, 1, 43),
('Alhué', 13, 1, 44),
('Curacaví', 13, 1, 45),
('María Pinto', 13, 1, 46),
('San Pedro', 13, 1, 47),
('Talagante', 13, 1, 48),
('El Monte', 13, 1, 49),
('Isla de Maipo', 13, 1, 50),
('Padre Hurtado', 13, 1, 51),
('Peñaflor', 13, 1, 52);

-- =========================
-- O'Higgins (ID 6) — 33 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Rancagua', 6, 1, 1),
('Codegua', 6, 1, 2),
('Coinco', 6, 1, 3),
('Coltauco', 6, 1, 4),
('Doñihue', 6, 1, 5),
('Graneros', 6, 1, 6),
('Las Cabras', 6, 1, 7),
('Machalí', 6, 1, 8),
('Malloa', 6, 1, 9),
('Mostazal', 6, 1, 10),
('Olivar', 6, 1, 11),
('Peumo', 6, 1, 12),
('Pichidegua', 6, 1, 13),
('Quinta de Tilcoco', 6, 1, 14),
('Rengo', 6, 1, 15),
('Requínoa', 6, 1, 16),
('San Vicente de Tagua Tagua', 6, 1, 17),
('Pichilemu', 6, 1, 18),
('La Estrella', 6, 1, 19),
('Litueche', 6, 1, 20),
('Marchigüe', 6, 1, 21),
('Navidad', 6, 1, 22),
('Paredones', 6, 1, 23),
('San Fernando', 6, 1, 24),
('Chépica', 6, 1, 25),
('Chimbarongo', 6, 1, 26),
('Lolol', 6, 1, 27),
('Nancagua', 6, 1, 28),
('Palmilla', 6, 1, 29),
('Peralillo', 6, 1, 30),
('Placilla', 6, 1, 31),
('Pumanque', 6, 1, 32),
('Santa Cruz', 6, 1, 33);

-- =========================
-- Maule (ID 7) — 30 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Talca', 7, 1, 1),
('Constitución', 7, 1, 2),
('Curepto', 7, 1, 3),
('Empedrado', 7, 1, 4),
('Maule', 7, 1, 5),
('Pelarco', 7, 1, 6),
('Pencahue', 7, 1, 7),
('Río Claro', 7, 1, 8),
('San Clemente', 7, 1, 9),
('San Rafael', 7, 1, 10),
('Cauquenes', 7, 1, 11),
('Chanco', 7, 1, 12),
('Pelluhue', 7, 1, 13),
('Curicó', 7, 1, 14),
('Hualañé', 7, 1, 15),
('Licantén', 7, 1, 16),
('Molina', 7, 1, 17),
('Rauco', 7, 1, 18),
('Romeral', 7, 1, 19),
('Sagrada Familia', 7, 1, 20),
('Teno', 7, 1, 21),
('Vichuquén', 7, 1, 22),
('Linares', 7, 1, 23),
('Colbún', 7, 1, 24),
('Longaví', 7, 1, 25),
('Parral', 7, 1, 26),
('Retiro', 7, 1, 27),
('San Javier', 7, 1, 28),
('Villa Alegre', 7, 1, 29),
('Yerbas Buenas', 7, 1, 30);

-- =========================
-- Ñuble (ID 16) — 21 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Chillán', 16, 1, 1),
('Bulnes', 16, 1, 2),
('Cobquecura', 16, 1, 3),
('Coelemu', 16, 1, 4),
('Coihueco', 16, 1, 5),
('Chillán Viejo', 16, 1, 6),
('El Carmen', 16, 1, 7),
('Ninhue', 16, 1, 8),
('Ñiquén', 16, 1, 9),
('Pemuco', 16, 1, 10),
('Pinto', 16, 1, 11),
('Portezuelo', 16, 1, 12),
('Quillón', 16, 1, 13),
('Quirihue', 16, 1, 14),
('Ránquil', 16, 1, 15),
('San Carlos', 16, 1, 16),
('San Fabián', 16, 1, 17),
('San Ignacio', 16, 1, 18),
('San Nicolás', 16, 1, 19),
('Treguaco', 16, 1, 20),
('Yungay', 16, 1, 21);

-- =========================
-- Biobío (ID 8) — 33 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Concepción', 8, 1, 1),
('Coronel', 8, 1, 2),
('Chiguayante', 8, 1, 3),
('Florida', 8, 1, 4),
('Hualqui', 8, 1, 5),
('Lota', 8, 1, 6),
('Penco', 8, 1, 7),
('San Pedro de la Paz', 8, 1, 8),
('Santa Juana', 8, 1, 9),
('Talcahuano', 8, 1, 10),
('Tomé', 8, 1, 11),
('Hualpén', 8, 1, 12),
('Lebu', 8, 1, 13),
('Arauco', 8, 1, 14),
('Cañete', 8, 1, 15),
('Contulmo', 8, 1, 16),
('Curanilahue', 8, 1, 17),
('Los Álamos', 8, 1, 18),
('Tirúa', 8, 1, 19),
('Los Ángeles', 8, 1, 20),
('Antuco', 8, 1, 21),
('Cabrero', 8, 1, 22),
('Laja', 8, 1, 23),
('Mulchén', 8, 1, 24),
('Nacimiento', 8, 1, 25),
('Negrete', 8, 1, 26),
('Quilaco', 8, 1, 27),
('Quilleco', 8, 1, 28),
('San Rosendo', 8, 1, 29),
('Santa Bárbara', 8, 1, 30),
('Tucapel', 8, 1, 31),
('Yumbel', 8, 1, 32),
('Alto Biobío', 8, 1, 33);

-- =========================
-- La Araucanía (ID 9) — 32 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Temuco', 9, 1, 1),
('Carahue', 9, 1, 2),
('Cunco', 9, 1, 3),
('Curarrehue', 9, 1, 4),
('Freire', 9, 1, 5),
('Galvarino', 9, 1, 6),
('Gorbea', 9, 1, 7),
('Lautaro', 9, 1, 8),
('Loncoche', 9, 1, 9),
('Melipeuco', 9, 1, 10),
('Nueva Imperial', 9, 1, 11),
('Padre las Casas', 9, 1, 12),
('Perquenco', 9, 1, 13),
('Pitrufquén', 9, 1, 14),
('Pucón', 9, 1, 15),
('Saavedra', 9, 1, 16),
('Teodoro Schmidt', 9, 1, 17),
('Toltén', 9, 1, 18),
('Vilcún', 9, 1, 19),
('Villarrica', 9, 1, 20),
('Cholchol', 9, 1, 21),
('Angol', 9, 1, 22),
('Collipulli', 9, 1, 23),
('Curacautín', 9, 1, 24),
('Ercilla', 9, 1, 25),
('Lonquimay', 9, 1, 26),
('Los Sauces', 9, 1, 27),
('Lumaco', 9, 1, 28),
('Purén', 9, 1, 29),
('Renaico', 9, 1, 30),
('Traiguén', 9, 1, 31),
('Victoria', 9, 1, 32);

-- =========================
-- Los Ríos (ID 14) — 12 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Valdivia', 14, 1, 1),
('Corral', 14, 1, 2),
('Lanco', 14, 1, 3),
('Los Lagos', 14, 1, 4),
('Máfil', 14, 1, 5),
('Mariquina', 14, 1, 6),
('Paillaco', 14, 1, 7),
('Panguipulli', 14, 1, 8),
('La Unión', 14, 1, 9),
('Futrono', 14, 1, 10),
('Lago Ranco', 14, 1, 11),
('Río Bueno', 14, 1, 12);

-- =========================
-- Los Lagos (ID 10) — 30 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Puerto Montt', 10, 1, 1),
('Calbuco', 10, 1, 2),
('Cochamó', 10, 1, 3),
('Fresia', 10, 1, 4),
('Frutillar', 10, 1, 5),
('Los Muermos', 10, 1, 6),
('Llanquihue', 10, 1, 7),
('Maullín', 10, 1, 8),
('Puerto Varas', 10, 1, 9),
('Castro', 10, 1, 10),
('Ancud', 10, 1, 11),
('Chonchi', 10, 1, 12),
('Curaco de Vélez', 10, 1, 13),
('Dalcahue', 10, 1, 14),
('Puqueldón', 10, 1, 15),
('Queilén', 10, 1, 16),
('Quellón', 10, 1, 17),
('Quemchi', 10, 1, 18),
('Quinchao', 10, 1, 19),
('Osorno', 10, 1, 20),
('Puerto Octay', 10, 1, 21),
('Purranque', 10, 1, 22),
('Puyehue', 10, 1, 23),
('Río Negro', 10, 1, 24),
('San Juan de la Costa', 10, 1, 25),
('San Pablo', 10, 1, 26),
('Chaitén', 10, 1, 27),
('Futaleufú', 10, 1, 28),
('Hualaihué', 10, 1, 29),
('Palena', 10, 1, 30);

-- =========================
-- Aysén (ID 11) — 10 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Coyhaique', 11, 1, 1),
('Lago Verde', 11, 1, 2),
('Aysén', 11, 1, 3),
('Cisnes', 11, 1, 4),
('Guaitecas', 11, 1, 5),
('Cochrane', 11, 1, 6),
('O''Higgins', 11, 1, 7),
('Tortel', 11, 1, 8),
('Chile Chico', 11, 1, 9),
('Río Ibáñez', 11, 1, 10);

-- =========================
-- Magallanes (ID 12) — 11 comunas
-- =========================
INSERT IGNORE INTO comuna (nombre, region_id, activo, orden) VALUES
('Punta Arenas', 12, 1, 1),
('Laguna Blanca', 12, 1, 2),
('Río Verde', 12, 1, 3),
('San Gregorio', 12, 1, 4),
('Cabo de Hornos', 12, 1, 5),
('Antártica', 12, 1, 6),
('Porvenir', 12, 1, 7),
('Primavera', 12, 1, 8),
('Timaukel', 12, 1, 9),
('Puerto Natales', 12, 1, 10),
('Torres del Paine', 12, 1, 11);

-- ======================================================
-- Fin seed comunas (346 comunas)
-- ======================================================
