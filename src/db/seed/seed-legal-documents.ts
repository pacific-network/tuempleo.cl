/**
 * Seed: Crear documentos legales iniciales (Terminos y Privacidad v1.0)
 *
 * Uso:
 *   npm run seed:legal
 *
 * Variables requeridas en .env:
 *   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
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

const TERMS_CONTENT = `
<h1>Terminos y Condiciones de Uso - tuempleo.cl</h1>
<p><strong>Version 1.0</strong> - Vigente desde su publicacion.</p>

<h2>1. Aceptacion de los Terminos</h2>
<p>Al registrarse y utilizar la plataforma tuempleo.cl, usted acepta estos terminos y condiciones en su totalidad.</p>

<h2>2. Descripcion del Servicio</h2>
<p>tuempleo.cl es una plataforma de intermediacion laboral que conecta postulantes con empleadores en Chile.</p>

<h2>3. Registro y Cuenta</h2>
<p>El usuario se compromete a proporcionar informacion veridica y mantener la confidencialidad de sus credenciales de acceso.</p>

<h2>4. Uso Aceptable</h2>
<p>Queda prohibido el uso de la plataforma para fines ilegales, publicar informacion falsa, o cualquier actividad que perjudique a otros usuarios.</p>

<h2>5. Propiedad Intelectual</h2>
<p>Todo el contenido de la plataforma es propiedad de tuempleo.cl, salvo el contenido generado por los usuarios.</p>

<h2>6. Limitacion de Responsabilidad</h2>
<p>tuempleo.cl actua como intermediario y no garantiza la contratacion ni la veracidad de las ofertas publicadas por terceros.</p>

<h2>7. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar estos terminos. Los cambios seran notificados a traves de la plataforma.</p>

<h2>8. Ley Aplicable</h2>
<p>Estos terminos se rigen por las leyes de la Republica de Chile.</p>
`.trim();

const PRIVACY_CONTENT = `
<h1>Politica de Privacidad - tuempleo.cl</h1>
<p><strong>Version 1.0</strong> - Vigente desde su publicacion.</p>
<p>En cumplimiento de la Ley 19.628 sobre Proteccion de la Vida Privada y sus modificaciones.</p>

<h2>1. Responsable del Tratamiento</h2>
<p>tuempleo.cl es responsable del tratamiento de sus datos personales.</p>

<h2>2. Datos que Recopilamos</h2>
<ul>
  <li>Datos de identificacion: nombre, apellidos, RUT, correo electronico</li>
  <li>Datos laborales: experiencia, educacion, habilidades</li>
  <li>Datos de contacto: telefono, direccion, comuna</li>
  <li>Datos de navegacion: IP, dispositivo, cookies</li>
</ul>

<h2>3. Finalidad del Tratamiento</h2>
<ul>
  <li>Facilitar la busqueda y postulacion a empleos</li>
  <li>Permitir a empleadores publicar ofertas y gestionar candidatos</li>
  <li>Enviar notificaciones relacionadas con el servicio</li>
  <li>Mejorar la experiencia de usuario</li>
</ul>

<h2>4. Base Legal</h2>
<p>El tratamiento se basa en su consentimiento explicito otorgado al registrarse en la plataforma.</p>

<h2>5. Derechos del Titular</h2>
<p>Usted tiene derecho a:</p>
<ul>
  <li>Acceder a sus datos personales</li>
  <li>Rectificar datos inexactos</li>
  <li>Solicitar la eliminacion de sus datos</li>
  <li>Exportar sus datos en formato digital</li>
  <li>Revocar su consentimiento en cualquier momento</li>
</ul>

<h2>6. Eliminacion de Cuenta</h2>
<p>Puede solicitar la eliminacion completa de su cuenta y datos personales desde la configuracion de su perfil. Los datos financieros se anonimizaran conforme a las obligaciones legales de retencion.</p>

<h2>7. Seguridad</h2>
<p>Implementamos medidas de seguridad tecnicas y organizativas para proteger sus datos, incluyendo encriptacion y control de acceso.</p>

<h2>8. Contacto</h2>
<p>Para ejercer sus derechos o consultas sobre privacidad: <strong>soporte@tuempleo.cl</strong></p>
`.trim();

async function main() {
  const conn = await mysql2.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('\nSeed documentos legales...');

  // Terms v1.0
  await conn.execute(
    `INSERT INTO legal_document (type, version, content, is_current)
     VALUES (?, ?, ?, true)
     ON DUPLICATE KEY UPDATE content = VALUES(content), is_current = true`,
    ['terms', '1.0', TERMS_CONTENT],
  );
  console.log('  legal_document: terms v1.0 OK');

  // Privacy v1.0
  await conn.execute(
    `INSERT INTO legal_document (type, version, content, is_current)
     VALUES (?, ?, ?, true)
     ON DUPLICATE KEY UPDATE content = VALUES(content), is_current = true`,
    ['privacy', '1.0', PRIVACY_CONTENT],
  );
  console.log('  legal_document: privacy v1.0 OK');

  await conn.end();
  console.log('\nDocumentos legales creados exitosamente.\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
