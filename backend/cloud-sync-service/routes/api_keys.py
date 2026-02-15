from fastapi import APIRouter, Depends, HTTPException, status
from database import get_db, Database
from middleware.auth import get_current_active_user
from typing import Dict, List
import secrets
import hashlib
import json  # Add this import
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

class CreateAPIKeyRequest(BaseModel):
    name: str
    scopes: List[str] = []
    expires_in_days: int | None = None

class APIKeyResponse(BaseModel):
    key_id: UUID
    key: str | None = None
    key_prefix: str
    name: str
    scopes: List[str]
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None

@router.post("", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateAPIKeyRequest,
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Generate a new API key"""
    
    # Generate random key
    key = f"sk_{secrets.token_urlsafe(32)}"
    key_prefix = key[:8]
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    
    # Calculate expiration
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
    
    # Convert scopes list to JSON string for PostgreSQL
    scopes_json = json.dumps(request.scopes)
    
    # Store in database
    api_key = await db.fetch_one("""
        INSERT INTO api_keys (
            user_id, key_hash, key_prefix, name, scopes, expires_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING *
    """, 
        current_user["user_id"],
        key_hash,
        key_prefix,
        request.name,
        scopes_json,  # Pass as JSON string
        expires_at
    )
    
    # Log creation
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success, metadata)
        VALUES ($1, 'api_key_created', true, $2::jsonb)
    """, current_user["user_id"], json.dumps({"key_name": request.name}))
    
    return APIKeyResponse(
        key_id=api_key["key_id"],
        key=key,  # Only show on creation!
        key_prefix=key_prefix,
        name=request.name,
        scopes=request.scopes,
        created_at=api_key["created_at"],
        expires_at=api_key["expires_at"],
        last_used_at=None
    )

@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """List user's API keys"""
    
    keys = await db.fetch_all("""
        SELECT * FROM api_keys
        WHERE user_id = $1 AND revoked_at IS NULL
        ORDER BY created_at DESC
    """, current_user["user_id"])
    
    return [
        APIKeyResponse(
            key_id=k["key_id"],
            key=None,  # Never return the actual key
            key_prefix=k["key_prefix"],
            name=k["name"],
            scopes=k["scopes"] if isinstance(k["scopes"], list) else json.loads(k["scopes"]),
            created_at=k["created_at"],
            expires_at=k["expires_at"],
            last_used_at=k["last_used_at"]
        )
        for k in keys
    ]

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: UUID,
    current_user: Dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Revoke an API key"""
    
    # Verify ownership
    key = await db.fetch_one(
        "SELECT * FROM api_keys WHERE key_id = $1 AND user_id = $2",
        str(key_id),
        current_user["user_id"]
    )
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Revoke
    await db.execute(
        "UPDATE api_keys SET revoked_at = NOW() WHERE key_id = $1",
        str(key_id)
    )
    
    # Log revocation
    await db.execute("""
        INSERT INTO auth_audit_log (user_id, event_type, success, metadata)
        VALUES ($1, 'api_key_revoked', true, $2::jsonb)
    """, current_user["user_id"], json.dumps({"key_id": str(key_id)}))
    
    return None