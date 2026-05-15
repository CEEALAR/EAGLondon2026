export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-4">
        <div className="animate-pulse bg-muted rounded h-6 w-16" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border">
          <div className="animate-pulse bg-muted rounded h-4 w-3/4 mb-1.5" />
          <div className="animate-pulse bg-muted rounded h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
