import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SiteNavLink } from "@/components/SiteNavLink";

export type PrefetchLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  /** Ignored: retained for call-site compatibility after switching to full-page nav. */
  prefetch?: boolean;
};

/**
 * Internal navigation link. Uses full-page anchors to avoid App Router soft-nav
 * races on Cloudflare/OpenNext when live slate clients poll in the background.
 */
export function PrefetchLink({ href, prefetch: _prefetch, children, ...rest }: PrefetchLinkProps) {
  return (
    <SiteNavLink href={href} {...rest}>
      {children}
    </SiteNavLink>
  );
}
