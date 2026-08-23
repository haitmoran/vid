import type { StarProfile } from "@/data/stars";
import { starProfiles } from "@/data/stars";

type StarPortraitProps = {
  star: StarProfile;
  className?: string;
  decorative?: boolean;
};

function Hair({ star }: { star: StarProfile }) {
  const { hair, style } = star.portrait;

  if (style === "bob") {
    return (
      <>
        <path d="M30 63V43c0-22 13-34 30-34s31 12 31 34v27l-14 1-4-38c-9 8-20 11-35 11l-2 27Z" fill={hair} />
        <path d="M31 65c3 13 9 20 14 24l-17-2Z" fill={hair} />
        <path d="M89 65c-3 13-9 20-14 24l17-2Z" fill={hair} />
      </>
    );
  }

  if (style === "waves") {
    return (
      <>
        <path d="M30 58C20 37 31 12 51 12c14-9 35 1 39 17 8 9 3 26-3 34l-7-22c-17 4-32-2-42-10l-4 31Z" fill={hair} />
        <circle cx="30" cy="48" r="9" fill={hair} />
        <circle cx="87" cy="43" r="10" fill={hair} />
      </>
    );
  }

  if (style === "curls") {
    return (
      <>
        {[
          [34, 31, 13], [45, 19, 14], [60, 17, 15], [76, 21, 14],
          [86, 34, 13], [31, 45, 12], [88, 48, 11], [42, 35, 14],
          [59, 31, 16], [76, 35, 14],
        ].map(([cx, cy, r], index) => (
          <circle key={index} cx={cx} cy={cy} r={r} fill={hair} />
        ))}
      </>
    );
  }

  if (style === "fade") {
    return (
      <>
        <path d="M33 44c1-20 12-31 27-31s27 11 27 31c-8-9-17-13-27-13s-19 4-27 13Z" fill={hair} />
        <path d="M30 30c18 6 39 5 59-3" fill="none" stroke={star.portrait.halo} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      </>
    );
  }

  return <path d="M32 43c0-22 11-33 29-33 17 0 28 11 28 32-14-7-34-8-57 1Z" fill={hair} />;
}

function portraitSymbolId(slug: string): string {
  return `kinet-portrait-${slug}`;
}

function PortraitArtwork({ star }: { star: StarProfile }) {
  const colors = star.portrait;

  return (
    <>
      <rect width="120" height="120" rx="28" fill={colors.background} />
      <circle cx="60" cy="51" r="43" fill={colors.halo} opacity=".48" />
      <path d="M16 120c4-27 18-40 44-40s41 13 44 40Z" fill={colors.clothing} />
      <path d="M49 72h22v19c-7 7-15 7-22 0Z" fill={colors.skin} />
      <ellipse cx="34" cy="55" rx="6" ry="9" fill={colors.skin} />
      <ellipse cx="86" cy="55" rx="6" ry="9" fill={colors.skin} />
      <path d="M34 42c0-19 10-29 26-29s26 10 26 29v17c0 20-11 31-26 31S34 79 34 59Z" fill={colors.skin} />
      <Hair star={star} />
      <path d="M44 49c4-2 8-2 12 0M65 49c4-2 8-2 11 0" fill="none" stroke={colors.hair} strokeWidth="2.4" strokeLinecap="round" opacity=".72" />
      <ellipse cx="50" cy="56" rx="2.2" ry="2.6" fill="#17171c" />
      <ellipse cx="70" cy="56" rx="2.2" ry="2.6" fill="#17171c" />
      <path d="M60 57c-1 5-2 8 2 9" fill="none" stroke="#733f32" strokeWidth="1.8" strokeLinecap="round" opacity=".5" />
      <path d="M52 73c5 4 11 4 16 0" fill="none" stroke="#7c3540" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="43" cy="63" r="5" fill="#ef7d78" opacity=".16" />
      <circle cx="77" cy="63" r="5" fill="#ef7d78" opacity=".16" />
    </>
  );
}

/**
 * Defines every portrait once as a <symbol>. Each portrait is roughly thirty
 * SVG nodes and the catalogue draws two per card, so inlining them cost about
 * 5,000 extra elements across a full 180-card scroll. Rendering the artwork
 * once and referencing it keeps each instance down to a single <use>.
 *
 * Render this once per page, above anything that draws a portrait.
 */
export function StarPortraitSprite({ slugs }: { slugs?: readonly string[] } = {}) {
  // A page that shows a single profile should not ship the other seven.
  const included = slugs
    ? starProfiles.filter((star) => slugs.includes(star.slug))
    : starProfiles;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {included.map((star) => (
          <symbol key={star.slug} id={portraitSymbolId(star.slug)} viewBox="0 0 120 120">
            <PortraitArtwork star={star} />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

export function StarPortrait({ star, className, decorative = true }: StarPortraitProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Illustrated portrait of ${star.name}`}
      focusable="false"
    >
      <use href={`#${portraitSymbolId(star.slug)}`} />
    </svg>
  );
}
