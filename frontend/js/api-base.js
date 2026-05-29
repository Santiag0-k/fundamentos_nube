(function () {
  var STORAGE_KEY = "cea_api_base";
  var DEFAULT_API = "/api";

  function normalizeBase(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  var params = new URLSearchParams(window.location.search || "");
  var fromQuery = normalizeBase(params.get("api"));
  var fromStorage = normalizeBase(localStorage.getItem(STORAGE_KEY));
  var fromGlobal = normalizeBase(window.__API_BASE__);

  var base = fromQuery || fromGlobal || fromStorage || DEFAULT_API;
  if (fromQuery) {
    localStorage.setItem(STORAGE_KEY, base);
  }

  window.CEA_API_BASE = base;

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url ? input.url : "");
    if (url.indexOf("http://localhost:8081") === 0 || url.indexOf("http://127.0.0.1:8081") === 0) {
      var rewritten = url
        .replace("http://localhost:8081", base)
        .replace("http://127.0.0.1:8081", base);
      if (typeof input === "string") input = rewritten;
      else input = new Request(rewritten, input);
    }
    return originalFetch(input, init);
  };
})();
