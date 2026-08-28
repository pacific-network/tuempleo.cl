# Match oferta–candidato — contexto para el frontend

**Rama:** `feat/multi_tenant` · **Fecha:** 27 de agosto de 2026

---

## 1. Qué cambió

El motor de match ya existía en el backend, pero estaba desenchufado: vivía solo detrás de
tres endpoints de consulta que nadie llamaba. Ahora entra al camino normal.

**Dos cosas pasan solas, sin que el frontend cambie nada:**

1. Al postular, el match se calcula y **se guarda en la postulación**.
2. Las listas de postulantes que el empleador ya consume **vienen ordenadas por match**.

O sea que si no se toca nada, la lista del empleador ya mejora. Lo que falta es mostrarlo.

---

## 2. Campos nuevos en `Postulacion`

Viajan en los endpoints que ya devuelven postulaciones. **Aditivos y nullable**: si el front
los ignora, todo sigue funcionando.

| Campo | Tipo | Significado |
|---|---|---|
| `matchScore` | `number \| null` | 0 a 100. Afinidad con la oferta **al momento de postular** |
| `matchDesglose` | `object \| null` | Puntaje por dimensión |

```json
{
  "matchScore": 72,
  "matchDesglose": {
    "area": 30, "experiencia": 25, "modalidad": 15,
    "ubicacion": 0, "educacion": 0, "herramientas": 2
  }
}
```

**`null` en las postulaciones anteriores a esta feature.** Hay un backfill para calcularlas,
pero mientras no se corra hay que tolerar el `null` — van al final de la lista.

**El score está congelado.** Se calcula cuando la persona postula y no se recalcula después:
si edita su perfil, el número no cambia. Es a propósito — lo que importa es qué tan coherente
era esa postulación cuando se hizo.

---

## 3. Vista del empleador

`GET /v1/postulaciones/oferta/:id` **ya viene ordenado por match**, de mayor a menor. No hay
que re-ordenar en el cliente: hacerlo solo puede desincronizar el orden con el de la API.

Qué conviene mostrar:

1. **El score junto a cada candidato.** Un número o una barra; con `matchDesglose` se puede
   abrir el detalle de por qué.
2. **Las dimensiones fuertes y débiles**, del desglose. Es más útil que el total: «calza en
   área y experiencia, no en ubicación» le dice al reclutador qué mirar.
3. **Nada para los `null`.** No mostrar «0%» en una postulación vieja sin score — es ausencia
   de dato, no un mal match.

También está `GET /v1/match/oferta/:ofertaId/candidatos`, que devuelve lo mismo calculado al
vuelo y acepta `?min=` para filtrar por score mínimo. Sirve para explorar, pero **para la
lista normal conviene la de postulaciones**: usa el score guardado, que es el histórico real.

---

## 4. Vista del candidato — lo que más rinde

Antes de postular, mostrarle su propio match con la oferta:

```
GET /v1/match/postulante/oferta/:ofertaId
→ { "score": 42, "desglose": { "area": 30, "experiencia": 0, ... } }
```

Con eso se puede decir «tu perfil calza en un 42% con esta oferta» y, del desglose, en qué
falla. **Es lo que mejora la coherencia de las postulaciones sin bloquear a nadie**: quien ve
un 20% decide solo, y quien igual quiere postular puede.

> **No lo uses para bloquear ni esconder el botón de postular.** El candidato es el lado
> escaso del producto; ponerle una barrera cuesta más de lo que ahorra. Informar sí,
> impedir no.

Y `GET /v1/match/postulante/mis-ofertas` devuelve sus postulaciones rankeadas, útil para
«tus mejores coincidencias» en su panel.

---

## 5. Antes de leer los números como calidad de candidato

**El scoring no penaliza lo que la oferta no declara.** Si una oferta no tiene
`area_trabajo`, `modalidad` ni `nivel_experiencia` cargados, esas dimensiones dan puntaje
completo y **todos los candidatos salen altos** — por falta de datos, no por buen match.

Antes de sacar conclusiones de la distribución, conviene revisar qué tan completas están las
ofertas. Y si el formulario de publicación deja esos campos opcionales, ese es el lugar donde
más se gana.

Los pesos —área 30, experiencia 25, modalidad 15, ubicación 15, educación 10, herramientas
5— son un punto de partida para afinar con datos reales, no una verdad.

---

## 6. Qué NO cambió

- Ningún endpoint cambió de forma, ruta ni contrato.
- La lista de postulantes es la misma llamada de siempre; solo llega ordenada y con dos
  campos más.
- Nadie queda bloqueado ni filtrado por su score. No hay umbral mínimo en ninguna parte.

---

## 7. Pendiente en el backend

- **`POST /v1/ofertas` no tiene guard**, así que hoy se puede crear una oferta sin token.
  Está en la lista de endpoints a cerrar junto con `quota` y `publication`.

El backfill ya se corrió en local: no quedan postulaciones sin score. En producción hay que
correrlo después del despliegue (`npm run migrate:match-score`), o las postulaciones
anteriores llegan en `null`.
