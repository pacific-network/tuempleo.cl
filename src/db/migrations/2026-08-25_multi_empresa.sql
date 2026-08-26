-- Prepara la base para multi-empresa.
--
-- CORRER ENTERO Y ANTES de arrancar el backend con este codigo.
-- Los dos pasos son cosas que DB_SYNCHRONIZE no puede hacer solo:
-- el paso 1 porque no transforma datos, el paso 2 porque MySQL se lo prohibe.

-- =====================================================================
-- PASO 1 · Renombrar los valores de empleador.rol_empresa
--
--   'admin'   -> 'empleador'    (maneja la empresa e invita colaboradores)
--   'miembro' -> 'colaborador'  (pertenece a la empresa, no la maneja)
--
-- `admin` colisionaba con usuario.isAdmin, que es el administrador del SITIO.
--
-- Por que a mano: synchronize ajusta el TIPO de la columna contra la entidad,
-- pero no mueve los datos. Si redefine el ENUM primero, las filas con
-- 'admin'/'miembro' dejan de ser valores validos y MariaDB las deja en cadena
-- vacia, sin avisar.
--
-- El orden importa: primero ensanchar para que acepte los cuatro valores,
-- despues mover los datos, y recien ahi dejar que synchronize la estreche.
-- =====================================================================

ALTER TABLE empleador
  MODIFY COLUMN rol_empresa
  ENUM('admin', 'miembro', 'empleador', 'colaborador')
  NOT NULL DEFAULT 'empleador';

UPDATE empleador SET rol_empresa = 'empleador'   WHERE rol_empresa = 'admin';
UPDATE empleador SET rol_empresa = 'colaborador' WHERE rol_empresa = 'miembro';


-- =====================================================================
-- PASO 2 · Soltar el UNIQUE de usuario_id, que es lo que limitaba a una
--          empresa por persona.
--
-- El @OneToOne anterior dejo un indice unico sobre usuario_id con nombre
-- generado (`REL_...`). Al pasar a @ManyToOne, synchronize intenta soltarlo y
-- MySQL responde:
--
--   ER_DROP_INDEX_FK (1553): Cannot drop index 'REL_...':
--   needed in a foreign key constraint
--
-- No es un error del cambio: InnoDB exige que la columna de una FK tenga algun
-- indice, y ese unico es el unico que hay. La salida es crear ANTES el indice
-- definitivo: como usuario_id es su prefijo izquierdo, sirve para sostener la
-- FK, y recien entonces el viejo se puede soltar.
--
-- Crear el compuesto es seguro aunque haya datos: el UNIQUE viejo ya garantiza
-- que no existe mas de una fila por usuario, asi que no puede haber duplicados
-- del par (usuario_id, empresa_id).
-- =====================================================================

-- 2.1 · El indice definitivo. Es el mismo que declara la entidad, asi que
--       synchronize lo encuentra hecho y no vuelve a tocarlo.
ALTER TABLE empleador
  ADD UNIQUE INDEX uq_empleador_usuario_empresa (usuario_id, empresa_id);

-- 2.2 · Ahora si, soltar el unico viejo.
--
--       El nombre `REL_...` es generado y cambia entre instalaciones. Confirmar
--       cual es antes de correr esta linea:
--
--         SHOW INDEX FROM empleador WHERE Key_name LIKE 'REL_%';
--
--       Reemplazar el nombre de abajo por el que devuelva esa consulta.
ALTER TABLE empleador DROP INDEX `REL_a5baa661d6204614616a094688`;


-- =====================================================================
-- Verificacion
-- =====================================================================
-- Roles migrados, sin filas vacias ni valores viejos:
--   SELECT rol_empresa, COUNT(*) FROM empleador GROUP BY rol_empresa;
--
-- Debe quedar uq_empleador_usuario_empresa y NO debe quedar ningun REL_:
--   SHOW INDEX FROM empleador;
--
-- Recien despues de esto, arrancar el backend. synchronize agrega lo que falta
-- (usuario.data) y estrecha el ENUM, que ya es aditivo y sin riesgo.
