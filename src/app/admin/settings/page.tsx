import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getWeekStartDay, getSchedules } from "../actions";
import { WEEKDAY_NAMES } from "@/lib/week";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  await requireAdmin();

  // Same active-employees list as Admin: not ADMIN, is_active
  const activeEmployees = await prisma.user.findMany({
    where: { role: { not: "ADMIN" }, is_active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let weekStartDay = 0;
  let scheduleData: { userId: string; userName: string; byDay: number[] }[] = [];
  try {
    weekStartDay = await getWeekStartDay();
    scheduleData = await getSchedules();
  } catch (err) {
    console.error("Settings page data load failed:", err);
  }

  // Merge: use same employee list as Admin; fill schedule from getSchedules or zeros
  const scheduleByUserId = new Map(
    scheduleData.map((s) => [s.userId, s.byDay])
  );
  const schedules = activeEmployees.map((e) => ({
    userId: e.id,
    userName: e.name,
    byDay: scheduleByUserId.get(e.id) ?? [0, 0, 0, 0, 0, 0, 0],
  }));

  return (
    <SettingsClient
      weekStartDay={weekStartDay}
      weekDayOptions={WEEKDAY_NAMES.map((name, i) => ({ value: i, label: name }))}
      schedules={schedules}
      dayLabels={WEEKDAY_NAMES.map((n) => n.slice(0, 3))}
    />
  );
}
