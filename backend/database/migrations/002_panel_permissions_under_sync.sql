-- Migration: 002_panel_permissions_under_sync.sql
-- Move user_management.access and role_management.access under the sync resource group
-- so they appear grouped with sync operations in the role editor.

UPDATE permissions
SET resource = 'sync', action = 'user_management'
WHERE permission_name = 'user_management.access';

UPDATE permissions
SET resource = 'sync', action = 'role_management'
WHERE permission_name = 'role_management.access';
