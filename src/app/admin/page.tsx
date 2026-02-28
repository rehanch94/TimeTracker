import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { getWeekStartDay, getSchedules } from "./actions";
import { getWeekBoundsUtc } from "@/lib/week";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const admin = await requireAdmin();

  let weekStartDay = 0;
  try {
    weekStartDay = await getWeekStartDay();
  } catch {
    weekStartDay = 0;
  }

  const { start: weekStart, end: weekEnd } = getWeekBoundsUtc(weekStartDay);

  let users: Awaited<ReturnType<typeof prisma.user.findMany>> = [];
  let entries: Awaited<ReturnType<typeof prisma.timeEntry.findMany>> = [];
  let audits: Awaited<ReturnType<typeof prisma.auditLog.findMany>> = [];
  let weekEntries: Awaited<ReturnType<typeof prisma.timeEntry.findMany>> = [];

  try {
    [users, entries, audits, weekEntries] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true, is_active: true, pin_code: true },
      }),
      prisma.timeEntry.findMany({
        orderBy: { clock_in_time: "desc" },
        take: 500,
        select: {
          id: true,
          clock_in_time: true,
          clock_out_time: true,
          total_hours: true,
          is_edited: true,
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { edited_at: "desc" },
        take: 500,
        select: {
          id: true,
          time_entry_id: true,
          edited_at: true,
          previous_clock_in: true,
          previous_clock_out: true,
          edited_by_user: { select: { id: true, name: true } },
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          clock_in_time: { gte: weekStart, lt: weekEnd },
          clock_out_time: { not: null },
        },
        select: {
          user_id: true,
          clock_in_time: true,
          total_hours: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);
  } catch (err) {
    console.error("Admin page data load failed:", err);
    return (
      <main className="min-h-screen p-6 bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">Admin Console</h1>
          <p className="mt-2 text-red-600">
            Failed to load data. Check the server console for details.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            If you just added the Setting table, run: npx prisma db push
          </p>
        </div>
      </main>
    );
  }

  let schedules: { userId: string; userName: string; byDay: number[] }[] = [];
  try {
    schedules = await getSchedules();
  } catch {
    // optional: show totals without schedule highlighting
  }

  const weekStartMs = weekStart.getTime();
  const msPerDay = 86400000;
  const actualByDayMap = new Map<string, number[]>();
  const weeklyTotalsMap = new Map<string, { userName: string; totalHours: number }>();
  for (const e of weekEntries) {
    const current = weeklyTotalsMap.get(e.user_id);
    const hours = e.total_hours ?? 0;
    if (current) {
      current.totalHours += hours;
    } else {
      weeklyTotalsMap.set(e.user_id, { userName: e.user.name, totalHours: hours });
    }
    const dayIndex = Math.floor((e.clock_in_time.getTime() - weekStartMs) / msPerDay);
    if (dayIndex >= 0 && dayIndex < 7) {
      let arr = actualByDayMap.get(e.user_id);
      if (!arr) {
        arr = [0, 0, 0, 0, 0, 0, 0];
        actualByDayMap.set(e.user_id, arr);
      }
      arr[dayIndex] += hours;
    }
  }
  const scheduleByUser = new Map(schedules.map((s) => [s.userId, s]));
  const allUserIds = new Set([
    ...weeklyTotalsMap.keys(),
    ...schedules.map((s) => s.userId),
  ]);
  const weeklyTotals = Array.from(allUserIds)
    .map((userId) => {
      const totalData = weeklyTotalsMap.get(userId);
      const totalHours = totalData?.totalHours ?? 0;
      const userName = totalData?.userName ?? scheduleByUser.get(userId)?.userName ?? "—";
      const schedule = scheduleByUser.get(userId);
      const byDay = schedule?.byDay ?? [0, 0, 0, 0, 0, 0, 0];
      const scheduledByDay = Array.from({ length: 7 }, (_, i) => byDay[(weekStartDay + i) % 7]);
      const scheduledTotal = scheduledByDay.reduce((a, b) => a + b, 0);
      const actualByDay = actualByDayMap.get(userId) ?? [0, 0, 0, 0, 0, 0, 0];
      return {
        userId,
        userName,
        totalHours,
        scheduledTotal,
        actualByDay,
        scheduledByDay,
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName));

  return (
    <AdminClient
      adminId={admin.id}
      adminName={admin.name}
      users={users}
      weekStartDay={weekStartDay}
      weeklyTotals={weeklyTotals}
      weekStartIso={weekStart.toISOString()}
      weekEndIso={weekEnd.toISOString()}
      entries={entries.map((e) => ({
        ...e,
        clock_in_time: e.clock_in_time.toISOString(),
        clock_out_time: e.clock_out_time ? e.clock_out_time.toISOString() : null,
      }))}
      audits={audits.map((a) => ({
        ...a,
        edited_at: a.edited_at.toISOString(),
        previous_clock_in: a.previous_clock_in.toISOString(),
        previous_clock_out: a.previous_clock_out ? a.previous_clock_out.toISOString() : null,
      }))}
    />
  );
}

