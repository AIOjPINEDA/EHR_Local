"""Policy tests for the approved public HAPI surface."""

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


def _overlay_source(filename: str) -> str:
    path = (
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
        / filename
    )
    return path.read_text(encoding="utf-8")


def _extract_enum_entries(source: str, constant_name: str) -> set[str]:
    match = re.search(rf"{constant_name}\s*=\s*EnumSet\.of\((.*?)\);", source, re.DOTALL)
    assert match is not None
    return set(re.findall(r"RestOperationTypeEnum\.([A-Z_]+)", match.group(1)))


def _extract_string_entries(source: str, constant_name: str) -> list[str]:
    match = re.search(rf"{constant_name}\s*=\s*Set\.of\((.*?)\);", source, re.DOTALL)
    assert match is not None
    return re.findall(r'"([^"]+)"', match.group(1))


def test_public_runtime_policy_uses_operation_level_whitelist() -> None:
    """The interceptor must decide public access with HAPI operation metadata, not only HTTP verbs."""
    interceptor = _overlay_source("ReadOnlyModeInterceptor.java")
    allowed_public_operations = _extract_enum_entries(interceptor, "ALLOWED_PUBLIC_OPERATIONS")

    assert "getRestOperationType()" in interceptor
    assert "isPublicRequestAllowed(requestDetails)" in interceptor
    assert allowed_public_operations == {"METADATA", "READ", "SEARCH_TYPE", "GET_PAGE"}
    assert "SEARCH_SYSTEM" not in allowed_public_operations
    assert "META" not in allowed_public_operations
    assert "HISTORY_TYPE" not in allowed_public_operations


@pytest.mark.parametrize(
    ("request_name", "operation_name", "resource_type", "expected_allowed"),
    [
        ("GET /fhir/metadata", "METADATA", None, True),
        ("GET /fhir/Patient/patient-1", "READ", "Patient", True),
        ("GET /fhir/Patient?family=García", "SEARCH_TYPE", "Patient", True),
        ("GET /fhir?_getpages=opaque-token", "GET_PAGE", None, True),
        ("GET /fhir/Patient/_history?_count=1", "HISTORY_TYPE", "Patient", False),
        ("GET /fhir/Patient/patient-1/_history/1", "VREAD", "Patient", False),
        ("GET /fhir/$meta", "META", None, False),
        ("GET /fhir/$get-resource-counts", "EXTENDED_OPERATION_SERVER", None, False),
    ],
)
def test_public_request_examples_match_the_approved_surface(
    request_name: str,
    operation_name: str,
    resource_type: str | None,
    expected_allowed: bool,
) -> None:
    """Representative public requests should map cleanly to allowed vs forbidden operations."""
    interceptor = _overlay_source("ReadOnlyModeInterceptor.java")
    allowed_public_operations = _extract_enum_entries(interceptor, "ALLOWED_PUBLIC_OPERATIONS")
    allowed_resource_types = set(_extract_string_entries(interceptor, "ALLOWED_RESOURCE_TYPES"))

    is_allowed = operation_name in allowed_public_operations and (
        resource_type is None or resource_type in allowed_resource_types
    )

    assert is_allowed is expected_allowed, request_name


def test_capability_statement_and_runtime_policy_stay_aligned() -> None:
    """Advertised HAPI capabilities must not announce more than the runtime public surface."""
    interceptor = _overlay_source("ReadOnlyModeInterceptor.java")
    customizer = _overlay_source("CapabilityStatementCustomizer.java")

    assert _extract_string_entries(
        interceptor, "ALLOWED_RESOURCE_TYPES"
    ) == _extract_string_entries(
        customizer,
        "ALLOWED_RESOURCE_TYPES",
    )
    assert sorted(set(re.findall(r"TypeRestfulInteraction\.([A-Z]+)", customizer))) == [
        "READ",
        "SEARCHTYPE",
    ]
    assert "rest.getOperation().clear();" in customizer
    assert "resource.getOperation().clear();" in customizer


def test_capability_statement_customizer_clears_write_and_versioning_claims() -> None:
    """Public metadata must not advertise write or version-aware capabilities."""
    customizer = _overlay_source("CapabilityStatementCustomizer.java")

    assert "setVersioning(CapabilityStatement.ResourceVersionPolicy.NOVERSION);" in customizer
    assert "setReadHistory(false);" in customizer
    assert "setUpdateCreate(false);" in customizer
    assert "setConditionalCreateElement(null);" in customizer
    assert "setConditionalReadElement(null);" in customizer
    assert "setConditionalUpdateElement(null);" in customizer
    assert "setConditionalPatchElement(null);" in customizer
    assert "setConditionalDeleteElement(null);" in customizer
    assert "ResourceVersionPolicy.VERSIONED" not in customizer
    assert "ResourceVersionPolicy.VERSIONEDUPDATE" not in customizer
