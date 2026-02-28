# Deploying to Netlify with Supabase

The app is set up to deploy on **Netlify** with **Supabase** as the database. Push to your connected Git repo to trigger builds.

---

## 1. Netlify environment variables

In **Netlify Dashboard** → your site → **Site configuration** → **Environment variables**, add:

| Variable | Value | Scopes |
|----------|--------|--------|
| `DATABASE_URL` | Your Supabase Postgres connection string | All |
| `ADMIN_SESSION_SECRET` | A long random string (e.g. 32+ chars) | All |

### Getting `DATABASE_URL`

1. **Supabase Dashboard** → your project → **Settings** → **Database**.
2. Under **Connection string**, choose **URI**.
3. Use either:
   - **Direct** (recommended for fewer connection issues):  
     `postgresql://postgres:[YOUR-PASSWORD]@db.fxyditvfqtikuqphbmau.supabase.co:5432/postgres?sslmode=require`
   - **Session pooler** (good for serverless): copy the **Session** URI and replace `[YOUR-PASSWORD]` with your database password.
4. **For Netlify (serverless):** append `&connection_limit=1` to the URL so you don’t exhaust Supabase connections (e.g. `...?sslmode=require&connection_limit=1`).
5. Paste the final URL into Netlify as `DATABASE_URL`.

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
