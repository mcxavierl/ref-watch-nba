"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AccessibilityUniversal } from "@/components/icons/AccessibilityUniversal";
import { useA11ySettings } from "@/lib/a11y/useA11ySettings";
import type {
  ColorModeSetting,
  ContrastSetting,
  FontSetting,
  TextSizeSetting,
} from "@/lib/a11y/useA11ySettings";

type PanelBox = { top: number; width: number; right: number };

type SettingRadioGroupProps<T extends string> = {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
};

function SettingRadioGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: SettingRadioGroupProps<T>) {
  return (
    <fieldset className="a11y-setting-group">
      <legend className="a11y-setting-legend">{legend}</legend>
      <div className="a11y-setting-options">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`a11y-setting-pill${checked ? " a11y-setting-pill--active" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function A11ySettingsPanel() {
  const [open, setOpen] = useState(false);
  const [panelBox, setPanelBox] = useState<PanelBox | null>(null);
  const { settings, setContrast, setColorMode, setTextSize, setFont } = useA11ySettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const maxW = Math.min(320, Math.max(200, window.innerWidth - 2 * margin));
    let right = window.innerWidth - r.right;
    const leftEdge = window.innerWidth - right - maxW;
    if (leftEdge < margin) {
      right = Math.max(margin, window.innerWidth - margin - maxW);
    }
    // Keep panel below the sticky header chrome; clamp if near viewport bottom.
    const top = Math.min(r.bottom + 8, window.innerHeight - 16);
    setPanelBox({ top, right, width: maxW });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const closePanel = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closePanel();
    }
    function onDocKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closePanel();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open, closePanel]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const root = panelRef.current;
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function focusables(): HTMLElement[] {
      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => {
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        return true;
      });
    }

    window.requestAnimationFrame(() => {
      focusables()[0]?.focus();
    });

    function onPanelKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onPanelKeyDown);
    return () => root.removeEventListener("keydown", onPanelKeyDown);
  }, [open]);

  return (
    <div className="a11y-settings">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Accessibility settings"
        aria-expanded={open}
        aria-controls="a11y-settings-panel"
        onClick={() => (open ? closePanel() : setOpen(true))}
        className="a11y-settings-trigger"
      >
        <AccessibilityUniversal size={22} className="a11y-settings-trigger-icon" aria-hidden />
      </button>
      {open && panelBox ? (
        <div
          ref={panelRef}
          id="a11y-settings-panel"
          className="a11y-settings-panel"
          style={{
            top: panelBox.top,
            right: panelBox.right,
            width: panelBox.width,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Accessibility settings"
        >
          <div className="a11y-settings-panel-header">
            <h2 className="a11y-settings-panel-title">Accessibility settings</h2>
            <button
              type="button"
              onClick={closePanel}
              className="a11y-settings-close"
              aria-label="Close accessibility settings"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="a11y-settings-panel-body">
            <SettingRadioGroup
              legend="Contrast"
              name="refwatch-a11y-contrast"
              value={settings.contrast}
              onChange={(v) => setContrast(v as ContrastSetting)}
              options={[
                { value: "default", label: "Default" },
                { value: "high", label: "High" },
              ]}
            />

            <SettingRadioGroup
              legend="Colour mode"
              name="refwatch-a11y-color-mode"
              value={settings.colorMode}
              onChange={(v) => setColorMode(v as ColorModeSetting)}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />

            <SettingRadioGroup
              legend="Text size"
              name="refwatch-a11y-text-size"
              value={settings.textSize}
              onChange={(v) => setTextSize(v as TextSizeSetting)}
              options={[
                { value: "default", label: "Default" },
                { value: "large", label: "Large" },
              ]}
            />

            <div>
              <SettingRadioGroup
                legend="Font"
                name="refwatch-a11y-font"
                value={settings.font}
                onChange={(v) => setFont(v as FontSetting)}
                options={[
                  { value: "default", label: "Default" },
                  { value: "atkinson", label: "Dyslexia-friendly font" },
                ]}
              />
              <p className="a11y-settings-caption">
                Uses Atkinson Hyperlegible for all on-screen text, including headings and the
                wordmark.
              </p>
            </div>

            <div>
              <p className="a11y-setting-legend">Animations</p>
              <p className="a11y-settings-caption">
                Motion follows your device&apos;s reduce-motion setting. Existing skip-link and
                focus styles stay in place.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
