"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANALYTICS_API_URL,
  clearAnalyticsOwnerSession,
  OWNER_SESSION_KEY,
} from "@/lib/analyticsClient";
import { getSession, MANAGER_USERNAME, signOut as signOutAccount } from "@/lib/localAuth";

type RankedItem = {
  label: string;
  value: number;
};

type TrendPoint = {
  day: string;
  views: number;
  visitors: number;
};

type AnalyticsSummary = {
  rangeDays: number;
  generatedAt: string;
  totals: {
    views: number;
    visitors: number;
    sessions: number;
    videoOpens: number;
  };
  trend: TrendPoint[];
  topPages: RankedItem[];
  topVideos: RankedItem[];
  referrers: RankedItem[];
  countries: RankedItem[];
  devices: RankedItem[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDay(day: string): string {
  // Buckets are UTC days on the Worker; formatting them in the viewer's local
  // zone labelled every bar with the previous day west of UTC.
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

function StatCard({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <article className="analytics-stat">
      <p>{label}</p>
      <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
      <span>{note}</span>
    </article>
  );
}

function RankedList({ title, items, emptyText }: { title: string; items: RankedItem[]; emptyText: string }) {
  const maximum = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="analytics-panel">
      <div className="analytics-panel__heading">
        <h2>{title}</h2>
        <span>Top 5</span>
      </div>
      {items.length ? (
        <ol className="analytics-ranked-list">
          {items.slice(0, 5).map((item, position) => (
            // Two rows can share a label (for example the same video title
            // logged under different ids), so position keeps the keys unique.
            <li key={`${position}-${item.label}`}>
              <div>
                <span className="analytics-ranked-list__label" title={item.label}>{item.label}</span>
                <strong>{formatNumber(item.value)}</strong>
              </div>
              <span className="analytics-ranked-list__track" aria-hidden="true">
                <span style={{ width: `${Math.max(4, (item.value / maximum) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-panel__empty">{emptyText}</p>
      )}
    </section>
  );
}

export function AnalyticsDashboard() {
  const [ready, setReady] = useState(false);
  const [managerSession, setManagerSession] = useState(false);
  const [token, setToken] = useState("");
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const account = getSession();
    const isManager = account?.normalizedUsername === MANAGER_USERNAME;
    setManagerSession(isManager);
    setToken(isManager ? window.sessionStorage.getItem(OWNER_SESSION_KEY) ?? "" : "");
    setReady(true);
  }, []);

  const clearManagerSession = useCallback(() => {
    clearAnalyticsOwnerSession();
    signOutAccount();
    setManagerSession(false);
    setToken("");
    setSummary(null);
  }, []);

  const loadSummary = useCallback(async () => {
    if (!ANALYTICS_API_URL || !token) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${ANALYTICS_API_URL}/v1/admin/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
      });

      if (response.status === 401) {
        clearManagerSession();
        throw new Error("Your manager session expired. Sign in again from Kinet.");
      }
      if (!response.ok) throw new Error("Unable to load analytics right now.");
      setSummary((await response.json()) as AnalyticsSummary);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [clearManagerSession, days, token]);

  useEffect(() => {
    if (ready && token) void loadSummary();
  }, [loadSummary, ready, token]);

  const peakViews = useMemo(
    () => Math.max(1, ...(summary?.trend.map((point) => point.views) ?? [1])),
    [summary],
  );
  const viewsPerSession = summary?.totals.sessions
    ? (summary.totals.views / summary.totals.sessions).toFixed(1)
    : "0.0";

  if (!ready) return <main className="analytics-page" aria-busy="true" />;

  return (
    <main className="analytics-page">
      <header className="analytics-header">
        <a className="brand" href="../" aria-label="Back to Kinet">
          <span className="brand__mark" aria-hidden="true"><span /></span>
          <span className="brand__word">kinet</span>
        </a>
        <span className="analytics-private-badge">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Owner only
        </span>
      </header>

      {!ANALYTICS_API_URL ? (
        <section className="analytics-login analytics-login--setup">
          <p className="analytics-eyebrow">Setup required</p>
          <h1>Analytics is ready to connect</h1>
          <p>The private dashboard UI is installed, but its Cloudflare Worker has not been connected yet.</p>
          <a href="../">Return to the video feed</a>
        </section>
      ) : !managerSession ? (
        <section className="analytics-login">
          <span className="analytics-login__lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <p className="analytics-eyebrow">Private analytics</p>
          <h1>Manager access only</h1>
          <p>Sign in as <strong>@moran</strong> on Kinet. Your manager session will open analytics automatically.</p>
          <a href="../?managerLogin=1">Sign in on Kinet</a>
        </section>
      ) : !token ? (
        <section className="analytics-login">
          <span className="analytics-login__lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <p className="analytics-eyebrow">One-time migration</p>
          <h1>Reconnect your manager session</h1>
          <p>This session was created before unified manager sign-in. Sign in once more on Kinet; analytics will then open directly.</p>
          <a href="../?managerLogin=1">Reconnect as moran</a>
        </section>
      ) : (
        <div className="analytics-dashboard">
          <div className="analytics-dashboard__title">
            <div>
              <p className="analytics-eyebrow">Private analytics</p>
              <h1>Audience overview</h1>
              <p>Cookie-free traffic signals from the Kinet website.</p>
            </div>
            <div className="analytics-dashboard__actions">
              <label>
                <span className="sr-only">Date range</span>
                <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </label>
              <button type="button" onClick={() => void loadSummary()} disabled={loading}>Refresh</button>
              <button
                type="button"
                className="analytics-sign-out"
                onClick={() => {
                  clearManagerSession();
                  window.location.assign("../");
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          {error && <p className="analytics-error analytics-error--dashboard" role="alert">{error}</p>}

          {summary ? (
            <>
              <section className="analytics-stats" aria-label="Summary">
                <StatCard label="Page views" value={summary.totals.views} note={`Last ${summary.rangeDays} days`} />
                <StatCard label="Unique visitors" value={summary.totals.visitors} note="Anonymous browser IDs" />
                <StatCard label="Sessions" value={summary.totals.sessions} note={`${viewsPerSession} views per session`} />
                <StatCard label="Video opens" value={summary.totals.videoOpens} note="Outbound plays" />
              </section>

              <section className="analytics-panel analytics-trend">
                <div className="analytics-panel__heading">
                  <div>
                    <h2>Daily visits</h2>
                    <p>Views and unique visitors</p>
                  </div>
                  <div className="analytics-legend"><span /> Views <span /> Visitors</div>
                </div>
                <div className="analytics-chart" role="img" aria-label={`Daily page views over the last ${summary.rangeDays} days`}>
                  {summary.trend.map((point, index) => (
                    <div className="analytics-chart__day" key={point.day} title={`${formatDay(point.day)}: ${point.views} views, ${point.visitors} visitors`}>
                      <div className="analytics-chart__bars">
                        <span style={{ height: `${Math.max(point.views ? 5 : 0, (point.views / peakViews) * 100)}%` }} />
                        <span style={{ height: `${Math.max(point.visitors ? 5 : 0, (point.visitors / peakViews) * 100)}%` }} />
                      </div>
                      {(summary.rangeDays <= 7 || index % Math.ceil(summary.rangeDays / 7) === 0) && <small>{formatDay(point.day)}</small>}
                    </div>
                  ))}
                </div>
              </section>

              <div className="analytics-panel-grid">
                <RankedList title="Top pages" items={summary.topPages} emptyText="No page views yet." />
                <RankedList title="Most opened videos" items={summary.topVideos} emptyText="No video opens yet." />
                <RankedList title="Referrers" items={summary.referrers} emptyText="No referrer data yet." />
                <RankedList title="Countries" items={summary.countries} emptyText="No country data yet." />
                <RankedList title="Devices" items={summary.devices} emptyText="No device data yet." />
              </div>

              <p className="analytics-updated">
                Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(summary.generatedAt))}
              </p>
            </>
          ) : (
            <div className="analytics-loading" aria-live="polite">
              <span aria-hidden="true" />
              Loading private analytics…
            </div>
          )}
        </div>
      )}
    </main>
  );
}
