"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
          <p className="text-slate-600">
            A server error occurred. Check that Vercel is connected to Supabase and see VERCEL_SUPABASE_SETUP.md.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
            >
              Go to home
            </a>
            <a
              href="/admin/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 text-center"
            >
              Admin login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
