/* honNKi Site - app.js
   Static site helper for GitHub Pages.
   - Blog: posts.json + post-<slug>.md
   - Videos: videos.json (YouTube / local file)
   - Contact: mailto and/or Google Form embed (site.json)
   - Tools: owner-only content generator; produces files for manual upload
*/

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const BASE = (document.querySelector("link[rel=canonical]")?.href || "").replace(/(index\.html)?$/, "");
  const TODAY_ISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  function setYears() {
    $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
    return await res.text();
  }

  async function fetchJson(url) {
    const txt = await fetchText(url);
    return JSON.parse(txt);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeUrl(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    // Disallow javascript: and data: (except images are handled separately)
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:")) return "";
    if (lower.startsWith("data:")) return "";
    return u;
  }

  function estimateReadMinutes(md) {
    const s = String(md || "");
    // Rough estimate: Japanese ~600 chars/min, English ~200 words/min
    const jpChars = (s.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
    const words = (s.replace(/[\u3040-\u30ff\u3400-\u9fff]/g, " ").match(/\b[\w'-]+\b/g) || []).length;
    const minsJp = jpChars / 600;
    const minsEn = words / 200;
    const mins = Math.max(1, Math.round((minsJp + minsEn) || 1));
    return mins;
  }

  function stripMarkdown(md) {
    let s = String(md || "");
    s = s.replace(/```[\s\S]*?```/g, "");
    s = s.replace(/`[^`]*`/g, "");
    s = s.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
    s = s.replace(/\[[^\]]*\]\([^)]+\)/g, "$1");
    s = s.replace(/[#>*_-]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function excerptFromMd(md, maxLen = 90) {
    const t = stripMarkdown(md);
    if (!t) return "";
    return t.length <= maxLen ? t : t.slice(0, maxLen).trim() + "…";
  }

  // Minimal markdown renderer (safe-by-default: escapes HTML first)
  function markdownToHtml(md) {
    const src = String(md || "").replace(/\r\n?/g, "\n");
    const lines = src.split("\n");

    const out = [];
    let i = 0;

    const flushParagraph = (buf) => {
      if (!buf.length) return;
      const text = buf.join(" ").trim();
      if (!text) return;
      out.push(`<p>${inline(text)}</p>`);
      buf.length = 0;
    };

    const inline = (text) => {
      let s = escapeHtml(text);

      // images ![alt](url)
      s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
        const u = safeUrl(url);
        if (!u) return "";
        return `<img alt="${escapeHtml(alt)}" loading="lazy" src="${escapeHtml(u)}" />`;
      });

      // links [text](url)
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        const u = safeUrl(url);
        if (!u) return escapeHtml(label);
        const isExternal = /^https?:\/\//i.test(u);
        const rel = isExternal ? ' rel="noopener noreferrer"' : "";
        return `<a href="${escapeHtml(u)}"${rel}>${escapeHtml(label)}</a>`;
      });

      // inline code
      s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
      // bold and italics (simple)
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return s;
    };

    while (i < lines.length) {
      const line = lines[i];

      // code fence
      if (line.startsWith("```")) {
        const lang = line.slice(3).trim();
        i++;
        const codeLines = [];
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        // skip closing ```
        if (i < lines.length && lines[i].startsWith("```")) i++;
        flushParagraph([]);
        const code = escapeHtml(codeLines.join("\n"));
        out.push(`<pre><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ""}>${code}</code></pre>`);
        continue;
      }

      // blank line
      if (!line.trim()) {
        i++;
        continue;
      }

      // heading
      const h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        flushParagraph([]);
        const level = h[1].length;
        out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
        i++;
        continue;
      }

      // blockquote
      if (line.startsWith(">")) {
        flushParagraph([]);
        const q = [];
        while (i < lines.length && lines[i].startsWith(">")) {
          q.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push(`<blockquote>${inline(q.join("\n").trim())}</blockquote>`);
        continue;
      }

      // list (unordered)
      const ul = line.match(/^\s*[-*]\s+(.+)$/);
      if (ul) {
        flushParagraph([]);
        out.push("<ul>");
        while (i < lines.length) {
          const m = lines[i].match(/^\s*[-*]\s+(.+)$/);
          if (!m) break;
          out.push(`<li>${inline(m[1].trim())}</li>`);
          i++;
        }
        out.push("</ul>");
        continue;
      }

      // list (ordered)
      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ol) {
        flushParagraph([]);
        out.push("<ol>");
        while (i < lines.length) {
          const m = lines[i].match(/^\s*\d+\.\s+(.+)$/);
          if (!m) break;
          out.push(`<li>${inline(m[1].trim())}</li>`);
          i++;
        }
        out.push("</ol>");
        continue;
      }

      // paragraph (collect until blank)
      const pbuf = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("```")) {
        // stop paragraph before block constructs
        if (/^(#{1,3})\s+/.test(lines[i])) break;
        if (lines[i].startsWith(">")) break;
        if (/^\s*[-*]\s+/.test(lines[i])) break;
        if (/^\s*\d+\.\s+/.test(lines[i])) break;
        pbuf.push(lines[i].trim());
        i++;
      }
      flushParagraph(pbuf);
    }

    return out.join("\n");
  }

  function parseCSVTags(input) {
    return String(input || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function normalizeSlug(raw) {
    const s = String(raw || "").trim().toLowerCase();
    const ascii = s
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    return ascii;
  }

  function makeSafeSlug(title) {
    const fromTitle = normalizeSlug(title);
    if (fromTitle && /^[a-z0-9][a-z0-9-]*$/.test(fromTitle)) return fromTitle;
    const date = TODAY_ISO();
    const rand = Math.random().toString(36).slice(2, 6);
    return `post-${date}-${rand}`;
  }

  function getYoutubeId(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    try {
      const parsed = new URL(u);
      const host = parsed.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return parsed.pathname.replace("/", "").slice(0, 32);
      if (host.endsWith("youtube.com")) {
        const v = parsed.searchParams.get("v");
        if (v) return v.slice(0, 32);
        const m = parsed.pathname.match(/\/shorts\/([^/]+)/);
        if (m) return m[1].slice(0, 32);
        const e = parsed.pathname.match(/\/embed\/([^/]+)/);
        if (e) return e[1].slice(0, 32);
      }
    } catch (_) {}
    return "";
  }

  // Email obfuscation (lightweight)
  function b64revEncode(s) {
    const b = btoa(unescape(encodeURIComponent(String(s))));
    return b.split("").reverse().join("");
  }
  function b64revDecode(s) {
    try {
      const b = String(s || "").split("").reverse().join("");
      return decodeURIComponent(escape(atob(b)));
    } catch (_) {
      return "";
    }
  }

  // UI helpers
  function setStatus(el, msg, kind = "ok") {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("status--ok", "status--ng", "status--show");
    if (!msg) return;
    el.classList.add("status--show");
    el.classList.add(kind === "ok" ? "status--ok" : "status--ng");
  }

  // -------- Blog Index --------
  async function pageBlogIndex() {
    const grid = $("#postsAll");
    const q = $("#q");
    if (!grid) return;

    let posts = [];
    try {
      posts = await fetchJson("posts.json");
    } catch (e) {
      grid.innerHTML = `<p class="muted">posts.json を読み込めませんでした。公開が反映されていないか、ファイルが存在しません。</p>`;
      grid.removeAttribute("aria-busy");
      return;
    }

    const norm = (s) => String(s || "").toLowerCase();

    const render = (items) => {
      if (!items.length) {
        grid.innerHTML = `<p class="muted">該当する記事がありません。</p>`;
        grid.removeAttribute("aria-busy");
        return;
      }
      const cards = items
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .map((p) => {
          const tags = (p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
          const date = p.date ? `<span class="badge">${escapeHtml(p.date)}</span>` : "";
          const mins = p.readMinutes ? `<span class="badge">${escapeHtml(String(p.readMinutes))} min</span>` : "";
          const excerpt = p.excerpt ? `<p class="muted">${escapeHtml(p.excerpt)}</p>` : "";
          return `
            <article class="card card--post" data-reveal="d1">
              <a class="card__link" href="post.html?slug=${encodeURIComponent(p.slug)}">
                <div class="post__meta">${date}${mins}</div>
                <h3>${escapeHtml(p.title || p.slug)}</h3>
                ${excerpt}
                <div class="tags">${tags}</div>
              </a>
            </article>
          `;
        })
        .join("");
      grid.innerHTML = cards;
      grid.removeAttribute("aria-busy");
      initReveal();
    };

    render(posts);

    q?.addEventListener("input", () => {
      const kw = norm(q.value);
      if (!kw) return render(posts);
      const filtered = posts.filter((p) => {
        const hay = [p.title, p.excerpt, (p.tags || []).join(" "), p.slug].map(norm).join(" ");
        return hay.includes(kw);
      });
      render(filtered);
    });
  }

  // -------- Blog Post --------
  async function pageBlogPost() {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const titleEl = $("#postTitle");
    const dateEl = $("#postDate");
    const readEl = $("#postRead");
    const excerptEl = $("#postExcerpt");
    const tagsEl = $("#postTags");
    const bodyEl = $("#postBody");
    if (!bodyEl) return;

    if (!slug) {
      bodyEl.innerHTML = `<p class="muted">記事が指定されていません。<a href="blog.html">ブログ一覧へ</a></p>`;
      return;
    }

    let posts = [];
    try {
      posts = await fetchJson("posts.json");
    } catch (_) {}

    const entry = posts.find((p) => p.slug === slug) || null;

    try {
      const md = await fetchText(`post-${encodeURIComponent(slug)}.md`);
      bodyEl.innerHTML = markdownToHtml(md) || `<p class="muted">本文が空です。</p>`;
      bodyEl.removeAttribute("aria-busy");

      if (titleEl) titleEl.textContent = entry?.title || slug;
      if (dateEl) dateEl.textContent = entry?.date || "";
      if (readEl) readEl.textContent = entry?.readMinutes ? `${entry.readMinutes} min` : "";
      if (excerptEl) excerptEl.textContent = entry?.excerpt || "";
      if (tagsEl) tagsEl.innerHTML = (entry?.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

      // Prev/next
      const prev = $("#prevPost");
      const next = $("#nextPost");
      const sorted = posts
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      const idx = sorted.findIndex((p) => p.slug === slug);
      if (idx >= 0) {
        const prevEntry = sorted[idx + 1];
        const nextEntry = sorted[idx - 1];
        if (prev && prevEntry) prev.href = `post.html?slug=${encodeURIComponent(prevEntry.slug)}`;
        if (next && nextEntry) next.href = `post.html?slug=${encodeURIComponent(nextEntry.slug)}`;
      }

      initReveal();
    } catch (e) {
      bodyEl.innerHTML = `<p class="muted">記事本文を読み込めませんでした。</p>`;
      bodyEl.removeAttribute("aria-busy");
    }
  }

  // -------- Videos --------

  async function pageVideos() {
    const grid = $("#videosGrid");
    if (!grid) return;

    let videos = [];
    try {
      videos = await fetchJson("videos.json");
    } catch (e) {
      grid.innerHTML = `<p class="muted">videos.json を読み込めませんでした。</p>`;
      grid.removeAttribute("aria-busy");
      return;
    }

    const normEntry = (v) => {
      if (!v || typeof v !== "object") return null;
      // Backward compatibility:
      // - { id, title } -> youtube
      // - { youtubeId, title } -> youtube
      // - { type:"file", src:"video-xxx.mp4" } -> file
      if (v.type === "file" || v.src) return { type: "file", title: v.title || "", date: v.date || "", src: v.src || "", poster: v.poster || "" };
      const yid = v.youtubeId || v.id || "";
      return { type: "youtube", title: v.title || "", date: v.date || "", youtubeId: yid };
    };

    const items = videos.map(normEntry).filter(Boolean);

    const card = (v) => {
      const title = escapeHtml(v.title || "");
      const date = v.date ? `<time datetime="${escapeHtml(v.date)}">${escapeHtml(v.date)}</time>` : "";
      let media = "";
      if (v.type === "youtube" && v.youtubeId) {
        const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtubeId)}?rel=0&modestbranding=1`;
        media = `
          <div class="video__frame">
            <iframe
              src="${src}"
              title="${title || "YouTube video"}"
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen></iframe>
          </div>
        `;
      } else if (v.type === "file" && v.src) {
        const poster = v.poster ? ` poster="${escapeHtml(v.poster)}"` : "";
        media = `
          <div class="video__frame">
            <video controls preload="metadata"${poster}>
              <source src="${escapeHtml(v.src)}" />
              お使いのブラウザは動画再生に対応していません。
            </video>
          </div>
        `;
      } else {
        media = `<div class="video__frame"><div class="muted">（動画が未設定です）</div></div>`;
      }

      return `
        <article class="card card--video" data-reveal="d1">
          ${media}
          <div class="card__body">
            <h3>${title || "Untitled"}</h3>
            <div class="row row--meta">${date}</div>
          </div>
        </article>
      `;
    };

    grid.innerHTML = items.map(card).join("") || `<p class="muted">動画がありません。</p>`;
    grid.removeAttribute("aria-busy");
    initReveal();
  }

  // -------- Contact --------
  async function pageContact() {
    const mailBtn = $("#contactMailBtn");
    const copyBtn = $("#contactCopyBtn");
    const tplOut = $("#contactTpl");
    const formWrap = $("#contactFormWrap");
    const formFrame = $("#contactFormFrame");
    const contactNote = $("#contactModeNote");

    let cfg = {};
    try {
      cfg = await fetchJson("site.json");
    } catch (_) {}

    const mode = String(cfg.contactMode || "mailto").toLowerCase(); // mailto | googleform | both
    const email = cfg.contactEmailEnc ? b64revDecode(cfg.contactEmailEnc) : String(cfg.contact_email || cfg.contactEmail || "").trim();
    const subject = String(cfg.contactSubject || "Message");
    const body = String(cfg.contactBodyTemplate || "こんにちは！\n\n（ここにメッセージを書いてください）\n");
    const formUrl = String(cfg.googleFormEmbedUrl || "").trim();

    if (tplOut) tplOut.textContent = body;

    const showMail = mode === "mailto" || mode === "both";
    const showForm = (mode === "googleform" || mode === "both") && !!formUrl;

    if (contactNote) {
      const parts = [];
      if (showMail) parts.push("メール");
      if (showForm) parts.push("フォーム");
      contactNote.textContent = parts.length ? `連絡方法：${parts.join(" / ")}` : "連絡方法が未設定です（Toolsで設定してください）";
    }

    if (mailBtn) {
      if (showMail && email) {
        const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        mailBtn.href = href;
        mailBtn.classList.remove("btn--ghost");
        mailBtn.textContent = "メールを開く";
      } else {
        mailBtn.href = "tools.html";
        mailBtn.classList.add("btn--ghost");
        mailBtn.textContent = "（未設定）Toolsで連絡先を設定";
      }
      mailBtn.style.display = showMail ? "" : "none";
    }

    if (copyBtn) {
      copyBtn.style.display = showMail ? "" : "none";
      copyBtn.addEventListener("click", async () => {
        if (!email) return alert("メールが未設定です。Toolsで設定してください。");
        try {
          await navigator.clipboard.writeText(email);
          copyBtn.textContent = "コピーしました！";
          setTimeout(() => (copyBtn.textContent = "メールアドレスをコピー"), 1200);
        } catch (_) {
          prompt("コピーできない場合は手動でコピーしてください：", email);
        }
      });
    }

    if (formWrap) formWrap.style.display = showForm ? "" : "none";
    if (formFrame && showForm) {
      // Only allow https embed
      if (!/^https:\/\//i.test(formUrl)) {
        formWrap.innerHTML = `<p class="muted">フォームURLが不正です。Toolsで https の埋め込みURLを設定してください。</p>`;
      } else {
        formFrame.src = formUrl;
      }
    }
  }

  // -------- Tools (Owner) --------
  function initDropzone(dropEl, onFiles) {
    if (!dropEl) return;
    const input = dropEl.querySelector("input[type=file]");
    const activatePick = () => input?.click();

    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    dropEl.addEventListener("click", activatePick);

    ["dragenter", "dragover"].forEach((t) =>
      dropEl.addEventListener(t, (e) => {
        prevent(e);
        dropEl.classList.add("dropzone--hover");
      })
    );
    ["dragleave", "drop"].forEach((t) =>
      dropEl.addEventListener(t, (e) => {
        prevent(e);
        dropEl.classList.remove("dropzone--hover");
      })
    );

    dropEl.addEventListener("drop", (e) => {
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) onFiles(files);
    });

    input?.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
      input.value = "";
    });
  }

  async function fileToUint8(file) {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function fileToText(file) {
    return await file.text();
  }

  // CRC32 for ZIP
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // ZIP (store, no compression)
  function buildZipStore(entries) {
    // entries: [{name, data(Uint8Array)}]
    const enc = new TextEncoder();
    const files = [];
    const central = [];
    let offset = 0;

    const u16 = (n) => Uint8Array.from([n & 255, (n >>> 8) & 255]);
    const u32 = (n) => Uint8Array.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
    const concat = (arrs) => {
      const len = arrs.reduce((a, b) => a + b.length, 0);
      const out = new Uint8Array(len);
      let p = 0;
      for (const a of arrs) {
        out.set(a, p);
        p += a.length;
      }
      return out;
    };

    const dosTime = () => {
      const d = new Date();
      const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2);
      const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      return { time: time & 0xffff, date: date & 0xffff };
    };

    for (const ent of entries) {
      const nameBytes = enc.encode(ent.name);
      const data = ent.data;
      const crc = crc32(data);
      const { time, date } = dosTime();

      // Local file header
      const localHeader = concat([
        u32(0x04034b50),
        u16(20), // version
        u16(0), // flags
        u16(0), // compression: store
        u16(time),
        u16(date),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(nameBytes.length),
        u16(0), // extra
        nameBytes,
      ]);

      files.push(localHeader, data);

      // Central directory header
      const centralHeader = concat([
        u32(0x02014b50),
        u16(20), // made by
        u16(20), // needed
        u16(0), // flags
        u16(0), // compression
        u16(time),
        u16(date),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(nameBytes.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset),
        nameBytes,
      ]);
      central.push(centralHeader);

      offset += localHeader.length + data.length;
    }

    const centralStart = offset;
    const centralBytes = concat(central);
    offset += centralBytes.length;

    const end = concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(entries.length),
      u16(entries.length),
      u32(centralBytes.length),
      u32(centralStart),
      u16(0),
    ]);

    return concat([...files, centralBytes, end]);
  }

  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  async function pageTools() {
    const state = {
      posts: [],
      videos: [],
      site: {},
      // changed/new files (name -> Uint8Array)
      files: new Map(),
      loaded: { posts: false, videos: false, site: false },
    };

    const elPackStatus = $("#t_packStatus");

    // ---- Load current published data (recommended) ----
    async function loadFromSite() {
      try {
        const [posts, videos, site] = await Promise.all([
          fetchJson("posts.json").catch(() => []),
          fetchJson("videos.json").catch(() => []),
          fetchJson("site.json").catch(() => ({})),
        ]);
        state.posts = Array.isArray(posts) ? posts : [];
        state.videos = Array.isArray(videos) ? videos : [];
        state.site = site && typeof site === "object" ? site : {};
        state.loaded = { posts: true, videos: true, site: true };

        // Update UI lists
        refreshPostSelect();
        refreshVideoSelect();
        fillSiteForm();

        setStatus(elPackStatus, "公開中のデータを読み込みました。編集して「更新パック」を書き出せます。", "ok");
      } catch (e) {
        setStatus(elPackStatus, "公開中データの読み込みに失敗しました。下の「ファイル読み込み」を使ってください。", "ng");
      }
    }

    $("#t_loadFromSite")?.addEventListener("click", loadFromSite);
    // Auto-load on Tools page (best-effort)
    loadFromSite();

    // ---- Import files (optional) ----
    const importZone = $("#t_packImportZone");
    initDropzone(importZone, async (files) => {
      try {
        for (const f of files) {
          const name = f.name;
          if (name === "posts.json") {
            state.posts = JSON.parse(await fileToText(f));
            state.loaded.posts = true;
          } else if (name === "videos.json") {
            state.videos = JSON.parse(await fileToText(f));
            state.loaded.videos = true;
          } else if (name === "site.json") {
            state.site = JSON.parse(await fileToText(f));
            state.loaded.site = true;
          } else if (name.startsWith("post-") && name.endsWith(".md")) {
            const t = await fileToText(f);
            state.files.set(name, new TextEncoder().encode(t));
          } else if (/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)$/i.test(name) || name.startsWith("video-") || name.startsWith("img-") || name.startsWith("poster-")) {
            state.files.set(name, await fileToUint8(f));
          }
        }
        refreshPostSelect();
        refreshVideoSelect();
        fillSiteForm();
        setStatus(elPackStatus, "ファイルを読み込みました。", "ok");
      } catch (e) {
        setStatus(elPackStatus, "読み込みに失敗しました（JSONが壊れている可能性があります）。", "ng");
      }
    });

    // ---- Blog tool ----
    const postSel = $("#t_postSelect");
    const elTitle = $("#t_postTitle");
    const elSlug = $("#t_postSlug");
    const elDate = $("#t_postDate");
    const elTags = $("#t_postTags");
    const elExcerpt = $("#t_postExcerpt");
    const elBody = $("#t_postBody");
    const elPostStatus = $("#t_postStatus");
    const btnSavePost = $("#t_savePost");
    const btnPreviewPost = $("#t_previewPost");
    const previewArea = $("#t_postPreview");
    const imgInput = $("#t_postImages");

    function refreshPostSelect() {
      if (!postSel) return;
      const items = (state.posts || []).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
      postSel.innerHTML = `<option value="">（新規）</option>` + items.map(p => `<option value="${escapeHtml(p.slug)}">${escapeHtml(p.title || p.slug)}</option>`).join("");
    }

    async function loadPostIntoForm(slug) {
      const p = (state.posts || []).find(x => x.slug === slug);
      if (!p) return;
      if (elTitle) elTitle.value = p.title || "";
      if (elSlug) elSlug.value = p.slug || "";
      if (elDate) elDate.value = p.date || "";
      if (elTags) elTags.value = (p.tags || []).join(", ");
      if (elExcerpt) elExcerpt.value = p.excerpt || "";
      if (elBody) {
        const fn = `post-${p.slug}.md`;
        // Prefer locally imported/edited version; otherwise fetch from site
        if (state.files.has(fn)) {
          elBody.value = new TextDecoder().decode(state.files.get(fn));
        } else {
          try {
            elBody.value = await fetchText(fn);
          } catch (_) {
            elBody.value = `# ${p.title || p.slug}\n\n本文を書いてください。\n`;
          }
        }
      }
      setStatus(elPostStatus, "記事を読み込みました。編集して保存できます。", "ok");
    }

    postSel?.addEventListener("change", async () => {
      const slug = postSel.value;
      if (!slug) {
        // new
        if (elTitle) elTitle.value = "";
        if (elSlug) elSlug.value = "";
        if (elDate) elDate.value = TODAY_ISO();
        if (elTags) elTags.value = "";
        if (elExcerpt) elExcerpt.value = "";
        if (elBody) elBody.value = "";
        if (previewArea) previewArea.innerHTML = "";
        return;
      }
      await loadPostIntoForm(slug);
    });

    if (elDate && !elDate.value) elDate.value = TODAY_ISO();

    btnSavePost?.addEventListener("click", async () => {
      try {
        const title = String(elTitle?.value || "").trim();
        if (!title) return setStatus(elPostStatus, "タイトルを入力してください。", "ng");
        const slugIn = String(elSlug?.value || "").trim();
        const slug = normalizeSlug(slugIn) || makeSafeSlug(title);
        const date = String(elDate?.value || "").trim() || TODAY_ISO();
        const tags = parseCSVTags(elTags?.value || "");
        let body = String(elBody?.value || "").trim();
        if (!body) body = `# ${title}\n\n本文を書いてください。\n`;

        const readMinutes = estimateReadMinutes(body);
        let excerpt = String(elExcerpt?.value || "").trim();
        if (!excerpt) excerpt = excerptFromMd(body);

        const entry = { slug, title, date, readMinutes, excerpt, tags };

        // Upsert posts
        const idx = state.posts.findIndex(p => p.slug === slug);
        if (idx >= 0) state.posts[idx] = entry;
        else state.posts.unshift(entry);

        // Save markdown file in changed files
        const mdName = `post-${slug}.md`;
        const mdBytes = new TextEncoder().encode(body.endsWith("\n") ? body : body + "\n");
        state.files.set(mdName, mdBytes);

        // Update fields with normalized slug
        if (elSlug) elSlug.value = slug;
        refreshPostSelect();
        if (postSel) postSel.value = slug;

        setStatus(elPostStatus, `保存しました：${mdName} / posts.json（読了目安 ${readMinutes} 分）`, "ok");
        setStatus(elPackStatus, "更新パックに変更が追加されました。", "ok");
      } catch (e) {
        setStatus(elPostStatus, "保存に失敗しました。", "ng");
      }
    });

    btnPreviewPost?.addEventListener("click", () => {
      if (!previewArea) return;
      const body = String(elBody?.value || "");
      previewArea.innerHTML = markdownToHtml(body);
      initReveal();
    });

    // Images for post: auto-named and inserted into markdown
    imgInput?.addEventListener("change", async () => {
      const files = Array.from(imgInput.files || []);
      if (!files.length) return;
      const slug = normalizeSlug(String(elSlug?.value || "").trim()) || makeSafeSlug(String(elTitle?.value || "post"));
      if (elSlug) elSlug.value = slug;

      let n = 1;
      // find next index
      for (const name of state.files.keys()) {
        const m = name.match(new RegExp(`^img-${slug}-(\\d+)\\.`));
        if (m) n = Math.max(n, Number(m[1]) + 1);
      }

      let mdAdd = "";
      for (const f of files) {
        const ext = (f.name.split(".").pop() || "png").toLowerCase();
        const safeExt = ["png","jpg","jpeg","webp","gif"].includes(ext) ? ext : "png";
        const fname = `img-${slug}-${String(n).padStart(2,"0")}.${safeExt}`;
        n++;
        state.files.set(fname, await fileToUint8(f));
        mdAdd += `\n\n![${f.name} ](${fname})\n`;
      }

      if (elBody) elBody.value = (String(elBody.value || "") + mdAdd).trimStart();
      setStatus(elPostStatus, "画像を追加しました（本文末にリンクを挿入）。保存すると更新パックに入ります。", "ok");
      imgInput.value = "";
    });

    // ---- Video tool ----
    const vidSel = $("#t_videoSelect");
    const vidType = $("#t_videoType");
    const vidTitle = $("#t_videoTitle");
    const vidSlug = $("#t_videoSlug");
    const vidDate = $("#t_videoDate");
    const ytUrl = $("#t_ytUrl");
    const fileVideo = $("#t_videoFile");
    const filePoster = $("#t_posterFile");
    const vidStatus = $("#t_videoStatus");
    const btnSaveVideo = $("#t_saveVideo");

    function refreshVideoSelect() {
      if (!vidSel) return;
      const items = (state.videos || []).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
      const label = (v) => v.title || (v.youtubeId || v.id || v.src || "video");
      const val = (v) => (v.youtubeId || v.id || v.src || "");
      vidSel.innerHTML = `<option value="">（新規）</option>` + items.map((v,ix)=>`<option value="${escapeHtml(String(ix))}">${escapeHtml(label(v))}</option>`).join("");
    }

    function fillVideoForm(v) {
      if (!v) return;
      const isFile = v.type === "file" || !!v.src;
      if (vidType) vidType.value = isFile ? "file" : "youtube";
      if (vidTitle) vidTitle.value = v.title || "";
      if (vidDate) vidDate.value = v.date || TODAY_ISO();
      if (isFile) {
        if (vidSlug) vidSlug.value = (v.slug || "").replace(/^video-/, "").replace(/\.[^.]+$/, "");
        if (ytUrl) ytUrl.value = "";
      } else {
        if (ytUrl) ytUrl.value = v.url || (v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : "");
      }
    }

    vidSel?.addEventListener("change", () => {
      const v = state.videos[Number(vidSel.value)] || null;
      if (!v) {
        if (vidTitle) vidTitle.value = "";
        if (vidSlug) vidSlug.value = "";
        if (vidDate) vidDate.value = TODAY_ISO();
        if (ytUrl) ytUrl.value = "";
        if (fileVideo) fileVideo.value = "";
        if (filePoster) filePoster.value = "";
        return;
      }
      fillVideoForm(v);
      setStatus(vidStatus, "動画を読み込みました。編集して保存できます。", "ok");
    });

    if (vidDate && !vidDate.value) vidDate.value = TODAY_ISO();

    // Toggle UI blocks
    function refreshVideoTypeUI() {
      const t = vidType?.value || "youtube";
      $("#t_blockYoutube")?.classList.toggle("hidden", t !== "youtube");
      $("#t_blockFile")?.classList.toggle("hidden", t !== "file");
    }
    vidType?.addEventListener("change", refreshVideoTypeUI);
    refreshVideoTypeUI();

    btnSaveVideo?.addEventListener("click", async () => {
      try {
        const type = String(vidType?.value || "youtube");
        const title = String(vidTitle?.value || "").trim();
        const date = String(vidDate?.value || "").trim() || TODAY_ISO();

        if (type === "youtube") {
          const url = String(ytUrl?.value || "").trim();
          const yid = getYoutubeId(url);
          if (!yid) return setStatus(vidStatus, "YouTube URLが不正です。", "ng");
          const entry = { type: "youtube", youtubeId: yid, title: title || "YouTube", date, url };
          state.videos.unshift(entry);
          refreshVideoSelect();
          setStatus(vidStatus, "YouTube動画を保存しました。videos.json が更新パックに入ります。", "ok");
          setStatus(elPackStatus, "更新パックに変更が追加されました。", "ok");
          return;
        }

        // local file
        const f = (fileVideo?.files || [])[0];
        if (!f) return setStatus(vidStatus, "動画ファイル（mp4/webm）を選んでください。", "ng");
        const baseSlug = normalizeSlug(String(vidSlug?.value || "").trim()) || makeSafeSlug(title || "video");
        if (vidSlug) vidSlug.value = baseSlug;

        const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
        const safeExt = ["mp4", "webm", "mov"].includes(ext) ? ext : "mp4";
        const videoName = `video-${baseSlug}.${safeExt}`;
        state.files.set(videoName, await fileToUint8(f));

        let posterName = "";
        const p = (filePoster?.files || [])[0];
        if (p) {
          const pext = (p.name.split(".").pop() || "jpg").toLowerCase();
          const safePext = ["png", "jpg", "jpeg", "webp"].includes(pext) ? pext : "jpg";
          posterName = `poster-${baseSlug}.${safePext}`;
          state.files.set(posterName, await fileToUint8(p));
        }

        const entry = { type: "file", src: videoName, poster: posterName, title: title || baseSlug, date };
        state.videos.unshift(entry);

        refreshVideoSelect();
        setStatus(vidStatus, `保存しました：${videoName}${posterName ? " / " + posterName : ""}`, "ok");
        setStatus(elPackStatus, "更新パックに変更が追加されました。", "ok");
      } catch (e) {
        setStatus(vidStatus, "保存に失敗しました。", "ng");
      }
    });

    // ---- Site settings tool ----
    const elEmail = $("#t_siteEmail");
    const elSubject = $("#t_siteSubject");
    const elBodyTpl = $("#t_siteBody");
    const elMode = $("#t_contactMode");
    const elFormUrl = $("#t_formUrl");
    const siteStatus = $("#t_siteStatus");
    const btnSaveSite = $("#t_saveSite");

    function fillSiteForm() {
      const cfg = state.site || {};
      if (elEmail) elEmail.value = cfg.contactEmailEnc ? b64revDecode(cfg.contactEmailEnc) : String(cfg.contact_email || "").trim();
      if (elSubject) elSubject.value = String(cfg.contactSubject || "");
      if (elBodyTpl) elBodyTpl.value = String(cfg.contactBodyTemplate || "");
      if (elMode) elMode.value = String(cfg.contactMode || "mailto");
      if (elFormUrl) elFormUrl.value = String(cfg.googleFormEmbedUrl || "");
    }

    btnSaveSite?.addEventListener("click", () => {
      try {
        const emailPlain = String(elEmail?.value || "").trim();
        const subject = String(elSubject?.value || "").trim() || "翠山海翔サイトからのメッセージ";
        const body = String(elBodyTpl?.value || "").trim() || "こんにちは！\n\n（ここにメッセージを書いてください）\n";
        const mode = String(elMode?.value || "mailto");
        const formUrl = String(elFormUrl?.value || "").trim();

        const next = {
          ...(state.site || {}),
          contactMode: mode,
          contactSubject: subject,
          contactBodyTemplate: body.endsWith("\n") ? body : body + "\n",
          contactEmailEnc: emailPlain ? b64revEncode(emailPlain) : "",
          contact_email: "", // keep blank to discourage plain-text in repo
          googleFormEmbedUrl: formUrl,
        };
        state.site = next;

        setStatus(siteStatus, "site.json を更新しました（更新パックに入ります）。", "ok");
        setStatus(elPackStatus, "更新パックに変更が追加されました。", "ok");
      } catch (_) {
        setStatus(siteStatus, "site.json の更新に失敗しました。", "ng");
      }
    });

    // ---- Pack export ----
    const btnDlPack = $("#t_downloadPack");
    const btnDlPosts = $("#t_downloadPosts");
    const btnDlVideos = $("#t_downloadVideos");
    const btnDlSite = $("#t_downloadSite");
    const btnWriteFolder = $("#t_writeFolder");

    function buildJsonBytes(obj) {
      const clean = JSON.parse(JSON.stringify(obj));
      return new TextEncoder().encode(JSON.stringify(clean, null, 2) + "\n");
    }

    function collectPackEntries() {
      const entries = [];
      // Always include these 3 (even if unchanged), because they define navigation.
      entries.push({ name: "posts.json", data: buildJsonBytes(state.posts || []) });
      entries.push({ name: "videos.json", data: buildJsonBytes(state.videos || []) });
      entries.push({ name: "site.json", data: buildJsonBytes(state.site || {}) });

      // Include changed/new files only
      for (const [name, data] of state.files.entries()) {
        entries.push({ name, data });
      }
      return entries;
    }

    btnDlPack?.addEventListener("click", () => {
      const entries = collectPackEntries();
      const zipBytes = buildZipStore(entries);
      const date = TODAY_ISO().replaceAll("-", "");
      const blob = new Blob([zipBytes], { type: "application/zip" });
      downloadBlob(`honnki-update-${date}.zip`, blob);
      setStatus(elPackStatus, "更新パック（ZIP）を作成しました。ZIPを展開してGitHubにアップロードしてください。", "ok");
    });

    btnDlPosts?.addEventListener("click", () => downloadBlob("posts.json", new Blob([buildJsonBytes(state.posts || [])], { type: "application/json" })));
    btnDlVideos?.addEventListener("click", () => downloadBlob("videos.json", new Blob([buildJsonBytes(state.videos || [])], { type: "application/json" })));
    btnDlSite?.addEventListener("click", () => downloadBlob("site.json", new Blob([buildJsonBytes(state.site || {})], { type: "application/json" })));

    // Optional: write files directly into a local folder (Chrome/Edge)
    btnWriteFolder?.addEventListener("click", async () => {
      if (!("showDirectoryPicker" in window)) {
        return alert("この機能はChrome/Edgeなどの一部ブラウザのみ対応です。ZIPを書き出してください。");
      }
      try {
        // @ts-ignore
        const dir = await window.showDirectoryPicker({ mode: "readwrite" });
        const entries = collectPackEntries();
        for (const ent of entries) {
          const handle = await dir.getFileHandle(ent.name, { create: true });
          const w = await handle.createWritable();
          await w.write(ent.data);
          await w.close();
        }
        setStatus(elPackStatus, "選択したフォルダへ書き出しました。Gitでcommit/push するか、GitHubへアップロードしてください。", "ok");
      } catch (_) {
        setStatus(elPackStatus, "フォルダ書き出しを中断しました。", "ng");
      }
    });
  }

  // -------- Simple reveal animation --------
  function initReveal() {
    const els = $$("[data-reveal]");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
  }

  function initChapters() {
    const sections = $$("[data-chapter]");
    if (!sections.length) return;

    const rail = document.createElement("nav");
    rail.className = "chapterRail";
    rail.setAttribute("aria-label", "ページの章");

    const dots = sections.map((sec, idx) => {
      const btn = document.createElement("button");
      btn.className = "chapterDot";
      btn.type = "button";
      btn.title = sec.getAttribute("data-chapter-label") || `Chapter ${idx + 1}`;
      btn.addEventListener("click", () => sec.scrollIntoView({ behavior: "smooth", block: "start" }));
      rail.appendChild(btn);
      return btn;
    });

    document.body.appendChild(rail);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = sections.indexOf(e.target);
            dots.forEach((d) => d.classList.toggle("is-active", d === dots[idx]));
          }
        }
      },
      { threshold: 0.5 }
    );
    sections.forEach((s) => io.observe(s));
  }

  // Boot
  function boot() {
    setYears();

    const page = document.body?.dataset?.page || "";
    if (page === "blog-index") pageBlogIndex();
    if (page === "blog-post") pageBlogPost();
    if (page === "videos") pageVideos();
    if (page === "contact") pageContact();
    if (page === "tools") pageTools();

    initReveal();
    initChapters();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
