function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-3xl bg-slate-800/40 ${className}`}
    />
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-44 rounded-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full" />
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Profile Card */}
        <Skeleton className="h-[360px]" />

        {/* Right Content */}
        <div className="space-y-6 xl:col-span-2">
          <Skeleton className="h-[260px]" />
          <Skeleton className="h-[260px]" />
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return <Skeleton className="h-32" />
}

export function TableSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
      <Skeleton className="mb-5 h-8 w-56" />

      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  )
}

export default Skeleton