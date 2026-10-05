(() => {
  'use strict';

  const B = window.Bulletin;
  const KEY = 'tayninh-bantin-v3';
  const KEYS = {
    state: KEY,
    role: KEY + '-role',
    backup: KEY + '-before-reset',
    theme: KEY + '-theme',
    view: KEY + '-view'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ESC[ch]);
  const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    task: '<path d="m8 12 3 3 5-6"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
    tick: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    book: '<path d="M12 6.5v14M3 4.5h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6v14h-6a3 3 0 0 0-3 2 3 3 0 0 0-3-2H3z"/>',
    chart: '<path d="M4 3v17a1 1 0 0 0 1 1h16M9 16v-5M14 16V7M19 16v-8"/>',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9"/><circle cx="9" cy="7" r="4"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    up: '<path d="m5 12 7-7 7 7M12 19V5"/>',
    down: '<path d="m19 12-7 7-7-7M12 5v14"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    loop: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M3 21v-5h5M21 3v5h-5"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${icons[name] || icons.file}</svg>`;

  const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
  const toDate = value => new Date(typeof value === 'string' && value.length === 10 ? value + 'T12:00:00' : value);
  const fmt = value => { const d = toDate(value); return value && !isNaN(d) ? dateFmt.format(d) : '—'; };
  const fmtShort = value => fmt(value).slice(0, 5);
  const pad = n => String(n).padStart(2, '0');

  function ago(value) {
    const n = B.daysUntil(value);
    if (n === 0) return 'Hôm nay';
    if (n === -1) return 'Hôm qua';
    if (n < 0 && n > -15) return `${-n} ngày trước`;
    return fmt(value);
  }

  function dueInfo(due, finished = false) {
    if (finished) return { text: 'Đã gửi kết quả', tone: 'done', days: null };
    const n = B.daysUntil(due);
    if (n < 0) return { text: `Quá hạn ${-n} ngày`, tone: 'late', days: n };
    if (n === 0) return { text: 'Hạn hôm nay', tone: 'soon', days: n };
    if (n <= 2) return { text: `Còn ${n} ngày`, tone: 'soon', days: n };
    return { text: `Còn ${n} ngày`, tone: 'ok', days: n };
  }

  const initials = name => {
    if (/^[A-ZĐ0-9]{1,3}$/.test(name || '')) return name;
    const reviewer = /^Phản biện\s*(\d+)/i.exec(name || '');
    if (reviewer) return 'P' + Number(reviewer[1]);
    const clean = String(name || '?').replace(/^(?:(?:GS|PGS|TS|ThS|CN|KS|BS)\.?\s+)+/i, '').trim();
    const parts = clean.split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
  };

  const fileKind = file => file.auto || file.ext === 'docx' ? 'Tệp Word' : file.ext === 'doc' ? 'Tệp Word' : file.ext === 'pdf' ? 'Tệp PDF' : 'Tệp đính kèm';
  const fileSize = file => file.size ? (file.size >= 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB') : '';
  const avatar = (name, size = '') => `<span class="avatar ${size}" aria-hidden="true">${esc(initials(name))}</span>`;

  const badgeTone = { pass: 'approved', revise: 'revision', reject: 'reject' };
  const badge = (status, label) => {
    const text = label || B.statuses[status] || B.results[status] || status;
    return `<span class="badge" data-s="${esc(badgeTone[status] || status)}">${esc(text)}</span>`;
  };

  const button = (label, action, id = '', cls = 'btn', ico = '', extra = '') =>
    `<button type="button" class="${cls}" data-action="${esc(action)}"${id ? ` data-id="${esc(id)}"` : ''}${extra ? ' ' + extra : ''}>${ico ? icon(ico) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;

  const empty = (title, text = '', action = '') =>
    `<div class="empty">${icon('file')}<strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;

  const S = {
    state: null,
    actorKey: 'secretary',
    actor: null,
    page: 'overview',
    filter: '',
    search: '',
    sort: 'recent',
    view: 'list',
    notice: ''
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(KEYS.state);
      const stored = JSON.parse(raw || 'null');
      if (B.isValidState(stored)) return stored;
      if (raw) S.notice = 'Dữ liệu đã lưu không đọc được, đang hiển thị bộ hồ sơ khởi tạo.';
    } catch {
      S.notice = 'Không đọc được dữ liệu đã lưu, đang hiển thị bộ hồ sơ khởi tạo.';
    }
    return B.seed();
  }

  function commit(next) {
    try { localStorage.setItem(KEYS.state, JSON.stringify(next)); }
    catch { throw new Error('Trình duyệt không cho lưu hoặc đã hết dung lượng. Thao tác chưa được lưu.'); }
    S.state = next;
  }

  function remember(key, value) { try { localStorage.setItem(key, value); } catch { /* bỏ qua */ } }
  function recall(key) { try { return localStorage.getItem(key); } catch { return null; } }

  function setActor(key) {
    S.actorKey = key;
    S.actor = B.actorInfo(S.state, key);
    remember(KEYS.role, key);
  }

  function initSession() {
    S.state = loadState();
    S.view = recall(KEYS.view) === 'board' ? 'board' : 'list';
    let key = 'secretary';
    const saved = recall(KEYS.role);
    if (saved) { try { B.actorInfo(S.state, saved); key = saved; } catch { /* dùng mặc định */ } }
    S.actorKey = key;
    S.actor = B.actorInfo(S.state, key);
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#0f1a21' : '#0a5c73';
  }
  function toggleTheme() {
    const mode = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(mode);
    remember(KEYS.theme, mode);
  }

  const pageLabels = { overview: 'Tổng quan', articles: 'Bài viết', reviews: 'Phản biện', issues: 'Số bản tin', reports: 'Báo cáo', guide: 'Hướng dẫn' };
  const pageIcons = { overview: 'grid', articles: 'file', reviews: 'task', issues: 'book', reports: 'chart', guide: 'help' };
  const pageLabel = page => {
    if (page === 'articles') return S.actor.role === 'reviewer' ? 'Bài được giao' : S.actor.role === 'author' ? 'Bài của tôi' : 'Bài viết';
    return pageLabels[page];
  };
  function allowedPages() {
    const role = S.actor.role;
    if (role === 'leader') return ['overview', 'reports', 'guide'];
    if (role === 'reviewer') return ['overview', 'articles', 'reviews', 'guide'];
    if (role === 'author') return ['overview', 'articles', 'reports', 'guide'];
    return Object.keys(pageLabels);
  }

  const person = id => S.state.people.find(p => p.id === id);
  const scoped = () => S.actor.role === 'leader' ? S.state.articles : B.visibleArticles(S.state, S.actor);
  const projected = () => B.visibleArticles(S.state, S.actor).map(a => B.projectArticle(a, S.actor));

  function pendingReviews() {
    return scoped().flatMap(a => ['reviewing', 'results'].includes(a.status)
      ? B.activeReviews(a).filter(r => !r.result && (S.actor.role !== 'reviewer' || r.reviewerId === S.actor.id)).map(r => ({ a, r }))
      : []);
  }
  const overdue = () => pendingReviews().filter(x => x.r.due < B.date());

  function reminderText(a, r) {
    const late = -B.daysUntil(r.due);
    const who = person(r.reviewerId)?.name || 'Anh/chị';
    const when = late > 0 ? `đã quá hạn ${late} ngày` : `đến hạn ngày ${fmt(r.due)}`;
    return `Kính gửi ${who}, hồ sơ ${a.code} được giao phản biện ${when} (hạn ${fmt(r.due)}). Đề nghị anh/chị hoàn thành đánh giá và gửi kết quả trên hệ thống. Trân trọng cảm ơn.`;
  }

  function tasks() {
    const role = S.actor.role;
    const list = [];
    if (role === 'secretary') {
      for (const { a, r } of overdue()) {
        list.push({ rank: 0, tone: 'late', ico: 'clock', title: a.title, meta: `${a.code}, ${person(r.reviewerId)?.name}`, note: dueInfo(r.due).text, action: 'remind', id: a.id, label: 'Nhắc hạn', extra: `data-reviewer="${esc(r.reviewerId)}"` });
      }
      for (const a of S.state.articles) {
        const reviews = B.activeReviews(a);
        if (a.status === 'results' && B.allPass(a)) list.push({ rank: 1, tone: 'ok', ico: 'task', title: a.title, meta: a.code, note: 'Đủ kết quả đạt', action: 'approve', id: a.id, label: 'Xác nhận đạt' });
        else if (a.status === 'results') list.push({ rank: 1, tone: 'warn', ico: 'repeat', title: a.title, meta: a.code, note: 'Có ý kiến chưa đạt', action: 'return', id: a.id, label: 'Tổng hợp ý kiến' });
        else if (a.status === 'reviewing' && reviews.some(r => ['revise', 'reject'].includes(r.result))) list.push({ rank: 3, tone: 'warn', ico: 'repeat', title: a.title, meta: a.code, note: 'Đã có ý kiến chưa đạt', action: 'return', id: a.id, label: 'Tổng hợp ý kiến' });
        if (a.status === 'submitted') list.push({ rank: 2, tone: 'info', ico: 'file', title: a.title, meta: `${a.code}, phiên bản ${pad(a.version)}`, note: 'Chờ sơ duyệt', action: 'screen', id: a.id, label: 'Sơ duyệt' });
        if (a.status === 'ready') list.push({ rank: 2, tone: 'info', ico: 'people', title: a.title, meta: a.code, note: 'Chờ phân công', action: 'assign', id: a.id, label: 'Phân công' });
        if (a.status === 'approved') list.push({ rank: 4, tone: 'ok', ico: 'book', title: a.title, meta: a.code, note: 'Đạt, chưa vào số bản tin', action: 'publish', id: a.id, label: 'Đăng vào số' });
      }
    } else if (role === 'author') {
      for (const a of scoped()) {
        if (a.status === 'revision') list.push({ rank: 0, tone: 'warn', ico: 'repeat', title: a.title, meta: a.code, note: 'Cần nộp bản chỉnh sửa', action: 'resubmit', id: a.id, label: 'Nộp bản sửa' });
      }
    } else if (role === 'reviewer') {
      for (const { a, r } of pendingReviews()) {
        const info = dueInfo(r.due);
        list.push({ rank: info.tone === 'late' ? 0 : 1, tone: info.tone === 'ok' ? 'info' : info.tone, ico: 'task', title: B.projectArticle(a, S.actor)?.title || a.code, meta: a.code, note: `${info.text}, hạn ${fmt(r.due)}`, action: 'review', id: a.id, label: 'Đánh giá', due: r.due });
      }
    }
    return list.sort((x, y) => x.rank - y.rank);
  }

  function activity(limit = 8) {
    const rows = [];
    for (const a of S.state.articles) {
      for (const h of a.history) rows.push({ at: h.at, text: h.text, a });
    }
    return rows.sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, limit);
  }

  function filterArticles(list) {
    const term = fold(S.search.trim());
    const out = list.filter(a => (!S.filter || a.status === S.filter) && (!term || fold(`${a.title} ${a.code} ${a.authorName || ''}`).includes(term)));
    const order = Object.keys(B.statuses);
    const sorters = {
      recent: (x, y) => String(y.created).localeCompare(String(x.created)),
      oldest: (x, y) => String(x.created).localeCompare(String(y.created)),
      status: (x, y) => order.indexOf(x.status) - order.indexOf(y.status),
      title: (x, y) => x.title.localeCompare(y.title, 'vi')
    };
    return out.sort(sorters[S.sort] || sorters.recent);
  }

  let toastTimer;
  function toast(message, tone = '') {
    const el = $('#toast');
    clearTimeout(toastTimer);
    el.textContent = message;
    el.dataset.tone = tone;
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      return ok;
    }
  }

  window.UI = {
    B, KEYS, S, $, $$, esc, fold, icon, icons, fmt, fmtShort, ago, pad, dueInfo, initials, fileKind, fileSize, avatar, badge, button, empty,
    loadState, commit, remember, recall, setActor, initSession, currentTheme, applyTheme, toggleTheme,
    pageLabels, pageIcons, pageLabel, allowedPages, person, scoped, projected, pendingReviews, overdue,
    reminderText, tasks, activity, filterArticles, toast, copyText
  };
})();
