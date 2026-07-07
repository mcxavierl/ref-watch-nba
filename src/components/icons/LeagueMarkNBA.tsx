import type { SVGProps } from "react";

/** Stylized basketball mark for league toggle (not an official NBA logo). */
export function LeagueMarkNBA({
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
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3.75v16.5M3.75 12h16.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.8c2.4 1.6 6.8 2.2 11.6 0.4M6.2 17.2c2.4-1.6 6.8-2.2 11.6-0.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
