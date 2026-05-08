/**
 * Generic page-level skeleton used while farm/subscription/route data
 * is still resolving. Mirrors a typical dashboard layout: header row,
 * stat cards, and a content block.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <SkelBar className="h-7 w-48" />
          <SkelBar className="h-4 w-64 opacity-70" />
        </div>
        <SkelBar className="h-9 w-32 rounded-md" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 space-y-3 relative overflow-hidden"
          >
            <SkelBar className="h-3 w-20" />
            <SkelBar className="h-6 w-24" />
            <SkelBar className="h-3 w-16 opacity-70" />
            <Shimmer />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <SkelBar className="h-5 w-40" />
          <SkelBar className="h-8 w-24 rounded-md" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkelBar className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkelBar className="h-3.5 w-1/3" />
              <SkelBar className="h-3 w-1/2 opacity-70" />
            </div>
            <SkelBar className="h-6 w-16 rounded-md" />
          </div>
        ))}
        <Shimmer />
      </div>
    </div>
  );
}

function SkelBar({ className = "" }: { className?: string }) {
  return <div className={`bg-muted rounded ${className}`} />;
}

function Shimmer() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent pointer-events-none" />
  );
}
