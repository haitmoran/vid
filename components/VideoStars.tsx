"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { getStarsForVideo, type StarProfile } from "@/data/stars";
import { StarPortrait } from "@/components/StarPortrait";
import styles from "./VideoStars.module.css";

type VideoStarsProps = {
  videoId: string;
  videoTitle: string;
  lovedStarSlugs: ReadonlySet<string>;
  onToggleStarLove: (starSlug: string) => boolean;
  videoIndex?: number;
  className?: string;
  tabIndex?: number;
  tabIndexes?: readonly [number, number];
  onStarKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
};

type PopoverPlacement = "upper-right" | "upper-left" | "below" | "above";

/** At or above this width the tray sits beside the card instead of over one. */
const SIDE_TRAY_MIN_WIDTH = 700;

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: PopoverPlacement;
  /** Set when the tray is snapped over a neighbouring card, so it fills that
   *  card exactly rather than leaving slivers of it showing. */
  minHeight?: number;
};

/**
 * Finds the card directly above or below `card` in the same grid column.
 * DOM order is not enough: at two-column widths the next sibling sits beside
 * the card rather than under it, so candidates are matched on geometry.
 */
function neighbouringCard(
  card: HTMLElement | null,
  direction: "below" | "above",
): DOMRect | null {
  const parent = card?.parentElement;
  if (!card || !parent) return null;

  const base = card.getBoundingClientRect();
  let best: DOMRect | null = null;

  for (const sibling of Array.from(parent.children)) {
    if (sibling === card || !sibling.classList.contains("video-card")) continue;
    const rect = sibling.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    if (Math.abs(rect.left - base.left) > base.width * 0.5) continue;

    if (direction === "below") {
      if (rect.top < base.bottom - 1) continue;
      if (!best || rect.top < best.top) best = rect;
    } else {
      if (rect.bottom > base.top + 1) continue;
      if (!best || rect.bottom > best.bottom) best = rect;
    }
  }

  return best;
}

function positionPreviewTray(
  trigger: HTMLButtonElement,
  measuredHeight = 190,
): PopoverPosition {
  const card = trigger.closest<HTMLElement>(".video-card");
  const cardBounds = card?.getBoundingClientRect() ?? trigger.getBoundingClientRect();
  const gutter = 12;
  const gap = 12;
  const tvMode = document.documentElement.dataset.tv === "true";
  const topbarBottom = document.querySelector<HTMLElement>(".topbar")
    ?.getBoundingClientRect().bottom ?? 0;
  const safeTop = Math.max(gutter, topbarBottom + 10);
  const idealWidth = tvMode
    ? Math.min(520, Math.max(400, cardBounds.width * 0.9))
    : Math.min(380, Math.max(300, cardBounds.width * 0.9));
  const minimumSideWidth = tvMode ? 340 : 280;
  const cardOverlap = tvMode ? 62 : 48;
  const maximumHeight = Math.max(1, window.innerHeight - safeTop - gutter);
  const dialogHeight = Math.min(measuredHeight, maximumHeight);

  if (window.innerWidth >= SIDE_TRAY_MIN_WIDTH) {
    const top = Math.max(
      safeTop,
      Math.min(
        cardBounds.top - dialogHeight * 0.58,
        window.innerHeight - dialogHeight - gutter,
      ),
    );
    const rightLeft = cardBounds.right - cardOverlap;
    const availableRight = window.innerWidth - gutter - rightLeft;

    if (availableRight >= minimumSideWidth) {
      return {
        top,
        left: rightLeft,
        width: Math.min(idealWidth, availableRight),
        maxHeight: maximumHeight,
        placement: "upper-right",
      };
    }

    const availableLeft = cardBounds.left + cardOverlap - gutter;
    if (availableLeft >= minimumSideWidth) {
      const width = Math.min(idealWidth, availableLeft);
      return {
        top,
        left: cardBounds.left - width + cardOverlap,
        width,
        maxHeight: maximumHeight,
        placement: "upper-left",
      };
    }
  }

  const width = Math.min(idealWidth, window.innerWidth - gutter * 2);
  const left = Math.max(
    gutter,
    Math.min(
      cardBounds.left + cardBounds.width / 2 - width / 2,
      window.innerWidth - width - gutter,
    ),
  );
  const availableBelow = Math.max(1, window.innerHeight - cardBounds.bottom - gap - gutter);
  const availableAbove = Math.max(1, cardBounds.top - gap - safeTop);
  const placement: PopoverPlacement = availableBelow >= availableAbove ? "below" : "above";

  // Stacked layouts: cover the adjacent card exactly, edge to edge.
  const neighbour = card ? neighbouringCard(card, placement) : null;
  if (neighbour) {
    const top = Math.max(safeTop, neighbour.top);
    const bottom = Math.min(window.innerHeight - gutter, neighbour.bottom);
    const height = Math.max(1, bottom - top);
    return {
      top,
      left: neighbour.left,
      width: neighbour.width,
      maxHeight: height,
      minHeight: height,
      placement,
    };
  }

  if (placement === "below") {
    return {
      top: cardBounds.bottom + gap,
      left,
      width,
      maxHeight: availableBelow,
      placement: "below",
    };
  }

  const height = Math.min(dialogHeight, availableAbove);
  return {
    top: Math.max(safeTop, cardBounds.top - gap - height),
    left,
    width,
    maxHeight: availableAbove,
    placement: "above",
  };
}

