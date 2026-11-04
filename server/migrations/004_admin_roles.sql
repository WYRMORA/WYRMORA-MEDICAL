-- Add privileged roles without changing existing users or medicine records.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer','seller','admin','super_admin','editor'));
CREATE INDEX IF NOT EXISTS users_role_active_idx ON users(role,is_active);
