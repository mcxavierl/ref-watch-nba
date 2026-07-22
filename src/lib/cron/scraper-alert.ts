import type { LeagueId } from "@/lib/leagues";

export type ScraperAlertPayload = {
  operation: string;
  leagueId?: LeagueId;
  message: string;
  gameCount?: number;
  error?: string;
};

export async function dispatchScraperAlert(
  payload: ScraperAlertPayload,
): Promise<{ dispatched: boolean }> {
  const body = {
    type: "refwatch.scraper_alert",
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const webhookUrl =
    process.env.SCRAPER_ALERT_WEBHOOK_URL ??
    process.env.REFWATCH_WEBHOOK_URL ??
    process.env.SENTRY_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("[scraper-alert]", JSON.stringify(body));
    return { dispatched: false };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(
        `[scraper-alert] webhook returned ${response.status}: ${await response.text()}`,
      );
      return { dispatched: false };
    }
    return { dispatched: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scraper-alert] dispatch failed: ${message}`);
    return { dispatched: false };
  }
}

export async function alertIfActiveSlateEmpty(options: {
  leagueId: LeagueId;
  isLiveSeason: boolean;
  gameCount: number;
  operation: string;
}): Promise<void> {
  if (!options.isLiveSeason || options.gameCount > 0) return;
  await dispatchScraperAlert({
    operation: options.operation,
    leagueId: options.leagueId,
    message: `Zero games returned during active season for ${options.leagueId}`,
    gameCount: 0,
  });
}
