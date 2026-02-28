# Run the app with Supabase (PostgreSQL)

Use this when you want the app to use Supabase as the database instead of local SQLite.

---

## 1. Get your Supabase connection string

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Settings** (gear) → **Database**.
3. Under **Connection string**, choose **URI**.
4. Copy the connection string. It looks like:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   Or for **direct** connection (recommended for Prisma):
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your **database password** (the one you set when creating the project). If you forgot it, use **Reset database password** on the same page.

Replace `[PROJECT-REF]` with your project reference (find it in the Supabase Dashboard URL or in Settings → General). The direct URL looks like:
```text
postgresql://postgres:YOUR_PASSWORD@db.[PROJECT-REF].supabase.co:5432/postgres
```
If you get SSL errors, add `?sslmode=require` at the end of the URL.

---

## 2. Point the app at Supabase

In your project root, edit **`.env`** (create it from `.env.example` if needed):

1. **Comment out or remove** the SQLite line:
   ```env
   # DATABASE_URL="file:./dev.db"
   ```
2. **Set** `DATABASE_URL` to your Supabase connection string (use the one with your real password):
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
   Keep your other vars (`ADMIN_SESSION_SECRET`, Supabase anon/secret keys if you use them).

---

## 3. Use one database (Prisma or manual SQL)

You can either let Prisma create the schema, or keep the tables you created with the manual SQL.

### Option A – Let Prisma create the schema (recommended)

1. In Supabase **SQL Editor**, run **`supabase-drop-tables.sql`** (in this repo) to drop the existing Time Tracking tables if you already ran `supabase-schema.sql`.
2. In your project directory, run:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
   This creates the tables in Supabase from your Prisma schema.

### Option B – Keep your existing tables from the manual SQL

If you already ran `supabase-schema.sql` and want to keep that schema:

1. Do **not** run `prisma db push` (it may try to recreate tables).
2. Just generate the client:
   ```bash
   npx prisma generate
   ```
   Prisma will work against the existing tables as long as table/column names match the schema (they do in `supabase-schema.sql`).

---

## 4. Seed initial data (admin + test employee)

Run the seed script so you have an admin and a test employee:

```bash
npm run db:seed
```

This creates:

- **Admin** – PIN `1234` (for admin login).
- **Jane Employee** – PIN `5678` (for clock in/out).

You can change PINs and add more users later in the app.

---

## 5. Run the app

```bash
npm run dev
```

Open the app (e.g. http://localhost:3000). Log in to admin with PIN **1234**. The app is now using Supabase as the database.

---

## Troubleshooting

- **“Can’t reach database” / connection errors**  
  - Use the **direct** connection string (port **5432**, host `db....supabase.co`), not the pooler (port 6543), for `DATABASE_URL` with Prisma.
  - Check that your IP is allowed: Supabase Dashboard → **Settings** → **Database** → **Connection pooling** / **Restrictions** (and “Allow all” for dev if needed).

- **“Relation does not exist”**  
  - Tables weren’t created. Run **Option A** (drop tables, then `npx prisma db push`) or run `supabase-schema.sql` and then **Option B** (`npx prisma generate` only).

- **SSL**  
  - Supabase uses SSL. If you see SSL errors, add `?sslmode=require` to the end of `DATABASE_URL`:
    ```text
    postgresql://postgres:YOUR_PASSWORD@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
    ```
    Prisma usually handles Supabase SSL by default.

- **Switch back to SQLite**  
  - In `.env`, set:
    ```env
    DATABASE_URL="file:./dev.db"
    ```
  - In `prisma/schema.prisma`, set `provider = "sqlite"` again, then run `npx prisma generate` and `npx prisma db push` if you want a fresh local DB.

---

## Summary checklist

- [ ] Supabase project created and database password known  
- [ ] `DATABASE_URL` in `.env` set to Supabase Postgres URI (direct, port 5432)  
- [ ] Prisma schema uses `provider = "postgresql"` (already set in this repo)  
- [ ] Either: dropped old tables and ran `npx prisma db push`, or kept existing tables and ran `npx prisma generate`  
- [ ] Ran `npm run db:seed`  
- [ ] `npm run dev` and admin login with PIN 1234 works  

After that, the app is running with Supabase as the database.
