# Ley 21.719 — qué falta antes de publicar los documentos legales v2.0

**Rama:** `feat/automatic_end` · **Base:** `05fa8a1` · **Fecha del análisis:** 17 de agosto de 2026

---

> **Actualización del 17 de agosto de 2026.** Los bloqueantes §2.1 a §2.4 están **resueltos**
> y cubiertos con tests.
>
> **La v2.0 no se publica.** Su texto se movió a `docs/legal-v2-borrador.md` para retomarlo
> antes del 1 de diciembre de 2026, y `seed-legal-documents.ts` volvió a la **v1.1**, que es
> la que se publica: en la base está la v1.0 y su texto no existe en el repo. La v1.1 ya
> referencia solo tuvacante.com, así que resuelve el tema del dominio sin el paquete completo
> de la Ley 21.719.
>
> §2.5 y todo lo de la sección 3 siguen abiertos. Ver §5.1 para el estado de la suite.

## 0. Resumen

El **texto** de los Términos y la Política de Privacidad está actualizado a la v2.0 en
`src/db/seed/seed-legal-documents.ts`, **sin publicar**.

El diagnóstico original era que la implementación no acompañaba al texto: de los tres derechos
que el documento promete poder ejercer desde la plataforma —re-consentimiento,
acceso/portabilidad y supresión— dos estaban rotos de punta a punta y un tercero era
inaccesible para los usuarios de Google. **Eso ya está corregido** (§2.1 a §2.4).

> **Un documento que promete derechos que la API rechaza con 400 es peor evidencia frente a
> la Agencia que el documento viejo.** Ese sigue siendo el criterio: no publicar la v2.0
> mientras quede algo de la sección 2 abierto.

**Fecha límite real:** la Ley 21.719 es plenamente exigible el **1 de diciembre de 2026**.
Hasta entonces rige la Ley 19.628. Quedan ~3,5 meses.

---

## 1. Estado por obligación

| Obligación (Ley 21.719) | Documento v2.0 lo promete | ¿Funciona hoy? |
|---|---|---|
| Identificar al responsable (razón social, RUT, domicilio) | Sí | ❌ Placeholders sin completar |
| Consentimiento inequívoco y acreditable | Sí | ⚠️ Solo en registro por email; OAuth lo presume |
| Re-consentimiento ante cambio sustancial | Sí | ✅ Corregido (§2.1 y §2.2) |
| Derecho de acceso y portabilidad | Sí | ✅ `GET /v1/legal/account/data` |
| Derecho de rectificación | Sí | ✅ Edición de perfil |
| Derecho de supresión | Sí | ✅ Backend corregido (§2.3 y §2.4) — falta el frontend, ver §3.6 |
| Derecho de oposición y bloqueo | Sí, vía correo | ⚠️ Sin flujo ni trazabilidad |
| Plazo de respuesta de 30 días corridos | Sí | ❌ No hay registro de solicitudes |
| Información sobre decisiones automatizadas | Sí | ✅ Cierre automático descrito |
| Revisión humana del cierre automático | Sí, vía correo | ⚠️ Sin flujo en producto |
| Registro de vulneraciones de seguridad | Sí | ❌ No existe |
| Notificación de brechas a la Agencia | Sí | ❌ Sin procedimiento definido |

---

## 2. Bloqueantes — ✅ resueltos el 17 de agosto de 2026

Los cuatro primeros están corregidos y con tests. Se dejan documentados porque el diagnóstico
explica por qué el módulo estaba así y qué hay que no repetir. §2.5 sigue abierto.

### 2.1 ✅ `POST /v1/legal/consent` rechazaba lo que el frontend envía

El DTO exige `document_type`, `document_version` y `accepted`
(`src/modules/legal/dto/accept-consent.dto.ts`), pero el frontend envía `documentType` y
`documentVersion`, sin `accepted` (`front-v2-tuempleo/frontend/src/services/LegalService.ts:55`).

Con `whitelist: true` en `src/main.ts:74`, las propiedades camelCase se descartan
silenciosamente y la validación falla por los campos snake_case ausentes → **400 siempre**.

**Fix (backend):** renombrar el DTO a camelCase —`documentType`, `documentVersion`— y hacer
`accepted` opcional con default `true`. Es la convención del proyecto: el payload de
`Postulacion` ya viaja en camelCase (commit `05fa8a1`).

### 2.2 ✅ El diálogo de re-consentimiento nunca aparecía

