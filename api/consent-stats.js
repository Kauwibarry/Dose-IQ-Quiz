// Read daily consent-banner totals. Protected by CONSENT_STATS_SECRET.
// Does not accept the secret in the query string (avoids log leakage).

import { timingSafeEqual } from "node:crypto";
import { readConsentStats, sofiaDate, vercelEnv } from "./consent-store.js";

function providedSecret(req) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(req.headers["x-consent-stats-secret"] || "").trim();
}

function secretOk(req) {
  const expected = String(process.env.CONSENT_STATS_SECRET || "");
  const got = providedSecret(req);
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function parseEnv(raw, fallback) {
  const e = String(raw || "").trim();
  if (e === "production" || e === "preview" || e === "development") return e;
  return fallback;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }
  if (!process.env.CONSENT_STATS_SECRET) {
    return res.status(503).json({ ok: false, error: "unconfigured" });
  }
  if (!secretOk(req)) {
    return res.status(401).json({ ok: false });
  }

  const env = parseEnv(req.query && req.query.env, vercelEnv());
  const dateQ = req.query && req.query.date ? String(req.query.date).trim() : "";
  const dates = /^\d{4}-\d{2}-\d{2}$/.test(dateQ) ? [dateQ] : undefined;

  try {
    const result = await readConsentStats(env, dates);
    if (!result.ok) {
      console.error("consent_stats_error", result.reason, result.status || "");
      return res.status(502).json({ ok: false });
    }
    return res.status(200).json({
      ok: true,
      timezone: result.timezone,
      env: result.env,
      generatedAt: new Date().toISOString(),
      today: sofiaDate(),
      days: result.days,
    });
  } catch (err) {
    console.error("consent_stats_error", err && err.message ? err.message : "read_failed");
    return res.status(502).json({ ok: false });
  }
}
