import { toPng } from "html-to-image";
import {
  MEDIA_CARD_HEIGHT,
  MEDIA_CARD_WIDTH,
} from "@/lib/media/media-card-types";

export type ExportBroadcastGraphicOptions = {
  filename?: string;
  pixelRatio?: number;
};

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function exportBroadcastGraphicPng(
  node: HTMLElement,
  options: ExportBroadcastGraphicOptions = {},
): Promise<void> {
  const pixelRatio = options.pixelRatio ?? 1;
  const dataUrl = await toPng(node, {
    width: MEDIA_CARD_WIDTH,
    height: MEDIA_CARD_HEIGHT,
    pixelRatio,
    cacheBust: true,
    style: {
      transform: "none",
    },
  });

  const link = document.createElement("a");
  link.download =
    options.filename ??
    `ref-watch-broadcast-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}

export function broadcastGraphicFilename(matchup: string): string {
  const slug = sanitizeFilename(matchup);
  return `ref-watch-${slug || "broadcast"}.png`;
}
