import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";
import "./cbb-clinical.css";

export function CbbClinicalNotifyCallout() {
  return (
    <aside
      className="cbb-clinical-panel cbb-clinical-notify"
      aria-label="Season opening notification"
    >
      <p className="cbb-clinical-notify-copy">
        Season opens Nov 4. Crews and tendencies load from verified game data.
      </p>
      <div className="cbb-clinical-notify-cta">
        <SeasonNotifyCta
          league="CBB"
          triggerLabel="Notify me when live data backfills"
        />
      </div>
    </aside>
  );
}
