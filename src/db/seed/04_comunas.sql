-- ======================================================
-- Seed: Comunas de Chile (COMPLETO)
-- Motor: MySQL / MariaDB
-- Estrategia: INSERT IGNORE + SELECT ... UNION ALL
-- Dependencia: tabla `region` debe estar poblada
-- ======================================================

INSERT IGNORE INTO comuna (nombre, region_id, activo, orden)
SELECT c.nombre, r.id, 1, c.orden
FROM (
    -- =========================
    -- Arica y Parinacota
    -- =========================
    SELECT 'Arica', 'Arica y Parinacota', 1
    UNION ALL SELECT 'Camarones', 'Arica y Parinacota', 2
    UNION ALL SELECT 'Putre', 'Arica y Parinacota', 3
    UNION ALL SELECT 'General Lagos', 'Arica y Parinacota', 4

    -- =========================
    -- Tarapacá
    -- =========================
    UNION ALL SELECT 'Iquique', 'Tarapacá', 1
    UNION ALL SELECT 'Alto Hospicio', 'Tarapacá', 2
    UNION ALL SELECT 'Pozo Almonte', 'Tarapacá', 3
    UNION ALL SELECT 'Camiña', 'Tarapacá', 4
    UNION ALL SELECT 'Colchane', 'Tarapacá', 5
    UNION ALL SELECT 'Huara', 'Tarapacá', 6
    UNION ALL SELECT 'Pica', 'Tarapacá', 7

    -- =========================
    -- Antofagasta
    -- =========================
    UNION ALL SELECT 'Antofagasta', 'Antofagasta', 1
    UNION ALL SELECT 'Mejillones', 'Antofagasta', 2
    UNION ALL SELECT 'Sierra Gorda', 'Antofagasta', 3
    UNION ALL SELECT 'Taltal', 'Antofagasta', 4
    UNION ALL SELECT 'Calama', 'Antofagasta', 5
    UNION ALL SELECT 'Ollagüe', 'Antofagasta', 6
    UNION ALL SELECT 'San Pedro de Atacama', 'Antofagasta', 7
    UNION ALL SELECT 'Tocopilla', 'Antofagasta', 8
    UNION ALL SELECT 'María Elena', 'Antofagasta', 9

    -- =========================
    -- Atacama
    -- =========================
    UNION ALL SELECT 'Copiapó', 'Atacama', 1
    UNION ALL SELECT 'Caldera', 'Atacama', 2
    UNION ALL SELECT 'Tierra Amarilla', 'Atacama', 3
    UNION ALL SELECT 'Chañaral', 'Atacama', 4
    UNION ALL SELECT 'Diego de Almagro', 'Atacama', 5
    UNION ALL SELECT 'Vallenar', 'Atacama', 6
    UNION ALL SELECT 'Alto del Carmen', 'Atacama', 7
    UNION ALL SELECT 'Freirina', 'Atacama', 8
    UNION ALL SELECT 'Huasco', 'Atacama', 9

    -- =========================
    -- Coquimbo
    -- =========================
    UNION ALL SELECT 'La Serena', 'Coquimbo', 1
    UNION ALL SELECT 'Coquimbo', 'Coquimbo', 2
    UNION ALL SELECT 'Andacollo', 'Coquimbo', 3
    UNION ALL SELECT 'La Higuera', 'Coquimbo', 4
    UNION ALL SELECT 'Paiguano', 'Coquimbo', 5
    UNION ALL SELECT 'Vicuña', 'Coquimbo', 6
    UNION ALL SELECT 'Illapel', 'Coquimbo', 7
    UNION ALL SELECT 'Canela', 'Coquimbo', 8
    UNION ALL SELECT 'Los Vilos', 'Coquimbo', 9
    UNION ALL SELECT 'Salamanca', 'Coquimbo', 10
    UNION ALL SELECT 'Ovalle', 'Coquimbo', 11
    UNION ALL SELECT 'Combarbalá', 'Coquimbo', 12
    UNION ALL SELECT 'Monte Patria', 'Coquimbo', 13
    UNION ALL SELECT 'Punitaqui', 'Coquimbo', 14
    UNION ALL SELECT 'Río Hurtado', 'Coquimbo', 15

    -- =========================
    -- Valparaíso
    -- =========================
    UNION ALL SELECT 'Valparaíso', 'Valparaíso', 1
    UNION ALL SELECT 'Casablanca', 'Valparaíso', 2
    UNION ALL SELECT 'Concón', 'Valparaíso', 3
    UNION ALL SELECT 'Juan Fernández', 'Valparaíso', 4
    UNION ALL SELECT 'Puchuncaví', 'Valparaíso', 5
    UNION ALL SELECT 'Quintero', 'Valparaíso', 6
    UNION ALL SELECT 'Viña del Mar', 'Valparaíso', 7
    UNION ALL SELECT 'Isla de Pascua', 'Valparaíso', 8
    UNION ALL SELECT 'Los Andes', 'Valparaíso', 9
    UNION ALL SELECT 'Calle Larga', 'Valparaíso', 10
    UNION ALL SELECT 'Rinconada', 'Valparaíso', 11
    UNION ALL SELECT 'San Esteban', 'Valparaíso', 12
    UNION ALL SELECT 'La Ligua', 'Valparaíso', 13
    UNION ALL SELECT 'Cabildo', 'Valparaíso', 14
    UNION ALL SELECT 'Papudo', 'Valparaíso', 15
    UNION ALL SELECT 'Petorca', 'Valparaíso', 16
    UNION ALL SELECT 'Zapallar', 'Valparaíso', 17
    UNION ALL SELECT 'Quillota', 'Valparaíso', 18
    UNION ALL SELECT 'Calera', 'Valparaíso', 19
    UNION ALL SELECT 'Hijuelas', 'Valparaíso', 20
    UNION ALL SELECT 'La Cruz', 'Valparaíso', 21
    UNION ALL SELECT 'Nogales', 'Valparaíso', 22
    UNION ALL SELECT 'San Antonio', 'Valparaíso', 23
    UNION ALL SELECT 'Algarrobo', 'Valparaíso', 24
    UNION ALL SELECT 'Cartagena', 'Valparaíso', 25
    UNION ALL SELECT 'El Quisco', 'Valparaíso', 26
    UNION ALL SELECT 'El Tabo', 'Valparaíso', 27
    UNION ALL SELECT 'Santo Domingo', 'Valparaíso', 28
    UNION ALL SELECT 'San Felipe', 'Valparaíso', 29
    UNION ALL SELECT 'Catemu', 'Valparaíso', 30
    UNION ALL SELECT 'Llaillay', 'Valparaíso', 31
    UNION ALL SELECT 'Panquehue', 'Valparaíso', 32
    UNION ALL SELECT 'Putaendo', 'Valparaíso', 33
    UNION ALL SELECT 'Santa María', 'Valparaíso', 34
    UNION ALL SELECT 'Quilpué', 'Valparaíso', 35
    UNION ALL SELECT 'Limache', 'Valparaíso', 36
    UNION ALL SELECT 'Olmué', 'Valparaíso', 37
    UNION ALL SELECT 'Villa Alemana', 'Valparaíso', 38

    -- =========================
    -- Metropolitana de Santiago
    -- =========================
    UNION ALL SELECT 'Santiago', 'Metropolitana de Santiago', 1
    UNION ALL SELECT 'Cerrillos', 'Metropolitana de Santiago', 2
    UNION ALL SELECT 'Cerro Navia', 'Metropolitana de Santiago', 3
    UNION ALL SELECT 'Conchalí', 'Metropolitana de Santiago', 4
    UNION ALL SELECT 'El Bosque', 'Metropolitana de Santiago', 5
    UNION ALL SELECT 'Estación Central', 'Metropolitana de Santiago', 6
    UNION ALL SELECT 'Huechuraba', 'Metropolitana de Santiago', 7
    UNION ALL SELECT 'Independencia', 'Metropolitana de Santiago', 8
    UNION ALL SELECT 'La Cisterna', 'Metropolitana de Santiago', 9
    UNION ALL SELECT 'La Florida', 'Metropolitana de Santiago', 10
    UNION ALL SELECT 'La Granja', 'Metropolitana de Santiago', 11
    UNION ALL SELECT 'La Pintana', 'Metropolitana de Santiago', 12
    UNION ALL SELECT 'La Reina', 'Metropolitana de Santiago', 13
    UNION ALL SELECT 'Las Condes', 'Metropolitana de Santiago', 14
    UNION ALL SELECT 'Lo Barnechea', 'Metropolitana de Santiago', 15
    UNION ALL SELECT 'Lo Espejo', 'Metropolitana de Santiago', 16
    UNION ALL SELECT 'Lo Prado', 'Metropolitana de Santiago', 17
    UNION ALL SELECT 'Macul', 'Metropolitana de Santiago', 18
    UNION ALL SELECT 'Maipú', 'Metropolitana de Santiago', 19
    UNION ALL SELECT 'Ñuñoa', 'Metropolitana de Santiago', 20
    UNION ALL SELECT 'Providencia', 'Metropolitana de Santiago', 21
    UNION ALL SELECT 'Pudahuel', 'Metropolitana de Santiago', 22
    UNION ALL SELECT 'Quilicura', 'Metropolitana de Santiago', 23
    UNION ALL SELECT 'Quinta Normal', 'Metropolitana de Santiago', 24
    UNION ALL SELECT 'Recoleta', 'Metropolitana de Santiago', 25
    UNION ALL SELECT 'Renca', 'Metropolitana de Santiago', 26
    UNION ALL SELECT 'San Joaquín', 'Metropolitana de Santiago', 27
    UNION ALL SELECT 'San Miguel', 'Metropolitana de Santiago', 28
    UNION ALL SELECT 'San Ramón', 'Metropolitana de Santiago', 29
    UNION ALL SELECT 'Vitacura', 'Metropolitana de Santiago', 30

    -- =========================
    -- Biobío
    -- =========================
    UNION ALL SELECT 'Concepción', 'Biobío', 1
    UNION ALL SELECT 'Coronel', 'Biobío', 2
    UNION ALL SELECT 'Chiguayante', 'Biobío', 3
    UNION ALL SELECT 'Florida', 'Biobío', 4
    UNION ALL SELECT 'Hualqui', 'Biobío', 5
    UNION ALL SELECT 'Lota', 'Biobío', 6
    UNION ALL SELECT 'Penco', 'Biobío', 7
    UNION ALL SELECT 'San Pedro de la Paz', 'Biobío', 8
    UNION ALL SELECT 'Talcahuano', 'Biobío', 9
    UNION ALL SELECT 'Tomé', 'Biobío', 10

    -- =========================
    -- La Araucanía
    -- =========================
    UNION ALL SELECT 'Temuco', 'La Araucanía', 1
    UNION ALL SELECT 'Padre las Casas', 'La Araucanía', 2
    UNION ALL SELECT 'Villarrica', 'La Araucanía', 3
    UNION ALL SELECT 'Pucón', 'La Araucanía', 4
    UNION ALL SELECT 'Angol', 'La Araucanía', 5
    UNION ALL SELECT 'Victoria', 'La Araucanía', 6

    -- =========================
    -- Los Ríos
    -- =========================
    UNION ALL SELECT 'Valdivia', 'Los Ríos', 1
    UNION ALL SELECT 'Corral', 'Los Ríos', 2
    UNION ALL SELECT 'Panguipulli', 'Los Ríos', 3
    UNION ALL SELECT 'La Unión', 'Los Ríos', 4

    -- =========================
    -- Los Lagos
    -- =========================
    UNION ALL SELECT 'Puerto Montt', 'Los Lagos', 1
    UNION ALL SELECT 'Puerto Varas', 'Los Lagos', 2
    UNION ALL SELECT 'Castro', 'Los Lagos', 3
    UNION ALL SELECT 'Ancud', 'Los Lagos', 4
    UNION ALL SELECT 'Osorno', 'Los Lagos', 5

    -- =========================
    -- Aysén
    -- =========================
    UNION ALL SELECT 'Coyhaique', 'Aysén del General Carlos Ibáñez del Campo', 1
    UNION ALL SELECT 'Aysén', 'Aysén del General Carlos Ibáñez del Campo', 2

    -- =========================
    -- Magallanes
    -- =========================
    UNION ALL SELECT 'Punta Arenas', 'Magallanes y la Antártica Chilena', 1
    UNION ALL SELECT 'Puerto Natales', 'Magallanes y la Antártica Chilena', 2
) AS c(nombre, region_nombre, orden)
JOIN region r ON r.nombre = c.region_nombre;

-- ======================================================
-- Fin seed comunas COMPLETO
-- ======================================================
