#!/usr/bin/env python3
"""Load the initial ConsultaMed clinical subset into the local HAPI sidecar."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.fhir.etl import DEFAULT_HAPI_BASE_URL, run_clinical_subset_etl


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for the local ETL runner."""
    parser = argparse.ArgumentParser(
        description="Load the initial ConsultaMed FHIR subset into the local HAPI sidecar.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_HAPI_BASE_URL,
        help="FHIR base URL for the local HAPI sidecar (default: %(default)s)",
    )
    return parser.parse_args()


def main() -> None:
    """Entry point for the local clinical ETL command."""
    args = parse_args()
    report = asyncio.run(run_clinical_subset_etl(base_url=args.base_url))

    print("ConsultaMed initial HAPI subset ETL completed.")
    for resource_type, source_count in report.source_counts.items():
        print(
            f"- {resource_type}: source={source_count} target={report.target_counts[resource_type]}"
        )
    if report.sample_ids:
        print("- Sample resource ids:")
        for resource_type, resource_id in report.sample_ids.items():
            print(f"  - {resource_type}: {resource_id}")


if __name__ == "__main__":
    main()