import type { ReactNode } from "react";
import { GLOSSARY, type GlossaryId } from "@/lib/glossary";

export function TermHelp({
  id,
  children,
  className = "",
}: {
  id: GlossaryId;
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[id];
  const label = children ?? entry.label;

  return (
    <span className={`term-help ${className}`.trim()}>
      <span
        className="term-help-trigger border-b border-dotted border-zinc-400 cursor-help"
        tabIndex={0}
        aria-describedby={`term-def-${id}`}
      >
        {label}
      </span>
      <span
        id={`term-def-${id}`}
        role="tooltip"
        className="term-help-tooltip"
      >
        {entry.text}
      </span>
      <span className="term-help-mobile">{entry.text}</span>
    </span>
  );
}

/** Section heading with glossary term as the label. */
export function TermHeading({
  id,
  as: Component = "h2",
  className = "text-sm font-semibold text-zinc-800",
}: {
  id: GlossaryId;
  as?: "h2" | "h3" | "p";
  className?: string;
}) {
  return (
    <Component className={className}>
      <TermHelp id={id} />
    </Component>
  );
}
