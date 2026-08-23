"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
  type StarCardPreferences,
  type TextSizePreference,
  type VideoMetadataPreferences,
} from "@/lib/displayPreferences";
import styles from "./PreferencesPopover.module.css";

type PreferencesPopoverProps = {
  view: "videos" | "stars";
  preferences: DisplayPreferences;
  onChange: (preferences: DisplayPreferences) => void;
  tvMode: boolean;
};

/**
 * The column preference is only read by the grids at 64rem and above, or in TV
 * mode; narrower layouts pin the column count to the breakpoint. Offering the
 * control where it cannot do anything just gives the visitor a dead switch.
 */
function useColumnPreferenceApplies(tvMode: boolean): boolean {
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");
    const sync = () => setWideEnough(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return tvMode || wideEnough;
}

const metadataOptions: Array<{ key: keyof VideoMetadataPreferences; label: string }> = [
  { key: "stars", label: "Featured stars" },
  { key: "title", label: "Video name" },
  { key: "creator", label: "Creator" },
  { key: "source", label: "Source platform" },
  { key: "likes", label: "Like count" },
  { key: "year", label: "Release year" },
  { key: "duration", label: "Duration badge" },
];

const starMetadataOptions: Array<{ key: keyof StarCardPreferences; label: string }> = [
  { key: "name", label: "Star name" },
  { key: "role", label: "Role" },
  { key: "location", label: "Location" },
  { key: "appearances", label: "Appearance count" },
  { key: "likes", label: "Related likes" },
  { key: "latest", label: "Latest work year" },
];

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      <path d="M5 7h9M18 7h1M5 17h2M11 17h8M14 4v6M8 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PreferencesPopover({ view, preferences, onChange, tvMode }: PreferencesPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const columnPreferenceApplies = useColumnPreferenceApplies(tvMode);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeRef.current?.focus(), 0);

    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const updateMetadata = (key: keyof VideoMetadataPreferences) => {
    onChange({
      ...preferences,
      metadata: {
        ...preferences.metadata,
        [key]: !preferences.metadata[key],
      },
    });
  };

  const updateStarMetadata = (key: keyof StarCardPreferences) => {
    onChange({
      ...preferences,
      starMetadata: {
        ...preferences.starMetadata,
        [key]: !preferences.starMetadata[key],
      },
    });
  };

  const resetCurrentView = () => {
    if (view === "stars") {
      onChange({
        ...preferences,
        starTextSize: DEFAULT_DISPLAY_PREFERENCES.starTextSize,
        starColumns: DEFAULT_DISPLAY_PREFERENCES.starColumns,
        starMetadata: DEFAULT_DISPLAY_PREFERENCES.starMetadata,
      });
      return;
    }

    onChange({
      ...preferences,
      videoTextSize: DEFAULT_DISPLAY_PREFERENCES.videoTextSize,
      columns: DEFAULT_DISPLAY_PREFERENCES.columns,
      metadata: DEFAULT_DISPLAY_PREFERENCES.metadata,
    });
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-controls="display-preferences"
        onClick={() => setOpen((current) => !current)}
      >
        <SettingsIcon />
        <span>Preferences</span>
      </button>

      {open && (
        <section
          className={styles.popover}
          id="display-preferences"
          role="dialog"
          aria-label="Display preferences"
        >
          <header className={styles.header}>
            <div>
              <p>Display</p>
              <h2>Preferences</h2>
            </div>
            <button ref={closeRef} type="button" aria-label="Close preferences" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          {columnPreferenceApplies && (
            <fieldset className={styles.group}>
              <legend>{view === "stars" ? "Stars per row" : "Videos per row"}</legend>
              <div className={styles.segmented}>
                {([3, 4, 5, 6] as const).map((columns) => (
                  <button
                    key={columns}
                    type="button"
                    className={(view === "stars" ? preferences.starColumns : preferences.columns) === columns ? styles.selected : ""}
                    aria-pressed={(view === "stars" ? preferences.starColumns : preferences.columns) === columns}
                    onClick={() => onChange(
                      view === "stars"
                        ? { ...preferences, starColumns: columns as DisplayPreferences["starColumns"] }
                        : { ...preferences, columns: columns as DisplayPreferences["columns"] },
                    )}
                  >
                    {columns}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className={styles.group}>
            <legend>Text size</legend>
            <div className={styles.segmented}>
              {(["small", "default", "large"] as TextSizePreference[]).map((textSize) => (
                <button
                  key={textSize}
                  type="button"
                  className={(view === "stars" ? preferences.starTextSize : preferences.videoTextSize) === textSize ? styles.selected : ""}
                  aria-pressed={(view === "stars" ? preferences.starTextSize : preferences.videoTextSize) === textSize}
                  onClick={() => onChange(view === "stars"
                    ? { ...preferences, starTextSize: textSize }
                    : { ...preferences, videoTextSize: textSize })}
                >
                  {textSize === "default" ? "Standard" : `${textSize[0].toUpperCase()}${textSize.slice(1)}`}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend>{view === "stars" ? "Star details" : "Video metadata"}</legend>
            <p>
              {view === "stars"
                ? "Choose the details shown on every star card."
                : "Choose the details shown on every thumbnail."}
            </p>
            <div className={styles.toggles}>
              {(view === "stars" ? starMetadataOptions : metadataOptions).map((option) => (
                <label key={option.key}>
                  <span>{option.label}</span>
                  <input
                    type="checkbox"
                    checked={view === "stars"
                      ? preferences.starMetadata[option.key as keyof StarCardPreferences]
                      : preferences.metadata[option.key as keyof VideoMetadataPreferences]}
                    onChange={() => view === "stars"
                      ? updateStarMetadata(option.key as keyof StarCardPreferences)
                      : updateMetadata(option.key as keyof VideoMetadataPreferences)}
                  />
                  <span className={styles.switch} aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className={styles.reset}
            type="button"
            onClick={resetCurrentView}
          >
            Restore {view === "stars" ? "star" : "video"} defaults
          </button>
        </section>
      )}
    </div>
  );
}
