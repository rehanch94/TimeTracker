# Deploying with Supabase (Vercel or Netlify)

The app uses **Supabase** (Postgres) as the database. Set `DATABASE_URL` (and `ADMIN_SESSION_SECRET`) in your host’s environment variables so the app can connect.

---

## Vercel

1. **Vercel Dashboard** → your project → **Settings** → **Environment Variables**.
2. Add **`DATABASE_URL`** and **`ADMIN_SESSION_SECRET`** (see “Getting `DATABASE_URL`” and table below).
3. **Use the Session pooler URL** (recommended for Vercel serverless):
   - Supabase → **Settings** → **Database** → **Connection string** → **URI**.
   - Choose **Session** (pooler, port **6543**). It looks like:  
     `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Replace `[YOUR-PASSWORD]` with your database password. Add `?sslmode=require` if needed.
   - For Prisma on serverless, append: `?sslmode=require&connection_limit=1`
4. Save and **Redeploy** (Deployments → … → Redeploy) so new env vars apply.

If the Vercel–Supabase integration has already set `SUPABASE_DATABASE_URL`, the app will use that when `DATABASE_URL` is not set (see `src/lib/prisma.ts`). Otherwise you must set `DATABASE_URL` yourself.

---

## Netlify

**If you use Netlify’s Supabase integration:** The integration may set `SUPABASE_DATABASE_URL`. The app uses that when `DATABASE_URL` is not set.

**Otherwise**, in **Netlify Dashboard** → your site → **Site configuration** → **Environment variables**, add:

| Variable | Value | Scopes |
|----------|--------|--------|
| `DATABASE_URL` | Your Supabase Postgres connection string | All |
| `ADMIN_SESSION_SECRET` | A long random string (e.g. 32+ chars) | All |

### Getting `DATABASE_URL`

1. **Supabase Dashboard** → your project → **Settings** → **Database**.
2. Under **Connection string**, choose **URI**.
3. For **Vercel / serverless**: use the **Session** pooler (port **6543**). Example:  
   `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1`  
   Replace `[YOUR-PASSWORD]` and ensure `[PROJECT-REF]` and `[REGION]` match your Supabase project.
4. For **Netlify (serverless):** use the Session pooler or direct URL and append `&connection_limit=1` (e.g. `...?sslmode=require&connection_limit=1`).
5. Paste the final URL as `DATABASE_URL` in your host’s environment variables.

### Optional (if you use Supabase features later)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key  
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (keep secret)

---

## 2. Build and deploy

- **Build command:** `npm run build` (set in `netlify.toml`).
- **Node version:** 20 (set in `netlify.toml`).
- On each push to your linked branch, Netlify runs `npm install`, `prisma generate` (via `postinstall`), and `next build`.

No need to run `prisma db push` on Netlify; the schema already exists in Supabase. Seed data (admin, employees) should be in Supabase from when you ran `npm run db:seed` locally.

---

## 3. After deploy

- Open your Netlify site URL.
- Admin: go to `/admin/login` and sign in with your admin PIN (e.g. `1234` if you used the seed).
- The **Update .sql** button in Admin does nothing when using Supabase; the app shows a short message instead. SQL export is only for local SQLite.

---

## 4. Switching back to local SQLite

- In `.env` (local): set `DATABASE_URL="file:./dev.db"`.
- In `prisma/schema.prisma`: set `provider = "sqlite"`.
- Run `npx prisma generate` and `npx prisma db push` (and optionally `npm run db:seed`) locally.  
Netlify will keep using whatever `DATABASE_URL` you set in its environment.
