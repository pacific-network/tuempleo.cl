-- ======================================================
-- Seed: Instituciones Educacionales (Chile + Internacional)
-- Compatible MySQL
-- ======================================================

INSERT IGNORE INTO institucion_educacional (nombre, tipo) VALUES

-- ======================================================
-- UNIVERSIDADES
-- ======================================================
('Pontificia Universidad Catolica de Chile', 'universidad'),
('Universidad de Chile', 'universidad'),
('Universidad de Santiago de Chile', 'universidad'),
('Universidad Bernardo OHiggins', 'universidad'),
('Universidad de Concepcion', 'universidad'),
('Universidad de La Frontera', 'universidad'),
('Universidad de Los Andes', 'universidad'),
('Universidad Tecnica Federico Santa Maria', 'universidad'),
('Universidad Adolfo Ibanez', 'universidad'),
('Universidad Diego Portales', 'universidad'),
('Universidad Andres Bello', 'universidad'),
('Universidad Catolica del Norte', 'universidad'),
('Universidad Catolica de Temuco', 'universidad'),
('Universidad de Las Americas', 'universidad'),
('Universidad Autonoma de Chile', 'universidad'),
('Universidad Mayor', 'universidad'),
('Universidad SEK', 'universidad'),
('Universidad Alberto Hurtado', 'universidad'),
('Universidad Central de Chile', 'universidad'),
('Universidad de Valparaiso', 'universidad'),
('Universidad de Antofagasta', 'universidad'),
('Universidad de La Serena', 'universidad'),
('Universidad de Talca', 'universidad'),
('Universidad del Bio Bio', 'universidad'),
('Universidad Austral de Chile', 'universidad'),
('Universidad de Magallanes', 'universidad'),
('Universidad Tecnologica Metropolitana', 'universidad'),
('Universidad de Playa Ancha', 'universidad'),
('Universidad Finis Terrae', 'universidad'),
('Universidad Catolica Silva Henriquez', 'universidad'),
('Universidad San Sebastian', 'universidad'),
('Universidad de OHiggins', 'universidad'),
('Universidad de Aysen', 'universidad'),

-- Universidades adicionales
('Universidad Academia de Humanismo Cristiano', 'universidad'),
('Universidad Gabriela Mistral', 'universidad'),
('Universidad Miguel de Cervantes', 'universidad'),
('Universidad Iberoamericana de Ciencias y Tecnologia', 'universidad'),
('Universidad Bolivariana', 'universidad'),

-- ======================================================
-- INSTITUTOS PROFESIONALES (IP)
-- ======================================================
('IP Chile', 'instituto_profesional'),
('IP Arcos', 'instituto_profesional'),
('IP Carlos Casanueva', 'instituto_profesional'),
('IP Guillermo Subercaseaux', 'instituto_profesional'),
('IP Valparaiso', 'instituto_profesional'),
('IP AIEP', 'instituto_profesional'),
('IP CIISA', 'instituto_profesional'),
('IP DUOC UC', 'instituto_profesional'),
('IP Escuela de Comercio', 'instituto_profesional'),
('IP INACAP', 'instituto_profesional'),
('IP Los Lagos', 'instituto_profesional'),
('IP Mayor', 'instituto_profesional'),
('IP Santo Tomas', 'instituto_profesional'),
('IP Virginia OHiggins', 'instituto_profesional'),

-- IP faltantes relevantes
('IP Esucomex', 'instituto_profesional'),
('IP ICCE', 'instituto_profesional'),
('IP Providencia', 'instituto_profesional'),
('IP IACC', 'instituto_profesional'),
('IP Latinoamericano de Comercio Exterior', 'instituto_profesional'),
('IP Instituto Nacional del Futbol INAF', 'instituto_profesional'),

-- ======================================================
-- CENTROS DE FORMACION TECNICA (CFT)
-- ======================================================
('CFT CEDUC UCN', 'cft'),
('CFT Cruz Roja', 'cft'),
('CFT ENAC', 'cft'),
('CFT Maule', 'cft'),
('CFT San Agustin', 'cft'),
('CFT UCE', 'cft'),
('CFT INACAP', 'cft'),
('CFT Laprida', 'cft'),
('CFT Virtual', 'cft'),
('CFT Estatal', 'cft'),
('CFT Proandes', 'cft'),
('CFT Teknos', 'cft'),
('CFT Valle Grande', 'cft'),

-- CFT Estatales por región
('CFT Estatal de Arica y Parinacota', 'cft'),
('CFT Estatal de Tarapaca', 'cft'),
('CFT Estatal de Antofagasta', 'cft'),
('CFT Estatal de Atacama', 'cft'),
('CFT Estatal de Coquimbo', 'cft'),
('CFT Estatal de Valparaiso', 'cft'),
('CFT Estatal Metropolitano', 'cft'),
('CFT Estatal del Maule', 'cft'),
('CFT Estatal del Biobio', 'cft'),
('CFT Estatal de La Araucania', 'cft'),
('CFT Estatal de Los Rios', 'cft'),
('CFT Estatal de Los Lagos', 'cft'),
('CFT Estatal de Aysen', 'cft'),
('CFT Estatal de Magallanes', 'cft'),

-- ======================================================
-- INTERNACIONALES / OTRAS
-- ======================================================
('UNEFA Venezuela', 'internacional'),
('Universidad de Barcelona Espana', 'internacional'),
('UNAM Mexico', 'internacional'),
('Otra', 'otra');

-- ======================================================
-- Fin seed instituciones educacionales
-- ======================================================
