/**
 * Backfill: `postulacion.match_score` y `match_desglose`.
 *
 * Uso:
 *   DRY_RUN=1 npm run migrate:match-score   # solo reporta, no escribe
 *   npm run migrate:match-score             # aplica
 *
 * Las postulaciones anteriores a estas columnas quedan en NULL, así que la
 * lista del empleador saldría sin ranking hasta que llegue una postulación
 * nueva. Este script las calcula.
 *
 * ⚠️ Con una diferencia que importa: al postular, el score se congela con el
 * perfil que el candidato tenía en ese momento. Acá se calcula con el perfil de
 * HOY, porque no hay registro de cómo era antes. Es una aproximación — sirve
 * para tener ranking sobre lo que ya existe, no como dato histórico fino.
 *
 * Es idempotente: solo toca las que están en NULL. Correrlo de nuevo no
 * recalcula las que ya tienen score.
 */

import * as dotenv from 'dotenv';
import * as mysql2 from 'mysql2/promise';
import { scoreOfertaPostulante, parseOfertaData } from '../../modules/match/match.scoring';

dotenv.config();

const REQUIRED = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno: ${key}`);
    process.exit(1);
  }
}

const DRY_RUN = process.env.DRY_RUN === '1';

/** El campo `data` puede venir como objeto (json) o como texto (columna text). */
function comoObjeto(valor: unknown): Record<string, any> {
  if (!valor) return {};
  if (typeof valor === 'object') return valor as Record<string, any>;
  try {
    return JSON.parse(String(valor));
  } catch {
    return {};
  }
}

async function main() {
  const conn = await mysql2.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tuempleo',
    charset: 'utf8mb4',
  });

  console.log(`\nBackfill de match_score${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // SHOW COLUMNS en vez de information_schema: el usuario de producción no
  // tiene permiso sobre ese esquema.
  const [cols] = await conn.query<any[]>(
    `SHOW COLUMNS FROM postulacion LIKE 'match_score'`,
  );
  if (cols.length === 0) {
    console.error(
      '  La columna match_score no existe todavía.\n' +
        '  Levantá el backend una vez para que synchronize la cree, y volvé a correr esto.\n',
    );
    await conn.end();
    process.exit(1);
  }

  const [filas] = await conn.query<any[]>(
    `SELECT p.id, o.data AS oferta_data, post.data AS postulante_data
       FROM postulacion p
       JOIN oferta o     ON o.id = p.oferta_id
       JOIN postulante post ON post.id = p.postulante_id
      WHERE p.match_score IS NULL`,
  );

  console.log(`  Postulaciones sin score: ${filas.length}\n`);

  if (filas.length === 0) {
    await conn.end();
    console.log('  Nada que hacer.\n');
    return;
  }

  const tramos = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
  let escritas = 0;

  for (const f of filas) {
    const { score, desglose } = scoreOfertaPostulante(
      parseOfertaData({ data: f.oferta_data }),
      comoObjeto(f.postulante_data),
    );

    if (score <= 25) tramos['0-25']++;
    else if (score <= 50) tramos['26-50']++;
    else if (score <= 75) tramos['51-75']++;
    else tramos['76-100']++;

    if (!DRY_RUN) {
      await conn.execute(
        `UPDATE postulacion SET match_score = ?, match_desglose = ? WHERE id = ?`,
        [score, JSON.stringify(desglose), f.id],
      );
      escritas++;
    }
  }

  console.log('  Distribución del match calculado:');
  console.table(
    Object.entries(tramos).map(([tramo, total]) => ({
      tramo,
      postulaciones: total,
      porcentaje: `${Math.round((total / filas.length) * 100)}%`,
    })),
  );

  await conn.end();

  console.log(
    DRY_RUN
      ? '\n  Simulado: no se escribió nada.\n'
      : `\n  ${escritas} postulaciones actualizadas.\n`,
  );

  if (tramos['0-25'] / filas.length > 0.5) {
    console.log(
      '  Ojo: más de la mitad quedó bajo 25. Antes de leerlo como "los candidatos\n' +
        '  no calzan", conviene revisar si las ofertas tienen area_trabajo, modalidad y\n' +
        '  nivel_experiencia cargados — sin esos campos el scoring no tiene con qué\n' +
        '  comparar y el puntaje baja por falta de datos, no por falta de match.\n',
    );
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
