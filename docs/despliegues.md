# Registro de despliegues

Bitácora de qué hay desplegado, desde qué commit, y cómo volver atrás sin romper nada.

**Cómo usarlo:** antes de mergear a `dev`, anotar el commit de la línea base. Después de
desplegar, cerrar la entrada con el resultado. Si algo se revierte, dejarlo escrito —
un rollback sin registro es el que falla la próxima vez.

> **Recordatorio de infraestructura:** el CI despliega al **mergear un PR a `dev`**, no al
> pushear. **No corre migraciones**: el SQL se ejecuta siempre a mano.

---

## Línea base actual

| | |
|---|---|
| **Rama desplegada** | `dev` |
| **Commit** | `af7bcdc` — *Fix: el invitado recibia dos SMS por el mismo codigo* |
| **Fecha del despliegue** | 2026-08-18 |
| **Punto de retorno seguro** | rama `backup/dev-2026-08-18-de003aa` → `de003aa` |
| **Esquema** | Sincronizado por TypeORM (`DB_SYNCHRONIZE=true`), no por migraciones |

Para volver al último estado funcional conocido:

```bash
git checkout dev
git reset --hard backup/dev-2026-08-18-de003aa   # destructivo: confirmar antes
git push --force-with-lease origin dev
```

`--force-with-lease` y no `--force`: aborta si alguien pusheó mientras tanto, en vez de
pisarle el trabajo.

> **El respaldo cubre el código, no los datos.** Volver a `de003aa` no elimina las columnas
> que TypeORM ya creó ni deshace los cierres de postulaciones que se hayan ejecutado. Las
> columnas son aditivas, así que el código viejo convive con ellas sin problema.

### Sobre el esquema: no se usan migraciones

Este proyecto corre con **`DB_SYNCHRONIZE=true`** en el servidor: TypeORM ajusta el esquema
contra las entidades en cada arranque. Es una decisión deliberada — una sola persona maneja
backend, infra y despliegues, y la ceremonia de migraciones no compensa la fricción.

Consecuencia práctica: **para agregar o cambiar una columna basta con editar la entidad.**
Lo que synchronize *no* hace es transformar datos existentes; cuando un cambio necesite
rellenar filas viejas, hay que escribir un script puntual, correrlo una vez y borrarlo.

---

## Release del 2026-08-18 — ✅ desplegado

Entró todo junto: el PR **#93** (`feat/automatic_end`) más el fix del SMS duplicado
pusheado encima. Del punto de partida `de003aa` a `af7bcdc`.

### Cómo se aplicó el esquema

**No se corrió ninguna migración a mano.** TypeORM creó las columnas solo al arrancar,
por `DB_SYNCHRONIZE=true`. Verificado después del deploy:

```sql
SHOW COLUMNS FROM usuario LIKE 'auth_provider';
-- auth_provider | varchar(20) | NO | | local
```

**El backfill de `auth_provider` se verificó y no hizo falta.** El script reportó:

```
Usuarios revisados:        7
Marcados como OAuth:       0
Password indescifrable:    0
```

Los 7 usuarios son locales de verdad, así que el default `'local'` que puso synchronize es
el valor correcto. Todavía no existe ninguna cuenta creada puramente por Google: el login
con Google que funciona corresponde a una cuenta que ya existía como local, y
`ensureUserFromJwt` la encuentra por email sin tocarla. El arreglo del borrado de cuentas
OAuth queda operando en modo preventivo, para el primero que se registre así.

Los 0 indescifrables confirman además que el `JWT_SECRET` no se rotó.

### Qué NO se hizo en este release

| | |
|---|---|
| **Documentos legales** | Siguen en la **v1.0**. `seed:legal` no se corrió; publicaría la v1.1 |
| **Cierre automático** | Queda **apagado** (`enabled = false`). Primero hay que medir el volumen |
| **Plantillas de correo** | Solo se actualizaron 3 de 7: falta `nueva-postulacion`, `postulacion-confirmada`, `postulacion-cerrada` y `candidatos-sin-resolver` |
| **Borrado de cuenta OAuth en la UI** | `DeleteAccountCard.tsx:26` sigue exigiendo contraseña. El backend ya lo acepta sin ella; falta el cambio de frontend |
| **Remitente de correo** | Sigue siendo `no_reply@tuempleo.cl`. Migrarlo exige SPF/DKIM en tuvacante.com |

### Qué incluyó

**Derechos del titular** — los tres endpoints legales respondían 400 a lo que el frontend
envía, así que ninguno se podía ejercer: `confirmPhrase` en el borrado, camelCase en el
consentimiento, y `needsUpdate`/`currentVersion` que nunca se devolvían. Se agregó
`usuario.auth_provider` y el centinela `!oauth` en reemplazo del `dummyPassword`.

**Cupos** — un `tipo_aviso` fuera del mapa daba `undefined` y `usados >= undefined` es
false: la oferta quedaba sin tope. Ahora cae a 0 y hay una sola fuente del mapa.

