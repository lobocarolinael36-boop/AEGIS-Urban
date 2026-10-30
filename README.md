# AEGIS Urban
### Advanced Emergency Geographic Intelligence System

> **Plataforma Web de Orquestación Logística y Alerta Temprana ante Catástrofes Climáticas para Ciudades Inteligentes (Smart Cities)**

**Proyecto:** Trabajo Integrador Final — Prácticas Profesionalizantes  
**Institución:** Escuela Secundaria Técnica | Argentina | 2026  
**Estado:** Prototipo académico en desarrollo; consultar [estado funcional](docs/documento-funcional/04-etapa-3-implementacion.md) y su [índice por etapas](docs/documento-funcional/README.md).

---

## Descripción

AEGIS Urban es un sistema de gestión de emergencias para ciudades inteligentes que permite:

- **Monitoreo en tiempo real** de sensores distribuidos por la ciudad (agua, temperatura, viento, calidad del aire)
- **Detección y gestión de catástrofes** con alertas automáticas via WebSockets
- **Planificación de evacuaciones** con múltiples algoritmos de ruta intercambiables en tiempo de ejecución
- **Motor de Simulación por Software (Mocking Engine)** que inyecta escenarios virtuales de crisis (inundaciones, incendios, cortes de energía) sin necesidad de hardware real
- **Bitácora inmutable** con verificación de integridad criptográfica (DVH + DVV)
- **Control de acceso** por Patentes y Familias usando el patrón Composite

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Lazy Loading nativo, code splitting, ecosistema unificado TS |
| **Backend** | Node.js + TypeScript + Express | Un solo lenguaje en todo el stack, WebSockets nativos |
| **Base de Datos** | PostgreSQL 16 | Particionamiento RANGE nativo, jsonb, índices parciales |
| **Real-time** | socket.io | Implementación del patrón Observer para alertas |
| **Contenedores** | Docker + Docker Compose | Entorno reproducible para todo el equipo |
| **CI/CD** | GitHub Actions | Hay workflows en `.github/`; confirmar estado de cada pipeline |

---

## Equipo de Desarrollo

| # | Rol | Responsabilidad Principal |
|---|---|---|
| I1 | Product Owner & Documentador QA | Carpeta de campo, criterios de aceptación, plan de pruebas |
| I2 | Desarrollador Frontend | React, mapa de ciudad, UI de alertas, i18n |
| I3 | Desarrollador Backend Core | Node.js, patrones de diseño, API REST |
| I4 | Especialista en Seguridad y BD | PostgreSQL, AES/BCrypt, DVH/DVV, backups |
| I5 | Integrador Full-Stack & WebSockets | socket.io, integración frontend-backend, CI/CD, deploy |

---

## Patrones y componentes del dominio

| Patrón | Clase Clave | Ubicación | Propósito |
|---|---|---|---|
| **Factory** | `SensorFactory` | `aegis-urban-backend/src/core/factory/` | Selección de sensores por tipo |
| **Observer** | `EventBus` y handlers | `aegis-urban-backend/src/core/events/` | Propagación de lecturas, alertas y bitácora |
| **Strategy** | `ContextoEvacuacion` y estrategias | `aegis-urban-backend/src/core/strategies/` | Selección de estrategia de evacuación |
| **Composite** | `FamilyComposite` | `aegis-urban-backend/src/core/composite/` | Agrupación de permisos |

---

## Capacidades y componentes

El repositorio contiene autenticación JWT, helpers AES/BCrypt, el modelo Composite de familias/permisos, cálculo DVH/DVV y restricciones de sólo inserción para la bitácora. También incluye particionamiento trimestral de `sensor_reading`, carga diferida de páginas, traducciones base e inyección periódica de lecturas simuladas.

La presencia de estos componentes no garantiza por sí sola su integración completa en todas las rutas o flujos. El backup/restore automatizado, la caché de requests, la ayuda contextual y la pantalla de auditoría siguen pendientes. Ver el [backlog funcional](docs/documento-funcional/06-anexos.md).

---

## Documentación

| Documento | Contenido |
|---|---|
| [📚 Documentación funcional](docs/README.md) | Documento por etapas, requisitos, datos, aceptación y backlog |
| [📁 Arquitectura](docs/01-arquitectura.md) | Carpetas, modelo de datos y decisiones técnicas |
| [📋 Análisis y diseño original](docs/02-analisis-diseno.md) | Casos de uso, diagramas y matriz de permisos |

---

## Planificación de referencia

| Sprint | Fechas | Foco |
|---|---|---|
| Sprint 1 | 19/05 – 30/05/2026 | Fundamentos e Infraestructura |
| Sprint 2 | 02/06 – 13/06/2026 | Seguridad, Auth y DVH/DVV |
| Sprint 3 | 16/06 – 27/06/2026 | Patrones Core y Telemetría Real-time |
| Sprint 4 | 30/06 – 11/07/2026 | UI Ciudad y Motor de Simulación |
| Sprint 5 | 14/07 – 25/07/2026 | Testing, Auditoría y Entrega Final |

---

## Estructura del Repositorio

```
AEGIS-Urban/
├── docs/                        # Documentación del proyecto
│   ├── documento-funcional/     # Análisis, diseño, implementación y release
│   ├── 01-arquitectura.md       # Arquitectura y datos
│   └── 02-analisis-diseno.md    # Análisis original y permisos
├── aegis-urban-backend/
│   ├── database/migrations/     # Cambios versionados del esquema SQL
│   ├── database/seeds/          # Datos iniciales y de ejemplo
│   └── src/                     # API, dominio, seguridad e integridad
├── aegis-urban-frontend/        # páginas, componentes, servicios y estilos
├── docker-compose.yml           # servicios del entorno local
└── README.md
```

---

*AEGIS Urban — Advanced Emergency Geographic Intelligence System*  
*Escuela Técnica Argentina — Prácticas Profesionalizantes 2026*
