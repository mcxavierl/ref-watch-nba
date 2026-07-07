import type { SVGProps } from "react";

/** Simplified hockey stick and puck mark for league toggle (not an official NHL logo). */
export function LeagueMarkNHL({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M7 4.5l7.2 10.2"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 14.7c1.4 1.85 3.05 2.3 5.05 1.4"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="8"
        cy="17.25"
        r="2.25"
        fill="currentColor"
      />
      <path
        d="M5.8 17.25h4.4"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.38"
      />
      <path
        d="M12.5 5.2l5.7 8"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
