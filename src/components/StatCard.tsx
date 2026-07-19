import type { ReactNode } from "react";
import { StatCardShareButton } from "@/components/StatCardShareButton";
import { STAT_CARD_ANCHOR } from "@/lib/stat-card-id";

export type StatCardElement = "div" | "article" | "li";

export type StatCardProps = {
  /** Stable anchor id; defaults to a slug of `title`. */
  id?: string;
  title: string;
  badges?: ReactNode;
  shareLabel?: string;
  className?: string;
  as?: StatCardElement;
  children: ReactNode;
  showShare?: boolean;
};

/**
 * Base stat card shell with optional header badges and a deep-link share control.
 */
export function StatCard({
  id,
  title,
  badges,
  shareLabel,
  className = "",
  as: Tag = "div",
  children,
  showShare = true,
}: StatCardProps) {
  const hashId = id ?? STAT_CARD_ANCHOR.metricLabel(title);

  return (
    <Tag
      id={hashId}
      data-stat-card="true"
      className={`stat-card ${className}`.trim()}
    >
      {showShare ? (
        <div className="stat-card-header">
          {badges ? <div className="stat-card-header-badges">{badges}</div> : <span />}
          <StatCardShareButton hashId={hashId} label={shareLabel ?? title} />
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
