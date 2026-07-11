import { REFWATCH_A11Y_STORAGE_KEY } from "@/lib/a11y/a11yStorageConstants";

export type BodyFontPreference = "default" | "atkinson";

/** Maps persisted `font` field to body preference. */
export function bodyFontFromStoredField(raw: unknown): BodyFontPreference {
  if (raw === "atkinson") return "atkinson";
  if (raw === "default" || raw === "plex" || raw === "geist") return "default";
  if (raw === "dyslexia") return "atkinson";
  return "default";
}

/**
 * Runs before paint so contrast / colour / text / font prefs apply without a flash.
 * Must stay in sync with `writeRootDataAttributes` in `useA11ySettings`.
 */
export const A11Y_BLOCKING_SCRIPT = `(function(){try{var d=document.documentElement;var r=localStorage.getItem(${JSON.stringify(
  REFWATCH_A11Y_STORAGE_KEY
)});if(!r){d.dataset.color="dark";d.dataset.contrast="default";d.dataset.text="default";delete d.dataset.bodyFont;d.classList.add("dark");return;}var p=JSON.parse(r);if(!p||typeof p!=="object")return;var contrast=p.contrast==="high"?"high":"default";var color=p.colorMode==="light"?"light":"dark";var text=p.textSize==="large"?"large":"default";var f=p.font;var bf=(f==="atkinson"||f==="dyslexia")?"atkinson":"default";d.dataset.contrast=contrast;d.dataset.color=color;d.dataset.text=text;if(bf==="atkinson")d.dataset.bodyFont="atkinson";else delete d.dataset.bodyFont;if(color==="dark")d.classList.add("dark");else d.classList.remove("dark");}catch(e){}})();`;
