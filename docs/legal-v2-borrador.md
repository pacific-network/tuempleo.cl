# Borrador v2.0 de los documentos legales (Ley 21.719)

**Estado:** NO publicado. Guardado el 17 de agosto de 2026 al revertir
`src/db/seed/seed-legal-documents.ts` a la v1.1, que es la que se publica.

Este es el texto que se redactó para adecuar Términos y Privacidad a la
**Ley N° 21.719**, plenamente exigible desde el **1 de diciembre de 2026**.
Queda acá para retomarlo antes de esa fecha.

## Qué falta antes de poder publicarlo

- Completar `{{RAZON_SOCIAL}}`, `{{RUT_EMPRESA}}`, `{{DOMICILIO}}` y `{{COMUNA_TRIBUNALES}}`.
- Revisión por abogado.
- Confirmar la edad mínima de registro (el borrador fija 18 años).
- Resolver los pendientes de `docs/pendientes-ley-21719.md`, secciones 3 y 6.

Al publicarlo, la versión sube y `ConsentChecker` le va a pedir a toda la base
que acepte de nuevo. Ver §2.2 de `docs/pendientes-ley-21719.md`.

---

## Términos y Condiciones — v2.0

```html
<h1>Términos y Condiciones de Uso - tuvacante.com</h1>
<p><strong>Versión 2.0</strong> - Vigente desde el ${VIGENCIA}. Reemplaza a la versión 1.1.</p>

<h2>1. Identificación del titular y aceptación</h2>
<p>tuvacante.com es una plataforma operada por <strong>{{RAZON_SOCIAL}}</strong>, RUT <strong>{{RUT_EMPRESA}}</strong>, con domicilio en <strong>{{DOMICILIO}}</strong> (en adelante, "tuvacante.com" o "la plataforma"). El único dominio oficial del servicio es <strong>tuvacante.com</strong>; cualquier otro dominio que redirija hacia él corresponde al mismo titular y se rige por estos mismos términos.</p>
<p>Al registrarse y utilizar la plataforma, usted acepta estos términos y condiciones en su totalidad. Si no está de acuerdo con ellos, debe abstenerse de usar el servicio.</p>

<h2>2. Descripción del servicio</h2>
<p>tuvacante.com es una plataforma de intermediación laboral que conecta postulantes con empleadores en Chile. Ponemos a disposición un espacio donde los empleadores publican ofertas y los postulantes se registran, construyen su perfil y postulan a ellas.</p>
<p>tuvacante.com <strong>no es empleador</strong> ni parte de la relación laboral que pueda originarse entre usuarios, no participa en la selección ni en la decisión de contratación, y no garantiza la obtención de un empleo ni la provisión de candidatos.</p>

<h2>3. Gratuidad para los postulantes</h2>
<p>El registro, la publicación del perfil y la postulación a ofertas son <strong>gratuitos para los postulantes</strong>. tuvacante.com no cobra ni cobrará suma alguna a los trabajadores por su colocación o intermediación.</p>
<p>Ningún empleador puede exigir pagos a los candidatos como condición para postular, avanzar en un proceso o ser contratado. Si recibe una solicitud de este tipo a través de la plataforma, repórtela a <strong>soporte@tuvacante.com</strong>: es causal de baja inmediata de la oferta y de la cuenta responsable.</p>

<h2>4. Registro y cuenta</h2>
<p>Para registrarse debe ser mayor de 18 años y tener capacidad legal para contratar. El usuario se compromete a proporcionar información verídica, completa y actualizada, y a mantener la confidencialidad de sus credenciales de acceso. Es responsable de toda actividad realizada desde su cuenta.</p>
<p>Quien se registre en representación de una empresa declara contar con facultades suficientes para obligarla, y responde por el uso que hagan los colaboradores que invite a esa cuenta.</p>

<h2>5. Uso aceptable</h2>
<p>Queda prohibido usar la plataforma para fines ilegales, publicar información falsa o engañosa, suplantar la identidad de terceros, extraer masivamente datos de perfiles u ofertas por medios automatizados, enviar comunicaciones comerciales no solicitadas a otros usuarios, o realizar cualquier actividad que perjudique a otros usuarios o al funcionamiento del servicio.</p>
<p>Los datos de contacto de los candidatos a los que acceda un empleador solo pueden utilizarse para el proceso de selección concreto en el que participan.</p>

<h2>6. Publicación de ofertas</h2>
<p>Los empleadores son responsables de la veracidad, legalidad y vigencia de las ofertas que publican. Las ofertas deben corresponder a vacantes reales y no pueden contener requisitos discriminatorios contrarios al artículo 2° del Código del Trabajo, tales como exigencias de raza, color, sexo, edad, estado civil, sindicación, religión, opinión política, nacionalidad, ascendencia nacional, situación socioeconómica, apariencia personal, enfermedad o discapacidad, salvo las calificaciones exigidas para un empleo determinado por la ley.</p>
<p>tuvacante.com puede rechazar, editar o dar de baja una oferta que infrinja estos términos o la legislación vigente, sin que ello genere derecho a indemnización.</p>

<h2>7. Postulaciones y cierre de procesos</h2>
<p>Las postulaciones son gestionadas por el empleador, que decide libremente sobre el avance y el resultado del proceso.</p>
<p>Para no dejar postulaciones abiertas de forma indefinida, la plataforma <strong>cierra automáticamente</strong> aquellas que quedan sin resolución y le informa el motivo al candidato. Esto ocurre cuando la oferta expira, cuando se completan todas sus vacantes, cuando el empleador retira el aviso, o cuando la postulación permanece sin movimiento durante el plazo configurado (30 días por defecto). El cierre automático refleja el término del proceso y <strong>no constituye una evaluación del candidato</strong>. El candidato puede volver a postular a otras ofertas sin restricción alguna.</p>

<h2>8. Planes, pagos y facturación</h2>
<p>El acceso de los empleadores a determinadas funcionalidades está sujeto a los planes y precios informados en la plataforma al momento de la contratación. Los pagos se procesan a través de proveedores externos de medios de pago, quienes tratan los datos de la transacción bajo sus propias políticas.</p>
<p>Los cupos y beneficios de un plan se consumen conforme a su uso y no son transferibles a terceros. Las condiciones de vigencia, renovación y devolución son las informadas en la plataforma al contratar.</p>

<h2>9. Contenido del usuario y propiedad intelectual</h2>
<p>Todo el contenido de la plataforma —software, diseño, marcas y bases de datos— es propiedad de tuvacante.com. El contenido generado por los usuarios (perfiles, currículums, avisos) sigue siendo de ellos, quienes otorgan a tuvacante.com una licencia gratuita y no exclusiva para alojarlo, reproducirlo y comunicarlo dentro de la plataforma con el solo fin de prestar el servicio. Esta licencia termina cuando el contenido se elimina.</p>

<h2>10. Protección de datos personales</h2>
<p>El tratamiento de sus datos personales se rige por nuestra Política de Privacidad, que forma parte integrante de estos términos y se ajusta a la Ley N° 19.628 y a la Ley N° 21.719 sobre protección de datos personales.</p>

<h2>11. Disponibilidad del servicio</h2>
<p>Procuramos mantener la plataforma disponible de forma continua, pero no garantizamos su funcionamiento ininterrumpido. Podemos suspenderla temporalmente por mantenimiento, actualizaciones o causas de fuerza mayor.</p>

<h2>12. Suspensión y término</h2>
<p>Podemos suspender o cerrar una cuenta que infrinja estos términos o la ley, informando el motivo salvo que exista una prohibición legal de hacerlo. El usuario puede cerrar su cuenta en cualquier momento desde la configuración de su perfil, conforme a lo previsto en la Política de Privacidad.</p>

<h2>13. Limitación de responsabilidad</h2>
<p>tuvacante.com actúa como intermediario y no garantiza la contratación ni la veracidad de las ofertas, perfiles o antecedentes publicados por terceros. No responde por los daños derivados de la relación entre postulantes y empleadores, ni por el uso que un empleador haga de los datos a los que accedió legítimamente a través de la plataforma. Nada en esta cláusula limita la responsabilidad que la ley declara indisponible.</p>

<h2>14. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma y se publicarán como una nueva versión, conservando el registro de la versión que usted aceptó. Cuando la modificación sea sustancial, le pediremos aceptar la nueva versión para continuar usando el servicio.</p>

<h2>15. Ley aplicable y jurisdicción</h2>
<p>Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia será conocida por los tribunales ordinarios de justicia con competencia en {{COMUNA_TRIBUNALES}}, sin perjuicio de las acciones que la ley otorgue al consumidor ante otras sedes.</p>

<h2>16. Contacto</h2>
<p>Para consultas sobre estos términos: <strong>soporte@tuvacante.com</strong></p>
```

