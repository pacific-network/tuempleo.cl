# Cierre automático de postulaciones — contexto para el frontend

**Rama:** `feat/automatic_end` · **Commit:** `3c88c67` · **Base:** `dev` en `de003aa`

---

## 1. Qué cambió conceptualmente

Hasta ahora, cuando una oferta expiraba o se completaba, **las postulaciones quedaban
para siempre** en `enviada` / `vista` / `en_revision` / `cualificado`. El candidato entraba
a "Mis postulaciones", veía "enviada" y nunca sabía que el proceso había terminado.

Ahora el backend las cierra solo. Y eso trae un cambio importante de lectura:

> **`estado: 'no_seleccionado'` ya no significa únicamente "el reclutador me descartó".**
> Puede ser también "la oferta expiró", "se llenaron las vacantes" o "la empresa retiró
> el aviso". El nuevo campo `cierre_motivo` es lo que distingue un caso del otro.

Se reusó `no_seleccionado` a propósito, **para no romper el front**: no se agregó ningún
estado nuevo al enum. Todo lo nuevo son campos adicionales y nullable.

## 2. Campos nuevos en el payload de `Postulacion`

Viajan en **todos** los endpoints que devuelven postulaciones, sin cambios de contrato.
El más relevante para el candidato es `GET /v1/postulaciones/postulante`.

| Campo | Tipo | Significado |
|---|---|---|
| `cierre_motivo` | `string \| null` | Por qué terminó. `null` = no fue cerrada automáticamente |
| `fecha_cierre` | `datetime \| null` | Cuándo se cerró |
| `cierre_automatico` | `boolean` | `true` si la cerró el sistema, no una persona |
| `cierre_notificado_at` | `datetime \| null` | Cuándo se le avisó al candidato (uso interno) |
| `fecha_actualizacion` | `datetime \| null` | Último movimiento. `null` en postulaciones viejas |

**Retrocompatible:** si el front ignora estos campos, todo sigue funcionando como hoy.
Solo se pierde la explicación.

### Valores de `cierre_motivo` y copy sugerido

| Valor | Qué pasó | Texto propuesto para la UI |
|---|---|---|
| `oferta_expirada` | La oferta dejó de estar publicada sin que se eligiera a nadie | "La oferta dejó de estar publicada y el proceso se cerró sin selección." |
| `vacante_completada` | Se llenaron todas las vacantes con otros candidatos | "La empresa completó las vacantes con otros candidatos." |
| `oferta_eliminada` | El empleador retiró el aviso | "La empresa retiró esta oferta." |
| `inactividad` | Nadie movió la postulación en el plazo configurado (30 días por defecto) | "El proceso no tuvo avances en el plazo esperado y se cerró automáticamente." |

Los mismos textos están en `TEXTO_MOTIVO`, en
`src/modules/cierre-postulaciones/cierre-postulaciones.service.ts`. Si el front define
su propio copy, conviene mantenerlos alineados con el del correo.

## 3. Qué convendría mostrar

**Vista del candidato ("Mis postulaciones"):**

1. Un badge distinto para las postulaciones cerradas — hoy un `no_seleccionado` se ve
   igual que un descarte, y no es lo mismo para quien lo lee.
2. El texto del motivo cuando `cierre_motivo != null`. Es el punto completo de la
   feature: sin esto, el backend cierra pero el candidato sigue sin entender.
3. `fecha_cierre` para ordenar o mostrar "cerrada hace X días".

Sugerencia de tono: cuando el motivo **no** es un descarte real (expirada, eliminada,
inactividad), conviene que la UI no lo presente como rechazo. No fue evaluado y
rechazado — el proceso simplemente terminó.

**Vista del empleador:**

Cuando una oferta termina con candidatos en `preseleccionado` / `seleccionado`, esos
**no** se cierran de inmediato: se abre un periodo de gracia (5 días por defecto) y se
le avisa. Si no los resuelve, el sistema los cierra por él. Vale un aviso en el panel:
*"Tienes N candidatos sin resolver. Te quedan X días."* El dato está en
`oferta.aviso_cierre_pendientes_at` más el conteo de postulaciones en esos estados.

## 4. Endpoints nuevos

Los tres son **solo admin** (`AdminGuard`). Ninguno es para el flujo de candidato ni de
empleador.

### `GET /v1/admin/config/cierre-automatico`

Estado actual de la configuración.

```json
{
  "enabled": false,
  "diasInactividad": 30,
  "diasGraciaAvanzados": 5,
  "notificarEmail": false,
  "messageIdCandidato": null,
  "messageIdEmpleador": null,
  "maxCorreosPorEjecucion": 200
}
```

### `PATCH /v1/admin/config/cierre-automatico`

Actualización parcial; se manda solo lo que cambia.

```json
{ "enabled": true, "diasInactividad": 45 }
```

Rangos validados: `diasInactividad` 7–180, `diasGraciaAvanzados` 1–30,
`maxCorreosPorEjecucion` 1–5000.

**Dos interruptores separados, a propósito:** `enabled` gobierna el cierre y
`notificarEmail` gobierna solo el correo. Se puede cerrar sin notificar mientras se
mide el volumen real.

### `POST /v1/admin/cierre-automatico/ejecutar`

Corre el barrido al instante sin esperar el cron de las 09:00, y devuelve el resumen:

```json
{
  "cerradasPorOferta": 0,
  "cerradasPorInactividad": 128,
  "cerradasTrasGracia": 4,
  "empleadoresAvisados": 0,
  "correosEnviados": 0,
  "correosFallidos": 0
}
```

Útil para el panel admin: un botón "Ejecutar ahora" que muestre el resumen.
Con `enabled: false` devuelve todo en cero sin tocar nada.

## 5. Qué NO cambió

- Ningún endpoint existente cambió de forma, ruta ni contrato.
- El enum `estado` de `postulacion` es el mismo de siempre.
- No hay campos removidos ni renombrados.
- Con la config apagada (default), el comportamiento es idéntico al actual.

## 6. Cuándo empieza a pasar algo

Nada ocurre hasta que se cumplan **las tres** condiciones:

1. La migración `2026-08-12_cierre_automatico_postulaciones.sql` corrió en la base.
2. `enabled` está en `true`.
3. Para los correos, además `notificarEmail: true` y los `messageId` cargados con las
   plantillas creadas en Pacific Network.
