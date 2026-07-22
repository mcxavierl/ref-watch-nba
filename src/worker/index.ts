export interface Env {
  SITE_URL?: string;
  CRON_SECRET?: string;
}

type ScheduledEvent = {
  cron: string;
  scheduledTime: number;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

async function postCron(
  env: Env,
  path: string,
): Promise<Response> {
  const baseUrl = (env.SITE_URL ?? "https://refwatch.ca").replace(/\/$/, "");
  const secret = env.CRON_SECRET;
  if (!secret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === "*/5 * * * *") {
      ctx.waitUntil(postCron(env, "/api/cron/sync-slate"));
      return;
    }

    if (event.cron === "0 8 * * *") {
      ctx.waitUntil(postCron(env, "/api/cron/recalibrate"));
      return;
    }
  },
};
