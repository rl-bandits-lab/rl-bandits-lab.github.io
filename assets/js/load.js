(function () {
  const DATA = { SITE: "site", MAP: "map", MEMBERS: "members", PUBLICATIONS: "publications", NEWS: "news", COURSES: "teaching" };
  const SCRIPTS = ["assets/vendor/d3-delaunay.min.js", "assets/js/common.js", "assets/js/map.js", "assets/js/pages.js"];

  const script = (src) => new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error(`Could not load ${src}`));
    document.head.append(s);
  });

  const fail = (html) => {
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    document.querySelector("main").innerHTML = `<div class="wrap"><div class="data-warn" style="margin-top:32px">${html(esc)}</div></div>`;
  };

  if (location.protocol === "file:") {
    fail(() => `<b>This page needs a local web server to preview.</b>
      <p>The site reads its content from <code>data/*.yml</code>, which browsers block on <code>file://</code> pages.</p>
      <p>macOS: double-click <code>preview.command</code> in this folder.<br>
      Or in a terminal, inside this folder: <code>python3 -m http.server 8000</code>, then open <a href="http://localhost:8000/">http://localhost:8000/</a>.</p>`);
    return;
  }

  script("assets/vendor/js-yaml.min.js")
    .then(() => Promise.all(Object.entries(DATA).map(async ([global, file]) => {
      const path = `data/${file}.yml`;
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      try { window[global] = window.jsyaml.load(await res.text()); }
      catch (e) { e.file = path; throw e; }
    })))
    .then(() => SCRIPTS.reduce((p, src) => p.then(() => script(src)), Promise.resolve()))
    .then(() => window.LAB.boot(window.LAB.pages[document.body.dataset.page]))
    .catch((e) => {
      console.error(e);
      fail((esc) => `<b>${e.file ? `Syntax error in <code>${esc(e.file)}</code>` : "The page could not be loaded"}</b>
        <pre style="white-space:pre-wrap;margin:8px 0 0">${esc(e.message)}</pre>`);
    });
})();