`getConsentStatus` (`src/modules/legal/legal.service.ts:117`) devuelve
`{ terms: { version, accepted } }`, pero `ConsentChecker.tsx:25` evalúa
`status.terms.needsUpdate`, que nunca viene → `undefined` → falsy → el diálogo no abre.

**Consecuencia:** si se publica la v2.0 hoy, todos los usuarios siguen registrados como
consintiendo la v1.1 y el sistema no lo detecta. Se pierde justamente la prueba que la ley
exige.

**Fix (backend):** que `getConsentStatus` devuelva por tipo
`{ accepted, version, currentVersion, needsUpdate }`, donde `version` es la última que el
usuario aceptó, `currentVersion` la vigente y `needsUpdate = version !== currentVersion`.

> Ojo con el efecto de encender esto: `ConsentChecker.tsx` hace `signOut` si el usuario
> cierra el diálogo sin aceptar. Al publicar la v2.0, **toda** la base verá el diálogo en su
> siguiente sesión. Es el comportamiento deseado, pero conviene coordinarlo con soporte.

### 2.3 ✅ La eliminación de cuenta rechazaba el payload

`DeleteAccountDto` exige `confirmation: 'ELIMINAR MI CUENTA'`
(`src/modules/legal/dto/delete-account.dto.ts`), pero el frontend envía `confirmPhrase`
(`LegalService.ts:44`) → **400 siempre**. El derecho de supresión no se puede ejercer.

**Fix (backend):** renombrar el campo a `confirmPhrase`, manteniendo el `@Equals`.

### 2.4 ✅ Los usuarios de Google no podían eliminar su cuenta

`deleteAccount` verifica la contraseña (`src/modules/legal/legal.service.ts:216`), pero en el
alta por OAuth el password es un `dummyPassword` generado por el servidor
(`src/modules/auth/auth.service.ts:52`) que el usuario nunca conoció. Aunque se arregle §2.3,
para ellos la supresión sigue siendo imposible.

**Fix (backend):** detectar la cuenta sin credencial propia y sustituir la verificación de
contraseña por la frase de confirmación más un enlace de confirmación enviado al correo
registrado.

### 2.5 ⏳ Completar los datos del responsable

El texto v2.0 tiene `{{RAZON_SOCIAL}}`, `{{RUT_EMPRESA}}`, `{{DOMICILIO}}` y
`{{COMUNA_TRIBUNALES}}`. El seed **aborta** si detecta placeholders; para probar en local:

```bash
ALLOW_PLACEHOLDERS=1 npm run seed:legal
```

No hay forma de publicar en producción sin completarlos, que es la intención.

---

## 3. Importante, no bloqueante

### 3.1 Consentimiento OAuth sin acto afirmativo

El registro por email tiene checkbox obligatorio (`SignUpForm.tsx:61`). El alta por Google no:
`recordInitialConsent` (`legal.service.ts:93`, llamado desde `auth.service.ts:65`) marca
`accepted: true` **sin IP ni user agent y sin que el usuario haya aceptado nada**.

La ley exige consentimiento inequívoco y que el responsable pueda acreditarlo. Un registro
generado por el servidor no acredita nada.

**Fix:** pantalla de aceptación en el primer login OAuth, y propagar IP y user agent a
`recordInitialConsent` igual que hace el controller en `acceptConsent`.

### 3.2 El plazo de 30 días no es trazable

La v2.0 promete responder solicitudes ARSOPB en 30 días corridos. Hoy no existe tabla ni
bandeja donde quede registrada la solicitud, su fecha de recepción y su fecha de respuesta.
Sin eso, el plazo no se puede acreditar ni monitorear.

**Fix mínimo:** tabla `data_subject_request` con `usuario_id`, `tipo` (acceso, rectificación,
supresión, oposición, portabilidad, bloqueo), `recibida_en`, `respondida_en`, `resultado`.
Alimentarla desde el correo de soporte, aunque sea manualmente al principio.

### 3.3 No existe registro de vulneraciones

La v2.0 declara que llevamos un registro de brechas y que notificamos a la Agencia sin
dilaciones indebidas. No hay ni registro ni procedimiento escrito de quién detecta, quién
evalúa el riesgo, quién notifica y en qué plazo.

### 3.4 Campos que el frontend muestra y la entidad no tiene

`LegalService.ts` tipa `title` y `effectiveDate`, y `LegalDocument.tsx` los renderiza, pero
`legal_document` (`src/repository/legal/legal-document.entity.ts`) solo tiene
`type`, `version`, `content`, `is_current` y `created_at`. La fecha de vigencia sale vacía.

