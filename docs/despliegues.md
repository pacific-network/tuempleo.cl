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
| **Commit** | `de003aa` — *Fix: el PATCH de oferta descartaba `data` y el de perfil exigía el objeto completo* |
| **Fecha del commit** | 2026-08-07 |
| **Punto de retorno seguro** | `de003aa` |
| **Migraciones aplicadas hasta acá** | `2026-06-17_utf8mb4.sql`, `2026-06-24_match_entrevistas_verificacion.sql` |

Para volver a este punto exacto:

```bash
git checkout dev
git reset --hard de003aa   # destructivo: confirmar antes
```

---

## Pendientes de desplegar

### `feat/automatic_end` — Eliminación de cuenta y `auth_provider`

| | |
|---|---|
| **Migración requerida** | `npm run migrate:auth-provider` (script TS, no `.sql`) |
| **Orden** | **Antes** de subir el código |
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

**Por qué la migración es un script y no un `.sql`:** las cuentas OAuth ya existentes solo
se distinguen descifrando su `password`. El script hace el `ALTER TABLE` y el backfill en
una pasada. Admite `DRY_RUN=1` para ver el conteo sin escribir, y necesita el `JWT_SECRET`
con el que se cifraron las contraseñas.

```bash
DRY_RUN=1 npm run migrate:auth-provider   # revisar primero
npm run migrate:auth-provider
```

**Riesgo si no se corre:** todas las cuentas quedan como `local`. Las de Google seguirán sin
poder eliminarse, igual que hoy. No rompe nada más.

⚠️ **El frontend todavía exige contraseña.** `DeleteAccountCard.tsx:26` valida
`password.length > 0` antes de habilitar el botón, así que el usuario OAuth sigue bloqueado
en la UI aunque el backend ya lo acepte. Falta ese cambio para cerrar el circuito.

**Documentos legales: se publica la v1.1.** En la base está la **v1.0**, cuyo texto no existe
en el repo. `npm run seed:legal` sube a la v1.1, que ya referencia solo tuvacante.com.

```bash
# En el contenedor no hay ts-node (es devDependency y la imagen instala --production).
# Los scripts sí se compilan a dist:
docker exec backend-nest node dist/db/seed/seed-legal-documents.js
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
| **Commit** | `3c88c67` |
| **Base** | `de003aa` (1 commit de diferencia) |
| **Estado** | Pusheado, **sin mergear** a `dev` |
| **Migración requerida** | `src/db/migrations/2026-08-12_cierre_automatico_postulaciones.sql` |
| **Activo al desplegar** | **No.** Queda apagado (`CIERRE_AUTOMATICO.enabled = false`) |

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

#### ⚠️ Verificar antes: `DB_SYNCHRONIZE`

El `.env` local tiene `DB_SYNCHRONIZE=true`, y `src/config/database.ts:67` pasa eso
directo a TypeORM. **Si en el servidor está en `true`, TypeORM va a sincronizar el
esquema solo al arrancar**, contra las entidades — y con `synchronize` activo sobre una
base con datos puede alterar tipos, tocar el enum de `estado` o botar índices sin avisar.
Este release agrega columnas y un enum nuevo, así que es exactamente el escenario donde
más daño haría.

Confirmar que en dev y en producción esté en `false` **antes** de desplegar. Si estuviera
en `true`, eso es un problema anterior a este release y hay que arreglarlo primero.

#### Orden de despliegue

1. Correr la migración a mano en la base.
2. Mergear el PR a `dev` (dispara el deploy).
3. Verificar que la app levantó: `GET /v1/admin/config/cierre-automatico` debe responder
   con `enabled: false`.
4. **No prender nada todavía.** Correr `POST /v1/admin/cierre-automatico/ejecutar` para
   ver el resumen en ceros y confirmar que el endpoint responde.
5. Medir primero el volumen real de postulaciones colgadas. Recién con ese número,
   decidir si se prende `enabled`.
6. El correo va aparte y después: requiere crear las 2 plantillas en Pacific Network,
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
| 2026-08-07 | `de003aa` | Fix del PATCH de oferta y de perfil | En producción |
| — | `527daf9` | Marca del rollback de `dev` al estado de `0a27710` | Rollback previo |
