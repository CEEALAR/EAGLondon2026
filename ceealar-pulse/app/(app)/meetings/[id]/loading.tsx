export default function MeetingDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto md:mx-0 px-4 py-6 md:py-0 space-y-8">
      {/* Hero header */}
      <div className="rounded-2xl p-5 md:p-6 bg-card border border-border/60 space-y-3">
        <div className="animate-pulse bg-muted rounded h-4 w-20" />
        <div className="animate-pulse bg-muted rounded h-9 w-3/4" />
        <div className="animate-pulse bg-muted rounded h-4 w-1/2" />
        <div className="flex gap-2">
          <div className="animate-pulse bg-muted rounded h-3 w-32" />
          <div className="animate-pulse bg-muted rounded h-3 w-24" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 bg-card border border-border/60 shadow-sm space-y-2">
          <div className="animate-pulse bg-muted rounded h-5 w-32" />
          <div className="animate-pulse bg-muted rounded h-4 w-full" />
          <div className="animate-pulse bg-muted rounded h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}
