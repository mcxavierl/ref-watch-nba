import { formatRefJerseyNumber } from "@/lib/ref-number";

export function RefJerseyNumber({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  const label = formatRefJerseyNumber(number);
  if (!label) return null;
  return <span className={className}>{label}</span>;
}
