# Multi-empresa — contexto para el frontend

**Rama:** `feat/multi_tenant` · **Base:** `dev` en `b6a1864` · **Fecha:** 25 de agosto de 2026

---

## 1. Qué cambió conceptualmente

Hasta ahora una persona pertenecía a **una** empresa: la relación entre `usuario` y
`empleador` era `OneToOne`. Ahora una persona puede estar en **varias**, con un rol
distinto en cada una.

> El requerimiento, textual: *«yo como dueño de empresa puedo estar en todas, pero no me
> puedes limitar a una empresa solo mi RUT»*.

Dos consecuencias para el frontend:

**a) Aparece el concepto de empresa activa.** El backend resuelve casi todo contra
`usuario.id_empresa` — la empresa sobre la que la persona está operando. Salvo el endpoint
para cambiarla, **ningún llamado existente necesita mandar `empresaId`**: se sigue trabajando
igual que antes y el backend sabe de qué empresa se trata.

**b) El rol cambió de nombre.** `admin` y `miembro` ya no existen:

| Antes | Ahora | Qué puede hacer |
|---|---|---|
| `admin` | **`empleador`** | Maneja la empresa: publicar, invitar colaboradores, verificar la empresa |
| `miembro` | **`colaborador`** | Pertenece a la empresa, no la administra |

`admin` se sacó porque colisionaba con `usuario.isAdmin`, que es el administrador **del
sitio** — otra cosa completamente distinta.

⚠️ Si el frontend compara contra `'admin'` o `'miembro'` en algún lado, hay que actualizarlo.

---

## 2. El onboarding cambia de orden

Antes era un solo envío con empresa y responsable juntos. Ahora son **dos pasos**, y el
segundo se puede repetir:

```
registro → login
   │
   ├─ PASO 1   PUT /v1/empleador/responsable
   │           quién sos: nombres, apellidos, RUT, domicilio, teléfono, redes
   │           (todavía no hay ninguna empresa)
   │
   └─ PASO 2   POST /v1/empleador/empresas      ← una llamada por empresa
               los datos de la empresa + tu cargo en ella
                        │
                "¿Tenés otra empresa?" → volver a llamar
```

**Por qué importa que sean llamadas separadas:** cada empresa es una operación
independiente. Si la tercera falla, las dos primeras ya quedaron guardadas y solo hay que
reintentar esa. El frontend puede mostrar el estado de cada una por separado y no perder
nada si una falla.

**El cargo va por empresa, no por persona.** Los datos personales se piden una sola vez en el
paso 1; el `cargo` se pide en cada empresa, porque el mismo responsable puede ser gerente en
una y socio en otra.

**Da lo mismo quién completa el formulario.** Puede ser el dueño, un supervisor o un tercero:
quien registra queda como `empleador` de esa empresa y el sistema no infiere jerarquías.

---

## 3. Endpoints nuevos

Todos requieren JWT.

### `PUT /v1/empleador/responsable` — paso 1

```json
{
  "nombres": "Paulo",
  "apellidos": "Ramírez",
  "rut": "11111111-1",
  "data": {
    "pais": "Chile",
    "region": "Metropolitana",
    "comuna": "Providencia",
    "direccion": "Av. Siempre Viva 1",
    "telefono": "+56988440465",
    "linkedin": "..."
  }
}
```

Responde `{ "userId": 42, "empresas": 0 }` — `empresas` sirve para saber si ya tiene alguna
y decidir si sigue al paso 2 o va directo al panel.

`telefono` valida formato `+56XXXXXXXXX`. Las redes son opcionales.

### `POST /v1/empleador/empresas` — paso 2, repetible

```json
{
  "business": {
    "rut": "76000000-0",
    "razon_social": "Initech SpA",
    "nombre_fantasia": "Initech",
    "data": { "...": "igual que antes" }
  },
  "cargo": "Gerente"
}
```

Responde:

```json
{ "empresaId": 77, "empleadorId": 88, "activa": true }
```

`activa: true` significa que quedó como empresa activa — pasa con la primera. Las siguientes
devuelven `false` y no le roban el foco a la que estaba seleccionada.

### `GET /v1/empleador/mis-empresas`

Lo que alimenta el selector de empresa.

```json
{
  "exists": true,
  "empleador": { "id": 88, "empresaId": 77 },
  "membresias": [
    { "id": 88, "empresaId": 77, "rol": "empleador",   "nombre": "Initech" },
    { "id": 91, "empresaId": 80, "rol": "colaborador", "nombre": "ACME" }
  ]
}
```

`empleador` es la membresía **activa**, en singular. `membresias` es la lista completa.

### `PATCH /v1/empleador/empresa-activa`

```json
{ "empresaId": 80 }
```

