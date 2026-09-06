export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="h-48 w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
