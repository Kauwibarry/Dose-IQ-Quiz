export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  // GetResponse campaign (list) IDs — same as dashboard list IDs
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

  const body = req.body || {};
  const email = String(body.email || "").trim();
  const consent = String(body.privacy_consent || "").trim();
  const langRaw = String(body.lang || "").trim().toLowerCase();
  const lang = CAMPAIGNS[langRaw] ? langRaw : "en";
  const campaignId = CAMPAIGNS[lang];

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const apiKey = process.env.GETRESPONSE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false });
  }

  const gr = await fetch("https://api.getresponse.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": `api-key ${apiKey}`,
    },
    body: JSON.stringify({
      email,
      campaign: { campaignId },
      dayOfCycle: "0",
    }),
  });

  // 202 = queued; 409 = already on that list (treat as success so resubmits work)
  if (gr.status === 202 || gr.status === 200 || gr.status === 201 || gr.status === 409) {
    return res.status(200).json({ ok: true });
  }

  // Some accounts return 400 with "Contact already exists" style errors
  let errText = "";
  try {
    errText = await gr.text();
  } catch (_) {}
  if (
    gr.status === 400 &&
    /already exists|already added|duplicate/i.test(errText)
  ) {
    return res.status(200).json({ ok: true });
  }

  return res.status(502).json({ ok: false });
}
