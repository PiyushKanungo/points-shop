export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      <div className="card h-40 animate-pulse" />
    </div>
  );
}
