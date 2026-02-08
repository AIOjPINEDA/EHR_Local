# Integration Tests

Add tests here only for multi-component flows (e.g., DB + API + business logic together).

Rules:

- Mark modules with `pytestmark = pytest.mark.integration`.
- Keep scope narrow to critical risks.
- Avoid duplicating unit/contract assertions.
