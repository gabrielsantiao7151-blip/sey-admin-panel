# Panel administrativo SEU

Documento para el equipo del panel. El backend de este repositorio ya responde estas rutas. El panel se construye con HTML, CSS y JavaScript, sin framework. Hay un solo superadmin. No hay login de empresa ni de staff.

La marca es SEU. El emblema está en `docs/brand/seu-logo.jpg`: círculo verde `#143D2E`, aro y letras en plata, pin en la U, carro y la frase *Siempre estarás ubicado*. En el login va el círculo completo. El lila alrededor del archivo es el margen de la foto, no se usa. El nombre que ve el usuario es SEU, no el nombre interno del servidor.

## 1. Qué tiene que poder hacer

El superadmin ve toda la plataforma y puede:

1. Entrar y ver el inicio.
2. Crear, revisar, activar y suspender conductores.
3. Crear vehículos y asignarlos.
4. Ver viajes, abrir el detalle y ver el mapa de conductores en línea.
5. Consultar clientes.
6. Editar tarifas.
7. Ver facturación y reportes.
8. Atender alertas.
9. Leer y cerrar el chat de un viaje.

No se construye: empresas, publicidad, beneficios, vales, wallet, factura electrónica, ni edición de datos sensibles del cliente.

## 2. Archivos

Un sitio estático. Se puede abrir con cualquier servidor de archivos o colgarlo en el mismo proyecto Vercel dentro de `public/` más adelante. Mientras tanto puede vivir en otra carpeta y apuntar a la URL de la API.

```
admin/
  login.html
  index.html
  drivers.html
  driver.html
  vehicles.html
  trips.html
  trip.html
  clients.html
  client.html
  fares.html
  billing.html
  alerts.html
  chats.html
  chat.html
  css/app.css
  js/api.js
  js/format.js
  js/session.js
```

Cada página carga `css/app.css`, `js/session.js`, `js/format.js` y `js/api.js`. El layout es el mismo: barra lateral fija y contenido a la derecha. En pantallas angostas la barra se convierte en una fila de enlaces arriba.

## 3. Cómo hablar con la API

Base local: `http://localhost:3000`. En producción, la URL que entregue Vercel. Guárdala en `localStorage` con la clave `seu_base` para poder cambiarla sin tocar el código. El primer superadmin del servidor entra con `admin@ubitt.app` y la contraseña definida en el backend.

Toda respuesta JSON trae:

```json
{ "status": true, "value": {}, "msg": null, "errorCode": null }
```

Si `status` es `false`, muestra `msg` en un aviso y no sigas como si hubiera datos. `value` es el recurso, un arreglo, o una página:

```json
{ "items": [], "page": 1, "limit": 20, "total": 0 }
```

La página se pide con `?page=1&limit=20`.

`js/api.js` debe hacer esto:

- Poner `Authorization: Bearer {accessToken}`.
- Si la respuesta es 401, llamar `POST /api/auth/refresh` con el `refreshToken` una sola vez y repetir la petición.
- Si el refresh falla, borrar la sesión y ir a `login.html`.
- Enviar JSON con `Content-Type: application/json`.
- No guardar la contraseña.

Las fotos del chat son `<img src="{base}{imageUrl}?access_token={accessToken}">`. `imageUrl` viene relativo, por ejemplo `/api/files/abc`.

## 4. Sesión

`login.html` no muestra el menú. Formulario: correo y contraseña.

`POST /api/admin/auth/login`

```json
{ "email": "admin@ubitt.app", "password": "********" }
```

Guarda `accessToken`, `refreshToken` y `user.fullName`. Si `user.role` no es `superadmin`, no entres: esa ruta ya rechaza otras cuentas.

El resto de páginas, al cargar, si no hay token redirigen a `login.html`. Un botón “Salir” llama `POST /api/auth/logout` con `{ "refreshToken" }` y borra el almacenamiento.

El access token dura 15 minutos. No hace falta un reloj en pantalla: el refresh al recibir 401 alcanza.

## 5. Menú

