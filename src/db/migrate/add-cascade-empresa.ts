// src/db/migrate/add-cascade-empresa.ts
//
// Script one-off e idempotente que convierte a ON DELETE CASCADE las FKs hacia
// `empresa` de las tablas que se crean junto con la empresa misma.
//
// Problema que resuelve: `createBusiness` le cuelga a la empresa una promoción de
// bienvenida y su stock. Esas FKs eran RESTRICT, así que el rollback del onboarding
// (FormsService) nunca podía borrar la empresa cuando fallaba el paso siguiente:
// quedaba huérfana ocupando su RUT (único) y bloqueando todo reintento.
//
// Uso:  npm run migrate:cascade-empresa
//
// Es seguro correrlo varias veces: detecta el estado actual de cada FK vía
// SHOW CREATE TABLE y solo altera las que aún no son CASCADE. No borra datos:
// únicamente cambia la regla de integridad referencial.
//
// Nota: se usa SHOW CREATE TABLE en lugar de information_schema porque el usuario
// de producción tiene ese esquema restringido.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/** Tablas cuya FK a `empresa` debe pasar a CASCADE. */
const TABLAS = ['promocion', 'stock', 'stock_gratis'] as const;

const COLUMNA = 'empresa_id';

interface FkInfo {
  nombre: string;
  yaEsCascade: boolean;
}

/** Extrae la FK hacia `empresa` desde el output de SHOW CREATE TABLE. */
function parseFk(ddl: string): FkInfo | null {
  const regex = new RegExp(
    'CONSTRAINT `([^`]+)` FOREIGN KEY \\(`' +
    COLUMNA +
    '`\\) REFERENCES `empresa` \\(`id`\\)([^,\\n]*)',
    'i',
  );
  const match = ddl.match(regex);
  if (!match) return null;
  return {
    nombre: match[1],
    yaEsCascade: /ON DELETE CASCADE/i.test(match[2]),
  };
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

  const resumen: Array<Record<string, string>> = [];

  for (const tabla of TABLAS) {
    const [row] = await dataSource.query(`SHOW CREATE TABLE \`${tabla}\``);
    const ddl: string = row['Create Table'] ?? row['Create View'] ?? '';
    const fk = parseFk(ddl);

    if (!fk) {
      console.warn(`⚠️  ${tabla}: no se encontró FK sobre ${COLUMNA} → sin cambios.`);
      resumen.push({ tabla, estado: 'sin FK encontrada', accion: 'ninguna' });
      continue;
    }

    if (fk.yaEsCascade) {
      console.log(`✔️  ${tabla}: la FK ${fk.nombre} ya es CASCADE → sin cambios.`);
      resumen.push({ tabla, estado: 'ya era CASCADE', accion: 'ninguna' });
      continue;
    }

    // DROP + ADD: MySQL/MariaDB no permite modificar ON DELETE en un solo paso.
    await dataSource.query(
      `ALTER TABLE \`${tabla}\` DROP FOREIGN KEY \`${fk.nombre}\``,
    );
    await dataSource.query(
      `ALTER TABLE \`${tabla}\`
         ADD CONSTRAINT \`${fk.nombre}\`
         FOREIGN KEY (\`${COLUMNA}\`) REFERENCES \`empresa\` (\`id\`)
         ON DELETE CASCADE`,
    );
    console.log(`🔧 ${tabla}: FK ${fk.nombre} convertida a ON DELETE CASCADE.`);
    resumen.push({ tabla, estado: 'era RESTRICT', accion: 'convertida a CASCADE' });
  }

  console.table(resumen);

  await dataSource.destroy();
  console.log('✅ Listo. Reinicia el backend: pm2 restart backend');
}

run().catch((err) => {
  console.error('❌ Error ejecutando la migración:', err.message);
  process.exit(1);
});
