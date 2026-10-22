// Optional first-name save after quiz signup.
// Finds the contact (just created by /api/subscribe) in the language's GetResponse list
// and sets the standard contact `name` field. GetResponse's [[firstname]] merge word
// renders everything up to the first space of `name`.
// The API key stays server-side (GETRESPONSE_API_KEY), same as /api/subscribe.

const CAMPAIGNS = {
  en: "7ifMP",
  de: "7iDoH",
  fr: "7iDrX",
  it: "7iDqa",
  es: "7iDMJ",
  pt: "7iDjZ",
  nl: "7iDZR",
  pl: "7iDL9",
  cs: "7iDPK",
};

// Only contacts created recently can be named via this public endpoint, so it can't be
// used to rename older subscribers just by knowing their email address.
const MAX_CONTACT_AGE_MS = 2 * 60 * 60 * 1000;
// Retries cover the short delay before a new contact becomes visible in the API (~5s total).
const RETRY_DELAYS_MS = [0, 1000, 1500, 2500];

const NAME_RE = /^[\p{L}\p{M}](?:[\p{L}\p{M}' \u2019-]*[\p{L}\p{M}])?$/u;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Light in-memory rate limit (per warm instance): 8 requests / 10 min per IP.
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 8;
const rl = new Map();

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return String(req.headers["x-real-ip"] || "unknown").trim();
}

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rl.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rl.set(ip, hits);
  if (rl.size > 5000) rl.clear();
  return hits.length > RL_MAX;
}

export function cleanName(v) {
  return String(v == null ? "" : v).normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validName(n) {
  return typeof n === "string" && n.length >= 1 && n.length <= 40 && NAME_RE.test(n);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = String(body.email || "").trim();
  const name = cleanName(body.name);
  const langRaw = String(body.lang || "").trim().toLowerCase();
  const campaignId = CAMPAIGNS[langRaw] || CAMPAIGNS.en;

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "invalid_email" });
  }
  if (!validName(name)) {
    return res.status(400).json({ ok: false, error: "invalid_name" });
  }
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  const apiKey = process.env.GETRESPONSE_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false });
  const auth = { "X-Auth-Token": "api-key " + apiKey, Accept: "application/json" };

  let contact = null;
  for (const wait of RETRY_DELAYS_MS) {
    if (wait) await sleep(wait);
    try {
      const q = await fetch(
        "https://api.getresponse.com/v3/contacts?query[email]=" +
          encodeURIComponent(email) +
          "&query[campaignId]=" +
          encodeURIComponent(campaignId) +
          "&fields=contactId,email,createdOn&perPage=1",
        { headers: auth }
      );
      if (q.ok) {
        const list = await q.json();
        const c = Array.isArray(list) ? list[0] : null;
        if (c && c.contactId && String(c.email || "").toLowerCase() === email.toLowerCase()) {
          contact = c;
          break;
        }
      }
    } catch (_) {}
  }

  if (!contact) {
    // Soft failure: the UI shows a gentle note and the shop CTA is unaffected.
    return res.status(200).json({ ok: false, soft: true, error: "not_found" });
  }

  const created = Date.parse(contact.createdOn || "");
  if (!created || Date.now() - created > MAX_CONTACT_AGE_MS) {
    return res.status(200).json({ ok: false, soft: true, error: "not_recent" });
  }

  try {
    const u = await fetch("https://api.getresponse.com/v3/contacts/" + encodeURIComponent(contact.contactId), {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (u.ok) return res.status(200).json({ ok: true });
    console.log("gr_name_update_status", u.status);
  } catch (e) {
    console.log("gr_name_update_error", e && e.name ? e.name : "fetch_failed");
  }
  return res.status(200).json({ ok: false, soft: true, error: "update_failed" });
}
