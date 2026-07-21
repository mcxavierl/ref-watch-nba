"use client";

import { createContext, useContext, type ReactNode } from "react";

type TooltipContextValue = {
  panelClassName: string;
};

const TooltipContext = createContext<TooltipContextValue>({
  panelClassName: "",
});

type TooltipProviderProps = {
  children: ReactNode;
  panelClassName?: string;
};

/** Shared tooltip styling context for evidence metrics and drawers. */
export function TooltipProvider({
  children,
  panelClassName = "",
}: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ panelClassName }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipPanelClassName(): string {
  return useContext(TooltipContext).panelClassName;
}
