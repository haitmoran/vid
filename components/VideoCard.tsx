"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { VideoItem } from "@/data/videos";
import { trackAnalyticsEvent } from "@/lib/analyticsClient";
import type { VideoMetadataPreferences } from "@/lib/displayPreferences";
import { VideoStars } from "@/components/VideoStars";

type Intent = "hover" | "focus" | "press";
type VisibilityCallback = (visible: boolean) => void;
export type VideoCardAction = "star-0" | "star-1" | "open" | "like";

const callbacks = new WeakMap<Element, VisibilityCallback>();
let observer: IntersectionObserver | null = null;
let observerTargets = 0;
/** How long hover or focus must rest on a card before its preview mounts. */
const PREVIEW_SETTLE_MS = 320;

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function observeElement(
  element: Element,
  callback: VisibilityCallback,
): () => void {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.01 },
    );
  }

  callbacks.set(element, callback);
  observer.observe(element);
  observerTargets += 1;

  let active = true;

  return () => {
    if (!active) return;
    active = false;
    observer?.unobserve(element);
    callbacks.delete(element);
    observerTargets = Math.max(0, observerTargets - 1);

    if (observerTargets === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

function previewIsAllowed(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;

  return !connection?.saveData;
}

type VideoCardProps = {
  video: VideoItem;
  index: number;
  liked: boolean;
  onToggleLike: (videoId: string) => void;
  lovedStarSlugs: ReadonlySet<string>;
  onToggleStarLove: (starSlug: string) => boolean;
  metadata: VideoMetadataPreferences;
  priority?: boolean;
  /**
   * Roving tabindex inputs. These are primitives rather than per-card arrays
   * or closures so that memoisation holds: moving focus re-renders only the
   * card losing focus and the card gaining it, not the whole grid.
   */
  tvMode?: boolean;
  focusedAction?: VideoCardAction | null;
  onCardKeyDown?: KeyboardEventHandler<HTMLElement>;
};

function tabIndexFor(
  tvMode: boolean,
  focusedAction: VideoCardAction | null,
  action: VideoCardAction,
): number {
  if (!tvMode) return 0;
  return focusedAction === action ? 0 : -1;
}

function VideoCardComponent({
  video,
  index,
  liked,
  onToggleLike,
  lovedStarSlugs,
  onToggleStarLove,
  metadata,
  priority = false,
  tvMode = false,
  focusedAction = null,
  onCardKeyDown,
}: VideoCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intents = useRef(new Set<Intent>());
  const longPressTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const lastTouchAt = useRef(0);
  const suppressClick = useRef(false);

  const [hasEnteredViewport, setHasEnteredViewport] = useState(priority);
  const [isInViewport, setIsInViewport] = useState(priority);
  const [hasIntent, setHasIntent] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  }, []);

  const addIntent = useCallback(
    (intent: Intent): boolean => {
      if (!video.preview || previewFailed || !previewIsAllowed()) return false;

      intents.current.add(intent);

      // A long press is deliberate, so honour it at once. Hover and focus are
      // not: sweeping a pointer across the grid, or walking a TV remote along
      // a row, would otherwise start and tear down a video decode on every
      // card it passes. TV decoders handle only a couple of streams at a time.
      if (intent === "press") {
        clearSettleTimer();
        setHasIntent(true);
        return true;
      }

      if (settleTimer.current === null) {
        settleTimer.current = window.setTimeout(() => {
          settleTimer.current = null;
          if (intents.current.size > 0) setHasIntent(true);
        }, PREVIEW_SETTLE_MS);
      }
      return true;
    },
    [clearSettleTimer, previewFailed, video.preview],
  );

  const removeIntent = useCallback((intent: Intent) => {
    intents.current.delete(intent);
    const active = intents.current.size > 0;
    if (!active) {
      clearSettleTimer();
      setPreviewReady(false);
    }
    setHasIntent(active && settleTimer.current === null);
  }, [clearSettleTimer]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    return observeElement(element, (visible) => {
      setIsInViewport(visible);

      if (visible) {
        setHasEnteredViewport(true);
      } else {
        intents.current.clear();
        clearSettleTimer();
        setHasIntent(false);
        setPreviewReady(false);
      }
    });
  }, []);

  useEffect(() => () => {
    clearLongPress();
    clearSettleTimer();
  }, [clearLongPress, clearSettleTimer]);

  const handlePointerLeave = (
    event: ReactPointerEvent<HTMLAnchorElement>,
  ) => {
    clearLongPress();
    if (event.pointerType === "touch") removeIntent("press");
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLAnchorElement>,
  ) => {
    if (event.pointerType !== "touch") return;

    lastTouchAt.current = Date.now();
    suppressClick.current = false;
    clearLongPress();

    longPressTimer.current = window.setTimeout(() => {
      suppressClick.current = addIntent("press");
    }, 440);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLAnchorElement>,
  ) => {
    if (event.pointerType !== "touch") return;
    clearLongPress();
    removeIntent("press");
  };

  const handleToggleLike = useCallback(
    () => onToggleLike(video.id),
    [onToggleLike, video.id],
  );

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (suppressClick.current) {
      event.preventDefault();
      suppressClick.current = false;
      return;
    }

    trackAnalyticsEvent({
      type: "video_open",
      itemId: video.id,
      itemLabel: video.title,
    });
  };

  const mountPreview = hasIntent && isInViewport && !previewFailed;
  const platformMark = video.platform === "Internet Archive" ? "IA" : "M";
  const metadataItems = [
    metadata.source ? video.platform : "",
    metadata.likes ? `${compactNumber.format(video.likeCount)} likes` : "",
    metadata.year ? String(video.publishedYear) : "",
  ].filter(Boolean);
  const showBody = metadata.creator || metadataItems.length > 0;

  useEffect(() => {
    const preview = videoRef.current;
    if (!mountPreview || !preview) return;

    preview.muted = true;
    preview.currentTime = 0;
    void preview.play().catch(() => setPreviewReady(false));

    return () => {
      preview.pause();
      preview.currentTime = 0;
    };
  }, [mountPreview, video.preview]);

  return (
    <article
      className="video-card"
      role="listitem"
      data-preview={previewReady ? "ready" : "idle"}
      data-stars-visible={metadata.stars ? "true" : "false"}
      style={{ "--card-accent": video.accent } as CSSProperties}
      onFocusCapture={() => addIntent("focus")}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) removeIntent("focus");
      }}
    >
      <a
        ref={cardRef}
        className="video-card__link"
        href={video.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        tabIndex={tabIndexFor(tvMode, focusedAction, "open")}
        data-video-index={index}
        data-card-action="open"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"
        aria-label={`${video.title}. ${video.creator} on ${video.platform}. ${compactNumber.format(video.likeCount)} likes. Duration ${video.duration}.`}
        onKeyDown={onCardKeyDown}
        onMouseEnter={() => {
          if (Date.now() - lastTouchAt.current > 750) addIntent("hover");
        }}
        onMouseLeave={() => removeIntent("hover")}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearLongPress();
          removeIntent("press");
          suppressClick.current = false;
        }}
        onContextMenu={(event) => {
          if (suppressClick.current) event.preventDefault();
        }}
        onClick={handleClick}
      >
        <div className="video-card__media">
          {hasEnteredViewport ? (
            <img
              className={`video-card__image ${previewReady ? "is-hidden" : ""}`}
              src={video.thumbnail}
              width={640}
              height={360}
              alt=""
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "low"}
              decoding="async"
              draggable={false}
            />
          ) : (
            <span className="video-card__placeholder" aria-hidden="true" />
          )}

          {mountPreview && (
            <video
              key={video.preview}
              ref={videoRef}
              className={`video-card__preview ${previewReady ? "is-ready" : ""}`}
              src={video.preview}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
              onLoadedData={(event) => {
                void event.currentTarget.play().catch(() => {
                  setPreviewReady(false);
                });
              }}
              onPlaying={() => setPreviewReady(true)}
              onError={() => {
                intents.current.clear();
                setHasIntent(false);
                setPreviewReady(false);
                setPreviewFailed(true);
              }}
            />
          )}

          <span className="video-card__shade" aria-hidden="true" />
          {metadata.title && (
            <div className="video-card__top-title">
              <h2 className="video-card__title">{video.title}</h2>
            </div>
          )}
          <span className="video-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M8 5.4v13.2L18.5 12 8 5.4Z" />
            </svg>
          </span>
          {metadata.duration && <span className="video-card__duration" aria-hidden="true">{video.duration}</span>}
        </div>

        {showBody && (
          <div
            className={[
              "video-card__body",
              metadata.source ? "" : "without-platform",
              metadata.creator ? "" : "without-creator",
              metadata.duration ? "" : "without-duration",
            ].filter(Boolean).join(" ")}
          >
            {metadata.source && <div className="platform-mark"><span>{platformMark}</span></div>}
            <div className="video-card__copy">
              {metadata.creator && <p className="video-card__creator">{video.creator}</p>}
              {metadataItems.length > 0 && (
                <p className="video-card__meta">
                  {metadataItems.map((item) => <span key={item}>{item}</span>)}
                </p>
              )}
            </div>
            <span className="video-card__more" aria-hidden="true">•••</span>
          </div>
        )}
      </a>

      {metadata.stars && (
        <VideoStars
          videoId={video.id}
          videoTitle={video.title}
          lovedStarSlugs={lovedStarSlugs}
          onToggleStarLove={onToggleStarLove}
          videoIndex={index}
          tabIndexes={[
            tabIndexFor(tvMode, focusedAction, "star-0"),
            tabIndexFor(tvMode, focusedAction, "star-1"),
          ]}
          onStarKeyDown={onCardKeyDown}
        />
      )}

      <button
        className={`video-card__like ${liked ? "is-liked" : ""}`}
        type="button"
        aria-pressed={liked}
        aria-label={liked ? `Unlike ${video.title}` : `Like ${video.title}`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"
        data-focus-label={liked ? "Remove love" : "Love video"}
        title={liked ? "Remove from loved videos" : "Love this video"}
        tabIndex={tabIndexFor(tvMode, focusedAction, "like")}
        data-video-index={index}
        data-card-action="like"
        onKeyDown={onCardKeyDown}
        onClick={handleToggleLike}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 20.3 4.2 12.8A4.8 4.8 0 0 1 11 6l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
        </svg>
      </button>
    </article>
  );
}

/**
 * The catalogue mounts up to 180 cards. Without this, every keystroke, focus
 * move, and incremental load re-rendered all of them.
 */
export const VideoCard = memo(VideoCardComponent);
