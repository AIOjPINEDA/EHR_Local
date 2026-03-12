"""Bootstrap guardrails for the local HAPI sidecar baseline."""

import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def test_hapi_sidecar_uses_official_starter_image_and_java21_builder() -> None:
    """The sidecar image must keep the official starter runtime and Java 21 build chain."""
    dockerfile = (_repo_root() / "sidecars" / "hapi-fhir" / "Dockerfile").read_text(encoding="utf-8")
    pom_xml = (_repo_root() / "sidecars" / "hapi-fhir" / "overlay" / "pom.xml").read_text(
        encoding="utf-8"
    )
    version_match = re.search(r"<hapi\.fhir\.version>([^<]+)</hapi\.fhir\.version>", pom_xml)
    release_match = re.search(r"<maven\.compiler\.release>([^<]+)</maven\.compiler\.release>", pom_xml)

    assert version_match is not None
    assert release_match is not None
    hapi_version = version_match.group(1)
    java_release = release_match.group(1)

    assert java_release == "21"
    assert "FROM maven:3.9.9-eclipse-temurin-21 AS overlay-build" in dockerfile
    assert "<release>${maven.compiler.release}</release>" in pom_xml
    runtime_tag_match = re.search(r"^FROM hapiproject/hapi:(\S+)$", dockerfile, re.MULTILINE)

    assert runtime_tag_match is not None
    assert runtime_tag_match.group(1) == f"v{hapi_version}-1"
    assert "RUN mkdir -p /build/runtime-data" in dockerfile
    assert "COPY --from=overlay-build --chown=65532:65532 /build/runtime-data/ /data/" in dockerfile
    assert re.search(r"^USER 65532:65532$", dockerfile, re.MULTILINE) is not None
    assert "/app/extra-classes/consultamed-hapi-overlay.jar" in dockerfile


def test_hapi_sidecar_compose_keeps_dedicated_local_postgres_and_health_checks() -> None:
    """Compose must keep a local-only dedicated Postgres and health-checked sidecar wiring."""
    compose = (_repo_root() / "sidecars" / "hapi-fhir" / "docker-compose.yml").read_text(
        encoding="utf-8"
    )

    assert "container_name: consultamed-hapi-db" in compose
    assert '127.0.0.1:${LOCAL_HAPI_POSTGRES_PORT:-54330}:5432' in compose
    assert '127.0.0.1:${LOCAL_HAPI_PORT:-8090}:8080' in compose
    assert "condition: service_healthy" in compose
    assert 'test: ["CMD-SHELL", "pg_isready -U ${HAPI_DB_USER:-hapi} -d ${HAPI_DB_NAME:-hapi_fhir}"]' in compose
    assert "SPRING_CONFIG_ADDITIONAL_LOCATION: file:///app/config/consultamed.application.yaml" in compose
    assert "HAPI_DB_HOST: hapi-postgres" in compose
    assert (
        '["CMD", "java", "-cp", "/app/extra-classes/consultamed-hapi-overlay.jar", '
        '"es.consultamed.hapi.HealthCheck"]'
    ) in compose
    assert '["CMD", "java", "-cp", "/app", "HealthCheck"]' not in compose
    assert "consultamed-db" not in compose


def test_hapi_sidecar_healthcheck_helper_probes_runtime_readiness_endpoint() -> None:
    """The runtime helper must probe the in-container readiness endpoint and fail closed."""
    helper = (
        _repo_root()
        / "sidecars"
        / "hapi-fhir"
        / "overlay"
        / "src"
        / "main"
        / "java"
        / "es"
        / "consultamed"
        / "hapi"
        / "HealthCheck.java"
    ).read_text(encoding="utf-8")

    assert "HttpClient" in helper
    assert "http://127.0.0.1:8080/actuator/health/readiness" in helper
    assert "\\\"status\\\":\\\"UP\\\"" in helper
    assert "System.exit(1)" in helper


