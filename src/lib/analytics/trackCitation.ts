"use client";

import type { CitationEventPayload } from "@/lib/intelligence/intelligence-card-types";

const CITATION_API_PATH = "/api/v1/analytics/citation";

export async function trackCitationEvent(payload: CitationEventPayload): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[trackCitation]", payload);
  }

  try {
    await fetch(CITATION_API_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[trackCitation] persistence failed", error);
    }
  }
}
