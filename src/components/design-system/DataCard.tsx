import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type DataCardDensity = "comfortable" | "compact";

export type DataCardProps = {
  /** Semantic wrapper — defaults to `article` for standalone insights. */
  as?: ElementType;
  children: ReactNode;
  className?: string;
  density?: DataCardDensity;
  /** League or category marker for styling hooks. */
  dataLeague?: string;
  /** When true, applies interactive hover + focus ring for clickable cards. */
  interactive?: boolean;
  id?: string;
  style?: React.CSSProperties;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "style">;

const densityClass: Record<DataCardDensity, string> = {
  comfortable: "rw-data-card--comfortable",
  compact: "rw-data-card--compact",
};

/**
 * Accessible data-dense card shell for analytics surfaces (League Stories, findings, metrics).
 * Uses semantic tokens for guaranteed light/dark contrast and a high-contrast focus ring.
 */
export function DataCard({
  as: Component = "article",
  children,
  className = "",
  density = "comfortable",
  dataLeague,
  interactive = false,
  id,
  style,
  ...rest
}: DataCardProps) {
  return (
    <Component
      id={id}
      data-league={dataLeague}
      style={style}
      className={[
        "rw-data-card",
        densityClass[density],
        interactive ? "rw-data-card--interactive rw-focus-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Component>
  );
}

export type DataCardHeaderProps = {
  children: ReactNode;
  className?: string;
  kicker?: ReactNode;
};

export function DataCardHeader({ children, className = "", kicker }: DataCardHeaderProps) {
  return (
    <header className={["rw-data-card__header", className].filter(Boolean).join(" ")}>
      {children}
      {kicker ? <p className="rw-data-card__kicker">{kicker}</p> : null}
    </header>
  );
}

export type DataCardHeroProps = {
  label: ReactNode;
  value: ReactNode;
  tone?: "positive" | "negative" | "neutral";
};

export function DataCardHero({ label, value, tone = "neutral" }: DataCardHeroProps) {
  return (
    <div className="rw-data-card__hero">
      <span className="rw-data-card__hero-value" data-tone={tone}>
        {value}
      </span>
      <span className="rw-data-card__hero-label">{label}</span>
    </div>
  );
}

export type DataCardBodyProps = {
  children: ReactNode;
  className?: string;
  headline?: ReactNode;
  headlineAs?: "h2" | "h3" | "h4";
};

export function DataCardBody({
  children,
  className = "",
  headline,
  headlineAs: HeadlineTag = "h3",
}: DataCardBodyProps) {
  return (
    <div className={["rw-data-card__body", className].filter(Boolean).join(" ")}>
      {headline ? (
        <HeadlineTag className="rw-data-card__headline">{headline}</HeadlineTag>
      ) : null}
      {children}
    </div>
  );
}

export type DataCardStat = {
  label: string;
  value: string;
};

export function DataCardStats({ stats }: { stats: DataCardStat[] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="rw-data-card__stats">
      {stats.map((stat) => (
        <div key={stat.label} className="rw-data-card__stat">
          <dt className="rw-data-card__stat-label">{stat.label}</dt>
          <dd className="rw-data-card__stat-value">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type DataCardFooterProps = {
  children: ReactNode;
  className?: string;
};

export function DataCardFooter({ children, className = "" }: DataCardFooterProps) {
  return (
    <footer className={["rw-data-card__footer", className].filter(Boolean).join(" ")}>
      {children}
    </footer>
  );
}
