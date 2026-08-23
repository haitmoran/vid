let cachedWidth = 0;
let subscribed = false;

/**
 * Cached `window.innerWidth`.
 *
 * The grid reads the viewport width on every D-pad keypress to work out the
 * column count. Reading it directly forces a synchronous layout of the whole
 * catalogue — up to 180 cards — while the layout is still dirty from the
 * previous `scrollIntoView`. Caching it turns that into a plain lookup.
 */
export function viewportWidth(): number {
  if (typeof window === "undefined") return 0;

  if (!subscribed) {
    subscribed = true;
    cachedWidth = window.innerWidth;
    const sync = () => {
      cachedWidth = window.innerWidth;
    };
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("orientationchange", sync, { passive: true });
  }

  return cachedWidth;
}
