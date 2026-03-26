from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class UserResponse(BaseModel):
    user_id: UUID
    email: str
    full_name: Optional[str]
    roles: List[str]
    permissions: List[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "developer"
    kb_ids: List[UUID] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None