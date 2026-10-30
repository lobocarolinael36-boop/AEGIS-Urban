# Anexos

Los anexos complementan las etapas con decisiones de producto, contratos técnicos, vocabulario común, backlog y marco legal.

## Anexo A — Decisión de producto: roles y alertas públicas

AEGIS debería combinar consulta pública y control operativo por roles. Una persona debe poder ver avisos públicos sin crear una cuenta; suscribirse a notificaciones por área o amenaza debería ser opcional. Los roles siguen controlando quién reconoce, escala, configura o cierra incidentes. Los roles y las notificaciones responden preguntas distintas.

| Clase de información | Qué debe mostrar | Quién la modifica |
|---|---|---|
| Aviso oficial | Organismo emisor, hora, vigencia, zona, severidad, estado y fuente original | Adaptador de una fuente autorizada; cambios de operación bajo permisos institucionales |
| Observación de sensor | Ubicación, lectura, hora y etiqueta de dato automático no confirmado | Sistema de telemetría y personal operativo autorizado |
| Ejercicio simulado | Marca persistente de simulación, sensores y duración | Familias habilitadas para ejercicios |

Conviene priorizar APIs oficiales que publiquen Common Alerting Protocol (CAP), conservando emisor, severidad, certeza, área, vigencia, actualizaciones y cancelaciones. Si la fuente no ofrece CAP, un adaptador específico debe normalizar sus datos sin borrar el origen. Referencias: [OASIS CAP v1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html), [sistema de alerta temprana de UNDRR](https://www.undrr.org/terminology/early-warning-system) y [SINAGIR](https://www.argentina.gob.ar/sinagir).

**Estado:** existe una vista pública (`/ciudadano`) que combina el clima real de Open-Meteo con avisos de sensores simulados, siempre etiquetados. Todavía no hay un conector de APIs oficiales (CAP). Los datos del prototipo no deben confundirse con instrucciones oficiales.

## Anexo B — Contratos de API

### Alertas

`GET /api/alertas?page=1&pageSize=20&zonaId=3&desde=2026-10-01&hasta=2026-10-28&estado=ACTIVE&nivel=CRITICAL&busqueda=lluvia`

`pageSize` admite de 1 a 100. `zonaId` filtra también sus descendientes. La respuesta contiene `alertas` y `paginacion` (`page`, `pageSize`, `total`, `totalPages`). Las opciones geográficas se consultan en `GET /api/alertas/zonas`.

### Públicos y de cuenta ciudadana

Los endpoints `/api/publico/*` no requieren sesión, limitan a 60 solicitudes por minuto por IP y no exponen usuarios ni bitácora.

| Método y ruta | Descripción |
|---|---|
| `GET /api/publico/clima?lat&lon` | Clima y calidad del aire (Open-Meteo, caché de 10 min). Sin coordenadas usa Buenos Aires |
| `GET /api/publico/avisos?lat&lon` | Avisos reales del clima más avisos simulados de las últimas 6 horas |
| `GET /api/publico/zonas` | Zonas de riesgo vigentes con centro, radio y severidad |
| `POST /api/publico/riesgo` | Recibe `{lat, lon}` en el cuerpo y devuelve `SEGURO`, `PRECAUCION` o `PELIGRO` con zona, distancia y dirección. Es POST para que la ubicación exacta no quede en los logs |
| `GET /api/auth/legal` | Versiones vigentes de los textos legales |
| `POST /api/auth/registro` | Alta de ciudadano. Exige `aceptaTerminos`, `aceptaPrivacidad`, `declaraEdad` y las versiones leídas; `aceptaUbicacion` es opcional |
| `PUT /api/auth/consentimiento-ubicacion` | Otorga o revoca el permiso de ubicación (`{acepta}`) |
| `GET /api/auth/mis-datos` | Derecho de acceso: perfil e historial de consentimientos |
| `DELETE /api/auth/mis-datos` | Derecho de supresión: baja y anonimización de la cuenta |

### Escenarios

- `GET /api/simulation/scenarios`: devuelve los últimos 100 ejercicios.
- `POST /api/simulation/scenarios`: recibe `name`, `sensorIds`, `intensidad` (`NORMAL`, `WARNING`, `CRITICAL`), `intervaloSegundos` (5–300) y `duracionMinutos` (1–240).
- `POST /api/simulation/scenarios/:id/iniciar`: inicia un ejercicio en borrador.
- `DELETE /api/simulation/scenarios/:id`: detiene un ejercicio activo.

Sólo se aceptan sensores marcados como simulados. El scheduler actual opera en memoria del proceso Node y no está preparado para múltiples instancias ni recuperación automática después de una caída abrupta.

## Anexo C — Glosario

| Término | Significado |
|---|---|
| Telemetría | Lectura con valor, unidad, sensor y hora |
| Sensor simulado | Fuente sintética usada para un ejercicio |
| Reconocer | Confirmar recepción de una alerta, sin resolverla |
| Plan de evacuación | Cálculo que requiere revisión humana; no es instrucción oficial |
| CAP | Formato interoperable para intercambio de alertas públicas |
| DVH | Huella criptográfica de una fila de bitácora |
| DVV | Huella encadenada que ayuda a detectar alteraciones en la secuencia |
| Familia / patente | Agrupación de roles y permiso atómico del modelo de autorización |
| Zona de riesgo | Círculo (centro y radio) derivado de una alerta vigente; el radio depende de la severidad |
| Consentimiento | Aceptación expresa, versionada y registrada de un texto legal o del uso de la ubicación |
| AAIP | Agencia de Acceso a la Información Pública, autoridad de control de la Ley 25.326 |

## Anexo D — Backlog priorizado

| Prioridad | Trabajo pendiente | Criterio de cierre |
|---|---|---|
| P0 | Revisión legal de Términos, Privacidad y consentimiento de ubicación | Un profesional valida los textos antes de un uso con público real |
| P0 | Verificar las migraciones 010–012 en cada base existente | Los filtros, escenarios, rol ciudadano y consentimientos operan contra la base |
| P0 | Pruebas de integración de rol/ruta con PostgreSQL | Matriz permitida/denegada verificada para cada familia y operación sensible |
| P0 | Validar cálculos de rutas, población y protocolos | Aprobación de responsables técnicos y organismos competentes antes de uso operativo |
| P1 | Suscripción por zona y avisos con la app cerrada (PWA) | Notificaciones push probadas en dispositivos móviles |
| P1 | Zonas de riesgo como polígonos en lugar de círculos | Cálculo con geometría real de cada zona |
| P1 | Integración con una API oficial de la ciudad/organismo | Adaptador, actualización, cancelación, expiración y manejo de fallas probados |
| P1 | Filtros de mapa y paginación de bitácora | Consulta útil con volumen de datos representativo y permisos revisados |
| P1 | Scheduler persistente de ejercicios | Recuperación tras reinicio y coordinación segura entre instancias |
| P2 | Pruebas de accesibilidad y aceptación ciudadana | Flujos críticos revisados con usuarios, teclado y dispositivos móviles |

## Anexo E — Marco legal y consentimientos

El texto completo está en la aplicación: [Términos y Condiciones](../../aegis-urban-frontend/src/legal/textos.ts) y Política de Privacidad (rutas `/terminos` y `/privacidad`). Son un texto base del prototipo y **requieren revisión de un profesional** antes de un uso real.

| Principio (Ley 25.326 y Decreto 1558/2001) | Cómo se aplica |
|---|---|
| Consentimiento libre, expreso e informado (art. 5) | Casillas sin marcar de antemano; los textos se leen antes de aceptar; la ubicación se pide aparte |
| Calidad y minimización de datos (art. 4) | Solo usuario, correo y contraseña; sin DNI, teléfono ni nombre |
| Seguridad de los datos (art. 9) | Contraseñas con BCrypt, sesiones revocables, control de acceso por rol y bitácora íntegra |
| Derecho de acceso (art. 14) | `GET /api/auth/mis-datos` y botón «Descargar mis datos» |
| Rectificación y supresión (art. 16) | `DELETE /api/auth/mis-datos`: la cuenta se desactiva y se anonimiza |
| Control | Reclamos ante la AAIP (www.argentina.gob.ar/aaip), indicada en la Política de Privacidad |

**Evidencia.** Cada consentimiento se guarda en `user_consent` con tipo (`TERMS`, `PRIVACY`, `AGE`, `LOCATION`), versión del texto, si fue otorgado, fecha e IP. Al cambiar un texto se sube su versión (`backend/src/config/legal.ts` y `frontend/src/legal/textos.ts`) y el servidor rechaza registros hechos con una versión vieja. El perfil queda verificado (`terms_verified_at`) al aceptar.

**Ubicación.** Las coordenadas exactas viajan por POST, se usan para un único cálculo y no se guardan ni se asocian a la cuenta. Para el clima se envía una posición aproximada (~1 km) a Open-Meteo. El permiso se puede revocar desde la aplicación.

[← Etapa 4 — Release, operación y mantenimiento](05-etapa-4-release.md) · [Índice](README.md)
