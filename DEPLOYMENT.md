# Deploying on Vercel with Supabase

The app is deployed on **Vercel** and uses **Supabase** as the database.

- Create tables in Supabase by running **`supabase-schema.sql`** in the Supabase SQL Editor.
- Connect the Vercel project to Supabase (Integrations). The integration provides the database connection; you do not need to add keys manually.
- Set **`ADMIN_SESSION_SECRET`** in Vercel (Settings → Environment Variables), then redeploy.
- Run **`npm run db:seed`** locally (with `DATABASE_URL` in `.env` pointing to your Supabase DB) once to create the admin and test employee.

Full steps: **[VERCEL_SUPABASE_SETUP.md](./VERCEL_SUPABASE_SETUP.md)**.
