export default function MeLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile card */}
      <div className="rounded-xl bg-card border border-border/60 shadow-sm p-5 flex items-center gap-4">
        <div className="animate-pulse bg-muted rounded-full h-14 w-14" />
        <div className="flex-1 space-y-2">
          <div className="animate-pulse bg-muted rounded h-5 w-40" />
          <div className="animate-pulse bg-muted rounded h-3 w-56" />
        </div>
      </div>

      {/* Calendar setup card */}
      <div className="rounded-xl bg-card border border-border/60 shadow-sm p-5 space-y-3">
        <div className="animate-pulse bg-muted rounded h-5 w-32" />
        <div className="animate-pulse bg-muted rounded h-3 w-full" />
        <div className="animate-pulse bg-muted rounded h-3 w-4/5" />
        <div className="animate-pulse bg-muted rounded h-10 w-full mt-2" />
      </div>

      {/* Action items list */}
      <div className="rounded-xl bg-card border border-border/60 shadow-sm p-5 space-y-3">
        <div className="animate-pulse bg-muted rounded h-5 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="animate-pulse bg-muted rounded h-4 w-4" />
            <div className="animate-pulse bg-muted rounded h-3 flex-1" />
          </div>
        ))}
      </div>

      {/* Want-to-meet cards */}
      <div>
        <div className="animate-pulse bg-muted rounded h-5 w-40 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card border border-border/60 p-4 space-y-2">
              <div className="animate-pulse bg-muted rounded h-4 w-3/4" />
              <div className="animate-pulse bg-muted rounded h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
