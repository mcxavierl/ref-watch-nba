import { Info } from "lucide-react";

export function OffseasonAlertBanner({ league }: { league: "NBA" | "NHL" }) {
  return (
    <div className="offseason-alert" role="status">
      <Info className="offseason-alert-icon" aria-hidden />
      <p className="offseason-alert-text">
        Offseason, historical data only. Live slate returns when the{" "}
        {league} season resumes.
      </p>
    </div>
  );
}
