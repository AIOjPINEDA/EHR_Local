"""
ConsultaMed Backend - Templates Endpoints
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

router = APIRouter()


@router.get("/")
async def list_templates(
    search: Optional[str] = Query(None, description="Search by name or diagnosis"),
    favorites_only: bool = Query(False, description="Filter favorites only"),
):
    """
    List treatment templates.
    """
    # TODO: Implement with TemplateService
    return {
        "items": [],
        "total": 0,
    }


@router.get("/match")
async def match_template(
    diagnosis: str = Query(..., min_length=2, description="Diagnosis text to match"),
):
    """
    Find best matching template for a diagnosis.
    
    Used for auto-loading treatment when selecting diagnosis.
    """
    # TODO: Implement matching logic in TemplateService
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No se encontró template para este diagnóstico"
    )


@router.get("/{template_id}")
async def get_template(template_id: str):
    """
    Get template by ID.
    """
    # TODO: Implement
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Template not found"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_template():
    """
    Create new treatment template.
    """
    # TODO: Implement
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.put("/{template_id}")
async def update_template(template_id: str):
    """
    Update template.
    """
    # TODO: Implement
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: str):
    """
    Delete template.
    """
    # TODO: Implement
    pass
