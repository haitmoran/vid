import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarPortrait, StarPortraitSprite } from "@/components/StarPortrait";
import { getStarBySlug, starProfiles } from "@/data/stars";
import { getVideosForStar } from "@/data/starVideoIndex";
import { basePath } from "@/lib/basePath";
import styles from "./page.module.css";

type StarPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return starProfiles.map((star) => ({ slug: star.slug }));
}

export async function generateMetadata({ params }: StarPageProps): Promise<Metadata> {
  const { slug } = await params;
  const star = getStarBySlug(slug);

  if (!star) return { title: "Star not found — Kinet" };

  return {
    title: `${star.name} — Kinet Stars`,
    description: `${star.role}. ${star.shortBio}`,
  };
}

export default async function StarPage({ params }: StarPageProps) {
  const { slug } = await params;
  const star = getStarBySlug(slug);
  if (!star) notFound();

  const relatedVideos = getVideosForStar(star.slug).slice(0, 6);

  return (
    <main className={styles.page}>
      <StarPortraitSprite slugs={[star.slug]} />
      <header className={styles.header}>
        <Link className={styles.brand} href="/?tab=stars#catalog" aria-label="Kinet stars">
          <span className={styles.brandMark} aria-hidden="true"><span /></span>
          <span>kinet</span>
        </Link>
        <Link className={styles.back} href="/?tab=stars#catalog">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M19 12H6M11 7l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Stars
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="star-name">
        <div className={styles.portraitWrap}>
          <StarPortrait star={star} className={styles.portrait} decorative={false} />
          <span className={styles.prototype}>Prototype profile</span>
        </div>

        <div className={styles.intro}>
          <p className={styles.eyebrow}>Kinet star</p>
          <h1 id="star-name">{star.name}</h1>
          <p className={styles.role}>{star.role}</p>
          <blockquote>“{star.tagline}”</blockquote>
          <p className={styles.bio}>{star.bio}</p>
          <div className={styles.location}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            {star.location}
          </div>
          <ul className={styles.specialties} aria-label="Specialties">
            {star.specialties.map((specialty) => <li key={specialty}>{specialty}</li>)}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="credits-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Selected work</p>
            <h2 id="credits-title">Featured credits</h2>
          </div>
          <span>{star.featuredCredits.length} highlights</span>
        </div>
        <ol className={styles.credits}>
          {star.featuredCredits.map((credit, index) => (
            <li key={credit.title}>
              <span className={styles.creditNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{credit.title}</strong>
                <span>{credit.role}</span>
              </div>
              <time>{credit.year}</time>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="videos-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>On Kinet</p>
            <h2 id="videos-title">Videos featuring {star.firstName}</h2>
          </div>
          <span>{relatedVideos.length} selections</span>
        </div>
        <div className={styles.videoGrid}>
          {relatedVideos.map((video) => (
            <a
              key={video.id}
              className={styles.video}
              href={video.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              <div className={styles.videoMedia}>
                <img
                  src={`${basePath}/${video.thumbnail}`}
                  alt=""
                  width="640"
                  height="360"
                  loading="lazy"
                  decoding="async"
                />
                <span>{video.duration}</span>
              </div>
              <strong>{video.title}</strong>
              <small>{video.platform} · {video.publishedYear}</small>
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Demo profile — replace this fictional biography and artwork with verified talent data before launch.</p>
        <Link href="/?tab=stars#catalog">Browse all stars</Link>
      </footer>
    </main>
  );
}