| Enlace | Página |
|--------|--------|
| Inicio | `index.html` |
| Conductores | `drivers.html` |
| Vehículos | `vehicles.html` |
| Viajes y mapa | `trips.html` |
| Clientes | `clients.html` |
| Tarifas | `fares.html` |
| Facturación | `billing.html` |
| Alertas | `alerts.html` |
| Chats | `chats.html` |

Muestra un punto en Alertas cuando `alertsOpen` del inicio es mayor que cero. Puedes pedirlo también con `GET /api/admin/alerts?status=open&limit=1` y usar `total`.

## 6. Textos de estado

Viaje:

| `status` | Texto |
|----------|--------|
| `draft` | Borrador |
| `payment_pending` | Pago pendiente |
| `searching` | Solicitado |
| `offered` | Solicitado |
| `assigned` | Asignado |
| `driver_arriving` | En camino |
| `driver_arrived` | Conductor en origen |
| `in_progress` | En viaje |
| `completed` | Finalizado |
| `cancelled` | Cancelado |
| `expired` | Cancelado |

Conductor: `pending` Pendiente, `approved` Aprobado, `rejected` Rechazado, `suspended` Suspendido, `inactive` Inactivo.

En la ficha, `operational`: `offline` Desconectado, `available` Disponible, `on_trip` En viaje.

Vehículo guardado: `available` Disponible, `assigned` Asignado, `out_of_service` Fuera de servicio, `blocked` Bloqueado. `screenStatus: "in_trip"` se muestra como “En viaje” aunque el estado guardado siga siendo `assigned`.

Categorías: `economy` Económico, `standard` Estándar, `premium` Premium.

Pago: `cash` Efectivo, `gateway` Pago en línea. Estados de pago: `pending`, `approved`, `rejected`, `cancelled`, `refund_pending` (reembolso pendiente; nadie lo ejecuta todavía).

Dinero: entero de la moneda, sin decimales. En Colombia:

```javascript
new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(amount)
```

Fechas en UTC vienen como ISO. Muéstralas en `America/Bogota`.

## 7. Inicio

`GET /api/admin/dashboard`

Sin query, el periodo es el día de hoy en UTC. Un selector “Desde / Hasta” vuelve a pedir `?from=2026-11-01&to=2026-11-04`. `from` y `to` aceptan fecha u hora ISO.

Tarjetas:

| Tarjeta | Campo | Nota |
|---------|--------|------|
| Conductores | `drivers.total`, `.approved`, `.pending`, `.online` | Totales, no del periodo |
| Vehículos activos | `vehiclesActive` | No incluye fuera de servicio ni bloqueados |
| Clientes | `clients` | Cuentas `user` |
| Viajes del periodo | `trips.requested` | Creados en el rango |
| En curso | `trips.inProgress` | Ahora mismo, no histórico |
| Finalizados | `trips.completed` | Terminaron en el rango |
| Cancelados | `trips.cancelled` | Se cancelaron en el rango |
| Ingresos | `income.cash` y `income.gateway` | Listas separadas por moneda. No las sumes en una sola cifra |
| Alertas abiertas | `alertsOpen` | Enlace a `alerts.html` |

Cada item de ingreso es `{ currency, count, amount }`. Si la lista está vacía, muestra “$ 0”.

## 8. Conductores

### Lista — `drivers.html`

`GET /api/admin/drivers?status=&q=&page=`

Filtros: estado y texto (nombre, correo, teléfono o documento). Tabla: nombre, teléfono, ciudad, estado, operativo, calificación, deuda en efectivo (`cashCommissionOwed`). Clic en la fila abre `driver.html?id=`.

Botón “Nuevo conductor” abre un formulario en la misma página:

```json
{
  "fullName": "Juan Pérez",
  "document": "1234567890",
  "phone": "3001112233",
  "email": "juan@correo.com",
  "password": "minimo8",
  "countryCode": "CO",
  "city": "Bogotá"
}
```

`POST /api/admin/drivers`. El conductor queda `approved` y activo. La contraseña no se vuelve a mostrar.

### Ficha — `driver.html?id=`

`GET /api/admin/drivers/{id}`

