# Anexos

Los anexos complementan las etapas con decisiones de producto, contratos técnicos y vocabulario común.

## Anexo A — Decisión de producto: roles y alertas públicas

AEGIS debería combinar consulta pública y control operativo por roles. Una persona debe poder ver avisos públicos sin crear una cuenta; suscribirse a notificaciones por área o amenaza debería ser opcional. Los roles siguen controlando quién reconoce, escala, configura o cierra incidentes. Los roles y las notificaciones responden preguntas distintas.

| Clase de información | Qué debe mostrar | Quién la modifica |
|---|---|---|
| Aviso oficial | Organismo emisor, hora, vigencia, zona, severidad, estado y fuente original | Adaptador de una fuente autorizada; cambios de operación bajo permisos institucionales |
| Observación de sensor | Ubicación, lectura, hora y etiqueta de dato automático no confirmado | Sistema de telemetría y personal operativo autorizado |
| Ejercicio simulado | Marca persistente de simulación, sensores y duración | Familias habilitadas para ejercicios |

Conviene priorizar APIs oficiales que publiquen Common Alerting Protocol (CAP), conservando emisor, severidad, certeza, área, vigencia, actualizaciones y cancelaciones. Si la fuente no ofrece CAP, un adaptador específico debe normalizar sus datos sin borrar el origen. Referencias: [OASIS CAP v1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html), [sistema de alerta temprana de UNDRR](https://www.undrr.org/terminology/early-warning-system) y [SINAGIR](https://www.argentina.gob.ar/sinagir).

**Estado:** no existe todavía un conector de APIs oficiales ni una vista pública de AEGIS. Los datos actuales del prototipo no deben confundirse con instrucciones oficiales.

## Anexo B — Contratos de API

### Alertas

`GET /api/alertas?page=1&pageSize=20&zonaId=3&desde=2026-10-01&hasta=2026-10-28&estado=ACTIVE&nivel=CRITICAL&busqueda=lluvia`

`pageSize` admite de 1 a 100. `zonaId` filtra también sus descendientes. La respuesta contiene `alertas` y `paginacion` (`page`, `pageSize`, `total`, `totalPages`). Las opciones geográficas se consultan en `GET /api/alertas/zonas`.

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

## Anexo D — Backlog priorizado

| Prioridad | Trabajo pendiente | Criterio de cierre |
|---|---|---|
| P0 | Aplicar y verificar la migración 010 en la base de desarrollo | Los filtros, escenarios y permisos operan contra la base existente |
| P0 | Pruebas de integración de rol/ruta con PostgreSQL | Matriz permitida/denegada verificada para cada familia y operación sensible |
| P0 | Validar cálculos de rutas, población y protocolos | Aprobación de responsables técnicos y organismos competentes antes de uso operativo |
| P1 | Vista pública y suscripción por zona | Avisos oficiales diferenciados de sensores y ejercicios, con fuente y vigencia |
| P1 | Integración con una API oficial de la ciudad/organismo | Adaptador, actualización, cancelación, expiración y manejo de fallas probados |
| P1 | Filtros de mapa y paginación de bitácora | Consulta útil con volumen de datos representativo y permisos revisados |
| P1 | Scheduler persistente de ejercicios | Recuperación tras reinicio y coordinación segura entre instancias |
| P2 | Pruebas de accesibilidad y aceptación ciudadana | Flujos críticos revisados con usuarios, teclado y dispositivos móviles |

[← Etapa 4 — Release, operación y mantenimiento](05-etapa-4-release.md) · [Índice](README.md)
