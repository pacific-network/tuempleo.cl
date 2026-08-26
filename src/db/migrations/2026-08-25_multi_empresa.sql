-- Multi-empresa. Correr con la app apagada, en este orden.
-- El porqué de cada paso está en docs/despliegues.md.
-- OJO: el nombre REL_ de la última línea cambia entre instalaciones.
--      Confirmarlo con: SHOW INDEX FROM empleador WHERE Key_name LIKE 'REL_%';

CREATE TABLE empleador_backup_pre_multiempresa AS
SELECT id, usuario_id, empresa_id, rol_empresa FROM empleador;

ALTER TABLE empleador
  MODIFY COLUMN rol_empresa
  ENUM('admin', 'miembro', 'empleador', 'colaborador')
  NOT NULL DEFAULT 'empleador';

UPDATE empleador SET rol_empresa = 'empleador'   WHERE rol_empresa = 'admin';
UPDATE empleador SET rol_empresa = 'colaborador' WHERE rol_empresa = 'miembro';

ALTER TABLE empleador
  ADD UNIQUE INDEX uq_empleador_usuario_empresa (usuario_id, empresa_id);

ALTER TABLE empleador DROP INDEX `REL_a5baa661d6204614616a094688`;

SELECT rol_empresa, COUNT(*) AS filas FROM empleador GROUP BY rol_empresa;
SHOW INDEX FROM empleador;
