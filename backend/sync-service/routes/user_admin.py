from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from database import get_db, Database
from middleware.permissions import require_permission

router = APIRouter(prefix="/admin", tags=["Admin"])


class UserRow(BaseModel):
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    roles: List[str] = []


class UpdateUserRoleRequest(BaseModel):
    role_name: str  # "admin" | "developer" | "end_user"


@router.get("/users", response_model=List[UserRow])
async def list_users(
    current_user: dict = require_permission("admin.user.read"),
    db: Database = Depends(get_db),
):
    rows = await db.fetch_all(
        """
        SELECT
          u.user_id,
          u.email,
          u.full_name,
          u.is_active,
          COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
        LEFT JOIN roles r ON r.role_id = ur.role_id
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
        """
    )
    return [UserRow(**dict(r)) for r in rows]


@router.post("/users/{user_id}/role", response_model=UserRow)
async def set_user_role(
    user_id: UUID,
    body: UpdateUserRoleRequest,
    current_user: dict = require_permission("admin.user.write"),
    db: Database = Depends(get_db),
):
    role = await db.fetch_one(
        "SELECT role_id, role_name FROM roles WHERE role_name = $1",
        body.role_name,
    )
    if not role:
        raise HTTPException(status_code=400, detail="Unknown role")

    await db.execute("DELETE FROM user_roles WHERE user_id = $1", str(user_id))
    await db.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
        str(user_id),
        str(role["role_id"]),
    )

    row = await db.fetch_one(
        """
        SELECT
          u.user_id,
          u.email,
          u.full_name,
          u.is_active,
          COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
        LEFT JOIN roles r ON r.role_id = ur.role_id
        WHERE u.user_id = $1
        GROUP BY u.user_id
        """,
        str(user_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return UserRow(**dict(row))