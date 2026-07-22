export const COMMAND_PALETTE_OPEN_EVENT = "refwatch:command-palette-open";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}
