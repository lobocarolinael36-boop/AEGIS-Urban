# Etapa 4 — Release, operación y mantenimiento

**En esta página:** aceptación, puesta en marcha, vuelta atrás, manuales, mantenimiento y trabajo futuro.

Esta etapa define cómo comprobar el producto y qué falta antes de exponerlo a una operación real. El prototipo no es un canal oficial de protección civil.

## 4.1 Release

Las funciones de filtros, escenarios, autorización y modo ciudadano se entregan como cambios de software más las migraciones `010` a `012`. En una base existente, respaldar y aplicarlas en orden antes de habilitar esos flujos (`arrancar.bat` lo hace en desarrollo).

**Lista de control:** compilación backend/frontend aprobada; suite automatizada aprobada; migraciones comprobadas; roles revisados; sensores sintéticos identificados; y respaldo con restauración verificada.

## 4.2 Pruebas de aceptación con usuarios

| Escenario | Rol | Criterio de aceptación | Resultado |
|---|---|---|---|
| Consultar y filtrar alertas por zona y período | Tránsito | Resultados respetan filtros y paginación; no habilitan acciones de respuesta | Pendiente |
| Reconocer, iniciar plan y resolver una alerta | Defensa Civil | Cada transición muestra el estado correcto y queda en bitácora | Pendiente |
| Crear ejercicio con sensores simulados y detenerlo | Defensa Civil | Sólo afecta sensores simulados; registra configuración y eventos | Pendiente de probar con migración aplicada |
| Revisar la bitácora | Auditoría | Puede consultar y verificar integridad, sin modificar el estado de alertas | Pendiente |
| Ver clima y avisos sin cuenta | Ciudadano | Muestra clima real y avisos con su origen (REAL/SIMULADO), sin pedir datos | Implementado; pendiente con usuarios |
| Registrarse aceptando términos, privacidad y edad | Ciudadano | El registro se rechaza si falta alguno; la ubicación es opcional; queda la evidencia | Verificado por API |
| Estar dentro de una zona de peligro | Ciudadano | Cartel con dirección para alejarse; precaución cerca del borde | Verificado en modo prueba; GPS real pendiente |
| Revocar la ubicación, descargar datos y darse de baja | Ciudadano | Los datos se exportan y la baja anonimiza la cuenta | Verificado por API |
| Consultar un aviso oficial de un organismo | Ciudadano | Requiere un conector oficial (CAP) | Fuera del prototipo |

## 4.3 Plan de reversión

Antes de una migración, generar respaldo verificado. Si la API nueva falla, volver a la versión previa y deshabilitar las rutas que dependan de la migración. No borrar escenarios ni eventos creados para intentar revertir una migración. La reversión del esquema debe prepararse y revisarse por separado, preservando auditoría.

## 4.4 Manuales

- **Operador:** consultar mapa y sensores, filtrar alertas, reconocer incidentes y registrar acciones según procedimientos de la organización.
- **Defensa Civil:** revisar un plan antes de actuar; usar la pantalla de escenarios sólo para ejercicios.
- **Administrador:** aplicar migraciones en orden, revisar familias y permisos, administrar secretos y ejecutar respaldos.
- **Ciudadano:** la vista pública explica el origen de cada aviso (real o simulado) y recuerda los canales oficiales (911, 100, 103). Desde la cuenta se puede revocar la ubicación, descargar los datos y darse de baja.

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

El incremento agrega el modo ciudadano con clima real, alerta por ubicación y registro con consentimientos legales, además de la gestión de filtros y ejercicios. AEGIS usa Open-Meteo para el clima, pero no está conectado a APIs oficiales de alerta y no debe presentarse como fuente de instrucciones de emergencia.

Prioridades siguientes: **revisión legal de los textos por un profesional**; integrar una fuente oficial autorizada; suscripciones por zona y avisos con la app cerrada (PWA); agregar pruebas de integración contra la base; completar filtros del mapa y bitácora; preparar un worker persistente; y validar accesibilidad y aceptación con usuarios.

[← Etapa 3 — Implementación y testing](04-etapa-3-implementacion.md) · [Índice](README.md) · [Anexos →](06-anexos.md)
