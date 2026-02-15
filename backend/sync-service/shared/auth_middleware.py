"""
Shared authentication middleware for all services
Copy this to each service that needs auth
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token by calling auth service"""
    token = credentials.credentials
    
    # Call cloud-sync-service to verify token
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "http://cloud-sync-service:8000/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

# Use in your endpoints like:
# @app.get("/protected")
# async def protected_route(current_user: dict = Depends(verify_token)):
#     return {"message": f"Hello {current_user['email']}"}