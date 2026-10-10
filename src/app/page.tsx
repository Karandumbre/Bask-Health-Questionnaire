import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-xl space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md mx-auto">
          BH
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bask Health — Intake Studio
          </h1>
          <p className="text-xs text-gray-500 mt-1.5">
            Clinical form authoring, versioned publishing & responsive patient intake engine.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/admin/forms"
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-98"
          >
            Enter Administrative Editor & Forms
          </Link>

          <Link
            href="/admin/login"
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Reviewer Login Portal
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400">
          Built with Next.js 16 (App Router), Supabase PostgreSQL, and Polaris Icons.
        </div>
      </div>
    </div>
  );
}
