// First-party, cookieless, anonymous consent-banner events.
// Logs a single structured line for Vercel runtime logs. Does not store IP,
// cookies, or any durable identifier in our payload. Platform access logs
// may still retain request metadata outside this handler — see report caveat.
// Durable daily totals (Europe/Sofia, keyed by VERCEL_ENV) go to Upstash Redis.

import { incrConsent, isSynthetic } from "./consent-store.js";

const ALLOWED = new Set(["shown", "accepted", "rejected"]);
const LANG_OK = new Set(["en", "de", "fr", "it", "es", "pt", "nl", "pl", "cs", ""]);

function clip(v, max) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://www.dose-iq.fit");
  // Previews and www apex variants; keep tight
  const origin = String(req.headers.origin || "");
  if (
    origin.endsWith(".vercel.app") ||
    origin === "https://dose-iq.fit" ||
    origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:3000"
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false });
  }

  const body = readBody(req);
  const event = clip(body.event, 32).toLowerCase();
  if (!ALLOWED.has(event)) {
    return res.status(400).json({ ok: false });
  }

  const lang = clip(body.lang, 8).toLowerCase();
  if (!LANG_OK.has(lang)) {
    return res.status(400).json({ ok: false });
  }

  const path = clip(body.path, 160);
  // Only allow relative paths on this site
  if (path && (!path.startsWith("/") || path.includes("://") || path.includes("\\"))) {
    return res.status(400).json({ ok: false });
  }

  const payload = {
    event,
    lang: lang || "",
    path: path || "/",
    utm_source: clip(body.utm_source, 80),
    utm_content: clip(body.utm_content, 120),
    ts: clip(body.ts, 40) || new Date().toISOString(),
  };

  // Structured log line — searchable in Vercel runtime logs as consent_event
  console.log("consent_event", JSON.stringify(payload));

  if (!isSynthetic(payload)) {
    try {
      await incrConsent(event, payload.lang);
    } catch (err) {
      console.error("consent_counter_error", err && err.message ? err.message : "incr_failed");
    }
  }

  return res.status(204).end();
}
