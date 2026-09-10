/* ============================================================
 * admin.js —— 管理后台逻辑
 * ------------------------------------------------------------
 * 五个模块：
 *   1. 首页档案管理   （profile，单条）
 *   2. 产品服务管理   （services，多条）
 *   3. 关于我的介绍管理（about，单条）
 *   4. 我的文章管理   （articles，多条）
 *   5. 预约咨询线索管理（leads，多条）
 * ============================================================ */

(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const Store = window.WBStore;

  /* ============================================================
   * 小工具
   * ============================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  function uid() { return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function fmtTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return String(v).slice(0, 16);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
  }

  /* ============================================================
   * 表单控件生成
   * ============================================================ */
  function fText(name, label, value, hint, type) {
    return '<div class="field"><label>' + esc(label) + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</label>' +
      '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(value) + '" /></div>';
  }
  function fArea(name, label, value, rows, hint) {
    return '<div class="field"><label>' + esc(label) + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</label>' +
      '<textarea name="' + name + '" rows="' + (rows || 5) + '">' + esc(value) + '</textarea></div>';
  }
  function fCheck(name, label, checked) {
    return '<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
      '<input type="checkbox" name="' + name + '" style="width:auto;" ' + (checked ? 'checked' : '') + '/>' +
      '<span>' + esc(label) + '</span></label></div>';
  }

  /* 图片上传控件：支持填网址，或选择本地文件转 base64 */
  function fImage(name, label, value, hint, clearLabel) {
    const src = value || '';
    return '<div class="field" data-image-field="' + name + '">' +
      '<label>' + esc(label) + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</label>' +
      '<input type="text" name="' + name + '" value="' + esc(src) + '" placeholder="可填图片网址，或点击下方按钮上传本地图片" />' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;">' +
        '<label class="btn btn-ghost btn-sm" style="cursor:pointer;">' +
          '<input type="file" accept="image/*" data-file-for="' + name + '" style="display:none;" />' +
          '选择图片' +
        '</label>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-clear-image="' + name + '">' + esc(clearLabel || '清空图片') + '</button>' +
      '</div>' +
      '<div class="image-preview-wrap" style="margin-top:10px;' + (src ? '' : 'display:none;') + '">' +
        '<img data-preview-for="' + name + '" src="' + esc(src) + '" alt="预览" style="max-width:220px;max-height:140px;border-radius:8px;border:1px solid var(--border);object-fit:cover;" />' +
      '</div>' +
    '</div>';
  }
  function bindImageUploads(root) {
    $$('[data-file-for]', root).forEach(input => {
      input.addEventListener('change', () => {
        const name = input.dataset.fileFor;
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('图片不能超过 2MB'); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result;
          const textInput = root.querySelector('[name="' + name + '"]');
          if (textInput) textInput.value = url;
          updateImagePreview(root, name, url);
        };
        reader.readAsDataURL(file);
      });
    });
    $$('[data-clear-image]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.clearImage;
        const textInput = root.querySelector('[name="' + name + '"]');
        if (textInput) textInput.value = '';
        updateImagePreview(root, name, '');
      });
    });
    $$('[name="logo_url"],[name="hero_image_url"],[name="cover_image_url"]', root).forEach(input => {
      input.addEventListener('input', () => {
        updateImagePreview(root, input.name, input.value.trim());
      });
    });
  }
  function updateImagePreview(root, name, url) {
    const img = root.querySelector('[data-preview-for="' + name + '"]');
    const wrap = img && img.parentElement;
    if (!img) return;
    if (url) { img.src = url; if (wrap) wrap.style.display = ''; }
    else { img.src = ''; if (wrap) wrap.style.display = 'none'; }
  }

  /* 可增删的条目编辑器
   * fields: [{ key, ph, w }]  w: 'wide' 表示占满一行 */
  function repeatBox(name, items, fields, addLabel) {
    const rows = (items && items.length ? items : []).map(it => repeatRow(name, it, fields)).join('');
    return '<div class="field"><label>' + esc(addLabel || '条目') + '</label>' +
      '<div class="repeat-list" data-repeat="' + name + '">' + rows + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-add="' + name + '">＋ 添加一条</button></div>';
  }
  function repeatRow(name, item, fields) {
    const inner = fields.map(f => {
      const val = item ? (item[f.key] || '') : '';
      const cls = f.w === 'wide' ? ' style="flex:1 1 100%;"' : '';
      return '<input type="text" data-k="' + f.key + '" placeholder="' + esc(f.ph || '') + '" value="' + esc(val) + '"' + cls + ' />';
    }).join('');
    return '<div class="repeat-item" style="flex-wrap:wrap;">' + inner +
      '<button type="button" class="del" data-del-row>&times;</button></div>';
  }
  function collectRepeats(root, name, keys) {
    const box = root.querySelector('[data-repeat="' + name + '"]');
    if (!box) return [];
    return $$('.repeat-item', box).map(row => {
      const o = {};
      keys.forEach(k => { const el = row.querySelector('[data-k="' + k + '"]'); o[k] = el ? el.value.trim() : ''; });
      const hasValue = keys.some(k => o[k]);
      return hasValue ? o : null;
    }).filter(Boolean);
  }

  /* 绑定增删按钮（事件委托，全局一次） */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      const name = addBtn.dataset.add;
      const box = document.querySelector('[data-repeat="' + name + '"]');
      if (!box) return;
      const firstRow = box.querySelector('.repeat-item');
      if (!firstRow) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = firstRow.outerHTML;
      box.appendChild(tmp.firstElementChild);
      return;
    }
    const delBtn = e.target.closest('[data-del-row]');
    if (delBtn) {
      const row = delBtn.closest('.repeat-item');
      const box = row.parentElement;
      row.remove();
      if (!box.children.length && box.dataset.repeat) {
        // 至少保留一个空行，方便继续填
        box.insertAdjacentHTML('beforeend', box.dataset.lastRow || '');
      }
    }
  });

  /* ============================================================
   * 弹窗
   * ============================================================ */
  let modalSave = null;

  function openModal(title, bodyHTML, onSave, saveLabel) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHTML;
    $('#modal-foot').innerHTML =
      '<button class="btn btn-ghost" id="modal-cancel">取消</button>' +
      '<button class="btn btn-primary" id="modal-save">' + esc(saveLabel || '保存') + '</button>';
    $('#modal-mask').classList.add('show');
    modalSave = onSave;

    $('#modal-cancel').onclick = closeModal;
    $('#modal-close').onclick = closeModal;
    $('#modal-save').onclick = async () => {
      const btn = $('#modal-save');
      btn.disabled = true; btn.textContent = '保存中…';
      try {
        await modalSave($('#modal-body'));
        closeModal();
      } catch (err) {
        alert('保存失败：' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = saveLabel || '保存';
      }
    };

    // 记录空行模板
    $$('[data-repeat]').forEach(box => {
      const row = box.querySelector('.repeat-item');
      if (row) box.dataset.lastRow = row.outerHTML;
    });
  }
  function closeModal() {
    $('#modal-mask').classList.remove('show');
    modalSave = null;
  }
  $('#modal-mask').addEventListener('click', (e) => { if (e.target.id === 'modal-mask') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function confirmDelete(name, onYes) {
    if (!window.confirm('确定要删除「' + name + '」吗？\n删除后无法恢复。')) return;
    onYes();
  }

  /* ============================================================
   * 模块定义
   * ============================================================ */
  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    doc:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
  };
  function icon(p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }

  const MODULES = [
    { id: 'home',     label: '首页档案管理',      icon: ICONS.home,  desc: '首页的首屏文案、数据指标、行动按钮' },
    { id: 'services', label: '产品服务管理',      icon: ICONS.grid,  desc: '服务的名称、介绍、价格、包含内容' },
    { id: 'about',    label: '关于我的介绍管理',  icon: ICONS.user,  desc: '个人简介、成长故事、价值观、工具箱' },
    { id: 'articles', label: '我的文章管理',      icon: ICONS.doc,   desc: '文章的增删改查，支持 Markdown 正文' },
    { id: 'leads',    label: '预约咨询线索管理',  icon: ICONS.inbox, desc: '访客提交的预约信息，标记跟进状态' }
  ];

  let current = 'home';
  let counts = { leads: 0, articles: 0, services: 0 };

  /* ============================================================
   * 渲染框架
   * ============================================================ */
  function renderNav() {
    $('#side-nav').innerHTML = MODULES.map(m =>
      '<button data-mod="' + m.id + '" class="' + (m.id === current ? 'active' : '') + '">' +
        icon(m.icon) +
        '<span class="label">' + esc(m.label.replace(/管理$|的介绍管理$/, '')) + '</span>' +
        (m.id === 'leads' && counts.leads ? '<span class="nav-count">' + counts.leads + '</span>' : '') +
      '</button>'
    ).join('');

    $$('#side-nav button').forEach(b => {
      b.onclick = () => { current = b.dataset.mod; renderNav(); renderPage(); };
    });
  }

  function setHeader(title, desc, actionsHTML) {
    $('#page-title').textContent = title;
    $('#page-desc').textContent = desc || '';
    $('#page-actions').innerHTML = actionsHTML || '';
  }
  function loading() { $('#content').innerHTML = '<div class="loading"><div class="spinner"></div>正在加载…</div>'; }
  function error(msg) { $('#content').innerHTML = '<div class="notice notice-warn">加载失败：' + esc(msg) + '</div>'; }

  async function renderPage() {
    const mod = MODULES.find(m => m.id === current);
    setHeader(mod.label, mod.desc, '');
    loading();
    try {
      if (current === 'home')     await viewHome();
      if (current === 'services') await viewServices();
      if (current === 'about')    await viewAbout();
      if (current === 'articles') await viewArticles();
      if (current === 'leads')    await viewLeads();
    } catch (e) {
      error(e.message);
    }
  }

  /* ============================================================
   * 1. 首页档案管理
   * ============================================================ */
  async function viewHome() {
    const [p, services, articles, leads] = await Promise.all([
      Store.singleton('profile'),
      Store.list('services'),
      Store.list('articles'),
      Store.list('leads')
    ]);
    counts = { leads: leads.filter(l => (l.status || 'new') === 'new').length, articles: articles.length, services: services.length };
    renderNav();

    setHeader('首页档案管理', '首页的首屏文案、数据指标、行动按钮', '<button class="btn btn-ghost btn-sm" id="btn-reset">恢复初始内容</button>');
    $('#btn-reset').onclick = () => {
      if (!Store.isCloud && window.confirm('确定把首页档案恢复成网站最初的内容吗？')) {
        Store.resetLocal();
        location.reload();
      } else if (Store.isCloud) {
        alert('云端模式下请在下方直接修改并保存。');
      }
    };

    const stats = arr(p.stats);

    $('#content').innerHTML = '' +
      '<div class="mini-stats">' +
        '<div class="mini-stat"><div class="n">' + services.length + '</div><div class="l">产品服务</div></div>' +
        '<div class="mini-stat"><div class="n">' + articles.length + '</div><div class="l">已发文章</div></div>' +
        '<div class="mini-stat"><div class="n">' + leads.length + '</div><div class="l">预约线索</div></div>' +
        '<div class="mini-stat"><div class="n">' + counts.leads + '</div><div class="l">待处理</div></div>' +
      '</div>' +

      '<form id="form-profile">' +

        '<div class="card">' +
          '<div class="card-title">品牌与首屏</div>' +
          '<p class="card-desc">全站共用的 Logo、网站标题，以及首页右侧大图。</p>' +
          fText('site_name', '网站标题（导航/页脚显示）', p.site_name, '例如：一人公司') +
          fImage('logo_url', 'Logo 图片', p.logo_url, '建议正方形，32×32 以上即可') +
          fText('brand', '品牌名（后台登录页显示）', p.brand) +
          fImage('hero_image_url', '首页右侧大图', p.hero_image_url, '留空则显示默认的绿色文字卡片') +
          fText('hero_tag', '顶部小标签', p.hero_tag, '例如：独立教练 · 内容创作者') +
          fText('hero_title', '主标题', p.hero_title, '建议 12-20 字') +
          fArea('hero_subtitle', '副标题 / 自我介绍', p.hero_subtitle, 4, '换行会原样显示') +
          '<div class="field-row">' +
            fText('cta_primary', '主按钮文字', p.cta_primary) +
            fText('cta_secondary', '次按钮文字', p.cta_secondary) +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">数据指标</div>' +
          '<p class="card-desc">首页中间那排大数字，建议 2-4 条。</p>' +
          repeatBox('stats', stats, [
            { key: 'number', ph: '1200+' },
            { key: 'label',  ph: '公众号读者' }
          ], '数据条目') +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">底部行动区</div>' +
          '<p class="card-desc">首页最下方那个绿色渐变区块。</p>' +
          fText('cta_title', '标题', p.cta_title) +
          fArea('cta_desc', '说明文字', p.cta_desc, 3) +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">联系方式</div>' +
          '<p class="card-desc">填写后会显示在「关于我」和「预约对话」页面的"联系我"模块（邮箱会变成可点击的邮件链接）。两项都留空则不显示该模块。</p>' +
          '<div class="field-row">' +
            fText('wechat', '微信号', p.wechat, '例如：monna-coach') +
            fText('contact_email', '联系邮箱', p.contact_email, '例如：monna@example.com') +
          '</div>' +
        '</div>' +

        '<div style="display:flex;gap:10px;">' +
          '<button type="submit" class="btn btn-primary">保存首页内容</button>' +
          '<a href="index.html" target="_blank" class="btn btn-ghost">预览首页 ↗</a>' +
        '</div>' +

      '</form>';

    bindImageUploads($('#form-profile'));

    $('#form-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const root = e.target;
      const g = n => { const el = root.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };

      const payload = {
        site_name: g('site_name').trim(),
        logo_url: g('logo_url').trim(),
        brand: g('brand').trim(),
        hero_image_url: g('hero_image_url').trim(),
        hero_tag: g('hero_tag').trim(),
        hero_title: g('hero_title').trim(),
        hero_subtitle: g('hero_subtitle'),
        cta_primary: g('cta_primary').trim(),
        cta_secondary: g('cta_secondary').trim(),
        cta_title: g('cta_title').trim(),
        cta_desc: g('cta_desc'),
        contact_email: g('contact_email').trim(),
        wechat: g('wechat').trim(),
        stats: collectRepeats(root, 'stats', ['number', 'label']),
        updated_at: new Date().toISOString()
      };

      const btn = root.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '保存中…';
      try {
        await Store.saveSingleton('profile', payload);
        Store.emitChange('profile');
        toast('已保存，刷新网站首页就能看到');
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false; btn.textContent = '保存首页内容';
      }
    });
  }

  /* ============================================================
   * 2. 产品服务管理
   * ============================================================ */
  async function viewServices() {
    const list = await Store.list('services');
    counts.services = list.length;
    renderNav();

    setHeader('产品服务管理', '服务的名称、介绍、价格、包含内容',
      '<button class="btn btn-primary btn-sm" id="btn-add">＋ 新增服务</button>');
    $('#btn-add').onclick = () => editService(null);

    if (!list.length) {
      $('#content').innerHTML = '<div class="card"><div class="empty"><div class="icon">📦</div>' +
        '<h3>还没有服务</h3><p>点右上角「新增服务」开始添加。</p></div></div>';
      return;
    }

    $('#content').innerHTML = list.map(s => {
      const feats = arr(s.features);
      return '<div class="item">' +
        '<div class="item-head">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="item-title">' + esc(s.title) + (s.visible === false ? ' <span class="chip chip-grey">已隐藏</span>' : '') + '</div>' +
            '<div class="item-sub">' + (s.price ? esc(s.price) : '未填价格') + (s.anchor ? ' · 锚点 #' + esc(s.anchor) : '') + '</div>' +
          '</div>' +
          '<div class="item-actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit="' + esc(s.id) + '">编辑</button>' +
            '<button class="btn btn-danger btn-sm" data-del="' + esc(s.id) + '">删除</button>' +
          '</div>' +
        '</div>' +
        '<div class="item-body">' + esc(String(s.description || '').slice(0, 110)) + (String(s.description || '').length > 110 ? '…' : '') + '</div>' +
        (feats.length ? '<div style="margin-top:10px;">' + feats.map(f => '<span class="chip chip-grey">' + esc(f) + '</span>').join('') + '</div>' : '') +
      '</div>';
    }).join('');

    $$('[data-edit]').forEach(b => b.onclick = () => editService(list.find(s => s.id === b.dataset.edit)));
    $$('[data-del]').forEach(b => b.onclick = () => {
      const s = list.find(x => x.id === b.dataset.del);
      confirmDelete(s.title, async () => {
        await Store.remove('services', s.id);
        Store.emitChange('services');
        toast('已删除');
        renderPage();
      });
    });
  }

  function editService(s) {
    const isNew = !s;
    s = s || { title: '', subtitle: '', description: '', price: '', features: [], icon: 'chat', anchor: '', badge: '', badge_sub: '', cta: '立即预约', visible: true };

    const iconOpts = [['chat', '对话气泡'], ['home', '房子'], ['book', '书本'], ['star', '星星'], ['clock', '时钟']];
    const body = '' +
      fText('title', '服务名称', s.title, '例如：一对一教练对话') +
      fText('subtitle', '一句话副标题', s.subtitle, '例如：45 分钟深度对话') +
      fArea('description', '服务介绍', s.description, 5) +
      '<div class="field-row">' +
        fText('price', '价格', s.price, '例如：¥299 / 45 分钟') +
        '<div class="field"><label>图标</label><select name="icon">' +
          iconOpts.map(o => '<option value="' + o[0] + '"' + (s.icon === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="field-row">' +
        fText('badge', '图形区大字', s.badge, '例如：1:1') +
        fText('badge_sub', '图形区小字', s.badge_sub, '例如：COACHING DIALOGUE') +
      '</div>' +
      '<div class="field-row">' +
        fText('cta', '按钮文字', s.cta) +
        fText('anchor', '锚点（英文）', s.anchor, '用于 services.html#coach') +
      '</div>' +
      repeatBox('features', arr(s.features).map(f => ({ text: f })), [{ key: 'text', ph: '一条服务包含的内容' }], '服务包含内容') +
      fCheck('visible', '在网站上显示这条服务', s.visible !== false);

    openModal(isNew ? '新增服务' : '编辑服务', body, async (root) => {
      const g = n => { const el = root.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };
      const payload = {
        title: g('title').trim(),
        subtitle: g('subtitle').trim(),
        description: g('description').trim(),
        price: g('price').trim(),
        icon: g('icon'),
        badge: g('badge').trim(),
        badge_sub: g('badge_sub').trim(),
        cta: g('cta').trim(),
        anchor: g('anchor').trim(),
        features: collectRepeats(root, 'features', ['text']).map(o => o.text),
        visible: root.querySelector('[name="visible"]').checked,
        sort_order: s.sort_order != null ? s.sort_order : 99
      };
      if (!payload.title) throw new Error('服务名称不能为空');

      if (isNew) await Store.create('services', payload);
      else       await Store.update('services', s.id, payload);

      Store.emitChange('services');
      toast(isNew ? '已新增' : '已保存');
      renderPage();
    });
  }

  /* ============================================================
   * 3. 关于我的介绍管理
   * ============================================================ */
  async function viewAbout() {
    const a = await Store.singleton('about');
    setHeader('关于我的介绍管理', '个人简介、成长故事、价值观、工具箱', '');

    $('#content').innerHTML = '' +
      '<form id="form-about">' +

        '<div class="card">' +
          '<div class="card-title">页面头部</div>' +
          fText('hero_title', '大标题', a.hero_title) +
          fArea('hero_subtitle', '一句话介绍', a.hero_subtitle, 3) +
          '<div class="field-row">' +
            fText('photo_title', '左侧卡片主文字', a.photo_title) +
            fText('photo_sub', '左侧卡片副文字', a.photo_sub, '可用换行') +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">我的故事</div>' +
          '<p class="card-desc">支持 Markdown：空行分段，<b>**加粗**</b> 会变成加粗。</p>' +
          fText('story_title', '小标题', a.story_title) +
          fArea('story', '故事正文', a.story, 12) +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">关键节点（时间线）</div>' +
          repeatBox('timeline', arr(a.timeline), [
            { key: 'year',  ph: '2024 · 春' },
            { key: 'title', ph: '这一节点做了什么', w: 'wide' },
            { key: 'desc',  ph: '补充说明', w: 'wide' }
          ], '时间线节点') +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">我相信的几件事</div>' +
          '<p class="card-desc">图标可填：question / check / heart / chart / globe / people</p>' +
          repeatBox('values', arr(a.values), [
            { key: 'icon',  ph: 'question' },
            { key: 'title', ph: '信念标题' },
            { key: 'desc',  ph: '展开说明', w: 'wide' }
          ], '价值观条目') +
        '</div>' +

        '<div class="card">' +
          '<div class="card-title">我的工具箱</div>' +
          '<p class="card-desc">图标可以直接填 emoji，例如 📐 💬 🎨</p>' +
          repeatBox('tools', arr(a.tools), [
            { key: 'icon', ph: '📐' },
            { key: 'name', ph: '工具名称' },
            { key: 'desc', ph: '一句话说明', w: 'wide' }
          ], '工具箱条目') +
        '</div>' +

        '<div style="display:flex;gap:10px;">' +
          '<button type="submit" class="btn btn-primary">保存关于我</button>' +
          '<a href="about.html" target="_blank" class="btn btn-ghost">预览关于我 ↗</a>' +
        '</div>' +

      '</form>';

    $('#form-about').addEventListener('submit', async (e) => {
      e.preventDefault();
      const root = e.target;
      const g = n => { const el = root.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };

      const payload = {
        hero_title: g('hero_title').trim(),
        hero_subtitle: g('hero_subtitle'),
        photo_title: g('photo_title').trim(),
        photo_sub: g('photo_sub'),
        story_title: g('story_title').trim(),
        story: g('story'),
        timeline: collectRepeats(root, 'timeline', ['year', 'title', 'desc']),
        values:   collectRepeats(root, 'values',   ['icon', 'title', 'desc']),
        tools:    collectRepeats(root, 'tools',    ['icon', 'name', 'desc']),
        updated_at: new Date().toISOString()
      };

      const btn = root.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '保存中…';
      try {
        await Store.saveSingleton('about', payload);
        Store.emitChange('about');
        toast('已保存');
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false; btn.textContent = '保存关于我';
      }
    });
  }

  /* ============================================================
   * 4. 我的文章管理
   * ============================================================ */
  async function viewArticles() {
    const list = await Store.list('articles');
    counts.articles = list.length;
    renderNav();

    setHeader('我的文章管理', '文章的增删改查，支持 Markdown 正文',
      '<button class="btn btn-primary btn-sm" id="btn-add">＋ 写新文章</button>');
    $('#btn-add').onclick = () => editArticle(null, list);

    if (!list.length) {
      $('#content').innerHTML = '<div class="card"><div class="empty"><div class="icon">📝</div>' +
        '<h3>还没有文章</h3><p>点右上角「写新文章」开始创作。</p></div></div>';
      return;
    }

    $('#content').innerHTML = list.map(a => {
      const tags = arr(a.tags);
      return '<div class="item">' +
        '<div class="item-head">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="item-title">' + esc(a.title) + (a.published === false ? ' <span class="chip chip-warn">草稿</span>' : '') + '</div>' +
            '<div class="item-sub">' + esc(a.date || fmtTime(a.created_at).slice(0, 10)) +
              ' · ' + String(a.content || '').length + ' 字</div>' +
          '</div>' +
          '<div class="item-actions">' +
            '<a class="btn btn-ghost btn-sm" href="article.html?slug=' + encodeURIComponent(a.slug || '') + '" target="_blank">预览</a>' +
            '<button class="btn btn-ghost btn-sm" data-edit="' + esc(a.id) + '">编辑</button>' +
            '<button class="btn btn-danger btn-sm" data-del="' + esc(a.id) + '">删除</button>' +
          '</div>' +
        '</div>' +
        (tags.length ? '<div style="margin-top:8px;">' + tags.map(t => '<span class="chip">' + esc(t) + '</span>').join('') + '</div>' : '') +
        '<div class="item-body">' + esc(String(a.summary || '').slice(0, 120)) + '</div>' +
      '</div>';
    }).join('');

    $$('[data-edit]').forEach(b => b.onclick = () => editArticle(list.find(a => a.id === b.dataset.edit), list));
    $$('[data-del]').forEach(b => b.onclick = () => {
      const a = list.find(x => x.id === b.dataset.del);
      confirmDelete(a.title, async () => {
        await Store.remove('articles', a.id);
        Store.emitChange('articles');
        toast('已删除');
        renderPage();
      });
    });
  }

  function editArticle(a, all) {
    const isNew = !a;
    a = a || { title: '', slug: '', summary: '', tags: [], cover_text: '', cover_image_url: '', date: today(), content: '', published: true };

    const body = '' +
      fText('title', '文章标题', a.title) +
      '<div class="field-row">' +
        fText('slug', '链接标识（英文/数字）', a.slug, '留空会自动生成') +
        fText('date', '日期', a.date || today(), '格式：2026-09-10') +
      '</div>' +
      fArea('summary', '摘要', a.summary, 3, '显示在文章列表卡片上') +
      '<div class="field-row">' +
        fText('tags', '标签', arr(a.tags).join(','), '多个用英文逗号分隔') +
        fText('cover_text', '封面大字', a.cover_text, '例如：从大厂到<br/>一个人') +
      '</div>' +
      fImage('cover_image_url', '封面背景图', a.cover_image_url, '留空则使用默认渐变背景；建议 16:9 比例', '恢复默认') +
      '<div class="field"><label>正文（Markdown）</label>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">' +
        '<label class="btn btn-ghost btn-sm" style="cursor:pointer;">' +
          '<input type="file" accept=".md,text/markdown,text/plain" data-md-upload style="display:none;" />' +
          '📄 上传 Markdown 文件' +
        '</label>' +
        '<span class="hint">支持 .md 文件，上传后自动填充正文；若标题为空，会自动提取文件里的 # 一级标题</span>' +
      '</div>' +
      fArea('content', '', a.content, 18, '支持 # 标题、**加粗**、- 列表、> 引用、表格、代码块') +
      '</div>' +
      fCheck('published', '发布（取消勾选则前台不显示）', a.published !== false);

    openModal(isNew ? '写新文章' : '编辑文章', body, async (root) => {
      const g = n => { const el = root.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };

      let slug = g('slug').trim();
      if (!slug) slug = 'post-' + Date.now().toString(36);

      const tags = g('tags').split(/[,，]/).map(t => t.trim()).filter(Boolean);

      const payload = {
        title: g('title').trim(),
        slug: slug,
        date: g('date').trim(),
        summary: g('summary').trim(),
        tags: tags,
        cover_text: g('cover_text').trim(),
        cover_image_url: g('cover_image_url').trim(),
        content: g('content'),
        published: root.querySelector('[name="published"]').checked,
        sort_order: a.sort_order != null ? a.sort_order : (all ? all.length : 99),
        updated_at: new Date().toISOString()
      };
      if (!payload.title) throw new Error('标题不能为空');

      if (isNew) await Store.create('articles', payload);
      else       await Store.update('articles', a.id, payload);

      Store.emitChange('articles');
      toast(isNew ? '已新增文章' : '已保存');
      renderPage();
    });

    // 弹窗里的 DOM 已生成，绑定图片上传和 Markdown 上传事件
    setTimeout(() => {
      const root = $('#modal-body');
      if (!root) return;
      bindImageUploads(root);

      const mdInput = root.querySelector('[data-md-upload]');
      if (mdInput) {
        mdInput.addEventListener('change', () => {
          const file = mdInput.files && mdInput.files[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { alert('Markdown 文件不能超过 5MB'); return; }
          const reader = new FileReader();
          reader.onload = () => {
            let text = String(reader.result || '');
            // 简单处理：移除 BOM
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            const contentArea = root.querySelector('[name="content"]');
            if (contentArea) contentArea.value = text;
            // 如果标题为空，尝试从 # 一级标题提取
            const titleInput = root.querySelector('[name="title"]');
            if (titleInput && !titleInput.value.trim()) {
              const m = text.match(/^#\s+(.+)$/m);
              if (m) titleInput.value = m[1].trim();
            }
          };
          reader.readAsText(file);
        });
      }
    }, 0);
  }

  /* ============================================================
   * 5. 预约咨询线索管理
   * ============================================================ */
  const STATUS = {
    new:       { label: '新提交', cls: 'chip-warn' },
    contacted: { label: '已联系', cls: 'chip-info' },
    booked:    { label: '已预约', cls: 'chip' },
    done:      { label: '已完成', cls: 'chip-ok' },
    closed:    { label: '已关闭', cls: 'chip-grey' }
  };
  const SERVICE_LABEL = { coach: '一对一教练', workshop: '视觉工作坊', content: '内容订阅', free: '免费咨询' };

  async function viewLeads() {
    const list = await Store.list('leads');
    counts.leads = list.filter(l => (l.status || 'new') === 'new').length;
    renderNav();

    setHeader('预约咨询线索管理', '访客提交的预约信息，标记跟进状态',
      '<button class="btn btn-ghost btn-sm" id="btn-export">导出 CSV</button>');
    $('#btn-export').onclick = () => exportLeads(list);

    if (!list.length) {
      $('#content').innerHTML = '<div class="card"><div class="empty"><div class="icon">📥</div>' +
        '<h3>还没有收到预约</h3>' +
        '<p>' + (Store.isCloud
            ? '访客在预约页提交后，线索会自动出现在这里。'
            : '本地模式下，只有你自己在本机提交的预约会记录在这里。<br/>要真正接收访客线索，请配置云端数据库（见 ADMIN-GUIDE.md）。') +
        '</p></div></div>';
      return;
    }

    const rows = list.map(l => {
      const st = STATUS[l.status || 'new'] || STATUS.new;
      return '<tr>' +
        '<td class="nowrap">' + esc(fmtTime(l.created_at)) + '</td>' +
        '<td><b style="color:var(--text-title);">' + esc(l.name) + '</b><br/><span style="color:var(--text-muted);">' + esc(l.contact) + '</span></td>' +
        '<td class="nowrap">' + esc(SERVICE_LABEL[l.service] || l.service || '—') + '</td>' +
        '<td class="nowrap">' + esc(l.time_slot || '—') + '<br/><span style="color:var(--text-muted);">' + esc(l.city || '') + '</span></td>' +
        '<td style="max-width:260px;">' + esc(l.topic || '—') +
          (l.source ? '<br/><span style="color:var(--text-muted);">来源：' + esc(l.source) + '</span>' : '') + '</td>' +
        '<td class="nowrap">' +
          '<select data-status="' + esc(l.id) + '" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">' +
            Object.keys(STATUS).map(k => '<option value="' + k + '"' + ((l.status || 'new') === k ? ' selected' : '') + '>' + STATUS[k].label + '</option>').join('') +
          '</select>' +
        '</td>' +
        '<td class="nowrap"><button class="btn btn-danger btn-sm" data-del="' + esc(l.id) + '">删除</button></td>' +
      '</tr>';
    }).join('');

    $('#content').innerHTML =
      '<div class="card">' +
        '<div class="table-wrap"><table>' +
          '<thead><tr>' +
            '<th>提交时间</th><th>联系人</th><th>服务</th><th>期望时间</th><th>想聊什么</th><th>状态</th><th></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
      '</div>';

    $$('[data-status]').forEach(sel => sel.onchange = async () => {
      try {
        await Store.update('leads', sel.dataset.status, { status: sel.value });
        Store.emitChange('leads');
        toast('状态已更新');
        counts.leads = (await Store.list('leads')).filter(l => (l.status || 'new') === 'new').length;
        renderNav();
      } catch (e) { toast(e.message, true); }
    });

    $$('[data-del]').forEach(b => b.onclick = () => {
      const l = list.find(x => x.id === b.dataset.del);
      confirmDelete(l.name + ' 的预约', async () => {
        await Store.remove('leads', l.id);
        Store.emitChange('leads');
        toast('已删除');
        renderPage();
      });
    });
  }

  function exportLeads(list) {
    const head = ['提交时间', '姓名', '联系方式', '服务', '期望时间', '城市', '想聊什么', '来源', '状态'];
    const lines = [head.join(',')];
    list.forEach(l => {
      const cells = [
        fmtTime(l.created_at), l.name, l.contact,
        SERVICE_LABEL[l.service] || l.service || '',
        l.time_slot, l.city, l.topic, l.source,
        (STATUS[l.status || 'new'] || {}).label || ''
      ].map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\n/g, ' ') + '"');
      lines.push(cells.join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '预约线索_' + today() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出，用 Excel 打开即可');
  }

  /* ============================================================
   * 登录 / 启动
   * ============================================================ */
  function showLogin() {
    $('#login-view').style.display = 'flex';
    $('#app-view').classList.remove('show');
  }
  function showApp() {
    $('#login-view').style.display = 'none';
    $('#app-view').classList.add('show');

    const u = Store.currentUser();
    $('#side-user').textContent = (u && u.email ? u.email : '—') + (Store.isCloud ? '（云端）' : '（本地）');
    renderNav();
    renderPage();
  }

  function renderLoginMode() {
    const el = $('#login-mode');
    if (Store.isCloud) {
      el.innerHTML = '<span class="badge badge-cloud">云端模式</span><br/>数据保存在 Supabase，多设备同步。';
      $('#login-email').value = '';
    } else {
      el.innerHTML = '<span class="badge badge-local">本地模式</span><br/>' +
        '数据只存在这台电脑的浏览器里。<br/>' +
        '默认账号：<b>' + esc((window.WB_CONFIG.localAccount || {}).email || '') + '</b> ／ 密码：<b>' +
        esc((window.WB_CONFIG.localAccount || {}).password || '') + '</b><br/>' +
        '<a href="ADMIN-GUIDE.md" target="_blank">想升级成云端后台？看这里 →</a>';
      $('#login-email').value = (window.WB_CONFIG.localAccount || {}).email || '';
    }
  }

  async function boot() {
    let displayName = window.WB_CONFIG.brand || '一人公司';
    let logoUrl = 'logo.jpg';
    try {
      await Store.init();
      const profile = await Store.singleton('profile').catch(() => ({}));
      if (profile.site_name) displayName = profile.site_name;
      if (profile.logo_url) logoUrl = profile.logo_url;
    } catch (e) {
      $('#login-error').textContent = '初始化失败：' + e.message;
      $('#login-error').classList.add('show');
    }

    $('#login-brand').textContent = displayName + ' 后台';
    $('#side-brand').textContent  = displayName;
    $$('[data-wb="logo-img"]').forEach(img => { img.src = logoUrl; img.alt = displayName; });

    renderLoginMode();

    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('#login-error');
      const btn = $('#login-btn');
      errBox.classList.remove('show');

      btn.disabled = true; btn.textContent = '登录中…';
      try {
        await Store.signIn($('#login-email').value, $('#login-password').value);
        showApp();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.add('show');
      } finally {
        btn.disabled = false; btn.textContent = '登录';
      }
    });

    $('#btn-logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await Store.signOut();
      showLogin();
      $('#login-password').value = '';
    });

    if (Store.isLoggedIn()) showApp();
    else showLogin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
