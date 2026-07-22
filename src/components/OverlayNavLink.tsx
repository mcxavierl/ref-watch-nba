import type { AnchorHTMLAttributes, ReactNode } from "react";

export type OverlayNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/** Full-page navigation inside modal drawers and overlays (avoids App Router soft-nav races). */
export function OverlayNavLink({ href, children, ...rest }: OverlayNavLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
