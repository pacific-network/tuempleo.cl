// src/db/migrate/rename-educacion-annos.ts
//
// Script one-off e idempotente que unifica los nombres de las claves de año en
// `postulante.data.educacion[]`:
//
//     anio_inicio        →  anno_inicio
//     anio_finalizacion  →  anno_termino
//
// Contexto: `EducacionDto` declaraba anio_inicio/anio_finalizacion mientras
// `ExperienciaDto` usaba anno_inicio/anno_termino. El front mandaba la convención
// de experiencia en ambas secciones, así que el ValidationPipe (whitelist +
// forbidNonWhitelisted) rechazaba el formulario con
// "data.educacion.0.property anno_inicio should not exist".
//
// El DTO quedó unificado en anno_* (la convención que ya usaba el front y
// experiencia); este script alinea los registros que se guardaron con anio_*, que
// de lo contrario quedarían con datos invisibles para el front.
//
// Uso:  npm run migrate:educacion-annos
//       npm run migrate:educacion-annos -- --dry-run
//
// Es seguro correrlo varias veces: solo renombra claves anio_* presentes y nunca
// sobrescribe un anno_* que ya tenga valor. No borra ni crea registros.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

/** anio_* (viejo) → anno_* (nuevo) */
const RENAMES: Array<[string, string]> = [
  ['anio_inicio', 'anno_inicio'],
  ['anio_finalizacion', 'anno_termino'],
];

interface Fila {
  id: number;
  data: string | Record<string, any> | null;
}

/**
 * Renombra las claves en cada item de educacion.
 * Devuelve true si el objeto fue modificado.
 */
function migrarEducacion(data: Record<string, any>): boolean {
  const educacion = data?.educacion;
  if (!Array.isArray(educacion)) return false;

  let cambiado = false;

  for (const item of educacion) {
    if (!item || typeof item !== 'object') continue;

    for (const [viejo, nuevo] of RENAMES) {
      if (!(viejo in item)) continue;

      const valorViejo = item[viejo];
      const nuevoVacio =
        item[nuevo] === undefined || item[nuevo] === null || item[nuevo] === '';

      // Nunca pisar un valor nuevo ya cargado: si ambos existen, gana anno_*.
      if (nuevoVacio && valorViejo !== undefined) {
        item[nuevo] = valorViejo;
      }
      delete item[viejo];
      cambiado = true;
    }
  }

  return cambiado;
}

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tuempleo',
    charset: 'utf8mb4',
  });

  await dataSource.initialize();
  console.log('✅ Conectado a la base de datos:', process.env.DB_NAME);
  if (DRY_RUN) console.log('🔍 DRY RUN: no se va a escribir nada.\n');

  const filas: Fila[] = await dataSource.query(
    'SELECT id, data FROM postulante WHERE data IS NOT NULL',
  );

  const tocados: Array<Record<string, any>> = [];

  for (const fila of filas) {
    let data: Record<string, any>;
    try {
      data = typeof fila.data === 'string' ? JSON.parse(fila.data) : (fila.data as any);
    } catch {
      console.warn(`⚠️  postulante ${fila.id}: data no es JSON válido → se omite.`);
      continue;
    }
    if (!data) continue;

    const antes = JSON.stringify(data.educacion ?? null);
    if (!migrarEducacion(data)) continue;

    tocados.push({
      postulante: fila.id,
      educacion_items: Array.isArray(data.educacion) ? data.educacion.length : 0,
    });

    if (!DRY_RUN) {
      await dataSource.query('UPDATE postulante SET data = ? WHERE id = ?', [
        JSON.stringify(data),
        fila.id,
      ]);
    }
    console.log(
      `${DRY_RUN ? '🔍' : '🔧'} postulante ${fila.id}: educacion actualizada`,
    );
    if (DRY_RUN) {
      console.log(`    antes:   ${antes}`);
      console.log(`    después: ${JSON.stringify(data.educacion)}`);
    }
  }

  console.log(
    `\n${tocados.length === 0 ? '✔️  Nada que migrar' : `Registros ${DRY_RUN ? 'a migrar' : 'migrados'}: ${tocados.length}`}` +
      ` (de ${filas.length} postulantes revisados)`,
  );
  if (tocados.length) console.table(tocados);

  await dataSource.destroy();
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN: no se modificó nada. Correr sin --dry-run para aplicar.');
  } else {
    console.log('\n✅ Listo. Reinicia el backend: pm2 restart backend');
  }
}

run().catch((err) => {
  console.error('❌ Error ejecutando la migración:', err.message);
  process.exit(1);
});
