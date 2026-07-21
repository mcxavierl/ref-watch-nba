import type { ReactNode } from "react";

type DataTableScrollWrapProps = {
  children: ReactNode;
  className?: string;
};

/** Horizontal scroll shell for data tables with right-edge padding so columns do not clip. */
export function DataTableScrollWrap({
  children,
  className = "",
}: DataTableScrollWrapProps) {
  return (
    <div className={`data-table-scroll-wrap ${className}`.trim()}>{children}</div>
  );
}
