"use server";

import { prisma } from "@/lib/prisma";
import { clearAdminSession, requireAdmin, setAdminSession } from "@/lib/adminAuth";
import { saveDatabaseToSql, SQL_EXPORT_RELATIVE } from "@/lib/dbExport";
import { revalidatePath } from "next/cache";

export async function adminLogin(pinCode: string) {
  const user = await prisma.user.findFirst({
    where: { pin_code: pinCode, role: "ADMIN", is_active: true },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Invalid admin PIN" };

  setAdminSession(user.id);
  revalidatePath("/admin");
  return { success: true, error: null };
}

export async function adminLogout() {
  await requireAdmin();
  clearAdminSession();
  revalidatePath("/admin");
}

export async function toggleUserActive(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };
  if (user.role === "ADMIN") return { success: false, error: "Cannot disable admin user" };

  await prisma.user.update({
    where: { id: userId },
    data: { is_active: !user.is_active },
  });

  revalidatePath("/admin");
  return { success: true, error: null };
}

export async function createEmployee(name: string, pinCode: string) {
  await requireAdmin();

  const trimmedName = name.trim();
  const trimmedPin = pinCode.trim();
  if (!trimmedName) return { success: false, error: "Name is required" };
  if (!/^\d{4,8}$/.test(trimmedPin)) return { success: false, error: "PIN must be 4-8 digits" };

  await prisma.user.create({
    data: {
      name: trimmedName,
      role: "EMPLOYEE",
      pin_code: trimmedPin,
      is_active: true,
    },
  });

  revalidatePath("/admin");
  return { success: true, error: null };
}

export async function updateUserPin(userId: string, newPin: string) {
  await requireAdmin();

  const trimmed = newPin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) return { success: false, error: "PIN must be 4-8 digits" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };
  if (user.role === "ADMIN") return { success: false, error: "Cannot change admin PIN here" };

  await prisma.user.update({
    where: { id: userId },
    data: { pin_code: trimmed },
  });

  revalidatePath("/admin");
  return { success: true, error: null };
}

/** Updates exports/timetracking.sql with current DB state. Also runs after every clock in/out. */
export async function updateDatabaseSql() {
  await requireAdmin();
  await saveDatabaseToSql(prisma);
  return { success: true, file: SQL_EXPORT_RELATIVE };
}

const WEEK_START_KEY = "week_start_day";

/** 0 = Sunday, 1 = Monday, ... 6 = Saturday */
export async function getWeekStartDay(): Promise<number> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: WEEK_START_KEY } });
    if (!row) return 0;
    const n = parseInt(row.value, 10);
    return Number.isFinite(n) && n >= 0 && n <= 6 ? n : 0;
  } catch {
    return 0;
  }
}

export async function setWeekStartDay(day: number) {
  await requireAdmin();
  if (day < 0 || day > 6) return { success: false, error: "Invalid day" };
  await prisma.setting.upsert({
    where: { key: WEEK_START_KEY },
    create: { key: WEEK_START_KEY, value: String(day) },
    update: { value: String(day) },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { success: true, error: null };
}

/** Expected hours per day (0=Sun .. 6=Sat) per employee. For settings schedule grid. */
export async function getSchedules(): Promise<
  { userId: string; userName: string; byDay: number[] }[]
> {
  await requireAdmin();
  // Same criteria as Admin "active employees" list: not ADMIN, is_active
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" }, is_active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (users.length === 0) {
    return [];
  }
  const schedules = await prisma.schedule.findMany({
    where: { user_id: { in: users.map((u) => u.id) } },
    select: { user_id: true, day_of_week: true, hours: true },
  });
  const byUser = new Map<string, number[]>();
  for (const u of users) {
    byUser.set(u.id, [0, 0, 0, 0, 0, 0, 0]);
  }
  for (const s of schedules) {
    const arr = byUser.get(s.user_id);
    if (arr && s.day_of_week >= 0 && s.day_of_week <= 6) arr[s.day_of_week] = s.hours;
  }
  return users.map((u) => ({
    userId: u.id,
    userName: u.name,
    byDay: byUser.get(u.id) ?? [0, 0, 0, 0, 0, 0, 0],
  }));
}

export async function setSchedules(updates: { userId: string; dayOfWeek: number; hours: number }[]) {
  await requireAdmin();
  for (const { userId, dayOfWeek, hours } of updates) {
    if (dayOfWeek < 0 || dayOfWeek > 6) continue;
    const num = Number(hours);
    const value = Number.isFinite(num) && num >= 0 ? num : 0;
    await prisma.schedule.upsert({
      where: {
        user_id_day_of_week: { user_id: userId, day_of_week: dayOfWeek },
      },
      create: { user_id: userId, day_of_week: dayOfWeek, hours: value },
      update: { hours: value },
    });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { success: true, error: null };
}

