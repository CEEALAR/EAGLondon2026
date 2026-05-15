export default function AttendeesLoading() {
  return (
    <div className="max-w-2xl mx-auto px-0">
      <div className="px-3 pt-3 pb-2">
        <div className="animate-pulse bg-muted rounded-md h-10 w-full" />
      </div>
      <div className="flex flex-col gap-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="px-3 py-2 border-b border-border">
            <div className="animate-pulse bg-muted rounded h-[72px] w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
