export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const body = req.body || {};
  const email = String(body.email || "").trim();
  const consent = String(body.privacy_consent || "").trim();

  if (!email || !email.includes("@") || consent !== "yes") {
    return res.status(400).json({ ok: false });
  }

  const params = new URLSearchParams({
    email,
    campaign_token: "7ifMP",
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
