(function () {
  const params = new URLSearchParams(location.search);
  const lang = (params.get("lang") || "tr").toLowerCase();
  const color = params.get("color") || "#0ea5e9";

  document.documentElement.style.setProperty("--accent", color);

  // i18n (MVP seviyesinde)
  const i18n = {
    tr: {
      title: "Erişilebilirlik",
      sub: "Görünüm ve kullanım ayarları",
      text: "Metin",
      view: "Görünüm",
      tools: "Araçlar",
      textSize: "Yazı boyutu",
      lineHeight: "Satır aralığı",
      letterSpacing: "Harf aralığı",
      contrast: "Yüksek kontrast",
      invert: "Ters renk",
      gray: "Gri tonlama",
      motion: "Animasyon azalt",
      links: "Link vurgula",
      focus: "Odak belirginleştir",
      cursor: "Büyük imleç",
      ruler: "Okuma kılavuzu",
      reset: "Sıfırla",
      hint: "Ayarlar bu tarayıcıda kaydedilir.",
    },
    en: {
      title: "Accessibility",
      sub: "Display and usage settings",
      text: "Text",
      view: "View",
      tools: "Tools",
      textSize: "Text size",
      lineHeight: "Line height",
      letterSpacing: "Letter spacing",
      contrast: "High contrast",
      invert: "Invert colors",
      gray: "Grayscale",
      motion: "Reduce motion",
      links: "Highlight links",
      focus: "Stronger focus",
      cursor: "Large cursor",
      ruler: "Reading ruler",
      reset: "Reset",
      hint: "Settings are saved in this browser.",
    }
  };

  const t = i18n[lang] || i18n.tr;
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText("t_title", t.title);
  setText("t_sub", t.sub);
  setText("t_text", t.text);
  setText("t_view", t.view);
  setText("t_tools", t.tools);
  setText("t_textSize", t.textSize);
  setText("t_lineHeight", t.lineHeight);
  setText("t_letterSpacing", t.letterSpacing);
  setText("t_contrast", t.contrast);
  setText("t_invert", t.invert);
  setText("t_gray", t.gray);
  setText("t_motion", t.motion);
  setText("t_links", t.links);
  setText("t_focus", t.focus);
  setText("t_cursor", t.cursor);
  setText("t_ruler", t.ruler);
  setText("resetBtn", t.reset);
  setText("t_hint", t.hint);

  const parentWin = window.parent;

  function send(type, payload) {
    parentWin.postMessage({ type, ...payload }, "*");
  }

  // Prefleri parent'tan iste
  let prefs = {};
  send("A11Y_GET_PREFS", {});

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "A11Y_INIT" && msg.payload?.color) {
      document.documentElement.style.setProperty("--accent", msg.payload.color);
    }

    if (msg.type === "A11Y_PREFS") {
      prefs = msg.payload || {};
      syncUI();
    }
  });

  // init request (widget.js buna cevap verebilir)
  send("A11Y_REQUEST_INIT", {});

  function setPref(key, value) {
    prefs[key] = value;
    send("A11Y_SET_PREF", { key, value });
    syncUI();
  }

  function syncUI() {
    // Segmented
    const segButtons = document.querySelectorAll(".segBtn");
    segButtons.forEach((b) => {
      const key = b.getAttribute("data-key");
      const val = Number(b.getAttribute("data-val"));
      const current = Number(prefs[key] || 0);
      b.classList.toggle("active", val === current);
    });

    // Toggles
    const checks = document.querySelectorAll('input[type="checkbox"][data-key]');
    checks.forEach((c) => {
      const key = c.getAttribute("data-key");
      c.checked = !!prefs[key];
    });
  }

  // Segmented clicks
  document.querySelectorAll(".segBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const val = Number(btn.getAttribute("data-val"));
      setPref(key, val);
    });
  });

  // Toggle changes
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach((c) => {
    c.addEventListener("change", () => {
      const key = c.getAttribute("data-key");
      setPref(key, c.checked);
    });
  });

  // Close / Reset
  document.getElementById("closeBtn").addEventListener("click", () => send("A11Y_CLOSE", {}));
  document.getElementById("resetBtn").addEventListener("click", () => {
    prefs = {};
    send("A11Y_RESET", {});
    syncUI();
  });
})();
