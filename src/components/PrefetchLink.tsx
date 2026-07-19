"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

export type PrefetchLinkProps = ComponentProps<typeof Link>;

function prefetchTarget(
  router: ReturnType<typeof useRouter>,
  href: PrefetchLinkProps["href"],
) {
  if (typeof href === "string") {
    router.prefetch(href);
    return;
  }

  if (href && typeof href === "object" && "pathname" in href && href.pathname) {
    const search =
      typeof href.search === "string"
        ? href.search.startsWith("?")
          ? href.search
          : href.search
            ? `?${href.search}`
            : ""
        : "";
    const hash = typeof href.hash === "string" ? href.hash : "";
    router.prefetch(`${href.pathname}${search}${hash}`);
  }
}

/**
 * Navigation link with viewport prefetch plus hover/focus warm-up for instant route transitions.
 */
export function PrefetchLink({
  href,
  prefetch = true,
  onMouseEnter,
  onFocus,
  ...rest
}: PrefetchLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        prefetchTarget(router, href);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchTarget(router, href);
        onFocus?.(event);
      }}
      {...rest}
    />
  );
}
