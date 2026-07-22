import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SiteNavLink } from "@/components/SiteNavLink";

export type HeaderNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/** @deprecated Use SiteNavLink directly. Kept for header chrome call sites. */
export function HeaderNavLink(props: HeaderNavLinkProps) {
  return <SiteNavLink {...props} />;
}
