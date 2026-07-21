export const ASSIGNMENT_RELEASE_TIMEZONE = "America/New_York";

/** Official assignment release window: 8:00 AM through 11:59 AM ET. */
export const ASSIGNMENT_WINDOW_START_HOUR = 8;
export const ASSIGNMENT_WINDOW_END_HOUR = 12;

export function easternHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ASSIGNMENT_RELEASE_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

export function isWithinAssignmentWindow(date = new Date()): boolean {
  const hour = easternHour(date);
  return hour >= ASSIGNMENT_WINDOW_START_HOUR && hour < ASSIGNMENT_WINDOW_END_HOUR;
}
