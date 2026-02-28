# Vercel + Supabase setup

Use this when the app is deployed on **Vercel** with **Supabase** as the database. Tables are created in Supabase by running **`supabase-schema.sql`** in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

---

## 1. Connect Vercel to Supabase

- In **Vercel**: link the project to your **Supabase** project (e.g. Integrations → Supabase, or connect when creating the project).
- The integration provides the database URL. The app uses it via `SUPABASE_DATABASE_URL` when set (see `src/lib/prisma.ts`). You do not need to add `DATABASE_URL` manually if the integration is connected.

---

## 2. Seed initial data (once)

You need at least one admin so you can log in at `/admin/login`.

1. In Supabase, get your **Database** connection string: **Settings** → **Database** → **Connection string** → **URI** (use **Session** pooler or **Direct**).
2. In the project root, create **`.env`** with (replace with your password and project ref):

   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   ```

3. Run:

   ```bash
   npm run db:seed
   ```

This creates **Admin** (PIN `1234`) and **Jane Employee** (PIN `5678`). You can change PINs later in the app.

---

## 3. Set admin session secret (Vercel)

- **Vercel** → your project → **Settings** → **Environment Variables**.
- Add **`ADMIN_SESSION_SECRET`** = any long random string (e.g. 32+ characters) for Production (and Preview/Development if you use them).
- Save and **Redeploy** (Deployments → … → Redeploy) so the variable is applied.

---

## 4. Verify

- Open your Vercel app URL → **/admin/login** → log in with PIN **1234**. If that works, the setup is correct.

---

## Checklist

- [ ] Tables created in Supabase (ran `supabase-schema.sql` in SQL Editor).
- [ ] Vercel project connected to Supabase (integration).
- [ ] Seed run locally so admin (PIN 1234) exists.
- [ ] `ADMIN_SESSION_SECRET` set in Vercel; redeployed.
- [ ] Admin login works on the live site.
