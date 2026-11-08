(function () {
  const MAP = window.MAP, LAB = window.LAB, MEMBERS = window.MEMBERS;
  const W = 1700, H = 1040, NS = "http://www.w3.org/2000/svg";
  const esc = LAB.esc;
  const INK = "#2a1c08", PAPER = "#f3ecdc", FLAG = "#9b2d20";

  function rng(seed) {
    let s = (seed * 2654435761) % 4294967296 || 1;
    return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  }

  function coastline({ cx, cy, rx, ry, seed = 1 }, n = 120) {
    const r = rng(seed);
    const harm = [2, 3, 4, 5, 7, 9, 11, 13].map((k, i) => ({ k, a: (i < 4 ? 0.07 : 0.018) * (0.4 + r()), p: r() * 6.283 }));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const m = 1 + harm.reduce((s, h) => s + h.a * Math.sin(h.k * t + h.p), 0);
      pts.push([cx + rx * m * Math.cos(t), cy + ry * m * Math.sin(t)]);
    }
    return pts;
  }

  function smooth(pts) {
    const n = pts.length, P = (i) => pts[(i + n) % n];
    let d = `M${P(0)[0].toFixed(1)},${P(0)[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + "Z";
  }

  const inside = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  function islands(r) {
    const k = r.islands || 3, rnd = rng(r.id.length * 31 + k), out = [];
    for (let i = 0; i < k; i++) {
      const dx = (i - (k - 1) / 2) * 62 + (rnd() - 0.5) * 18, dy = (i % 2 ? 14 : -10) + (rnd() - 0.5) * 10;
      const s = 0.75 + rnd() * 0.5;
      out.push(coastline({ cx: r.x + dx, cy: r.y - 26 + dy, rx: 26 * s, ry: 15 * s, seed: i * 7 + k }, 48));
    }
    return out;
  }

  const shapes = {};
  for (const c of MAP.continents) if (!c.archipelago) shapes[c.id] = coastline(c);
  LAB.regionOutside = () => MAP.regions.filter((r) => shapes[r.continent] && !inside([r.x, r.y], shapes[r.continent]));

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  const fillFor = (r) => mix(PAPER, LAB.regionColor(r), r.progress > 0 ? 0.22 + 0.62 * (r.progress / 100) : 0.1);

  function wrapLabel(s, max = 17) {
    const words = s.split(" "), lines = [""];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if (cur && (cur + " " + w).length > max) lines.push(w); else lines[lines.length - 1] = cur ? cur + " " + w : w;
    }
    return lines;
  }

  const SHIELD = "M-9,-11H9V1C9,7 4,10 0,12C-4,10 -9,7 -9,1Z";

  function compass(x, y) {
    const pts = (r1, r2, n, rot = 0) => Array.from({ length: n * 2 }, (_, i) => {
      const a = rot + (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? r2 : r1;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return `<g class="compass" opacity=".85" pointer-events="none">
      <circle cx="${x}" cy="${y}" r="62" fill="none" stroke="#7b6a4c" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="55" fill="none" stroke="#7b6a4c" stroke-width=".6" stroke-dasharray="2 3"/>
      <polygon points="${pts(48, 9, 4, Math.PI / 4)}" fill="#c9b892" stroke="#5a4a30" stroke-width=".8"/>
      <polygon points="${pts(72, 11, 4)}" fill="#3e5f66" stroke="#2a1c08" stroke-width=".8"/>
      <circle cx="${x}" cy="${y}" r="6" fill="#f3ecdc" stroke="#2a1c08"/>
      <text x="${x}" y="${y - 80}" text-anchor="middle" font-family="IM Fell English, serif" font-size="18" fill="#2a1c08">N</text>
    </g>`;
  }

  function mountains(rg) {
    let s = "";
    const n = Math.floor((rg.y2 - rg.y1) / 26);
    for (let i = 0; i <= n; i++) {
      const y = rg.y1 + i * 26, x = rg.x + (i % 2 ? 9 : -9), h = 16 + ((i * 7) % 5) * 2;
      s += `<path d="M${x - 13},${y + 8} L${x},${y + 8 - h} L${x + 13},${y + 8}" fill="#e8dcc0" stroke="#6b5a3c" stroke-width="1.1"/>
            <path d="M${x},${y + 8 - h} L${x + 4},${y + 8}" stroke="#6b5a3c" stroke-width=".8" fill="none"/>`;
    }
    const mid = (rg.y1 + rg.y2) / 2, lx = rg.x < W / 2 ? rg.x + 38 : rg.x - 38;
    return `<g pointer-events="none">${s}<text class="range-label" transform="translate(${lx},${mid}) rotate(${rg.x < W / 2 ? -90 : 90})" text-anchor="middle">${esc(rg.name)}</text></g>`;
  }

  function marker(r) {
    const t = MAP.types[r.type] || MAP.types.core, st = LAB.status(r.progress);
    const lines = r.label ? r.label.split("\n") : wrapLabel(r.name);
    const ly = 32, barY = ly + (lines.length - 1) * 19 + 10;
    const flag = st === "conquered"
      ? `<line x1="0" y1="-11" x2="0" y2="-36" stroke="${INK}" stroke-width="1.6"/><path d="M0,-36 L20,-30 L0,-23 Z" fill="${FLAG}" stroke="${INK}" stroke-width=".8"/>`
      : "";
    return `<g class="marker" data-region="${r.id}" transform="translate(${r.x},${r.y})" tabindex="0" role="button" aria-label="${esc(r.name)}, ${r.progress}% — ${LAB.statusLabel[st]}">
      ${flag}
      <path d="${SHIELD}" fill="${t.color}" stroke="${INK}" stroke-width="1.1"/>
      <path d="M-5,-6H5V0.5C5,4 2.5,6 0,7C-2.5,6 -5,4 -5,0.5Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".9"/>
      ${lines.map((l, i) => `<text class="rlabel" y="${ly + i * 19}">${esc(l)}</text>`).join("")}
      <rect x="-30" y="${barY}" width="60" height="5" rx="2.5" fill="rgba(42,28,8,.18)"/>
      <rect x="-30" y="${barY}" width="${(60 * r.progress) / 100}" height="5" rx="2.5" fill="${INK}"/>
    </g>`;
  }

  function buildSvg() {
    let defs = `<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(90,74,48,.22)" stroke-width="1.2"/></pattern>
      <pattern id="stipple" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r=".7" fill="rgba(60,40,10,.12)"/><circle cx="6.5" cy="6" r=".5" fill="rgba(60,40,10,.09)"/></pattern>
      <pattern id="waves" width="46" height="22" patternUnits="userSpaceOnUse">
        <path d="M2,12 q5,-5 10,0 t10,0" fill="none" stroke="rgba(76,107,114,.13)" stroke-width="1"/></pattern>`;
    let sea = `<rect width="${W}" height="${H}" fill="#dfe7e6"/><rect width="${W}" height="${H}" fill="url(#waves)"/>`;
    for (let x = 100; x < W; x += 200) sea += `<path class="grat" d="M${x},0 Q${x + (x - W / 2) * 0.04},${H / 2} ${x},${H}"/>`;
    for (let y = 120; y < H; y += 160) sea += `<path class="grat" d="M0,${y} Q${W / 2},${y + 14} ${W},${y}"/>`;

    let coasts = "", land = "", borders = "", labels = "";
    for (const c of MAP.continents) {
      const regions = MAP.regions.filter((r) => r.continent === c.id);
      if (c.archipelago) {
        for (const r of regions) {
          const isl = islands(r);
          for (const pts of isl) {
            const d = smooth(pts);
            coasts += `<path class="coast-2" d="${d}"/><path class="coast-1" d="${d}"/>`;
            land += `<path class="cell" data-region="${r.id}" d="${d}" fill="${fillFor(r)}"/>`
              + (r.progress === 0 ? `<path d="${d}" fill="url(#hatch)" pointer-events="none"/>` : "")
              + `<path class="coast" d="${d}"/>`;
          }
        }
        continue;
      }
      const d = smooth(shapes[c.id]);
      defs += `<clipPath id="clip-${c.id}"><path d="${d}"/></clipPath>`;
      coasts += `<path class="coast-2" d="${d}"/><path class="coast-1" d="${d}"/>`;

      const pad = 60, xs = shapes[c.id].map((p) => p[0]), ys = shapes[c.id].map((p) => p[1]);
      const bounds = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
      let cells = "";
      if (regions.length === 1) {
        const r = regions[0];
        cells = `<path class="cell" data-region="${r.id}" d="${d}" fill="${fillFor(r)}"/>` + (r.progress === 0 ? `<path d="${d}" fill="url(#hatch)" pointer-events="none"/>` : "");
      } else if (regions.length > 1) {
        const vor = window.d3.Delaunay.from(regions.map((r) => [r.x, r.y])).voronoi(bounds);
        regions.forEach((r, i) => {
          const cd = vor.renderCell(i);
          cells += `<path class="cell" data-region="${r.id}" d="${cd}" fill="${fillFor(r)}"/>`;
          if (r.progress === 0) cells += `<path d="${cd}" fill="url(#hatch)" pointer-events="none"/>`;
          borders += `<path class="cell-border" d="${cd}" clip-path="url(#clip-${c.id})"/>`;
        });
      }
      land += `<g clip-path="url(#clip-${c.id})">${cells}<path d="${d}" fill="url(#stipple)" pointer-events="none"/></g>`;
      borders += `<path class="coast" d="${d}"/>`;
      if (!c.island) {
        labels += `<text class="clabel" x="${c.labelX ?? c.cx}" y="${c.labelY ?? c.cy + 24}">${esc(c.label || c.name)}</text>`;
      }
    }

    const islandLabels = MAP.continents.filter((c) => c.island && !MAP.regions.some((r) => r.continent === c.id && r.name === c.name)).map((c) =>
      `<text class="ctheme" x="${c.cx}" y="${c.cy - c.ry - 12}">${esc(c.name)}</text>`).join("");
    const seaLabels = MAP.seas.map((s) => `<text class="sea" x="${s.x}" y="${s.y}">${esc(s.name)}</text>`).join("");
    const routes = MAP.routes.map((rt, i) =>
      `<path id="route-${i}" class="route" d="${rt.d}"/><text class="route-label" dy="-6"><textPath href="#route-${i}" startOffset="50%" text-anchor="middle">${esc(rt.name)}</textPath></text>`).join("");
    const ranges = (MAP.ranges || []).map(mountains).join("");
    const markers = MAP.regions.map(marker).join("");
    const frame = `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#7b6a4c" stroke-width="1.2"/>
                   <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#7b6a4c" stroke-width=".5"/>`;

    return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img" aria-label="${esc(MAP.title)}">
      <defs>${defs}</defs>${sea}${coasts}${routes}${ranges}${compass(MAP.compass?.x ?? W / 2, MAP.compass?.y ?? H / 2)}${seaLabels}
      <g class="land">${land}</g>${borders}
      <g class="labels" pointer-events="none">${labels}${islandLabels}</g>
      <g class="sel-layer"></g>
      <g class="markers">${markers}</g>${frame}
    </svg>`;
  }

  function panelHtml(r) {
    const c = LAB.continent[r.continent], t = MAP.types[r.type], st = LAB.status(r.progress);
    const leads = LAB.leadsOf(r.id), vets = LAB.veteransOf(r.id), pubs = LAB.pubsIn(r.id);
    const vetTitle = st === "conquered" ? "Conquered by" : "Veterans — lab authors in this region";
    return `<div class="ph">
        <div class="kicker">${esc(c.name)}</div>
        <h3>${esc(r.name)}</h3>
        <span class="badge" style="background:${t.color};color:#fff">${esc(t.label)}</span>
        <span class="status ${st}" style="margin-left:8px">${LAB.statusLabel[st]}</span>
        <button class="close" aria-label="Close">×</button>
      </div>
      <div class="pb">
        <div class="bar-label"><span>Progress</span><span>${r.progress}%</span></div>
        ${LAB.bar(r.progress, LAB.regionColor(r))}
        <p class="desc" style="margin-top:12px">${esc(r.desc || "")}</p>
        <h4>Leading the campaign</h4>
        ${leads.length ? `<div class="people-inline">${leads.map((m) => LAB.personTag(m)).join("")}</div>`
          : `<p class="empty-note">${st === "conquered" ? "Campaign complete." : "Nobody is assigned yet — open for new students."}</p>`}
        <h4>${vetTitle}</h4>
        ${vets.length ? `<div class="people-inline">${vets.map((v) => LAB.personTag(v.member, ` <small>×${v.n}</small>`)).join("")}</div>`
          : `<p class="empty-note">No published work yet.</p>`}
        <h4>Publications (${pubs.length})</h4>
        ${pubs.length ? `<ul class="panel-pubs">${pubs.map((p) => `<li>
            ${p.links?.paper ? `<a class="t" href="${esc(p.links.paper)}">${esc(p.title)}</a>` : `<span class="t">${esc(p.title)}</span>`}
            <div class="a">${LAB.authorsHtml(p.authors, { link: false })}</div>
            <div class="v">${esc(p.venue)} ${p.year}${p.award ? ` · ${esc(p.award)}` : ""}${p.note && /Oral|Spotlight/.test(p.note) ? ` · ${esc(p.note.split(";")[0])}` : ""}</div>
          </li>`).join("")}</ul>
          <p style="margin:10px 0 0"><a href="publications.html#region=${r.id}">View in Publications →</a></p>`
          : `<p class="empty-note">Uncharted territory.</p>`}
      </div>`;
  }

  LAB.mountMap = (root) => {
    const regions = MAP.regions;
    const onMap = new Set(window.PUBLICATIONS.filter((p) => (p.regions || []).length).map((p) => p.id));
    const conquered = regions.filter((r) => r.progress >= 100).length;
    const charted = regions.filter((r) => r.progress > 0).length;
    const campaigns = regions.filter((r) => LAB.leadsOf(r.id).length).length;

    const involved = MEMBERS.filter((m) => { const x = LAB.regionsOfMember(m); return x.lead.size || x.vet.size; });
    const opt = (m) => `<option value="${m.id}">${esc(LAB.displayName(m))}${m.en ? ` ${esc(m.zh)}` : ""}</option>`;
    const typeSw = Object.values(MAP.types).map((t) => `<span class="sw"><svg viewBox="-10 -12 20 25"><path d="${SHIELD}" fill="${t.color}" stroke="${INK}"/></svg>${esc(t.label)}</span>`).join("");

    root.innerHTML = `
      <div class="map-head">
        <div>
          <h2>${esc(MAP.title)}</h2>
          <p>Our research, drawn as territory. Each region is a topic; its shade and bar show how far the lab has advanced. Click a region to see the papers, who is leading the campaign, and the lab's experts.</p>
        </div>
        <div class="map-stats">
          <div><b>${charted}/${regions.length}</b><span>Regions charted</span></div>
          <div><b>${campaigns}</b><span>Active campaigns</span></div>
          <div><b>${conquered}</b><span>Conquered</span></div>
          <div><b>${onMap.size}</b><span>Papers on map</span></div>
        </div>
      </div>
      <div class="map-toolbar">
        <div class="map-legend">${typeSw}<span class="sep"></span>
          <span class="sw"><svg viewBox="0 0 12 14"><rect y="3" width="12" height="9" fill="url(#lg-hatch)" stroke="#9c8a66"/><defs><pattern id="lg-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="3" stroke="#9c8a66"/></pattern></defs></svg>Unexplored</span>
          <span class="sw"><svg viewBox="0 0 14 16"><line x1="2" y1="1" x2="2" y2="15" stroke="${INK}" stroke-width="1.4"/><path d="M2,1 L13,4.5 L2,8Z" fill="${FLAG}"/></svg>Conquered</span>
        </div>
        <select aria-label="Highlight a member's territory">
          <option value="">Highlight a member's territory…</option>
          <optgroup label="Current members">${involved.filter(LAB.isCurrent).map(opt).join("")}</optgroup>
          <optgroup label="Alumni">${involved.filter((m) => !LAB.isCurrent(m)).map(opt).join("")}</optgroup>
        </select>
      </div>
      <div class="map-frame">
        <div class="map-scroll">${buildSvg()}</div>
        <aside class="map-panel" aria-live="polite"></aside>
      </div>
      <div class="map-hint"><span>Shade = progress · Shield = region type · Bar under each label = progress</span><span><a href="publications.html">Browse papers by region →</a></span></div>
      <div class="cont-progress">${MAP.continents.map((c) => {
        const rs = regions.filter((r) => r.continent === c.id);
        const avg = Math.round(rs.reduce((s, r) => s + r.progress, 0) / (rs.length || 1));
        return `<div><div class="bar-label"><span class="n" style="color:${c.color}">${esc(c.name)}</span><span>${avg}%</span></div>${LAB.bar(avg, c.color)}</div>`;
      }).join("")}</div>`;

    const svg = root.querySelector(".map-svg"), panel = root.querySelector(".map-panel"), sel = root.querySelector("select");
    const selLayer = svg.querySelector(".sel-layer");
    let current = null;

    function open(id, push = true) {
      const r = LAB.region[id];
      if (!r) return;
      current = id;
      svg.querySelectorAll(".cell").forEach((el) => el.classList.toggle("sel", el.dataset.region === id));
      selLayer.innerHTML = [...svg.querySelectorAll(`.cell[data-region="${id}"]`)].map((el) => {
        const clip = el.closest("g[clip-path]")?.getAttribute("clip-path");
        return `<path class="sel-outline" d="${el.getAttribute("d")}"${clip ? ` clip-path="${clip}"` : ""}/>`;
      }).join("");
      panel.innerHTML = panelHtml(r);
      panel.classList.add("open");
      panel.querySelector(".close").addEventListener("click", close);
      if (push) history.replaceState(null, "", `#region=${id}`);
      if (window.matchMedia("(max-width: 860px)").matches) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function close() {
      current = null;
      panel.classList.remove("open");
      selLayer.innerHTML = "";
      svg.querySelectorAll(".cell.sel").forEach((el) => el.classList.remove("sel"));
      history.replaceState(null, "", location.pathname + location.search);
    }

    svg.addEventListener("click", (e) => {
      const el = e.target.closest("[data-region]");
      if (el) open(el.dataset.region); else if (current) close();
    });
    svg.addEventListener("keydown", (e) => {
      const el = e.target.closest(".marker");
      if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(el.dataset.region); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) close(); });

    sel.addEventListener("change", () => {
      const m = LAB.member[sel.value];
      const hit = m ? (() => { const x = LAB.regionsOfMember(m); return new Set([...x.lead, ...x.vet]); })() : null;
      svg.querySelectorAll(".cell, .marker").forEach((el) => el.classList.toggle("dim", !!hit && !hit.has(el.dataset.region)));
    });

    const fromHash = () => { const m = location.hash.match(/region=([\w-]+)/); if (m) open(m[1], false); };
    window.addEventListener("hashchange", fromHash);
    fromHash();
  };
})();
