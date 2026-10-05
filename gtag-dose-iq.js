window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
window.gtag = gtag;
gtag("js", new Date());


/* First-touch attribution (functional) — not gated behind ads cookie banner */
(function () {
  try {
    var FT_KEY = "diq_ft";
    var FT_DAYS = 90;

    function ftReadCookie(name) {
      var parts = String(document.cookie || "").split(";");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var idx = p.indexOf("=");
        if (idx === -1) continue;
        if (p.slice(0, idx).trim() === name) {
          return p.slice(idx + 1).trim();
        }
      }
      return "";
    }

    function ftWriteCookie(name, value, days) {
      var maxAge = Math.floor(days * 24 * 60 * 60);
      document.cookie =
        name +
        "=" +
        value +
        "; path=/; max-age=" +
        maxAge +
        "; SameSite=Lax";
    }

    function ftParse(raw) {
      if (!raw) return null;
      try {
        var obj = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!obj || typeof obj !== "object") return null;
        return obj;
      } catch (e) {
        return null;
      }
    }

    function ftLoad() {
      try {
        var ls = localStorage.getItem(FT_KEY);
        var fromLs = ftParse(ls);
        if (fromLs) return fromLs;
      } catch (e) {}
      try {
        var c = ftReadCookie(FT_KEY);
        if (c) {
          var decoded = decodeURIComponent(c);
          return ftParse(decoded);
        }
      } catch (e2) {}
      return null;
    }

    function ftSave(obj) {
      var json = JSON.stringify(obj);
      try {
        localStorage.setItem(FT_KEY, json);
      } catch (e) {}
      try {
        // Keep cookie under ~3.5k to avoid browser rejection
        var encoded = encodeURIComponent(json);
        if (encoded.length > 3500) {
          var slim = {
            utm_source: obj.utm_source || "",
            utm_medium: obj.utm_medium || "",
            utm_campaign: obj.utm_campaign || "",
            utm_content: obj.utm_content || "",
            utm_term: obj.utm_term || "",
            gclid: obj.gclid || "",
            fbclid: obj.fbclid || "",
            referrer: String(obj.referrer || "").slice(0, 500),
            landing: String(obj.landing || "").slice(0, 1500)
          };
          encoded = encodeURIComponent(JSON.stringify(slim));
        }
        ftWriteCookie(FT_KEY, encoded, FT_DAYS);
      } catch (e2) {}
    }

    function ftHasAttr(obj) {
      if (!obj) return false;
      return !!(
        obj.utm_source ||
        obj.utm_medium ||
        obj.utm_campaign ||
        obj.utm_content ||
        obj.utm_term ||
        obj.gclid ||
        obj.fbclid
      );
    }

    function ftCapture() {
      var params = new URLSearchParams(location.search || "");
      function q(k) {
        var v = params.get(k);
        return v ? String(v).trim() : "";
      }
      var incoming = {
        utm_source: q("utm_source"),
        utm_medium: q("utm_medium"),
        utm_campaign: q("utm_campaign"),
        utm_content: q("utm_content"),
        utm_term: q("utm_term"),
        gclid: q("gclid"),
        fbclid: q("fbclid"),
        referrer: String(document.referrer || "").slice(0, 2000),
        landing: String(location.href || "").slice(0, 2000)
      };
      var existing = ftLoad();
      var write = false;
      if (!existing) {
        write = true;
      } else if (ftHasAttr(incoming) && !ftHasAttr(existing)) {
        // Upgrade empty organic first-touch when a later visit carries paid/utm params
        write = true;
      }
      if (write) ftSave(incoming);
    }

    ftCapture();

    window.doseIqGetFirstTouch = function () {
      try {
        return ftLoad();
      } catch (e) {
        return null;
      }
    };

    window.doseIqFirstTouchPayload = function () {
      try {
        var ft = ftLoad() || {};
        return {
          utm_source: ft.utm_source || "",
          utm_medium: ft.utm_medium || "",
          utm_campaign: ft.utm_campaign || "",
          utm_content: ft.utm_content || "",
          utm_term: ft.utm_term || "",
          gclid: ft.gclid || "",
          fbclid: ft.fbclid || "",
          first_touch_url: ft.landing || "",
          first_touch_referrer: ft.referrer || ""
        };
      } catch (e) {
        return {};
      }
    };
  } catch (e) {}
})();


var DOSEIQ_CONSENT_KEY = "doseiq_ads_consent";
var DOSEIQ_META_PIXEL_ID = "1341206988086014";
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

