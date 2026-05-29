(function () {
  var containerId = "app-notify-container";

  function ensureContainer() {
    var existing = document.getElementById(containerId);
    if (existing) return existing;

    var container = document.createElement("div");
    container.id = containerId;
    container.className = "notify-container";
    document.body.appendChild(container);
    return container;
  }

  function ensureStyles() {
    if (document.getElementById("notify-style")) return;
    var style = document.createElement("style");
    style.id = "notify-style";
    style.textContent =
      ".notify-container{position:fixed;top:16px;right:16px;z-index:9999;display:grid;gap:10px;max-width:360px;width:calc(100% - 32px)}" +
      ".notify-toast{border-radius:10px;padding:11px 12px;color:#fff;font-family:Ubuntu,sans-serif;font-size:.92rem;box-shadow:0 12px 30px rgba(0,0,0,.22);display:flex;align-items:start;gap:8px;opacity:0;transform:translateY(-6px);animation:notifyIn .18s ease forwards}" +
      ".notify-toast.success{background:#1f8f55}" +
      ".notify-toast.error{background:#c13f3f}" +
      ".notify-toast.info{background:#2d5f99}" +
      ".notify-toast.warning{background:#9f6d14}" +
      ".notify-close{margin-left:auto;border:0;background:transparent;color:#fff;font-size:14px;cursor:pointer;line-height:1}" +
      "@keyframes notifyIn{to{opacity:1;transform:translateY(0)}}" +
      "@media (max-width:767px){.notify-container{left:10px;right:10px;width:auto;max-width:none}}";
    document.head.appendChild(style);
  }

  function inferType(message) {
    var text = String(message || "").toLowerCase();
    if (text.indexOf("error") >= 0 || text.indexOf("incorrect") >= 0) return "error";
    if (text.indexOf("por favor") >= 0 || text.indexOf("atencion") >= 0) return "warning";
    if (
      text.indexOf("cread") >= 0 ||
      text.indexOf("actualiz") >= 0 ||
      text.indexOf("eliminad") >= 0 ||
      text.indexOf("exitos") >= 0 ||
      text.indexOf("correctamente") >= 0
    ) return "success";
    return "info";
  }

  window.showNotification = function (message, type, timeoutMs) {
    ensureStyles();
    var container = ensureContainer();
    var kind = type || inferType(message);
    var timeout = timeoutMs || 3200;

    var toast = document.createElement("div");
    toast.className = "notify-toast " + kind;
    toast.setAttribute("role", "status");
    toast.innerHTML =
      "<span>" + String(message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</span>" +
      '<button class="notify-close" type="button" aria-label="Cerrar">x</button>';

    var removeToast = function () {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    };

    toast.querySelector(".notify-close").addEventListener("click", removeToast);
    container.appendChild(toast);
    setTimeout(removeToast, timeout);
  };

  window.alert = function () {
    var parts = [];
    for (var i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null) parts.push(String(arguments[i]));
    }
    window.showNotification(parts.join(" "), inferType(parts.join(" ")));
  };
})();
