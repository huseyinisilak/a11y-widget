
(function () {
  const KEY = "__a11y_widget_prefs__";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }

  window.A11YStorage = { load, save, KEY };
})();

(function () {
  const KEY = "__a11y_widget_prefs__";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }

  window.A11YStorage = { load, save, KEY };
})();

