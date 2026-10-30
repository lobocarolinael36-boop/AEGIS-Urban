# Etapa 3 — Implementación y testing

**En esta página:** entorno, módulos implementados, evidencia de pruebas y puesta en marcha.

En esta etapa el diseño se lleva a código. El estado se describe según el repositorio actual; una migración escrita pero no aplicada no se considera disponible en la base local.

## 3.1 Estructura del proyecto

```text
AEGIS-Urban-master/
├── aegis-urban-backend/
│   ├── database/migrations/    # Cambios SQL numerados
│   ├── database/seeds/         # Datos iniciales y de ejemplo
│   ├── scripts/                # crear-env.js: genera el .env con secretos aleatorios
│   ├── src/modules/            # Autenticación y registro, alertas, sensores, admin, simulación, public
│   ├── src/core/geo/           # Cálculo de cercanía a zonas de riesgo
│   ├── src/config/legal.ts     # Versiones vigentes de los textos legales
│   ├── src/security/           # Autorización por familia
│   └── tests/                  # Pruebas automatizadas
├── aegis-urban-frontend/
│   └── src/
│       ├── pages/              # Panel, mapa, sensores, alertas, ejercicios, admin, ciudadano, registro y legales
│       ├── components/         # Layout y cartel de peligro
│       ├── legal/              # Textos de Términos y Privacidad (versionados)
│       └── store/              # Sesión y consentimiento de ubicación
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
- **Vista ciudadana** sin cuenta: clima y calidad del aire reales (Open-Meteo), avisos marcados REAL/SIMULADO, mapa de zonas y modo prueba.
- **Alerta por ubicación** con cartel de zona peligrosa, dirección para alejarse, vibración y notificaciones del navegador.
- **Registro de ciudadanos** con aceptación obligatoria de Términos, Privacidad y edad; ubicación opcional y revocable; evidencia versionada de cada consentimiento.
- **Derechos del titular**: descarga de los datos propios y baja con anonimización.
- Rol `CIUDADANO` de solo lectura, sin acceso a pantallas ni endpoints de gestión.
- Rediseño visual "cian neón + vidrio" con fondo de grilla y mapa oscuro.

Los escenarios se ejecutan en temporizadores del proceso Node. Un cierre ordenado marca los ejercicios activos como abortados; para despliegues multiinstancia o recuperación tras una caída abrupta se requiere un worker persistente.

## 3.3 Pruebas y compilación

La suite automatizada cubre cálculo de integridad, matriz de autorización por familia, cálculo de cercanía a zonas de riesgo, avisos derivados del clima y validación del registro con sus consentimientos.

| Verificación | Resultado registrado |
|---|---|
| Pruebas backend | 47 pruebas aprobadas en 5 suites |
| Pruebas frontend | 3 pruebas aprobadas (almacén de sesión) |
| Compilación TypeScript backend | Aprobada |
| Compilación TypeScript y bundle frontend | Aprobada |
| Pruebas conectadas a PostgreSQL real | Pendientes |
| Pruebas de aceptación con operadores y ciudadanía | Pendientes |

Las pruebas de roles actuales simulan las respuestas de la capa de datos. Antes de un release hay que complementar con pruebas de integración sobre la configuración de permisos aplicada en PostgreSQL.

## 3.4 Migraciones y puesta en marcha

El esquema se versiona en `aegis-urban-backend/database/migrations/`. Las migraciones 006 a 012 son repetibles y se aplican en orden. La `010_configurable_scenarios.sql` amplía los tipos de escenario y sus permisos; la `012_citizen_role.sql` agrega el rol `CIUDADANO`, la tabla `user_consent` y la columna `users.terms_verified_at`.

`arrancar.bat` (Windows) reutiliza el contenedor `aegis_postgres` si ya existe, aplica las migraciones 006–012, carga los datos iniciales, genera el `.env` si falta y abre backend y frontend.

Docker Compose monta las migraciones en la inicialización de un volumen vacío; no vuelve a ejecutarlas en un volumen ya creado. Confirmar la migración aplicada antes de probar filtros y escenarios. Configuración, secretos y comandos de desarrollo están en el [README principal](../../README.md).

[← Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md) · [Índice](README.md) · [Etapa 4 — Release y mantenimiento →](05-etapa-4-release.md)
