# 1. Introducción y alcance

[← Portada](00-portada.md) · [Índice](README.md) · [Etapa 1 — Análisis y factibilidad →](02-etapa-1-analisis.md)

## 1.1 Resumen

AEGIS Urban centraliza lecturas de sensores urbanos para inundaciones, incendios, viento y amenazas relacionadas. El personal autorizado puede observar el estado de la red, revisar alertas, ejecutar escenarios simulados y consultar planes de evacuación.

## 1.2 Problema y objetivos

La información de riesgos, ubicaciones y lecturas puede quedar dispersa entre sistemas y personas. El prototipo busca ofrecer una vista operativa común, dejar rastro de acciones relevantes y permitir ensayar respuestas sin depender de hardware real.

Objetivos:

- Mostrar qué sensores están normales, en advertencia o en estado crítico.
- Ubicar sensores y eventos en un mapa y recibir cambios en tiempo real.
- Dar seguimiento al ciclo de vida de una alerta y consultar el plan asociado.
- Ejecutar simulaciones identificadas como tales para ensayar flujos.
- Registrar acciones relevantes con controles de integridad y permisos.

## 1.3 Usuarios

| Actor | Necesidad principal |
|---|---|
| Operador de Tránsito | Observar el mapa, sensores y alertas pertinentes a su tarea |
| Operador de Defensa Civil | Reconocer alertas, coordinar respuesta y revisar evacuaciones |
| Auditor | Consultar la bitácora y verificar su integridad |
| Administrador | Gestionar usuarios, sensores, estructura geográfica y permisos |
| Motor de simulación | Generar telemetría marcada como simulada para ejercicios |
| Ciudadanía (visión futura) | Consultar avisos oficiales por área y suscribirse a notificaciones sin necesitar permisos operativos |

Los roles y permisos concretos deben corresponder a las familias configuradas en base de datos. La consulta pública futura no reemplaza la autorización operativa: la ciudadanía no recibe permisos para reconocer, administrar o cerrar alertas.

## 1.4 Alcance del producto

Incluye panel operativo, mapa, listado de sensores, alertas, autenticación, administración del prototipo, filtros con paginación de servidor y escenarios configurables sobre sensores simulados. El backend expone rutas de autenticación, sensores, telemetría, alertas, administración y simulación; ver [Etapa 3](04-etapa-3-implementacion.md).

Fuera del alcance confirmado: despacho oficial de servicios de emergencia, navegación peatonal validada, integración con organismos externos, operación de hardware certificado y garantía de seguridad de personas. Las rutas e instrucciones simuladas son demostrativas y requieren validación profesional antes de cualquier uso real.

## 1.5 Supuestos y restricciones

- El prototipo usa PostgreSQL y servicios Node.js/React desplegados con Docker Compose.
- La conectividad de Socket.IO depende de API y red disponibles; la interfaz debe distinguir datos en vivo de datos desactualizados.
- La ciudad y sus sensores de ejemplo no representan cobertura real.
- Sólo personal con permisos debe acceder a datos operativos y administración.

[← Portada](00-portada.md) · [Índice](README.md) · [Etapa 1 — Análisis y factibilidad →](02-etapa-1-analisis.md)
