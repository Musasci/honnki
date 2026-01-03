


function initChapters() {
  const sections = Array.from(document.querySelectorAll("[data-chapter]"));
  if (!sections.length) return;

  // Build rail
  const rail = document.createElement("nav");
  rail.className = "chapterRail";
  rail.setAttribute("aria-label", "ページの章");

  const dots = sections.map((sec, idx) => {
    const label = sec.getAttribute("data-chapter-label") || `Chapter ${idx + 1}`;
    const tone = sec.getAttribute("data-tone") || String((idx % 3) + 1);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "chapterDot";
    dot.setAttribute("data-label", label);
    dot.setAttribute("aria-label", label);

    dot.addEventListener("click", () => {
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    rail.appendChild(dot);
    return { dot, sec, label, tone };
  });

  document.body.appendChild(rail);

  // Observe sections to activate dot + tone shift
  const io = new IntersectionObserver((entries) => {
    // pick the most visible section
    const vis = entries.filter(e => e.isIntersecting).sort((a,b)=> (b.intersectionRatio - a.intersectionRatio))[0];
    if (!vis) return;

    const hit = dots.find(d => d.sec === vis.target);
    if (!hit) return;

    dots.forEach(d => d.dot.classList.toggle("is-active", d === hit));
    document.body.setAttribute("data-chapter-tone", hit.tone);
  }, { threshold: [0.18, 0.32, 0.5], rootMargin: "-10% 0px -55% 0px" });

  dots.forEach(d => io.observe(d.sec));

  // Divider lines reveal
  const divs = Array.from(document.querySelectorAll(".chapterDivider"));
  if (divs.length) {
    const dio = new IntersectionObserver((entries)=>{
      for (const e of entries){
        if (e.isIntersecting){
          e.target.classList.add("is-visible");
          dio.unobserve(e.target);
        }
      }
    }, { threshold: 0.2, rootMargin: "0px 0px -20% 0px" });
    divs.forEach(el => dio.observe(el));
  }
}

function initReveal() {
  const els = Array.from(document.querySelectorAll("[data-reveal], .reveal"));
  if (!els.length) return;

  // If motion reduced, show immediately
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(el => el.classList.add("reveal", "is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    }
  }, { root: null, threshold: 0.14, rootMargin: "0px 0px -10% 0px" });

  els.forEach((el) => {
    el.classList.add("reveal");
    const v = el.getAttribute("data-reveal") || "";
    if (v.includes("slow")) el.classList.add("reveal--slow");
    if (v.includes("d1")) el.classList.add("reveal--delay-1");
    if (v.includes("d2")) el.classList.add("reveal--delay-2");
    if (v.includes("d3")) el.classList.add("reveal--delay-3");
    io.observe(el);
  });
}

function initCardTilt() {
  // Tiny, optional delight — disabled on touch + reduced motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if ("ontouchstart" in window) return;

  const cards = Array.from(document.querySelectorAll(".card"));
  cards.forEach((card) => {
    card.addEventListener("mousemove", (ev) => {
      const r = card.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 2.0; // -1..1
      const ry = (x - 0.5) * 2.0;
      card.style.transform = `perspective(900px) rotateX(${rx * 2.2}deg) rotateY(${ry * 2.2}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* eslint-disable no-console */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setYears() {
  const y = String(new Date().getFullYear());
  $$("[data-year]").forEach(el => (el.textContent = y));
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function b64revEncode(email) {
  // store: base64(reverse(email))
  const e = String(email ?? "").trim();
  const rev = e.split("").reverse().join("");
  return btoa(unescape(encodeURIComponent(rev)));
}
function b64revDecode(enc) {
  const s = String(enc ?? "").trim();
  if (!s) return "";
  try {
    const rev = decodeURIComponent(escape(atob(s)));
    return rev.split("").reverse().join("");
  } catch (_) {
    return "";
  }
}


function safeURL(url) {
  // Allow only same-origin relative links for posts (security-first)
  // For external links in markdown, we allow https: only.
  try {
    if (!url) return "#";
    if (url.startsWith("/")) return url;
    if (url.startsWith("./")) return url;
    if (url.startsWith("../")) return url;
    const u = new URL(url);
    if (u.protocol === "https:") return u.toString();
  } catch (_) {}
  return "#";
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.json();
}

async function loadSiteConfig() {
  try {
    return await loadJSON("site.json");
  } catch (_) {
    return null;
  }
}

async function postJSON(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  return { ok: res.ok, status: res.status, data, text };
}

async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.text();
}

/* ---------- Markdown (minimal, safe-side) ----------
- HTML is escaped first (so raw HTML isn't executed)
- Supports:
  #, ##, ### headings
  - unordered lists
  ``` fenced code blocks
  > blockquote
  [text](https://example.com) links (https only)
  paragraphs
---------------------------------------------------*/
function renderMarkdown(md) {
  const src = String(md ?? "").replace(/\r\n/g, "\n");

  // Escape all HTML first (prevents injection)
  let s = escapeHTML(src);

  // Fenced code blocks
  const codeBlocks = [];
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `@@CODEBLOCK_${codeBlocks.length - 1}@@`;
  });

  // Blockquotes (line-based)
  s = s.split("\n").map(line => {
    if (line.startsWith("&gt; ")) return `@@BQ@@${line.slice(5)}`; // "&gt; " because escaped
    if (line === "&gt;") return `@@BQ@@`;
    return line;
  }).join("\n");

  // Headings
  s = s.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  s = s.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Links: [text](url) where url is https only
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const href = safeURL(url.trim());
    const t = text;
    if (href === "#") return t;
    const rel = href.startsWith("https://") ? ` rel="noopener noreferrer"` : ` rel="noopener"`;
    const target = href.startsWith("https://") ? ` target="_blank"` : "";
    return `<a href="${escapeHTML(href)}"${target}${rel}>${t}</a>`;
  });

  // Unordered lists: group consecutive "- " lines
  const lines = s.split("\n");
  const out = [];
  let inList = false;
  let inBQ = false;
  let bqLines = [];

  const flushBQ = function pageContact() {
  // GitHub Pagesでも「設定ほぼゼロ」で使えるように、メール送信（mailto）方式にします。
  // ※メールアドレスは画面に直接表示せず、JSで組み立てます（ただし公開リポジトリでは完全秘匿はできません）。
  const btn = document.getElementById("contactMailBtn");
  const status = document.getElementById("contactStatus");

  const setStatus = (msg) => { if (status) status.textContent = msg; };

  if (btn) {
    btn.addEventListener("click", (e) => {
      if (btn.hasAttribute("disabled") || btn.getAttribute("href") === "#") e.preventDefault();
    });
  }

  (async () => {
    try {
      const data = await loadJSON("site.json");
      const email = String(data?.contact_email || "");
      const subject = String(data?.mailto_subject || "");
      const body = String(data?.mailto_body || "");

      if (!email || !email.includes("@")) {
        setStatus("連絡先メール（site.json）が未設定です。Toolsページで site.json を生成してアップロードしてください。");
        if (btn) btn.setAttribute("disabled", "disabled");
        return;
      }

      // Obfuscate slightly: build string at runtime
      const parts = email.split("@");
      const safeEmail = parts[0] + "@" + parts[1];

      const qs = new URLSearchParams();
      if (subject) qs.set("subject", subject);
      if (body) qs.set("body", body);

      const href = "mailto:" + safeEmail + (qs.toString() ? ("?" + qs.toString()) : "");
      if (btn) {
        btn.removeAttribute("disabled");
        btn.setAttribute("href", href);
      }
      setStatus("送信ボタンを押すと、お使いのメールアプリが開きます。");
    } catch (e) {
      console.error(e);
      setStatus("site.json の読み込みに失敗しました。ファイル名（site.json）と配置（リポジトリ直下）を確認してください。");
      if (btn) btn.setAttribute("disabled", "disabled");
    }
  })();
}


() => {
    if (!inBQ) return;
    out.push(`<blockquote>${bqLines.join("<br/>")}</blockquote>`);
    inBQ = false;
    bqLines = [];
  };

  const flushList = () => {
    if (!inList) return;
    out.push("</ul>");
    inList = false;
  };

  for (const line of lines) {
    if (line.startsWith("@@BQ@@")) {
      // Start or continue blockquote
      flushList();
      inBQ = true;
      bqLines.push(line.replace("@@BQ@@", ""));
      continue;
    } else {
      flushBQ();
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${line.slice(2)}</li>`);
      continue;
    } else {
      flushList();
    }

    // Paragraphs: ignore empty lines, keep headings and other block tags as-is
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }

    if (/^<h[1-3]>/.test(trimmed) || /^<\/?(ul|li|blockquote|pre|code)>/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    out.push(`<p>${trimmed}</p>`);
  }
  flushBQ();
  flushList();

  let html = out.join("\n");

  // Restore code blocks
  html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (_, i) => {
    const code = codeBlocks[Number(i)] ?? "";
    return `<pre><code>${code}</code></pre>`;
  });

  // Clean up multiple blank lines
  html = html.replace(/\n{3,}/g, "\n\n");
  return html;
}

/* ---------- Blog cards ---------- */
function postCard(p) {
  const tags = (p.tags ?? []).slice(0, 4).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");
  const href = `post.html?slug=${encodeURIComponent(p.slug)}`;
  return `
    <article class="card">
      <div class="card__top">
        <span class="badge">${escapeHTML(p.date)}</span>
        ${p.readMinutes ? `<span class="badge">${escapeHTML(p.readMinutes)} min</span>` : ""}
      </div>
      <h3><a href="${href}" rel="noopener">${escapeHTML(p.title)}</a></h3>
      <p>${escapeHTML(p.excerpt)}</p>
      <div class="tags">${tags}</div>
    </article>
  `;
}

function normalizeTextForSearch(p) {
  const a = [
    p.title ?? "",
    p.excerpt ?? "",
    (p.tags ?? []).join(" ")
  ].join(" ").toLowerCase();
  return a;
}

/* ---------- YouTube (click-to-load, privacy-enhanced) ---------- */
function videoCard(v) {
  const vid = escapeHTML(v.youtubeId);
  const title = escapeHTML(v.title);
  const desc = escapeHTML(v.description ?? "");
  const label = `YouTube動画「${title}」をクリックして読み込む`;

  return `
    <article class="card video">
      <button class="video__thumb" data-youtube="${vid}" aria-label="${escapeHTML(label)}" type="button">
        <div class="video__placeholder" aria-hidden="true">
          <div class="video__placeholderGlow"></div>
          <div class="video__placeholderText">
            <div class="video__phTitle">${title}</div>
            <div class="video__phSub">▶ 再生（クリックで埋め込み）</div>
          </div>
        </div>
      </button>
      <div class="video__body">
        <h3 class="video__title">${title}</h3>
        <p>${desc}</p>
      </div>
    </article>
  `;
}

function mountYouTubeIframe(buttonEl, youtubeId) {
  const iframe = document.createElement("iframe");
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;
  iframe.title = "YouTube video player";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  buttonEl.replaceWith(iframe);
}

/* ---------- Pages ---------- */
async function pageHome() {
  // Latest posts
  const postsEl = $("#posts");
  try {
    const posts = await loadJSON("posts.json");
    const latest = posts.slice(0, 6);
    postsEl.innerHTML = latest.map(postCard).join("");
  } catch (e) {
    postsEl.innerHTML = `<div class="card"><h3>読み込みエラー</h3><p>posts.json を確認してください。</p></div>`;
    console.error(e);
  } finally {
    postsEl?.setAttribute("aria-busy", "false");
  }

  // Videos (maybe empty)
  const videosEl = $("#videosGrid");
  try {
    const videos = await loadJSON("videos.json");
    if (!videos.length) {
      videosEl.innerHTML = `<div class="card"><h3>準備中</h3><p>YouTube公開後に videos.json を更新すると表示されます。</p></div>`;
    } else {
      videosEl.innerHTML = videos.map(videoCard).join("");
      videosEl.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button[data-youtube]");
        if (!btn) return;
        const id = btn.getAttribute("data-youtube");
        if (!id) return;
        mountYouTubeIframe(btn, id);
      });
    }
  } catch (e) {
    videosEl.innerHTML = `<div class="card"><h3>読み込みエラー</h3><p>videos.json を確認してください。</p></div>`;
    console.error(e);
  } finally {
    videosEl?.setAttribute("aria-busy", "false");
  }
}

async function pageBlogIndex() {
  const grid = $("#postsAll");
  const q = $("#q");
  try {
    const posts = await loadJSON("posts.json");

    const render = (query) => {
      const term = (query ?? "").trim().toLowerCase();
      const filtered = term
        ? posts.filter(p => normalizeTextForSearch(p).includes(term))
        : posts;

      grid.innerHTML = filtered.map(postCard).join("") || `<div class="card"><h3>見つかりません</h3><p>別のキーワードを試してください。</p></div>`;
    };

    render("");
    q.addEventListener("input", () => render(q.value));
  } catch (e) {
    grid.innerHTML = `<div class="card"><h3>読み込みエラー</h3><p>posts.json を確認してください。</p></div>`;
    console.error(e);
  } finally {
    grid?.setAttribute("aria-busy", "false");
  }
}

async function pageContactForm() {
  const form = $("#contactForm");
  const statusEl = $("#status");
  const btn = $("#sendBtn");

  const setStatus = (kind, msg) => {
    if (!statusEl) return;
    statusEl.classList.add("status--show");
    statusEl.classList.remove("status--ok", "status--ng");
    statusEl.classList.add(kind === "ok" ? "status--ok" : "status--ng");
    statusEl.textContent = msg;
  };

  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const name = String($("#c_name")?.value ?? "").trim();
    const email = String($("#c_email")?.value ?? "").trim();
    const message = String($("#c_message")?.value ?? "").trim();
    const hp = String($("#hp")?.value ?? "").trim();

    // Turnstile token is auto-inserted as a hidden input named 'cf-turnstile-response'
    const token = String(document.querySelector('input[name="cf-turnstile-response"]')?.value ?? "").trim();

    if (!email || !message) {
      setStatus("ng", "メールとメッセージは必須です。");
      return;
    }
    if (message.length > 2000) {
      setStatus("ng", "メッセージが長すぎます（2000文字まで）。");
      return;
    }

    btn && (btn.disabled = true);
    setStatus("ok", "送信中…");

    try {
      const { ok, data, status } = await postJSON("/api/contact", { name, email, message, token, hp });
      if (ok) {
        setStatus("ok", "送信できました！返信をお待ちください。");
        form.reset();
        // Turnstile tokens are single-use; reset widget if available
        try { window.turnstile?.reset?.(); } catch (_) {}
      } else {
        const msg = (data && data.message) ? data.message : `送信できませんでした（${status}）`;
        setStatus("ng", msg);
        try { window.turnstile?.reset?.(); } catch (_) {}
      }
    } catch (e) {
      console.error(e);
      setStatus("ng", "通信エラーです。時間をおいて、もう一度お試しください。");
      try { window.turnstile?.reset?.(); } catch (_) {}
    } finally {
      btn && (btn.disabled = false);
    }
  });
}

async function pageContactMail() {
  const btnOpen = $("#openMailBtn");
  const btnCopy = $("#copyMailBtn");
  const tpl = $("#mailTemplateOut");
  const statusEl = $("#contactStatus");

  const setStatus = (kind, msg) => {
    if (!statusEl) return;
    statusEl.classList.add("status--show");
    statusEl.classList.remove("status--ok", "status--ng");
    statusEl.classList.add(kind === "ok" ? "status--ok" : "status--ng");
    statusEl.textContent = msg;
  };

  const cfg = await loadSiteConfig();
  const subject = cfg?.contactSubject || "Message";
  const body = cfg?.contactBodyTemplate || "Hello";
  const email = b64revDecode(cfg?.contactEmailEnc || "");

  if (tpl) tpl.textContent = body;

  const buildMailto = () => {
    const to = encodeURIComponent(email);
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!email) {
    setStatus("ng", "作成者が連絡先を設定中です。しばらくしてからお試しください。");
    btnOpen && (btnOpen.disabled = true);
  }

  btnOpen?.addEventListener("click", () => {
    if (!email) return;
    window.location.href = buildMailto();
  });

  btnCopy?.addEventListener("click", async () => {
    if (!email) {
      setStatus("ng", "作成者が連絡先を設定中です。");
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      setStatus("ok", "コピーしました！メールアプリで宛先に貼り付けてください。");
    } catch (_) {
      window.prompt("コピーして使ってください", email);
    }
  });
}

async function pageVideos() {
  const videosEl = $("#videosGrid");
  try {
    const videos = await loadJSON("videos.json");
    if (!videos.length) {
      videosEl.innerHTML = `<div class="card"><h3>準備中</h3><p>YouTube公開後に <code>videos.json</code> を更新すると表示されます。</p><p class="muted">Toolsページから生成できます。</p></div>`;
      return;
    }
    videosEl.innerHTML = videos.map(videoCard).join("");
    videosEl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-youtube]");
      if (!btn) return;
      const id = btn.getAttribute("data-youtube");
      if (!id) return;
      mountYouTubeIframe(btn, id);
    });
  } catch (e) {
    videosEl.innerHTML = `<div class="card"><h3>読み込みエラー</h3><p>videos.json を確認してください。</p></div>`;
    console.error(e);
  } finally {
    videosEl?.setAttribute("aria-busy", "false");
  }
}

function slugifyJP(input) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // Basic slug: keep a-z0-9, convert spaces to '-', remove others
  // For Japanese, this will drop characters; so we also keep a short hash-like suffix if empty.
  let out = s.toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!out) {
    const n = Array.from(s).reduce((a,c)=> (a + c.charCodeAt(0)) % 100000, 0);
    out = `post-${String(n).padStart(5,"0")}`;
  }
  return out;
}

function parseCSVTags(s) {
  return String(s ?? "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extractYouTubeId(url) {
  const u = String(url ?? "").trim();
  if (!u) return "";
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "").slice(0, 32);
    }
    if (host.endsWith("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v.slice(0, 32);
      const m = parsed.pathname.match(/\/shorts\/([^/]+)/);
      if (m) return m[1].slice(0, 32);
      const e = parsed.pathname.match(/\/embed\/([^/]+)/);
      if (e) return e[1].slice(0, 32);
    }
  } catch (_) {}
  // If user pasted an ID directly
  if (/^[a-zA-Z0-9_-]{6,}$/.test(u)) return u.slice(0, 32);
  return "";
}

async function pageTools() {
  // Preload current JSON so tools can generate "updated" files.
  let posts = [];
  let videos = [];
  try { posts = await loadJSON("posts.json"); } catch (_) {}
  try { videos = await loadJSON("videos.json"); } catch (_) {}

  // Allow importing local JSON files (drag & drop / file picker) to avoid copy-paste.
  const readFileText = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("Failed to read file"));
    r.readAsText(file);
  });

  const bindJsonImport = (fileInputId, dropZoneId, statusId, applyFn) => {
    const input = document.getElementById(fileInputId);
    const zone = document.getElementById(dropZoneId);
    const status = document.getElementById(statusId);

    const handleFile = async (file) => {
      if (!file) return;
      try {
        const text = await readFileText(file);
        const data = JSON.parse(text);
        applyFn(data, file.name);
        if (status) status.textContent = `読み込みOK：${file.name}`;
        if (zone) zone.classList.add("dropzone--ok");
      } catch (e) {
        console.error(e);
        if (status) status.textContent = `読み込み失敗：${file.name}（JSON形式を確認）`;
        if (zone) zone.classList.remove("dropzone--ok");
        alert("JSONの読み込みに失敗しました。ファイルが壊れていないか確認してください。");
      }
    };

    if (input) {
      input.addEventListener("change", () => handleFile(input.files?.[0]));
    }
    if (zone) {
      const onDragOver = (ev) => { ev.preventDefault(); zone.classList.add("dropzone--hover"); };
      const onDragLeave = () => zone.classList.remove("dropzone--hover");
      const onDrop = (ev) => {
        ev.preventDefault();
        zone.classList.remove("dropzone--hover");
        const file = ev.dataTransfer?.files?.[0];
        handleFile(file);
      };
      zone.addEventListener("dragover", onDragOver);
      zone.addEventListener("dragleave", onDragLeave);
      zone.addEventListener("drop", onDrop);
      zone.addEventListener("click", () => input?.click());
      zone.setAttribute("role", "button");
      zone.setAttribute("tabindex", "0");
      zone.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); input?.click(); }
      });
    }
  };

  // posts.json import
  bindJsonImport("t_postsFile", "t_postsDrop", "t_postsStatus", (data) => {
    if (!Array.isArray(data)) throw new Error("posts.json must be an array");
    posts = data;
  });

  // videos.json import
  bindJsonImport("t_videosFile", "t_videosDrop", "t_videosStatus", (data) => {
    if (!Array.isArray(data)) throw new Error("videos.json must be an array");
    videos = data;
  });

  // site.json import (optional, just for prefill)
  bindJsonImport("t_siteFile", "t_siteDrop", "t_siteStatus", (data) => {
    const email = typeof data?.contact_email === "string" ? data.contact_email : "";
    const subject = typeof data?.mailto_subject === "string" ? data.mailto_subject : "";
    const body = typeof data?.mailto_body === "string" ? data.mailto_body : "";
    const elE = document.getElementById("t_siteEmail");
    const elS = document.getElementById("t_siteSubject");
    const elB = document.getElementById("t_siteBody");
    if (elE && email) elE.value = email;
    if (elS && subject) elS.value = subject;
    if (elB && body) elB.value = body;
  });

  const elTitle = $("#t_postTitle");
  const elSlug = $("#t_postSlug");
  const elDate = $("#t_postDate");
  const elRead = $("#t_postRead");
  const elExcerpt = $("#t_postExcerpt");
  const elTags = $("#t_postTags");
  const elBody = $("#t_postBody");

  const outPosts = $("#t_postsJsonOut");
  const outMd = $("#t_mdOut");
  const btnMake = $("#t_makePost");
  const btnMd = $("#t_downloadMd");
  const btnPostsJson = $("#t_downloadPostsJson");

  let lastSlug = "";
  let lastMd = "";
  let lastPostsJson = "";

  const today = new Date();
  if (elDate && !elDate.value) {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    elDate.value = `${y}-${m}-${d}`;
  }

  btnMake?.addEventListener("click", () => {
    const title = String(elTitle?.value ?? "").trim() || "（タイトル未入力）";
    const date = String(elDate?.value ?? "").trim() || "";
    const slug = (String(elSlug?.value ?? "").trim() || slugifyJP(title));
    const read = Number(elRead?.value ?? "") || undefined;
    const excerpt = String(elExcerpt?.value ?? "").trim();
    const tags = parseCSVTags(elTags?.value ?? "");
    const body = String(elBody?.value ?? "").trim() || `# ${title}

本文を書いてください。
`;

    const entry = {
      slug,
      title,
      date: date || undefined,
      readMinutes: read,
      excerpt: excerpt || undefined,
      tags: tags.length ? tags : undefined
    };

    // sanitize undefined for JSON output
    const clean = (obj) => JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? undefined : v)));

    const newPosts = [clean(entry), ...posts].filter(Boolean);

    lastSlug = slug;
    lastMd = body.endsWith("
") ? body : body + "
";
    lastPostsJson = JSON.stringify(newPosts, null, 2);

    outPosts.textContent = lastPostsJson;
    outMd.textContent = lastMd;

    btnMd.disabled = false;
    btnPostsJson.disabled = false;
  });

  btnMd?.addEventListener("click", () => {
    if (!lastSlug) return;
    downloadText(`post-${lastSlug}.md`, lastMd);
  });

  btnPostsJson?.addEventListener("click", () => {
    if (!lastPostsJson) return;
    downloadText("posts.json", lastPostsJson);
  });

  // YouTube tool
  const elUrl = $("#t_ytUrl");
  const elYtTitle = $("#t_ytTitle");
  const elYtDesc = $("#t_ytDesc");
  const outVideos = $("#t_videosJsonOut");
  const btnAddVideo = $("#t_addVideo");
  const btnVideosJson = $("#t_downloadVideosJson");

  let lastVideosJson = "";

  btnAddVideo?.addEventListener("click", () => {
    const id = extractYouTubeId(elUrl?.value ?? "");
    const title = String(elYtTitle?.value ?? "").trim() || "（タイトル未入力）";
    const desc = String(elYtDesc?.value ?? "").trim();

    if (!id) {
      outVideos.textContent = "YouTube URL からIDを抽出できませんでした。URL（または動画ID）を確認してください。";
      btnVideosJson.disabled = true;
      return;
    }

    const entry = { youtubeId: id, title, description: desc || undefined };
    const clean = (obj) => JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? undefined : v)));
    const newVideos = [clean(entry), ...videos].filter(Boolean);

    lastVideosJson = JSON.stringify(newVideos, null, 2);
    outVideos.textContent = lastVideosJson;
    btnVideosJson.disabled = false;
  });

  btnVideosJson?.addEventListener("click", () => {
    if (!lastVideosJson) return;
    downloadText("videos.json", lastVideosJson);
  });
}

async function pageContact() {
  const btn = $("#contactMailBtn");
  const copyBtn = $("#copyEmailBtn");
  const tplOut = $("#contactTemplateOut");

  const cfg = await loadSiteConfig();
  const email = cfg?.contactEmail || "";
  const subject = cfg?.contactSubject || "Message";
  const body = cfg?.contactBodyTemplate || "Hello";

  // Show template for easy copy
  if (tplOut) tplOut.textContent = body;

  // Build mailto link (encode)
  if (btn) {
    if (!email || email.includes("example.com")) {
      btn.textContent = "（設定が必要）メールを設定してください";
      btn.classList.add("btn--ghost");
      btn.setAttribute("href", "/tools/");
      btn.setAttribute("title", "Toolsでメールアドレスを設定してください");
    } else {
      const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      btn.setAttribute("href", href);
    }
  }

  // Copy email (simple UX)
  copyBtn?.addEventListener("click", async () => {
    if (!email || email.includes("example.com")) {
      alert("まだメールアドレスが設定されていません。site.json を編集してください。");
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      copyBtn.textContent = "コピーしました！";
      setTimeout(()=> (copyBtn.textContent = "メールアドレスをコピー"), 1200);
    } catch (_) {
      // fallback: prompt
      window.prompt("コピーして使ってください", email);
    }
  });
  // Site settings tool (site.json)
  const elSiteEmail = $("#t_siteEmail");
  const elSiteSubject = $("#t_siteSubject");
  const elSiteBody = $("#t_siteBody");
  const btnMakeSite = $("#t_makeSiteJson");
  const btnDlSite = $("#t_downloadSiteJson");
  const outSite = $("#t_siteJsonOut");

  let lastSiteJson = "";

  // Prefill from current config if available
  const cfg = await loadSiteConfig();
  if (cfg) {
    if (elSiteEmail) elSiteEmail.value = cfg.contactEmail || "";
    if (elSiteSubject) elSiteSubject.value = cfg.contactSubject || "";
    if (elSiteBody) elSiteBody.value = cfg.contactBodyTemplate || "";
  }

  btnMakeSite?.addEventListener("click", () => {
    const email = String(elSiteEmail?.value ?? "").trim();
    const subject = String(elSiteSubject?.value ?? "").trim() || "翠山海翔サイトからのメッセージ";
    const body = String(elSiteBody?.value ?? "").trim() || "こんにちは！\n\n（ここにメッセージを書いてください）\n";

    const next = {
      ...(cfg || {}),
      contactEmail: email,
      contactSubject: subject,
      contactBodyTemplate: body.endsWith("\n") ? body : body + "\n"
    };

    lastSiteJson = JSON.stringify(next, null, 2);
    if (outSite) outSite.textContent = lastSiteJson;
    if (btnDlSite) btnDlSite.disabled = false;
  });

  btnDlSite?.addEventListener("click", () => {
    if (!lastSiteJson) return;
    downloadText("site.json", lastSiteJson);

  // Upload-only contact settings (obfuscated mailto)
  const elCE = $("#t_contactEmailPlain");
  const elCS = $("#t_contactSubject2");
  const elCB = $("#t_contactBody2");
  const btnMake2 = $("#t_makeSiteJson2");
  const btnDl2 = $("#t_downloadSiteJson2");
  const out2 = $("#t_siteJsonOut2");

  let lastSiteJson2 = "";

  // Prefill from current config
  if (cfg) {
    if (elCS) elCS.value = cfg.contactSubject || "";
    if (elCB) elCB.value = cfg.contactBodyTemplate || "";
  }

  btnMake2?.addEventListener("click", () => {
    const emailPlain = String(elCE?.value ?? "").trim();
    const subject = String(elCS?.value ?? "").trim() || "翠山海翔サイトからのメッセージ";
    const body = String(elCB?.value ?? "").trim() || "こんにちは！\n\n（ここにメッセージを書いてください）\n";
    if (!emailPlain) {
      alert("メールが空です。入力してください。");
      return;
    }
    const next = {
      ...(cfg || {}),
      contactMode: "mailto_obfuscated",
      contactEmailEnc: b64revEncode(emailPlain),
      contactSubject: subject,
      contactBodyTemplate: body.endsWith("\n") ? body : body + "\n"
    };
    lastSiteJson2 = JSON.stringify(next, null, 2);
    if (out2) out2.textContent = lastSiteJson2;
    if (btnDl2) btnDl2.disabled = false;
  });

  btnDl2?.addEventListener("click", () => {
    if (!lastSiteJson2) return;
    downloadText("site.json", lastSiteJson2);
  });
  });

}

async function pageBlogPost() {
  const bodyEl = $("#postBody");
  const titleEl = $("#postTitle");
  const dateEl = $("#postDate");
  const readEl = $("#postRead");
  const excerptEl = $("#postExcerpt");
  const tagsEl = $("#postTags");
  const prevEl = $("#prevPost");
  const nextEl = $("#nextPost");

  try {
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    if (!slug) throw new Error("Missing slug");

    const posts = await loadJSON("posts.json");
    const idx = posts.findIndex(p => p.slug === slug);
    if (idx === -1) throw new Error("Post not found");

    const p = posts[idx];
    document.title = `${p.title} | My Night & City Notes`;

    titleEl.textContent = p.title ?? "";
    dateEl.textContent = p.date ?? "";
    readEl.textContent = p.readMinutes ? `${p.readMinutes} min` : "";
    excerptEl.textContent = p.excerpt ?? "";

    tagsEl.innerHTML = (p.tags ?? []).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");

    // prev/next
    const prev = posts[idx + 1];
    const next = posts[idx - 1];
    prevEl.href = prev ? `post.html?slug=${encodeURIComponent(prev.slug)}` : "blog.html";
    nextEl.href = next ? `post.html?slug=${encodeURIComponent(next.slug)}` : "blog.html";

    const md = await loadText(`post-${encodeURIComponent(slug)}.md`);
    bodyEl.innerHTML = renderMarkdown(md);
  } catch (e) {
    bodyEl.innerHTML = `<h2>読み込みエラー</h2><p>URL（slug）と posts.json / 記事ファイルを確認してください。</p>`;
    console.error(e);
  } finally {
    bodyEl?.setAttribute("aria-busy", "false");
  }
}

(function boot() {
  setYears();

  const page = document.body?.dataset?.page;
  if (page === "home") pageHome();
  if (page === "blog-index") pageBlogIndex();
  if (page === "blog-post") pageBlogPost();
  if (page === "videos") pageVideos();
  if (page === "tools") pageTools();
    if (page === "contact") pageContact();
  
  initReveal();
  initCardTilt();
  initChapters();
})();
