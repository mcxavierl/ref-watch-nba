"use client";

import { useState } from "react";

const VISIBLE_NAME_LIMIT = 8;

export function FindingNameWall({ names }: { names: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, names.length - VISIBLE_NAME_LIMIT);
  const visibleNames =
    expanded || hiddenCount === 0 ? names : names.slice(0, VISIBLE_NAME_LIMIT);

  return (
    <span className="finding-name-wall">
      {visibleNames.map((name) => (
        <span key={name} className="finding-name-pill">
          {name}
        </span>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="finding-name-pill finding-name-pill-more"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(true);
          }}
        >
          +{hiddenCount} more
        </button>
      )}
    </span>
  );
}

const OVER_CLUB_PATTERN = /^(.*?)The over club: (.+)\.(.*)$/;

export function FindingExplainer({ text }: { text: string }) {
  const match = text.match(OVER_CLUB_PATTERN);
  if (!match) {
    return <>{text}</>;
  }

  const [, before, namesStr, after] = match;
  const names = namesStr
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return (
    <>
      {before}
      The over club: <FindingNameWall names={names} />.
      {after}
    </>
  );
}
