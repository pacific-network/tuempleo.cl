// src/db/migrate/add-empresa-verificacion.ts
//
// Script one-off e idempotente para agregar las columnas de verificación de
// empresa (feature "verificación por SMS", commit 8f63429) a la tabla `empresa`
// en entornos con DB_SYNCHRONIZE=false (producción).
//
// Uso:  npm run migrate:empresa-verificacion
//
// Es seguro correrlo varias veces: usa ADD COLUMN IF NOT EXISTS (MariaDB),
// por lo que no falla ni duplica si las columnas ya existen. Solo AGREGA
// columnas, nunca borra ni modifica datos existentes.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

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

  const sql = `
    ALTER TABLE \`empresa\`
      ADD COLUMN IF NOT EXISTS \`verificada\` TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS \`fecha_verificacion\` DATETIME NULL DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS \`telefono_verificado\` VARCHAR(20)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL;
  `;

  await dataSource.query(sql);
  console.log('✅ Columnas de verificación agregadas a `empresa` (o ya existían).');

  // Verificación: listar las columnas resultantes
  const cols = await dataSource.query(
    "SHOW COLUMNS FROM `empresa` WHERE Field IN ('verificada','fecha_verificacion','telefono_verificado');",
  );
  console.table(cols);

  await dataSource.destroy();
  console.log('✅ Listo. Reinicia el backend: pm2 restart backend');
}

run().catch((err) => {
  console.error('❌ Error ejecutando la migración:', err.message);
  process.exit(1);
});
