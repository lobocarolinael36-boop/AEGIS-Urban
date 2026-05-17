# AEGIS Urban
### Advanced Emergency Geographic Intelligence System

> **Plataforma Web de Orquestación Logística y Alerta Temprana ante Catástrofes Climáticas para Ciudades Inteligentes (Smart Cities)**

**Proyecto:** Trabajo Integrador Final — Prácticas Profesionalizantes  
**Institución:** Escuela Secundaria Técnica | Argentina | 2026  
**Estado:** En desarrollo activo — Sprint 1

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
| **CI/CD** | GitHub Actions | Build y test automático en cada push |

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

## Patrones de Diseño Implementados

| Patrón | Clase Clave | Ubicación | Propósito |
|---|---|---|---|
| **Singleton** | `EmergencyKernel` | `src/core/singleton/` | Núcleo único de despacho del sistema |
| **Factory Method** | `SensorFactory` | `src/core/factory/` | Instancia `FloodSensor`, `FireSensor`, etc. según tipo |
| **Observer** | `EventBus` + `IObserver` | `src/core/observer/` | Propagación de eventos: lectura crítica → alerta → WS |
| **Strategy** | `EvacuationContext` | `src/core/strategy/` | Intercambia algoritmos de ruta en runtime |
| **Composite** | `CityComposite` / `FamilyComposite` | `src/core/composite/` | Jerarquía Ciudad + Control de acceso Patentes/Familias |

---

## Requerimientos de la Cátedra Implementados

- [x] Autenticación por tokens JWT
- [x] Encriptación reversible AES-256-CBC (datos sensibles)
- [x] Encriptación irreversible BCrypt (contraseñas)
- [x] Control de acceso Patentes/Familias (Composite)
- [x] DVH + DVV en tabla `AUDIT_LOG` (integridad criptográfica)
- [x] Bitácora inmutable (sin UPDATE/DELETE permitido)
- [x] Backup automatizado + Restore (pg_dump + node-cron)
- [x] Particionamiento de `SENSOR_READING` por RANGE(fecha)
- [x] Lazy Loading en mapa de ciudad (React.lazy)
- [x] Caché de requests en frontend
- [x] Internacionalización Español / Inglés (i18next)
- [x] Menús de ayuda contextual (HelpTooltip)
- [x] Mocking Engine para simulación de catástrofes

---

## Documentación

| Documento | Contenido |
|---|---|
| [📁 Arquitectura, DER y DVH/DVV](docs/01-arquitectura.md) | Estructura de carpetas backend/frontend, Modelo Entidad-Relación, lógica y código DVH/DVV |
| [📋 Análisis, Diseño y Planificación](docs/02-analisis-diseno.md) | Casos de uso, diagrama de clases, sprints, matriz Patentes/Familias |

---

## Planificación (10 Semanas)

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
│   ├── 01-arquitectura.md       # Arquitectura, DER, DVH/DVV
│   └── 02-analisis-diseno.md   # Casos de uso, clases, sprints, permisos
├── aegis-urban-backend/         # Backend Node.js + TypeScript (Sprint 1→)
├── aegis-urban-frontend/        # Frontend React + TypeScript (Sprint 1→)
└── README.md
```

---

*AEGIS Urban — Advanced Emergency Geographic Intelligence System*  
*Escuela Técnica Argentina — Prácticas Profesionalizantes 2026*
