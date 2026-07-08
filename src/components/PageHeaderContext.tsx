"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PageHeaderState = {
  title: string;
  meta?: ReactNode;
};

type PageHeaderContextValue = {
  pageHeader: PageHeaderState | null;
  setPageHeader: (next: PageHeaderState | null) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [pageHeader, setPageHeaderState] = useState<PageHeaderState | null>(
    null,
  );

  const setPageHeader = useCallback((next: PageHeaderState | null) => {
    setPageHeaderState(next);
  }, []);

  const value = useMemo(
    () => ({ pageHeader, setPageHeader }),
    [pageHeader, setPageHeader],
  );

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeader must be used within PageHeaderProvider");
  }
  return ctx;
}
