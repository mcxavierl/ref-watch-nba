import { AlertCircle, Phone } from "lucide-react";

/** Canada-wide problem gambling support via ConnexOntario (24/7, confidential). */
const SUPPORT_URL = "https://www.connexontario.ca/en-ca/";
const SUPPORT_PHONE = "1-866-531-2600";

export function GamblingDisclaimer() {
  return (
    <aside className="gambling-disclaimer" aria-label="Responsible gambling">
      <div className="mx-auto flex max-w-6xl gap-3 px-4 py-4 sm:px-6">
        <AlertCircle
          className="gambling-disclaimer-icon mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <p className="gambling-disclaimer-text">
          <span className="font-semibold">Not betting advice.</span> Ref Watch
          shows historical referee trends for information only. Past patterns
          do not predict future results. If gambling is affecting you or
          someone you know, free confidential help is available across Canada:{" "}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/-/g, "")}`}
            className="inline-flex items-center gap-1"
          >
            <Phone className="size-3.5" aria-hidden />
            {SUPPORT_PHONE}
          </a>{" "}
          (
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            ConnexOntario, 24/7
          </a>
          ).
        </p>
      </div>
    </aside>
  );
}
