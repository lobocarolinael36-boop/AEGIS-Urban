# Documentación de AEGIS Urban

AEGIS Urban es una plataforma de apoyo a operaciones municipales ante amenazas climáticas. Reúne telemetría de sensores, alertas, mapa, simulación y planificación de evacuaciones.

## Documento funcional

El documento funcional sigue la misma estructura por etapas que la referencia de RestoBA. El índice está en [documento-funcional/README.md](documento-funcional/README.md); las páginas tienen navegación anterior/siguiente, y los diagramas están en la carpeta `img/`.

| Etapa | Página | Contenido |
|---|---|---|
| 0 | [Portada y equipo](documento-funcional/00-portada.md) | Identificación, propósito y convenciones |
| 1 | [Introducción, resumen ejecutivo y alcance](documento-funcional/01-introduccion.md) | Contexto, objetivos, usuarios, alcance y límites |
| 2 | [Etapa 1 — Análisis y factibilidad](documento-funcional/02-etapa-1-analisis.md) | Problema, actores, fuentes de alertas, factibilidad y alcance |
| 3 | [Etapa 2 — Diseño y arquitectura](documento-funcional/03-etapa-2-diseno.md) | Arquitectura, datos, requerimientos, roles y seguridad |
| 4 | [Etapa 3 — Implementación y testing](documento-funcional/04-etapa-3-implementacion.md) | Estructura, funcionalidades, pruebas y migraciones |
| 5 | [Etapa 4 — Release, operación y mantenimiento](documento-funcional/05-etapa-4-release.md) | Aceptación, reversión, operación y mantenimiento |
| 6 | [Anexos](documento-funcional/06-anexos.md) | Decisión pública/roles, contratos de API y backlog |

La versión Word consolidada está en [Documento_Funcional_AEGIS_Urban.docx](documento-funcional/Documento_Funcional_AEGIS_Urban.docx). Los diagramas SVG están en [documento-funcional/img/](documento-funcional/img/).

La arquitectura detallada y el análisis original se conservan en [01-arquitectura.md](01-arquitectura.md) y [02-analisis-diseno.md](02-analisis-diseno.md); esta guía los ordena y añade trazabilidad funcional.

## Datos y código

- [Backend y migraciones](../aegis-urban-backend/): API, lógica de dominio y esquema SQL versionado.
- [Frontend](../aegis-urban-frontend/): interfaz React por páginas y componentes.
- Las migraciones de `aegis-urban-backend/database/migrations/` son la fuente de verdad del esquema. Una migración aplicada se conserva; los cambios futuros se agregan con un nuevo número.
- [README del proyecto](../README.md): requisitos, arranque local, variables y comandos.

## Convención de estado

Cada capacidad se marca como **implementada**, **parcial** o **propuesta** según los archivos presentes en este repositorio. Un requerimiento documentado no implica por sí solo que esté implementado ni validado.
