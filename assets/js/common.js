(function () {
  const S = window.SITE, MAP = window.MAP, MEMBERS = window.MEMBERS, PUBS = window.PUBLICATIONS;
  const LAB = (window.LAB = {});

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  LAB.esc = esc;

  LAB.continent = Object.fromEntries(MAP.continents.map((c) => [c.id, c]));
  LAB.region = Object.fromEntries(MAP.regions.map((r) => [r.id, r]));
  LAB.member = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));
  const byName = {};
  for (const m of MEMBERS) for (const n of [m.en, ...(m.aliases || [])]) if (n) byName[norm(n)] = m;
  const PI_KEY = norm(S.pi.name);

  LAB.isCurrent = (m) => !m.group.startsWith("alumni");
  LAB.displayName = (m) => m.en || m.zh;
  LAB.memberUrl = (m) => `people.html#m${m.id}`;
  LAB.regionColor = (r) => LAB.continent[r.continent].color;
  LAB.status = (p) => (p >= 100 ? "conquered" : p > 0 ? "active" : "unexplored");
  LAB.statusLabel = { conquered: "Conquered", active: "In progress", unexplored: "Unexplored" };

  const splitAuthors = (s) => String(s).split(/(,\s*and\s+|,\s*|\s+and\s+)/);
  const clean = (n) => n.replace(/\*/g, "").trim();
  LAB.authorMembers = (s) => splitAuthors(s).filter((_, i) => i % 2 === 0).map((n) => byName[norm(clean(n))]).filter(Boolean);

  LAB.authorsHtml = (s, { link = true } = {}) =>
    splitAuthors(s).map((tok, i) => {
      if (i % 2) return esc(tok);
      const key = norm(clean(tok));
      if (key === PI_KEY) return `<b>${esc(tok)}</b>`;
      const m = byName[key];
      if (!m) return esc(tok);
      return link ? `<b><a href="${LAB.memberUrl(m)}">${esc(tok)}</a></b>` : `<b>${esc(tok)}</b>`;
    }).join("");

  LAB.pubsIn = (regionId) => PUBS.filter((p) => (p.regions || []).includes(regionId));
  LAB.leadsOf = (regionId) => MEMBERS.filter((m) => LAB.isCurrent(m) && (m.focus || []).includes(regionId));
  LAB.veteransOf = (regionId) => {
    const count = new Map();
    for (const p of LAB.pubsIn(regionId)) for (const m of new Set(LAB.authorMembers(p.authors))) count.set(m, (count.get(m) || 0) + 1);
    return [...count].map(([member, n]) => ({ member, n })).sort((a, b) => b.n - a.n || LAB.displayName(a.member).localeCompare(LAB.displayName(b.member)));
  };
  LAB.regionsOfMember = (m) => {
    const lead = new Set(m.focus || []);
    const vet = new Set();
    for (const p of PUBS) if (LAB.authorMembers(p.authors).includes(m)) (p.regions || []).forEach((r) => vet.add(r));
    return { lead, vet };
  };

  LAB.bar = (p, color) => `<div class="bar" style="--p:${+p || 0};--c:${color || "var(--accent)"}"><i></i></div>`;
  LAB.regionBadge = (r, href) =>
    `<a class="badge region" style="--c:${LAB.regionColor(r)}" href="${href || `index.html#region=${r.id}`}" title="${esc(LAB.continent[r.continent].name)}">${esc(r.name)}</a>`;
  LAB.personTag = (m, extra = "") =>
    `<a class="person-tag${LAB.isCurrent(m) ? "" : " alum"}" href="${LAB.memberUrl(m)}">${esc(LAB.displayName(m))}${m.en ? ` <small class="zh">${esc(m.zh)}</small>` : ""}${extra}</a>`;
  LAB.pubLinks = (p) => {
    const L = p.links || {};
    const names = { paper: "Paper", project: "Project page", code: "Code", video: "Video" };
    return Object.entries(L).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}">${esc(names[k] || k)}</a>`).join("");
  };

  const NAV = [
    ["index.html", "Home", "home"],
    ["news.html", "News", "news"],
    ["publications.html", "Publications", "publications"],
    ["people.html", "People", "people"],
    ["teaching.html", "Teaching", "teaching"]
  ];
  LAB.chrome = () => {
    const page = document.body.dataset.page;
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `<div class="wrap">
      <a class="brand" href="index.html"><b>${esc(S.lab.short)}</b><span>${esc(S.lab.affiliationShort)}</span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav">${NAV.map(([h, t, k]) => `<a href="${h}"${k === page ? ' class="on"' : ""}>${t}</a>`).join("")}</nav>
    </div>`;
    document.body.prepend(header);
    const btn = header.querySelector(".nav-toggle"), nav = header.querySelector(".nav");
    btn.addEventListener("click", () => btn.setAttribute("aria-expanded", nav.classList.toggle("open")));

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `<div class="wrap">
      <div><b>${esc(S.lab.name)}</b><br>${esc(S.lab.affiliation)}<br>${esc(S.lab.location)}</div>
      <div>Contact: ${esc(S.pi.email)}<br><a href="${esc(S.lab.github)}">GitHub</a> · <a href="people.html#pi">Prof. ${esc(S.pi.name)}</a></div>
    </div>`;
    document.body.append(footer);
  };

  LAB.validate = () => {
    const errs = [];
    const dup = (arr, what) => {
      const seen = new Set();
      for (const x of arr) { if (seen.has(x.id)) errs.push(`Duplicate ${what} id "${x.id}"`); seen.add(x.id); }
    };
    dup(MAP.regions, "region"); dup(MEMBERS, "member"); dup(PUBS, "publication");
    for (const r of MAP.regions) if (!LAB.continent[r.continent]) errs.push(`Region "${r.id}" has unknown continent "${r.continent}"`);
    for (const p of PUBS) for (const r of p.regions || []) if (!LAB.region[r]) errs.push(`Publication ${p.id} has unknown region "${r}"`);
    for (const m of MEMBERS) for (const r of m.focus || []) if (!LAB.region[r]) errs.push(`Member ${m.id} (${m.zh}) has unknown focus region "${r}"`);
    for (const r of MAP.regions) if (!(r.progress >= 0 && r.progress <= 100)) errs.push(`Region "${r.id}" progress must be 0–100`);
    if (LAB.regionOutside) for (const r of LAB.regionOutside()) errs.push(`Region "${r.id}" marker (x:${r.x}, y:${r.y}) is outside its continent — move it inward`);
    errs.forEach((e) => console.warn("[site data]", e));
    const local = location.protocol === "file:" || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
    if (errs.length && local) {
      const box = document.createElement("div");
      box.className = "wrap";
      box.innerHTML = `<div class="data-warn"><b>Data check (only visible when previewing locally):</b><ul>${errs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
      document.querySelector("main")?.prepend(box);
    }
    return errs;
  };

  LAB.boot = (render) => {
    LAB.chrome();
    render(document.querySelector("main"));
    LAB.validate();
  };
})();