Responde `{ "empresaId": 80, "rol": "colaborador" }`.

A partir de acá, todos los demás endpoints operan sobre esa empresa. **Conviene recargar los
datos de pantalla después de cambiar**, porque ofertas, postulaciones, cupos y estadísticas
pasan a ser los de la otra empresa.

Solo acepta empresas donde la persona tiene membresía; si no, responde 404 *«No tienes acceso
a esta empresa»*.

### `PATCH /v1/empleador/membresia/:id/rol`

```json
{ "rol": "empleador" }
```

El `:id` es el `id` de la membresía (el campo `id` de `membresias`, no `empresaId`).

---

## 4. Reglas de rol que la UI tiene que reflejar

Una sola idea: **el poder se puede dar, no se puede quitar.**

| Acción | Quién puede |
|---|---|
| Invitar y remover colaboradores | Cualquier `empleador` de esa empresa |
| Promover un colaborador a `empleador` | Cualquier `empleador` de esa empresa |
| Dejar de ser `empleador` | **Solo esa misma persona**, sobre su propia membresía |
| Dejar la empresa sin ningún `empleador` | Nadie |

En la pantalla de miembros eso significa:

- Junto a un **colaborador**, un `empleador` ve "Promover a empleador".
- Junto a **otro empleador**, no hay acción de degradar. No es que esté deshabilitada: no va.
- Junto a **uno mismo**, si hay otro empleador, aparece "Dejar de ser empleador".
- **Transferir** no es una acción: se promueve al otro y después uno renuncia.

---

## 5. Mensajes de error a mostrar tal cual

El backend devuelve textos ya redactados para el usuario. Conviene mostrarlos en vez de
inventar copy propio, porque nombran la empresa concreta.

| Situación | Código | Mensaje |
|---|---|---|
| Falta el paso 1 | 409 | Completá primero tus datos de responsable |
| RUT de empresa ya registrado | 409 | Ya existe una empresa registrada con ese RUT |
| RUT personal de otra persona | 409 | El RUT ya está registrado por otro usuario |
| Ya tiene perfil en esa empresa | 409 | Ya tienes un perfil de empleador en esta empresa |
| Cambiar a una empresa ajena | 404 | No tienes acceso a esta empresa |
| Intentar degradar a un par | 409 | Un empleador no puede quitarle el rol a otro. Solo esa persona puede dejarlo. |
| Renunciar siendo el último | 409 | Sos el único empleador de *X*. Promové a un colaborador antes de dejar de serlo. |
| Borrar la cuenta siendo el último | 403 | Sos el único empleador de *X*. Promové a un colaborador antes de eliminar tu cuenta. |
| No es empleador de la empresa | 403 | Solo un empleador de la empresa puede realizar esta accion |

---

## 6. Qué NO cambió

- **Ningún endpoint existente cambió de forma, ruta ni contrato.**
- `checkEmpleadorExists` sigue devolviendo `empleador` en singular (la membresía activa) y
  solo **agrega** `membresias` al lado. El código que ya lo consume sigue funcionando.
- Publicar ofertas, ver postulaciones, cupos y pagos se llaman igual que siempre: operan
  sobre la empresa activa sin que haya que mandarla.
- La verificación de empresa por SMS es la misma. Sigue siendo una insignia de contacto
  confirmado, no una credencial de autoridad.

---

## 7. Lo que hay que construir

1. **Selector de empresa** en el header o el panel, alimentado por `mis-empresas` y que
   llame a `empresa-activa`. Recargar la vista al cambiar.
2. **Onboarding en dos pasos**, con el "¿agregar otra empresa?" al final del paso 2 y la
   lista de las que ya se agregaron.
3. **"Agregar otra empresa" en el panel**, disponible siempre. Es el mismo
   `POST /v1/empleador/empresas`.
4. **Pantalla de miembros** con las acciones de la sección 4.
5. **Actualizar cualquier comparación** contra `'admin'` / `'miembro'`.

---

## 8. Lo que todavía no está en el backend

Para no construir contra algo que no existe:

- **Invitar a alguien que ya tiene cuenta.** `POST /v1/empleador/invitacion/aceptar` sigue
  rechazando emails ya registrados: solo sirve para altas nuevas. Sumar a alguien que ya usa
  la plataforma necesita un camino que todavía no está.
- **Eliminar una empresa.** No hay endpoint. Si alguien es el único empleador de una empresa
  sin colaboradores, hoy no puede eliminar su cuenta ni dejar la empresa.
- **Aislamiento de lecturas.** Hay endpoints que reciben `empresaId` por parámetro
  (`/v1/seleccion/empresa/:empresaId` y otros) y no validan pertenencia. Están en revisión;
  **no construir pantallas nuevas apoyadas en ellos** hasta que se cierren.
