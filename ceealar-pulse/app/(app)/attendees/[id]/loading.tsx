export default function AttendeeDetailLoading() {
  return (
    <div className="px-4 py-6 md:py-0 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl p-5 md:p-6 bg-card border border-border/60 flex items-start gap-4">
        <div className="animate-pulse bg-muted rounded-full h-16 w-16 shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="animate-pulse bg-muted rounded h-8 w-2/3" />
          <div className="animate-pulse bg-muted rounded h-4 w-1/2" />
          <div className="animate-pulse bg-muted rounded h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 bg-card border border-border/60 shadow-sm space-y-2">
          <div className="animate-pulse bg-muted rounded h-5 w-28" />
          <div className="animate-pulse bg-muted rounded h-4 w-full" />
          <div className="animate-pulse bg-muted rounded h-4 w-4/5" />
        </div>
      ))}
    </div>
  )
}
