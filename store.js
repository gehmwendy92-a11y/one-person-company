/* ============================================================
 * store.js —— 数据层
 * ------------------------------------------------------------
 * 后台和前台都通过这个文件读写数据。
 * 它会自动判断用哪种模式：
 *
 *   config.js 里填了 Supabase  →  云端模式（数据存 Supabase）
 *   config.js 里留空           →  本地模式（数据存浏览器 localStorage）
 *
 * 两种模式下，调用方式完全一样，界面也完全一样。
 * ============================================================ */

(function () {
  'use strict';

  const CFG  = window.WB_CONFIG || {};
  const SEED = window.WB_SEED   || {};

  const LS_DB      = 'wb_db_v1';
  const LS_SESSION = 'wb_session_v1';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  const CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  let sb = null;          // supabase client
  let session = null;     // 当前登录态 { email }
  const listeners = [];

  /* ============================================================
   * 基础工具
   * ============================================================ */
  function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function nowISO() { return new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('脚本加载失败：' + src));
      document.head.appendChild(s);
    });
  }

  /* ============================================================
   * 本地存储读写
   * ============================================================ */
  function readDB() {
    try { return JSON.parse(localStorage.getItem(LS_DB)) || {}; }
    catch (e) { return {}; }
  }
  function writeDB(db) {
    try { localStorage.setItem(LS_DB, JSON.stringify(db)); }
    catch (e) { console.warn('本地存储写入失败', e); }
  }

  /* ============================================================
   * 首次进入：把 seed.js 的内容装进数据库
   * ============================================================ */
  async function seedIfEmpty() {
    const db = readDB();
    if (db.__seeded) return db;

    const fresh = {
      __seeded: true,
      __version: 1,
      profile:  Object.assign({ id: 1 }, clone(SEED.profile  || {})),
      about:    Object.assign({ id: 1 }, clone(SEED.about    || {})),
      services: (SEED.services || []).map((s, i) => Object.assign({ id: uid(), sort_order: i }, clone(s))),
      articles: [],
      leads:    []
    };

    // 文章正文：从 .md 文件读进来
    const files = SEED.articleFiles || [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let content = '';
      try {
        const res = await fetch(f.file, { cache: 'no-store' });
        if (res.ok) content = await res.text();
      } catch (e) { /* 忽略，正文留空即可 */ }

      fresh.articles.push({
        id: uid(),
        title: f.title,
        slug: f.file.replace(/\.md$/, ''),
        summary: f.summary,
        tags: f.tags || [],
        cover_text: f.cover_text || '',
        date: f.date || '',
        content: content,
        published: true,
        sort_order: i,
        created_at: nowISO()
      });
    }

    writeDB(fresh);
    return fresh;
  }

  /* ============================================================
   * 本地适配器
   * ============================================================ */
  const local = {

    async init() {
      await seedIfEmpty();
      try { session = JSON.parse(localStorage.getItem(LS_SESSION)) || null; } catch (e) { session = null; }
    },

    /* ---- 登录 ---- */
    async signIn(email, password) {
      const acc = CFG.localAccount || { email: 'monna@local', password: 'monna2026' };
      if (String(email).trim().toLowerCase() !== String(acc.email).toLowerCase() || password !== acc.password) {
        throw new Error('邮箱或密码不对。本地模式默认账号见 config.js');
      }
      session = { email: acc.email, mode: 'local' };
      localStorage.setItem(LS_SESSION, JSON.stringify(session));
      return session;
    },
    async signOut() {
      session = null;
      localStorage.removeItem(LS_SESSION);
    },
    currentUser() { return session; },
    isLoggedIn() { return !!session; },

    /* ---- 读 ---- */
    async list(table) {
      const db = readDB();
      let rows = (db[table] || []).slice();
      if (table === 'services') rows.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      if (table === 'articles') rows.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      if (table === 'leads')    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return rows;
    },
    async singleton(table) {
      const db = readDB();
      return Object.assign({ id: 1 }, clone(SEED[table] || {}), db[table] || {});
    },

    /* ---- 写 ---- */
    async create(table, row) {
      const db = readDB();
      if (!db[table]) db[table] = [];
      const item = Object.assign({ id: uid(), created_at: nowISO() }, clone(row));
      db[table].push(item);
      writeDB(db);
      return item;
    },
    async update(table, id, patch) {
      const db = readDB();
      if (table === 'profile' || table === 'about') {
        db[table] = Object.assign({ id: 1 }, db[table] || {}, clone(patch));
        writeDB(db);
        return db[table];
      }
      const arr = db[table] || [];
      const i = arr.findIndex(r => r.id === id);
      if (i < 0) throw new Error('没找到要修改的记录');
      arr[i] = Object.assign({}, arr[i], clone(patch), { id });
      db[table] = arr;
      writeDB(db);
      return arr[i];
    },
    async remove(table, id) {
      const db = readDB();
      db[table] = (db[table] || []).filter(r => r.id !== id);
      writeDB(db);
    },
    async saveSingleton(table, obj) {
      const db = readDB();
      db[table] = Object.assign({ id: 1 }, clone(SEED[table] || {}), db[table] || {}, clone(obj));
      writeDB(db);
      return db[table];
    }
  };

  /* ============================================================
   * 云端适配器（Supabase）
   * ============================================================ */
  const cloud = {

    async init() {
      await loadScript(SUPABASE_CDN);
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error('Supabase 客户端加载失败，请检查网络后刷新');
      }
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

      const { data } = await sb.auth.getSession();
      if (data && data.session && data.session.user) {
        session = { email: data.session.user.email, mode: 'cloud' };
      } else {
        session = null;
      }
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: password });
      if (error) throw new Error(translateAuthError(error.message));
      session = { email: data.user.email, mode: 'cloud' };
      return session;
    },
    async signOut() {
      await sb.auth.signOut();
      session = null;
    },
    currentUser() { return session; },
    isLoggedIn() { return !!session; },

    async list(table) {
      let q = sb.from(table).select('*');
      if (table === 'services') q = q.order('sort_order', { ascending: true });
      if (table === 'articles') q = q.order('sort_order', { ascending: true });
      if (table === 'leads')    q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw new Error('读取 ' + table + ' 失败：' + error.message);
      return data || [];
    },

    async singleton(table) {
      const { data, error } = await sb.from(table).select('*').eq('id', 1).maybeSingle();
      if (error) throw new Error('读取 ' + table + ' 失败：' + error.message);
      return Object.assign({ id: 1 }, clone(SEED[table] || {}), data || {});
    },

    async create(table, row) {
      const { data, error } = await sb.from(table).insert([row]).select().single();
      if (error) throw new Error('新增失败：' + error.message);
      return data;
    },

    async update(table, id, patch) {
      const { data, error } = await sb.from(table).update(patch).eq('id', id).select().single();
      if (error) throw new Error('保存失败：' + error.message);
      return data;
    },

    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw new Error('删除失败：' + error.message);
    },

    async saveSingleton(table, obj) {
      const payload = Object.assign({}, obj, { id: 1 });
      const { data, error } = await sb.from(table).upsert(payload).select().single();
      if (error) throw new Error('保存失败：' + error.message);
      return data;
    }
  };

  function translateAuthError(msg) {
    const m = String(msg || '');
    if (/Invalid login credentials/i.test(m)) return '邮箱或密码不对';
    if (/Email not confirmed/i.test(m))       return '邮箱还没验证，请先去邮箱点确认链接';
    if (/rate limit/i.test(m))                return '尝试太频繁，等 1 分钟再试';
    return m || '登录失败';
  }

  /* ============================================================
   * 对外 API
   * ============================================================ */
  const Store = {

    get mode()      { return CLOUD ? 'cloud' : 'local'; },
    get isCloud()   { return CLOUD; },

    async init() {
      if (CLOUD) await cloud.init();
      else       await local.init();
      return this;
    },

    /* ---- 登录 ---- */
    signIn:  (e, p) => (CLOUD ? cloud : local).signIn(e, p),
    signOut: ()     => (CLOUD ? cloud : local).signOut(),
    currentUser() { return (CLOUD ? cloud : local).currentUser(); },
    isLoggedIn()  { return (CLOUD ? cloud : local).isLoggedIn(); },

    /* ---- 读 ---- */
    list:      (t)    => (CLOUD ? cloud : local).list(t),
    singleton: (t)    => (CLOUD ? cloud : local).singleton(t),

    /* ---- 写 ---- */
    create:        (t, row)   => (CLOUD ? cloud : local).create(t, row),
    update:        (t, id, p) => (CLOUD ? cloud : local).update(t, id, p),
    remove:        (t, id)    => (CLOUD ? cloud : local).remove(t, id),
    saveSingleton: (t, obj)   => (CLOUD ? cloud : local).saveSingleton(t, obj),

    /* ---- 前台专用：一次拿全（读失败不抛错，前台保持静态内容） ---- */
    async loadAll() {
      try {
        const [profile, services, articles, about] = await Promise.all([
          this.singleton('profile'),
          this.list('services'),
          this.list('articles'),
          this.singleton('about')
        ]);
        return {
          ok: true,
          profile,
          about,
          services: services.filter(s => s.visible !== false),
          articles: articles.filter(a => a.published !== false)
        };
      } catch (e) {
        console.warn('[store] 前台数据加载失败，回退到静态内容：', e.message);
        return { ok: false };
      }
    },

    /* ---- 重置本地数据（后台里有个按钮会用到） ---- */
    resetLocal() {
      localStorage.removeItem(LS_DB);
    },

    /* ---- 事件 ---- */
    onChange(fn) { listeners.push(fn); },
    emitChange(table) { listeners.forEach(fn => { try { fn(table); } catch (e) {} }); }
  };

  window.WBStore = Store;
})();
