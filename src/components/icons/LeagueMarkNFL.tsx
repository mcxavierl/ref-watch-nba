import type { SVGProps } from "react";

/** Stylized football mark for league toggle (not an official NFL logo). */
export function LeagueMarkNFL({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 36 20"
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M1.5 10C1.5 5.4 7.2 2.25 18 2.25S34.5 5.4 34.5 10 28.8 17.75 18 17.75 1.5 14.6 1.5 10Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M18 4.5v11"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M13.5 8h9M13 10h10M13.5 12h9"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
