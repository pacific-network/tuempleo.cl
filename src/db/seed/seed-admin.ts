/**
 * Seed: Crear usuario administrador
 *
 * Uso:
 *   ADMIN_EMAIL=admin@tuempleo.cl ADMIN_PASSWORD=TuPassword123 npm run seed:admin
 *
 * Variables requeridas en .env (o como env vars):
 *   JWT_SECRET, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 */

import * as dotenv from 'dotenv';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import * as mysql2 from 'mysql2/promise';

dotenv.config();

// ─────────────────────────────────────────
// Validar variables requeridas
// ─────────────────────────────────────────
const REQUIRED = ['JWT_SECRET', 'DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`❌ Falta la variable de entorno: ${key}`);
    process.exit(1);
  }
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const JWT_SECRET     = process.env.JWT_SECRET!;

// ─────────────────────────────────────────
// Encriptación (misma lógica que EncryptService)
// ─────────────────────────────────────────
function encrypt(data: string): string {
  const key = createHash('sha256').update(JWT_SECRET).digest();
  const iv  = randomBytes(16);
  const cipher = createCipheriv('aes-256-ctr', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
async function main() {
  const conn = await mysql2.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(`\n🔧 Seed admin → ${ADMIN_EMAIL}`);

  const passwordEncryptado = encrypt(ADMIN_PASSWORD);

  // 1. Registro (tabla de acceso/login)
  await conn.execute(`
    INSERT INTO registro (nombre_completo, email, password, es_activo)
    VALUES (?, ?, ?, true)
    ON DUPLICATE KEY UPDATE
      password  = VALUES(password),
      es_activo = true
  `, ['Administrador', ADMIN_EMAIL, passwordEncryptado]);

  console.log('  ✅ registro OK');

  // 2. Usuario (tabla con isAdmin)
  await conn.execute(`
    INSERT INTO usuario (nombres, apellidos, email, password, is_activo, isAdmin)
    VALUES (?, ?, ?, ?, true, true)
    ON DUPLICATE KEY UPDATE
      isAdmin   = true,
      is_activo = true,
      password  = VALUES(password)
  `, ['Admin', 'tuempleo', ADMIN_EMAIL, passwordEncryptado]);

  console.log('  ✅ usuario OK (isAdmin = true)');

  await conn.end();
  console.log('\n🎉 Admin creado. Haz login con:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Endpoint: POST /v1/auth/login-empleador\n`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
