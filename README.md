# Time Tracking

A time-tracking web app inspired by Square Team Management. Built with **Next.js (App Router)**, **Tailwind CSS**, **Prisma**, and **SQLite** or **Supabase (PostgreSQL)**.

## Business rules

- **Timezones:** All timestamps are stored in **UTC** in the database. The UI shows times in the user’s local timezone.
- **Double-punch prevention:** You cannot clock in if you already have an active shift (no second clock-in until you clock out).
- **Backend calculations:** Total hours are computed on the server when clocking out, not on the client.
- **Auditing:** When a time entry is edited (e.g. by a manager), an `AuditLog` row is created with who changed it, when, and the previous clock in/out values. The original data is not overwritten without this log.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database**

   Copy the example env and push the schema to SQLite:

   ```bash
   cp .env.example .env
   npx prisma db push
   npx prisma db seed
   ```

   Seeded users:

   - **Admin** — PIN: `1234`
   - **Jane Employee** — PIN: `5678`

3. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Enter a PIN, click **Go**, then use **Clock In** / **Clock Out**.

## Clocking in/out (employee select + PIN)

On the home page, **select your employee name first**, then **confirm with your PIN** before clocking in/out.

## Admin console

- Visit: `/admin/login`
- Use **Admin PIN**: `1234`
- Features:
  - Toggle employees active/inactive
  - Add employees
  - View time-entry history + audit history
  - Export a local SQL dump file to `exports/` inside the project

## Deploying (Vercel + Supabase)

Deploy on **Vercel** with **Supabase** as the database. See **[VERCEL_SUPABASE_SETUP.md](./VERCEL_SUPABASE_SETUP.md)** for setup steps.

## Scripts

- `npm run dev` — Start dev server
- `npm run build` / `npm start` — Production build and start
- `npm run db:push` — Apply Prisma schema to SQLite
- `npm run db:seed` — Seed users (PINs above)
- `npm run db:studio` — Open Prisma Studio

## Schema (summary)

- **User:** `id`, `name`, `role` (ADMIN | EMPLOYEE), `pin_code`
- **TimeEntry:** `id`, `user_id`, `clock_in_time`, `clock_out_time`, `total_hours`, `is_edited`
- **AuditLog:** `id`, `time_entry_id`, `edited_by_user_id`, `edited_at`, `previous_clock_in`, `previous_clock_out`

Editing a time entry is done via the `editTimeEntry` server action (e.g. from a future admin screen); it always creates an `AuditLog` before updating the entry.
# TimeTracker
