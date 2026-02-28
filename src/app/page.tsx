import { prisma } from "@/lib/prisma";
import ClockClient from "./ClockClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let users: { id: string; name: string; pin_code: string }[];
  let activeEntries: { clock_in_time: Date; user: { id: string; name: string; pin_code: string } }[];

  try {
    [users, activeEntries] = await Promise.all([
      prisma.user.findMany({
        where: { role: "EMPLOYEE", is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, pin_code: true },
      }),
      prisma.timeEntry.findMany({
        where: { clock_out_time: null },
        orderBy: { clock_in_time: "asc" },
        select: {
          clock_in_time: true,
          user: { select: { id: true, name: true, pin_code: true } },
        },
      }),
    ]);
  } catch (err) {
    console.error("Home page database error:", err);
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-slate-800">Unable to load</h1>
          <p className="mt-2 text-slate-600">
            The database connection failed. If you just deployed, check that <code className="rounded bg-slate-200 px-1 text-sm">DATABASE_URL</code> is set in your hosting environment (e.g. Vercel or Netlify environment variables) and points to a running Supabase (or Postgres) instance. Use the <strong>Session pooler</strong> URL (port 6543) for serverless—see DEPLOYMENT.md.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            See <a href="https://github.com/rehanch94/TimeTracker/blob/main/DEPLOYMENT.md" className="text-blue-600 underline">DEPLOYMENT.md</a> and <a href="https://github.com/rehanch94/TimeTracker/blob/main/VERCEL_SUPABASE_SETUP.md" className="text-blue-600 underline">VERCEL_SUPABASE_SETUP.md</a> for setup steps.
          </p>
        </div>
      </main>
    );
  }

  const employees = users.map(({ id, name, pin_code }) => ({
    id,
    name,
    pinLength: pin_code.length,
  }));

  const activeNow = activeEntries.map((e) => ({
    userId: e.user.id,
    userName: e.user.name,
    clockedInAt: e.clock_in_time.toISOString(),
    pinLength: e.user.pin_code.length,
  }));

  return <ClockClient employees={employees} activeNow={activeNow} />;
}

