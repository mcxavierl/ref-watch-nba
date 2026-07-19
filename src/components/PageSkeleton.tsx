export type PageSkeletonVariant = "dashboard" | "league-hub" | "ref-profile";

type PageSkeletonProps = {
  variant?: PageSkeletonVariant;
};

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/90 ${className}`.trim()}
      aria-hidden
    />
  );
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`page-skeleton-card rounded-2xl border border-slate-800 bg-slate-900/50 p-4 ${
        tall ? "page-skeleton-card--tall" : ""
      }`}
      aria-hidden
    >
      <SkeletonBlock className="h-3 w-16" />
      <SkeletonBlock className="mt-4 h-7 w-24" />
      <SkeletonBlock className="mt-3 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-[80%] max-w-[12rem]" />
      <SkeletonBlock className="mt-5 h-3 w-20" />
    </div>
  );
}

/** Ghost layout shown instantly while route segments resolve. */
export function PageSkeleton({ variant = "dashboard" }: PageSkeletonProps) {
  const cardCount = variant === "ref-profile" ? 2 : variant === "league-hub" ? 3 : 6;

  return (
    <div
      className="page-shell page-skeleton"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="page-skeleton-hero">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-4 h-9 w-full max-w-md" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-2xl" />
        {variant === "league-hub" ? (
          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
        ) : null}
      </div>

      <div
        className={`page-skeleton-grid page-skeleton-grid--${variant}`}
        data-variant={variant}
      >
        {Array.from({ length: cardCount }, (_, index) => (
          <SkeletonCard key={index} tall={variant === "ref-profile" && index === 0} />
        ))}
      </div>
    </div>
  );
}
