import type { SVGProps } from "react";

/**
 * Universal accessibility control glyph — standing figure, arms horizontal (not a wheelchair).
 *
 * Source: Google Material Symbols / Material Design Icons, icon **accessibility_new**
 * (`accessibility_new_fill1_24px.svg`, Material Symbols Outlined).
 * Repository: https://github.com/google/material-design-icons/tree/master/symbols/web/accessibility_new
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lucide’s `Accessibility` icon is a wheelchair silhouette; intentionally not used here.
 */
type Props = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function AccessibilityUniversal({ size = 24, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <g transform="matrix(0.025 0 0 0.025 0 24)">
        <path
          fill="currentColor"
          d="M480-720q-33 0-56.5-23.5T400-800q0-33 23.5-56.5T480-880q33 0 56.5 23.5T560-800q0 33-23.5 56.5T480-720ZM360-80v-520q-60-5-122-15t-118-25l20-80q78 21 166 30.5t174 9.5q86 0 174-9.5T820-720l20 80q-56 15-118 25t-122 15v520h-80v-240h-80v240h-80Z"
        />
      </g>
    </svg>
  );
}
