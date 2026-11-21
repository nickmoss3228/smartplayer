/*
 * Yandex.Metrika counter for малако.рф.
 *
 * Moved out of an inline <script> in index.html on 2026-11-17 so the
 * Content-Security-Policy (nginx-security-headers.conf) can forbid inline
 * scripts entirely — the one rule that turns most XSS payloads into dead text.
 *
 * The page URL is scrubbed before Metrika sees it. Webvisor records the URL of
 * every session, and a password-reset link carries a live token (older links in
 * the query, newer ones in the fragment). Sending location.href as-is handed
 * that credential to a third party.
 */
(function () {
  function scrub(href) {
    try {
      var u = new URL(href);
      u.searchParams.delete("token");
      if (/(^|[#&])token=/.test(u.hash)) u.hash = "";
      return u.toString();
    } catch (e) {
      return location.origin + location.pathname;
    }
  }

  (function (m, e, t, r, i, k, a) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) {
      if (document.scripts[j].src === r) {
        return;
      }
    }
    (k = e.createElement(t)), (a = e.getElementsByTagName(t)[0]), (k.async = 1), (k.src = r), a.parentNode.insertBefore(k, a);
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=112301518", "ym");

  ym(112301518, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: scrub(location.href),
    accurateTrackBounce: true,
    trackLinks: true,
  });
})();
