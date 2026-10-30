# Etapa 1 — Análisis y factibilidad

**En esta página:** problema y objetivos · contexto y actores · fuentes de alertas · factibilidades y límites.

En esta etapa se define para quién se construye AEGIS Urban, qué problema resuelve, qué información necesita y qué riesgos o dependencias condicionan su uso.

## 1.1 Problema y objetivos

La información sobre amenazas urbanas puede estar repartida entre sensores, tableros internos y canales de organismos distintos. Una vista común puede ayudar a localizar eventos y coordinar tareas, pero un prototipo técnico no sustituye la confirmación ni las instrucciones de una autoridad de emergencia.

**Objetivo general.** Construir una aplicación web que reúna telemetría, alertas y herramientas de ejercicio para apoyar la observación y coordinación operativa en la ciudad.

**Objetivos específicos.**

- Mostrar la condición, última lectura y ubicación de sensores.
- Consultar alertas por estado, severidad, período y zona.
- Conservar responsables y marcas de tiempo de acciones operativas.
- Ensayar eventos con escenarios reproducibles y sensores simulados.
- Preparar una futura vista ciudadana que distribuya avisos de fuentes oficiales identificadas.

## 1.2 Contexto y actores

| Actor | Casos de uso |
|---|---|
| Operador | Iniciar/cerrar sesión, revisar mapa y telemetría, consultar alertas |
| Defensa Civil | Reconocer una alerta, solicitar cálculo de evacuación, ejecutar simulación |
| Auditor | Consultar actividad y verificar integridad de la bitácora |
| Administrador | Gestionar usuarios, familias de permisos, sensores y nodos urbanos |
| Simulador | Emitir una lectura marcada como simulada y activar reglas de alerta |

El flujo de información se representa en [img/01_contexto.svg](img/01_contexto.svg). Los actores operativos tienen permisos distintos; un futuro lector ciudadano sería de consulta y suscripciones geográficas, no un rol de operación.

## 1.3 Fuentes de alertas e investigación

AEGIS puede recibir detecciones de sensores y, en una etapa futura, importar avisos oficiales de APIs municipales o nacionales. Cada alerta debe preservar el emisor, su hora de emisión y vigencia, área afectada, enlace de origen y cualquier actualización o cancelación.

Common Alerting Protocol (CAP) ofrece un formato interoperable para comunicar emisor, urgencia, severidad, certeza, período y área geográfica. Cuando una autoridad no publica CAP, conviene sumar un adaptador dedicado y normalizar el aviso al modelo interno sin ocultar su fuente.

La ciudadanía debería poder consultar información pública sin cuenta y suscribirse voluntariamente a avisos por área o tipo de amenaza. Las notificaciones no reemplazan los permisos: describen quién recibe un aviso; los roles determinan quién puede modificar el estado operativo.

**Estado actual:** no hay una API oficial conectada ni una vista pública desplegada. Los datos sintéticos y observaciones de sensores deben identificarse como tales y no presentarse como instrucciones oficiales.

## 1.4 Factibilidades, límites y alcance

El prototipo es técnicamente viable con la arquitectura web y PostgreSQL existentes. La operación pública depende de acuerdos y disponibilidad de fuentes autorizadas, validación de áreas y protocolos, y responsable institucional para corregir o retirar avisos. Esos componentes no se presumen disponibles.

Quedan fuera del alcance actual el despacho de equipos de emergencia, el cálculo certificado de rutas, las comunicaciones de emergencia y la integración oficial con organismos. El flujo de trabajo se detalla en [Etapa 3](04-etapa-3-implementacion.md) y la preparación de operación en [Etapa 4](05-etapa-4-release.md).

[← Introducción](01-introduccion.md) · [Índice](README.md) · [Etapa 2 — Diseño y arquitectura →](03-etapa-2-diseno.md)
