"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
          <p className="mt-2 text-slate-600">
            A server error occurred. This is often due to a missing or incorrect{" "}
            <code className="rounded bg-slate-200 px-1 text-sm">DATABASE_URL</code> in your
            hosting environment (e.g. Netlify). Check DEPLOYMENT.md and your env vars.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
