-- Time Tracking app schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- All timestamps stored in UTC (use timestamptz).

-- Optional: enable UUID extension if you prefer uuid over cuid for new tables later
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- User (employees + admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "role"        TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "pin_code"    TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User" ("role");
CREATE INDEX IF NOT EXISTS "User_is_active_idx" ON "User" ("is_active");

COMMENT ON TABLE "User" IS 'Employees and admin; role is ADMIN or EMPLOYEE. Multiple employees may share a PIN.';

-- ---------------------------------------------------------------------------
-- Schedule (expected hours per day per employee)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Schedule" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "user_id"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "day_of_week" INTEGER NOT NULL,
  "hours"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "Schedule_user_id_day_of_week_key" UNIQUE ("user_id", "day_of_week")
);

CREATE INDEX IF NOT EXISTS "Schedule_user_id_idx" ON "Schedule" ("user_id");

COMMENT ON COLUMN "Schedule"."day_of_week" IS '0 = Sunday, 6 = Saturday';

-- ---------------------------------------------------------------------------
-- TimeEntry (clock in/out)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TimeEntry" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "user_id"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "clock_in_time"  TIMESTAMPTZ NOT NULL,
  "clock_out_time" TIMESTAMPTZ,
  "total_hours"    DOUBLE PRECISION,
  "is_edited"      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "TimeEntry_user_id_idx" ON "TimeEntry" ("user_id");
CREATE INDEX IF NOT EXISTS "TimeEntry_user_id_clock_out_time_idx" ON "TimeEntry" ("user_id", "clock_out_time");

COMMENT ON TABLE "TimeEntry" IS 'clock_out_time null = active shift. total_hours set when clocking out.';

-- ---------------------------------------------------------------------------
-- AuditLog (history when time entries are edited)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"                  TEXT NOT NULL PRIMARY KEY,
  "time_entry_id"        TEXT NOT NULL REFERENCES "TimeEntry"("id") ON DELETE CASCADE,
  "edited_by_user_id"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "edited_at"            TIMESTAMPTZ NOT NULL,
  "previous_clock_in"   TIMESTAMPTZ NOT NULL,
  "previous_clock_out"   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "AuditLog_time_entry_id_idx" ON "AuditLog" ("time_entry_id");

-- ---------------------------------------------------------------------------
-- Setting (key-value, e.g. week_start_day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Setting" (
  "id"    TEXT NOT NULL PRIMARY KEY,
  "key"   TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Optional: trigger to keep User.updatedAt in sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_updatedAt" ON "User";
CREATE TRIGGER "User_updatedAt"
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
