"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setWeekStartDay, setSchedules } from "../actions";

type ScheduleRow = { userId: string; userName: string; byDay: number[] };

const DEFAULT_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsClient({
  weekStartDay = 0,
  weekDayOptions = [],
  schedules = [],
  dayLabels = DEFAULT_DAY_LABELS,
}: {
  weekStartDay: number;
  weekDayOptions: { value: number; label: string }[];
  schedules: ScheduleRow[];
  dayLabels: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(weekStartDay);
  useEffect(() => setSelected(weekStartDay), [weekStartDay]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const safeSchedules = Array.isArray(schedules)
    ? schedules.map((s) => ({
        userId: s.userId,
        userName: s.userName ?? "",
        byDay: Array.isArray(s.byDay) && s.byDay.length === 7 ? s.byDay : [0, 0, 0, 0, 0, 0, 0],
      }))
    : [];
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(safeSchedules);
  useEffect(() => {
    setScheduleRows(safeSchedules);
  }, [schedules]);

  const updateScheduleCell = (userId: string, dayOfWeek: number, value: number) => {
    setScheduleRows((prev) =>
      prev.map((r) =>
        r.userId === userId
          ? { ...r, byDay: r.byDay.map((h, i) => (i === dayOfWeek ? value : h)) }
          : r
      )
    );
  };

  const saveSchedules = () => {
    const updates: { userId: string; dayOfWeek: number; hours: number }[] = [];
    scheduleRows.forEach((r) => {
      r.byDay.forEach((hours, dayOfWeek) => {
        updates.push({ userId: r.userId, dayOfWeek, hours });
      });
    });
    startTransition(async () => {
      setMsg(null);
      const res = await setSchedules(updates);
      if (res.success) {
        setMsg({ type: "success", text: "Schedule saved." });
        router.refresh();
      } else setMsg({ type: "error", text: res.error ?? "Failed" });
    });
  };

  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            ← Back to Admin
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Week start</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose which day starts the week for &quot;This week&quot; totals.
          </p>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600">Week starts on</label>
            <select
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {weekDayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            disabled={isPending || selected === weekStartDay}
            onClick={() =>
              startTransition(async () => {
                setMsg(null);
                const res = await setWeekStartDay(selected);
                if (res.success) {
                  setMsg({ type: "success", text: "Saved." });
                  router.refresh();
                } else setMsg({ type: "error", text: res.error ?? "Failed" });
              })
            }
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            Save
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Expected hours per day</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set scheduled hours for each employee by day (Sun–Sat). Used to highlight overages in
            &quot;This week&quot;.
          </p>
          {scheduleRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No employees yet. Add employees in Admin.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left py-2 px-2 font-medium text-slate-700 sticky left-0 bg-slate-50/80 z-10">
                        Employee
                      </th>
                      {dayLabels.map((label, i) => (
                        <th
                          key={i}
                          className="py-2 px-1 text-center font-medium text-slate-700 w-14"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row) => (
                      <tr key={row.userId} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 font-medium text-slate-800 sticky left-0 bg-white hover:bg-slate-50/50 z-10">
                          {row.userName}
                        </td>
                        {row.byDay.map((hours, dayIndex) => (
                          <td key={dayIndex} className="py-1 px-1">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={hours === 0 ? "" : hours}
                              onChange={(e) => {
                                const v = e.target.value;
                                const num = v === "" ? 0 : parseFloat(v);
                                updateScheduleCell(row.userId, dayIndex, Number.isFinite(num) && num >= 0 ? num : 0);
                              }}
                              className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                disabled={isPending}
                onClick={saveSchedules}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                Save schedule
              </button>
            </>
          )}
        </section>

        {msg && (
          <p className={`text-sm ${msg.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </main>
  );
}
