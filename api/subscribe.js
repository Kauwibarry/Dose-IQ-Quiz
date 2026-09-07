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

  if (gr.status === 202 || gr.status === 200 || gr.status === 201) {
    return res.status(200).json({ ok: true });
  }

  if (gr.status === 409) {
    try { await updateExisting(); } catch (_) {}
    return res.status(200).json({ ok: true });
  }

  let errText = "";
  try {
    errText = await gr.text();
  } catch (_) {}

  if (gr.status === 400 && /already exists|already added|duplicate/i.test(errText)) {
    try { await updateExisting(); } catch (_) {}
    return res.status(200).json({ ok: true });
  }

  return res.status(502).json({ ok: false });
}
