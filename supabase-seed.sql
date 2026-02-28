-- Seed admin and test employee. Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Use this if "npm run db:seed" from your machine can't reach the database (e.g. IPv6-only direct connection).

INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt")
VALUES
  ('seed-admin', 'Admin', 'ADMIN', '1234', true, now(), now()),
  ('seed-employee', 'Jane Employee', 'EMPLOYEE', '5678', true, now(), now())
ON CONFLICT ("id") DO NOTHING;
