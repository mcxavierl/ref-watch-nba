"use client";

import type { ReactNode } from "react";

/** Soft fade-in once route content is ready (pairs with route loading.tsx skeletons). */
export function PageContentFadeIn({ children }: { children: ReactNode }) {
  return <div className="page-content-fade-in">{children}</div>;
}
