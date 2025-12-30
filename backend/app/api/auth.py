"""
ConsultaMed Backend - Authentication Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint.
    
    Returns JWT access token for authenticated user.
    """
    # TODO: Implement authentication logic
    # 1. Verify credentials against database
    # 2. Generate JWT token
    # 3. Return token with practitioner data
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication not yet implemented"
    )


@router.get("/me")
async def get_current_user():
    """
    Get current authenticated user.
    
    Returns practitioner data for the authenticated user.
    """
    # TODO: Implement with JWT dependency
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )
