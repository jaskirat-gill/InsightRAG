from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, Dict
from config import settings
import hashlib
import logging
import uuid

logger = logging.getLogger("sync_service.auth")


def _token_fingerprint(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return digest[:12]


def _safe_unverified_token_details(token: str) -> Dict:
    details: Dict[str, object] = {}
    try:
        details["header"] = jwt.get_unverified_header(token)
    except Exception as exc:
        details["header_error"] = str(exc)
    try:
        claims = jwt.get_unverified_claims(token)
        details["claims"] = {
            "sub": claims.get("sub"),
            "type": claims.get("type"),
            "iss": claims.get("iss"),
            "aud": claims.get("aud"),
            "exp": claims.get("exp"),
        }
    except Exception as exc:
        details["claims_error"] = str(exc)
    return details

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow()
    })
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": datetime.utcnow()
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[Dict]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as exc:
        token_details = _safe_unverified_token_details(token)
        logger.warning(
            "JWT decode failed: %s (fingerprint=%s, length=%s, details=%s)",
            exc,
            _token_fingerprint(token),
            len(token),
            token_details,
        )
        return None