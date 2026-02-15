"""
ConsultaMed Backend - Base Service (FHIR-aligned Operations)

Service base class con naming conventions alineadas a FHIR R5 interactions:
- read: FHIR Read operation (get by ID)
- search: FHIR Search operation (query with parameters)
- create: FHIR Create operation
- update: FHIR Update operation (full replacement)
- patch: FHIR Patch operation (partial update)
- delete: FHIR Delete operation

Evita métodos genéricos mágicos (save_or_update, upsert) que ocultan la intención.
"""
from typing import TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession


T = TypeVar('T')
M = TypeVar('M')  # For commit_and_refresh - accepts any model type


class BaseService(Generic[T]):
    """
    Base service class for FHIR resource operations.

    Provides common patterns for database operations aligned with FHIR interactions.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize service with database session.

        Args:
            db: AsyncSession for database operations
        """
        self.db = db

    async def commit_and_refresh(self, instance: M) -> M:
        """
        Helper for commit + refresh pattern.

        Útil para crear/actualizar recursos y obtener los cambios aplicados por la DB
        (defaults, triggers, timestamps).

        Works with any model type, not just the service's primary resource type.

        Args:
            instance: ORM model instance to commit and refresh

        Returns:
            Refreshed instance with DB-generated values

        Example:
            ```python
            patient = Patient(**data)
            self.db.add(patient)
            await self.commit_and_refresh(patient)

            # Also works with related models:
            allergy = AllergyIntolerance(**data)
            self.db.add(allergy)
            await self.commit_and_refresh(allergy)
            ```
        """
        await self.db.commit()
        await self.db.refresh(instance)
        return instance
