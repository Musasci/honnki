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

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch failed: ${path}`);
    return await res.json();
  }

  function setYear() {
    const y = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = String(y));
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
      } else postBox.innerHTML = `<div class="muted">まだありません</div>`;
    } catch {
      if (postBox) postBox.innerHTML = `<div class="muted">読み込みに失敗しました</div>`;
    }

    try {
      const videos = await fetchJson("videos.json");
      videoBox?.setAttribute("aria-busy", "false");
      if (Array.isArray(videos) && videos.length) {
        const v = videos[0];
        renderMiniItem(videoBox, v.title || "Video", fmtDate(v.date), "videos.html");
      } else if (videoBox) videoBox.innerHTML = `<div class="muted">まだありません</div>`;
    } catch {
      if (videoBox) videoBox.innerHTML = `<div class="muted">読み込みに失敗しました</div>`;
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
        grid.innerHTML = filtered.map(postCard).join("") || `<div class="muted">見つかりません</div>`;
      };

      q?.addEventListener("input", render);
      render();
    } catch {
      grid.innerHTML = `<div class="muted">読み込みに失敗しました</div>`;
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
      mount.innerHTML = `<div class="muted">記事を読み込めませんでした</div>`;
      mount.setAttribute("aria-busy", "false");
    }
  }

  // --------- Videos ----------
  function youTubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      return m ? m[1] : "";
    } catch { return ""; }
  }

  function videoCard(v) {
    const title = escapeHtml(v.title || "Video");
    const d = escapeHtml(fmtDate(v.date));
    const yt = v.type === "youtube" ? youTubeId(v.url || "") : "";
    const thumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "";
    const media = yt
      ? `<div class="videoThumb"><img alt="" loading="lazy" src="${thumb}"></div>`
      : `<div class="videoThumb"><div class="muted">動画</div></div>`;
    const link = yt ? `<a class="btn btn--ghost" href="${escapeHtml(v.url||"")}" target="_blank" rel="noopener noreferrer">YouTube</a>` : "";
    return `
      <article class="card card--video">
        <div class="card__body">
          <div class="kicker">${d}</div>
          <h2 class="card__title">${title}</h2>
          ${media}
          <div class="row row--end">${link}</div>
        </div>
      </article>`;
  }

  async function pageVideos() {
    const grid = $("#videosGrid");
    if (!grid) return;
    try {
      const videos = await fetchJson("videos.json");
      const all = Array.isArray(videos) ? videos : [];
      grid.setAttribute("aria-busy", "false");
      grid.innerHTML = all.map(videoCard).join("") || `<div class="muted">まだありません</div>`;
    } catch {
      grid.innerHTML = `<div class="muted">読み込みに失敗しました</div>`;
    }
  }

  // --------- Contact ----------
  function validFormUrl(u) {
    try {
      const url = new URL(u);
      if (url.protocol !== "https:") return false;
      if (!url.hostname.endsWith("google.com")) return false;
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
        if (status) status.textContent = "フォーム準備中";
        return;
      }
      const url = txt.includes("embedded=true") ? txt : (txt + (txt.includes("?") ? "&" : "?") + "embedded=true");
      if (!validFormUrl(url)) {
        if (status) status.textContent = "フォームURLが無効です";
        return;
      }
      if (frame) frame.src = url;
      if (wrap) wrap.hidden = false;
      if (status) status.textContent = "";
    } catch {
      if (status) status.textContent = "フォームを読み込めませんでした";
    }
  }

  function boot() {
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
