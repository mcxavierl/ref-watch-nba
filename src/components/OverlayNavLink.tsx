import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SiteNavLink } from "@/components/SiteNavLink";

export type OverlayNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/** Full-page navigation inside modal drawers and overlays. */
export function OverlayNavLink(props: OverlayNavLinkProps) {
  return <SiteNavLink {...props} />;
}
