/**
 * Seed: Publicar documentos legales (Términos y Privacidad v1.1)
 *
 * Uso:
 *   npm run seed:legal
 *
 * Variables requeridas en .env:
 *   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
 *
 * Versionado: `consent_record.document_version` guarda qué versión aceptó cada
 * usuario, por lo que el contenido de una versión ya publicada NO se sobrescribe.
 * Este seed publica la v1.1 y baja `is_current` de las versiones anteriores; la
 * v1.0 queda en la tabla como registro histórico de lo que se aceptó.
 *
 * ⚠️ El texto legal debe ser revisado por un abogado antes de publicarse en
 * producción. Las referencias normativas (Ley 19.628 y Ley 21.719) y sus plazos
 * de entrada en vigencia deben confirmarse con asesoría profesional.
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

/** Versión que este seed publica como vigente. */
const VERSION = '1.1';

const TERMS_CONTENT = `
<h1>Términos y Condiciones de Uso - tuvacante.com</h1>
<p><strong>Versión 1.1</strong> - Vigente desde su publicación.</p>

<h2>1. Aceptación de los Términos</h2>
<p>Al registrarse y utilizar la plataforma tuvacante.com, usted acepta estos términos y condiciones en su totalidad.</p>

<h2>2. Descripción del Servicio</h2>
<p>tuvacante.com es una plataforma de intermediación laboral que conecta postulantes con empleadores en Chile.</p>

<h2>3. Registro y Cuenta</h2>
<p>El usuario se compromete a proporcionar información verídica y mantener la confidencialidad de sus credenciales de acceso. Es responsable de toda actividad realizada desde su cuenta.</p>

<h2>4. Uso Aceptable</h2>
<p>Queda prohibido el uso de la plataforma para fines ilegales, publicar información falsa, suplantar la identidad de terceros, o cualquier actividad que perjudique a otros usuarios.</p>

<h2>5. Publicación de Ofertas</h2>
<p>Los empleadores son responsables de la veracidad, legalidad y vigencia de las ofertas que publican. Las ofertas no pueden contener requisitos discriminatorios contrarios a la legislación laboral chilena.</p>

<h2>6. Propiedad Intelectual</h2>
<p>Todo el contenido de la plataforma es propiedad de tuvacante.com, salvo el contenido generado por los usuarios, quienes conservan sus derechos y otorgan una licencia de uso para la prestación del servicio.</p>

<h2>7. Protección de Datos Personales</h2>
<p>El tratamiento de sus datos personales se rige por nuestra Política de Privacidad, que forma parte integrante de estos términos y se ajusta a la normativa chilena de protección de datos personales.</p>

<h2>8. Limitación de Responsabilidad</h2>
<p>tuvacante.com actúa como intermediario y no garantiza la contratación ni la veracidad de las ofertas publicadas por terceros. No somos parte de la relación laboral que pueda originarse entre usuarios.</p>

<h2>9. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma y se publicarán como una nueva versión, conservando el registro de la versión que usted aceptó.</p>

<h2>10. Ley Aplicable</h2>
<p>Estos términos se rigen por las leyes de la República de Chile.</p>
`.trim();