**Fix:** agregar `title` y `effective_date` a la entidad, la migración y el seed.

### 3.5 Revisión humana del cierre automático

La v2.0 informa que el cierre automático de postulaciones no es una valoración del candidato y
que se puede pedir revisión humana escribiendo a soporte. El canal existe pero no hay flujo
definido para atenderlo. Alinear con `src/modules/cierre-postulaciones/`.

### 3.6 El formulario de borrado todavía exige contraseña

Con §2.4 resuelto, el backend acepta eliminar una cuenta OAuth sin contraseña. Pero
`DeleteAccountCard.tsx:26` valida `password.length > 0` antes de habilitar el botón, así que
el usuario de Google sigue bloqueado en la UI.

**Fix (frontend, una condición):** no exigir el campo cuando la cuenta no es local. Requiere
exponer `auth_provider` en el endpoint de perfil, o dejar que el formulario lo intente y
maneje el error del backend.

Mientras no se haga, el derecho de supresión de las cuentas OAuth solo se puede ejercer
escribiendo a soporte, que es una vía válida pero manual y sin trazabilidad (ver §3.2).

---

## 4. Dominio: el código contradice al documento

La v2.0 declara que **tuvacante.com es el único dominio oficial**. El backend todavía dice
otra cosa:

| Dónde | Qué dice |
|---|---|
| `src/modules/mailer/mailer.provider.ts:24-25` | Remitente `no_reply@tuempleo.cl`, nombre `TuEmpleo.cl` |
| `src/modules/auth/auth.service.ts:247` | `FRONTEND_URL` por defecto `https://tuempleo.cl` |
| `src/modules/auth/auth.service.ts:262` | Deriva a `soporte@tuempleo.cl` |
| `src/modules/employer/invitacion.service.ts:110,117` | URL por defecto y SMS firmado "TuEmpleo.cl" |
| `src/modules/business/verificacion/verificacion-empresa.service.ts:86` | SMS firmado "TuEmpleo.cl" |
| `src/middleware/block-browser.middleware.ts:112,119` | Logo desde `tuempleo.cl`, soporte `soporte@tuempleo.cl` |
| `src/main.ts:87-88` | Swagger: "API TUEMPLEO.CL" |

⚠️ **Riesgo operativo:** `tuempleo.cl` figura sin DNS. Si es así, los enlaces de recuperación
de contraseña y de invitación estarían apuntando a un dominio que no resuelve.

**No cambiar los remitentes a la ligera:** migrar `no_reply@` a `tuvacante.com` requiere tener
SPF, DKIM y DMARC configurados en ese dominio, o los correos empiezan a caer en spam. Hacerlo
como tarea propia, verificando entrega.

Las constantes de CORS y las regex de origen (`src/main.ts:20-24`,
`src/modules/oauth/oauth.controller.ts:30-45`) ya aceptan ambos dominios; esas pueden quedarse
como están mientras exista la redirección.

---

## 5. QA: por qué esto no se detectó antes

Los tres bugs de la sección 2 son de **contrato**: payloads que el frontend envía y el backend
rechaza. Ninguno es sutil. Sobrevivieron porque el contrato es justo lo que no se prueba.

Mediciones del 17 de agosto de 2026, corriendo la suite en local sobre `05fa8a1`.

### 5.1 Lo que hay

| | Antes | Ahora |
|---|---|---|
| Suites / tests | 7 suites, 66 tests — 65 pasan, **1 falla** | 11 suites, **135 tests, todos pasan** |
| Cobertura statements | 12,38 % | **15,82 %** |
| Cobertura branches | 8,09 % | **12,09 %** |
| Cobertura functions | 6,07 % | **8,48 %** |
| Services con spec | 7 de 49 | **11 de 49** |
| Tests de contrato (DTO + `ValidationPipe`) | 0 | **11** |
| Tests en el frontend | 0 | 0 (no hay script ni framework) |

Specs nuevos o reescritos:

| Spec | Tests | Por qué |
|---|---|---|
| `legal/legal.service.spec.ts` | 16 | Eliminación de cuenta en sus tres escenarios, `needsUpdate`, portabilidad |
| `legal/legal.controller.spec.ts` | 11 | Contratos con el `ValidationPipe` real — los payloads exactos del frontend |
| `auth/auth.service.spec.ts` | 20 | Alta por OAuth, centinela de password, login y registro |
| `quota/quota.service.spec.ts` | 14 | Topes por tipo de aviso, doble consumo, aislamiento entre empresas |
| `applications/application.service.spec.ts` | 12 | Reescrito: era un scaffold de 36 líneas que no compilaba |

