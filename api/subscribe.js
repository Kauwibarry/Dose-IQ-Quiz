import { createHash } from "crypto";

const META_PIXEL_ID = process.env.META_PIXEL_ID || "1341206988086014";

function sha256Email(email) {
  return createHash("sha256")
    .update(String(email).trim().toLowerCase())
    .digest("hex");
}

function cookieValue(cookieHeader, name) {
  if (!cookieHeader) return undefined;
  const parts = String(cookieHeader).split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim() || undefined;
  }
  return undefined;
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff[0]) return String(xff[0]).split(",")[0].trim();
  const realIp = req.headers["x-real-ip"];
  if (realIp) return String(realIp).trim();
  return undefined;
}

function adsConsentGranted(body, req) {
  const fromBody = String(body.ads_consent || "").trim().toLowerCase();
  if (fromBody === "granted") return true;
  if (fromBody === "denied") return false;
  return cookieValue(req.headers.cookie || "", "doseiq_ads_consent") === "granted";
}


const GR_FT = {
  ref: "ntL0Xa",
  url: "ntL0OH",
  http_referer: "ntL0FX",
};
const GR_TAGS = {
  src_meta: "8Rl70",
  src_google: "8Rl95",
};

function asStr(v) {
  return String(v == null ? "" : v).trim();
}

function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function truncateUrl(v, maxLen) {
  const s = asStr(v);
  if (!s) return "";
  if (s.length <= maxLen) return s;
  // Prefer cutting query string first while keeping a valid URL
  try {
    const u = new URL(s);
    let out = u.origin + u.pathname;
    if (out.length > maxLen) return out.slice(0, maxLen);
    const q = u.search || "";
    if (q) {
      const room = maxLen - out.length;
      if (room > 1) out += q.slice(0, room);
    }
    return out;
  } catch {
    return s.slice(0, maxLen);
  }
}

function buildUtmRef(body) {
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const parts = [];
  for (const k of keys) {
    const v = asStr(body[k]);
    if (v) parts.push(k + "=" + v);
  }
  return parts.join("&").slice(0, 500);
}

function pickSourceTags(body) {
  const src = asStr(body.utm_source).toLowerCase();
  const gclid = asStr(body.gclid);
  const fbclid = asStr(body.fbclid);
  const tags = [];
  const metaHit =
    !!fbclid ||
    src === "facebook" ||
    src === "fb" ||
    src === "instagram" ||
    src === "ig" ||
    src === "meta";
  const googleHit = !!gclid || src === "google" || src === "googleads" || src === "adwords";
  if (metaHit) tags.push({ tagId: GR_TAGS.src_meta });
  if (googleHit) tags.push({ tagId: GR_TAGS.src_google });
  return tags;
}

function buildFirstTouchFields(body) {
  const out = [];
  const ref = buildUtmRef(body);
  if (ref) out.push({ customFieldId: GR_FT.ref, value: [ref] });

  const landing = truncateUrl(
    asStr(body.first_touch_url) || asStr(body.event_source_url),
    2000
  );
  if (landing && isHttpUrl(landing)) {
    out.push({ customFieldId: GR_FT.url, value: [landing] });
  }

  const referrer = truncateUrl(asStr(body.first_touch_referrer), 2000);
  if (referrer && isHttpUrl(referrer)) {
    out.push({ customFieldId: GR_FT.http_referer, value: [referrer] });
  }
  return out;
}

function withoutFieldIds(customFieldValues, ids) {
  const ban = new Set(ids);
  return (customFieldValues || []).filter((f) => !ban.has(f.customFieldId));
}

