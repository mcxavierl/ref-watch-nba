import { DELTA_HONESTY_FOOTNOTE } from "@/lib/data-maturity";

type DataHonestyFootnoteProps = {
  className?: string;
  show?: boolean;
};

export function DataHonestyFootnote({
  className = "",
  show = true,
}: DataHonestyFootnoteProps) {
  if (!show) return null;

  return (
    <p
      className={`data-honesty-footnote${className ? ` ${className}` : ""}`.trim()}
    >
      {DELTA_HONESTY_FOOTNOTE}
    </p>
  );
}
