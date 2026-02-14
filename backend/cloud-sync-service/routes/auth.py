from fastapi import APIRouter, Depends, HTTPException, status
from models.auth import (
    RegisterRequest, 
    LoginRequest, 
    TokenResponse, 
    MessageResponse,
    RefreshTokenRequest,
    PasswordChangeRequest
)
from models.user import UserResponse
from database import get_db, Database
from utils.password import hash_password, verify_password
from utils.jwt import create_access_token, create_refresh_token, decode_token
from middleware.auth import get_current_active_user
from datetime import datetime
from typing import Dict
import hashlib

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: Database = Depends(get_db)
):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = await db.fetch_one(
        "SELECT user_id FROM users WHERE email = $1",
        request.email
    )
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_pwd = hash_password(request.password)
    
    # Insert user
    user = await db.fetch_one("""
        INSERT INTO users (email, hashed_password, full_name)
        VALUES ($1, $2, $3)
        RETURNING user_id
    """, request.email, hashed_pwd, request.full_name)
    
    # Assign default role (developer)
    role = await db.fetch_one(
        "SELECT role_id FROM roles WHERE role_name = 'developer'"
    )
    
    await db.execute("""
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
    """, user["user_id"], role["role_id"])
    
    # Log the registration
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success, metadata)
        VALUES ($1, 'login', true, $2)
    """, user["user_id"], '{"action": "registration"}')
    
    return MessageResponse(message="User registered successfully")


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Database = Depends(get_db)
):
    """Login with email and password"""
    
    # Fetch user
    user = await db.fetch_one(
        "SELECT * FROM users WHERE email = $1",
        request.email
    )
    
    # Check if user exists and password is correct
    if not user or not verify_password(request.password, user["hashed_password"]):
        # Log failed attempt
        if user:
            await db.execute("""
                INSERT INTO auth_audit_log (user_id, event_type, success)
                VALUES ($1, 'login', false)
            """, user["user_id"])
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create tokens
    user_id = str(user["user_id"])
    access_token = create_access_token(data={"sub": user_id})
    refresh_token = create_refresh_token(user_id)
    
    # Store refresh token
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await db.execute("""
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '7 days')
    """, user["user_id"], token_hash)
    
    # Update last login
    await db.execute(
        "UPDATE users SET last_login = NOW() WHERE user_id = $1",
        user["user_id"]
    )
    
    # Log successful login
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success)
        VALUES ($1, 'login', true)
    """, user["user_id"])
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=1800  # 30 minutes in seconds
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Database = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    # Decode refresh token
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()
    
    # Verify refresh token exists and is valid
    token_record = await db.fetch_one("""
        SELECT * FROM refresh_tokens
        WHERE user_id = $1 
          AND token_hash = $2
          AND revoked_at IS NULL
          AND expires_at > NOW()
    """, user_id, token_hash)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Create new tokens
    new_access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(user_id)
    
    # Revoke old refresh token
    await db.execute(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = $1",
        token_record["token_id"]
    )
    
    # Store new refresh token
    new_token_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    await db.execute("""
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '7 days')
    """, user_id, new_token_hash)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=1800
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    refresh_token: str,
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Logout and revoke refresh token"""
    
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    # Revoke refresh token
    await db.execute("""
        UPDATE refresh_tokens 
        SET revoked_at = NOW() 
        WHERE user_id = $1 AND token_hash = $2
    """, current_user["user_id"], token_hash)
    
    # Log logout
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success)
        VALUES ($1, 'logout', true)
    """, current_user["user_id"])
    
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Dict = Depends(get_current_active_user)
):
    """Get current user information"""
    return UserResponse(**current_user)


@router.post("/password/change", response_model=MessageResponse)
async def change_password(
    request: PasswordChangeRequest,
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Change user password"""
    
    # Fetch current user from database
    user = await db.fetch_one(
        "SELECT hashed_password FROM users WHERE user_id = $1",
        current_user["user_id"]
    )
    
    # Verify old password
    if not verify_password(request.old_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Hash new password
    new_hashed_password = hash_password(request.new_password)
    
    # Update password
    await db.execute(
        "UPDATE users SET hashed_password = $1 WHERE user_id = $2",
        new_hashed_password,
        current_user["user_id"]
    )
    
    # Revoke all refresh tokens for security
    await db.execute(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1",
        current_user["user_id"]
    )
    
    # Log password change
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success)
        VALUES ($1, 'password_change', true)
    """, current_user["user_id"])
    
    return MessageResponse(message="Password changed successfully")