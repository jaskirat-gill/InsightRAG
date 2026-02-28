# Authentication System Implementation

## Overview

Implemented a complete JWT-based authentication system with role-based access control (RBAC) for the Cloud Sync Service.

## Features Implemented

### Core Authentication
- User registration with email validation
- Secure login with JWT tokens (access + refresh)
- Password hashing with bcrypt (12 rounds)
- Token refresh mechanism
- Logout with token revocation
- Password change functionality

###  Role-Based Access Control (RBAC)
- **3 Roles:** Admin, Developer, End User
- **19 Permissions** across 7 resource types
- Dynamic role-permission mapping
- Middleware-based authorization
- Protected endpoints with fine-grained access control

###  API Key Management
- Generate API keys for programmatic access
- Scoped permissions per key
- Key expiration support
- Secure key storage (hashed)
- Revocation mechanism

###  Database Schema
**8 New Tables:**
- `users` - User accounts
- `roles` - System roles
- `permissions` - Access permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission mappings
- `api_keys` - API key storage
- `refresh_tokens` - Refresh token tracking
- `auth_audit_log` - Security event logging

###  API Endpoints

#### Authentication (6 endpoints)
```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login and get tokens
POST   /api/v1/auth/refresh           - Refresh access token
POST   /api/v1/auth/logout            - Logout and revoke token
GET    /api/v1/auth/me                - Get current user info
POST   /api/v1/auth/password/change   - Change password
```

#### User Management (5 endpoints - Admin only)
```
GET    /api/v1/users                  - List all users
POST   /api/v1/users                  - Create user
GET    /api/v1/users/{id}             - Get user by ID
PUT    /api/v1/users/{id}             - Update user
DELETE /api/v1/users/{id}             - Delete user
```

#### API Keys (3 endpoints)
```
POST   /api/v1/api-keys               - Generate API key
GET    /api/v1/api-keys               - List user's API keys
DELETE /api/v1/api-keys/{key_id}      - Revoke API key
```

## Technical Details

### Security Features
- **Password Hashing:** bcrypt with 12 rounds
    - passlib with bcrypt 4.0.1
- **JWT Tokens:** 
  - Access tokens: 30 minutes expiry
  - Refresh tokens: 7 days expiry with rotation
- **API Keys:** SHA-256 hashed, only shown once on creation
- **Audit Logging:** All auth events logged with timestamps
- **CORS:** Configured for frontend integration

### Database Schema Design
```sql
users 
(user_id, email, hashed_password, full_name, is_active, is_verified, created_at, updated_at, last_login)

roles 
(role_id, role_name, description, created_at)

permissions 
(permission_id, permission_name, resource, action, description)

user_roles
 (user_id, role_id, assigned_at, assigned_by)

role_permissions 
(role_id, permission_id, granted_at)

api_keys 
(key_id, user_id, key_hash, key_prefix, name, scopes, created_at, revoked_at, last_used_at, expires_at)

refresh_tokens 
(token_id, user_id, token_hash, expires_at, created_at, revoked_at, device_info)

auth_audit_log 
(log_id, user_id, event_type, ip_address, user_agent, success, metadata, created_at)
```

### Role-Permission Matrix

| Permission | Admin | Developer | End User |
|------------|-------|-----------|----------|
| kb.create | ✅ | ❌ | ❌ |
| kb.read | ✅ | ✅ | ❌ |
| kb.update | ✅ | ❌ | ❌ |
| kb.delete | ✅ | ❌ | ❌ |
| doc.read | ✅ | ✅ | ❌ |
| doc.delete | ✅ | ❌ | ❌ |
| doc.reprocess | ✅ | ❌ | ❌ |
| query.execute | ✅ | ✅ | ✅ |
| sync.configure | ✅ | ❌ | ❌ |
| sync.trigger | ✅ | ❌ | ❌ |
| sync.view_status | ✅ | ✅ | ❌ |
| analytics.view | ✅ | ✅ | ❌ |
| user.create | ✅ | ❌ | ❌ |
| user.read | ✅ | ❌ | ❌ |
| user.update | ✅ | ❌ | ❌ |
| user.delete | ✅ | ❌ | ❌ |
| apikey.create | ✅ | ✅ | ❌ |
| apikey.read | ✅ | ✅ | ❌ |
| apikey.revoke | ✅ | ✅ | ❌ |


## Files Changed/Added

### New Files
```
backend/cloud-sync-service/
├── config.py                    # Configuration management
├── database.py                  # Database connection pool
├── models/
│   ├── __init__.py
│   ├── auth.py                  # Auth request/response models
│   └── user.py                  # User models
├── utils/
│   ├── __init__.py
│   ├── password.py              # Password hashing utilities
│   └── jwt.py                   # JWT token utilities
├── middleware/
│   ├── __init__.py
│   ├── auth.py                  # Authentication middleware
│   └── permissions.py           # Authorization middleware
└── routes/
    ├── __init__.py
    ├── auth.py                  # Auth endpoints
    ├── users.py                 # User management endpoints
    └── api_keys.py              # API key endpoints

backend/database/
├── init.sql                     # Database schema creation
└── seed.sql                     # Initial data seeding

docs/
└── AUTH_IMPLEMENTATION.md       # This document
```

## API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Usage Examples

### 1. Register a new user
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Access protected endpoint
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

### 4. Create API key
```bash
curl -X POST "http://localhost:8000/api/v1/api-keys" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "scopes": ["kb.read", "query.execute"],
    "expires_in_days": 90
  }'
```

## Environment Variables

Required environment variables for the auth service:
```env
DATABASE_URL=postgresql://user:password@postgres:5432/openwebui
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12
```

## Migration Guide

To enable authentication on an existing deployment:

1. **Run database migrations:**
```bash
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/init.sql
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/seed_user_kb.sql
# Do not run backend/database/seed_documents.sql unless you want demo KB/document data
```

2. **Restart services:**
```bash
docker-compose restart cloud-sync-service
```

3. **Create admin user via SQL:**
```sql
-- Promote first user to admin
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.user_id,
  r.role_id
FROM users u, roles r
WHERE u.email = 'your-email@example.com'
  AND r.role_name = 'admin';
```

## Security Considerations

- All passwords are hashed with bcrypt (12 rounds)
- JWT tokens are signed and validated
- Refresh tokens are stored hashed in database
- API keys are stored hashed (SHA-256)
- Full audit logging of authentication events
- Protection against common attacks (SQL injection, XSS via Pydantic validation)
- CORS properly configured
- Tokens have appropriate expiration times

## Breaking Changes

⚠️ **This PR introduces authentication requirements:**
- All endpoints except `/` and `/health` now require authentication
- Existing integrations will need to implement login flow
- API users must generate API keys for programmatic access
