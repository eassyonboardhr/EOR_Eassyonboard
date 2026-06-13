export default function DashboardLoading() {
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <div className="fixed right-4 top-4 z-[70] rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg">
        Loading portal...
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-blue-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-700" />
      </div>
      <div className="grid gap-3">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-80 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-[520px] max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
