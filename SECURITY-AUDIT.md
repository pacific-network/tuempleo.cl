# Auditoría de Seguridad — Backend tuempleo.cl (NestJS)

> Fecha: 2026-06-15 · Alcance: `src/**` (259 archivos) · Metodología: revisión manual asistida por agentes en 4 dominios (authN/authZ, inyección/datos, secretos/config/pagos, uploads/PII). Todos los hallazgos verificados leyendo el código real.

## Resumen ejecutivo

El backend es funcional pero presenta **fallos sistémicos de control de acceso** (muchos endpoints sin `@UseGuards` ni verificación de propiedad) y **configuración global insegura**. Los dos problemas de fondo:

1. **No hay guard de autenticación por defecto** — todo endpoint sin guard explícito es anónimo. ~12 controllers carecen de protección.
2. **Configuración global permisiva** — `ValidationPipe` sin `whitelist`, sin `ClassSerializerInterceptor` global, `synchronize` invertido, secretos con fallback hardcodeado.

Además, las contraseñas se almacenan con **cifrado reversible** (no hash) y el `JWT_SECRET` es trivial.

| Severidad | Cantidad |
|-----------|----------|
| 🛑 Crítica | 6 |
| ⚠️ Alta | 12 |
| 🔸 Media | ~8 |

---

## 🛑 CRÍTICAS

### C1 — Contraseñas cifradas reversiblemente (no hasheadas)
**`src/shared/encrypt/encrypt.service.ts:49-52`** — `compare()` *descifra* la contraseña almacenada (AES-256-CTR con clave `sha256(JWT_SECRET)`) y compara con `===`. Quien tenga acceso a la BD + `JWT_SECRET` recupera **todas las contraseñas en texto plano**. La comparación no es timing-safe; CTR sin MAC es maleable.
**Fix:** migrar a `bcrypt`/`argon2` con salt por usuario. Requiere estrategia de migración (rehash en próximo login).
**⚠️ Acoplamiento:** como la clave de cifrado deriva de `JWT_SECRET`, **rotar `JWT_SECRET` deja a todos sin poder iniciar sesión**. Resolver C1 antes de rotar el secreto (C2).

### C2 — `JWT_SECRET` débil + fallbacks hardcodeados
- `.env:5` → `JWT_SECRET=tuempleo.cl` (trivial, = nombre de la app).
- Fallbacks `'pacificNetwork2024'` en `auth.module.ts`, `oauth.module.ts`, `employer.module.ts`, `jwt.strategy.ts`, `auth.controller.ts:76,169`.
- `auth/guards/constants.ts:4` → fallback distinto `'secretKey'` (inconsistencia entre firma y validación de guards).

Con un secreto predecible, **cualquiera forja un JWT con `isAdmin:true`** y toma control total.
**Estado:** ✅ Fallbacks eliminados (ver "Cambios aplicados"). ⏳ Pendiente: rotar el valor real (bloqueado por C1).

### C3 — Mass assignment → auto-promoción a admin
`src/main.ts` `ValidationPipe` sin `whitelist` + `auth.service.ts:310` `Object.assign(user, dto)`. Un usuario común envía `PATCH /v1/auth/me {"isAdmin":true}` y se auto-promueve (class-validator no elimina props no declaradas). También permite fijar `id_empresa`, `rut`, etc.
**Estado:** ✅ Mitigado globalmente con `whitelist:true`+`forbidNonWhitelisted:true`. Recomendado además asignar campos explícitos en `updateMe`/`updateBusiness` (`business.service.ts:83-90` usa `CreateBusinessDto` amplio).