async function sendMetaCapiLeadEvents(req, { email, eventId, eventSourceUrl }) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) {
    console.log("meta_capi_skip no_token");
    return;
  }
  const em = sha256Email(email);
  if (!em) return;

  const ua = String(req.headers["user-agent"] || "").trim() || undefined;
  const ip = clientIp(req);
  const cookies = req.headers.cookie || "";
  const fbp = cookieValue(cookies, "_fbp");
  const fbc = cookieValue(cookies, "_fbc");
  const sourceUrl =
    (eventSourceUrl && String(eventSourceUrl).trim()) ||
    String(req.headers.referer || req.headers.referrer || "").trim() ||
    undefined;

  const userData = { em: [em] };
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const now = Math.floor(Date.now() / 1000);
  const eid = eventId && String(eventId).trim() ? String(eventId).trim() : undefined;

  function makeEvent(eventName) {
    const ev = {
      event_name: eventName,
      event_time: now,
      action_source: "website",
      user_data: { ...userData },
    };
    if (eid) ev.event_id = eid;
    if (sourceUrl) ev.event_source_url = sourceUrl;
    return ev;
  }

  const body = {
    data: [makeEvent("Lead"), makeEvent("CompleteRegistration")],
  };

  const url =
    "https://graph.facebook.com/v21.0/" +
    encodeURIComponent(META_PIXEL_ID) +
    "/events?access_token=" +
    encodeURIComponent(token);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("meta_capi_status", r.status);
  } catch (e) {
    console.log("meta_capi_error", e && e.name ? e.name : "fetch_failed");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

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

  const FIELD = {
    fit_score: "nmTrMm",
    fit_band: "nmTrjq",
    fit_title: "nmTrZH",
    fit_age_note: "nmTrLX",
    insight_1_title: "nmTrPa",
    insight_1_text: "nmTruJ",
    insight_2_title: "nmTrkZ",
    insight_2_text: "nmTrFR",
    insight_3_title: "nmTrX9",
    insight_3_text: "nmTr7K",
  };

  const body = req.body || {};
  const email = String(body.email || "").trim();
  const consent = String(body.privacy_consent || "").trim();
  const langRaw = String(body.lang || "").trim().toLowerCase();
  const lang = CAMPAIGNS[langRaw] ? langRaw : "en";
  const campaignId = CAMPAIGNS[lang];
  const fit = body.fit && typeof body.fit === "object" ? body.fit : null;
  const eventId = String(body.event_id || "").trim();
  const eventSourceUrl = String(body.event_source_url || "").trim();
  const shouldCapi = adsConsentGranted(body, req);

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const apiKey = process.env.GETRESPONSE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false });
  }

  const customFieldValues = [];
  const add = (id, val) => {
    const v = String(val == null ? "" : val).trim();
    if (!v) return;
    customFieldValues.push({ customFieldId: id, value: [v.slice(0, 500)] });
  };

  if (fit) {
    if (fit.score != null && fit.score !== "") {
      const n = Math.round(Number(fit.score));
      if (!Number.isNaN(n)) add(FIELD.fit_score, n);
    }
    add(FIELD.fit_band, fit.bandLabel || fit.band || "");
    add(FIELD.fit_title, fit.title || "");
    add(FIELD.fit_age_note, fit.ageNote || "");
    const insights = Array.isArray(fit.insights) ? fit.insights : [];
    for (let i = 0; i < 3; i++) {
      const ins = insights[i] || {};
      add(FIELD["insight_" + (i + 1) + "_title"], ins.title || "");
      add(FIELD["insight_" + (i + 1) + "_text"], ins.text || "");
    }
  }

  const ftFields = buildFirstTouchFields(body);
  for (const f of ftFields) customFieldValues.push(f);
  const sourceTags = pickSourceTags(body);

  async function updateExisting() {
    if (!customFieldValues.length) return;
    const q = await fetch(
      "https://api.getresponse.com/v3/contacts?query[email]=" +
        encodeURIComponent(email) +
        "&query[campaignId]=" +
        campaignId +
        "&perPage=1",
      { headers: { "X-Auth-Token": "api-key " + apiKey, Accept: "application/json" } }
    );
    const list = await q.json();
    const id = Array.isArray(list) && list[0] && list[0].contactId;
    if (!id) return;
    await fetch("https://api.getresponse.com/v3/contacts/" + id, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "api-key " + apiKey,
      },
      body: JSON.stringify({ customFieldValues }),
    });
  }

  async function fireCapi() {
    if (!shouldCapi) return;
    try {
      await sendMetaCapiLeadEvents(req, {
        email,
        eventId,
        eventSourceUrl,
      });
    } catch (_) {
      // never fail subscribe on CAPI errors
    }
  }

  function makePayload(fields, tags) {
    const payload = {
      email,
      campaign: { campaignId },
      dayOfCycle: "0",
    };
    if (fields && fields.length) payload.customFieldValues = fields;
    if (tags && tags.length) payload.tags = tags;
    return payload;
  }

  async function postContact(fields, tags) {
    return fetch("https://api.getresponse.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "api-key " + apiKey,
      },
      body: JSON.stringify(makePayload(fields, tags)),
    });
  }

  // Try FT fields + tags. Starter plans often block tag assignment — drop tags
  // first while keeping all FT fields. Then peel URL-type fields if needed.
  let fields = customFieldValues.slice();
  let tags = sourceTags.slice();
  let gr = await postContact(fields, tags);
  let errText = "";

  async function readErr(resp) {
    try { return await resp.text(); } catch (_) { return ""; }
  }

  if (gr.status === 400) {
    errText = await readErr(gr);
    if (!/already exists|already added|duplicate/i.test(errText)) {
      if (tags.length) {
        tags = [];
        gr = await postContact(fields, tags);
        if (gr.status === 400) {
          errText = await readErr(gr);
        } else {
          errText = "";
        }
      }
      if (gr.status === 400 && errText && !/already exists|already added|duplicate/i.test(errText)) {
        fields = withoutFieldIds(fields, [GR_FT.url, GR_FT.http_referer]);
        gr = await postContact(fields, tags);
        if (gr.status === 400) {
          errText = await readErr(gr);
        } else {
          errText = "";
        }
      }
      if (gr.status === 400 && errText && !/already exists|already added|duplicate/i.test(errText)) {
        fields = withoutFieldIds(fields, [GR_FT.ref, GR_FT.url, GR_FT.http_referer]);
        gr = await postContact(fields, []);
        if (gr.status === 400) {
          errText = await readErr(gr);
        } else {
          errText = "";
        }
      }
    }
  }

  if (gr.status === 202 || gr.status === 200 || gr.status === 201) {
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  if (gr.status === 409) {
    try { await updateExisting(); } catch (_) {}
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  if (!errText) {
    try { errText = await gr.text(); } catch (_) {}
  }

  if (gr.status === 400 && /already exists|already added|duplicate/i.test(errText)) {
    try { await updateExisting(); } catch (_) {}
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  return res.status(502).json({ ok: false });
}
