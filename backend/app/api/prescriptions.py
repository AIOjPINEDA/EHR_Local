"""
ConsultaMed Backend - Prescriptions Endpoints (PDF Generation)
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/encounter/{encounter_id}/preview")
async def get_prescription_preview(encounter_id: str):
    """
    Get prescription data for preview.
    
    Returns structured data for frontend preview component.
    """
    # TODO: Implement with PDFService
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Encounter not found"
    )


@router.get("/encounter/{encounter_id}/pdf")
async def download_prescription_pdf(encounter_id: str):
    """
    Generate and download prescription PDF.
    
    Uses WeasyPrint to generate PDF from HTML template.
    """
    # TODO: Implement PDF generation with PDFService
    # 
    # Example return:
    # return StreamingResponse(
    #     io.BytesIO(pdf_bytes),
    #     media_type="application/pdf",
    #     headers={
    #         "Content-Disposition": f"attachment; filename=receta_{dni}_{date}.pdf"
    #     }
    # )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF generation not yet implemented"
    )