---

## Política de Privacidad — v2.0

```html
<h1>Política de Privacidad - tuvacante.com</h1>
<p><strong>Versión 2.0</strong> - Vigente desde el ${VIGENCIA}. Reemplaza a la versión 1.1.</p>
<p>Esta política se dicta en cumplimiento de la Ley N° 19.628 sobre Protección de la Vida Privada y de la <strong>Ley N° 21.719</strong>, que moderniza el régimen chileno de protección de datos personales y crea la Agencia de Protección de Datos Personales. Las disposiciones de la Ley N° 21.719 son plenamente exigibles a partir del ${VIGENCIA_21719}; hemos adecuado esta política con anticipación a esa fecha.</p>

<h2>1. Responsable del tratamiento</h2>
<p>El responsable del tratamiento de sus datos personales es <strong>{{RAZON_SOCIAL}}</strong>, RUT <strong>{{RUT_EMPRESA}}</strong>, con domicilio en <strong>{{DOMICILIO}}</strong>, que opera la plataforma <strong>tuvacante.com</strong>, su único dominio oficial.</p>
<p>Canal de contacto en materia de datos personales: <strong>soporte@tuvacante.com</strong></p>

<h2>2. Principios que aplicamos</h2>
<p>El tratamiento de sus datos se rige por los principios de licitud y lealtad, finalidad, proporcionalidad, calidad, responsabilidad, seguridad, transparencia e información, y confidencialidad.</p>

<h2>3. Datos que recopilamos</h2>
<ul>
  <li><strong>Datos de identificación:</strong> nombre, apellidos, RUT, correo electrónico, fotografía de perfil</li>
  <li><strong>Datos de contacto:</strong> teléfono, dirección, comuna</li>
  <li><strong>Datos laborales y formativos:</strong> experiencia, educación, habilidades, pretensión de renta y el contenido del currículum que usted cargue</li>
  <li><strong>Datos de la empresa (empleadores):</strong> razón social, RUT, cargo del representante y antecedentes de verificación</li>
  <li><strong>Datos de actividad:</strong> postulaciones, estados de proceso, ofertas guardadas, alertas de empleo</li>
  <li><strong>Datos de navegación:</strong> dirección IP, tipo de dispositivo y navegador, cookies</li>
  <li><strong>Registros de consentimiento:</strong> versión aceptada de cada documento legal, fecha, IP y user agent, como prueba del consentimiento otorgado</li>
</ul>

<h2>4. Datos sensibles</h2>
<p>La plataforma <strong>no le solicita datos sensibles</strong> —tales como estado de salud, discapacidad, situación socioeconómica, afiliación sindical, creencias, origen étnico u orientación sexual— y no los requiere para postular.</p>
<p>Si usted los incorpora voluntariamente en su currículum, su perfil o un mensaje, entendemos que consiente expresamente su tratamiento con el solo fin de que el empleador evalúe su candidatura, y puede retirarlos en cualquier momento editando su perfil. Le recomendamos no incluir datos sensibles que no sean estrictamente necesarios para el cargo al que postula.</p>

<h2>5. Finalidad del tratamiento</h2>
<ul>
  <li>Crear y administrar su cuenta y su perfil</li>
  <li>Facilitar la búsqueda y postulación a empleos</li>
  <li>Permitir a los empleadores publicar ofertas y gestionar candidatos</li>
  <li>Verificar la identidad de las empresas y prevenir fraudes y usos abusivos</li>
  <li>Enviar notificaciones relacionadas con el servicio, incluidos los avisos sobre el estado y el cierre de sus postulaciones</li>
  <li>Gestionar la contratación y el cobro de los planes de los empleadores</li>
  <li>Elaborar estadísticas agregadas y mejorar la experiencia de uso</li>
  <li>Cumplir obligaciones legales y responder requerimientos de la autoridad</li>
</ul>
<p>Sus datos no se utilizan para finalidades distintas de las informadas sin obtener previamente su consentimiento.</p>

<h2>6. Base de licitud</h2>
<p>Cada tratamiento se funda en una de las siguientes bases:</p>
<ul>
  <li><strong>Su consentimiento</strong> libre, informado, específico e inequívoco, otorgado al registrarse y al aceptar esta política</li>
  <li><strong>La ejecución del contrato</strong> que nos vincula, para prestarle el servicio que solicitó</li>
  <li><strong>El cumplimiento de un deber legal</strong>, en materias tributarias, contables y de respuesta a la autoridad</li>
  <li><strong>El interés legítimo</strong> en la seguridad de la plataforma y la prevención del fraude, ponderado con sus derechos</li>
</ul>
<p>Cuando el tratamiento se funde en su consentimiento, puede <strong>revocarlo en cualquier momento</strong>, sin efecto retroactivo y sin que ello afecte la licitud del tratamiento previo.</p>

<h2>7. Derechos del titular</h2>
<p>Usted puede ejercer en cualquier momento sus derechos de:</p>
<ul>
  <li><strong>Acceso:</strong> conocer qué datos suyos tratamos, su origen, la finalidad y sus destinatarios</li>
  <li><strong>Rectificación:</strong> corregir datos inexactos, desactualizados o incompletos</li>
  <li><strong>Supresión:</strong> solicitar la eliminación de sus datos en los casos que la ley admite</li>
  <li><strong>Oposición:</strong> oponerse a tratamientos específicos por motivos relativos a su situación particular</li>
  <li><strong>Portabilidad:</strong> obtener sus datos en un formato estructurado, genérico y de uso común, y solicitar su transferencia a otro responsable cuando sea técnicamente posible</li>
  <li><strong>Bloqueo:</strong> suspender temporalmente el tratamiento</li>
</ul>
<p>Estos derechos son personales, gratuitos e irrenunciables. Para ejercerlos escriba a <strong>soporte@tuvacante.com</strong> desde el correo registrado en su cuenta; podremos pedirle antecedentes adicionales para acreditar su identidad. Responderemos dentro del <strong>plazo legal de 30 días corridos</strong> contado desde la recepción de la solicitud. Las funciones de acceso, descarga de sus datos y eliminación de cuenta también están disponibles directamente en la configuración de su perfil.</p>
<p>Si estima vulnerados sus derechos, puede reclamar ante la <strong>Agencia de Protección de Datos Personales</strong>, sin perjuicio de las demás acciones legales que le correspondan.</p>

<h2>8. Decisiones automatizadas</h2>
<p>La plataforma <strong>no adopta decisiones de contratación de forma automatizada</strong>: la evaluación y selección de candidatos la realiza siempre el empleador.</p>
<p>Sí existe un proceso automático que <strong>cierra las postulaciones sin resolución</strong> —porque la oferta expiró, se completaron las vacantes, el empleador retiró el aviso o no hubo movimiento en 30 días— y le notifica el motivo. Ese cierre refleja el término del proceso, no una valoración de su perfil, y no produce efectos jurídicos sobre usted. Si considera que una postulación se cerró indebidamente, puede solicitar su revisión humana escribiendo a <strong>soporte@tuvacante.com</strong>.</p>

<h2>9. Comunicación de datos a terceros</h2>
<p>Al postular a una oferta, los datos de su perfil, su currículum y su postulación se comunican al <strong>empleador</strong> correspondiente, que pasa a ser responsable del tratamiento que realice con ellos para evaluar su candidatura.</p>
<p>Además, recurrimos a <strong>encargados de tratamiento</strong> que operan por cuenta y bajo instrucción nuestra, sujetos a obligaciones de confidencialidad y seguridad: proveedores de infraestructura y alojamiento, de envío de correo electrónico y mensajería, y de procesamiento de pagos. Algunos de estos proveedores pueden alojar datos fuera de Chile; en ese caso adoptamos las garantías que la normativa exige para las transferencias internacionales.</p>
<p><strong>No vendemos sus datos personales</strong> ni los cedemos con fines publicitarios de terceros.</p>

<h2>10. Plazo de conservación</h2>
<p>Conservamos sus datos mientras su cuenta permanezca activa y mientras sean necesarios para las finalidades informadas. Cumplido ese plazo, se eliminan o anonimizan, salvo obligación legal de retención —en particular la documentación tributaria y contable, que se conserva por los plazos que la ley establece— y salvo los registros de consentimiento y de eliminación de cuenta, que se mantienen anonimizados como prueba de cumplimiento.</p>

<h2>11. Eliminación de cuenta</h2>
<p>Puede solicitar la eliminación completa de su cuenta y sus datos personales desde la configuración de su perfil. La eliminación es definitiva e irreversible: se borran su perfil, currículums, postulaciones y archivos asociados. Los registros financieros y de auditoría se anonimizan conforme a las obligaciones legales de retención.</p>
<p>Los datos que un empleador ya descargó o incorporó a sus propios sistemas durante un proceso de selección quedan bajo su responsabilidad; puede dirigir su solicitud de supresión directamente a él.</p>

<h2>12. Seguridad</h2>
<p>Implementamos medidas técnicas y organizativas para proteger sus datos, considerando el estado de la técnica y los riesgos del tratamiento: cifrado de credenciales, transmisión por canal seguro, control de acceso por rol, registro de auditoría y respaldos periódicos.</p>

<h2>13. Vulneraciones de seguridad</h2>
<p>Llevamos un registro de las vulneraciones de seguridad que afecten datos personales. Ante una vulneración que pueda entrañar un riesgo para sus derechos, notificaremos a la <strong>Agencia de Protección de Datos Personales</strong> sin dilaciones indebidas, y le informaremos a usted cuando el riesgo sea alto o estén involucrados datos sensibles, describiendo lo ocurrido y las medidas adoptadas.</p>

<h2>14. Cookies</h2>
<p>Utilizamos cookies y tecnologías similares necesarias para mantener su sesión iniciada y recordar sus preferencias, y cookies de medición para entender el uso agregado de la plataforma. Puede bloquearlas o eliminarlas desde la configuración de su navegador, considerando que las cookies necesarias son imprescindibles para iniciar sesión.</p>

<h2>15. Cambios en esta política</h2>
<p>Podemos actualizar esta política para reflejar cambios normativos o del servicio. Cada actualización se publica como una nueva versión y se conserva el registro de la versión que usted aceptó. Si el cambio es sustancial, se lo notificaremos y le pediremos aceptar la nueva versión.</p>

<h2>16. Contacto</h2>
<p>Para ejercer sus derechos o realizar consultas sobre privacidad: <strong>soporte@tuvacante.com</strong></p>
```
