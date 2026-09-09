window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
window.gtag = gtag;
gtag("js", new Date());

var DOSEIQ_CONSENT_KEY = "doseiq_ads_consent";
var DOSEIQ_META_PIXEL_ID = "715106197169192";
var doseIqConsent = null;
try { doseIqConsent = localStorage.getItem(DOSEIQ_CONSENT_KEY); } catch (e) {}
var doseIqGranted = doseIqConsent === "granted";

gtag("consent", "default", {
  ad_storage: doseIqGranted ? "granted" : "denied",
  ad_user_data: doseIqGranted ? "granted" : "denied",
  ad_personalization: doseIqGranted ? "granted" : "denied",
  analytics_storage: doseIqGranted ? "granted" : "denied",
  wait_for_update: 500
});
gtag("config", "AW-18427841111");

window.doseIqLoadMetaPixel = function () {
  try {
    if (window._doseIqMetaLoaded) return;
    if (typeof localStorage !== "undefined") {
      try {
        if (localStorage.getItem(DOSEIQ_CONSENT_KEY) !== "granted") return;
      } catch (e) { return; }
    }
    window._doseIqMetaLoaded = true;
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", DOSEIQ_META_PIXEL_ID);
    fbq("track", "PageView");
  } catch (e) {}
};

if (doseIqGranted) {
  window.doseIqLoadMetaPixel();
}

window.doseIqLead = function (email) {
  try {
    if (typeof gtag === "function") {
      if (email) gtag("set", "user_data", { email: String(email).trim() });
      gtag("event", "conversion", { send_to: "AW-18427841111/7H7YCL3czu0cENeUitNE", value: 1.0, currency: "EUR" });
      gtag("event", "generate_lead", { value: 1.0, currency: "EUR" });
    }
    var consented = false;
    try { consented = localStorage.getItem(DOSEIQ_CONSENT_KEY) === "granted"; } catch (e) {}
    if (consented) {
      window.doseIqLoadMetaPixel();
      if (typeof fbq === "function") {
        if (email) {
          fbq("track", "Lead", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 }, { em: String(email).trim().toLowerCase() });
        } else {
          fbq("track", "Lead", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 });
        }
      }
    }
  } catch (e) {}
};

(function () {
  if (doseIqConsent === "granted" || doseIqConsent === "denied") return;

  var LANGS = {"en": {"msg": "We use Google Ads and Meta cookies to measure quiz signups from ads. You can reject and still use the site.", "accept": "Accept", "reject": "Reject", "privacy": "Privacy"}, "de": {"msg": "Wir verwenden Google-Ads- und Meta-Cookies, um Quiz-Anmeldungen aus Anzeigen zu messen. Ablehnen ist möglich — die Seite bleibt nutzbar.", "accept": "Akzeptieren", "reject": "Ablehnen", "privacy": "Datenschutz"}, "fr": {"msg": "Nous utilisons des cookies Google Ads et Meta pour mesurer les inscriptions au quiz issues des publicités. Vous pouvez refuser et continuer.", "accept": "Accepter", "reject": "Refuser", "privacy": "Confidentialité"}, "it": {"msg": "Usiamo cookie di Google Ads e Meta per misurare le iscrizioni al quiz dalle inserzioni. Puoi rifiutare e usare comunque il sito.", "accept": "Accetta", "reject": "Rifiuta", "privacy": "Privacy"}, "es": {"msg": "Usamos cookies de Google Ads y Meta para medir altas al quiz desde anuncios. Puedes rechazar y seguir usando el sitio.", "accept": "Aceptar", "reject": "Rechazar", "privacy": "Privacidad"}, "pt": {"msg": "Usamos cookies do Google Ads e da Meta para medir inscrições no quiz a partir de anúncios. Pode recusar e continuar a usar o site.", "accept": "Aceitar", "reject": "Recusar", "privacy": "Privacidade"}, "nl": {"msg": "We gebruiken Google Ads- en Meta-cookies om quiz-aanmeldingen uit advertenties te meten. Je kunt weigeren en de site gewoon gebruiken.", "accept": "Accepteren", "reject": "Weigeren", "privacy": "Privacy"}, "pl": {"msg": "Używamy plików cookie Google Ads i Meta, aby mierzyć zapisy z quizu z reklam. Możesz odrzucić i nadal korzystać z witryny.", "accept": "Akceptuj", "reject": "Odrzuć", "privacy": "Prywatność"}, "cs": {"msg": "Používáme cookies Google Ads a Meta k měření registrací z kvízu z reklam. Můžete odmítnout a web dál používat.", "accept": "Přijmout", "reject": "Odmítnout", "privacy": "Soukromí"}};
  var parts = (location.pathname.replace(/\/+$/, "") || "/").split("/").filter(Boolean);
  var lang = (parts[0] || "").toLowerCase();
  var copy = LANGS[lang] || LANGS.en;

  function setConsent(state) {
    var v = state === "granted" ? "granted" : "denied";
    try { localStorage.setItem(DOSEIQ_CONSENT_KEY, v); } catch (e) {}
    gtag("consent", "update", {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v
    });
    if (v === "granted") window.doseIqLoadMetaPixel();
    var bar = document.getElementById("doseiq-consent");
    if (bar) bar.remove();
  }

  function paint() {
    if (document.getElementById("doseiq-consent")) return;
    var style = document.createElement("style");
    style.textContent = "#doseiq-consent{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#0F172A;color:#F8FAFC;border-top:3px solid #F28C38;box-shadow:0 -12px 40px rgba(15,23,42,.35);padding:18px 20px 22px;display:flex;flex-wrap:wrap;gap:14px 18px;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.45}#doseiq-consent .doseiq-inner{width:100%;max-width:980px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px 18px;align-items:center}#doseiq-consent p{margin:0;flex:1 1 280px;color:#E2E8F0;font-size:16px;font-weight:500}#doseiq-consent a{color:#7DD3FC;font-weight:600;text-decoration:underline}#doseiq-consent .doseiq-actions{display:flex;gap:10px;flex-wrap:wrap;margin-left:auto}#doseiq-consent button{font-family:inherit;font-size:16px;font-weight:700;border-radius:999px;padding:14px 22px;cursor:pointer;min-width:132px}#doseiq-consent .doseiq-reject{background:transparent;border:2px solid #94A3B8;color:#F8FAFC}#doseiq-consent .doseiq-accept{background:#F28C38;border:2px solid #F28C38;color:#fff}@media (max-width:560px){#doseiq-consent{padding:16px 14px 20px;font-size:15px}#doseiq-consent button{flex:1 1 40%;min-width:0;padding:14px 16px}}";
    document.head.appendChild(style);
    var bar = document.createElement("div");
    bar.id = "doseiq-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", copy.msg);
    bar.innerHTML = "<div class=\"doseiq-inner\"><p>" + copy.msg + ' <a href="/privacy.html" target="_blank" rel="noopener">' + copy.privacy + "</a></p><div class=\"doseiq-actions\"><button type=\"button\" class=\"doseiq-reject\">" + copy.reject + "</button><button type=\"button\" class=\"doseiq-accept\">" + copy.accept + "</button></div></div>";
    document.body.appendChild(bar);
    bar.querySelector(".doseiq-accept").addEventListener("click", function () { setConsent("granted"); });
    bar.querySelector(".doseiq-reject").addEventListener("click", function () { setConsent("denied"); });
  }

  if (document.body) paint();
  else document.addEventListener("DOMContentLoaded", paint);
})();
