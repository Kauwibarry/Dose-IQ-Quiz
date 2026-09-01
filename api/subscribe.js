export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const TOKENS = {
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
  const lang = TOKENS[langRaw] ? langRaw : "en";
  const campaign_token = TOKENS[lang];

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const params = new URLSearchParams({
    email,
    campaign_token,
    start_day: "0",
  });

  const gr = await fetch("https://app.getresponse.com/add_subscriber.html", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body: params.toString(),
    redirect: "manual",
  });

  const loc = String(gr.headers.get("location") || "");
  if (loc.includes("not-active")) {
    return res.status(502).json({ ok: false });
  }

  if (gr.ok || gr.status === 301 || gr.status === 302 || gr.status === 303) {
    return res.status(200).json({ ok: true });
  }

  return res.status(502).json({ ok: false });
}
