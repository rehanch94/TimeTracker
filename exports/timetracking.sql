-- TimeTracking (SQLite)
-- Updated at (UTC): 2026-02-27T03:41:40.215Z

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "time_entry_id" TEXT NOT NULL,
    "edited_by_user_id" TEXT NOT NULL,
    "edited_at" DATETIME NOT NULL,
    "previous_clock_in" DATETIME NOT NULL,
    "previous_clock_out" DATETIME,
    CONSTRAINT "AuditLog_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "TimeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "clock_in_time" DATETIME NOT NULL,
    "clock_out_time" DATETIME,
    "total_hours" REAL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TimeEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "pin_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "AuditLog" ("id", "time_entry_id", "edited_by_user_id", "edited_at", "previous_clock_in", "previous_clock_out") VALUES ('cmm4cieid000ekp7gnyu4fyz9', 'cmm4bw44b000akp7g0d4q5sl4', 'seed-admin', '2026-02-27T03:41:40.208Z', '2026-02-27T03:24:20.315Z', '2026-02-27T03:27:40.040Z');

INSERT INTO "TimeEntry" ("id", "user_id", "clock_in_time", "clock_out_time", "total_hours", "is_edited") VALUES ('cmm4bgglv0004kp7gj9hg00be', 'cmm4bffxu0002kp7g6ms600pu', '2026-02-27T03:12:10.000Z', '2026-02-27T03:12:26.683Z', 0, 0);
INSERT INTO "TimeEntry" ("id", "user_id", "clock_in_time", "clock_out_time", "total_hours", "is_edited") VALUES ('cmm4bj1dn0006kp7gzga02le4', 'cmm4bffxu0002kp7g6ms600pu', '2026-02-27T03:14:10.235Z', NULL, NULL, 0);
INSERT INTO "TimeEntry" ("id", "user_id", "clock_in_time", "clock_out_time", "total_hours", "is_edited") VALUES ('cmm4bjdti0008kp7gi1kioc1s', 'cmm4b7m9n0000kp7gqglb3v5s', '2026-02-27T03:14:26.358Z', '2026-02-27T03:24:12.343Z', 0.16, 0);
INSERT INTO "TimeEntry" ("id", "user_id", "clock_in_time", "clock_out_time", "total_hours", "is_edited") VALUES ('cmm4bw44b000akp7g0d4q5sl4', 'cmm4bc7os0001kp7gsqbjchx6', '2026-02-25T03:24:00.000Z', '2026-02-27T03:27:00.000Z', 48.05, 1);
INSERT INTO "TimeEntry" ("id", "user_id", "clock_in_time", "clock_out_time", "total_hours", "is_edited") VALUES ('cmm4cbrpe000ckp7gzekoly3i', 'cmm4b7m9n0000kp7gqglb3v5s', '2026-02-27T03:36:30.722Z', NULL, NULL, 0);

INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt") VALUES ('seed-admin', 'Admin', 'ADMIN', '1234', 1, '2026-02-27T02:50:04.906Z', '2026-02-27T02:50:04.906Z');
INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt") VALUES ('seed-employee', 'Jane Employee', 'EMPLOYEE', '5678', 0, '2026-02-27T02:50:04.913Z', '2026-02-27T03:05:25.008Z');
INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt") VALUES ('cmm4b7m9n0000kp7gqglb3v5s', 'Bob', 'EMPLOYEE', '6789', 1, '2026-02-27T03:05:17.436Z', '2026-02-27T03:05:17.436Z');
INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt") VALUES ('cmm4bc7os0001kp7gsqbjchx6', 'Test', 'EMPLOYEE', '1230', 1, '2026-02-27T03:08:51.821Z', '2026-02-27T03:08:51.821Z');
INSERT INTO "User" ("id", "name", "role", "pin_code", "is_active", "createdAt", "updatedAt") VALUES ('cmm4bffxu0002kp7g6ms600pu', 'Longer test', 'EMPLOYEE', '123456', 1, '2026-02-27T03:11:22.483Z', '2026-02-27T03:11:22.483Z');

COMMIT;
PRAGMA foreign_keys=ON;
