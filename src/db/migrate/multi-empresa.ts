/**
 * Migración: multi-empresa — una persona puede pertenecer a varias empresas.
 *
 * Uso:
 *   DRY_RUN=1 npm run migrate:multi-empresa   # solo reporta, no escribe
 *   npm run migrate:multi-empresa             # aplica
 *
 * Correr con la app apagada, ANTES de levantar el backend con este código.
 *
 * Por qué no basta con DB_SYNCHRONIZE, que es lo normal en este proyecto —
 * son dos cosas distintas y las dos reales:
 *
 *   1. Los roles cambian de valor ('admin' -> 'empleador', 'miembro' ->
 *      'colaborador'). Synchronize ajusta el TIPO del ENUM pero no mueve los
 *      datos: si lo toca primero, las filas con 'admin' quedan en cadena
 *      vacía, sin avisar.
 *
 *   2. El `@OneToOne` sobre usuario_id pasó a `@ManyToOne`. Ese OneToOne dejó
 *      un índice único, y usuario_id tiene una foreign key. InnoDB exige que
 *      toda columna con FK tenga algún índice; como ese es el único, MySQL no
 *      deja soltarlo y el arranque muere con ER_DROP_INDEX_FK. La salida es
 *      crear antes el índice definitivo: usuario_id es su prefijo izquierdo,
 *      así que sostiene la FK y recién entonces el viejo se puede soltar.
 *
 * Es idempotente: correrlo dos veces no cambia nada la segunda vez.
 *
 * Ventaja sobre el .sql equivalente: el índice viejo tiene nombre generado por
 * TypeORM (`REL_...`) y cambia entre instalaciones. Acá se descubre solo, así
 * que el mismo comando sirve en local y en producción sin editar nada.
 */

import * as dotenv from 'dotenv';
import * as mysql2 from 'mysql2/promise';

dotenv.config();

