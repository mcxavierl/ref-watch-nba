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
)});function systemColor(){return window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}function applyResolved(color,contrast,text,bf){d.dataset.contrast=contrast;d.dataset.color=color;d.dataset.theme=color;d.dataset.text=text;if(bf==="atkinson")d.dataset.bodyFont="atkinson";else delete d.dataset.bodyFont;if(color==="dark")d.classList.add("dark");else d.classList.remove("dark");}if(!r){var sys=systemColor();applyResolved(sys,"default","default","default");return;}var p=JSON.parse(r);if(!p||typeof p!=="object")return;var contrast=p.contrast==="high"?"high":"default";var pref=p.colorMode;var color=(pref==="light"||pref==="dark")?pref:systemColor();var text=p.textSize==="large"?"large":"default";var f=p.font;var bf=(f==="atkinson"||f==="dyslexia")?"atkinson":"default";applyResolved(color,contrast,text,bf);}catch(e){}})();`;