const PRIVACY_CONTENT = `
<h1>Política de Privacidad - tuvacante.com</h1>
<p><strong>Versión 1.1</strong> - Vigente desde su publicación.</p>
<p>En cumplimiento de la Ley N° 19.628 sobre Protección de la Vida Privada y de la Ley N° 21.719, que moderniza el régimen chileno de protección de datos personales y crea la Agencia de Protección de Datos Personales.</p>

<h2>1. Responsable del Tratamiento</h2>
<p>tuvacante.com es responsable del tratamiento de sus datos personales y del cumplimiento de los deberes que la normativa le impone en tal calidad.</p>

<h2>2. Principios que Aplicamos</h2>
<p>El tratamiento de sus datos se rige por los principios de licitud y lealtad, finalidad, proporcionalidad, calidad, responsabilidad, seguridad, transparencia e información, y confidencialidad.</p>

<h2>3. Datos que Recopilamos</h2>
<ul>
  <li>Datos de identificación: nombre, apellidos, RUT, correo electrónico</li>
  <li>Datos laborales: experiencia, educación, habilidades</li>
  <li>Datos de contacto: teléfono, dirección, comuna</li>
  <li>Datos de navegación: IP, dispositivo, cookies</li>
</ul>

<h2>4. Finalidad del Tratamiento</h2>
<ul>
  <li>Facilitar la búsqueda y postulación a empleos</li>
  <li>Permitir a empleadores publicar ofertas y gestionar candidatos</li>
  <li>Enviar notificaciones relacionadas con el servicio</li>
  <li>Mejorar la experiencia de usuario</li>
</ul>
<p>Sus datos no se utilizan para finalidades distintas de las informadas sin obtener previamente su consentimiento.</p>

<h2>5. Base de Licitud</h2>
<p>El tratamiento se basa en el consentimiento libre, informado y específico que usted otorga al registrarse, y en la necesidad de ejecutar la relación contractual que nos vincula. Cuando el tratamiento se funde en su consentimiento, puede revocarlo en cualquier momento.</p>

<h2>6. Derechos del Titular</h2>
<p>Usted puede ejercer en cualquier momento sus derechos de:</p>
<ul>
  <li><strong>Acceso:</strong> conocer qué datos suyos tratamos y con qué finalidad</li>
  <li><strong>Rectificación:</strong> corregir datos inexactos, desactualizados o incompletos</li>
  <li><strong>Supresión:</strong> solicitar la eliminación de sus datos</li>
  <li><strong>Oposición:</strong> oponerse a tratamientos específicos</li>
  <li><strong>Portabilidad:</strong> obtener sus datos en un formato estructurado y de uso común</li>
  <li><strong>Bloqueo:</strong> suspender temporalmente el tratamiento</li>
</ul>
<p>También puede revocar su consentimiento y, si estima vulnerados sus derechos, reclamar ante la autoridad de control competente.</p>

<h2>7. Plazo de Conservación</h2>
<p>Conservamos sus datos mientras su cuenta permanezca activa y mientras sean necesarios para las finalidades informadas. Cumplido ese plazo, se eliminan o anonimizan, salvo obligación legal de retención.</p>

<h2>8. Eliminación de Cuenta</h2>
<p>Puede solicitar la eliminación completa de su cuenta y datos personales desde la configuración de su perfil. Los datos financieros se anonimizarán conforme a las obligaciones legales de retención.</p>

<h2>9. Comunicación de Datos a Terceros</h2>
<p>Al postular a una oferta, los datos de su perfil y postulación se comunican al empleador correspondiente para que evalúe su candidatura. No vendemos sus datos personales.</p>

<h2>10. Seguridad</h2>
<p>Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos, incluyendo encriptación y control de acceso.</p>

<h2>11. Vulneraciones de Seguridad</h2>
<p>Ante una vulneración de seguridad que afecte sus datos personales y pueda entrañar un riesgo para sus derechos, notificaremos a la autoridad competente y a los titulares afectados conforme a la normativa vigente.</p>

<h2>12. Contacto</h2>
<p>Para ejercer sus derechos o realizar consultas sobre privacidad: <strong>soporte@tuvacante.com</strong></p>
`.trim();

async function main() {
  const conn = await mysql2.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  console.log(`\nSeed documentos legales (v${VERSION})...`);

  const documentos: Array<{ type: 'terms' | 'privacy'; content: string }> = [
    { type: 'terms', content: TERMS_CONTENT },
    { type: 'privacy', content: PRIVACY_CONTENT },
  ];

  // Transacción: evita quedar sin ningún documento vigente si algo falla entre
  // bajar la versión anterior y publicar la nueva.
  await conn.beginTransaction();
  try {
    for (const { type, content } of documentos) {
      // 1) Las versiones anteriores dejan de ser la vigente, pero se conservan:
      //    consent_record apunta a ellas por número de versión.
      await conn.execute(
        `UPDATE legal_document SET is_current = false WHERE type = ?`,
        [type],
      );

      // 2) Publicar la versión nueva. El ON DUPLICATE hace idempotente al seed
      //    sobre la clave única (type, version).
      await conn.execute(
        `INSERT INTO legal_document (type, version, content, is_current)
         VALUES (?, ?, ?, true)
         ON DUPLICATE KEY UPDATE content = VALUES(content), is_current = true`,
        [type, VERSION, content],
      );

      console.log(`  legal_document: ${type} v${VERSION} publicado como vigente`);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  // Verificación: mostrar el estado de todas las versiones por tipo.
  const [rows] = await conn.query(
    `SELECT type, version, is_current, created_at
       FROM legal_document ORDER BY type, version`,
  );
  console.table(rows);

  await conn.end();
  console.log('\nDocumentos legales publicados exitosamente.\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
