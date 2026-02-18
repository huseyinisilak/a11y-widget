(function () {
  // storage.js yoksa bile çalışsın
  const Storage = window.A11YStorage || {
    load: () => {
      try { return JSON.parse(localStorage.getItem("__a11y_widget_prefs__") || "{}"); }
      catch { return {}; }
    },
    save: (p) => localStorage.setItem("__a11y_widget_prefs__", JSON.stringify(p)),
  };

  const root = document.documentElement;
  let prefs = Storage.load();

  // Overlay elementleri
  const cursorEl = document.createElement("div");
  cursorEl.id = "a11y-cursor";
  document.documentElement.appendChild(cursorEl);

  const rulerEl = document.createElement("div");
  rulerEl.id = "a11y-ruler";
  document.documentElement.appendChild(rulerEl);

  let lastMouse = { x: 0, y: 0 };

  function setClass(base, level) {
    // base: "a11y-text-" => a11y-text-0/1/2 gibi
    for (let i = 0; i <= 2; i++) root.classList.remove(base + i);
    if (level > 0) root.classList.add(base + level);
  }

  function recomputeFilter() {
    // filter'lar çakışmasın diye tek filter string üretiyoruz
    const parts = [];
    if (prefs.contrast) parts.push("contrast(1.25) saturate(1.1)");
    if (prefs.invert) parts.push("invert(1) hue-rotate(180deg)");
    if (prefs.grayscale) parts.push("grayscale(1)");

    // Filteri root'a inline basmak en temiz "stack" yönetimi
    root.style.filter = parts.length ? parts.join(" ") : "";
  }

  function applyAll() {
    // text size: 0-2
    setClass("a11y-text-", Number(prefs.textSize || 0));

    // line height: 0-2
    setClass("a11y-lh-", Number(prefs.lineHeight || 0));

    // letter spacing: 0-2
    setClass("a11y-ls-", Number(prefs.letterSpacing || 0));

    root.classList.toggle("a11y-reduce-motion", !!prefs.reduceMotion);
    root.classList.toggle("a11y-highlight-links", !!prefs.highlightLinks);
    root.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);

    // Filter stack
    recomputeFilter();

    // Cursor overlay
    cursorEl.style.display = prefs.bigCursor ? "block" : "none";

    // Ruler overlay
    rulerEl.style.display = prefs.readingRuler ? "block" : "none";
    if (prefs.readingRuler) {
      rulerEl.style.top = Math.max(0, lastMouse.y - 26) + "px";
    }
  }

  function updatePref(key, value) {
    prefs[key] = value;
    Storage.save(prefs);
    applyAll();
  }

  // Mouse takip
  window.addEventListener("mousemove", (e) => {
    lastMouse = { x: e.clientX, y: e.clientY };
    if (prefs.bigCursor) {
      cursorEl.style.left = e.clientX + "px";
      cursorEl.style.top = e.clientY + "px";
    }
    if (prefs.readingRuler) {
      rulerEl.style.top = Math.max(0, e.clientY - 26) + "px";
    }
  }, { passive: true });

  // Panelden mesaj dinleme
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    // Prod ortamda güvenlik:
    // if (event.origin !== "https://cdn.ornek.com") return;

    if (msg.type === "A11Y_SET_PREF") {
      updatePref(msg.key, msg.value);
    }

    if (msg.type === "A11Y_GET_PREFS") {
      event.source?.postMessage({ type: "A11Y_PREFS", payload: prefs }, "*");
    }

    if (msg.type === "A11Y_RESET") {
      prefs = {};
      Storage.save(prefs);
      // class temizliği
      root.classList.remove(
        "a11y-reduce-motion",
        "a11y-highlight-links",
        "a11y-strong-focus",
        "a11y-contrast",
        "a11y-invert",
        "a11y-grayscale"
      );
      root.style.filter = "";
      for (let i = 0; i <= 2; i++) {
        root.classList.remove("a11y-text-" + i, "a11y-lh-" + i, "a11y-ls-" + i);
      }
      cursorEl.style.display = "none";
      rulerEl.style.display = "none";
      applyAll();
    }
  });

  // İlk uygulama
  applyAll();
})();
