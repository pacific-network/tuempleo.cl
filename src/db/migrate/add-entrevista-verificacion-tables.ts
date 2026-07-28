// src/db/migrate/add-entrevista-verificacion-tables.ts
//
// Script one-off e idempotente que crea las tablas `entrevista` y
// `verificacion_empresa` (feature "match + calendarización de entrevistas +
// verificación por SMS", commit 8f63429) en entornos con DB_SYNCHRONIZE=false.
//
// Por qué existe: el SQL original
// (src/db/migrations/2026-06-24_match_entrevistas_verificacion.sql) mezcla los
// CREATE TABLE con un `ALTER TABLE empresa ADD COLUMN` que NO es idempotente. Si
// esas columnas ya existían, el script abortaba y las tablas quedaban sin crear
// — que es lo que pasó en producción: `ER_NO_SUCH_TABLE: Table
// 'sql_tuempleo_cl.entrevista' doesn't exist`.
//
// Este script solo CREA TABLAS (CREATE TABLE IF NOT EXISTS). No toca `empresa`
// ni ninguna tabla existente, no borra ni modifica datos.
//
// Uso:  npm run migrate:entrevista-tables
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const DDL: Array<{ tabla: string; sql: string }> = [
  {
    tabla: 'entrevista',
    sql: `
      CREATE TABLE IF NOT EXISTS \`entrevista\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`postulacion_id\` INT NOT NULL,
        \`creado_por\` INT NULL,
        \`fecha_propuesta\` DATETIME NOT NULL,
        \`duracion_min\` INT NULL DEFAULT 30,
        \`modalidad_contacto\` ENUM('presencial','telefonica','videollamada','otro')
          NOT NULL DEFAULT 'presencial',
        \`detalle_contacto\` TEXT NULL,
        \`mensaje\` TEXT NULL,
        \`estado\` ENUM('propuesta','confirmada','reprogramada','cancelada','completada')
          NOT NULL DEFAULT 'propuesta',
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_entrevista_postulacion\` (\`postulacion_id\`),
        KEY \`idx_entrevista_creado_por\` (\`creado_por\`),
        CONSTRAINT \`fk_entrevista_postulacion\`
          FOREIGN KEY (\`postulacion_id\`) REFERENCES \`postulacion\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_entrevista_creado_por\`
          FOREIGN KEY (\`creado_por\`) REFERENCES \`empleador\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    tabla: 'verificacion_empresa',
    sql: `
      CREATE TABLE IF NOT EXISTS \`verificacion_empresa\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`empresa_id\` INT NOT NULL,
        \`telefono\` VARCHAR(20) NOT NULL,
        \`codigo\` VARCHAR(6) NOT NULL,
        \`estado\` ENUM('pendiente','verificada','expirada') NOT NULL DEFAULT 'pendiente',
        \`intentos\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`expiraEn\` DATETIME NOT NULL,
        \`verifiedAt\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_verif_empresa\` (\`empresa_id\`),
        KEY \`idx_verif_estado\` (\`empresa_id\`, \`estado\`),
        CONSTRAINT \`fk_verif_empresa\`
          FOREIGN KEY (\`empresa_id\`) REFERENCES \`empresa\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
];

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

  for (const { tabla, sql } of DDL) {
    // SHOW TABLES en lugar de information_schema: el usuario de producción
    // tiene ese esquema restringido.
    const antes = await dataSource.query(`SHOW TABLES LIKE '${tabla}'`);
    const yaExistia = antes.length > 0;

    await dataSource.query(sql);

    if (yaExistia) {
      console.log(`✔️  ${tabla}: ya existía → sin cambios.`);
      resumen.push({ tabla, estado: 'ya existía', accion: 'ninguna' });
    } else {
      console.log(`🔧 ${tabla}: creada.`);
      resumen.push({ tabla, estado: 'no existía', accion: 'creada' });
    }
  }

  console.table(resumen);

  await dataSource.destroy();
  console.log('✅ Listo. Reinicia el backend: pm2 restart backend');
}

run().catch((err) => {
  console.error('❌ Error ejecutando la migración:', err.message);
  process.exit(1);
});
