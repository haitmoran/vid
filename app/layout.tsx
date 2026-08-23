import type { Metadata } from "next";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { basePath } from "@/lib/basePath";
import "./globals.css";

const themeBootScript = `
  try {
    const theme = localStorage.getItem('kinet-theme');
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.tv = localStorage.getItem('kinet-tv') === 'true' ? 'true' : 'false';
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.tv = 'false';
  }
  try {
    const display = JSON.parse(localStorage.getItem('kinet-display-preferences-v1') || '{}');
    const legacyTextSize = ['small', 'default', 'large'].includes(display.textSize) ? display.textSize : 'default';
    const videoTextSize = ['small', 'default', 'large'].includes(display.videoTextSize) ? display.videoTextSize : legacyTextSize;
    const starTextSize = ['small', 'default', 'large'].includes(display.starTextSize) ? display.starTextSize : legacyTextSize;
    const starsView = new URLSearchParams(location.search).get('tab') === 'stars' || location.pathname.includes('/stars/');
    const columns = [3, 4, 5, 6].includes(display.columns) ? display.columns : 5;
    const starColumns = [3, 4, 5, 6].includes(display.starColumns) ? display.starColumns : 5;
    document.documentElement.dataset.textSize = starsView ? starTextSize : videoTextSize;
    document.documentElement.style.setProperty('--preferred-video-columns', String(columns));
    document.documentElement.style.setProperty('--preferred-star-columns', String(starColumns));
  } catch (_) {
    document.documentElement.dataset.textSize = 'default';
    document.documentElement.style.setProperty('--preferred-video-columns', '5');
    document.documentElement.style.setProperty('--preferred-star-columns', '5');
  }
`;

export const metadata: Metadata = {
  title: "Kinet — A calmer way to discover video",
  description:
    "A fast, focused video discovery experience bringing exceptional stories from across the web into one place.",
  icons: { icon: `${basePath}/favicon.svg` },
  openGraph: {
    title: "Kinet — Video discovery across the web",
    description: "Exceptional video from across the web, curated into one calm place.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" data-tv="false" data-text-size="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
