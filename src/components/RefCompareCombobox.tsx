"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CompareRefPickerEntry } from "@/lib/ref-compare";

function entryLabel(entry: CompareRefPickerEntry): string {
  return `${entry.name} (${entry.leagueLabel}) · ${entry.games} gp`;
}

export function RefCompareCombobox({
  id: idProp,
  label,
  entries,
  value,
  onChange,
}: {
  id: string;
  label: string;
  entries: CompareRefPickerEntry[];
  value: string;
  onChange: (key: string) => void;
}) {
  const autoId = useId();
  const inputId = idProp || autoId;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => entries.find((entry) => entry.key === value) ?? null,
    [entries, value],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries.slice(0, 60);
    return entries
      .filter(
        (entry) =>
          entry.name.toLowerCase().includes(normalized) ||
          entry.leagueLabel.toLowerCase().includes(normalized) ||
          entry.slug.toLowerCase().includes(normalized),
      )
      .slice(0, 40);
  }, [entries, query]);

  const displayValue =
    open || query.length > 0
      ? query
      : selected
        ? entryLabel(selected)
        : "";

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const selectEntry = useCallback(
    (entry: CompareRefPickerEntry) => {
      onChange(entry.key);
      close();
      inputRef.current?.blur();
    },
    [close, onChange],
  );

  const clearSelection = useCallback(() => {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) selectEntry(entry);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <div ref={rootRef} className="ref-compare-combobox">
      <label htmlFor={inputId} className="ref-compare-combobox-label">
        {label}
      </label>
      <div className="ref-compare-combobox-input-wrap">
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder="Search officials by name or league"
          className="ref-compare-combobox-input"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {selected ? (
          <button
            type="button"
            className="ref-compare-combobox-clear"
            aria-label={`Clear ${label}`}
            onClick={clearSelection}
          >
            ×
          </button>
        ) : null}
      </div>

      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="ref-compare-combobox-list"
          aria-label={`${label} options`}
        >
          {filtered.map((entry, index) => {
            const isActive = index === activeIndex;
            const isSelected = entry.key === value;
            return (
              <li
                key={entry.key}
                role="option"
                aria-selected={isSelected}
                className={`ref-compare-combobox-option${
                  isActive ? " ref-compare-combobox-option--active" : ""
                }${isSelected ? " ref-compare-combobox-option--selected" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectEntry(entry)}
              >
                <span className="ref-compare-combobox-option-name">{entry.name}</span>
                <span className="ref-compare-combobox-option-meta">
                  {entry.leagueLabel} · {entry.games} gp
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && query.trim() && filtered.length === 0 ? (
        <p className="ref-compare-combobox-empty">No officials match that search.</p>
      ) : null}

      {selected ? (
        <p className="ref-compare-combobox-profile">
          <Link href={selected.href} className="ref-compare-combobox-profile-link">
            {selected.name} profile →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
