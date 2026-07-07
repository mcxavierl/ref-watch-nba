import { Bell } from "lucide-react";
import { seasonNotifyMailto } from "@/lib/notify";

export function SeasonNotifyCta({ league }: { league: "NBA" | "NHL" }) {
  return (
    <a
      href={seasonNotifyMailto(league)}
      className="btn-secondary inline-flex items-center gap-2"
    >
      <Bell className="size-4 shrink-0" aria-hidden />
      Notify me when the season starts
    </a>
  );
}
