import assert from "node:assert/strict";
import worker from "../analytics-worker/src/index.js";

class Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM login_attempts")) {
      return this.database.loginAttempts.get(this.values[0]) ?? null;
    }
    return null;
  }

  async run() {
    if (this.sql.includes("INSERT INTO events")) this.database.events.push(this.values);
    if (this.sql.includes("INSERT INTO login_attempts")) {
      this.database.loginAttempts.set(this.values[0], {
        attempt_count: this.values[1],
        window_started: this.values[2],
        blocked_until: this.values[3],
      });
    }
    if (this.sql.includes("DELETE FROM login_attempts") && this.values[0]) {
      this.database.loginAttempts.delete(this.values[0]);
    }
    return { success: true };
  }
}

class MockDatabase {
  constructor() {
    this.events = [];
    this.loginAttempts = new Map();
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  async batch(statements) {
    if (statements.length === 2) return [{ success: true }, { success: true }];
    return [
      { results: [{ views: 12, visitors: 5, sessions: 7, video_opens: 4 }] },
      { results: [{ day: "2026-08-20", views: 12, visitors: 5 }] },
      { results: [{ label: "/k/", value: 12 }] },
      { results: [{ label: "Sintel", value: 4 }] },
      { results: [{ label: "Direct", value: 9 }] },
      { results: [{ label: "IL", value: 7 }] },
      { results: [{ label: "Desktop", value: 8 }] },
    ];
  }
}

const database = new MockDatabase();
const env = {
  DB: database,
  ADMIN_USERNAME: "owner",
  ADMIN_PASSWORD: "a-strong-owner-password",
  ANALYTICS_SALT: "analytics-test-salt-with-enough-entropy",
  SESSION_SECRET: "session-test-secret-with-enough-entropy",
  ALLOWED_ORIGINS: "https://haitmoran.github.io,http://localhost:3000",
};

function request(path, init = {}) {
  return new Request(`https://analytics.example${path}`, {
    ...init,
    headers: {
      Origin: "https://haitmoran.github.io",
      "CF-Connecting-IP": "203.0.113.7",
      ...(init.headers ?? {}),
    },
  });
}

const forbidden = await worker.fetch(new Request("https://analytics.example/v1/collect", {
  method: "POST",
  headers: { Origin: "https://attacker.example" },
  body: "{}",
}), env);
assert.equal(forbidden.status, 403);

const collection = await worker.fetch(request("/v1/collect", {
  method: "POST",
  body: JSON.stringify({
    eventType: "page_view",
    visitorId: "12345678-1234-1234-1234-123456789abc",
    sessionId: "98765432-1234-1234-1234-123456789abc",
    path: "/k/",
    referrer: "example.com",
    device: "Desktop",
  }),
}), env);
assert.equal(collection.status, 204);
assert.equal(database.events.length, 1);
assert.notEqual(database.events[0][3], "12345678-1234-1234-1234-123456789abc");

const failedLogin = await worker.fetch(request("/v1/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "owner", password: "wrong-password" }),
}), env);
assert.equal(failedLogin.status, 401);

const successfulLogin = await worker.fetch(request("/v1/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "owner", password: env.ADMIN_PASSWORD }),
}), env);
assert.equal(successfulLogin.status, 200);
const { token } = await successfulLogin.json();
assert.equal(typeof token, "string");

const unauthorizedSummary = await worker.fetch(request("/v1/admin/summary?days=30"), env);
assert.equal(unauthorizedSummary.status, 401);

const summaryResponse = await worker.fetch(request("/v1/admin/summary?days=30", {
  headers: { Authorization: `Bearer ${token}` },
}), env);
assert.equal(summaryResponse.status, 200);
const summary = await summaryResponse.json();
assert.deepEqual(summary.totals, { views: 12, visitors: 5, sessions: 7, videoOpens: 4 });
assert.equal(summary.topVideos[0].label, "Sintel");
assert.equal(summary.trend.length, 30);

for (let attempt = 0; attempt < 5; attempt += 1) {
  const response = await worker.fetch(request("/v1/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "owner", password: "still-wrong" }),
  }), env);
  assert.equal(response.status, 401);
}
const rateLimited = await worker.fetch(request("/v1/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "owner", password: env.ADMIN_PASSWORD }),
}), env);
assert.equal(rateLimited.status, 429);

console.log("Analytics Worker smoke test passed.");