Muestra documento, contacto, estado, motivo (`reviewReason`), vehículos, operativo, calificación, `cashCommissionOwed` y la última ubicación si existe. Si hay `activeTripId`, enlaza a `trip.html?id=`.

Editar nombre, teléfono, ciudad, país y documento: `PATCH /api/admin/drivers/{id}`.

Revisión, con un campo de motivo:

| Botón | Body |
|-------|------|
| Aprobar | `POST .../review` `{ "action": "approve", "reason": "Documentación completa" }` |
| Rechazar | `{ "action": "reject", "reason": "..." }` el motivo es obligatorio |
| Suspender | `{ "action": "suspend", "reason": "..." }` el motivo es obligatorio |

Activar / desactivar es otra acción: `POST /api/admin/drivers/{id}/status` con `{ "status": "active" }` o `"inactive"`. No sirve para un pendiente, rechazado o suspendido: esos pasan por revisión. Desactivar genera una alerta `driver_inactive`.

## 9. Vehículos

`vehicles.html`

`GET /api/admin/vehicles?status=&driverId=&page=`

Tabla: placa, marca, modelo, año, color, categoría, conductor, estado de pantalla.

Crear:

```json
{
  "plate": "ABC123",
  "brand": "Chevrolet",
  "model": "Onix",
  "year": 2022,
  "color": "Gris",
  "category": "standard",
  "driverId": null
}
```

`POST /api/admin/vehicles`. La placa se guarda en mayúsculas, solo letras y números. Si mandas `driverId`, queda asignado.

En la fila o en un panel:

- Editar: `PATCH /api/admin/vehicles/{id}` con los campos que cambien.
- Asignar: `POST /api/admin/vehicles/{id}/assign` `{ "driverId": "..." }`. El id es el del conductor, no el del usuario.
- Quitar: `POST /api/admin/vehicles/{id}/unassign`. Falla si está en un viaje.
- Estado: `POST /api/admin/vehicles/{id}/status` con `out_of_service`, `blocked`, `available` o `assigned`. Fuera de servicio y bloqueado abren una alerta. Un vehículo bloqueado no puede usarse para ofertar. No lo marques `available` si todavía tiene conductor: primero quita la asignación.

El desplegable de conductores sale de `GET /api/admin/drivers?status=approved&limit=100`.

## 10. Viajes y mapa

`trips.html` tiene dos zonas: el listado y el mapa.

### Listado

`GET /api/admin/trips?from=&to=&status=&driverId=&passengerId=&vehicleId=&category=&q=&page=`

`q` busca código (`UB-10442`), ciudad o dirección. `passengerId` es el id de usuario del cliente. `driverId` es el id del conductor.

Columnas: código, fecha, cliente, conductor, categoría, estado, valor acordado (`fare.agreed`), método de pago. Clic abre `trip.html?id=`.

### Mapa

`GET /api/admin/map` cada 5 segundos mientras la página está visible. Para el mapa usa Leaflet por CDN y teselas de OpenStreetMap. No hace falta llave de Google.

Cada item de `value.drivers`:

- `state`: `available` (en línea, sin viaje), `assigned`, `arriving` (en camino o ya llegó al origen), `in_trip`.
- `location.lat` / `location.lng`.
- `fullName`, `plate`.
- `trip` o `null`. Si hay viaje: código, estado, origen y destino.

Color sugerido: verde disponible, azul en camino o asignado, naranja en viaje. Al hacer clic en un marcador, un panel muestra nombre, placa, estado y las direcciones, con enlace al viaje.

Conductores sin GPS no salen. Si la lista viene vacía, el mapa igual se centra en Bogotá (`4.71, -74.07`) y un texto dice que no hay conductores en línea.

### Detalle — `trip.html?id=`

`GET /api/admin/trips/{id}`

Muestra:

- código y estado
- cliente: nombre y teléfono (`passenger`)
- conductor y vehículo, si ya hay
- origen y destino (dirección, y un mapa con los dos puntos)
- horas dentro de `timestamps`: `createdAt`, `assignedAt`, `arrivedAt`, `startedAt`, `finishedAt`, `cancelledAt`
- `distanceKm`, `durationMin`, `fare.agreed`, `fare.commission`, `fare.driverNet`, `fare.currency`
- `payment.method` y `payment.status`
- `ratings` si existen
- enlace al chat si hay `conversationId` (`chat.html?id=`)
- `cancel.by`, `cancel.reason` y `cancel.at` si está cancelado
- `receipt` si terminó