Cobertura de lo tocado: `legal.service` 84 %, `quota.service` 79 %, `auth.service` 61 %.

**Precisión sobre `legal.controller.spec.ts`:** prueba los DTOs a través del `ValidationPipe`
real, que es donde estaban los bugs, pero no instancia el controller — por eso
`legal.controller.ts` sigue en 0 % de cobertura. Falta un test de integración con
`supertest` que recorra la ruta completa.

**Los 27 módulos restantes siguen sin tests.** Se priorizaron los que estaban rotos y los
que tocan dinero. Por orden de riesgo, lo que sigue: `oferta` (núcleo del producto),
`cupon` (canjes con transacción), `hiring_process`, `publication`, `user` y `curriculum`.

Lo que sí está probado está bien probado, y no por casualidad: es donde hay dinero de por
medio, más el feature de esta rama.

| Spec | Líneas |
|---|---|
| `src/modules/cierre-postulaciones/cierre-postulaciones.service.spec.ts` | 352 |
| `src/modules/webpay+/webpay.service.spec.ts` | 320 |
| `src/modules/mercado-pago/mercado-pago.service.spec.ts` | 273 |
| `src/modules/employer/invitacion.service.spec.ts` | 266 |
| `src/modules/match/match.service.spec.ts` | 75 |
| `src/modules/business/business.service.spec.ts` | 73 |
| `src/modules/applications/application.service.spec.ts` | 36 — **es el que falla** |

El que falla lo hace por un error del propio test: pasa `ApplicationModule` dentro de
`providers` y no provee `PostulanteRepository`, así que Nest no puede resolver el módulo de
prueba. No es una regresión del código de producción.

### 5.2 Brechas

**a) Cero tests de controllers y DTOs.** 38 controllers, ningún spec. Un solo test que levante
el `ValidationPipe` real y envíe el payload que manda el frontend habría atrapado §2.1, §2.3 y
§2.4 el día que se escribieron.

**b) El e2e nunca corrió.** `test/app.e2e-spec.ts` es el scaffold de Nest: pide `GET /` y espera
`"Hello World!"`, pero el proyecto no tiene `app.controller.ts`. Y ni siquiera llega a fallar
por eso — `test/jest-e2e.json` no define el `moduleNameMapper` de `src/*`, así que revienta
resolviendo los imports de `app.module.ts`. `npm run test:e2e` está roto desde el inicio.
Borrarlo o arreglarlo, pero no dejarlo simulando cobertura inexistente.

**c) Nada verifica que el código compile antes de mergear.** No hay job de CI que corra
`npm run build`, `npm test` ni `npm run lint`. El único workflow (`deploy-dev.yml`) es de
despliegue, no de validación. Un PR con un error de TypeScript se puede mergear a `dev` sin
que nada lo señale.

> **El despliegue hoy se hace a mano**, siguiendo el orden documentado en
> `docs/despliegues.md`. Eso mitiga los dos riesgos siguientes, porque hay una persona mirando
> cuando ocurre. Quedan anotados por si el runner de `deploy-dev.yml` se activa.
>
> ⚠️ Inconsistencia a resolver: `docs/despliegues.md:9` y su paso 2 afirman que mergear el PR a
> `dev` dispara el deploy. Conviene aclararlo en esa bitácora, o desactivar el workflow, para
> que nadie lo asuma automático.

**d) El orden del deploy deja una ventana de caída.** `deploy-dev.yml` hace `docker stop` y
`docker rm` **antes** de `docker build`. Si el build falla, el contenedor anterior ya no existe.
Ejecutado a mano el operador se da cuenta al instante; automatizado, no. Construir primero y
reemplazar después cuesta dos líneas y elimina el caso.

**e) El deploy se declara exitoso sin verificar nada.** El workflow imprime "Despliegue
exitoso 🎉" apenas `docker run` devuelve un ID. Un contenedor que arranca y muere a los dos
segundos por una variable de entorno faltante cuenta como éxito. En el flujo manual esto lo
cubre el paso 3 de `docs/despliegues.md` (verificar que la app respondió).

**f) Sin hooks locales.** No hay husky ni git hooks: nada obliga a pasar lint o tests antes de
commitear.

