import { SITE_NAME } from "@/lib/site";

const NOTIFY_EMAIL = "hello@refwatch.ca";

export function seasonNotifyMailto(league: "NBA" | "NHL"): string {
  const subject = encodeURIComponent(
    `${league} season alerts — ${SITE_NAME}`,
  );
  const body = encodeURIComponent(
    `Notify me when ${league} crew assignments and nightly slate signals return on ${SITE_NAME}.\n\nEmail: \nLeague: ${league}\n`,
  );
  return `mailto:${NOTIFY_EMAIL}?subject=${subject}&body=${body}`;
}

export function proWaitlistMailto(league?: "NBA" | "NHL"): string {
  const subject = encodeURIComponent(`${SITE_NAME} Pro waitlist`);
  const leagueLine = league ? `\nLeague: ${league}` : "";
  const body = encodeURIComponent(
    `Add me to the ${SITE_NAME} Pro waitlist for slate alerts, line-move tracking, and deeper crew reunion stats.${leagueLine}\n\nEmail: \n`,
  );
  return `mailto:${NOTIFY_EMAIL}?subject=${subject}&body=${body}`;
}
