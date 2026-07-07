import { AlertCircle, Phone } from "lucide-react";

/** Canada-wide problem gambling support via ConnexOntario (24/7, confidential). */
const SUPPORT_URL = "https://www.connexontario.ca/en-ca/";
const SUPPORT_PHONE = "1-866-531-2600";

export function GamblingDisclaimer() {
  return (
    <aside
      className="border-t-2 border-amber-200/80 bg-amber-50/90"
      aria-label="Responsible gambling"
    >
      <div className="mx-auto flex max-w-5xl gap-3 px-4 py-4 sm:px-6">
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-amber-800"
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-amber-950">
          <span className="font-semibold">Not betting advice.</span> Ref Watch
          shows historical referee trends for information only. Past patterns
          do not predict future results. If gambling is affecting you or
          someone you know, free confidential help is available across Canada:{" "}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/-/g, "")}`}
            className="inline-flex items-center gap-1 font-semibold text-amber-950 underline-offset-2 hover:underline"
          >
            <Phone className="size-3.5" aria-hidden />
            {SUPPORT_PHONE}
          </a>{" "}
          (
          <a
            href={SUPPORT_URL}
            className="font-medium underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ConnexOntario, 24/7
          </a>
          ).
        </p>
      </div>
    </aside>
  );
}