**g) Sin umbral de cobertura.** Jest tiene `collectCoverageFrom` pero ningún
`coverageThreshold`. La cobertura puede caer de 12 % a 5 % sin que nadie se entere.

**h) Migraciones manuales y no verificadas.** Los `migrate:*` y `seed:legal` se corren a mano
por SSH; el CI no los ejecuta ni comprueba que el esquema del servidor coincida con las
entidades. Pega directo en lo que viene: la publicación de la v2.0 y los campos de cierre
automático dependen de que alguien recuerde correr el script correcto en el orden correcto.

**i) No hay staging.** Solo dev y prod. El re-consentimiento y el cierre automático afectan a
toda la base de usuarios de una vez y no hay dónde ensayarlos contra datos realistas.

**k) `npm run lint` no corre.** `eslint.config.mjs` es un `.eslintrc.js` legacy renombrado:
empieza con `module.exports` dentro de un archivo ESM, así que ESLint 9 aborta con
`ReferenceError: module is not defined in ES module scope` antes de mirar un solo archivo.
Nunca ha funcionado con la versión de ESLint instalada.

Convertirlo a flat config es rápido, pero conviene hacerlo aparte: es probable que la primera
corrida destape cientos de avisos acumulados, y eso merece su propio PR en vez de mezclarse
con un arreglo funcional.

**j) No hay fixtures.** Solo `seed-admin` y `seed-legal`. Probar el cierre automático exige
fabricar a mano ofertas expiradas y postulaciones viejas, cada vez.

### 5.3 Qué escribir antes de tocar el código de la sección 2

Escribir primero el test, verlo fallar, arreglar el DTO, verlo pasar. Da la corrección y la red
de seguridad en el mismo movimiento, y deja el patrón listo para copiar a los otros 37
controllers.

- `legal.controller.spec.ts` con el `ValidationPipe` real y los payloads exactos de
  `LegalService.ts` del frontend: aceptar consentimiento, exportar datos, eliminar cuenta.
- `getConsentStatus` devolviendo `needsUpdate: true` cuando la versión aceptada no es la
  vigente, y `false` cuando sí lo es.
- Eliminación de cuenta para un usuario OAuth, que no conoce su contraseña.
- Que `recordInitialConsent` guarde IP y user agent.

Dos arreglos de CI que son de una tarde: un job que corra `npm ci && npm run build && npm test`
como requisito de merge, e invertir el orden de `docker build` y `docker stop`.

---

## 6. Fuera del código

- [ ] **Revisión por abogado** del texto v2.0 antes de publicarlo. El seed lo advierte en su
      encabezado. Las referencias normativas y los plazos deben confirmarse con asesoría.
- [ ] **Completar** razón social, RUT, domicilio y comuna de tribunales.
- [ ] **Confirmar la edad mínima.** La v2.0 fija 18 años en la cláusula 4 de los Términos. En
      Chile se puede trabajar desde los 15 con autorización; si el producto quiere admitir
      adolescentes, hay que cambiar la cláusula **y** el tratamiento de sus datos, que la ley
      protege de forma reforzada.
- [ ] **Verificar que `soporte@tuvacante.com` existe** y que alguien la atiende dentro de 30 días.
- [ ] **Inventario de encargados de tratamiento**: hosting, proveedor de correo, SMS,
      MercadoPago. La v2.0 los menciona por categoría; hay que tener contratos con cláusula de
      tratamiento y saber cuáles alojan datos fuera de Chile.
- [ ] **Decidir sobre el Delegado de Protección de Datos.**

---

## 7. Orden sugerido

1. §5.3 — escribir `legal.controller.spec.ts` con los payloads reales del frontend, y verlo fallar.
2. §2.1, §2.2, §2.3 — un solo cambio de contrato en el backend, sin tocar el frontend. Los tests de arriba pasan a verde.
3. §2.4 — supresión para cuentas OAuth.
4. §2.5 + revisión legal — completar datos y publicar la v2.0 con `npm run seed:legal`.
5. §5.2.c — job de CI con `build` + `test` como requisito de merge. Sin prisa mientras el
   despliegue siga siendo manual, pero es lo que evita mergear código que no compila.
6. §3.1 — consentimiento OAuth con acto afirmativo.
7. §3.2 y §3.3 — trazabilidad de solicitudes y registro de brechas, antes del 1 de diciembre.
8. §4 — unificación de dominio, coordinada con la configuración de correo.
