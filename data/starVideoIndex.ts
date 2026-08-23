import { getStarSlugsForVideo, starProfiles } from "@/data/stars";
import { videos, type VideoItem } from "@/data/videos";

export type StarVideoSummary = {
  videos: readonly VideoItem[];
  appearances: number;
  totalLikes: number;
  newestYear: number;
};

/**
 * Star-to-video relationships never change at runtime, so they are resolved
 * once here. Rebuilding them per render meant scanning all 180 videos for
 * every star on every keystroke, filter change, and drawer open.
 */
const summaries = new Map<string, StarVideoSummary>();

for (const profile of starProfiles) {
  summaries.set(profile.slug, {
    videos: [],
    appearances: 0,
    totalLikes: 0,
    newestYear: 0,
  });
}

for (const video of videos) {
  for (const slug of getStarSlugsForVideo(video.id)) {
    const summary = summaries.get(slug);
    if (!summary) continue;
    (summary.videos as VideoItem[]).push(video);
    summary.appearances += 1;
    summary.totalLikes += video.likeCount;
    summary.newestYear = Math.max(summary.newestYear, video.publishedYear);
  }
}

const EMPTY: StarVideoSummary = {
  videos: [],
  appearances: 0,
  totalLikes: 0,
  newestYear: 0,
};

export function getStarVideoSummary(slug: string): StarVideoSummary {
  return summaries.get(slug) ?? EMPTY;
}

export function getVideosForStar(slug: string): readonly VideoItem[] {
  return getStarVideoSummary(slug).videos;
}
