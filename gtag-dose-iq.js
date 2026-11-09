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

/* Light custom events (e.g. name_saved / name_skipped). Google via consent mode as other events;
   Meta trackCustom only after Accept. No Meta standard events. */
window.doseIqLightEvent = function (name) {
  try {
    if (!name) return;
    if (typeof gtag === "function") {
      gtag("event", name, { event_category: "engagement", event_label: "Dose IQ Quiz" });
    }
    try { window.dataLayer.push({ event: name }); } catch (eDl) {}
    var consented = false;
    try { consented = localStorage.getItem(DOSEIQ_CONSENT_KEY) === "granted"; } catch (eC) {}
    if (consented) {
      window.doseIqLoadMetaPixel();
      if (typeof fbq === "function") fbq("trackCustom", name, { content_name: "Dose IQ Quiz" });
    }
  } catch (e) {}
};

(function () {
  if (doseIqConsent === "granted" || doseIqConsent === "denied") return;

  /* Mid-screen card. Accept and Reject share identical size and visual weight (UK GDPR/PECR). */
  var LANGS = {
    en: {
      title: "Your choice on cookies",
      msg: "We use a few Google Ads and Meta cookies only to see which ads bring people to this Fit Score quiz. You can reject them and still take the quiz and get your result — nothing else changes.",
      accept: "Accept",
      reject: "Reject",
      privacy: "Privacy"
    },
    de: {
      title: "Ihre Wahl zu Cookies",
      msg: "Wir verwenden einige Google-Ads- und Meta-Cookies nur, um zu sehen, welche Anzeigen Menschen zu diesem Fit-Score-Quiz bringen. Sie können sie ablehnen und das Quiz trotzdem machen und Ihr Ergebnis erhalten — sonst ändert sich nichts.",
      accept: "Akzeptieren",
      reject: "Ablehnen",
      privacy: "Datenschutz"
    },
    fr: {
      title: "Votre choix sur les cookies",
      msg: "Nous utilisons quelques cookies Google Ads et Meta uniquement pour voir quelles publicités amènent les gens à ce quiz Fit Score. Vous pouvez les refuser et quand même faire le quiz et obtenir votre résultat — rien d’autre ne change.",
      accept: "Accepter",
      reject: "Refuser",
      privacy: "Confidentialité"
    },
    it: {
      title: "La tua scelta sui cookie",
      msg: "Usiamo alcuni cookie di Google Ads e Meta solo per vedere quali annunci portano le persone a questo quiz Fit Score. Puoi rifiutarli e fare comunque il quiz e ottenere il tuo risultato — nient’altro cambia.",
      accept: "Accetta",
      reject: "Rifiuta",
      privacy: "Privacy"
    },
    es: {
      title: "Tu elección sobre cookies",
      msg: "Usamos unas pocas cookies de Google Ads y Meta solo para ver qué anuncios traen personas a este quiz Fit Score. Puedes rechazarlas y seguir haciendo el quiz y obteniendo tu resultado — no cambia nada más.",
      accept: "Aceptar",
      reject: "Rechazar",
      privacy: "Privacidad"
    },
    pt: {
      title: "A sua escolha sobre cookies",
      msg: "Usamos alguns cookies do Google Ads e da Meta só para ver quais anúncios trazem pessoas a este quiz Fit Score. Pode recusá-los e mesmo assim fazer o quiz e obter o seu resultado — mais nada muda.",
      accept: "Aceitar",
      reject: "Recusar",
      privacy: "Privacidade"
    },
    nl: {
      title: "Jouw keuze over cookies",
      msg: "We gebruiken een paar Google Ads- en Meta-cookies alleen om te zien welke advertenties mensen naar deze Fit Score-quiz brengen. Je kunt ze weigeren en de quiz toch doen en je resultaat krijgen — verder verandert er niets.",
      accept: "Accepteren",
      reject: "Weigeren",
      privacy: "Privacy"
    },
    pl: {
      title: "Twój wybór dotyczący plików cookie",
      msg: "Używamy kilku plików cookie Google Ads i Meta tylko po to, by zobaczyć, które reklamy przyprowadzają ludzi do tego quizu Fit Score. Możesz je odrzucić i nadal rozwiązać quiz oraz otrzymać wynik — nic więcej się nie zmienia.",
      accept: "Akceptuj",
      reject: "Odrzuć",
      privacy: "Prywatność"
    },
    cs: {
      title: "Vaše volba ohledně cookies",
      msg: "Používáme několik cookies Google Ads a Meta jen proto, abychom viděli, které reklamy přivádějí lidi k tomuto Fit Score kvízu. Můžete je odmítnout a kvíz i tak absolvovat a získat výsledek — nic jiného se nemění.",
      accept: "Přijmout",
      reject: "Odmítnout",
      privacy: "Soukromí"
    }
  };

  var parts = (location.pathname.replace(/\/+$/, "") || "/").split("/").filter(Boolean);
  var lang = (parts[0] || "").toLowerCase();
  var copy = LANGS[lang] || LANGS.en;

  function qparam(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function doseIqConsentBeacon(eventName) {
    try {
      var payload = JSON.stringify({
        event: eventName,
        lang: lang || "en",
        path: location.pathname || "/",
        utm_source: qparam("utm_source"),
        utm_content: qparam("utm_content"),
        ts: new Date().toISOString()
      });
      var url = "/api/consent-event";
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon(url, blob)) return;
      }
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        credentials: "omit",
        cache: "no-store"
      }).catch(function () {});
    } catch (e) {}
  }

  function setConsent(state) {
    var v = state === "granted" ? "granted" : "denied";
    doseIqConsentBeacon(v === "granted" ? "accepted" : "rejected");
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
    // Mid-screen card + soft scrim. Accept and Reject: identical size, weight, hit area.
    style.textContent = "#doseiq-consent{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px 16px;background:rgba(15,23,42,.48);font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.45;box-sizing:border-box}#doseiq-consent *{box-sizing:border-box}#doseiq-consent .doseiq-card{width:100%;max-width:420px;max-height:min(90vh,560px);overflow:auto;background:#0F172A;color:#F8FAFC;border:2px solid #F28C38;border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,.45);padding:22px 22px 20px;display:flex;flex-direction:column;gap:14px}#doseiq-consent .doseiq-title{margin:0;font-size:18px;font-weight:700;color:#F8FAFC;line-height:1.3}#doseiq-consent p{margin:0;color:#E2E8F0;font-size:15px;font-weight:500}#doseiq-consent a{color:#7DD3FC;font-weight:600;text-decoration:underline}#doseiq-consent .doseiq-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}#doseiq-consent button{font-family:inherit;font-size:16px;font-weight:700;border-radius:999px;padding:14px 22px;cursor:pointer;flex:1 1 40%;min-width:120px;min-height:48px;background:#F8FAFC;border:2px solid #F8FAFC;color:#0F172A}#doseiq-consent button:hover,#doseiq-consent button:focus-visible{background:#E2E8F0;border-color:#E2E8F0}#doseiq-consent .doseiq-accept,#doseiq-consent .doseiq-reject{background:#F8FAFC;border:2px solid #F8FAFC;color:#0F172A}@media (max-width:560px){#doseiq-consent{padding:16px 12px}#doseiq-consent .doseiq-card{padding:18px 16px 16px;border-radius:14px}#doseiq-consent .doseiq-title{font-size:17px}#doseiq-consent p{font-size:14px}#doseiq-consent button{min-width:0;padding:14px 16px}}";
    document.head.appendChild(style);
    var bar = document.createElement("div");
    bar.id = "doseiq-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-modal", "true");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", copy.title);
    bar.innerHTML =
      '<div class="doseiq-card">' +
      '<p class="doseiq-title">' + copy.title + "</p>" +
      "<p>" + copy.msg + ' <a href="/privacy.html" target="_blank" rel="noopener">' + copy.privacy + "</a></p>" +
      '<div class="doseiq-actions">' +
      '<button type="button" class="doseiq-accept">' + copy.accept + "</button>" +
      '<button type="button" class="doseiq-reject">' + copy.reject + "</button>" +
      "</div></div>";
    document.body.appendChild(bar);
    bar.querySelector(".doseiq-accept").addEventListener("click", function () { setConsent("granted"); });
    bar.querySelector(".doseiq-reject").addEventListener("click", function () { setConsent("denied"); });
    // Scrim click does not grant or dismiss — both choices stay equally available.
    bar.addEventListener("click", function (e) {
      if (e.target === bar) e.stopPropagation();
    });
    doseIqConsentBeacon("shown");
  }

  if (document.body) paint();
  else document.addEventListener("DOMContentLoaded", paint);
})();

