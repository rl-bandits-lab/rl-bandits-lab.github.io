(function () {
  const LAB = window.LAB, S = window.SITE, MAP = window.MAP, MEMBERS = window.MEMBERS, PUBS = window.PUBLICATIONS, NEWS = window.NEWS;
  const esc = LAB.esc;
  const MON = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  const fmtDate = (d) => { const [y, m] = d.split("-"); return `${MON[+m - 1]} ${y}`; };
  const newsItem = (n) => `<li><time datetime="${n.date}">${fmtDate(n.date)}</time><div>${n.tag ? `<span class="tag ${n.tag}">${n.tag}</span>` : ""}${n.text}</div></li>`;

  const pages = (LAB.pages = {});

  pages.home = (main) => {
    main.innerHTML = `
      <section class="hero wrap">
        <div>
          <h1>${esc(S.lab.name)}</h1>
          <p class="lede">${S.lab.intro}</p>
          <p class="meta">${esc(S.lab.affiliation)} · Led by <a href="people.html#pi">Prof. ${esc(S.pi.name)} (${esc(S.pi.zh)})</a></p>
        </div>
        <img class="hero-logo" src="assets/img/logo.png" alt="REAL lab logo">
      </section>
      <section class="map-section"><div class="wrap" id="map"></div></section>
      <div class="wrap grid-2">
        <section class="section">
          <div class="section-title"><h2>News</h2><a href="news.html">All news →</a></div>
          <ul class="news">${NEWS.slice(0, 8).map(newsItem).join("")}</ul>
        </section>
        <aside class="section">
          <div class="section-title"><h2>Principal Investigator</h2></div>
          <div class="pi-mini">
            <img src="${S.pi.photo}" alt="${esc(S.pi.name)}">
            <div><h3><a href="people.html#pi">${esc(S.pi.name)}</a> <span class="zh">${esc(S.pi.zh)}</span></h3>
              <div class="muted">${esc(S.pi.title)}, ${esc(S.lab.affiliationShort)}</div>
              <div style="font-size:.92rem;margin-top:6px">${esc(S.pi.email)}</div></div>
          </div>
          <div class="section-title" style="margin-top:28px"><h2>Join Us</h2></div>
          <div class="openings">${S.lab.openings.map((p) => `<p>${p}</p>`).join("")}</div>
        </aside>
      </div>`;
    LAB.mountMap(main.querySelector("#map"));
  };

  pages.publications = (main) => {
    const TYPES = [["all", "All"], ["conference", "Conference"], ["journal", "Journal"], ["workshop", "Workshop"], ["preprint", "Preprint"]];
    const state = { q: "", type: "all", group: "year", continent: "", region: "" };
    const h = location.hash.match(/region=([\w-]+)/);
    if (h && LAB.region[h[1]]) state.region = h[1];

    main.innerHTML = `
      <div class="wrap">
        <div class="page-head"><h1>Publications</h1>
          <p>Bold names are lab members. Colored tags place each paper on our <a href="index.html#map">research map</a>; click one to see that region. For the complete list see also <a href="https://scholar.google.com/citations?user=ix38JgoAAAAJ&hl=en">Google Scholar</a>.</p></div>
        <div class="pub-tools">
          <div class="row"><input class="search" type="search" placeholder="Search title, author, venue…" aria-label="Search publications">
            <div class="seg" data-k="group"><button data-v="year" class="on">By year</button><button data-v="region">By map region</button></div>
            <div class="seg" data-k="type">${TYPES.map(([v, t]) => `<button data-v="${v}"${v === "all" ? ' class="on"' : ""}>${t}</button>`).join("")}</div></div>
          <div class="row"><label>Theme</label><div class="chips" data-k="continent">
            <button class="chip on" data-v="">All</button>
            ${MAP.continents.map((c) => `<button class="chip" data-v="${c.id}" style="--c:${c.color}"><span class="dot"></span>${esc(c.name)}</button>`).join("")}</div></div>
          <div class="row region-filter" hidden></div>
        </div>
        <p class="pub-count"></p>
        <div class="pub-list"></div>
      </div>`;

    const list = main.querySelector(".pub-list"), count = main.querySelector(".pub-count"), rf = main.querySelector(".region-filter");

    const pubHtml = (p) => `<li class="pub">
      <div class="side"><span class="badge venue">${esc(p.venue)} ${p.year}</span>
        ${p.award ? `<span class="badge award">${esc(p.award)}</span>` : ""}
        ${(p.regions || []).map((id) => LAB.region[id] && LAB.regionBadge(LAB.region[id])).join("")}</div>
      <div>
        ${p.links?.paper ? `<a class="title" href="${esc(p.links.paper)}">${esc(p.title)}</a>` : `<span class="title">${esc(p.title)}</span>`}
        <div class="authors">${LAB.authorsHtml(p.authors)}${p.equal ? ` <span class="muted">(${esc(p.equal)})</span>` : ""}</div>
        <div class="venue-full">${esc(p.venueFull)}${p.note ? ` (${esc(p.note)})` : ""}${p.extra ? `<br>${esc(p.extra)}` : ""}</div>
        <div class="links"><span class="pid">[${esc(p.id)}]</span>${LAB.pubLinks(p)}</div>
      </div></li>`;

    function render() {
      const q = state.q.toLowerCase();
      const hits = PUBS.filter((p) =>
        (state.type === "all" || p.type === state.type) &&
        (!state.region || (p.regions || []).includes(state.region)) &&
        (!state.continent || (p.regions || []).some((r) => LAB.region[r]?.continent === state.continent)) &&
        (!q || `${p.title} ${p.authors} ${p.venue} ${p.venueFull} ${p.year}`.toLowerCase().includes(q)));

      rf.hidden = !state.region;
      if (state.region) {
        const r = LAB.region[state.region];
        rf.innerHTML = `<label>Region</label><span>${LAB.regionBadge(r)} <button class="chip" data-clear>Clear ×</button></span>`;
        rf.querySelector("[data-clear]").onclick = () => { state.region = ""; history.replaceState(null, "", location.pathname); render(); };
      }
      count.textContent = `${hits.length} publication${hits.length === 1 ? "" : "s"}`;

      const groups = [];
      if (state.group === "year") {
        const by = new Map();
        for (const p of hits) { const k = p.type === "conference" || p.type === "journal" ? p.year : p.type; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }
        const order = [...by.keys()].filter((k) => typeof k === "number").sort((a, b) => b - a)
          .concat(["workshop", "preprint"].filter((k) => by.has(k)));
        const label = { workshop: "Workshop and Demo Papers", preprint: "Submissions and Preprints" };
        for (const k of order) groups.push([label[k] || k, by.get(k)]);
      } else {
        for (const c of MAP.continents) for (const r of MAP.regions.filter((x) => x.continent === c.id)) {
          const ps = hits.filter((p) => (p.regions || []).includes(r.id));
          if (ps.length) groups.push([`${r.name} <small>${esc(c.name)}</small>`, ps]);
        }
        const rest = hits.filter((p) => !(p.regions || []).length);
        if (rest.length) groups.push(["Other <small>not on the map</small>", rest]);
      }
      list.innerHTML = groups.map(([t, ps]) => `<h3 class="group-head">${t} <small>${ps.length}</small></h3><ul class="pubs">${ps.map(pubHtml).join("")}</ul>`).join("")
        || `<p class="muted">No publications match.</p>`;
    }

    main.querySelector(".search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    main.querySelectorAll("[data-k]").forEach((g) => g.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      state[g.dataset.k] = b.dataset.v;
      render();
    }));
    window.addEventListener("hashchange", () => { const m = location.hash.match(/region=([\w-]+)/); state.region = m && LAB.region[m[1]] ? m[1] : ""; render(); });
    render();
  };

  pages.people = (main) => {
    const P = S.pi, LIFE_STEP = 12;
    const nameHtml = (m, text) => m.web ? `<a href="${esc(m.web)}">${text}</a>` : text;
    const card = (m) => {
      const { lead, vet } = LAB.regionsOfMember(m);
      const regs = [...new Set([...lead, ...vet])].map((id) => LAB.region[id]).filter(Boolean);
      return `<div class="person" id="m${m.id}">
        <span class="no">${esc(m.id)}</span>
        <div class="name">${nameHtml(m, `${esc(LAB.displayName(m))}${m.en ? `<span class="zh">${esc(m.zh)}</span>` : ""}`)}</div>
        ${m.topic ? `<div class="line">${esc(m.topic)}</div>` : ""}
        <div class="line muted">${[m.bs && `BS @ ${m.bs}`, m.period].filter(Boolean).map(esc).join(" · ")}</div>
        ${m.note ? `<div class="line muted">${esc(m.note)}</div>` : ""}
        ${regs.length ? `<div class="chips">${regs.map((r) => LAB.regionBadge(r)).join("")}</div>` : ""}
      </div>`;
    };
    const alum = (m) => `<li id="m${m.id}">
      <div><div class="who">${nameHtml(m, `${esc(LAB.displayName(m))}${m.en ? ` <span class="zh">${esc(m.zh)}</span>` : ""}`)}</div>
        <div class="muted" style="font-size:.86rem">${[m.period, m.bs && `BS @ ${m.bs}`].filter(Boolean).map(esc).join(" · ")}</div></div>
      <div>${m.thesis ? `<div class="thesis">${esc(m.thesis)}</div>` : ""}
        ${m.now ? `<div>Now: ${esc(m.now)}</div>` : ""}${m.note ? `<div class="muted">${esc(m.note)}</div>` : ""}</div></li>`;
    const sec = (title, ms, render = card) => ms.length ? `<section class="section"><h2>${title}</h2><div class="people">${ms.map(render).join("")}</div></section>` : "";
    const G = (g) => MEMBERS.filter((m) => m.group === g);
    const fold = (title, body) => `<details class="fold"><summary>${title}</summary><div class="body">${body}</div></details>`;

    const years = [...new Set(MEMBERS.filter((m) => m.ug).map((m) => m.ug))].sort();
    const ug = years.map((y) => `<div class="ug-year"><b>${y}</b><div>${MEMBERS.filter((m) => m.ug === y).map((m) => {
      const after = m.group !== "ug" ? { ms: "now MS in lab", ra: "now RA in lab", phd: "now PhD in lab" }[m.group] : m.now && `now ${m.now}`;
      return `<span class="p" id="${m.group === "ug" ? `m${m.id}` : ""}">${nameHtml(m, `${esc(m.zh)}${m.en ? ` ${esc(m.en)}` : ""}`)}${after ? ` <span class="muted">(${esc(after)})</span>` : ""}</span>`;
    }).join("、 ")}</div></div>`).join("");

    main.innerHTML = `
      <div class="wrap">
        <div class="page-head"><h1>People</h1><p>Tags under each name show the regions of our <a href="index.html#map">research map</a> that person is working on or has published in.</p></div>
        <figure style="margin:0 0 8px"><img src="${S.groupPhoto}" alt="Lab members" style="width:100%;max-height:460px;object-fit:cover;border-radius:3px"></figure>
        <section class="section" id="pi"><h2>Principal Investigator</h2>
          <div class="pi-mini"><img src="${P.photo}" alt="${esc(P.name)}">
            <div><h3>${esc(P.name)} <span class="zh">${esc(P.zh)}</span></h3>
              <div class="muted">${esc(P.title)}, ${esc(S.lab.affiliation)}</div>
              <p style="margin:6px 0 4px;font-size:.95rem">${esc(P.interests)}</p>
              <dl class="pi-info"><dt>Office</dt><dd>${esc(P.office)}</dd><dt>Lab</dt><dd>${esc(S.lab.location.replace(/^Lab:\s*/, ""))}</dd><dt>Email</dt><dd>${esc(P.email)}</dd></dl>
              <div class="linkrow">${P.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join("")}</div></div></div>
          <div class="folds">
            ${fold("Biography", P.bio.map((p) => `<p>${p}</p>`).join(""))}
            ${fold("Honors and Awards", `<ul class="plain">${P.awards.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`)}
            ${fold("Education", `<ul class="plain">${P.education.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`)}
            ${fold("Professional Experience", `<ul class="cv-list">${P.experience.map((e) => `<li><div class="where">${esc(e.where)}</div><div class="what">${e.what}</div></li>`).join("")}</ul>`)}
            ${fold("Selected Talks", `<ul class="cv-list">${S.talks.map((t) => `<li><div class="where">${t.url ? `<a href="${esc(t.url)}">${esc(t.title)}</a>` : esc(t.title)}</div>${t.where.map((w) => `<div class="what">${esc(w)}</div>`).join("")}</li>`).join("")}</ul>
              <p class="muted" style="margin:10px 0 0">More recent talks are listed in <a href="news.html">News</a>.</p>`)}
          </div>
        </section>
        ${sec("PhD Students", G("phd"))}
        ${sec("MS Students", G("ms"))}
        ${sec("Research Assistants", G("ra"))}
        <section class="section"><h2>Undergraduate Members</h2>${ug}</section>
        <section class="section"><h2>Alumni</h2>
          <h3 style="margin:8px 0">PhD</h3><ul class="alumni">${G("alumni-phd").map(alum).join("")}</ul>
          <h3 style="margin:24px 0 8px">Research Assistants</h3><ul class="alumni">${G("alumni-ra").map(alum).join("")}</ul>
          <h3 style="margin:24px 0 8px">MS</h3><ul class="alumni">${G("alumni-ms").slice().reverse().map(alum).join("")}</ul>
        </section>
        <section class="section"><h2>Lab Life</h2><div class="life"></div><button class="more" hidden></button></section>
      </div>`;

    const life = main.querySelector(".life"), more = main.querySelector(".more");
    let shown = 0;
    const showLife = () => {
      life.insertAdjacentHTML("beforeend", S.life.slice(shown, shown + LIFE_STEP).map((x) =>
        `<figure><img src="${x.img}" alt="${esc(x.caption)}" loading="lazy"><figcaption><b>${esc(x.date)}</b> · ${esc(x.caption)}</figcaption></figure>`).join(""));
      shown = Math.min(shown + LIFE_STEP, S.life.length);
      more.hidden = shown >= S.life.length;
      more.textContent = `Show more (${S.life.length - shown})`;
    };
    more.addEventListener("click", showLife);
    showLife();
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  };

  pages.teaching = (main) => {
    const course = (c, i) => {
      const hasReading = c.schedule.some((r) => r.reading);
      return `<details class="fold"${i === 0 ? " open" : ""}><summary><span class="course-title">${esc(c.code)} ${esc(c.title)}</span><span class="muted">${esc(c.term)}</span></summary>
        <div class="body">
          <p class="muted">Instructor: ${esc(S.pi.name)} · ${esc(S.pi.email)}</p>
          <div class="grid-2" style="gap:24px">
            <div><h3 style="margin-bottom:6px">References</h3><ul class="plain" style="font-size:.92rem">${c.references.map((r) => `<li>${esc(r).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>')}</li>`).join("")}</ul></div>
            <div><h3 style="margin-bottom:6px">Grading</h3><ul class="plain" style="font-size:.92rem">${c.grading.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
          </div>
          <h3 style="margin:18px 0 6px">Schedule</h3>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Week</th><th>Lec.</th><th>Date</th><th>Topic</th>${hasReading ? "<th>Reading</th>" : ""}<th>Slides</th></tr></thead><tbody>
            ${c.schedule.map((r) => `<tr><td>${esc(r.week)}</td><td>${esc(r.lecture)}</td><td>${esc(r.date)}</td><td>${esc(r.topic)}</td>${hasReading ? `<td>${esc(r.reading || "")}</td>` : ""}<td>${r.slides.map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(", ")}</td></tr>`).join("")}
          </tbody></table></div>
        </div></details>`;
    };
    main.innerHTML = `
      <div class="wrap">
        <div class="page-head"><h1>Teaching</h1><p>Courses taught by Prof. ${esc(S.pi.name)} at NYCU, tutorials, and the lab's research orientation material.</p></div>
        <section class="section"><h2>Courses</h2>${window.COURSES.map(course).join("")}</section>
        <section class="section"><h2>Tutorials and Mini-Courses</h2>${S.tutorials.map((t) => `
          <h3>${esc(t.title)}</h3><p class="muted" style="margin:2px 0 8px">${esc(t.event)} · Organizers: ${esc(t.organizers)}</p>
          <p style="font-size:.95rem">${esc(t.abstract)}</p><div class="linkrow">${t.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join("")}</div>`).join("")}</section>
        <section class="section"><h2>Research 101</h2><p>Material from our lab orientation, held in Summer 2019.</p>
          <ol class="plain">${S.orientation.map((o) => `<li><a href="${esc(o.url)}">${esc(o.title)}</a></li>`).join("")}</ol></section>
      </div>`;
  };

  pages.news = (main) => {
    const years = [...new Set(NEWS.map((n) => n.date.slice(0, 4)))];
    main.innerHTML = `
      <div class="wrap">
        <div class="page-head"><h1>News</h1></div>
        ${years.map((y) => `<h2 class="year-head">${y}</h2><ul class="news">${NEWS.filter((n) => n.date.startsWith(y)).map(newsItem).join("")}</ul>`).join("")}
      </div>`;
  };
})();
