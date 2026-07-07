import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function MethodologyAccordion({
  title = "Methodology",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="methodology-accordion">
      <summary className="methodology-accordion-trigger">
        <span>{title}</span>
        <ChevronDown className="methodology-accordion-chevron" aria-hidden />
      </summary>
      <div className="methodology-accordion-panel">{children}</div>
    </details>
  );
}