Cancelar: solo ofrécelo si el estado no es `completed`, `cancelled` ni `expired`. En `in_progress` este es el único lado que puede cancelar.

`POST /api/admin/trips/{id}/cancel`

```json
{ "reason": "El pasajero no aparece" }
```

Si el pago en línea ya estaba aprobado y el viaje no había empezado, `payment.status` queda `refund_pending`. El panel solo lo muestra. No llama a un banco.

## 11. Clientes

Solo consulta.

`GET /api/admin/clients?q=&page=`

Tabla: nombre, teléfono, correo, estado de la cuenta, viajes completados, y `driverStatus` si esa persona también pidió ser conductor.

`client.html?id=` usa `GET /api/admin/clients/{id}`. Arriba la cuenta. Abajo `trips.items` con la misma paginación (`page` en el query). No hay botón de editar ni datos de tarjeta.

## 12. Tarifas

`fares.html`

`GET /api/admin/fares` trae todas, activas e inactivas.

La ciudad vacía significa tarifa nacional. Si existe tarifa de esa ciudad y categoría, gana sobre la nacional. El panel no tiene que calcular eso: lo hace el servidor al cotizar.

Crear: `POST /api/admin/fares`. Actualizar: `PUT /api/admin/fares/{id}`. Prender o apagar: `PATCH /api/admin/fares/{id}/active` con `{ "isActive": true }`.

Campos del formulario:

| Campo | Qué es |
|-------|--------|
| `countryCode` | `CO`, `CL`, … |
| `city` | vacío = nacional |
| `vehicleCategory` | `economy`, `standard` o `premium` |
| `currency` | `COP`, `CLP`, … |
| `baseFare` | banderazo, entero |
| `perKm` | pesos por kilómetro |
| `waitMinuteRate` | pesos por minuto de duración del viaje |
| `nightSurchargePct` | porcentaje. La app lo activa con `night: true` |
| `rainSurchargePct` | igual, con `rain: true` |
| `airportSurcharge` | entero, con `airport: true` |
| `commissionPct` | porcentaje de la plataforma, por ejemplo `10` |
| `minOfferPct` / `maxOfferPct` | rango de la oferta del conductor sobre la tarifa sugerida. `80` y `150` significan del 80 % al 150 % |
| `isActive` | si la app puede usarla |

No dejes `minOfferPct` mayor que `maxOfferPct`. Los montos son enteros. Una fila repetida del mismo país, ciudad y categoría responde `CONFLICT`.

Al abrir el panel por primera vez ya existen tres tarifas nacionales de Colombia. Se pueden editar.

## 13. Facturación y reportes

`billing.html`. Mismo selector de fechas. Tres bloques en la misma página.

### Facturación

`GET /api/admin/billing?from=&to=`

`value.rows`: por método y moneda, `trips`, `gross` (valor acordado), `commission`, `driverNet`. Efectivo y pasarela van en filas distintas. No emitas factura. No hay botón de pago al conductor.

### Operación

`GET /api/admin/reports/operations?from=&to=`

- `tripsByDay`: fecha, cantidad, finalizados, cancelados (según la fecha de creación)
- `tripsByDriver` y `tripsByVehicle`: finalizados en el periodo
- `cancellations`
- `avgDurationMin`

Una tabla por bloque alcanza. No hace falta gráfica en la primera versión.

### Conductores

`GET /api/admin/reports/drivers?from=&to=&page=`

`byStatus` trae el conteo actual (`approved`, `pending`, `rejected`, `suspended`, `inactive`). `drivers.items` trae viajes del periodo y `ratingAvg`.

### Pagos

Puede ir al final de la misma página.

`GET /api/admin/payments?status=&method=&from=&to=&page=`

`GET /api/admin/payments/summary?from=&to=`

La pasarela se configura aquí, en un formulario aparte, no en el código:

