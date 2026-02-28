"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEmployee, updateDatabaseSql, toggleUserActive, updateUserPin, adminLogout } from "./actions";
import { editTimeEntry } from "@/app/actions/clock";

type UserRow = { id: string; name: string; role: string; is_active: boolean; pin_code: string };
type WeeklyTotal = {
  userId: string;
  userName: string;
  totalHours: number;
  scheduledTotal: number;
  actualByDay: number[];
  scheduledByDay: number[];
};
type TimeEntryRow = {
  id: string;
  user: { id: string; name: string };
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number | null;
  is_edited: boolean;
};
type AuditRow = {
  id: string;
  time_entry_id: string;
  edited_at: string;
  edited_by_user: { id: string; name: string };
  previous_clock_in: string;
  previous_clock_out: string | null;
};

function fmtLocal(utcIso: string | null): string {
  if (!utcIso) return "—";
  const d = new Date(utcIso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toLocalDatetimeInput(utcIso: string): string {
  const d = new Date(utcIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function AdminClient({
  adminId,
  adminName,
  users,
  entries,
  audits,
  weekStartDay,
  weeklyTotals,
  weekStartIso,
  weekEndIso,
}: {
  adminId: string;
  adminName: string;
  users: UserRow[];
  entries: TimeEntryRow[];
  audits: AuditRow[];
  weekStartDay: number;
  weeklyTotals: WeeklyTotal[];
  weekStartIso: string;
  weekEndIso: string;
}) {
  const router = useRouter();
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePin, setNewEmployeePin] = useState("");

  const [showInactive, setShowInactive] = useState(false);
  const [editingPinForId, setEditingPinForId] = useState<string | null>(null);
  const [editPinValue, setEditPinValue] = useState("");

  const [editingEntry, setEditingEntry] = useState<TimeEntryRow | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(t);
  }, [router]);

  const activeEmployees = useMemo(
    () => users.filter((u) => u.role !== "ADMIN" && u.is_active),
    [users]
  );
  const inactiveEmployees = useMemo(
    () => users.filter((u) => u.role !== "ADMIN" && !u.is_active),
    [users]
  );
  const employeeUsers = useMemo(() => users.filter((u) => u.role !== "ADMIN"), [users]);

  const entriesByDate = useMemo(() => {
    let list = entries;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      list = list.filter((e) => new Date(e.clock_in_time) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.clock_in_time) <= to);
    }
    return list;
  }, [entries, dateFrom, dateTo]);

  const auditsByDate = useMemo(() => {
    let list = audits;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      list = list.filter((a) => new Date(a.edited_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      list = list.filter((a) => new Date(a.edited_at) <= to);
    }
    return list;
  }, [audits, dateFrom, dateTo]);

  const filteredEntries = useMemo(() => {
    let list = entriesByDate;
    if (filterUserId !== "all") list = list.filter((e) => e.user.id === filterUserId);
    return list;
  }, [entriesByDate, filterUserId]);

  const weekRangeLabel = `${new Date(weekStartIso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${new Date(weekEndIso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const emailReportHref = useMemo(() => {
    const subject = encodeURIComponent("Weekly Timesheet");
    const lines = [
      "Weekly timesheet summary",
      "",
      `Week (${WEEKDAY_NAMES[weekStartDay]} start): ${weekRangeLabel}`,
      "",
      ...weeklyTotals.map((r) => `${r.userName}: ${r.totalHours.toFixed(2)} hours`),
      "",
      "— Time Tracking",
    ];
    const body = encodeURIComponent(lines.join("\n"));
    return `mailto:test@rehanch.com?subject=${subject}&body=${body}`;
  }, [weekStartDay, weekRangeLabel, weeklyTotals]);

  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Admin Console</h1>
            <p className="text-sm text-slate-500 mt-1">Signed in as {adminName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Auto-saved after every clock in/out.</span>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setMsg(null);
                  const res = await updateDatabaseSql();
                  if (res.success) setMsg({ type: "success", text: res.file ? `Updated ${res.file}` : "Using Supabase — .sql export is only for SQLite." });
                  else setMsg({ type: "error", text: "Update failed" });
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Update .sql
            </button>
            <Link
              href="/admin/settings"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Settings
            </Link>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await adminLogout();
                  window.location.href = "/admin/login";
                })
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
            >
              Logout
            </button>
          </div>
        </header>

        {msg && (
          <p className={`text-sm ${msg.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {msg.text}
          </p>
        )}

        {editingEntry && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-800">Edit time entry</h3>
              <p className="mt-1 text-sm text-slate-500">
                {editingEntry.user.name} — changes are recorded in the audit log.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Clock in (your local time)</label>
                  <input
                    type="datetime-local"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Clock out (optional; leave empty if still clocked in)</label>
                  <input
                    type="datetime-local"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntry(null);
                    setEditClockIn("");
                    setEditClockOut("");
                  }}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || !editClockIn.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      setMsg(null);
                      const newClockInIso = new Date(editClockIn).toISOString();
                      const newClockOutIso = editClockOut.trim()
                        ? new Date(editClockOut).toISOString()
                        : null;
                      const res = await editTimeEntry(
                        editingEntry.id,
                        adminId,
                        newClockInIso,
                        newClockOutIso
                      );
                      if (res.success) {
                        setMsg({ type: "success", text: "Time entry updated." });
                        setEditingEntry(null);
                        setEditClockIn("");
                        setEditClockOut("");
                        router.refresh();
                      } else {
                        setMsg({ type: "error", text: res.error ?? "Update failed." });
                      }
                    })
                  }
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">This week</h2>
              <p className="text-sm text-slate-500 mt-1">
                {weekRangeLabel} (week starts {WEEKDAY_NAMES[weekStartDay]})
              </p>
            </div>
            <a
              href={emailReportHref}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Email report
            </a>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-2 font-medium sticky left-0 bg-slate-50 z-10">Employee</th>
                  {Array.from({ length: 7 }, (_, i) => (
                    <th key={i} className="py-2 px-1 text-center font-medium w-14">
                      {WEEKDAY_NAMES[(weekStartDay + i) % 7].slice(0, 3)}
                    </th>
                  ))}
                  <th className="py-2 pl-2 font-medium text-right tabular-nums">Total</th>
                  <th className="py-2 pl-2 font-medium text-right tabular-nums">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklyTotals.map((r) => {
                  const overWeek = r.scheduledTotal > 0 && r.totalHours > r.scheduledTotal;
                  return (
                    <tr
                      key={r.userId}
                      className={`text-slate-800 ${overWeek ? "bg-red-50" : ""}`}
                    >
                      <td className="py-2 pr-2 font-medium sticky left-0 bg-white z-10 border-r border-slate-100">
                        {r.userName}
                      </td>
                      {r.actualByDay.map((actual, i) => {
                        const scheduled = r.scheduledByDay[i] ?? 0;
                        const overDay = scheduled > 0 && actual > scheduled;
                        return (
                          <td
                            key={i}
                            className={`py-2 px-1 text-center tabular-nums ${overDay ? "bg-red-200/70 text-red-900" : ""}`}
                            title={scheduled > 0 ? `Scheduled: ${scheduled}h` : undefined}
                          >
                            {actual > 0 ? actual.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                      <td className={`py-2 pl-2 text-right tabular-nums ${overWeek ? "font-semibold text-red-700" : ""}`}>
                        {r.totalHours.toFixed(2)}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums text-slate-600">
                        {r.scheduledTotal > 0 ? r.scheduledTotal.toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {weeklyTotals.length === 0 && (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={10}>
                      No entries this week.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Employees</h2>
          <p className="text-sm text-slate-500 mt-1">
            Toggle employees active/inactive. Disabled employees cannot clock in/out.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Add employee</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">PIN</label>
                <input
                  value={newEmployeePin}
                  onChange={(e) => setNewEmployeePin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="4-8 digits"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">PINs can be shared by multiple employees.</p>
              <button
                disabled={isPending || !newEmployeeName.trim() || !newEmployeePin.trim()}
                onClick={() =>
                  startTransition(async () => {
                    setMsg(null);
                    const res = await createEmployee(newEmployeeName, newEmployeePin);
                    if (res.success) {
                      setMsg({ type: "success", text: "Employee added." });
                      setNewEmployeeName("");
                      setNewEmployeePin("");
                      router.refresh();
                    } else {
                      setMsg({ type: "error", text: res.error ?? "Failed to add employee." });
                    }
                  })
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Active</p>
            <div className="divide-y divide-slate-100">
              {activeEmployees.map((u) => (
                <div key={u.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="font-medium text-slate-800">{u.name}</p>
                      {editingPinForId === u.id ? (
                        <span className="flex items-center gap-1.5">
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            value={editPinValue}
                            onChange={(e) => setEditPinValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            placeholder="New PIN"
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <button
                            disabled={isPending || editPinValue.length < 4}
                            onClick={() =>
                              startTransition(async () => {
                                setMsg(null);
                                const res = await updateUserPin(u.id, editPinValue);
                                if (res.success) {
                                  setEditingPinForId(null);
                                  setEditPinValue("");
                                  router.refresh();
                                } else setMsg({ type: "error", text: res.error ?? "Failed" });
                              })
                            }
                            className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingPinForId(null); setEditPinValue(""); }}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <>
                          <span className="text-sm text-slate-500 font-mono">PIN: {u.pin_code}</span>
                          <button
                            type="button"
                            onClick={() => { setEditingPinForId(u.id); setEditPinValue(u.pin_code); }}
                            className="text-xs text-slate-500 hover:text-slate-700 underline"
                          >
                            Edit PIN
                          </button>
                        </>
                      )}
                    </div>
                    {editingPinForId !== u.id && (
                      <button
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            setMsg(null);
                            const res = await toggleUserActive(u.id);
                            if (!res.success) setMsg({ type: "error", text: res.error ?? "Update failed" });
                            else router.refresh();
                          })
                        }
                        className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {activeEmployees.length === 0 && (
                <p className="py-2 text-sm text-slate-500">No active employees.</p>
              )}
            </div>

            {inactiveEmployees.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <span>Inactive employees ({inactiveEmployees.length})</span>
                  <span className="text-slate-400">{showInactive ? "▼" : "▶"}</span>
                </button>
                {showInactive && (
                  <div className="border-t border-slate-200 divide-y divide-slate-100">
                    {inactiveEmployees.map((u) => (
                      <div key={u.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <p className="text-sm text-slate-700">{u.name}</p>
                            {editingPinForId === u.id ? (
                              <span className="flex items-center gap-1.5">
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  value={editPinValue}
                                  onChange={(e) => setEditPinValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                  placeholder="New PIN"
                                  className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                                />
                                <button
                                  disabled={isPending || editPinValue.length < 4}
                                  onClick={() =>
                                    startTransition(async () => {
                                      setMsg(null);
                                      const res = await updateUserPin(u.id, editPinValue);
                                      if (res.success) {
                                        setEditingPinForId(null);
                                        setEditPinValue("");
                                        router.refresh();
                                      } else setMsg({ type: "error", text: res.error ?? "Failed" });
                                    })
                                  }
                                  className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingPinForId(null); setEditPinValue(""); }}
                                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <>
                                <span className="text-sm text-slate-500 font-mono">PIN: {u.pin_code}</span>
                                <button
                                  type="button"
                                  onClick={() => { setEditingPinForId(u.id); setEditPinValue(u.pin_code); }}
                                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                                >
                                  Edit PIN
                                </button>
                              </>
                            )}
                          </div>
                          {editingPinForId !== u.id && (
                            <button
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  setMsg(null);
                                  const res = await toggleUserActive(u.id);
                                  if (!res.success) setMsg({ type: "error", text: res.error ?? "Update failed" });
                                  else router.refresh();
                                })
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                            >
                              Enable
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Time Entry History</h2>
              <p className="text-sm text-slate-500 mt-1">
                Times in your local timezone. Use date range to narrow results.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600">Employee</label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="all">All</option>
                  {employeeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Employee</th>
                  <th className="py-2 pr-4 font-medium">Clock in</th>
                  <th className="py-2 pr-4 font-medium">Clock out</th>
                  <th className="py-2 pr-4 font-medium">Hours</th>
                  <th className="py-2 pr-4 font-medium">Edited</th>
                  <th className="py-2 pr-4 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="text-slate-800">
                    <td className="py-2 pr-4 whitespace-nowrap">{e.user.name}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtLocal(e.clock_in_time)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtLocal(e.clock_out_time)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {e.total_hours == null ? "—" : e.total_hours.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {e.is_edited ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          Edited
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntry(e);
                          setEditClockIn(toLocalDatetimeInput(e.clock_in_time));
                          setEditClockOut(e.clock_out_time ? toLocalDatetimeInput(e.clock_out_time) : "");
                        }}
                        disabled={isPending}
                        className="text-sm font-medium text-slate-600 hover:text-slate-800 underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={6}>
                      No entries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Audit Log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Previous values when a time entry is edited. Filtered by same date range (by edited date).
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Edited at</th>
                  <th className="py-2 pr-4 font-medium">Edited by</th>
                  <th className="py-2 pr-4 font-medium">Entry</th>
                  <th className="py-2 pr-4 font-medium">Prev clock in</th>
                  <th className="py-2 pr-4 font-medium">Prev clock out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditsByDate.map((a) => (
                  <tr key={a.id} className="text-slate-800">
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtLocal(a.edited_at)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{a.edited_by_user.name}</td>
                    <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">{a.time_entry_id}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtLocal(a.previous_clock_in)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtLocal(a.previous_clock_out)}</td>
                  </tr>
                ))}
                {auditsByDate.length === 0 && (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      No audit logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

