export default function DashboardLoading() {
  return (
    <div className="p-4 max-w-2xl mx-auto w-full space-y-4 animate-pulse" aria-busy="true" aria-label="กำลังโหลด">
      <div className="pt-2 space-y-2">
        <div className="h-6 w-40 rounded-lg bg-gray-200" />
        <div className="h-4 w-24 rounded-lg bg-gray-200" />
      </div>
      <div className="h-12 rounded-xl bg-gray-200" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
          <div className="h-4 w-2/3 rounded-lg bg-gray-200" />
          <div className="h-3 w-full rounded-lg bg-gray-200" />
          <div className="h-3 w-1/2 rounded-lg bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
