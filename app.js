/* honNKi - minimal app.js (public) */
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);

  const escapeHtml = (s) => String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  };

  async function fetchText(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed: ' + path);
    return (await res.text()).trim();
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch failed: ${path}`);
    return await res.json();
  }

  function setYear() {
    const y = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = String(y));
  }

  
  // --------- Sparkles (urban night) ----------
  function initSparkles(){
    const canvas = document.getElementById("sparkles");
    if (!canvas) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w=0,h=0,dpr=1,particles=[];
    const rand = (a,b)=>a+Math.random()*(b-a);

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const count = Math.round(Math.min(90, Math.max(40, (w*h)/25000)));
      particles = Array.from({length:count}).map(()=>({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: rand(-0.06,0.06),
        vy: rand(-0.03,0.09),
        r: rand(0.6, 1.8),
        a: rand(0.15, 0.55),
        t: rand(0, Math.PI*2),
        s: rand(0.008,0.02)
      }));
    }

    function step(){
      if (reduce) { drawStatic(); return; }
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles){
        p.x += p.vx; p.y += p.vy;
        p.t += p.s;
        if (p.x < -20) p.x = w+20;
        if (p.x > w+20) p.x = -20;
        if (p.y < -20) p.y = h+20;
        if (p.y > h+20) p.y = -20;

        const tw = 0.5 + 0.5*Math.sin(p.t);
        const a = p.a * (0.5 + 0.8*tw);
        const r = p.r * (0.8 + 0.7*tw);

        // soft glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r*10);
        g.addColorStop(0, `rgba(109,247,255,${a})`);
        g.addColorStop(0.45, `rgba(184,135,255,${a*0.55})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r*10, 0, Math.PI*2);
        ctx.fill();

        // tiny star core
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9,a*1.4)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      requestAnimationFrame(step);
    }

    function drawStatic(){
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles){
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*10);
        g.addColorStop(0, `rgba(109,247,255,${p.a*0.6})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r*10, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    resize();
    window.addEventListener("resize", resize, { passive:true });
    requestAnimationFrame(step);
  }

// --------- Home ----------
  function renderMiniItem(el, title, meta, href) {
    el.innerHTML = `
      <a class="miniItem" href="${href}">
        <div class="miniItem__title">${escapeHtml(title)}</div>
        <div class="miniItem__meta">${escapeHtml(meta)}</div>
      </a>`;
  }

  async function pageHome() {
    const postBox = $("#homeLatestPost");
    const videoBox = $("#homeLatestVideo");
    try {
      const posts = await fetchJson("posts.json");
      postBox?.setAttribute("aria-busy", "false");
      if (Array.isArray(posts) && posts.length) {
        const p = posts[0];
        renderMiniItem(postBox, p.title || "", fmtDate(p.date), `post.html?slug=${encodeURIComponent(p.slug)}`);
      } else postBox.innerHTML = `<div class="muted">No items yet</div>`;
    } catch {
      if (postBox) postBox.innerHTML = `<div class="muted">Failed to load.</div>`;
    }
  }

  // --------- Blog index ----------
  function postCard(p) {
    const href = `post.html?slug=${encodeURIComponent(p.slug)}`;
    const tags = Array.isArray(p.tags) ? p.tags.slice(0, 5) : [];
    const tagHtml = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    return `
      <article class="card card--post">
        <a class="card__body" href="${href}">
          <div class="kicker">${escapeHtml(fmtDate(p.date))}</div>
          <h2 class="card__title">${escapeHtml(p.title || "")}</h2>
          <p class="card__text">${escapeHtml(p.excerpt || "")}</p>
          <div class="tagRow">${tagHtml}</div>
        </a>
      </article>`;
  }

  async function pageBlogIndex() {
    const grid = $("#postsAll");
    const q = $("#q");
    if (!grid) return;
    try {
      const posts = await fetchJson("posts.json");
      const all = Array.isArray(posts) ? posts : [];
      grid.setAttribute("aria-busy", "false");

      const render = () => {
        const term = (q?.value || "").trim().toLowerCase();
        const filtered = !term ? all : all.filter(p => {
          const blob = `${p.title||""}\n${p.excerpt||""}\n${(p.tags||[]).join(" ")}`.toLowerCase();
          return blob.includes(term);
        });
        grid.innerHTML = filtered.map(postCard).join("") || `<div class="muted">Not found.</div>`;
      };

      q?.addEventListener("input", render);
      render();
    } catch {
      grid.innerHTML = `<div class="muted">Failed to load.</div>`;
    }
  }

  // --------- Post page (basic markdown) ----------
  function mdToHtml(md) {
    const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inCode = false;
    let inUl = false;
    const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };

    const esc = escapeHtml;
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, a, b) => `<a href="${esc(b)}" rel="noopener noreferrer">${esc(a)}</a>`);

    for (const raw of lines) {
      const line = raw ?? "";
      if (line.startsWith("```")) {
        if (!inCode) { closeUl(); inCode = true; html += "<pre><code>"; }
        else { inCode = false; html += "</code></pre>"; }
        continue;
      }
      if (inCode) { html += esc(line) + "\n"; continue; }

      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        closeUl();
        const lvl = h[1].length;
        html += `<h${lvl}>${inline(h[2] || "")}</h${lvl}>`;
        continue;
      }
      const li = line.match(/^\-\s+(.*)$/);
      if (li) {
        if (!inUl) { closeUl(); inUl = true; html += "<ul>"; }
        html += `<li>${inline(li[1] || "")}</li>`;
        continue;
      } else closeUl();

      const bq = line.match(/^>\s?(.*)$/);
      if (bq) { html += `<blockquote>${inline(bq[1] || "")}</blockquote>`; continue; }

      if (line.trim() === "") continue;
      html += `<p>${inline(line)}</p>`;
    }
    closeUl();
    if (inCode) html += "</code></pre>";
    return html;
  }

  async function pageBlogPost() {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const mount = $("#postBody");
    const titleEl = $("#postTitle");
    const metaEl = $("#postMeta");
    if (!mount) return;

    try {
      const posts = await fetchJson("posts.json");
      const p = (Array.isArray(posts) ? posts : []).find(x => x.slug === slug);
      if (!p) throw new Error("not found");
      if (titleEl) titleEl.textContent = p.title || "";
      if (metaEl) metaEl.textContent = fmtDate(p.date);
      const md = await (await fetch(`post-${encodeURIComponent(slug)}.md`, { cache: "no-store" })).text();
      mount.innerHTML = mdToHtml(md);
      mount.setAttribute("aria-busy", "false");
      document.title = `${p.title || "Post"} | honNKi`;
    } catch {
      mount.innerHTML = `<div class="muted">Could not load the article.</div>`;
      mount.setAttribute("aria-busy", "false");
    }
  }

  async function pageVideos() {
    const wrap = $("#ytEmbedWrap");
    const frame = $("#ytEmbed");
    const msg = $("#ytEmbedMsg");
    const openBtn = $("#ytOpenBtn");
    if (!wrap || !frame) return;

    const isPlaceholder = (s) => !s || s.startsWith("PASTE_");
    const extractChannelId = (s) => {
      const m = String(s || "").match(/(UC[0-9A-Za-z_-]{20,})/);
      return m ? m[1] : "";
    };
    const extractUploadsPlaylist = (s) => {
      const m = String(s || "").match(/(UU[0-9A-Za-z_-]{20,})/);
      return m ? m[1] : "";
    };

    try {
      const channelRaw = await fetchText("youtube_channel_url.txt").catch(() => "");
      const embedRaw = await fetchText("youtube_embed_url.txt").catch(() => "");

      const channel = isPlaceholder(channelRaw) ? "" : channelRaw;
      const embed = isPlaceholder(embedRaw) ? "" : embedRaw;

      if (openBtn) openBtn.href = channel || "https://www.youtube.com";

      let finalEmbed = embed;
      if (!finalEmbed) {
        const chId = extractChannelId(channel);
        const uu = extractUploadsPlaylist(channel) || (chId ? ("UU" + chId.slice(2)) : "");
        if (uu) {
          finalEmbed = `https://www.youtube-nocookie.com/embed?listType=playlist&list=${encodeURIComponent(uu)}&rel=0&modestbranding=1`;
        }
      }

      if (finalEmbed) {
        frame.src = finalEmbed;
        if (msg) msg.remove();
      } else {
        if (msg) msg.textContent = "Set your YouTube channel once (in local Tools).";
      }
    } catch {
      if (msg) msg.textContent = "Failed to load.";
    } finally {
      wrap.setAttribute("aria-busy", "false");
    }

  }

  // --------- Contact ----------
  function validFormUrl(u) {
    try {
      const url = new URL(u);
      if (url.protocol !== "https:") return false;
      if (!(url.hostname === 'docs.google.com' || url.hostname.endsWith('.google.com'))) return false;
      return true;
    } catch { return false; }
  }

  async function pageContact() {
    const status = $("#contactStatus");
    const wrap = $("#contactFrameWrap");
    const frame = $("#contactFrame");
    try {
      const res = await fetch("contact_form_url.txt", { cache: "no-store" });
      const txt = (await res.text()).trim();
      if (!txt || txt.startsWith("PASTE_")) {
        if (status) status.textContent = "Form is not set yet.";
        return;
      }
      const url = txt.includes("embedded=true") ? txt : (txt + (txt.includes("?") ? "&" : "?") + "embedded=true");
      if (!validFormUrl(url)) {
        if (status) status.textContent = "Form URL is invalid.";
        return;
      }
      if (frame) frame.src = url;
      if (wrap) wrap.hidden = false;
      if (status) status.textContent = "";
    } catch {
      if (status) status.textContent = "Failed to load the form.";
    }
  }

  function boot() {    initSparkles();

    setYear();
    const page = document.body?.dataset?.page || "";
    if (page === "home") pageHome();
    if (page === "blog-index") pageBlogIndex();
    if (page === "blog-post") pageBlogPost();
    if (page === "videos") pageVideos();
    if (page === "contact") pageContact();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
