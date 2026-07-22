"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

export type PrefetchLinkProps = ComponentProps<typeof Link>;

/**
 * Navigation link with viewport prefetch. Hover/focus prefetch is intentionally omitted
 * to avoid HTTP/2 contention with live slate polling on Cloudflare/OpenNext.
 */
export function PrefetchLink({ href, prefetch = true, ...rest }: PrefetchLinkProps) {
  return <Link href={href} prefetch={prefetch} {...rest} />;
}
