(function () {
  // storage.js yoksa bile çalışsın
  const Storage = window.A11YStorage || {
    load: () => {
      try { return JSON.parse(localStorage.getItem("__a11y_widget_prefs__") || "{}"); }
      catch { return {}; }
    },
    save: (p) => localStorage.setItem("__a11y_widget_prefs__", JSON.stringify(p)),
  };

  // widget.js -> ui.html -> apply.js init ile gelebilir
  const A11YConfig = { readContainer: "main" };

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
    for (let i = 0; i <= 2; i++) root.classList.remove(base + i);
    if (level > 0) root.classList.add(base + level);
  }

  function recomputeFilter() {
    const parts = [];
    if (prefs.contrast) parts.push("contrast(1.25) saturate(1.1)");
    if (prefs.invert) parts.push("invert(1) hue-rotate(180deg)");
    if (prefs.grayscale) parts.push("grayscale(1)");
    root.style.filter = parts.length ? parts.join(" ") : "";
  }

  function applyAll() {
    setClass("a11y-text-", Number(prefs.textSize || 0));
    setClass("a11y-lh-", Number(prefs.lineHeight || 0));
    setClass("a11y-ls-", Number(prefs.letterSpacing || 0));

    root.classList.toggle("a11y-reduce-motion", !!prefs.reduceMotion);
    root.classList.toggle("a11y-highlight-links", !!prefs.highlightLinks);
    root.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);

    // Metni oku modu
    root.classList.toggle("a11y-tts-on", !!prefs.ttsAutoRead);

    recomputeFilter();

    cursorEl.style.display = prefs.bigCursor ? "block" : "none";

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

  // ===== TTS yardımcıları =====
  let lastSpoken = "";
  let selectionDebounce = null;

  function normalizeText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function isEditableNode(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    return !!el.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
  }

  function speak(text, rate = 1) {
    if (!("speechSynthesis" in window)) {
      console.warn("[A11Y] speechSynthesis not supported");
      return;
    }

    text = normalizeText(text);
    if (!text) return;

    // Aynı metni gereksiz tekrar okutmayalım
    if (text === lastSpoken) return;
    lastSpoken = text;

    // Her yeni okuma: baştan başlat
    window.speechSynthesis.cancel();

    const ut = new SpeechSynthesisUtterance(text);
    ut.rate = Math.max(0.7, Math.min(1.3, Number(rate) || 1));
    ut.lang = document.documentElement.lang || "tr-TR";
    window.speechSynthesis.speak(ut);
  }

  function ttsPause() {
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
  }
  function ttsResume() {
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
  }
  function ttsStop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    // Durdurunca aynı metin engeline takılmasın
    lastSpoken = "";
  }

  function getSelectionText() {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return "";
    if (isEditableNode(sel.anchorNode)) return "";
    return normalizeText(sel.toString());
  }

  function getContainerText(maxChars = 8000) {
    const selector = A11YConfig.readContainer || "main";
    const el = document.querySelector(selector) || document.querySelector("main") || document.body;

    let txt = normalizeText(el?.innerText || "");
    if (txt.length > maxChars) txt = txt.slice(0, maxChars) + "…";
    return txt;
  }

  function speakCurrentSelectionAuto() {
    if (!prefs.ttsAutoRead) return;
    const txt = getSelectionText();
    if (!txt || txt.length < 2) return;
    speak(txt, prefs.ttsRate || 1);
  }

  function selectWordAtPoint(x, y) {
    let range = null;

    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range) return false;
    if (isEditableNode(range.startContainer)) return false;

    const node = range.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;

    const text = node.nodeValue || "";
    let i = Math.max(0, Math.min(range.startOffset, text.length));

    const isWordChar = (ch) => /[0-9A-Za-z_ÇĞİÖŞÜçğıöşü]/.test(ch || "");

    // boşluğa denk geldiyse yakındaki karaktere kay
    if (text && !isWordChar(text[i]) && i > 0 && isWordChar(text[i - 1])) i = i - 1;
    else if (text && !isWordChar(text[i]) && i < text.length - 1 && isWordChar(text[i + 1])) i = i + 1;

    let left = i, right = i;

    while (left > 0 && isWordChar(text[left - 1])) left--;
    while (right < text.length && isWordChar(text[right])) right++;

    if (right <= left) return false;

    const wordRange = document.createRange();
    wordRange.setStart(node, left);
    wordRange.setEnd(node, right);

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(wordRange);

    return true;
  }

  // 1) Tek tıkla kelime seç + oku (Auto mode açıkken)
  document.addEventListener("pointerup", (e) => {
    if (!prefs.ttsAutoRead) return;
    if (e.button !== 0) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const t = e.target;
    if (t && (t.closest(".a11y-w-btn") || t.closest(".a11y-w-frame"))) return;

    const existing = getSelectionText();

    if (!existing) {
      const ok = selectWordAtPoint(e.clientX, e.clientY);
      if (ok) {
        // Selection bazen aynı tick içinde boş dönebiliyor -> bir sonraki tick'te oku
        setTimeout(() => speakCurrentSelectionAuto(), 0);
      }
    } else {
      speak(existing, prefs.ttsRate || 1);
    }
  }, true);

  // 2) Kullanıcı drag / shift / double click ile seçim yaparsa: yeni seçimi baştan oku
  document.addEventListener("selectionchange", () => {
    if (!prefs.ttsAutoRead) return;

    clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(() => {
      const txt = getSelectionText();
      if (!txt || txt.length < 2) return;
      speak(txt, prefs.ttsRate || 1);
    }, 120);
  });

  // ===== Panelden mesaj dinleme =====
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    // Prod ortamda güvenlik:
    // if (event.origin !== "https://SENIN-CDN-DOMAININ") return;

    if (msg.type === "A11Y_INIT") {
      if (msg.payload?.readContainer) {
        A11YConfig.readContainer = String(msg.payload.readContainer);
      }
    }

    if (msg.type === "A11Y_SET_PREF") {
      updatePref(msg.key, msg.value);

      // Auto mode aç/kapa değişince aynı metin engeline takılmasın
      if (msg.key === "ttsAutoRead") lastSpoken = "";
      return;
    }

    if (msg.type === "A11Y_GET_PREFS") {
      event.source?.postMessage({ type: "A11Y_PREFS", payload: prefs }, "*");
      return;
    }

    if (msg.type === "A11Y_TTS_SPEAK_PAGE") {
      const rate = msg.payload?.rate ?? (prefs.ttsRate || 1);
      const text = getContainerText(8000);
      // Sayfayı oku = auto mode açık/kapalı fark etmeden okur
      speak(text, rate);
      return;
    }

    if (msg.type === "A11Y_TTS_SPEAK_SELECTION") {
      const rate = msg.payload?.rate ?? (prefs.ttsRate || 1);
      const text = getSelectionText();
      speak(text, rate);
      return;
    }

    if (msg.type === "A11Y_TTS_PAUSE") { ttsPause(); return; }
    if (msg.type === "A11Y_TTS_RESUME") { ttsResume(); return; }
    if (msg.type === "A11Y_TTS_STOP") { ttsStop(); return; }

    if (msg.type === "A11Y_RESET") {
      prefs = {};
      Storage.save(prefs);

      root.classList.remove(
        "a11y-reduce-motion",
        "a11y-highlight-links",
        "a11y-strong-focus",
        "a11y-tts-on"
      );

      root.style.filter = "";
      for (let i = 0; i <= 2; i++) {
        root.classList.remove("a11y-text-" + i, "a11y-lh-" + i, "a11y-ls-" + i);
      }

      cursorEl.style.display = "none";
      rulerEl.style.display = "none";

      lastSpoken = "";
      ttsStop();

      applyAll();
      return;
    }
  });

  // İlk uygulama
  applyAll();
})();