def test_hapi_sidecar_config_stays_r5_public_read_search_on_postgres() -> None:
    """Config must keep the public surface on R5 read/search while wiring the internal ETL key."""
    config = (
        _repo_root() / "sidecars" / "hapi-fhir" / "consultamed.application.yaml"
    ).read_text(encoding="utf-8")
    compose = (_repo_root() / "sidecars" / "hapi-fhir" / "docker-compose.yml").read_text(
        encoding="utf-8"
    )
    start_script = (_repo_root() / "scripts" / "start-hapi-sidecar.sh").read_text(encoding="utf-8")

    assert "fhir_version: R5" in config
    assert "enabled: false" in config
    assert "jdbc:postgresql://${HAPI_DB_HOST:hapi-postgres}:5432/${HAPI_DB_NAME:hapi_fhir}" in config
    assert "driver-class-name: org.postgresql.Driver" in config
    assert "dialect: ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect" in config
    assert (
        "custom-interceptor-classes: es.consultamed.hapi.ReadOnlyModeInterceptor,"
        "es.consultamed.hapi.CapabilityStatementCustomizer,"
        "es.consultamed.hapi.AuditTrailInterceptor"
    ) in config
    assert "supported_resource_types:" in config
    assert "jdbc:h2:" not in config
    assert "HapiFhirH2Dialect" not in config
    assert "CONSULTAMED_ETL_API_KEY: ${CONSULTAMED_ETL_API_KEY:-consultamed-local-etl}" in compose
    assert "${requestUrl}" not in config
    assert "${idOrResourceName}" not in config
    assert "dedicated PostgreSQL" in start_script
    assert "consultamed-hapi-db" in start_script
    assert "/actuator/health" in start_script
    assert "/fhir/metadata" in start_script


def test_audit_trail_interceptor_logs_sanitized_traceability_without_phi_inputs() -> None:
    """Audit baseline must log request metadata without URLs, queries, payloads, or secrets."""
    interceptor = (
        _repo_root()
        / "sidecars"
        / "hapi-fhir"
        / "overlay"
        / "src"
        / "main"
        / "java"
        / "es"
        / "consultamed"
        / "hapi"
        / "AuditTrailInterceptor.java"
    ).read_text(encoding="utf-8")

    assert 'LoggerFactory.getLogger("consultamed.hapi.audit")' in interceptor
    assert "SERVER_HANDLE_EXCEPTION" in interceptor
    assert "SERVER_INCOMING_REQUEST_EXCEPTION" not in interceptor
    assert "getRequestId()" in interceptor
    assert "getResourceName()" in interceptor
    assert "getId()" in interceptor
    assert "getCompleteUrl()" not in interceptor
    assert "getParameters()" not in interceptor
    assert "loadRequestContents()" not in interceptor
    assert "Authorization" not in interceptor


def test_capability_statement_customizer_advertises_current_subset_and_interactions() -> None:
    """The overlay must keep metadata aligned with the agreed six-resource read/search surface."""
    customizer = (
        _repo_root()
        / "sidecars"
        / "hapi-fhir"
        / "overlay"
        / "src"
        / "main"
        / "java"
        / "es"
        / "consultamed"
        / "hapi"
        / "CapabilityStatementCustomizer.java"
    ).read_text(encoding="utf-8")

    allowed_resources_match = re.search(
        r"ALLOWED_RESOURCE_TYPES = Set\.of\((.*?)\);",
        customizer,
        re.DOTALL,
    )
    assert allowed_resources_match is not None
    allowed_resources = re.findall(r'"([^"]+)"', allowed_resources_match.group(1))

    assert allowed_resources == [
        "Patient",
        "Practitioner",
        "Encounter",
        "Condition",
        "MedicationRequest",
        "AllergyIntolerance",
    ]
    assert sorted(set(re.findall(r"TypeRestfulInteraction\.([A-Z]+)", customizer))) == [
        "READ",
        "SEARCHTYPE",
    ]
    assert 'setVersion("wave-1e-read-search")' in customizer
    assert "Public surface is CapabilityStatement, read, and search on the agreed six-resource subset" in customizer
    assert "ConsultaMed local surface: metadata plus read/search on the agreed six-resource subset." in customizer
    assert "ConsultaMed sidecar exposes public read and search-type interactions only." in customizer
    assert "setVersioning(CapabilityStatement.ResourceVersionPolicy.NOVERSION);" in customizer
    assert "setConditionalCreateElement(null);" in customizer
    assert "setConditionalUpdateElement(null);" in customizer
    assert "setConditionalDeleteElement(null);" in customizer
    assert "Wave 1A" not in customizer
    assert "bootstrap sidecar exposes read and search only" not in customizer