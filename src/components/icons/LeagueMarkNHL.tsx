import type { SVGProps } from "react";

/** Stylized puck and stick mark for league toggle (not an official NHL logo). */
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
        d="M5 19.5V9.5c0-2.2 1.5-3.5 3.2-3.5h2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.5h3.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="15.5"
        cy="17.25"
        rx="4.25"
        ry="1.35"
        fill="currentColor"
        opacity="0.22"
      />
      <ellipse
        cx="15.5"
        cy="16.25"
        rx="4.25"
        ry="2.35"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13.5 16.25h4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