`GET /api/admin/gateway` y `PUT /api/admin/gateway`

```json
{
  "provider": null,
  "enabled": false,
  "publicKey": "",
  "secretKey": "",
  "webhookSecret": ""
}
```

La respuesta nunca devuelve las llaves secretas, solo `hasSecretKey`, `hasWebhookSecret` y `ready`. Mandar `secretKey` vacío no borra la anterior. Para borrarlas: `{ "clearSecrets": true, "provider": null }`.

Hoy ningún proveedor cobra de verdad. Si `ready` es `true`, la app muestra “Pago en línea”, pero el cobro responde que falta el adaptador. Déjalo apagado hasta que se elija el proveedor. El webhook que la pasarela futura debe llamar es:

`POST /api/payments/webhook/{provider}`

Header `x-ubitt-signature`: HMAC SHA-256 en hex del cuerpo crudo, con `webhookSecret`.

```json
{ "paymentId": "...", "providerRef": "...", "status": "approved" }
```

`status` también puede ser `rejected` o `cancelled`.

## 14. Alertas

`alerts.html`

`GET /api/admin/alerts?status=open&type=&page=`

Filtro de tipo:

| `type` | Cuándo aparece |
|--------|----------------|
| `pending_driver` | Alguien pidió ser conductor desde la app |
| `driver_inactive` | Se desactivó o suspendió un conductor |
| `vehicle_out_of_service` | Vehículo fuera de servicio o bloqueado |
| `emergency` | SOS de la app. Trae `lat`, `lng` y `note`. No llama a la policía |
| `gateway_failed` | El webhook rechazó o canceló un cobro |

Cada fila: tipo, mensaje, fecha, nota y enlaces al viaje, conductor o vehículo si vienen los ids.

Resolver: `POST /api/admin/alerts/{id}/resolve`

```json
{ "note": "Ya hablé con el conductor" }
```

Un SOS resuelto solo cambia la alerta. No hay otra integración.

## 15. Chats

`chats.html`

`GET /api/admin/conversations?tripId=&passengerId=&driverId=&status=&q=&page=`

`q` busca por código de viaje. La tabla muestra código, pasajero, conductor, estado (`open` / `closed`) y fecha.

`chat.html?id=`

`GET /api/admin/conversations/{id}/messages?limit=50&before=`

Burbujas de solo lectura. `senderRole` es `passenger` o `driver`. Tipos:

- `text`: `body`
- `image`: la imagen con el token en el query, como dice la sección 3
- `location`: texto con `label` y un enlace a OpenStreetMap `https://www.openstreetmap.org/?mlat={lat}&mlon={lng}`

Para cargar mensajes más viejos, pide `before` con el `createdAt` del primer mensaje visible.

Cerrar: `POST /api/admin/conversations/{id}/close`. No borra el historial. Después la app no puede escribir. Oculta el botón si ya está `closed`.

## 16. Errores que conviene traducir

| `errorCode` | Qué mostrar |
|-------------|-------------|
| `UNAUTHORIZED` | La sesión venció. El `api.js` intenta refrescar antes de mostrar esto |
| `FORBIDDEN` | No tienes permiso |
| `VALIDATION` | Usa el `msg` del servidor: ya dice el campo |
| `CONFLICT` | Ese dato ya existe |
| `NOT_FOUND` | No se encontró el registro |
| `INVALID_STATE` | La acción ya no aplica. Vuelve a cargar la ficha |
| `DB_UNAVAILABLE` | No hay conexión con la base |

## 17. Vacío y carga

Cada lista tiene tres estados: cargando, vacío (“No hay resultados”) y la tabla. Un formulario deshabilita el botón mientras la petición está en curso para no crear dos conductores con un doble clic.

No pagines en el navegador con todos los registros descargados. Usa `page` y `total`.

## 18. Fuera de este panel

- Segundo rol o panel de empresa.
- Subir fotos de documentos del conductor.
- Cobrar o reembolsar en un proveedor real.
- Pagar la comisión en efectivo que el conductor debe.
- Exportar a Excel. Si más adelante se necesita, se arma con las mismas respuestas, sin una ruta nueva.
