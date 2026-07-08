"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePageHeader } from "@/components/PageHeaderContext";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader({ title, meta: children });
    return () => setPageHeader(null);
  }, [title, children, setPageHeader]);

  return null;
}
