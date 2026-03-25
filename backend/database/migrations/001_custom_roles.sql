-- Migration: 001_custom_roles.sql
-- Enables dynamic/custom roles by removing the hardcoded role name constraint
-- and adding metadata columns for who can create/modify users of each role.

-- Remove enum constraint so custom role names are allowed
ALTER TABLE roles DROP CONSTRAINT IF EXISTS role_name_check;

-- Add metadata columns
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_be_created_by JSONB DEFAULT '[]';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_be_modified_by JSONB DEFAULT '[]';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Mark built-in roles as system roles
UPDATE roles SET is_system = true WHERE role_name IN ('admin', 'developer', 'end_user');

-- Seed create/modify access for system roles (matches prior hardcoded logic)
UPDATE roles SET
    can_be_created_by = '["admin"]'::jsonb,
    can_be_modified_by = '["admin"]'::jsonb
WHERE role_name = 'admin' AND (can_be_created_by = '[]'::jsonb OR can_be_created_by IS NULL);

UPDATE roles SET
    can_be_created_by = '["admin", "developer"]'::jsonb,
    can_be_modified_by = '["admin", "developer"]'::jsonb
WHERE role_name = 'developer' AND (can_be_created_by = '[]'::jsonb OR can_be_created_by IS NULL);

UPDATE roles SET
    can_be_created_by = '["admin", "developer", "end_user"]'::jsonb,
    can_be_modified_by = '["admin", "developer"]'::jsonb
WHERE role_name = 'end_user' AND (can_be_created_by = '[]'::jsonb OR can_be_created_by IS NULL);
