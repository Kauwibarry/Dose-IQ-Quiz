// Shared helpers for durable daily consent-banner counters.
// Storage: Upstash Redis (Vercel Marketplace, Free plan) via REST.
// Keys are prefixed by VERCEL_ENV so preview data cannot land in production counts.
// Dates are calendar days in Europe/Sofia. No IP, UA, or identifiers are stored.

const EVENTS = ["shown", "accepted", "rejected"];

export function sofiaDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function vercelEnv() {
  const e = String(process.env.VERCEL_ENV || "development");
  if (e === "production" || e === "preview" || e === "development") return e;
  return "development";
}

export function isSynthetic(payload) {
  const src = String(payload && payload.utm_source ? payload.utm_source : "")
    .trim()
    .toLowerCase();
  const content = String(payload && payload.utm_content ? payload.utm_content : "");
  if (src === "prod-verify") return true;
  if (content.toLowerCase().includes("synthetic-exclude")) return true;
  return false;
}

function redisCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return { url: url.replace(/\/$/, ""), token };
}

export function dayKey(env, date) {
  return `consent:${env}:${date}`;
}

export function daysSetKey(env) {
  return `consent:${env}:days`;
}

async function redisPipeline(commands) {
  const { url, token } = redisCreds();
  if (!url || !token) return { ok: false, reason: "unconfigured" };
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, reason: "http", status: res.status, text: String(text).slice(0, 200) };
  }
  const data = await res.json();
  return { ok: true, data };
}

export async function incrConsent(event, lang) {
  const env = vercelEnv();
  const date = sofiaDate();
  const key = dayKey(env, date);
  const commands = [
    ["HINCRBY", key, event, "1"],
    ["SADD", daysSetKey(env), date],
  ];
  if (lang) commands.splice(1, 0, ["HINCRBY", key, `${event}:${lang}`, "1"]);
  const result = await redisPipeline(commands);
  if (!result.ok) {
    console.error("consent_counter_error", result.reason, result.status || "");
  }
  return result.ok;
}

function hashToCounts(hash) {
  const out = { shown: 0, accepted: 0, rejected: 0, byLang: {} };
  if (!hash || typeof hash !== "object") return out;
  const entries = Array.isArray(hash)
    ? // some Redis REST forms return [field, value, ...]
      (function pairs(arr) {
        const o = {};
        for (let i = 0; i + 1 < arr.length; i += 2) o[String(arr[i])] = arr[i + 1];
        return o;
      })(hash)
    : hash;
  for (const [field, raw] of Object.entries(entries)) {
    const n = Number(raw) || 0;
    if (EVENTS.includes(field)) {
      out[field] = n;
      continue;
    }
    const parts = field.split(":");
    if (parts.length === 2 && EVENTS.includes(parts[0])) {
      const ev = parts[0];
      const lang = parts[1];
      if (!out.byLang[lang]) out.byLang[lang] = { shown: 0, accepted: 0, rejected: 0 };
      out.byLang[lang][ev] = n;
    }
  }
  return out;
}

function unwrap(result) {
  if (result && typeof result === "object" && "result" in result) return result.result;
  return result;
}

export async function readConsentStats(env, dates) {
  const wanted = Array.isArray(dates) && dates.length ? dates.slice() : null;
  let list = wanted;
  if (!list) {
    const daysRes = await redisPipeline([["SMEMBERS", daysSetKey(env)]]);
    if (!daysRes.ok) return { ok: false, reason: daysRes.reason, status: daysRes.status };
    const raw = unwrap(Array.isArray(daysRes.data) ? daysRes.data[0] : daysRes.data);
    list = Array.isArray(raw) ? raw.map(String) : [];
  }
  list = list.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!list.length) {
    return { ok: true, timezone: "Europe/Sofia", env, days: [] };
  }
  const gets = list.map((d) => ["HGETALL", dayKey(env, d)]);
  const got = await redisPipeline(gets);
  if (!got.ok) return { ok: false, reason: got.reason, status: got.status };
  const rows = Array.isArray(got.data) ? got.data : [];
  const days = list.map((date, i) => {
    const counts = hashToCounts(unwrap(rows[i]));
    return { date, ...counts };
  });
  return { ok: true, timezone: "Europe/Sofia", env, days };
}
