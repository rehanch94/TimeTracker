"use server";

import { prisma } from "@/lib/prisma";
import { saveDatabaseToSql } from "@/lib/dbExport";
import { revalidatePath } from "next/cache";

// All timestamps are stored in UTC in the database.

function nowUtc(): Date {
  return new Date();
}

async function getActiveUserForPin(userId: string, pinCode: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, is_active: true, pin_code: true },
  });
  if (!user) return { user: null as null, error: "User not found" as const };
  if (!user.is_active) return { user: null as null, error: "User is disabled" as const };
  if (user.pin_code !== pinCode) return { user: null as null, error: "Invalid PIN" as const };
  return { user, error: null };
}

/**
 * Finds user by PIN and returns their current clock status.
 * Used to prevent double-punch: no clock in if active shift exists.
 */
export async function getClockStatus(pinCode: string) {
  const user = await prisma.user.findFirst({
    where: { pin_code: pinCode },
    select: { id: true, name: true, role: true, is_active: true },
  });
  if (!user) return { error: "Invalid PIN", user: null, activeEntry: null };
  if (!user.is_active) return { error: "User is disabled", user: null, activeEntry: null };

  const activeEntry = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
    orderBy: { clock_in_time: "desc" },
  });

  return {
    error: null,
    user: { id: user.id, name: user.name, role: user.role },
    activeEntry: activeEntry
      ? {
          id: activeEntry.id,
          clock_in_time: activeEntry.clock_in_time.toISOString(),
        }
      : null,
  };
}

/**
 * Finds a specific user and validates their PIN (used by UI employee selector).
 */
export async function getClockStatusForUser(userId: string, pinCode: string) {
  const { user, error } = await getActiveUserForPin(userId, pinCode);
  if (!user) return { error, user: null, activeEntry: null };

  const activeEntry = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
    orderBy: { clock_in_time: "desc" },
  });

  return {
    error: null,
    user: { id: user.id, name: user.name, role: user.role },
    activeEntry: activeEntry
      ? { id: activeEntry.id, clock_in_time: activeEntry.clock_in_time.toISOString() }
      : null,
  };
}

/**
 * Clock in. Fails if user already has an active shift (double-punch prevention).
 */
export async function clockIn(pinCode: string) {
  const user = await prisma.user.findFirst({
    where: { pin_code: pinCode },
  });
  if (!user) return { success: false, error: "Invalid PIN" };
  if (!user.is_active) return { success: false, error: "User is disabled" };

  const activeShift = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
  });
  if (activeShift) {
    return {
      success: false,
      error: "You already have an active shift. Clock out first.",
    };
  }

  const clockInTime = nowUtc();
  await prisma.timeEntry.create({
    data: {
      user_id: user.id,
      clock_in_time: clockInTime,
      clock_out_time: null,
      total_hours: null,
      is_edited: false,
    },
  });

  revalidatePath("/");
  return { success: true, error: null };
}

export async function clockInForUser(userId: string, pinCode: string) {
  const { user, error } = await getActiveUserForPin(userId, pinCode);
  if (!user) return { success: false, error };

  const activeShift = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
  });
  if (activeShift) {
    return { success: false, error: "You already have an active shift. Clock out first." };
  }

  const clockInTime = nowUtc();
  await prisma.timeEntry.create({
    data: {
      user_id: user.id,
      clock_in_time: clockInTime,
      clock_out_time: null,
      total_hours: null,
      is_edited: false,
    },
  });

  try {
    await saveDatabaseToSql(prisma);
  } catch (_) {}
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, error: null };
}

/**
 * Clock out. Calculates total_hours on the server and updates the time entry.
 */
export async function clockOut(pinCode: string) {
  const user = await prisma.user.findFirst({
    where: { pin_code: pinCode },
  });
  if (!user) return { success: false, error: "Invalid PIN" };
  if (!user.is_active) return { success: false, error: "User is disabled" };

  const activeShift = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
    orderBy: { clock_in_time: "desc" },
  });
  if (!activeShift) {
    return {
      success: false,
      error: "No active shift found. Clock in first.",
    };
  }

  const clockOutTime = nowUtc();
  const totalHours =
    (clockOutTime.getTime() - activeShift.clock_in_time.getTime()) / (1000 * 60 * 60);

  await prisma.timeEntry.update({
    where: { id: activeShift.id },
    data: {
      clock_out_time: clockOutTime,
      total_hours: Math.round(totalHours * 100) / 100,
    },
  });

  try {
    await saveDatabaseToSql(prisma);
  } catch (_) {}
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, error: null };
}

export async function clockOutForUser(userId: string, pinCode: string) {
  const { user, error } = await getActiveUserForPin(userId, pinCode);
  if (!user) return { success: false, error };

  const activeShift = await prisma.timeEntry.findFirst({
    where: { user_id: user.id, clock_out_time: null },
    orderBy: { clock_in_time: "desc" },
  });
  if (!activeShift) {
    return { success: false, error: "No active shift found. Clock in first." };
  }

  const clockOutTime = nowUtc();
  const totalHours =
    (clockOutTime.getTime() - activeShift.clock_in_time.getTime()) / (1000 * 60 * 60);

  await prisma.timeEntry.update({
    where: { id: activeShift.id },
    data: {
      clock_out_time: clockOutTime,
      total_hours: Math.round(totalHours * 100) / 100,
    },
  });

  try {
    await saveDatabaseToSql(prisma);
  } catch (_) {}
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, error: null };
}

/**
 * Edit a time entry (e.g. by manager). Creates an audit log with previous values;
 * does not overwrite without recording who changed it, when, and original values.
 * Accepts ISO date strings or Date objects for newClockIn / newClockOut.
 */
export async function editTimeEntry(
  timeEntryId: string,
  editedByUserId: string,
  newClockIn: Date | string,
  newClockOut: Date | string | null
) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
  });
  if (!entry) return { success: false, error: "Time entry not found" };

  const clockIn = typeof newClockIn === "string" ? new Date(newClockIn) : newClockIn;
  const clockOut =
    newClockOut == null ? null : typeof newClockOut === "string" ? new Date(newClockOut) : newClockOut;

  const editedAt = nowUtc();
  const previousClockIn = entry.clock_in_time;
  const previousClockOut = entry.clock_out_time;

  const totalHours =
    clockOut == null
      ? null
      : Math.round(
          ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)) * 100
        ) / 100;

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        time_entry_id: timeEntryId,
        edited_by_user_id: editedByUserId,
        edited_at: editedAt,
        previous_clock_in: previousClockIn,
        previous_clock_out: previousClockOut,
      },
    }),
    prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clock_in_time: clockIn,
        clock_out_time: clockOut,
        total_hours: totalHours,
        is_edited: true,
      },
    }),
  ]);

  try {
    await saveDatabaseToSql(prisma);
  } catch (_) {}
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, error: null };
}
