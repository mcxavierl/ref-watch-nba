import type { AnchorHTMLAttributes, ReactNode } from "react";

export type HeaderNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Full-page navigation for persistent header chrome. Avoids App Router soft-nav races
 * on Cloudflare/OpenNext when league slate clients are polling in the background.
 */
export function HeaderNavLink({ href, children, ...rest }: HeaderNavLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
