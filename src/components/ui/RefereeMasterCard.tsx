import type { ReactNode } from "react";

export type RefereeMasterCardTitleTag = "h1" | "h2" | "h3";

export type RefereeMasterCardProps = {
  name: string;
  leagueBadge: ReactNode;
  insightSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
  titleTag?: RefereeMasterCardTitleTag;
};

function Title({
  tag,
  children,
}: {
  tag: RefereeMasterCardTitleTag;
  children: ReactNode;
}) {
  if (tag === "h1") {
    return (
      <h1 className="m-0 truncate text-base font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-lg">
        {children}
      </h1>
    );
  }

  if (tag === "h3") {
    return (
      <h3 className="m-0 truncate text-sm font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-base">
        {children}
      </h3>
    );
  }

  return (
    <h2 className="m-0 truncate text-base font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-lg">
      {children}
    </h2>
  );
}

/**
 * Minimal referee summary shell for dashboard refactors.
 * Pass `insightSlot` to render DynamicInsightPill (or any insight UI) below the header.
 */
export function RefereeMasterCard({
  name,
  leagueBadge,
  insightSlot,
  children,
  className = "",
  titleTag = "h2",
}: RefereeMasterCardProps) {
  return (
    <article
      className={`referee-master-card-shell rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] px-3 py-2.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_4%,transparent),0_1px_2px_color-mix(in_srgb,var(--bg-surface-0)_65%,transparent)] ${className}`}
      aria-label={`Referee: ${name}`}
    >
      <header className="flex min-w-0 items-center justify-between gap-2">
        <Title tag={titleTag}>{name}</Title>
        <div className="shrink-0">{leagueBadge}</div>
      </header>

      {insightSlot ? (
        <div className="mt-1.5 min-w-0" data-slot="insight">
          {insightSlot}
        </div>
      ) : null}

      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </article>
  );
}
