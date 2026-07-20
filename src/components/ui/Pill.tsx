import type { ButtonHTMLAttributes, ReactNode } from "react";

export type PillVariant = "insight" | "meta" | "signal" | "category" | "label";
export type PillConfidence = "high" | "moderate";

type PillBaseProps = {
  children: ReactNode;
  variant?: PillVariant;
  confidence?: PillConfidence;
  /** Non-interactive insight pill (no button semantics). */
  static?: boolean;
  active?: boolean;
  className?: string;
  title?: string;
  /** Optional fixed max width (px number or CSS length). */
  maxWidth?: number | string;
};

type PillSpanProps = PillBaseProps & {
  as?: "span";
  onClick?: never;
};

type PillButtonProps = PillBaseProps &
  Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "aria-expanded" | "aria-controls" | "type"
  > & {
    as: "button";
  };

export type PillProps = PillSpanProps | PillButtonProps;

function confidenceClass(confidence: PillConfidence | undefined): string {
  if (confidence === "high") return "ref-master-insight-pill--high";
  if (confidence === "moderate") return "ref-master-insight-pill--moderate";
  return "";
}

function variantClasses(variant: PillVariant): string {
  switch (variant) {
    case "insight":
      return "ref-master-insight-pill";
    case "category":
      return "ref-master-insight-pill ref-master-insight-pill--static ref-master-insight-pill--high rankings-insight-category-pill pill-constrain--category";
    case "meta":
      return "finding-meta-pill";
    case "signal":
      return "ranking-signal-pill";
    case "label":
      return "finding-meta-pill-label";
    default:
      return "";
  }
}

function buildClassName({
  variant = "insight",
  confidence,
  static: staticPill,
  active,
  className,
}: Omit<PillBaseProps, "children" | "title" | "maxWidth">): string {
  return [
    "pill-constrain",
    variantClasses(variant),
    variant === "insight" && staticPill ? "ref-master-insight-pill--static" : "",
    variant === "insight" ? confidenceClass(confidence) : "",
    variant === "insight" && active ? "ref-master-insight-pill--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveMaxWidthStyle(maxWidth: number | string | undefined) {
  if (maxWidth == null) return undefined;
  return {
    maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
  } as const;
}

function PillContent({ children }: { children: ReactNode }) {
  return <span className="pill-constrain-text">{children}</span>;
}

/** Standardized label/badge wrapper with overflow containment and variant styling. */
export function Pill(props: PillProps) {
  const {
    children,
    variant = "insight",
    confidence,
    static: staticPill,
    active,
    className = "",
    title,
    maxWidth,
  } = props;

  const rootClass = buildClassName({
    variant,
    confidence,
    static: staticPill,
    active,
    className,
  });
  const style = resolveMaxWidthStyle(maxWidth);

  if (props.as === "button") {
    const { onClick, "aria-expanded": ariaExpanded, "aria-controls": ariaControls, type } =
      props;
    return (
      <button
        type={type ?? "button"}
        className={`${rootClass} rw-focus-visible`.trim()}
        title={title}
        style={style}
        onClick={onClick}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
      >
        <PillContent>{children}</PillContent>
      </button>
    );
  }

  return (
    <span className={rootClass} title={title} style={style}>
      <PillContent>{children}</PillContent>
    </span>
  );
}
