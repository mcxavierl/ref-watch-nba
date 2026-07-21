"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Radio, X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { BroadcasterExportPanel } from "@/components/media/BroadcasterExportPanel";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { MediaCardContent } from "@/lib/media/media-card-content";

const DRAWER_TRANSITION_MS = 220;

type MediaBroadcastKitDrawerProps = {
  open: boolean;
  onClose: () => void;
  preview?: GameSlatePreviewPayload;
  evidence?: ProjectionEvidencePayload;
  content?: MediaCardContent;
  teleprompterCopy?: string;
  exportFilename?: string;
  title?: string;
};

export function MediaBroadcastKitDrawer({
  open,
  onClose,
  preview,
  evidence,
  content,
  teleprompterCopy,
  exportFilename,
  title = "Media & Broadcast Kit",
}: MediaBroadcastKitDrawerProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setRendered(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!rendered || !open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rendered, open, onClose]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!rendered) return null;

  return (
    <ModalPortal>
      <div
        className={`ref-preview-drawer-backdrop${visible ? " ref-preview-drawer-backdrop--visible" : ""}`}
        role="presentation"
        onClick={handleBackdropClick}
      >
        <aside
          className={`ref-preview-drawer media-broadcast-kit-drawer${visible ? " ref-preview-drawer--visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ref-preview-drawer-header">
            <div className="ref-preview-drawer-header-copy">
              <p className="ref-preview-drawer-kicker">Broadcast partners</p>
              <h2 className="ref-preview-drawer-title" id={titleId}>
                {title}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="ref-preview-drawer-close"
              onClick={onClose}
              aria-label="Close media and broadcast kit"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="ref-preview-drawer-body">
            <BroadcasterExportPanel
              preview={preview}
              evidence={evidence}
              content={content}
              teleprompterCopy={teleprompterCopy}
              exportFilename={exportFilename}
            />
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}

type MediaBroadcastKitTriggerProps = {
  preview?: GameSlatePreviewPayload;
  evidence?: ProjectionEvidencePayload;
  content?: MediaCardContent;
  teleprompterCopy?: string;
  exportFilename?: string;
  title?: string;
  className?: string;
  label?: string;
};

export function MediaBroadcastKitTrigger({
  preview,
  evidence,
  content,
  teleprompterCopy,
  exportFilename,
  title,
  className = "",
  label = "Media & Broadcast Kit",
}: MediaBroadcastKitTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`btn-secondary inline-flex items-center gap-1.5 ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <Radio size={16} aria-hidden />
        {label}
      </button>
      <MediaBroadcastKitDrawer
        open={open}
        onClose={() => setOpen(false)}
        preview={preview}
        evidence={evidence}
        content={content}
        teleprompterCopy={teleprompterCopy}
        exportFilename={exportFilename}
        title={title}
      />
    </>
  );
}
