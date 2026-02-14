from fastapi import Depends, HTTPException, status
from middleware.auth import get_current_active_user
from typing import List, Dict

class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
    
    async def __call__(self, current_user: Dict = Depends(get_current_active_user)):
        if self.required_permission not in current_user.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.required_permission} required"
            )
        return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles
    
    async def __call__(self, current_user: Dict = Depends(get_current_active_user)):
        user_roles = current_user.get("roles", [])
        if not any(role in user_roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: one of {', '.join(self.allowed_roles)}"
            )
        return current_user

def require_permission(permission: str):
    return Depends(PermissionChecker(permission))

def require_role(*roles: str):
    return Depends(RoleChecker(list(roles)))

def require_admin():
    return Depends(RoleChecker(["admin"]))