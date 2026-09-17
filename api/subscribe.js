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

  const payload = {
    email,
    campaign: { campaignId },
    dayOfCycle: "0",
  };
  if (customFieldValues.length) payload.customFieldValues = customFieldValues;

  const gr = await fetch("https://api.getresponse.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": "api-key " + apiKey,
    },
    body: JSON.stringify(payload),
  });

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

  if (gr.status === 202 || gr.status === 200 || gr.status === 201) {
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  if (gr.status === 409) {
    try { await updateExisting(); } catch (_) {}
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  let errText = "";
  try {
    errText = await gr.text();
  } catch (_) {}

  if (gr.status === 400 && /already exists|already added|duplicate/i.test(errText)) {
    try { await updateExisting(); } catch (_) {}
    await fireCapi();
    return res.status(200).json({ ok: true });
  }

  return res.status(502).json({ ok: false });
}
