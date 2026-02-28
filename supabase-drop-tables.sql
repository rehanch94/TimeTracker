-- Drop Time Tracking tables (run in Supabase SQL Editor if you need to re-run Prisma db push)
-- Order matters: drop tables that reference others first.

DROP TRIGGER IF EXISTS "User_updatedAt" ON "User";
DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS "AuditLog";
DROP TABLE IF EXISTS "TimeEntry";
DROP TABLE IF EXISTS "Schedule";
DROP TABLE IF EXISTS "Setting";
DROP TABLE IF EXISTS "User";
