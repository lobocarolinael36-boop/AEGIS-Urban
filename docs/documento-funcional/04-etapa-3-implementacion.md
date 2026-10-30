# Etapa 3 — Implementación y testing

**En esta página:** entorno, módulos implementados, evidencia de pruebas y puesta en marcha.

En esta etapa el diseño se lleva a código. El estado se describe según el repositorio actual; una migración escrita pero no aplicada no se considera disponible en la base local.

## 3.1 Estructura del proyecto

```text
AEGIS-Urban-master/
├── aegis-urban-backend/
│   ├── database/migrations/    # Cambios SQL numerados
│   ├── database/seeds/         # Datos iniciales y de ejemplo
│   ├── src/modules/            # Autenticación, alertas, sensores, admin, simulación
│   ├── src/security/           # Autorización por familia
│   └── tests/                  # Pruebas automatizadas
├── aegis-urban-frontend/
│   └── src/pages/              # Panel, mapa, sensores, alertas, ejercicios y admin
├── docs/documento-funcional/   # Etapas y anexos del documento
└── docker-compose.yml
```

## 3.2 Funcionalidades implementadas

- Inicio de sesión, control de permisos en endpoints y autorización de conexiones WebSocket.
- Panel de estado, telemetría, mapa y detalle de sensores.
- Ciclo de alertas con reconocimiento, generación de plan y resolución explícita.
- Búsqueda de alertas por zona y subzonas, fechas, estado, severidad y texto; resultados paginados desde PostgreSQL.
- Escenarios con sensores simulados seleccionados, intensidad, duración e intervalo; registro de eventos y controles de inicio/detención.
- Bitácora con integridad DVH/DVV.
- Interfaz responsive con estados de error y reintento en flujos principales.

Los escenarios se ejecutan en temporizadores del proceso Node. Un cierre ordenado marca los ejercicios activos como abortados; para despliegues multiinstancia o recuperación tras una caída abrupta se requiere un worker persistente.

## 3.3 Pruebas y compilación

La suite automatizada cubre cálculo de integridad y una matriz básica de autorización por familia.

| Verificación | Resultado registrado |
|---|---|
| Pruebas backend | 17 pruebas aprobadas en 2 suites |
| Compilación TypeScript backend | Aprobada |
| Compilación TypeScript y bundle frontend | Aprobada |
| Pruebas conectadas a PostgreSQL real | Pendientes |
| Pruebas de aceptación con operadores y ciudadanía | Pendientes |

Las pruebas de roles actuales simulan las respuestas de la capa de datos. Antes de un release hay que complementar con pruebas de integración sobre la configuración de permisos aplicada en PostgreSQL.

## 3.4 Migraciones y puesta en marcha

El esquema se versiona en `aegis-urban-backend/database/migrations/`. La migración `010_configurable_scenarios.sql` amplía los tipos de escenario y registra permisos para listar, crear, iniciar y detener ejercicios. Debe aplicarse después de la 009 en las bases existentes.

Docker Compose monta las migraciones en la inicialización de un volumen vacío; no vuelve a ejecutarlas en un volumen ya creado. Confirmar la migración aplicada antes de probar filtros y escenarios. Configuración, secretos y comandos de desarrollo están en el [README principal](../../README.md).

[← Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md) · [Índice](README.md) · [Etapa 4 — Release y mantenimiento →](05-etapa-4-release.md)
