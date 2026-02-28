"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockInForUser, clockOutForUser, getClockStatusForUser } from "./actions/clock";

type Employee = { id: string; name: string; pinLength: number };
type ActiveNowEntry = { userId: string; userName: string; clockedInAt: string; pinLength: number };

// Format UTC ISO string to user's local time for display only
function formatLocal(utcIso: string): string {
  const d = new Date(utcIso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatLocalDate(utcIso: string): string {
  const d = new Date(utcIso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ClockClient({
  employees,
  activeNow,
}: {
  employees: Employee[];
  activeNow: ActiveNowEntry[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>(employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [clockOutTarget, setClockOutTarget] = useState<{
    userId: string;
    userName: string;
    pinLength: number;
  } | null>(null);
  const [status, setStatus] = useState<{
    user: { id: string; name: string; role: string } | null;
    activeEntry: { id: string; clock_in_time: string } | null;
    error: string | null;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedUserId) ?? null,
    [employees, selectedUserId]
  );

  useEffect(() => {
    // If employee changes, force re-confirmation with PIN.
    setStatus(null);
    setMessage(null);
    setPin("");
  }, [selectedUserId]);

  const runClockWithPin = useCallback(
    (pinValue: string) => {
      const pinCode = pinValue.trim();
      if (!selectedUserId || !pinCode) return;
      startTransition(async () => {
        setMessage(null);
        const result = await getClockStatusForUser(selectedUserId, pinCode);
        if (result.error || !result.user) {
          setStatus({ user: null, activeEntry: null, error: "Incorrect" });
          setMessage({ type: "error", text: "Incorrect" });
          setPin("");
          return;
        }
        if (result.activeEntry) {
          const out = await clockOutForUser(selectedUserId, pinCode);
          if (out.success) {
            setMessage({ type: "success", text: "Clocked out." });
            setPin("");
            const next = await getClockStatusForUser(selectedUserId, pinCode);
            setStatus({
              user: next.user ?? result.user,
              activeEntry: next.activeEntry ?? null,
              error: null,
            });
            router.refresh();
          } else {
            setStatus({ user: null, activeEntry: null, error: "Incorrect" });
            setMessage({ type: "error", text: "Incorrect" });
            setPin("");
          }
        } else {
          const inRes = await clockInForUser(selectedUserId, pinCode);
          if (inRes.success) {
            setMessage({ type: "success", text: "Clocked in." });
            setPin("");
            const next = await getClockStatusForUser(selectedUserId, pinCode);
            setStatus({
              user: next.user ?? result.user,
              activeEntry: next.activeEntry ?? null,
              error: null,
            });
            router.refresh();
          } else {
            setStatus({ user: null, activeEntry: null, error: "Incorrect" });
            setMessage({ type: "error", text: "Incorrect" });
            setPin("");
          }
        }
      });
    },
    [selectedUserId, router]
  );

  const isConfirmed = status?.user != null && status?.error == null;

  const mainPinLength = selectedEmployee?.pinLength ?? 6;
  const effectivePinLength = clockOutTarget ? clockOutTarget.pinLength : mainPinLength;
  const addDigit = useCallback(
    (d: string) => {
      setPin((prev) => (prev.length < effectivePinLength ? prev + d : prev));
    },
    [effectivePinLength]
  );
  const removeDigit = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const prevPinLen = useRef(0);
  useEffect(() => {
    if (clockOutTarget) return;
    const justReachedFull =
      pin.length === mainPinLength &&
      mainPinLength >= 4 &&
      selectedUserId &&
      prevPinLen.current < mainPinLength;
    prevPinLen.current = pin.length;
    if (justReachedFull) {
      runClockWithPin(pin);
    }
  }, [pin, mainPinLength, selectedUserId, clockOutTarget, runClockWithPin]);

  const handleStartClockOut = (entry: ActiveNowEntry) => {
    setClockOutTarget({ userId: entry.userId, userName: entry.userName, pinLength: entry.pinLength });
    setPin("");
    setMessage(null);
  };

  const handleConfirmClockOut = () => {
    if (!clockOutTarget || !pin.trim()) return;
    startTransition(async () => {
      setMessage(null);
      const result = await clockOutForUser(clockOutTarget.userId, pin.trim());
      if (result.success) {
        setMessage({ type: "success", text: `${clockOutTarget.userName} clocked out.` });
        setClockOutTarget(null);
        setPin("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to clock out." });
      }
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") {
        e.preventDefault();
        removeDigit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addDigit, removeDigit]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      {clockOutTarget && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 text-center">
              Clock out {clockOutTarget.userName}?
            </h3>
            <p className="mt-1 text-center text-sm text-slate-500">Enter PIN to confirm</p>
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: clockOutTarget.pinLength }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 shrink-0 ${
                    i < pin.length ? "bg-slate-700 border-slate-700" : "border-slate-300 bg-transparent"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-slate-500 tabular-nums">
              {pin.length} of {clockOutTarget.pinLength}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
                key === "" ? (
                  <div key="empty" className="min-h-[48px]" />
                ) : key === "⌫" ? (
                  <button
                    key="back"
                    type="button"
                    onClick={removeDigit}
                    disabled={pin.length === 0}
                    className="min-h-[48px] rounded-xl bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 active:scale-95"
                  >
                    ⌫
                  </button>
                ) : (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addDigit(key)}
                    disabled={pin.length >= clockOutTarget.pinLength}
                    className="min-h-[48px] rounded-xl bg-white border-2 border-slate-300 text-slate-800 font-semibold text-lg hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    {key}
                  </button>
                )
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setClockOutTarget(null);
                  setPin("");
                }}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClockOut}
                disabled={isPending || pin.length === 0}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 font-medium text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {isPending ? "…" : "Clock out"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-8">
        <h1 className="text-2xl font-semibold text-slate-800 text-center tracking-tight">
          Time Tracking
        </h1>

        {activeNow.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">Currently active</h2>
            <ul className="space-y-2">
              {activeNow.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 py-3 px-3"
                >
                  <div>
                    <p className="font-medium text-slate-800">{entry.userName}</p>
                    <p className="text-xs text-slate-500">
                      Clocked in at {formatLocalDate(entry.clockedInAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartClockOut(entry)}
                    disabled={isPending}
                    className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    Clock out
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">Employee</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-600 text-center">
            PIN (confirmation)
          </label>

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-slate-500 tabular-nums">
              {pin.length} of {effectivePinLength}
            </p>
            <div className="flex justify-center gap-2" aria-hidden>
              {Array.from({ length: effectivePinLength }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 shrink-0 transition-colors ${
                    i < pin.length
                      ? "bg-slate-700 border-slate-700"
                      : "border-slate-300 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? (
                <div key="empty" className="min-h-[52px]" />
              ) : key === "⌫" ? (
                <button
                  key="back"
                  type="button"
                  onClick={removeDigit}
                  disabled={isPending || pin.length === 0}
                  className="min-h-[52px] rounded-xl bg-slate-200 text-slate-700 font-medium text-lg hover:bg-slate-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none touch-manipulation"
                >
                  ⌫
                </button>
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => addDigit(key)}
                  disabled={isPending || pin.length >= effectivePinLength}
                  className="min-h-[52px] rounded-xl bg-white border-2 border-slate-300 text-slate-800 font-semibold text-xl shadow-sm hover:bg-slate-50 hover:border-slate-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none touch-manipulation"
                >
                  {key}
                </button>
              )
            )}
          </div>

          {!isConfirmed && (
            <p className="text-xs text-slate-500 text-center">
              Select your name, then enter your PIN. You’ll clock in or out automatically.
            </p>
          )}
        </div>

        {status?.error && <p className="text-sm text-red-600 text-center">{status.error}</p>}

        {isConfirmed && status?.user && (
          <p className="text-center text-slate-600">
            {status.user.name}
            {status.activeEntry ? (
              <span className="block text-sm text-slate-500 mt-1">
                Clocked in at {formatLocal(status.activeEntry.clock_in_time)} (your time)
              </span>
            ) : (
              <span className="block text-sm text-slate-500 mt-1">Ready to clock in next time</span>
            )}
          </p>
        )}

        {employees.length === 0 && (
          <p className="text-sm text-slate-500 text-center">No employees available.</p>
        )}

        {message && (
          <p
            className={`text-sm text-center ${
              message.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}

