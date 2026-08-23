"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { StarPortrait } from "@/components/StarPortrait";
import { VideoCard } from "@/components/VideoCard";
import { type StarProfile } from "@/data/stars";
import { getVideosForStar } from "@/data/starVideoIndex";
import { viewportWidth } from "@/lib/viewport";
import type {
  DisplayPreferences,
  StarCardPreferences,
  TextSizePreference,
  VideoMetadataPreferences,
} from "@/lib/displayPreferences";
import styles from "./StarDirectory.module.css";

export type StarDirectoryEntry = {
  profile: StarProfile;
  appearances: number;
  totalLikes: number;
  newestYear: number;
};

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const remoteKeys: Record<number, string> = {
  13: "Enter",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
};

function directoryColumns(tvMode: boolean, preferredColumns: number): number {
  const width = viewportWidth();
  if (tvMode || width >= 1024) return preferredColumns;
  if (width >= 576) return 2;
  return 1;
}

type StarDirectoryProps = {
  entries: StarDirectoryEntry[];
  tvMode: boolean;
  columns: number;
  details: StarCardPreferences;
  videoColumns: DisplayPreferences["columns"];
  videoTextSize: TextSizePreference;
  videoMetadata: VideoMetadataPreferences;
  lovedStarSlugs: ReadonlySet<string>;
  onToggleStarLove: (starSlug: string) => boolean;
  likedVideoIds: ReadonlySet<string>;
  onToggleVideoLike: (videoId: string) => boolean;
  onExitDown?: () => void;
  initialStarSlug?: string | null;
};

