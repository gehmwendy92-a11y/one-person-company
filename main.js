// ====== 全局初始化 ======
document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initFadeIn();
  initArticleFilters();
  highlightCurrentNav();
});

// ====== 移动端导航 ======
function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });

  // 点击链接后自动关闭
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// ====== 当前页导航高亮 ======
function highlightCurrentNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ====== 滚动渐入动画 ======
function initFadeIn() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => io.observe(el));
}

// ====== 预约表单 ======
// 已移到 site.js 处理（提交时会写入后台的「预约咨询线索」）
// 这里不再绑定，避免重复触发导致表单被提前清空。

// ====== 文章筛选 ======
function initArticleFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('[data-tag]');
  if (!buttons.length || !cards.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.filter;
      cards.forEach(card => {
        if (tag === 'all' || card.dataset.tag === tag) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// ====== 暴露给文章详情页 ======
window.WB = {
  loadMarkdown
};

// ====== Markdown 渲染 ======
async function loadMarkdown(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 加载 marked.js（CDN）
  if (typeof marked === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('文章加载失败');
    const md = await res.text();
    container.innerHTML = marked.parse(md, { gfm: true, breaks: false });
    // 文档标题
    const firstH1 = container.querySelector('h1');
    if (firstH1) document.title = `${firstH1.textContent} - 一人公司`;
  } catch (err) {
    container.innerHTML = `<p style="color:#e53e3e;text-align:center;padding:40px 0;">文章加载失败，请稍后再试。</p>`;
    console.error(err);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}