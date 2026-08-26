-- Renombra los valores de empleador.rol_empresa:
--   'admin'   -> 'empleador'    (maneja la empresa e invita colaboradores)
--   'miembro' -> 'colaborador'  (pertenece a la empresa, no la maneja)
--
-- `admin` colisionaba con usuario.isAdmin, que es el administrador del SITIO.
-- Son dos cosas distintas y compartían el nombre.
--
-- CORRER ANTES de arrancar el backend con el código nuevo.
--
-- Por qué a mano: DB_SYNCHRONIZE ajusta el tipo de la columna contra la
-- entidad, pero no transforma los datos que ya están. Si TypeORM redefine el
-- ENUM primero, las filas con 'admin'/'miembro' dejan de ser valores válidos
-- y MariaDB las deja en cadena vacía — sin avisar.
--
-- El orden importa: primero ensanchar la columna para que acepte los cuatro
-- valores, después mover los datos, y recién ahí dejar que synchronize la
-- estreche a los dos definitivos.

ALTER TABLE empleador
  MODIFY COLUMN rol_empresa
  ENUM('admin', 'miembro', 'empleador', 'colaborador')
  NOT NULL DEFAULT 'empleador';

UPDATE empleador SET rol_empresa = 'empleador'   WHERE rol_empresa = 'admin';
UPDATE empleador SET rol_empresa = 'colaborador' WHERE rol_empresa = 'miembro';

-- Verificación: no debe quedar ninguna fila con los valores viejos ni vacía.
-- SELECT rol_empresa, COUNT(*) FROM empleador GROUP BY rol_empresa;
