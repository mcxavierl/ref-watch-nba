"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: ReactNode;
};

/** Renders overlay UI at document.body so fixed positioning stays viewport-relative. */
export function ModalPortal({ children }: ModalPortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
