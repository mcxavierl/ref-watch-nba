import type { ElementType, ReactNode } from "react";

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 *
 * Glass-morphism card shell: backdrop-blur-md, thin 1px border, monochromatic frame.
 */
export const CLINICAL_CARD_CLASS =
  "clinical-card backdrop-blur-md border border-[#E5E7EB]";

export function ClinicalCard<T extends ElementType = "div">({
  as,
  className = "",
  children,
  ...dataAttrs
}: {
  as?: T;
  className?: string;
  children: ReactNode;
  "data-league"?: string;
  "data-insight"?: string;
  "data-accent"?: string;
  "data-tone"?: string;
}) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`${CLINICAL_CARD_CLASS} ${className}`.trim()} {...dataAttrs}>
      {children}
    </Tag>
  );
}
