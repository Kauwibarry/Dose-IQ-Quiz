window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
window.gtag = gtag;
gtag("js", new Date());

var DOSEIQ_CONSENT_KEY = "doseiq_ads_consent";
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

window.doseIqLead = function (email) {
  try {
    if (typeof gtag !== "function") return;
    if (email) gtag("set", "user_data", { email: String(email).trim() });
    gtag("event", "conversion", { send_to: "AW-18427841111", value: 1.0, currency: "EUR" });
    gtag("event", "generate_lead", { value: 1.0, currency: "EUR" });
  } catch (e) {}
};

(function () {
  if (doseIqConsent === "granted" || doseIqConsent === "denied") return;

  var LANGS = {
    en: { msg: "We use Google Ads cookies to measure quiz signups from ads.", accept: "Accept", reject: "Reject", privacy: "Privacy" },
    de: { msg: "Wir verwenden Google-Ads-Cookies, um Quiz-Anmeldungen aus Anzeigen zu messen.", accept: "Akzeptieren", reject: "Ablehnen", privacy: "Datenschutz" },
    fr: { msg: "Nous utilisons des cookies Google Ads pour mesurer les inscriptions au quiz issues des publicités.", accept: "Accepter", reject: "Refuser", privacy: "Confidentialité" },
    it: { msg: "Usiamo cookie di Google Ads per misurare le iscrizioni al quiz dalle inserzioni.", accept: "Accetta", reject: "Rifiuta", privacy: "Privacy" },
    es: { msg: "Usamos cookies de Google Ads para medir altas al quiz desde anuncios.", accept: "Aceptar", reject: "Rechazar", privacy: "Privacidad" },
    pt: { msg: "Usamos cookies do Google Ads para medir inscrições no quiz a partir de anúncios.", accept: "Aceitar", reject: "Recusar", privacy: "Privacidade" },
    nl: { msg: "We gebruiken Google Ads-cookies om quiz-aanmeldingen uit advertenties te meten.", accept: "Accepteren", reject: "Weigeren", privacy: "Privacy" },
    pl: { msg: "Używamy plików cookie Google Ads, aby mierzyć zapisy z quizu z reklam.", accept: "Akceptuj", reject: "Odrzuć", privacy: "Prywatność" },
    cs: { msg: "Používáme cookies Google Ads k měření registrací z kvízu z reklam.", accept: "Přijmout", reject: "Odmítnout", privacy: "Soukromí" }
  };
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
    var bar = document.getElementById("doseiq-consent");
    if (bar) bar.remove();
  }

  function paint() {
    if (document.getElementById("doseiq-consent")) return;
    var style = document.createElement("style");
    style.textContent = "#doseiq-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#fff;border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 16px 40px rgba(15,23,42,.12);padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.4;color:#0F172A}#doseiq-consent p{margin:0;flex:1 1 220px;color:#64748B}#doseiq-consent a{color:#2B8CFF}#doseiq-consent .doseiq-actions{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}#doseiq-consent button{font-family:inherit;font-size:13px;font-weight:600;border-radius:999px;padding:8px 14px;cursor:pointer}#doseiq-consent .doseiq-reject{background:#fff;border:1px solid #E5E7EB;color:#64748B}#doseiq-consent .doseiq-accept{background:#F28C38;border:0;color:#fff}";
    document.head.appendChild(style);
    var bar = document.createElement("div");
    bar.id = "doseiq-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", copy.msg);
    bar.innerHTML = "<p>" + copy.msg + ' <a href="/privacy.html" target="_blank" rel="noopener">' + copy.privacy + "</a></p><div class=\"doseiq-actions\"><button type=\"button\" class=\"doseiq-reject\">" + copy.reject + "</button><button type=\"button\" class=\"doseiq-accept\">" + copy.accept + "</button></div>";
    document.body.appendChild(bar);
    bar.querySelector(".doseiq-accept").addEventListener("click", function () { setConsent("granted"); });
    bar.querySelector(".doseiq-reject").addEventListener("click", function () { setConsent("denied"); });
  }

  if (document.body) paint();
  else document.addEventListener("DOMContentLoaded", paint);
})();
