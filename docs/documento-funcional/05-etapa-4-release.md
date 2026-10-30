# Etapa 4 — Release, operación y mantenimiento

**En esta página:** aceptación, puesta en marcha, vuelta atrás, manuales, mantenimiento y trabajo futuro.

Esta etapa define cómo comprobar el producto y qué falta antes de exponerlo a una operación real. El prototipo no es un canal oficial de protección civil.

## 4.1 Release

Las nuevas funciones de filtros, escenarios y autorización se entregan como cambios de software más la migración `010_configurable_scenarios.sql`. En una base existente, respaldar y aplicar esa migración en orden antes de habilitar esos flujos.

**Lista de control:** compilación backend/frontend aprobada; suite automatizada aprobada; migraciones comprobadas; roles revisados; sensores sintéticos identificados; y respaldo con restauración verificada.

## 4.2 Pruebas de aceptación con usuarios

| Escenario | Rol | Criterio de aceptación | Resultado |
|---|---|---|---|
| Consultar y filtrar alertas por zona y período | Tránsito | Resultados respetan filtros y paginación; no habilitan acciones de respuesta | Pendiente |
| Reconocer, iniciar plan y resolver una alerta | Defensa Civil | Cada transición muestra el estado correcto y queda en bitácora | Pendiente |
| Crear ejercicio con sensores simulados y detenerlo | Defensa Civil | Sólo afecta sensores simulados; registra configuración y eventos | Pendiente de probar con migración aplicada |
| Revisar la bitácora | Auditoría | Puede consultar y verificar integridad, sin modificar el estado de alertas | Pendiente |
| Consultar aviso oficial y elegir zonas | Ciudadanía | Flujo futuro; muestra emisor y vigencia sin requerir cuenta | Fuera del prototipo |

## 4.3 Plan de reversión

Antes de una migración, generar respaldo verificado. Si la API nueva falla, volver a la versión previa y deshabilitar las rutas que dependan de la migración. No borrar escenarios ni eventos creados para intentar revertir una migración. La reversión del esquema debe prepararse y revisarse por separado, preservando auditoría.

## 4.4 Manuales

- **Operador:** consultar mapa y sensores, filtrar alertas, reconocer incidentes y registrar acciones según procedimientos de la organización.
- **Defensa Civil:** revisar un plan antes de actuar; usar la pantalla de escenarios sólo para ejercicios.
- **Administrador:** aplicar migraciones en orden, revisar familias y permisos, administrar secretos y ejecutar respaldos.
- **Ciudadanía (futuro):** la guía deberá explicar fuentes, vigencia, zonas de interés y canales oficiales de emergencia.

## 4.5 Plan de mantenimiento

- Revisar disponibilidad de API, base, WebSocket y retraso de telemetría.
- Aplicar migraciones versionadas y conservar evidencia de resultado.
- Verificar respaldo, restauración, espacio de particiones y bitácora.
- Revisar permisos por familia y revocar accesos innecesarios.
- Para operar ejercicios de forma continua, reemplazar temporizadores en memoria por un worker persistente con recuperación y exclusión entre instancias.
- Antes de alertas públicas, probar actualización, cancelación, expiración y falla de cada fuente externa.

## 4.6 Anexos

Los contratos de endpoints, criterios de producto y glosario están en [Anexos](06-anexos.md).

## 4.7 Cierre y trabajo futuro

El incremento deja lista la gestión de filtros y ejercicios en el código, con pruebas básicas por rol. La base local aún requiere aplicar la migración 010. AEGIS no está conectado a APIs oficiales y no debe presentarse como fuente de instrucciones de emergencia.

Prioridades siguientes: integrar una fuente oficial autorizada; construir una vista pública y suscripciones por zona; agregar pruebas de integración contra la base; completar filtros del mapa y bitácora; preparar un worker persistente; y validar accesibilidad y aceptación con usuarios.

[← Etapa 3 — Implementación y testing](04-etapa-3-implementacion.md) · [Índice](README.md) · [Anexos →](06-anexos.md)