**Dominio** — `dig tuempleo.cl` no devuelve nada. El logo de los correos, el canonical del
SEO y los fallbacks de `FRONTEND_URL` apuntaban ahí. El logo ahora sale de
`/img/landing/logo-v2.png`, sin el hash del bundler, que cambia en cada build del frontend.

**SMS duplicado** — el invitado recibía dos mensajes por el mismo código, uno del backend y
otro del frontend. Se quitó el del backend; queda el del frontend, que trae el link y tiene
largo fijo. El del backend incluía la razón social, que es texto libre: una tilde o una eñe
lo sacaba de GSM-7 y partía el mensaje en dos segmentos.

**Tests** — 66 → 135, de 12,38% a 15,82% de cobertura. Specs nuevos en `legal`, `auth` y
`quota`, y reescrito el de `applications`, que no compilaba.

Detalle completo en `docs/pendientes-ley-21719.md`.

---

## Anexo del release: notas de los cambios desplegados

### `feat/automatic_end` — Eliminación de cuenta y `auth_provider`

| | |
|---|---|
| **Esquema** | `usuario.auth_provider`, creada por synchronize al arrancar |
| **Backfill** | Se verificó y **no hizo falta**: 0 de 7 cuentas eran OAuth |
| **Reversible** | Sí, la columna es aditiva y con default |

**Qué incluye**

- `usuario.auth_provider` — distingue las cuentas con contraseña propia de las creadas
  por OAuth. Antes no había forma de saberlo.
- `DELETE /v1/legal/account` acepta el payload que el frontend envía (`confirmPhrase`,
  antes `confirmation`) y no exige contraseña a las cuentas OAuth, que nunca la tuvieron.
- `POST /v1/legal/consent` acepta camelCase (`documentType`, `documentVersion`) y `accepted`
  pasa a ser opcional con default `true`.
- `GET /v1/legal/consent/status` devuelve `currentVersion` y `needsUpdate`.
- Fin del `dummyPassword`: las cuentas OAuth guardan el centinela `!oauth` en vez de un
  cifrado de `oauth:<email>:<timestamp>`.
- `QuotaService`: un `tipo_aviso` fuera del mapa daba cupos ilimitados; ahora cae a 0.

**Sobre el script de backfill** (`src/db/migrate/add-auth-provider.ts`): existe porque las
cuentas OAuth ya existentes solo se distinguen descifrando su `password`, cosa que
synchronize no puede hacer. Se corrió en seco el 18-08 y reportó 0 cuentas OAuth, así que
**ya cumplió su función y se puede borrar** junto con su entrada en `package.json`.

```bash
DRY_RUN=1 npx ts-node -r tsconfig-paths/register src/db/migrate/add-auth-provider.ts
```

Queda como referencia del patrón: cuando un cambio de esquema necesite transformar datos
viejos, el script puntual es el complemento de synchronize.

⚠️ **El frontend todavía exige contraseña.** `DeleteAccountCard.tsx:26` valida
`password.length > 0` antes de habilitar el botón, así que el usuario OAuth sigue bloqueado
en la UI aunque el backend ya lo acepte. Falta ese cambio para cerrar el circuito.

**Documentos legales: pendiente, NO se publicó en este release.** En la base sigue la
**v1.0**, cuyo texto no existe en el repo. Para subir a la v1.1, que ya referencia solo
tuvacante.com:

```bash
npx ts-node -r tsconfig-paths/register src/db/seed/seed-legal-documents.ts
```

⚠️ **Al subir de 1.0 a 1.1, toda la base tiene que volver a aceptar.** Con `needsUpdate` ya
corregido, `ConsentChecker` abre el diálogo en la siguiente sesión de cada usuario y desloguea
a quien lo cierre sin aceptar. Conviene avisarle a soporte antes.

La **v2.0** con la Ley 21.719 **no se publica**: quedó en `docs/legal-v2-borrador.md` para
retomarla antes del 1 de diciembre de 2026.

---

### `feat/automatic_end` — Cierre automático de postulaciones

| | |
|---|---|
| **Commit** | `3c88c67`, mergeado en el PR #93 |
| **Estado** | **Desplegado** el 2026-08-18 |
| **Esquema** | Creado por synchronize. El `.sql` quedó como documentación del DDL |
| **Activo** | **No.** Sigue apagado (`CIERRE_AUTOMATICO.enabled = false`) |

**Qué incluye**

- Módulo nuevo `src/modules/cierre-postulaciones/` (service, cron 09:00, controller admin, 13 tests)
- Cierre de postulaciones al expirar/completarse una oferta — engancha en `oferta-status.service.ts`
- Cierre al retirar el aviso — engancha en `oferta.service.ts:eliminarOferta`, que ahora
  además marca `estado = 'eliminada'` y `es_activa = false` (antes el softDelete no los tocaba)
