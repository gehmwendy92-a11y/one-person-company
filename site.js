/* ============================================================
 * site.js —— 前台渲染
 * ------------------------------------------------------------
 * 作用：页面打开时，从数据层读最新内容，替换掉页面里的静态文字。
 *
 * 安全机制：只要数据没读到（没配 Supabase、网络问题等），
 * 页面就保持原来的静态内容，绝不会变成空白。
 * ============================================================ */

(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br/>'); }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  function setText(sel, val) {
    if (val == null || val === '') return;
    $$(sel).forEach(el => { el.textContent = val; });
  }
  function setHTML(sel, val) {
    if (val == null || val === '') return;
    $$(sel).forEach(el => { el.innerHTML = val; });
  }
  function setSrc(sel, val) {
    if (val == null || val === '') return;
    $$(sel).forEach(el => { if (el.tagName === 'IMG') el.src = val; });
  }

  /* ---------- 埋点：访客行为记录（存后台「访问数据统计」模块） ---------- */
  function pageName() {
    return (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, '');
  }
  function track(type, label) {
    try {
      if (!window.WBStore) return;
      window.WBStore.create('events', {
        type: String(type || 'custom'),
        page: pageName(),
        label: String(label || '').slice(0, 120),
        referrer: String(document.referrer || '').slice(0, 200)
      }).catch(function () { /* 埋点失败不影响访客浏览 */ });
    } catch (e) { /* 静默 */ }
  }
  window.WBTrack = track;   // 以后想埋新点，任何地方调 WBTrack('事件名','标签') 即可

  /* ---------- 全局品牌（所有页面共用） ---------- */
  function renderBrand(d) {
    const p = d.profile || {};
    setText('[data-wb="site-name"]', p.site_name);
    setSrc('[data-wb="logo-img"]', p.logo_url);
    $$('[data-wb="logo-img"]').forEach(img => {
      if (p.site_name) img.alt = p.site_name;
    });
  }

  /* ---------- 图标 ---------- */
  const SERVICE_ICONS = {
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  };
  const VALUE_ICONS = {
    question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    check:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    heart:    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    chart:    '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    globe:    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    people:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };
  function svg(path, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  /* ---------- 封面渐变调色板 ---------- */
  const GRADIENTS = [
    'linear-gradient(135deg,#007c40,#00a85a)',
    'linear-gradient(135deg,#005a2d,#007c40)',
    'linear-gradient(135deg,#00a85a,#005a2d)',
    'linear-gradient(135deg,#007c40,#003d22)',
    'linear-gradient(135deg,#00a85a,#007c40)',
    'linear-gradient(135deg,#005a2d,#00a85a)'
  ];
  function grad(i) { return GRADIENTS[i % GRADIENTS.length]; }

  /* ---------- Markdown ---------- */
  async function ensureMarked() {
    if (typeof window.marked !== 'undefined') return true;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      return true;
    } catch (e) { return false; }
  }
  async function md(text) {
    if (!text) return '';
    if (await ensureMarked()) return window.marked.parse(text, { gfm: true, breaks: false });
    return '<pre style="white-space:pre-wrap">' + esc(text) + '</pre>';
  }

  /* ---------- 文章卡片 ---------- */
  function articleCard(a, i) {
    const tags = arr(a.tags);
    const cover = a.cover_text
      ? String(a.cover_text).replace(/\n/g, '<br/>')
      : esc(String(a.title || '').slice(0, 6));
    const mins = Math.max(1, Math.round(String(a.content || '').length / 400));
    const hasCoverImg = a.cover_image_url && String(a.cover_image_url).trim();
    const coverStyle = hasCoverImg
      ? 'background-image: url(' + esc(hasCoverImg) + '); background-color: #000;'
      : 'background: ' + grad(i) + ';';
    const coverInner = hasCoverImg
      ? '<div class="article-cover-overlay"></div><div class="article-cover-text">' + cover + '</div>'
      : '<div class="article-cover-text">' + cover + '</div>';
    return '' +
      '<a href="article.html?slug=' + encodeURIComponent(a.slug || '') + '" data-tag="' + esc(tags[0] || '') + '" class="article-card fade-in visible">' +
        '<div class="article-cover' + (hasCoverImg ? ' has-image' : '') + '" style="' + coverStyle + '">' +
          coverInner +
        '</div>' +
        '<div class="article-body">' +
          '<div class="article-meta">' +
            (tags[0] ? '<span class="tag">' + esc(tags[0]) + '</span>' : '') +
            '<span>' + esc(a.date || String(a.created_at || '').slice(0, 10)) + '</span>' +
            '<span>· ' + mins + ' 分钟</span>' +
          '</div>' +
          '<h3>' + esc(a.title) + '</h3>' +
          '<p class="excerpt">' + esc(a.summary || '') + '</p>' +
          '<span class="read-more">阅读全文 →</span>' +
        '</div>' +
      '</a>';
  }

  /* ============================================================
   * 各页面渲染
   * ============================================================ */

  /* ---------- 首页 ---------- */
  function renderHome(d) {
    const p = d.profile || {};

    setText('[data-wb="hero-tag-text"]', p.hero_tag);
    setText('[data-wb="hero-title"]', p.hero_title);
    setHTML('[data-wb="hero-subtitle"]', nl2br(p.hero_subtitle));
    setText('[data-wb="cta-primary"]', p.cta_primary);
    setText('[data-wb="cta-secondary"]', p.cta_secondary);
    setText('[data-wb="cta-title"]', p.cta_title);
    setHTML('[data-wb="cta-desc"]', nl2br(p.cta_desc));

    /* 首屏右侧大图 */
    const heroVisual = $('[data-wb="hero-image"]');
    if (heroVisual) {
      if (p.hero_image_url) {
        heroVisual.innerHTML = '<img src="' + esc(p.hero_image_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);display:block;">';
        heroVisual.classList.add('has-image');
      } else {
        heroVisual.innerHTML = '<div class="hero-visual-text"><div class="big">一个人<br/>一家公司</div><div class="small">SOLO · BUILDER · SHARE</div></div>';
        heroVisual.classList.remove('has-image');
      }
    }

    /* 数据统计 */
    const stats = arr(p.stats);
    const statsBox = $('[data-wb="stats"]');
    if (statsBox && stats.length) {
      statsBox.innerHTML = stats.map(s =>
        '<div class="stat-item"><div class="number">' + esc(s.number) + '</div>' +
        '<div class="label">' + esc(s.label) + '</div></div>'
      ).join('');
    }

    /* 服务卡片 */
    const sBox = $('[data-wb="services-home"]');
    if (sBox && d.services.length) {
      sBox.innerHTML = d.services.slice(0, 3).map(s => {
        const feats = arr(s.features).slice(0, 3);
        return '' +
        '<div class="service-card fade-in visible">' +
          '<div class="service-icon">' + svg(SERVICE_ICONS[s.icon] || SERVICE_ICONS.chat) + '</div>' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p>' + esc(s.description) + '</p>' +
          (feats.length ? '<ul class="service-features">' + feats.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul>' : '') +
          '<a href="services.html' + (s.anchor ? '#' + esc(s.anchor) : '') + '" class="more">了解更多 →</a>' +
        '</div>';
      }).join('');
    }

    /* 最近文章 */
    const aBox = $('[data-wb="articles-home"]');
    if (aBox && d.articles.length) {
      aBox.innerHTML = d.articles.slice(0, 3).map(articleCard).join('');
    }
  }

  /* ---------- 产品服务页 ---------- */
  function renderServices(d) {
    const p = d.profile || {};
    setHTML('[data-wb="services-hero-subtitle"]', nl2br(p.hero_subtitle));

    const box = $('[data-wb="services-detail"]');
    if (!box || !d.services.length) return;

    box.innerHTML = d.services.map((s, i) => {
      const feats = arr(s.features);
      const flip = i % 2 === 1;
      const visual =
        '<div class="hero-visual fade-in visible" style="aspect-ratio: auto; padding: var(--space-8); min-height: 320px;">' +
          '<div class="hero-visual-text">' +
            '<div class="big" style="font-size: 4rem;">' + esc(s.badge || '0' + (i + 1)) + '</div>' +
            '<div class="small">' + esc(s.badge_sub || 'SERVICE') + '</div>' +
          '</div>' +
        '</div>';
      const text =
        '<div class="fade-in visible">' +
          '<span class="section-eyebrow">Service 0' + (i + 1) + '</span>' +
          '<h2 style="margin-bottom: var(--space-4);">' + esc(s.title) + '</h2>' +
          '<p style="font-size: 1.05rem;">' + nl2br(s.description) + '</p>' +
          (feats.length ? '<ul class="service-features">' + feats.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul>' : '') +
          '<div style="display:flex;gap:var(--space-3);align-items:center;margin-top:var(--space-5);flex-wrap:wrap;">' +
            '<a href="booking.html" class="btn btn-primary">' + esc(s.cta || '立即预约') + '</a>' +
            (s.price ? '<span style="color:var(--text-muted);font-size:0.9rem;"><strong style="color:var(--brand);font-size:1.2rem;">' + esc(s.price) + '</strong></span>' : '') +
          '</div>' +
        '</div>';

      return '' +
      '<section class="section" id="' + esc(s.anchor || ('s' + i)) + '"' + (flip ? ' style="background: var(--bg-soft);"' : '') + '>' +
        '<div class="container">' +
          '<div style="display:grid;grid-template-columns:' + (flip ? '1.2fr 1fr' : '1fr 1.2fr') + ';gap:var(--space-8);align-items:center;" class="about-grid">' +
            (flip ? text + visual : visual + text) +
          '</div>' +
        '</div>' +
      '</section>';
    }).join('');
  }

  /* ---------- 关于我 ---------- */
  async function renderAbout(d) {
    const a = d.about || {};

    setHTML('[data-wb="about-hero-title"]', a.hero_title ? esc(a.hero_title) : '');
    setHTML('[data-wb="about-hero-subtitle"]', nl2br(a.hero_subtitle));
    setText('[data-wb="about-photo-title"]', a.photo_title);
    setHTML('[data-wb="about-photo-sub"]', nl2br(a.photo_sub));
    setText('[data-wb="about-story-title"]', a.story_title);

    const storyBox = $('[data-wb="about-story"]');
    if (storyBox && a.story) storyBox.innerHTML = await md(a.story);

    const tl = arr(a.timeline);
    const tlBox = $('[data-wb="about-timeline"]');
    if (tlBox && tl.length) {
      tlBox.innerHTML = tl.map(t =>
        '<li><span class="year">' + esc(t.year) + '</span>' +
        '<h4>' + esc(t.title) + '</h4>' +
        '<p>' + esc(t.desc) + '</p></li>'
      ).join('');
    }

    const vals = arr(a.values);
    const vBox = $('[data-wb="about-values"]');
    if (vBox && vals.length) {
      vBox.innerHTML = vals.map(v =>
        '<div class="value-card fade-in visible">' +
          '<div class="value-icon">' + svg(VALUE_ICONS[v.icon] || VALUE_ICONS.question) + '</div>' +
          '<h4>' + esc(v.title) + '</h4>' +
          '<p>' + esc(v.desc) + '</p>' +
        '</div>'
      ).join('');
    }

    const tools = arr(a.tools);
    const tBox = $('[data-wb="about-tools"]');
    if (tBox && tools.length) {
      tBox.innerHTML = tools.map(t =>
        '<div class="service-card fade-in visible">' +
          '<div class="service-icon">' + esc(t.icon || '🛠') + '</div>' +
          '<h3>' + esc(t.name) + '</h3>' +
          '<p>' + esc(t.desc) + '</p>' +
        '</div>'
      ).join('');
    }
  }

  /* ---------- 联系我模块（关于我 / 预约页共用） ---------- */
  function renderContact(d) {
    const p = d.profile || {};
    const wechat = String(p.wechat || '').trim();
    const email  = String(p.contact_email || '').trim();
    if (!wechat && !email) return;   // 后台没填 → 模块保持隐藏

    $$('[data-wb="contact-box"]').forEach(box => {
      const wItem = box.querySelector('[data-wb="contact-wechat-item"]');
      const eItem = box.querySelector('[data-wb="contact-email-item"]');

      if (wItem) {
        wItem.style.display = wechat ? '' : 'none';
        const el = wItem.querySelector('[data-wb="contact-wechat"]');
        if (el && wechat) el.textContent = wechat;
        wItem.style.cursor = 'pointer';
        wItem.addEventListener('click', () => track('contact_click', '微信:' + wechat));
      }
      if (eItem) {
        eItem.style.display = email ? '' : 'none';
        const el = eItem.querySelector('[data-wb="contact-email"]');
        if (el && email) { el.textContent = email; el.href = 'mailto:' + email; }
        eItem.addEventListener('click', () => track('contact_click', '邮箱:' + email));
      }
      box.hidden = false;
    });
  }

  /* ---------- 文章列表 ---------- */
  function renderArticleList(d) {
    const list = $('[data-wb="articles-list"]');
    const bar  = $('[data-wb="filter-bar"]');

    if (bar && d.articles.length) {
      const tags = [];
      d.articles.forEach(a => arr(a.tags).forEach(t => { if (t && tags.indexOf(t) < 0) tags.push(t); }));
      bar.innerHTML = '<button class="filter-btn active" data-filter="all">全部</button>' +
        tags.map(t => '<button class="filter-btn" data-filter="' + esc(t) + '">' + esc(t) + '</button>').join('');
    }

    if (list && d.articles.length) {
      list.innerHTML = d.articles.map(articleCard).join('');
    }

    /* 重新绑定筛选 */
    const buttons = $$('.filter-btn');
    const cards   = $$('[data-tag]');
    buttons.forEach(btn => {
      btn.onclick = () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tag = btn.dataset.filter;
        cards.forEach(c => { c.style.display = (tag === 'all' || c.dataset.tag === tag) ? '' : 'none'; });
      };
    });
  }

  /* ---------- 预约表单 → 写入线索 ---------- */
  function bindBooking() {
    const form = $('#booking-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fd = new FormData(form);
      const lead = {
        name:     (fd.get('name') || '').trim(),
        contact:  (fd.get('contact') || '').trim(),
        service:  fd.get('service') || '',
        time_slot: fd.get('time') || '',
        city:     (fd.get('city') || '').trim(),
        topic:    (fd.get('topic') || '').trim(),
        source:   (fd.get('source') || '').trim(),
        status:   'new'
      };

      if (!lead.name || !lead.contact) return;

      const btn = form.querySelector('button[type="submit"]');
      const old = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }

      try {
        await window.WBStore.create('leads', lead);
        window.WBStore.emitChange('leads');
        track('lead_submit', lead.service || lead.name);
        const success = $('.form-success');
        if (success) {
          success.classList.add('show');
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => success.classList.remove('show'), 9000);
        }
        form.reset();
      } catch (err) {
        console.error(err);
        alert('提交失败了：' + err.message + '\n\n你也可以直接微信/邮件联系我。');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = old; }
      }
    });
  }

  /* ---------- 文章详情页 ---------- */
  async function renderArticleDetail(d) {
    const box = $('#markdown-container');
    if (!box) return;

    const params = new URLSearchParams(location.search);
    const slug   = params.get('slug');
    const file   = params.get('file');   // 兼容旧链接 article.html?file=post-1.md

    let article = null;
    if (slug) {
      article = (d.articles || []).find(a => a.slug === slug);
    } else if (file) {
      const key = file.replace(/\.md$/, '');
      article = (d.articles || []).find(a => a.slug === key);
    }

    if (!article) {
      /* 数据层里没有 → 回退到直接读 .md 文件（老链接继续可用） */
      if (file && /^[\w\-]+\.md$/.test(file)) {
        try {
          const res = await fetch(file);
          if (!res.ok) throw new Error();
          const text = await res.text();
          box.innerHTML = await md(text);
          const h1 = box.querySelector('h1');
          if (h1) document.title = h1.textContent + ' · 一人公司';
          setText('#meta-reading', Math.max(1, Math.round(text.length / 400)) + ' 分钟');
          return;
        } catch (e) { /* 继续往下报错 */ }
      }
      box.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:60px 0;">没有找到这篇文章。</p>';
      return;
    }

    setText('#article-title', article.title);
    setText('#article-subtitle', article.summary || '');
    setText('#meta-date', article.date || String(article.created_at || '').slice(0, 10));

    box.innerHTML = await md(article.content || '');
    document.title = article.title + ' · 一人公司';

    const mins = Math.max(1, Math.round(String(article.content || '').length / 400));
    setText('#meta-reading', mins + ' 分钟');
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  async function boot() {
    if (!window.WBStore) return;

    /* 预约表单先绑定（即使数据读不到，也要能提交/给反馈） */
    try { await window.WBStore.init(); } catch (e) { console.warn(e); }
    bindBooking();

    /* 埋点：每次打开页面都记一条 pageview（失败静默，不影响访客） */
    track('pageview', '');

    /* 埋点：点任何"去预约"按钮都记一条 */
    $$('a[href="booking.html"], a[href*="booking.html"]').forEach(a => {
      a.addEventListener('click', () => track('booking_click', '来自' + pageName() + '页'));
    });

    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    const d = await window.WBStore.loadAll();

    /* 全局品牌：所有页面都要换 logo 和网站名 */
    if (d.ok) renderBrand(d);

    /* 联系我模块：关于我 / 预约页都有，后台没填则不显示 */
    if (d.ok) renderContact(d);

    /* 文章详情页特殊处理：即使数据层读不到，也要能用 ?file= 直接读 .md 兜底 */
    if (page === 'article.html') {
      try { await renderArticleDetail(d.ok ? d : { articles: [] }); }
      catch (e) { console.warn('[site] 文章渲染出错：', e); }
      track('article_read', (new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('file') || '未知文章'));
      return;
    }

    if (!d.ok) return;   // 读不到 → 保留静态内容

    try {
      if (page === '' || page === 'index.html')  renderHome(d);
      else if (page === 'services.html')         renderServices(d);
      else if (page === 'about.html')            await renderAbout(d);
      else if (page === 'articles.html')         renderArticleList(d);
      /* booking.html 只需表单绑定，已在上面完成 */
    } catch (e) {
      console.warn('[site] 渲染出错，页面保持静态内容：', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
