"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

type InsightCardShellProps = {
  children: ReactNode;
  className?: string;
  "data-league"?: string;
  "data-tone"?: string;
  "aria-hidden"?: boolean;
  style?: CSSProperties;
};

export function InsightCardShell({
  children,
  className,
  ...rest
}: InsightCardShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const mergedClass = `insight-card-shell ${className ?? ""}`.trim();

  if (prefersReducedMotion) {
    return (
      <article className={mergedClass} {...rest}>
        {children}
      </article>
    );
  }

  return (
    <motion.article
      className={mergedClass}
      {...rest}
      initial={false}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 22px rgba(0, 0, 0, 0.07)",
      }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.article>
  );
}