- Cierre por inactividad con la oferta aún publicada (cron diario)
- Periodo de gracia para candidatos avanzados antes de cerrarlos por el empleador
- 3 endpoints admin nuevos (ver `docs/cierre-automatico-frontend.md`)
- 2 plantillas de correo nuevas, sin registrar todavía en Pacific Network

**Cambios de esquema** (`postulacion`): `fecha_actualizacion`, `cierre_motivo`,
`fecha_cierre`, `cierre_automatico`, `cierre_notificado_at` + 2 índices.
(`oferta`): `aviso_cierre_pendientes_at`. Todas **aditivas y nullable**.

#### `DB_SYNCHRONIZE` — decidido: queda en `true`

El servidor corre con `DB_SYNCHRONIZE=true` (`src/config/database.ts:67`) y así se
desplegó este release: TypeORM creó las columnas al arrancar, sin migraciones. Es una
decisión deliberada, ver "Sobre el esquema" arriba.

Lo único que conviene tener presente, sin que sea motivo para cambiar de enfoque: con
synchronize, **una columna que exista en la base pero que ninguna entidad declare se
elimina al arrancar**. Vale una revisión con calma de las tablas legacy (`registro`,
`count_visits`, `mail`) para confirmar que las entidades mapean todo lo que existe.

#### Pasos que faltan para prenderlo

El código ya está desplegado y el esquema creado, pero el cierre automático **sigue
apagado**. Para activarlo:

1. Verificar que responde: `GET /v1/admin/config/cierre-automatico` → `enabled: false`.
2. **Sin prender nada**, correr `POST /v1/admin/cierre-automatico/ejecutar` para ver el
   resumen y confirmar que el endpoint funciona.
3. Medir el volumen real de postulaciones colgadas. Recién con ese número, decidir si se
   prende `enabled`.
4. Antes de prenderlo, el respaldo de la tabla (ver Rollback): los cierres son la parte
   irreversible.
5. El correo va aparte y después: requiere crear las 2 plantillas en Pacific Network,
   cargar los `messageId` y prender `notificarEmail`.

#### Rollback

Este release está pensado para revertirse sin drama, y la razón importa: **las columnas
son aditivas y nullable, así que el código viejo funciona igual con el esquema nuevo.**
No hace falta revertir la migración para volver atrás.

Escenarios, del más barato al más caro:

**a) Se comporta mal con el flag prendido** → apagarlo. No requiere deploy ni rollback:

```
PATCH /v1/admin/config/cierre-automatico  { "enabled": false }
```

**b) Hay que revertir el código** → volver `dev` a `de003aa`. El esquema puede quedarse
como está; las columnas nuevas simplemente dejan de usarse.

**c) Hay que revertir también el esquema** (normalmente innecesario) — solo si algo del
DDL molesta de verdad:

```sql
-- Solo si es imprescindible. Descarta los motivos de cierre ya registrados.
ALTER TABLE postulacion
  DROP INDEX idx_postulacion_estado_actualizacion,
  DROP INDEX idx_postulacion_oferta_estado,
  DROP COLUMN cierre_notificado_at,
  DROP COLUMN cierre_automatico,
  DROP COLUMN fecha_cierre,
  DROP COLUMN cierre_motivo,
  DROP COLUMN fecha_actualizacion;

ALTER TABLE oferta DROP COLUMN aviso_cierre_pendientes_at;

DELETE FROM system_config WHERE clave = 'CIERRE_AUTOMATICO';
```

**Lo que este rollback NO deshace:** las postulaciones que ya se cerraron quedan en
`no_seleccionado`. Revertir el código no las devuelve a `enviada`, porque el estado
anterior de cada una no se guardó en ninguna parte. **Por eso importa medir con el flag
apagado antes de prenderlo** — el cierre es la parte no reversible de este release.

Si hiciera falta deshacerlo, se necesitaría un respaldo previo de la tabla:

```sql
-- Correr ANTES de prender enabled, si se quiere poder deshacer los cierres.
CREATE TABLE postulacion_backup_pre_cierre AS
SELECT id, estado FROM postulacion
WHERE estado IN ('enviada','vista','en_revision','cualificado','preseleccionado','seleccionado');
```

---

## Historial

| Fecha | Commit | Qué se desplegó | Resultado |
|---|---|---|---|
| 2026-08-18 | `af7bcdc` | PR #93 (cierre automático, derechos del titular, cupos, dominio) + fix del SMS duplicado | **En producción.** Login con Google verificado. Esquema por synchronize; backfill innecesario (0 de 7 cuentas eran OAuth) |
| 2026-08-18 | `de003aa` | — | Congelado en la rama `backup/dev-2026-08-18-de003aa` como punto de retorno |
| 2026-08-07 | `de003aa` | Fix del PATCH de oferta y de perfil | Reemplazado por el release del 18-08 |
| — | `527daf9` | Marca del rollback de `dev` al estado de `0a27710` | Rollback previo |
