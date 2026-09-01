// GetResponse form campaign tokens (add_subscriber.html campaign_token).
// TODO: replace per-language tokens when gr-lang-campaigns.json (campaignId) is available.
// EN token is 7ifMP. JSON was missing at deploy time, so every language currently defaults to 7ifMP.
const CAMPAIGN_TOKENS = {
  en: "7ifMP",
  de: "7ifMP",
  fr: "7ifMP",
  it: "7ifMP",
  es: "7ifMP",
  pt: "7ifMP",
  nl: "7ifMP",
  pl: "7ifMP",
  cs: "7ifMP",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const body = req.body || {};
  const email = String(body.email || "").trim();
  const consent = String(body.privacy_consent || "").trim();
  let lang = String(body.lang || "en").trim().toLowerCase();
  if (!CAMPAIGN_TOKENS[lang]) lang = "en";

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const params = new URLSearchParams({
    email,
    campaign_token: CAMPAIGN_TOKENS[lang],
    start_day: "0",
    lang,
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