const REQUIRED = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno: ${key}`);
    process.exit(1);
  }
}

const DRY_RUN = process.env.DRY_RUN === '1';
const INDICE_NUEVO = 'uq_empleador_usuario_empresa';
const TABLA_BACKUP = 'empleador_backup_pre_multiempresa';

/** Índices de `empleador`, agrupados por nombre y ordenados por posición. */
async function leerIndices(conn: mysql2.Connection) {
  // SHOW INDEX en vez de information_schema: el usuario de producción no tiene
  // permiso sobre ese esquema.
  const [filas] = await conn.query<any[]>(`SHOW INDEX FROM empleador`);
  const porNombre = new Map<string, any[]>();

  for (const f of filas) {
    if (!porNombre.has(f.Key_name)) porNombre.set(f.Key_name, []);
    porNombre.get(f.Key_name)!.push(f);
  }
  for (const cols of porNombre.values()) {
    cols.sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
  }
  return porNombre;
}

async function main() {
  const conn = await mysql2.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tuempleo',
    charset: 'utf8mb4',
    multipleStatements: false,
  });

  console.log(`\nMigración multi-empresa${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // ── 0 · Respaldo ──────────────────────────────────────────────────
  // Si alguien arrancó la app antes de tiempo, las filas de rol_empresa
  // quedan vacías y sin esto no hay forma de saber cuál era cuál.
  const [backup] = await conn.query<any[]>(`SHOW TABLES LIKE '${TABLA_BACKUP}'`);
  if (backup.length === 0) {
    if (DRY_RUN) {
      console.log(`  [dry] CREATE TABLE ${TABLA_BACKUP} AS SELECT ...`);
    } else {
      await conn.execute(
        `CREATE TABLE ${TABLA_BACKUP} AS
         SELECT id, usuario_id, empresa_id, rol_empresa FROM empleador`,
      );
      console.log(`  Respaldo creado: ${TABLA_BACKUP}`);
    }
  } else {
    console.log(`  Respaldo ${TABLA_BACKUP} ya existía, no se toca`);
  }

  // ── 1 · Roles ─────────────────────────────────────────────────────
  const [cols] = await conn.query<any[]>(
    `SHOW COLUMNS FROM empleador LIKE 'rol_empresa'`,
  );
  const tipoActual: string = cols[0]?.Type ?? '';

  if (!tipoActual.includes("'empleador'")) {
    // Se ensancha para que acepte los cuatro valores a la vez; sin esto el
    // UPDATE de abajo falla con Data truncated.
    if (DRY_RUN) {
      console.log('  [dry] ALTER TABLE empleador MODIFY rol_empresa ENUM(4 valores)');
    } else {
      await conn.execute(
        `ALTER TABLE empleador
           MODIFY COLUMN rol_empresa
           ENUM('admin', 'miembro', 'empleador', 'colaborador')
           NOT NULL DEFAULT 'empleador'`,
      );
      console.log('  ENUM ensanchado a los cuatro valores');
    }
  } else {
    console.log('  ENUM ya aceptaba los valores nuevos');
  }

  const [viejos] = await conn.query<any[]>(
    `SELECT rol_empresa, COUNT(*) AS total FROM empleador
      WHERE rol_empresa IN ('admin', 'miembro') GROUP BY rol_empresa`,
  );
  const porMigrar = viejos.reduce((n, f) => n + Number(f.total), 0);

  if (porMigrar > 0) {
    if (DRY_RUN) {
      console.log(`  [dry] UPDATE de ${porMigrar} filas a empleador/colaborador`);
    } else {
      const [a] = await conn.execute<any>(
        `UPDATE empleador SET rol_empresa = 'empleador' WHERE rol_empresa = 'admin'`,
      );
      const [b] = await conn.execute<any>(
        `UPDATE empleador SET rol_empresa = 'colaborador' WHERE rol_empresa = 'miembro'`,
      );
      console.log(
        `  Roles migrados: ${a.affectedRows} a empleador, ${b.affectedRows} a colaborador`,
      );
    }
  } else {
    console.log('  No quedaban roles con los valores viejos');
  }

  // Filas en cadena vacía = alguien arrancó la app antes de correr esto.
  const [vacias] = await conn.query<any[]>(
    `SELECT COUNT(*) AS total FROM empleador WHERE rol_empresa = ''`,
  );
  if (Number(vacias[0]?.total) > 0) {
    console.log(
      `\n  ⚠️ Hay ${vacias[0].total} filas con rol_empresa vacío: la app arrancó\n` +
        `     antes de esta migración y synchronize redefinió el ENUM. Recuperar\n` +
        `     desde ${TABLA_BACKUP} antes de seguir.`,
    );
  }

  // ── 2 · Índices ───────────────────────────────────────────────────
  const indices = await leerIndices(conn);

  if (!indices.has(INDICE_NUEVO)) {
    if (DRY_RUN) {
      console.log(`  [dry] ALTER TABLE empleador ADD UNIQUE INDEX ${INDICE_NUEVO}`);
    } else {
      await conn.execute(
        `ALTER TABLE empleador
           ADD UNIQUE INDEX ${INDICE_NUEVO} (usuario_id, empresa_id)`,
      );
      console.log(`  Índice ${INDICE_NUEVO} creado`);
    }
  } else {
    console.log(`  Índice ${INDICE_NUEVO} ya existía`);
  }

  // El que hay que soltar: único, de una sola columna, sobre usuario_id.
  // Se busca por forma y no por nombre, porque el nombre lo generó TypeORM.
  const aSoltar = [...indices.entries()].filter(
    ([nombre, cols]) =>
      nombre !== INDICE_NUEVO &&
      cols.length === 1 &&
      cols[0].Column_name === 'usuario_id' &&
      Number(cols[0].Non_unique) === 0,
  );

  if (aSoltar.length === 0) {
    console.log('  No quedaba ningún índice único sobre usuario_id');
  }

  for (const [nombre] of aSoltar) {
    if (DRY_RUN) {
      console.log(`  [dry] ALTER TABLE empleador DROP INDEX \`${nombre}\``);
    } else {
      // Ya existe el compuesto, así que la FK queda sostenida y MySQL acepta.
      await conn.execute(`ALTER TABLE empleador DROP INDEX \`${nombre}\``);
      console.log(`  Índice único viejo soltado: ${nombre}`);
    }
  }

  // ── Verificación ──────────────────────────────────────────────────
  const [resumen] = await conn.query(
    `SELECT rol_empresa, COUNT(*) AS total FROM empleador GROUP BY rol_empresa`,
  );
  console.log('\n  Roles:');
  console.table(resumen);

  const finales = await leerIndices(conn);
  console.log('  Índices de empleador:');
  console.table(
    [...finales.entries()].map(([nombre, cols]) => ({
      indice: nombre,
      columnas: cols.map((c) => c.Column_name).join(', '),
      unico: Number(cols[0].Non_unique) === 0 ? 'sí' : 'no',
    })),
  );

  await conn.end();

  console.log(`\nMigración ${DRY_RUN ? 'simulada' : 'aplicada'}.`);
  if (!DRY_RUN) {
    console.log(
      'Ya se puede levantar el backend: synchronize agrega usuario.data y\n' +
        'estrecha el ENUM a los dos valores finales.\n',
    );
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
