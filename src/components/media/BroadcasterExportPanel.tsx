"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import type { ProducerCopySections } from "@/lib/media/media-card-types";

type BroadcasterExportPanelProps = {
  producerCopy: ProducerCopySections;
  className?: string;
};

type CopySectionId = "all" | "lowerThird" | "teleprompter" | "producerBullets";

type CopySectionConfig = {
  id: CopySectionId;
  title: string;
  text: string;
};

function CopySection({
  title,
  text,
  copied,
  onCopy,
}: {
  title: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="producer-copy-section" aria-label={title}>
      <div className="producer-copy-section-header">
        <h3 className="producer-copy-section-title">{title}</h3>
        <button
          type="button"
          className={`btn-secondary inline-flex items-center gap-1.5 producer-copy-section-button${
            copied ? " btn-success" : ""
          }`}
          onClick={onCopy}
          aria-live="polite"
        >
          {copied ? (
            <Check size={16} aria-hidden className="text-emerald-700" />
          ) : (
            <Copy size={16} aria-hidden />
          )}
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>
      <pre className="producer-copy-block">{text}</pre>
    </section>
  );
}

export function BroadcasterExportPanel({
  producerCopy,
  className = "",
}: BroadcasterExportPanelProps) {
  const [copiedSection, setCopiedSection] = useState<CopySectionId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sections: CopySectionConfig[] = [
    {
      id: "lowerThird",
      title: "Lower-Third / Banner Text",
      text: producerCopy.lowerThird,
    },
    {
      id: "teleprompter",
      title: "Teleprompter / Commentary Script",
      text: producerCopy.teleprompter,
    },
    {
      id: "producerBullets",
      title: "Producer Bullet Points / Stat Breakdown",
      text: producerCopy.producerBullets,
    },
  ];

  const copyText = useCallback(async (sectionId: CopySectionId, text: string) => {
    setErrorMessage(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      window.setTimeout(() => setCopiedSection(null), 2200);
    } catch {
      setErrorMessage("Clipboard access failed. Check browser permissions.");
    }
  }, []);

  return (
    <section
      className={`broadcaster-export-panel ${className}`.trim()}
      aria-label="Producer on-air copy"
    >
      <div className="producer-copy-quick-action">
        <button
          type="button"
          className={`btn-primary inline-flex items-center gap-1.5${
            copiedSection === "all" ? " btn-success" : ""
          }`}
          onClick={() => copyText("all", producerCopy.all)}
          aria-live="polite"
        >
          {copiedSection === "all" ? (
            <Check size={16} aria-hidden className="text-emerald-700" />
          ) : (
            <Copy size={16} aria-hidden />
          )}
          {copiedSection === "all" ? "Copied!" : "Copy All Producer Notes"}
        </button>
      </div>

      <div className="producer-copy-sections">
        {sections.map((section) => (
          <CopySection
            key={section.id}
            title={section.title}
            text={section.text}
            copied={copiedSection === section.id}
            onCopy={() => copyText(section.id, section.text)}
          />
        ))}
      </div>

      {errorMessage ? (
        <p className="broadcaster-export-status broadcaster-export-status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
