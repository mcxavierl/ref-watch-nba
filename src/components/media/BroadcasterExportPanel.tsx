"use client";

import { Check, Copy, Download } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { MediaCard } from "@/components/media/MediaCard";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  broadcastGraphicFilename,
  exportBroadcastGraphicPng,
} from "@/lib/media/export-broadcast-graphic";
import {
  buildMediaCardContent,
  MEDIA_CARD_HEIGHT,
  MEDIA_CARD_WIDTH,
  type MediaCardContent,
} from "@/lib/media/media-card-content";
import { buildOnAirCopy, buildOnAirCopyFromContent } from "@/lib/media/on-air-copy";

type BroadcasterExportPanelProps = {
  preview?: GameSlatePreviewPayload;
  evidence?: ProjectionEvidencePayload;
  content?: MediaCardContent;
  teleprompterCopy?: string;
  exportFilename?: string;
  className?: string;
};

type ExportStatus = "idle" | "exporting" | "copied" | "error";

function usePreviewScale(
  viewportRef: RefObject<HTMLDivElement | null>,
): number {
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateScale = () => {
      const width = node.clientWidth;
      if (width <= 0) return;
      setScale(width / MEDIA_CARD_WIDTH);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewportRef]);

  return scale;
}

export function BroadcasterExportPanel({
  preview,
  evidence,
  content,
  teleprompterCopy,
  exportFilename,
  className = "",
}: BroadcasterExportPanelProps) {
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const exportNodeRef = useRef<HTMLDivElement>(null);
  const previewScale = usePreviewScale(previewViewportRef);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedContent =
    content ??
    (preview && evidence ? buildMediaCardContent(preview, evidence) : null);

  if (!resolvedContent) {
    return null;
  }

  const resolvedCopy =
    teleprompterCopy ??
    (preview && evidence
      ? buildOnAirCopy(preview, evidence, "storyline")
      : buildOnAirCopyFromContent(
          resolvedContent,
          resolvedContent.crewLabel,
          "storyline",
        ));

  const filename =
    exportFilename ?? broadcastGraphicFilename(resolvedContent.matchupBadge);

  const handleExport = useCallback(async () => {
    const node = exportNodeRef.current;
    if (!node) return;

    setStatus("exporting");
    setErrorMessage(null);

    try {
      await exportBroadcastGraphicPng(node, {
        filename,
        pixelRatio: 1,
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Export failed. Try again.",
      );
    }
  }, [filename]);

  const handleCopy = useCallback(async () => {
    setErrorMessage(null);
    try {
      await navigator.clipboard.writeText(resolvedCopy);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
      setErrorMessage("Clipboard access failed. Check browser permissions.");
    }
  }, [resolvedCopy]);

  return (
    <section
      className={`broadcaster-export-panel ${className}`.trim()}
      aria-label="Broadcaster export tools"
    >
      <div className="broadcaster-export-panel-header">
        <div>
          <h3 className="broadcaster-export-panel-title">Broadcaster export</h3>
          <p className="broadcaster-export-panel-lead">
            Generate a 1920×1080 broadcast graphic or copy teleprompter-ready on-air
            copy for producers.
          </p>
        </div>
        <div className="broadcaster-export-actions">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5"
            onClick={handleExport}
            disabled={status === "exporting"}
          >
            <Download size={16} aria-hidden />
            {status === "exporting"
              ? "Exporting..."
              : "Export Broadcast Graphic (1080p PNG)"}
          </button>
          <button
            type="button"
            className={`btn-secondary inline-flex items-center gap-1.5 ${
              status === "copied" ? "btn-success" : ""
            }`}
            onClick={handleCopy}
            aria-live="polite"
          >
            {status === "copied" ? (
              <Check size={16} aria-hidden className="text-emerald-700" />
            ) : (
              <Copy size={16} aria-hidden />
            )}
            {status === "copied" ? "Copied" : "Copy On-Air Teleprompter Copy"}
          </button>
        </div>
      </div>

      <div className="media-card-preview-shell" ref={previewViewportRef}>
        <div className="media-card-preview-viewport">
          <div
            className="media-card-preview-scaler"
            style={{
              width: MEDIA_CARD_WIDTH,
              height: MEDIA_CARD_HEIGHT,
              transform: `scale(${previewScale})`,
            }}
          >
            <MediaCard
              preview={preview}
              evidence={evidence}
              content={resolvedContent}
            />
          </div>
        </div>
      </div>

      <p
        className={`broadcaster-export-status${
          status === "copied"
            ? " broadcaster-export-status--success"
            : status === "error"
              ? " broadcaster-export-status--error"
              : ""
        }`}
        role={status === "error" ? "alert" : "status"}
      >
        {status === "copied"
          ? "On-air teleprompter copy copied to clipboard."
          : errorMessage ?? "PNG exports at full 1920×1080 resolution."}
      </p>

      <div className="broadcaster-export-offscreen" aria-hidden>
        <MediaCard
          ref={exportNodeRef}
          preview={preview}
          evidence={evidence}
          content={resolvedContent}
        />
      </div>
    </section>
  );
}
