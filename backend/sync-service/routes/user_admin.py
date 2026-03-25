import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from database import get_db, Database
from middleware.permissions import require_permission, require_admin
from middleware.auth import get_current_active_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Shared models ────────────────────────────────────────────────────────────

class UserRow(BaseModel):
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    roles: List[str] = []


class UpdateUserRoleRequest(BaseModel):
    role_name: str


class RoleDetail(BaseModel):
    role_id: UUID
    role_name: str
    description: Optional[str] = None
    is_system: bool = False
    can_be_created_by: List[str] = []
    can_be_modified_by: List[str] = []
    permissions: List[str] = []


class PermissionDef(BaseModel):
    permission_id: UUID
    permission_name: str
    resource: str
    action: str
    description: Optional[str] = None


class CreateRoleRequest(BaseModel):
    role_name: str
    description: Optional[str] = None
    can_be_created_by: List[str] = []
    can_be_modified_by: List[str] = []
    permission_names: List[str] = []


class UpdateRoleRequest(BaseModel):
    description: Optional[str] = None
    can_be_created_by: Optional[List[str]] = None
    can_be_modified_by: Optional[List[str]] = None
    permission_names: Optional[List[str]] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_jsonb(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return []


def _row_to_role_detail(row) -> RoleDetail:
    return RoleDetail(
        role_id=row["role_id"],
        role_name=row["role_name"],
        description=row["description"],
        is_system=bool(row["is_system"]) if row["is_system"] is not None else False,
        can_be_created_by=_parse_jsonb(row["can_be_created_by"]),
        can_be_modified_by=_parse_jsonb(row["can_be_modified_by"]),
        permissions=list(row["permissions"] or []),
    )


_ROLE_DETAIL_QUERY = """
    SELECT
        r.role_id,
        r.role_name,
        r.description,
        COALESCE(r.is_system, false) AS is_system,
        COALESCE(r.can_be_created_by, '[]'::jsonb) AS can_be_created_by,
        COALESCE(r.can_be_modified_by, '[]'::jsonb) AS can_be_modified_by,
        COALESCE(array_agg(p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL), '{}') AS permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
    LEFT JOIN permissions p ON p.permission_id = rp.permission_id
"""


async def _fetch_role_by_id(db: Database, role_id: str) -> Optional[RoleDetail]:
    row = await db.fetch_one(
        _ROLE_DETAIL_QUERY + " WHERE r.role_id = $1 GROUP BY r.role_id",
        role_id,
    )
    return _row_to_role_detail(row) if row else None


async def _assign_permissions(db: Database, role_id: str, permission_names: List[str]):
    await db.execute("DELETE FROM role_permissions WHERE role_id = $1", role_id)
    if permission_names:
        perm_rows = await db.fetch_all(
            "SELECT permission_id FROM permissions WHERE permission_name = ANY($1::text[])",
            permission_names,
        )
        for perm in perm_rows:
            await db.execute(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                role_id,
                str(perm["permission_id"]),
            )


# ─── User endpoints ───────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserRow])
async def list_users(
    current_user: dict = require_permission("user.read"),
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
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    # Determine the target user's current role
    target_role_row = await db.fetch_one(
        """
        SELECT r.role_name, r.can_be_modified_by
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
        LIMIT 1
        """,
        str(user_id),
    )

    # Get current user's roles
    caller_role_rows = await db.fetch_all(
        """
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
        """,
        current_user["user_id"],
    )
    caller_roles = {r["role_name"] for r in caller_role_rows}
    caller_permissions = set(current_user.get("permissions", []))

    # Allow if: has user.update permission OR caller's role is in can_be_modified_by of target's role
    can_modify = "user.update" in caller_permissions
    if not can_modify and target_role_row:
        raw = target_role_row["can_be_modified_by"]
        if isinstance(raw, str):
            try:
                can_be_modified_by = json.loads(raw)
            except Exception:
                can_be_modified_by = []
        else:
            can_be_modified_by = raw or []
        can_modify = any(r in can_be_modified_by for r in caller_roles)

    if not can_modify:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this user's role.",
        )

    role = await db.fetch_one(
        "SELECT role_id FROM roles WHERE role_name = $1",
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


# ─── Role endpoints ───────────────────────────────────────────────────────────

@router.get("/roles", response_model=List[RoleDetail])
async def list_roles(
    current_user: dict = require_permission("user.read"),
    db: Database = Depends(get_db),
):
    rows = await db.fetch_all(
        _ROLE_DETAIL_QUERY + " GROUP BY r.role_id ORDER BY COALESCE(r.is_system, false) DESC, r.role_name ASC"
    )
    return [_row_to_role_detail(r) for r in rows]


@router.get("/permissions", response_model=List[PermissionDef])
async def list_permissions(
    current_user: dict = require_permission("user.read"),
    db: Database = Depends(get_db),
):
    rows = await db.fetch_all(
        "SELECT permission_id, permission_name, resource, action, description FROM permissions ORDER BY resource, action"
    )
    return [PermissionDef(**dict(r)) for r in rows]


@router.post("/roles", response_model=RoleDetail, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: CreateRoleRequest,
    current_user: dict = require_admin(),
    db: Database = Depends(get_db),
):
    role_name = body.role_name.strip().lower().replace(" ", "_")
    if not role_name:
        raise HTTPException(status_code=400, detail="Role name is required")

    existing = await db.fetch_one("SELECT role_id FROM roles WHERE role_name = $1", role_name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{role_name}' already exists")

    row = await db.fetch_one(
        """
        INSERT INTO roles (role_name, description, can_be_created_by, can_be_modified_by, is_system)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, false)
        RETURNING role_id
        """,
        role_name,
        body.description,
        json.dumps(body.can_be_created_by),
        json.dumps(body.can_be_modified_by),
    )
    role_id = str(row["role_id"])
    await _assign_permissions(db, role_id, body.permission_names)

    return await _fetch_role_by_id(db, role_id)


@router.put("/roles/{role_id}", response_model=RoleDetail)
async def update_role(
    role_id: UUID,
    body: UpdateRoleRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    role = await db.fetch_one(
        "SELECT role_id, role_name, is_system, can_be_modified_by FROM roles WHERE role_id = $1", str(role_id)
    )
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Allow if admin role OR (has role_management.access AND caller's role is in can_be_modified_by)
    caller_roles = {r["role_name"] for r in await db.fetch_all(
        "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = $1",
        current_user["user_id"],
    )}
    caller_permissions = set(current_user.get("permissions", []))
    is_admin = "admin" in caller_roles

    if not is_admin:
        if "role_management.access" not in caller_permissions:
            raise HTTPException(status_code=403, detail="Permission denied: role_management.access required")
        raw = role["can_be_modified_by"]
        can_be_modified_by = json.loads(raw) if isinstance(raw, str) else (raw or [])
        if not any(r in can_be_modified_by for r in caller_roles):
            raise HTTPException(
                status_code=403,
                detail=f"Your role is not in the 'can be modified by' list for this role.",
            )

    updates, values = [], []
    i = 1

    if body.description is not None:
        updates.append(f"description = ${i}")
        values.append(body.description)
        i += 1

    if body.can_be_created_by is not None:
        updates.append(f"can_be_created_by = ${i}::jsonb")
        values.append(json.dumps(body.can_be_created_by))
        i += 1

    if body.can_be_modified_by is not None:
        updates.append(f"can_be_modified_by = ${i}::jsonb")
        values.append(json.dumps(body.can_be_modified_by))
        i += 1

    if updates:
        values.append(str(role_id))
        await db.execute(
            f"UPDATE roles SET {', '.join(updates)} WHERE role_id = ${i}", *values
        )

    if body.permission_names is not None:
        await _assign_permissions(db, str(role_id), body.permission_names)

    return await _fetch_role_by_id(db, str(role_id))


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    role = await db.fetch_one(
        "SELECT role_id, role_name, is_system, can_be_modified_by FROM roles WHERE role_id = $1", str(role_id)
    )
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role["is_system"]:
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")

    # Check caller is authorised: admin role OR role is in can_be_modified_by
    caller_roles = {r["role_name"] for r in await db.fetch_all(
        "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = $1",
        current_user["user_id"],
    )}
    caller_permissions = set(current_user.get("permissions", []))
    is_admin = "admin" in caller_roles

    if not is_admin:
        if "role_management.access" not in caller_permissions:
            raise HTTPException(status_code=403, detail="Permission denied: role_management.access required")
        raw = role["can_be_modified_by"]
        can_be_modified_by = json.loads(raw) if isinstance(raw, str) else (raw or [])
        if not any(r in can_be_modified_by for r in caller_roles):
            raise HTTPException(
                status_code=403,
                detail="Your role is not in the 'can be modified by' list for this role.",
            )

    # Block if the current user holds this role
    current_user_roles = await db.fetch_all(
        """
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
        """,
        current_user["user_id"],
    )
    current_role_names = {r["role_name"] for r in current_user_roles}
    if role["role_name"] in current_role_names:
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are currently signed in as the '{role['role_name']}' role. "
                f"You will have to log out and sign in with another account to delete this role."
            ),
        )

    # Delete all users who have this role
    users_in_role = await db.fetch_all(
        "SELECT user_id FROM user_roles WHERE role_id = $1", str(role_id)
    )
    for row in users_in_role:
        await db.execute("DELETE FROM users WHERE user_id = $1", str(row["user_id"]))

    await db.execute("DELETE FROM roles WHERE role_id = $1", str(role_id))
    return None
