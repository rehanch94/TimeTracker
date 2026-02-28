"use client";

import { useState, useTransition } from "react";
import { adminLogin } from "../actions";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Admin Console</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your admin PIN to continue.</p>

        <div className="mt-6 space-y-2">
          <label htmlFor="pin" className="block text-sm font-medium text-slate-600">
            Admin PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                startTransition(async () => {
                  setMsg(null);
                  const res = await adminLogin(pin.trim());
                  if (res.success) window.location.href = "/admin";
                  else setMsg(res.error ?? "Login failed");
                });
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />

          <button
            type="button"
            disabled={isPending || !pin.trim()}
            onClick={() =>
              startTransition(async () => {
                setMsg(null);
                const res = await adminLogin(pin.trim());
                if (res.success) window.location.href = "/admin";
                else setMsg(res.error ?? "Login failed");
              })
            }
            className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>

        {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}
      </div>
    </main>
  );
}

