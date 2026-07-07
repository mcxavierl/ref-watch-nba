import { SITE_NAME } from "@/lib/site";

/** Server-side only — never import from client components. */
export const SEASON_NOTIFY_DESTINATION = "mcxl55@gmail.com";

const PUBLIC_CONTACT_EMAIL = "hello@refwatch.ca";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidNotifyEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function seasonNotifyMailto(league: "NBA" | "NHL"): string {
  const subject = encodeURIComponent(
    `${league} season alerts — ${SITE_NAME}`,
  );
  const body = encodeURIComponent(
    `Notify me when ${league} crew assignments and nightly slate signals return on ${SITE_NAME}.\n\nEmail: \nLeague: ${league}\n`,
  );
  return `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export function proWaitlistMailto(league?: "NBA" | "NHL"): string {
  const subject = encodeURIComponent(`${SITE_NAME} Pro waitlist`);
  const leagueLine = league ? `\nLeague: ${league}` : "";
  const body = encodeURIComponent(
    `Add me to the ${SITE_NAME} Pro waitlist for slate alerts, line-move tracking, and deeper crew reunion stats.${leagueLine}\n\nEmail: \n`,
  );
  return `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export type SeasonNotifyPayload = {
  email: string;
  league: "NBA" | "NHL";
};

export function parseSeasonNotifyPayload(
  body: unknown,
): SeasonNotifyPayload | null {
  if (!body || typeof body !== "object") return null;
  const { email, league } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isValidNotifyEmail(email)) return null;
  if (league !== "NBA" && league !== "NHL") return null;
  return { email: email.trim().toLowerCase(), league };
}
