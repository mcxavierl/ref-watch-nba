"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "@/lib/command-palette-events";

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      className="command-palette-trigger rw-focus-ring"
      onClick={() => openCommandPalette()}
      aria-label="Open search (Command K)"
    >
      <Search className="command-palette-trigger-icon" aria-hidden strokeWidth={2.1} />
      <span className="command-palette-trigger-label">Search refs, teams...</span>
      <kbd className="command-palette-trigger-kbd">⌘K</kbd>
    </button>
  );
}
