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
import type { MediaBroadcastExport } from "@/lib/media/media-card-types";

const MODAL_TRANSITION_MS = 200;

type MediaCardModalProps = {
  open: boolean;
  onClose: () => void;
  broadcastExport: MediaBroadcastExport;
  title?: string;
};

export function MediaCardModal({
  open,
  onClose,
  broadcastExport,
  title = "Broadcaster Export",
}: MediaCardModalProps) {
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
    const timer = window.setTimeout(() => setRendered(false), MODAL_TRANSITION_MS);
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
        className={[
          "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm",
          "media-card-modal-backdrop",
          visible ? "media-card-modal-backdrop--visible" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="presentation"
        onClick={handleBackdropClick}
      >
        <div
          className={`insight-drilldown-modal media-card-modal${visible ? " insight-drilldown-modal--visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="insight-drilldown-header">
            <div className="insight-drilldown-header-copy">
              <p className="insight-drilldown-kicker">Broadcast partners</p>
              <h2 className="insight-drilldown-title" id={titleId}>
                {title}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="insight-drilldown-close"
              onClick={onClose}
              aria-label="Close broadcaster export"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="media-card-modal-body">
            <BroadcasterExportPanel
              content={broadcastExport.content}
              teleprompterCopy={broadcastExport.teleprompterCopy}
              exportFilename={broadcastExport.exportFilename}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

type ExportOnAirGraphicTriggerProps = {
  broadcastExport: MediaBroadcastExport;
  title?: string;
  className?: string;
  label?: string;
};

export function ExportOnAirGraphicTrigger({
  broadcastExport,
  title,
  className = "",
  label = "Export On-Air Graphic",
}: ExportOnAirGraphicTriggerProps) {
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
      <MediaCardModal
        open={open}
        onClose={() => setOpen(false)}
        broadcastExport={broadcastExport}
        title={title}
      />
    </>
  );
}
