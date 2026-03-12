"""Integration smoke tests for the deployed local HAPI sidecar."""

from __future__ import annotations

import json
import os
import re
import subprocess
from collections.abc import Generator
from pathlib import Path
from urllib.request import urlopen

import pytest

pytestmark = pytest.mark.integration

INTEGRATION_FLAG = "RUN_INTEGRATION"
ALLOWED_RESOURCE_TYPES = {
    "Patient",
    "Practitioner",
    "Encounter",
    "Condition",
    "MedicationRequest",
    "AllergyIntolerance",
}


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def _integration_enabled() -> bool:
    """Enable sidecar integration tests only on explicit opt-in."""
    return os.getenv(INTEGRATION_FLAG, "0") == "1"


def _run_command(command: list[str], cwd: Path, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    """Run a subprocess and return captured text output."""
    return subprocess.run(
        command,
        cwd=cwd,
        env=env,
        check=True,
        text=True,
        capture_output=True,
    )


def _fetch_json(url: str) -> dict:
    """Fetch a JSON payload from the local sidecar endpoints."""
    with urlopen(url, timeout=10) as response:
        assert response.status == 200
        return json.load(response)


@pytest.fixture(scope="module", autouse=True)
def sidecar_runtime() -> Generator[None, None, None]:
    """Start the sidecar deployment once for the module and stop it afterwards."""
    if not _integration_enabled():
        pytest.skip("Integration tests disabled. Set RUN_INTEGRATION=1 to run them.")

    root = _repo_root()
    env = os.environ.copy()
    env.setdefault("HAPI_START_TIMEOUT_SECONDS", "240")

    _run_command(["./scripts/start-hapi-sidecar.sh"], cwd=root, env=env)
    try:
        yield
    finally:
        subprocess.run(
            ["./scripts/stop-hapi-sidecar.sh"],
            cwd=root,
            env=env,
            check=False,
            text=True,
            capture_output=True,
        )


def test_sidecar_container_runtime_reports_java_21_lts() -> None:
    """The deployed sidecar container must run on Java 21 after the upgrade."""
    command = subprocess.run(
        ["docker", "exec", "consultamed-hapi-sidecar", "java", "-version"],
        check=True,
        text=True,
        capture_output=True,
    )
    version_output = f"{command.stdout}\n{command.stderr}"

    assert re.search(r'version "21(\.|\")', version_output) is not None
    assert "LTS" in version_output


def test_sidecar_health_endpoint_reports_up() -> None:
    """The deployed sidecar must expose an UP health signal after startup."""
    payload = _fetch_json("http://localhost:8090/actuator/health")

    assert payload["status"] == "UP"


def test_sidecar_metadata_exposes_only_the_approved_public_subset() -> None:
    """The live CapabilityStatement must match the approved read/search-only surface."""
    payload = _fetch_json("http://localhost:8090/fhir/metadata")

    assert payload["resourceType"] == "CapabilityStatement"
    assert payload["software"]["name"] == "ConsultaMed HAPI Sidecar"
    assert payload["software"]["version"] == "wave-1e-read-search"

    rest_entry = payload["rest"][0]
    resource_entries = rest_entry["resource"]
    resource_types = {resource["type"] for resource in resource_entries}

    assert resource_types == ALLOWED_RESOURCE_TYPES
    assert rest_entry.get("interaction", []) == []
    assert rest_entry.get("operation", []) == []

    for resource in resource_entries:
        codes = {interaction["code"] for interaction in resource["interaction"]}
        assert codes == {"read", "search-type"}
        assert resource["versioning"] == "no-version"
        assert resource["readHistory"] is False
        assert resource["updateCreate"] is False