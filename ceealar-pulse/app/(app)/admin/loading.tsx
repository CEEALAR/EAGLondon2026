export default function AdminLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <div className="animate-pulse bg-muted rounded h-8 w-32" />
      {/* Headline counts */}
      <div>
        <div className="animate-pulse bg-muted rounded h-3 w-20 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card px-5 py-4 space-y-2">
              <div className="animate-pulse bg-muted rounded h-3 w-20" />
              <div className="animate-pulse bg-muted rounded h-8 w-14" />
            </div>
          ))}
        </div>
      </div>
      {/* Per-person load cards */}
      <div>
        <div className="animate-pulse bg-muted rounded h-3 w-28 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card px-4 py-3 space-y-2">
              <div className="animate-pulse bg-muted rounded h-3 w-32" />
              <div className="animate-pulse bg-muted rounded h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
