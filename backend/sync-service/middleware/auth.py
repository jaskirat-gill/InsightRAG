from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.jwt import decode_token
from database import get_db, Database
from typing import Dict

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Database = Depends(get_db)
) -> Dict:
    """Validate JWT token and return current user"""
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Fetch user
    user = await db.fetch_one(
        "SELECT * FROM users WHERE user_id = $1 AND is_active = true",
        user_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Fetch roles
    roles = await db.fetch_all("""
        SELECT r.role_name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
    """, user_id)
    
    # Fetch permissions
    permissions = await db.fetch_all("""
        SELECT DISTINCT p.permission_name
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = $1
    """, user_id)
    
    return {
        "user_id": str(user["user_id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "roles": [r["role_name"] for r in roles],
        "permissions": [p["permission_name"] for p in permissions],
        "is_active": user["is_active"],
        "is_verified": user["is_verified"],
        "created_at": user["created_at"],
        "last_login": user["last_login"]
    }

async def get_current_active_user(
    current_user: Dict = Depends(get_current_user)
) -> Dict:
    """Ensure user is active"""
    if not current_user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user