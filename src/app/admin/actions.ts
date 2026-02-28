"use server";

import { prisma } from "@/lib/prisma";
import { clearAdminSession, requireAdmin, setAdminSession } from "@/lib/adminAuth";
import { saveDatabaseToSql, SQL_EXPORT_RELATIVE, isPostgres } from "@/lib/dbExport";
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

export async function createEmployee(
  name: string,
  pinCode: string,
  hourlyPay?: number | null | string
) {
  await requireAdmin();

  const trimmedName = name.trim();
  const trimmedPin = pinCode.trim();
  if (!trimmedName) return { success: false, error: "Name is required" };
  if (!/^\d{4,8}$/.test(trimmedPin)) return { success: false, error: "PIN must be 4-8 digits" };
  const hasHourlyPay = hourlyPay !== undefined && hourlyPay !== null && hourlyPay !== "";
  if (hasHourlyPay) {
    const n = Number(hourlyPay);
    if (n < 0 || !Number.isFinite(n)) return { success: false, error: "Hourly pay must be a non-negative number" };
  }

  const hourlyPayValue = hourlyPay === undefined || hourlyPay === null || hourlyPay === ""
    ? null
    : Number(hourlyPay);

  await prisma.user.create({
    data: {
      name: trimmedName,
      role: "EMPLOYEE",
      pin_code: trimmedPin,
      is_active: true,
      hourly_pay: hourlyPayValue,
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

/** Update employee name, PIN, and/or hourly pay. */
export async function updateEmployee(
  userId: string,
  name: string,
  pinCode: string,
  hourlyPay?: number | null | string
) {
  await requireAdmin();

  const trimmedName = name.trim();
  const trimmedPin = pinCode.trim();
  if (!trimmedName) return { success: false, error: "Name is required" };
  if (!/^\d{4,8}$/.test(trimmedPin)) return { success: false, error: "PIN must be 4-8 digits" };
  const hasHourlyPay = hourlyPay !== undefined && hourlyPay !== null && hourlyPay !== "";
  if (hasHourlyPay) {
    const n = Number(hourlyPay);
    if (n < 0 || !Number.isFinite(n)) return { success: false, error: "Hourly pay must be a non-negative number" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };
  if (user.role === "ADMIN") return { success: false, error: "Cannot edit admin here" };

  const hourlyPayValue = hourlyPay === undefined ? undefined : (hourlyPay === null || hourlyPay === "" ? null : Number(hourlyPay));
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: trimmedName,
      pin_code: trimmedPin,
      ...(hourlyPayValue !== undefined ? { hourly_pay: hourlyPayValue } : {}),
    },
  });

  revalidatePath("/admin");
  return { success: true, error: null };
}

/** Delete employee. Time entries and schedule are removed (cascade). */
export async function deleteEmployee(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };
  if (user.role === "ADMIN") return { success: false, error: "Cannot delete admin user" };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { success: true, error: null };
}

/** Delete a single time entry (admin only). */
export async function deleteTimeEntry(entryId: string) {
  await requireAdmin();
  await prisma.timeEntry.delete({ where: { id: entryId } });
  revalidatePath("/admin");
  return { success: true, error: null };
}

/** Updates exports/timetracking.sql with current DB state (SQLite only). No-op on Supabase/Postgres. */
export async function updateDatabaseSql() {
  await requireAdmin();
  await saveDatabaseToSql(prisma);
  if (isPostgres()) return { success: true, file: null as string | null };
  return { success: true, file: SQL_EXPORT_RELATIVE };
}

const WEEK_START_KEY = "week_start_day";
const TIMEZONE_KEY = "timezone";

/** IANA timezone (e.g. America/Los_Angeles) for week-day bucketing; null = use server TZ */
export async function getTimezone(): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: TIMEZONE_KEY } });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

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

export async function setTimezone(value: string) {
  await requireAdmin();
  const tz = value?.trim() || "";
  if (!tz) {
    await prisma.setting.deleteMany({ where: { key: TIMEZONE_KEY } }).catch(() => {});
  } else {
    await prisma.setting.upsert({
      where: { key: TIMEZONE_KEY },
      create: { key: TIMEZONE_KEY, value: tz },
      update: { value: tz },
    });
  }
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

const EMAIL_REPORT_TO_KEY = "email_report_to";
const EMAIL_REPORT_BODY_KEY = "email_report_body";

export async function getEmailReportTo(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: EMAIL_REPORT_TO_KEY } });
    return row?.value?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function getEmailReportBody(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: EMAIL_REPORT_BODY_KEY } });
    return row?.value ?? "";
  } catch {
    return "";
  }
}

export async function setEmailReportTo(value: string) {
  await requireAdmin();
  const v = value?.trim() ?? "";
  if (!v) {
    await prisma.setting.deleteMany({ where: { key: EMAIL_REPORT_TO_KEY } }).catch(() => {});
  } else {
    await prisma.setting.upsert({
      where: { key: EMAIL_REPORT_TO_KEY },
      create: { key: EMAIL_REPORT_TO_KEY, value: v },
      update: { value: v },
    });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { success: true, error: null };
}

export async function setEmailReportBody(value: string) {
  await requireAdmin();
  const v = value ?? "";
  await prisma.setting.upsert({
    where: { key: EMAIL_REPORT_BODY_KEY },
    create: { key: EMAIL_REPORT_BODY_KEY, value: v },
    update: { value: v },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { success: true, error: null };
}

