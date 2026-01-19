-- ======================================================
-- Seed: Job Areas (Areas de Trabajo)
-- ======================================================

INSERT INTO job_area (nombre)
VALUES
-- =========================
-- Administracion / Gestion
-- =========================
('Administracion General'),
('Contabilidad'),
('Finanzas'),
('Auditoria'),
('Control de Gestion'),
('Gerencia y Direccion'),

-- =========================
-- Comercial / Ventas
-- =========================
('Ventas'),
('Comercial'),
('Desarrollo de Negocios'),
('Customer Success'),
('Atencion al Cliente'),
('Call Center y Telemarketing'),

-- =========================
-- Marketing / Comunicaciones
-- =========================
('Marketing'),
('Marketing Digital'),
('Publicidad'),
('Comunicaciones'),
('Relaciones Publicas'),
('Branding y Contenidos'),

-- =========================
-- Recursos Humanos
-- =========================
('Recursos Humanos'),
('Reclutamiento y Seleccion'),
('Capacitacion y Desarrollo'),
('Compensaciones y Beneficios'),

-- =========================
-- Tecnologia / Sistemas
-- =========================
('Tecnologias de la Informacion'),
('Desarrollo de Software'),
('Infraestructura y Redes'),
('Soporte Tecnico'),
('Ciberseguridad'),
('Data y Analitica'),

-- =========================
-- Ingenieria / Produccion
-- =========================
('Ingenieria'),
('Ingenieria Civil y Construccion'),
('Produccion'),
('Manufactura'),
('Calidad'),
('Mantenimiento'),

-- =========================
-- Logistica / Operaciones
-- =========================
('Abastecimiento'),
('Logistica'),
('Operaciones'),
('Comercio Exterior'),
('Aduanas'),

-- =========================
-- Salud / Educacion
-- =========================
('Salud'),
('Enfermeria'),
('Medicina'),
('Farmacia'),
('Educacion y Docencia'),
('Investigacion'),

-- =========================
-- Legal / Social
-- =========================
('Legal'),
('Compliance'),
('Sociologia y Trabajo Social'),

-- =========================
-- Turismo / Servicios
-- =========================
('Gastronomia'),
('Hoteleria'),
('Turismo'),

-- =========================
-- Otros
-- =========================
('Seguridad'),
('Seguros'),
('Administracion Publica'),
('Oficios'),
('Otros')

ON CONFLICT (nombre) DO NOTHING;

-- ======================================================
-- Fin seed job areas
-- ======================================================
