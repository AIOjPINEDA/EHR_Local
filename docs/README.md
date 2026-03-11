# Documentación Activa

Este índice centraliza la documentación vigente para evitar información dispersa.

## Operación y producto

- `README.md`: quickstart del proyecto y estado general.
- `docs/USER_GUIDE.md`: guía de uso funcional para médicos.
- `docs/release/DEPLOYMENT_GUIDE.md`: pasos de despliegue.
- `docs/release/hapi-baseline-deployment-walkthrough.md`: guía pedagógica para arrancar, cargar y verificar la baseline local HAPI FHIR.

## Técnica

- `docs/API.md`: contratos y endpoints API.
- `docs/architecture/overview.md`: arquitectura implementada actualmente.
- `docs/specs/`: specs activas nuevas.
- `docs/playbooks/agentic-repo-bootstrap.md`: guía base agent-first.
- GitHub Issues: backlog canónico de ejecución y priorización.

## Testing

- `docs/testing/TESTING_STRATEGY.md`: estrategia de test MVP (unit/contract/integration).
- `docs/testing/PR_TEST_CHECKLIST.md`: checklist obligatorio para PRs funcionales.
- `backend/tests/README.md`: estructura y reglas para tests backend.

## Compliance

- `docs/compliance/EHDS_COMPLIANCE_RADAR.md`: radar de compliance EHDS (generado por Agent Skill).

## Históricos (no fuente de verdad actual)

- Material histórico local en `.archive/` (no versionado en git).
- Planificación retirada o reemplazada por specs/issues: conservar solo en `.archive/` cuando sea necesario.
- Evidencia de verificaciones o readiness cerrados: consultar git history si hace falta contexto histórico.

Si hay conflicto entre documentos, priorizar:
1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`
