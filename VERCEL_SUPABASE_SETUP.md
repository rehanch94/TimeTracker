# Fix connections: Vercel + new Supabase

Use this when your app is deployed on **Vercel** and connected to a **new Supabase** project (empty database). Do the steps below in order.

---

## 1. Create tables in your new Supabase database

Your new Supabase project has no tables yet. Use **one** of these options.

### Option A – Run the SQL schema (quick)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your **new** project.
2. Go to **SQL Editor** → **New query**.
3. Copy the entire contents of **`supabase-schema.sql`** (in this repo) and paste into the editor.
4. Click **Run**. Tables `User`, `Schedule`, `TimeEntry`, `AuditLog`, and `Setting` will be created.

### Option B – Use Prisma from your machine

1. Get your **Database** connection string from Supabase: **Settings** → **Database** → **Connection string** → **URI**.
2. Use the **direct** URL (port **5432**, host `db.[PROJECT-REF].supabase.co`). Replace `[YOUR-PASSWORD]` with your database password. Example:
   ```text
   postgresql://postgres:YOUR_PASSWORD@db.XXXXXXXX.supabase.co:5432/postgres?sslmode=require
   ```
3. In the project root, create or edit **`.env`** and set:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.XXXXXXXX.supabase.co:5432/postgres?sslmode=require"
   ```
4. Run:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
   This creates the tables in your new Supabase from the Prisma schema.

---

## 2. Seed initial data (admin + test employee)

You need at least one admin and optionally a test employee so you can log in.

**If you used Option A (SQL):** Run the seed from your machine so the new Supabase DB gets the data:

1. In **`.env`** set `DATABASE_URL` to your new Supabase connection string (same as in Option B step 2).
2. Run:
   ```bash
   npm run db:seed
   ```

**If you used Option B:** You already have `DATABASE_URL` set. Run:

```bash
npm run db:seed
```

This creates:

- **Admin** – PIN `1234` (for `/admin/login`).
- **Jane Employee** – PIN `5678` (for clock in/out).

---

## 3. Set environment variables in Vercel

Vercel needs the same credentials so the deployed app can talk to Supabase.

**Important:** For Vercel (serverless), use the **Session pooler** URL, not the direct connection. The direct URL (port 5432) can cause “connection failed” or “too many connections” under serverless.

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your **TimeTracker** project.
2. Go to **Settings** → **Environment Variables**.
3. Add these (for **Production**, **Preview**, and **Development** if you use Vercel dev):

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | **Session pooler** URI (see below) | Use port **6543** and add `?sslmode=require&connection_limit=1` at the end |
| `ADMIN_SESSION_SECRET` | A long random string (e.g. 32+ chars) | For admin session cookies; generate one and keep it secret |

**Getting the Session pooler URL:**

- Supabase Dashboard → **Settings** → **Database** → **Connection string**.
- Select **Session** (not “Direct”). Copy the URI. It looks like:  
  `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- Replace `[YOUR-PASSWORD]` with your database password.
- Append: `?sslmode=require&connection_limit=1`  
  Example: `...pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1`

**Optional** (if the app uses Supabase client features):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://XXXX.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) |

**Where to get Supabase values:**

- **Project URL / anon key / service role:** Supabase Dashboard → **Settings** → **API**.
- **Database password:** **Settings** → **Database**; use it in `DATABASE_URL`. If you forgot it, use **Reset database password**.

4. Save. **Redeploy** the project (**Deployments** → … on latest deployment → **Redeploy**) so the new env vars are applied. Without a redeploy, the running app won’t see the new variables.

---

## 4. Confirm the app uses the database

- Open your Vercel app URL.
- Go to **/admin/login** and log in with PIN **1234**.
- If that works, the connection from Vercel to your new Supabase is correct.

---

## Summary checklist

- [ ] Tables created in new Supabase (Option A or B).
- [ ] Seed run so admin (PIN 1234) and test employee exist.
- [ ] `DATABASE_URL` and `ADMIN_SESSION_SECRET` set in Vercel.
- [ ] Redeployed on Vercel.
- [ ] Admin login works on the live site.
