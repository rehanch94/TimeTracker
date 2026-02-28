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
            A server error occurred. Check that Vercel is connected to Supabase and see VERCEL_SUPABASE_SETUP.md.
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