export function VideoStars({
  videoId,
  videoTitle,
  lovedStarSlugs,
  onToggleStarLove,
  videoIndex,
  className,
  tabIndex = 0,
  tabIndexes,
  onStarKeyDown,
}: VideoStarsProps) {
  const stars = getStarsForVideo(videoId);
  const dialogId = useId();
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const profileLinkRef = useRef<HTMLAnchorElement>(null);
  const loveButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(0);
  const [activeStar, setActiveStar] = useState<StarProfile | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    top: 12,
    left: 12,
    width: 380,
    maxHeight: 520,
    placement: "upper-right",
  });

  const repositionFrameRef = useRef<number | null>(null);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRefs.current[activeIndexRef.current];
    if (trigger) {
      setPopoverPosition(
        positionPreviewTray(trigger, dialogRef.current?.offsetHeight ?? 190),
      );
    }
  }, []);

  // Scroll and resize fire far faster than frames; measuring and re-rendering
  // on every event made scrolling with a star preview open janky.
  const scheduleReposition = useCallback(() => {
    if (repositionFrameRef.current !== null) return;
    repositionFrameRef.current = window.requestAnimationFrame(() => {
      repositionFrameRef.current = null;
      updatePopoverPosition();
    });
  }, [updatePopoverPosition]);

  const closeProfile = useCallback((restoreFocus = true) => {
    setActiveStar(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRefs.current[activeIndexRef.current]?.focus());
    }
  }, []);

  useEffect(() => {
    if (!activeStar) return;

    updatePopoverPosition();
    window.requestAnimationFrame(() => loveButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProfile();
        return;
      }

      if (["OK", "Select", "Accept"].includes(event.key)) {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
        return;
      }

      if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) {
        const focusable = [
          loveButtonRef.current,
          closeButtonRef.current,
          profileLinkRef.current,
        ].filter(
          (element): element is HTMLAnchorElement | HTMLButtonElement => Boolean(element),
        );
        const currentIndex = focusable.indexOf(document.activeElement as HTMLAnchorElement | HTMLButtonElement);
        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (Math.max(0, currentIndex) + direction + focusable.length) % focusable.length;
        event.preventDefault();
        focusable[nextIndex]?.focus();
        return;
      }

      if (event.key === "Tab") {
        const focusable = [
          loveButtonRef.current,
          closeButtonRef.current,
          profileLinkRef.current,
        ].filter(
          (element): element is HTMLAnchorElement | HTMLButtonElement => Boolean(element),
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (dialogRef.current?.contains(target)) return;
      if (triggerRefs.current.some((trigger) => trigger?.contains(target))) return;
      closeProfile(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsidePointer);
    window.addEventListener("resize", scheduleReposition, { passive: true });
    window.addEventListener("scroll", scheduleReposition, { capture: true, passive: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsidePointer);
      window.removeEventListener("resize", scheduleReposition);
      window.removeEventListener("scroll", scheduleReposition, true);
      if (repositionFrameRef.current !== null) {
        window.cancelAnimationFrame(repositionFrameRef.current);
        repositionFrameRef.current = null;
      }
    };
  }, [activeStar, closeProfile, scheduleReposition, updatePopoverPosition]);

  const openProfile = (star: StarProfile, starIndex: number, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeStar?.slug === star.slug) {
      closeProfile(false);
      return;
    }
    activeIndexRef.current = starIndex;
    setPopoverPosition(positionPreviewTray(event.currentTarget));
    setActiveStar(star);
  };

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <>
      <div className={rootClassName} role="group" aria-label={`Featured stars in ${videoTitle}`}>
        {stars.map((star, starIndex) => (
          <button
            key={star.slug}
            ref={(element) => { triggerRefs.current[starIndex] = element; }}
            className={styles.indicator}
            type="button"
            tabIndex={tabIndexes?.[starIndex] ?? tabIndex}
            aria-label={`Meet ${star.name}, ${star.role}`}
            aria-haspopup="dialog"
            aria-expanded={activeStar?.slug === star.slug}
            aria-controls={activeStar?.slug === star.slug ? dialogId : undefined}
            aria-keyshortcuts="Enter Space"
            data-card-action={`star-${starIndex}`}
            data-video-index={videoIndex}
            data-star-index={starIndex}
            onKeyDown={onStarKeyDown}
            onClick={(event) => openProfile(star, starIndex, event)}
          >
            <StarPortrait star={star} className={styles.indicatorPortrait} />
            <span className={styles.indicatorName}>{star.firstName}</span>
          </button>
        ))}
      </div>

      {activeStar && typeof document !== "undefined" && createPortal(
        <div className={styles.popoverLayer}>
          <section
            ref={dialogRef}
            id={dialogId}
            className={styles.dialog}
            data-placement={popoverPosition.placement}
            role="dialog"
            data-snap={popoverPosition.minHeight ? "card" : undefined}
            aria-labelledby={`${dialogId}-title`}
            aria-describedby={`${dialogId}-description`}
            style={{
              "--popover-top": `${popoverPosition.top}px`,
              "--popover-left": `${popoverPosition.left}px`,
              "--popover-width": `${popoverPosition.width}px`,
              "--popover-max-height": `${popoverPosition.maxHeight}px`,
              "--popover-min-height": popoverPosition.minHeight
                ? `${popoverPosition.minHeight}px`
                : undefined,
            } as CSSProperties}
          >
            <div className={styles.toolbar}>
              <span className={styles.prototype}>Featured star</span>
              <div className={styles.actions}>
                <button
                  ref={loveButtonRef}
                  className={`video-card__like ${styles.popupLove} ${lovedStarSlugs.has(activeStar.slug) ? "is-liked" : ""}`}
                  type="button"
                  aria-pressed={lovedStarSlugs.has(activeStar.slug)}
                  aria-label={lovedStarSlugs.has(activeStar.slug)
                    ? `Remove ${activeStar.name} from loved stars`
                    : `Love ${activeStar.name}`}
                  title={lovedStarSlugs.has(activeStar.slug) ? "Remove from loved stars" : "Love this star"}
                  data-focus-label={lovedStarSlugs.has(activeStar.slug) ? "Remove love" : "Love star"}
                  onClick={() => {
                    const changed = onToggleStarLove(activeStar.slug);
                    if (!changed) closeProfile(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                    <path d="M12 20.3 4.2 12.8A4.8 4.8 0 0 1 11 6l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
                  </svg>
                </button>

                <button
                  ref={closeButtonRef}
                  className={styles.close}
                  type="button"
                  aria-label="Close star preview"
                  onClick={() => closeProfile()}
                  onKeyDown={(event) => {
                    if (["OK", "Select", "Accept"].includes(event.key)) {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <a
              ref={profileLinkRef}
              className={styles.profileLink}
              href={`?tab=stars&star=${activeStar.slug}#catalog`}
              onClick={() => closeProfile(false)}
              onKeyDown={(event) => {
                if (["OK", "Select", "Accept"].includes(event.key)) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
            >
              <StarPortrait star={activeStar} className={styles.dialogPortrait} decorative={false} />
              <div className={styles.dialogCopy}>
                <h2 id={`${dialogId}-title`}>{activeStar.name}</h2>
                <p className={styles.role}>{activeStar.role}</p>
                <p id={`${dialogId}-description`} className={styles.bio}>{activeStar.shortBio}</p>
                <span className={styles.cta}>
                  Open in Stars
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </a>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
