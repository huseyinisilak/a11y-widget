(function () {
  if (window.__A11Y_WIDGET_LOADED__) return;
  window.__A11Y_WIDGET_LOADED__ = true;

  const scriptEl = document.currentScript;
  const cfg = {
    position: (scriptEl?.dataset?.position || "right").toLowerCase(), // right|left
    lang: (scriptEl?.dataset?.lang || "tr").toLowerCase(),            // tr|en
    color: (scriptEl?.dataset?.color || "#0ea5e9").toString(),
  };

  const baseUrl = new URL(".", scriptEl.src); // widget.js'in bulunduğu klasör
  const urls = {
    uiHtml: new URL("ui.html", baseUrl).toString(),
    applyCss: new URL("apply.css", baseUrl).toString(),
    applyJs: new URL("apply.js", baseUrl).toString(),
  };

  const BTN_CLASS = "a11y-w-btn";
  const FRAME_CLASS = "a11y-w-frame";

  function ensureBodyReady(fn) {
    if (document.body) fn();
    else window.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  function injectCssLink(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.className = BTN_CLASS;
    btn.type = "button";
    btn.style.setProperty("--a11y-accent", cfg.color);

    const label = cfg.lang === "tr" ? "Erişilebilirlik menüsü" : "Accessibility menu";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `A<span aria-hidden="true">11Y</span>`;
    return btn;
  }

  function createFrame() {
    const iframe = document.createElement("iframe");
    iframe.className = FRAME_CLASS;
    iframe.title = cfg.lang === "tr" ? "Erişilebilirlik paneli" : "Accessibility panel";
    iframe.style.display = "none";
    // lazy-load: src ilk açılışta set edilecek
    return iframe;
  }

  function applyBaseStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .${BTN_CLASS} {
        position: fixed;
        bottom: 16px;
        ${cfg.position === "left" ? "left:16px;" : "right:16px;"}
        z-index: 2147483647;
        width: 54px;
        height: 54px;
        border-radius: 999px;
        border: 0;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(0,0,0,.22);
        background: var(--a11y-accent, #0ea5e9);
        color: #fff;
        font: 800 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial;
        letter-spacing: .3px;
      }
      .${BTN_CLASS}:focus-visible{
        outline: 3px solid rgba(255,255,255,.9);
        outline-offset: 3px;
      }

      .${FRAME_CLASS} {
        position: fixed;
        bottom: 84px;
        ${cfg.position === "left" ? "left:16px;" : "right:16px;"}
        z-index: 2147483647;
        width: 340px;
        height: 460px;
        border: 0;
        border-radius: 16px;
        background: transparent;
        box-shadow: 0 14px 40px rgba(0,0,0,.25);
      }

      @media (max-width: 420px) {
        .${FRAME_CLASS} {
          width: calc(100vw - 32px);
          height: 520px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function postToPanel(iframe, message) {
    // Güvenlik notu:
    // Prod ortamda "*" yerine kendi panel origin’inizi kullanın.
    iframe.contentWindow?.postMessage(message, "*");
  }

  function setupMessaging(iframe) {
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "A11Y_REQUEST_INIT") {
        // Panel açılırken config'i gönder
        postToPanel(iframe, {
          type: "A11Y_INIT",
          payload: { lang: cfg.lang, color: cfg.color }
        });
      }

      if (msg.type === "A11Y_CLOSE") {
        iframe.style.display = "none";
        const btn = document.querySelector("." + BTN_CLASS);
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function bootstrap() {
    applyBaseStyles();
    injectCssLink(urls.applyCss);

    // apply.js: sayfaya class/overlay uygulayan motor
    injectScript(urls.applyJs).catch((e) => {
      console.warn("[A11Y] apply.js load failed", e);
    });

    const btn = createButton();
    const iframe = createFrame();

    document.body.appendChild(btn);
    document.body.appendChild(iframe);

    setupMessaging(iframe);

    let panelLoaded = false;

    function openClosePanel() {
      const isOpen = iframe.style.display === "block";
      if (isOpen) {
        iframe.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        return;
      }

      if (!panelLoaded) {
        const u = new URL(urls.uiHtml);
        u.searchParams.set("lang", cfg.lang);
        u.searchParams.set("color", cfg.color);
        iframe.src = u.toString();
        panelLoaded = true;
      }

      iframe.style.display = "block";
      btn.setAttribute("aria-expanded", "true");

      // Panel init istemese bile config yollayalım
      postToPanel(iframe, { type: "A11Y_INIT", payload: { lang: cfg.lang, color: cfg.color } });
    }

    btn.addEventListener("click", openClosePanel);
  }

  ensureBodyReady(bootstrap);
})();
