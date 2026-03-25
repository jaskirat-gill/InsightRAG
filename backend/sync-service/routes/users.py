from fastapi import APIRouter, Depends, HTTPException, status
from models.user import UserResponse, UserCreate, UserUpdate
from database import get_db, Database
from middleware.permissions import require_admin, require_permission
from middleware.auth import get_current_active_user
from utils.password import hash_password
from typing import List, Dict
from uuid import UUID
from typing import Set

router = APIRouter(prefix="/users", tags=["Users"])

async def get_user_role_names(db: Database, user_id: str) -> Set[str]:
    rows = await db.fetch_all(
        """
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
        """,
        user_id,
    )
    return {r["role_name"] for r in rows}

async def allowed_roles_for_creator(db: Database, creator_roles: Set[str]) -> Set[str]:
    """Returns the set of role names this creator can assign, based on each role's can_be_created_by."""
    import json as _json
    try:
        rows = await db.fetch_all("SELECT role_name, can_be_created_by FROM roles")
    except Exception:
        rows = []

    allowed: Set[str] = set()
    for row in rows:
        raw = row["can_be_created_by"]
        if isinstance(raw, str):
            try:
                can_create = _json.loads(raw)
            except Exception:
                can_create = []
        else:
            can_create = raw or []
        if any(cr in can_create for cr in creator_roles):
            allowed.add(row["role_name"])

    if not allowed:
        # Fallback to hardcoded logic (e.g. migration hasn't run yet)
        if "admin" in creator_roles:
            return {"admin", "developer", "end_user"}
        if "developer" in creator_roles:
            return {"developer", "end_user"}
        return {"end_user"}

    return allowed

@router.get("/me")
async def me(
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    roles = await get_user_role_names(db, current_user["user_id"])
    return {
        "user_id": current_user["user_id"],
        "email": current_user.get("email"),
        "roles": list(roles),
    }

@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: Dict = require_permission("user.read"),
    db: Database = Depends(get_db)
):
    """List all users (admin only)"""
    
    # Fetch users
    users = await db.fetch_all("""
        SELECT * FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """, limit, skip)
    
    result = []
    for user in users:
        # Fetch roles for each user
        roles = await db.fetch_all("""
            SELECT r.role_name 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id = $1
        """, user["user_id"])
        
        # Fetch permissions for each user
        permissions = await db.fetch_all("""
            SELECT DISTINCT p.permission_name
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.permission_id
            WHERE ur.user_id = $1
        """, user["user_id"])
        
        result.append(UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            full_name=user["full_name"],
            roles=[r["role_name"] for r in roles],
            permissions=[p["permission_name"] for p in permissions],
            is_active=user["is_active"],
            is_verified=user["is_verified"],
            created_at=user["created_at"],
            last_login=user["last_login"]
        ))
    
    return result


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: Dict = require_permission("user.read"),
    db: Database = Depends(get_db)
):
    """Get user by ID"""
    
    user = await db.fetch_one(
        "SELECT * FROM users WHERE user_id = $1",
        str(user_id)
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Fetch roles
    roles = await db.fetch_all("""
        SELECT r.role_name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = $1
    """, str(user_id))
    
    # Fetch permissions
    permissions = await db.fetch_all("""
        SELECT DISTINCT p.permission_name
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = $1
    """, str(user_id))
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        full_name=user["full_name"],
        roles=[r["role_name"] for r in roles],
        permissions=[p["permission_name"] for p in permissions],
        is_active=user["is_active"],
        is_verified=user["is_verified"],
        created_at=user["created_at"],
        last_login=user["last_login"]
    )

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    current_user: Dict = require_permission("user.create"),
    db: Database = Depends(get_db)
):
    """Create a new user (role-restricted)"""

    # 1) Figure out creator roles
    creator_roles = await get_user_role_names(db, current_user["user_id"])
    allowed = await allowed_roles_for_creator(db, creator_roles)

    # 2) Enforce role creation rules
    if request.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not allowed to create role '{request.role}'. Allowed: {sorted(list(allowed))}",
        )

    # 3) Existing email check
    existing = await db.fetch_one(
        "SELECT user_id FROM users WHERE email = $1",
        request.email
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 4) Create user
    hashed_pwd = hash_password(request.password)
    user = await db.fetch_one("""
        INSERT INTO users (email, hashed_password, full_name)
        VALUES ($1, $2, $3)
        RETURNING *
    """, request.email, hashed_pwd, request.full_name)

    # 5) Assign role
    role = await db.fetch_one(
        "SELECT role_id FROM roles WHERE role_name = $1",
        request.role
    )
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {request.role}"
        )

    await db.execute("""
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES ($1, $2, $3)
    """, user["user_id"], role["role_id"], current_user["user_id"])

    return await get_user(user["user_id"], current_user, db)



@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    request: UserUpdate,
    current_user: Dict = require_permission("user.update"),
    db: Database = Depends(get_db)
):
    """Update user information"""
    
    # Check if user exists
    user = await db.fetch_one(
        "SELECT user_id FROM users WHERE user_id = $1",
        str(user_id)
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Build update query dynamically
    updates = []
    values = []
    param_count = 1
    
    if request.full_name is not None:
        updates.append(f"full_name = ${param_count}")
        values.append(request.full_name)
        param_count += 1
    
    if request.is_active is not None:
        updates.append(f"is_active = ${param_count}")
        values.append(request.is_active)
        param_count += 1
    
    if updates:
        values.append(str(user_id))
        query = f"UPDATE users SET {', '.join(updates)} WHERE user_id = ${param_count}"
        await db.execute(query, *values)
    
    # Return updated user
    return await get_user(user_id, current_user, db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Delete user — allowed for admin or if caller's role is in target role's can_be_modified_by."""
    import json as _json

    # Prevent self-deletion
    if str(user_id) == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    caller_roles = await get_user_role_names(db, current_user["user_id"])
    caller_permissions = set(current_user.get("permissions", []))
    is_admin = "admin" in caller_roles

    if not is_admin:
        if "user.delete" not in caller_permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: user.delete required")
        # Check can_be_modified_by for the target user's role
        target_role = await db.fetch_one(
            """
            SELECT r.can_be_modified_by FROM user_roles ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id = $1 LIMIT 1
            """,
            str(user_id),
        )
        if target_role:
            raw = target_role["can_be_modified_by"]
            can_be_modified_by = _json.loads(raw) if isinstance(raw, str) else (raw or [])
            if not any(r in can_be_modified_by for r in caller_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your role is not permitted to delete users with this role.",
                )

    # Delete user (cascade will handle related records)
    result = await db.execute(
        "DELETE FROM users WHERE user_id = $1",
        str(user_id)
    )
    
    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return None