"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFooterWrapper({
  nbaFooter,
  nhlFooter,
}: {
  nbaFooter: ReactNode;
  nhlFooter: ReactNode;
}) {
  const pathname = usePathname();
  return pathname.startsWith("/nhl") ? nhlFooter : nbaFooter;
}
