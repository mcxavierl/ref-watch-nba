import type { AnchorHTMLAttributes, ReactNode } from "react";

export type SiteNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Full-page navigation for internal routes. Avoids App Router soft-nav races on
 * Cloudflare/OpenNext when live slate clients poll in the background.
 */
export function SiteNavLink({ href, children, ...rest }: SiteNavLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
