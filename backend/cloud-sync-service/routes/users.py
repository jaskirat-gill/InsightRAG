from fastapi import APIRouter, Depends, HTTPException, status
from models.user import UserResponse, UserCreate, UserUpdate
from database import get_db, Database
from middleware.permissions import require_admin, require_permission
from middleware.auth import get_current_active_user
from utils.password import hash_password
from typing import List, Dict
from uuid import UUID

router = APIRouter(prefix="/users", tags=["Users"])

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
    current_user: Dict = require_admin(),
    db: Database = Depends(get_db)
):
    """Create a new user (admin only)"""
    
    # Check if user exists
    existing = await db.fetch_one(
        "SELECT user_id FROM users WHERE email = $1",
        request.email
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_pwd = hash_password(request.password)
    
    # Create user
    user = await db.fetch_one("""
        INSERT INTO users (email, hashed_password, full_name)
        VALUES ($1, $2, $3)
        RETURNING *
    """, request.email, hashed_pwd, request.full_name)
    
    # Assign role
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
    
    # Return created user
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
    current_user: Dict = require_admin(),
    db: Database = Depends(get_db)
):
    """Delete user (admin only)"""
    
    # Prevent self-deletion
    if str(user_id) == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
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