### C4 — Exposición masiva de PII sin autenticación
- `user.controller.ts:18-36` — `GET /v1/user/all`, `/:id`, `/registro/:id` sin guard; devuelven la entidad completa **incluido el hash de password** (los `@Exclude()` no aplicaban por falta de `ClassSerializerInterceptor`).
- `curriculum.controller.ts` — `GET /:rut`, `/:rut/view`, `/:rut/download`, `POST /upload/:rut` sin guard → leer/descargar/**sobrescribir** CVs de cualquier RUT (RUT enumerables; `check-rut/:rut` actúa de oráculo).
- `application.controller.ts:42-73`, `publication.controller.ts`, `cv-generator.controller.ts:20` — listan postulantes/PII de cualquier oferta sin guard ni ownership.
**Estado:** ✅ Password ya no se filtra (`ClassSerializerInterceptor` global). ⏳ Pendiente: añadir guards + ownership a estos controllers.

### C5 — Pagos: manipulación de precio en Webpay
`webpay.service.ts:59-62` calcula el total con `i.precioUnitario` **enviado por el cliente** (`@Min(0)`, sin validar contra catálogo). Se pueden comprar planes PREMIUM por $1. MercadoPago sí resuelve el precio server-side (`mercado-pago.service.ts:46-50`) — confirma que es un bug.
**Fix:** ignorar `precioUnitario`/`subtotal` del cliente; resolver desde la tabla de planes. Validar `response.amount === transaction.amount` y `buy_order` en el commit (`webpay.service.ts:123-152`).

### C6 — Relays abiertos de Email y SMS (sin auth)
- `mailer.controller.ts:14-31` — `POST /v1/mailer/send` y `/template` sin guard; `mail_from`/`name_from` libres (suplantación), `contentUrl` arbitraria (**SSRF**).
- `sms.controller.ts:9` — `POST /v1/sms/individual` sin guard; SMS arbitrario con cargo a la empresa (toll-fraud).

Solo mitiga `@Throttle`. Permite spam/phishing desde el dominio confiable.
**Fix:** exigir auth + autorización; allowlist de remitentes y de `contentUrl`.

---

## ⚠️ ALTAS

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| A1 | `synchronize` con lógica invertida (`=== 'false'`) → quedaba **`true` en prod** (TypeORM altera/borra columnas) | `config/database.ts:60` ✅ corregido |
| A2 | IDOR transacciones/pagos: `GET /transactions/:id` no filtra por usuario; `/webpay/detail` y `/mercadopago/detail` sin guard | `transactions.controller.ts:48`, `webpay.controller.ts:102`, `mercado-pago.controller.ts:99` |
| A3 | Cambiar estado de postulaciones ajenas (contratar/descartar) sin verificar ownership de la oferta | `hiring_process.service.ts:21-86` |
| A4 | CRUD de planes (precios) totalmente abierto: `POST/PATCH /v1/planes` sin guard | `plans.controller.ts:24,33` |
| A5 | Stored XSS vía uploads servidos estáticamente: foto perfil sin `fileFilter`/`limits`, conserva extensión del usuario → subir `.html`/`.svg` con script en `/upload/` | `user.service.ts:45`, `business.controller.ts:59`, `main.ts:67` |
| A6 | Webhook MercadoPago sin verificación de firma `x-signature` (mitigado parcial: reconsulta el pago) + `POST /webhook/test` público | `mercado-pago.controller.ts:48-93` |
| A7 | IDOR perfil postulante: rutas `:userId` usan el path, no `req.user.sub` (leer/editar/fijar RUT ajeno) | `postulant.controller.ts:182-220` |
| A8 | Estadísticas de empleador por `:userId` del path (no `req.user`) | `employer.controller.ts:80` |
| A9 | Consumo/agotamiento de cupos pagados sin auth (DoS de negocio) | `quota.controller.ts`, `publication.controller.ts:37` |
| A10 | Creación de roles solo con estar logueado (sin chequeo de rol) | `role.controller.ts:16` |
| A11 | SII: consulta tributaria por RUT sin auth ni throttle (API facturable) | `sii.controller.ts:12` |
| A12 | Falta **Helmet** (sin HSTS, CSP, `X-Content-Type-Options`…) | `main.ts` |

---

## 🔸 MEDIAS

- **Session**: cookie `secure:false`, sin `httpOnly`/`sameSite`, secret con fallback. ✅ corregido (secure por `NODE_ENV`, httpOnly, sameSite=lax, secret obligatorio).
- **Swagger** expuesto en `/api` sin auth en producción (`main.ts:71`). → deshabilitar en prod o proteger con basic-auth.
- **Logging de datos sensibles**: payload de webhooks de pago, tokens (`token_ws`), payload JWT con email, y contraseña de admin en el seed. `mercado-pago.controller.ts:55`, `webpay.controller.ts:85`, `oauth.service.ts:79`, `seed-admin.ts:86`.
- **JWT 7 días, no revocable**, entregado por **query param** en redirect OAuth (`oauth.controller.ts:117`) → queda en logs/Referer.
- **Path traversal** en borrado de archivos si la ruta es influida vía C3 (`user.service.ts:39`, `business.service.ts:71`) — validar `resolved.startsWith(base)`.
- **Upload de CV** sin `limits.fileSize` y nombre sin sanitizar (`curriculum.controller.ts:58-86`).
- **DTOs laxos**: `CreatePostulacionDto.data` y `SendMailDto` con `[key:string]:any`; `salario_esperado` sin `@Min/@Max`.
- **Secretos vivos en `.env`** (correctamente gitignored): Pacific API/mail, Google/LinkedIn secrets, `ADMIN_PASSWORD` en claro → rotar y mover a gestor de secretos.
- **CORS** con `localhost:5173` permitido en prod (`main.ts:21`).

---

## ✅ Verificado correcto (sin hallazgo)

- **SQL Injection**: prácticamente nula — todo el SQL crudo y `createQueryBuilder` usa placeholders; el único `ORDER BY` dinámico está whitelisted (`oferta.service.ts:112-114` + `@IsIn`).
- **Doble canje de cupón**: atómico + índice único `(cupon_id, empresa_id)` con catch `ER_DUP_ENTRY` (`cupon.service.ts:120-157`).
- **Acreditación de stock**: idempotente vía flag `stock_processed`; MP valida montos contra su API.
- `AdminGuard`/`StaffGuard` verifican rol correctamente; OAuth valida `state`/`origin`; `forgotPassword` no revela existencia de email (token con `purpose` y exp 1h).
- `guardados`, `alertas`, `forms`, `legal`, `bug` scopean ownership a `req.user.sub`.
- No hay `exec`/`spawn`/`child_process` con input de usuario; el scraper SII usa URLs fijas y valida RUT con regex.

---

## Cambios aplicados en esta auditoría (quick wins)

| Cambio | Archivo | Hallazgo |
|--------|---------|----------|
| `ValidationPipe` con `whitelist:true` + `forbidNonWhitelisted:true` | `src/main.ts` | C3 |
| `ClassSerializerInterceptor` global (aplica `@Exclude()` de password) | `src/main.ts` | C4 (password) |
| `synchronize` corregido a `=== 'true'` | `src/config/database.ts` | A1 |
| Eliminados fallbacks hardcodeados de `JWT_SECRET` (módulos + strategy + controller + constants) | `auth.module.ts`, `oauth.module.ts`, `employer.module.ts`, `jwt.strategy.ts`, `auth.controller.ts`, `guards/constants.ts` | C2 |
| `SESSION_SECRET` obligatorio (sin fallback) + cookie `secure`/`httpOnly`/`sameSite` | `src/main.ts` | C2, Media-session |
| Helper `requireEnv()` y `SESSION_SECRET` generado en `.env` | `src/config/secrets.ts`, `.env`, `.env.sample` | C2 |

> ⚠️ `JWT_SECRET=tuempleo.cl` **no se rotó** por su acoplamiento con el cifrado de contraseñas (C1). Rotarlo invalidaría todas las contraseñas. Resolver C1 primero.

> ⚠️ `forbidNonWhitelisted:true` rechaza requests con campos no declarados en el DTO. Si el frontend envía campos extra, devolverá 400 — verificar en QA. Si rompe flujos, bajar a solo `whitelist:true` (igualmente corta el mass-assignment).

> ℹ️ Se agregó `NODE_ENV=production` en `.env`. Si ese mismo `.env` se usa en local, las cookies `secure` requieren HTTPS — ajustar a `development` en entornos locales.

---

## Pendientes priorizados

1. **Guards + ownership** en: user, curriculum, applications, publication, mailer, sms, plans, quota, role, sii, hiring_process, transactions (C4, C6, A2-A11).
2. **Pagos**: precios server-side en Webpay + validar monto/`buy_order` en commit + firma de webhook MP (C5, A6).
3. **Contraseñas → bcrypt/argon2** con migración; luego rotar `JWT_SECRET` (C1, C2).
4. **Endurecer uploads**: allowlist extensión+MIME, `limits.fileSize`, nombre sanitizado, servir con `Content-Disposition: attachment`+`nosniff` o dominio aislado (A5).
5. **Helmet**, Swagger off en prod, limpiar logs sensibles, rotar secretos del `.env`.