export function StarDirectory({
  entries,
  tvMode,
  columns,
  details,
  videoColumns,
  videoTextSize,
  videoMetadata,
  lovedStarSlugs,
  onToggleStarLove,
  likedVideoIds,
  onToggleVideoLike,
  onExitDown,
  initialStarSlug,
}: StarDirectoryProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeEntry, setActiveEntry] = useState<StarDirectoryEntry | null>(null);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const activeIndexRef = useRef(0);
  const openedInitialSlugRef = useRef<string | null>(null);

  const closeDrawer = useCallback((restoreFocus = true) => {
    setActiveEntry(null);
    setShowAllVideos(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => cardRefs.current[activeIndexRef.current]?.focus());
    }
  }, []);

  useEffect(() => {
    if (!initialStarSlug || openedInitialSlugRef.current === initialStarSlug) return;
    const entryIndex = entries.findIndex(
      ({ profile }) => profile.slug === initialStarSlug,
    );
    if (entryIndex < 0) return;

    openedInitialSlugRef.current = initialStarSlug;
    activeIndexRef.current = entryIndex;
    setFocusedIndex(entryIndex);
    setShowAllVideos(false);
    setActiveEntry(entries[entryIndex]);
  }, [entries, initialStarSlug]);

  useEffect(() => {
    if (!activeEntry) return;
    const previousOverflow = document.body.style.overflow;
    const previousTextSize = document.documentElement.dataset.textSize;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.textSize = videoTextSize;
    window.requestAnimationFrame(() => drawerCloseRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
      } else if (["OK", "Select", "Accept"].includes(event.key)) {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [])];
        const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
        const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(focusable.length - 1, currentIndex + direction));
        if (focusable[nextIndex]) {
          event.preventDefault();
          focusable[nextIndex].focus();
          focusable[nextIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousTextSize) document.documentElement.dataset.textSize = previousTextSize;
      else delete document.documentElement.dataset.textSize;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEntry, closeDrawer, videoTextSize]);

  const handleDrawerVideoLike = useCallback(
    (videoId: string) => {
      if (!onToggleVideoLike(videoId)) closeDrawer(false);
    },
    [closeDrawer, onToggleVideoLike],
  );

  const handleDrawerStarLove = useCallback(
    (starSlug: string) => {
      const changed = onToggleStarLove(starSlug);
      if (!changed) closeDrawer(false);
      return changed;
    },
    [closeDrawer, onToggleStarLove],
  );

  const relatedVideos = activeEntry ? getVideosForStar(activeEntry.profile.slug) : [];
  // The drawer is narrower than the catalogue, so it fits one fewer video per
  // row than the main grid preference.
  const drawerColumns = Math.max(1, videoColumns - 1);
  const displayedVideos = showAllVideos
    ? relatedVideos
    : relatedVideos.slice(0, drawerColumns * 2);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "OK", "Select", "Accept"].includes(event.key)
      ? event.key
      : remoteKeys[event.keyCode] ?? event.key;

    if (["OK", "Select", "Accept"].includes(key) || (key === "Enter" && event.key !== "Enter")) {
      event.preventDefault();
      event.currentTarget.click();
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;

    const activeColumns = directoryColumns(tvMode, columns);
    let target = index;
    if (key === "ArrowLeft" && index % activeColumns !== 0) target -= 1;
    if (key === "ArrowRight" && index % activeColumns !== activeColumns - 1) target += 1;
    if (key === "ArrowUp") target -= activeColumns;
    if (key === "ArrowDown") target += activeColumns;
    if (target < 0 && key === "ArrowUp") {
      event.preventDefault();
      const previousControl = document.querySelector<HTMLElement>(".filter-trigger")
        ?? document.querySelector<HTMLElement>(".nav-search input");
      previousControl?.focus();
      return;
    }
    if (target >= entries.length && key === "ArrowDown" && onExitDown) {
      event.preventDefault();
      onExitDown();
      return;
    }
    target = Math.max(0, Math.min(entries.length - 1, target));
    if (target === index) return;

    event.preventDefault();
    setFocusedIndex(target);
    const nextCard = gridRef.current?.querySelector<HTMLButtonElement>(`[data-star-card-index="${target}"]`);
    nextCard?.focus();
    nextCard?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  };

  // Drop refs for cards that no longer exist, otherwise a shrinking filtered
  // list leaves detached nodes referenced and focus restore targets the wrong card.
  cardRefs.current.length = entries.length;

  return (
    <div ref={gridRef} className={styles.grid} role="list" aria-label="Featured stars">
      {entries.map((entry, index) => {
        const { profile, appearances, totalLikes, newestYear } = entry;
        return (
          <article key={profile.slug} className={styles.item} role="listitem">
            <button
              ref={(element) => { cardRefs.current[index] = element; }}
              className={styles.card}
              type="button"
              tabIndex={tvMode ? (focusedIndex === index ? 0 : -1) : 0}
              data-star-card-index={index}
              aria-label={`Open ${profile.name}, ${profile.role}, ${profile.location}`}
              aria-haspopup="dialog"
              aria-expanded={activeEntry?.profile.slug === profile.slug}
              aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"
              onFocus={() => setFocusedIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onClick={() => {
                activeIndexRef.current = index;
                setShowAllVideos(false);
                setActiveEntry(entry);
              }}
            >
              <StarPortrait star={profile} className={styles.portrait} decorative={false} />
              <div className={styles.shade} aria-hidden="true" />
              <span className={styles.prototype}>Demo profile</span>
              <div className={styles.copy}>
                {details.role && <p>{profile.role}</p>}
                {details.name && <h2>{profile.name}</h2>}
                {details.location && <span>{profile.location}</span>}
                {(details.appearances || details.likes || details.latest) && (
                  <div className={styles.meta}>
                    {details.appearances && <span>{appearances} stories</span>}
                    {details.likes && <span>{compactNumber.format(totalLikes)} likes</span>}
                    {details.latest && <span>Latest {newestYear}</span>}
                  </div>
                )}
              </div>
            </button>
          </article>
        );
      })}

      {activeEntry && typeof document !== "undefined" && createPortal(
        <div className={styles.drawerLayer} role="presentation" onPointerDown={() => closeDrawer()}>
          <aside
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="star-drawer-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className={`video-card__like ${styles.drawerLove} ${lovedStarSlugs.has(activeEntry.profile.slug) ? "is-liked" : ""}`}
              type="button"
              aria-pressed={lovedStarSlugs.has(activeEntry.profile.slug)}
              aria-label={lovedStarSlugs.has(activeEntry.profile.slug)
                ? `Remove ${activeEntry.profile.name} from loved stars`
                : `Love ${activeEntry.profile.name}`}
              data-focus-label={lovedStarSlugs.has(activeEntry.profile.slug)
                ? "Remove love"
                : "Love star"}
              title={lovedStarSlugs.has(activeEntry.profile.slug)
                ? "Remove from loved stars"
                : "Love this star"}
              onClick={() => {
                const changed = onToggleStarLove(activeEntry.profile.slug);
                if (!changed) closeDrawer(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path d="M12 20.3 4.2 12.8A4.8 4.8 0 0 1 11 6l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
              </svg>
            </button>
            <button
              ref={drawerCloseRef}
              className={styles.drawerClose}
              type="button"
              aria-label="Close star details"
              onClick={() => closeDrawer()}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div className={styles.drawerOverview}>
              <StarPortrait star={activeEntry.profile} className={styles.drawerPortrait} decorative={false} />
              <div className={styles.drawerIdentity}>
                <p className={styles.drawerEyebrow}>Featured star</p>
                <h2 id="star-drawer-title">{activeEntry.profile.name}</h2>
                <p className={styles.drawerRole}>{activeEntry.profile.role}</p>
                <p className={styles.drawerLocation}>{activeEntry.profile.location}</p>
                <p className={styles.drawerBio}>{activeEntry.profile.bio}</p>
                <div className={styles.drawerStats}>
                  <span><strong>{activeEntry.appearances}</strong> stories</span>
                  <span><strong>{compactNumber.format(activeEntry.totalLikes)}</strong> likes</span>
                  <span><strong>{activeEntry.newestYear}</strong> latest</span>
                </div>
                <div className={styles.drawerSpecialties}>
                  {activeEntry.profile.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}
                </div>
              </div>
            </div>
            <section className={styles.drawerCredits} aria-label="Featured credits">
              <h3>Featured credits</h3>
              {activeEntry.profile.featuredCredits.map((credit) => (
                <div key={`${credit.title}-${credit.year}`}>
                  <strong>{credit.title}</strong>
                  <span>{credit.role} · {credit.year}</span>
                </div>
              ))}
            </section>

            <section className={styles.drawerVideos} aria-label={`Videos featuring ${activeEntry.profile.name}`}>
              <div className={styles.drawerSectionHeading}>
                <h3>Videos featuring {activeEntry.profile.firstName}</h3>
                <span>{activeEntry.appearances}</span>
              </div>
              <div
                className={styles.drawerVideoGrid}
                role="list"
                data-video-text-size={videoTextSize}
                style={{ "--drawer-video-columns": drawerColumns } as CSSProperties}
              >
                {displayedVideos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    liked={likedVideoIds.has(video.id)}
                    onToggleLike={handleDrawerVideoLike}
                    lovedStarSlugs={lovedStarSlugs}
                    onToggleStarLove={handleDrawerStarLove}
                    metadata={videoMetadata}
                    priority={index < drawerColumns}
                  />
                ))}
              </div>
              {!showAllVideos && relatedVideos.length > displayedVideos.length && (
                <button
                  className={styles.showAllVideos}
                  type="button"
                  onClick={() => setShowAllVideos(true)}
                >
                  Show all {relatedVideos.length} videos
                </button>
              )}
            </section>
          </aside>
        </div>,
        document.body,
      )}
    </div>
  );
}