window.doseIqNewEventId = function () {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
  } catch (e) {}
  return "diq_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
};

window.doseIqAdsConsent = function () {
  try {
    return localStorage.getItem(DOSEIQ_CONSENT_KEY) === "granted" ? "granted" : "denied";
  } catch (e) {
    return "denied";
  }
};

window.doseIqLead = function (email, eventId) {
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
      var eid = eventId || window.doseIqNewEventId();
      var opts = { eventID: eid };
      if (typeof fbq === "function") {
        if (email) {
          fbq("track", "Lead", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 }, Object.assign({ em: String(email).trim().toLowerCase() }, opts));
          fbq("track", "CompleteRegistration", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 }, opts);
        } else {
          fbq("track", "Lead", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 }, opts);
          fbq("track", "CompleteRegistration", { content_name: "Dose IQ Quiz", currency: "EUR", value: 1.0 }, opts);
        }
      }
      return eid;
    }
  } catch (e) {}
  return eventId || null;
};


window.doseIqStartAssessment = function (contentName) {
  try {
    var name = contentName || "Dose IQ Quiz";
    if (typeof gtag === "function") {
      gtag("event", "start_assessment", {
        content_name: name,
        event_category: "engagement",
        event_label: name
      });
      gtag("event", "conversion", {
        send_to: "AW-18427841111/pezECNXcxfocENeUitNE",
        value: 1.0,
        currency: "EUR"
      });
    }
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "start_assessment", content_name: name });
    } catch (eDl) {}
    var consented = false;
    try { consented = localStorage.getItem(DOSEIQ_CONSENT_KEY) === "granted"; } catch (eC) {}
    if (consented) {
      window.doseIqLoadMetaPixel();
      if (typeof fbq === "function") {
        fbq("trackCustom", "StartAssessment", { content_name: name });
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
    style.textContent = "#doseiq-consent{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px 16px;background:rgba(15,23,42,.48);font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.45;box-sizing:border-box}#doseiq-consent *{box-sizing:border-box}#doseiq-consent .doseiq-card{width:100%;max-width:420px;max-height:min(90vh,560px);overflow:auto;background:#0F172A;color:#F8FAFC;border:2px solid #F28C38;border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,.45);padding:22px 22px 20px;display:flex;flex-direction:column;gap:16px}#doseiq-consent p{margin:0;color:#E2E8F0;font-size:16px;font-weight:500}#doseiq-consent a{color:#7DD3FC;font-weight:600;text-decoration:underline}#doseiq-consent .doseiq-actions{display:flex;gap:10px;flex-wrap:wrap}#doseiq-consent button{font-family:inherit;font-size:16px;font-weight:700;border-radius:999px;padding:14px 22px;cursor:pointer;flex:1 1 40%;min-width:120px;min-height:48px}#doseiq-consent .doseiq-reject{background:transparent;border:2px solid #94A3B8;color:#F8FAFC}#doseiq-consent .doseiq-accept{background:#F28C38;border:2px solid #F28C38;color:#fff}@media (max-width:560px){#doseiq-consent{padding:16px 12px}#doseiq-consent .doseiq-card{padding:18px 16px 16px;border-radius:14px}#doseiq-consent p{font-size:15px}#doseiq-consent button{min-width:0;padding:14px 16px}}";
    document.head.appendChild(style);
    var bar = document.createElement("div");
    bar.id = "doseiq-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", copy.msg);
    bar.innerHTML = "<div class=\"doseiq-card\"><p>" + copy.msg + ' <a href="/privacy.html" target="_blank" rel="noopener">' + copy.privacy + "</a></p><div class=\"doseiq-actions\"><button type=\"button\" class=\"doseiq-reject\">" + copy.reject + "</button><button type=\"button\" class=\"doseiq-accept\">" + copy.accept + "</button></div></div>";
    document.body.appendChild(bar);
    bar.querySelector(".doseiq-accept").addEventListener("click", function () { setConsent("granted"); });
    bar.querySelector(".doseiq-reject").addEventListener("click", function () { setConsent("denied"); });
    // Scrim/overlay click must NOT grant consent (and does not dismiss).
    bar.addEventListener("click", function (e) {
      if (e.target === bar) { e.preventDefault(); }
    });
    var card = bar.querySelector(".doseiq-card");
    if (card) card.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  if (document.body) paint();
  else document.addEventListener("DOMContentLoaded", paint);
})();
