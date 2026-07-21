"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Root tooltip provider for Radix-based hints (Evidence drawer, etc.). */
export function AppTooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      {children}
    </TooltipProvider>
  );
}
