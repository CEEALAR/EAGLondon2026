export default function MeetingsLoading() {
  return (
    <div className="px-3 py-4">
      <div className="animate-pulse bg-muted rounded h-7 w-32 mb-4" />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-8 w-24" />
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-16 w-full mb-3" />
        ))}
      </div>
    </div>
  )
}
