export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const key = process.env.GETRESPONSE_API_KEY;
  if (!key) return res.status(500).json({ ok: false });

  let email = "";
  let consent = "";
  const body = req.body || {};
  if (typeof body === "object") {
    email = String(body.email || "").trim();
    consent = String(body.privacy_consent || "").trim();
  }

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const payload = {
    email,
    campaign: { campaignId: "7ifMP" },
    dayOfCycle: "0",
    customFieldValues: [],
  };

  const gr = await fetch("https://api.getresponse.com/v3/contacts", {
    method: "POST",
    headers: {
      "X-Auth-Token": "api-key " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (gr.ok || gr.status === 409 || gr.status === 202) {
    return res.status(200).json({ ok: true });
  }

  const text = await gr.text();
  console.error("getresponse", gr.status, text.slice(0, 500));
  return res.status(502).json({ ok: false });
}
