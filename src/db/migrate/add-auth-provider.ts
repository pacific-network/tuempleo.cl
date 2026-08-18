/**
 * Migración: `usuario.auth_provider` + limpieza de los dummy passwords de OAuth
 *
 * Uso:
 *   npm run migrate:auth-provider          # aplica
 *   DRY_RUN=1 npm run migrate:auth-provider  # solo reporta, no escribe
 *
 * Por qué no es un .sql: las cuentas creadas por OAuth no son distinguibles desde
 * SQL. La única marca que dejaron es su `password`, que guarda el texto cifrado de
 * `oauth:<email>:<timestamp>` — hay que descifrarlo para reconocerlas. El cifrado
 * es AES-256-CTR reversible con clave `sha256(JWT_SECRET)`, el mismo que usa
 * `EncryptService` (ver SECURITY-AUDIT.md:25, pendiente de migrar a bcrypt/argon2).
 *
 * Qué hace:
 *   1. Agrega `auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'` si no existe.
 *   2. Recorre los usuarios, descifra `password` y marca como `google` los que
 *      resulten en un `oauth:...`, reemplazando el dummy por el centinela `!oauth`.
 *
 * Es idempotente: correrlo dos veces no cambia nada la segunda vez.
 *
 * ⚠️ Requiere el mismo `JWT_SECRET` con el que se cifraron las contraseñas. Si se
 * rotó, el descifrado falla y esas cuentas quedan como `local` — el script las
 * reporta al final para revisarlas a mano.
 */

import * as dotenv from 'dotenv';
import * as mysql2 from 'mysql2/promise';
import { createDecipheriv, createHash } from 'crypto';

dotenv.config();

const REQUIRED = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno: ${key}`);
    process.exit(1);
  }
}

const DRY_RUN = process.env.DRY_RUN === '1';

/** Mismo esquema que EncryptService.decrypt, sin levantar Nest. */
function decrypt(encryptedText: string): string | null {
  try {
    const key = createHash('sha256')
      .update(process.env.JWT_SECRET as string)
      .digest();
    const data = Buffer.from(encryptedText, 'base64');
    const iv = data.subarray(0, 16);
    const payload = data.subarray(16);
    const decipher = createDecipheriv('aes-256-ctr', key, iv);
    return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf-8');
  } catch {
    return null;
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

  console.log(`\nMigración auth_provider${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  // 1) Columna. SHOW COLUMNS en vez de information_schema: el usuario de
  //    producción no tiene permiso sobre ese esquema.
  const [cols] = await conn.query<any[]>(
    `SHOW COLUMNS FROM usuario LIKE 'auth_provider'`,
  );

  if (cols.length === 0) {
    if (DRY_RUN) {
      console.log('  [dry] ALTER TABLE usuario ADD COLUMN auth_provider ...');
    } else {
      await conn.execute(
        `ALTER TABLE usuario
           ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'`,
      );
      console.log('  usuario.auth_provider creada');
    }
  } else {
    console.log('  usuario.auth_provider ya existía, no se toca');
  }

  if (cols.length === 0 && DRY_RUN) {
    console.log('\n  [dry] Sin la columna no se puede simular el backfill. Fin.\n');
    await conn.end();
    return;
  }

  // 2) Backfill. Solo mira las que todavía figuran como locales.
  const [usuarios] = await conn.query<any[]>(
    `SELECT id, email, password FROM usuario WHERE auth_provider = 'local'`,
  );

  let marcados = 0;
  let indescifrables = 0;

  for (const u of usuarios) {
    if (u.password === '!oauth') {
      // Centinela ya escrito por una corrida anterior sin marcar el provider.
      if (!DRY_RUN) {
        await conn.execute(
          `UPDATE usuario SET auth_provider = 'google' WHERE id = ?`,
          [u.id],
        );
      }
      marcados++;
      continue;
    }

    const plano = decrypt(u.password);

    if (plano === null) {
      indescifrables++;
      continue;
    }

    if (plano.startsWith('oauth:')) {
      if (!DRY_RUN) {
        await conn.execute(
          `UPDATE usuario SET auth_provider = 'google', password = '!oauth' WHERE id = ?`,
          [u.id],
        );
      }
      marcados++;
    }
  }

  console.log(`\n  Usuarios revisados:        ${usuarios.length}`);
  console.log(`  Marcados como OAuth:       ${marcados}`);
  console.log(`  Password indescifrable:    ${indescifrables}`);

  if (indescifrables > 0) {
    console.log(
      '\n  ⚠️ Hay contraseñas que no se pudieron descifrar con el JWT_SECRET actual.\n' +
        '     Quedaron como "local". Si alguna era una cuenta OAuth, su dueño no podrá\n' +
        '     eliminar su cuenta hasta corregirla a mano.',
    );
  }

  const [resumen] = await conn.query(
    `SELECT auth_provider, COUNT(*) AS total FROM usuario GROUP BY auth_provider`,
  );
  console.table(resumen);

  await conn.end();
  console.log(`\nMigración ${DRY_RUN ? 'simulada' : 'aplicada'}.\n`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
