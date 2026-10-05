(() => {
  'use strict';

  const U = window.UI;
  const { B, S, esc, icon, fmt, fmtShort, pad, badge, button, empty, avatar, dueInfo, person, scoped, projected, pendingReviews, overdue, tasks, activity, ago, filterArticles } = U;

  /* ---------- Thành phần dùng chung ---------- */

  const pageHead = (title, text, actions = '') =>
    `<header class="page-head"><div><h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;

  const panel = (title, sub, body, action = '', cls = '') =>
    `<section class="panel ${cls}"><header class="panel-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${action}</header>${body}</section>`;

  const figures = items =>
    `<dl class="figures">${items.map(x => `<div${x.tone ? ` data-tone="${x.tone}"` : ''}><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div>`).join('')}</dl>`;

  let introPlayed = false;
  function pipeline(list, interactive) {
    const keys = Object.keys(B.statuses);
    const counts = keys.map(k => list.filter(a => a.status === k).length);
    const play = !introPlayed;
    introPlayed = true;
    const track = keys.map((k, i) => counts[i] ? `<i data-s="${k}" style="flex:${counts[i]}"></i>` : '').join('') || '<i class="none"></i>';
    const cells = keys.map((k, i) => {
      const inner = `<span class="dot"></span><span class="stage-name">${esc(B.statuses[k])}</span><strong>${counts[i]}</strong>`;
      return interactive
        ? `<button type="button" class="stage" data-s="${k}" data-action="stage" data-id="${k}">${inner}</button>`
        : `<div class="stage" data-s="${k}">${inner}</div>`;
    }).join('');
    return `<section class="pipeline" aria-label="Số bài theo từng bước xử lý"><div class="pipeline-track${play ? ' intro' : ''}">${track}</div><div class="pipeline-cells">${cells}</div></section>`;
  }

  const STEPS = ['Nộp bài', 'Sơ duyệt', 'Phân công', 'Phản biện', 'Tổng hợp', 'Đăng bản tin'];
  const STEP_AT = { revision: 0, submitted: 1, ready: 2, reviewing: 3, results: 4, approved: 5, published: 6 };
  function stepper(status, compact = false) {
    const at = STEP_AT[status] ?? 0;
    return `<ol class="stepper${compact ? ' compact' : ''}" aria-label="Tiến độ xử lý">${STEPS.map((label, i) => {
      const state = i < at ? 'done' : i === at ? (status === 'revision' ? 'warn' : 'current') : 'todo';
      const text = i === at && status === 'revision' ? 'Chờ bản sửa' : label;
      return `<li data-state="${state}"${state === 'current' || state === 'warn' ? ' aria-current="step"' : ''}><span class="step-dot">${state === 'done' ? icon('tick') : ''}</span><span class="step-label">${esc(text)}</span></li>`;
    }).join('')}</ol>`;
  }

  function taskList(items, limit = 6) {
    if (!items.length) return empty('Không có việc cần xử lý', 'Các hồ sơ trong phạm vi hiện tại đã được xử lý.');
    const rows = items.slice(0, limit).map(t => `<li class="task" data-tone="${t.tone}">
      <span class="task-ico">${icon(t.ico)}</span>
      <div class="task-main"><button type="button" class="link" data-action="detail" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="task-meta">${esc(t.meta)}</span></div>
      <span class="task-note">${esc(t.note)}</span>
      ${button(t.label, t.action, t.id, 'btn btn-sm', '', t.extra || '')}
    </li>`).join('');
    const more = items.length > limit ? `<div class="panel-foot">Còn ${items.length - limit} việc khác. ${button('Mở danh sách bài viết', 'nav-articles', '', 'link')}</div>` : '';
    return `<ul class="tasks">${rows}</ul>${more}`;
  }

  function deadlines(limit = 6) {
    const rows = pendingReviews().sort((x, y) => x.r.due.localeCompare(y.r.due)).slice(0, limit);
    if (!rows.length) return empty('Không có lượt phản biện đang chờ');
    return `<ul class="deadlines">${rows.map(({ a, r }) => {
      const d = dueInfo(r.due);
      return `<li><div><button type="button" class="link" data-action="detail" data-id="${esc(a.id)}">${esc(a.code)}</button><span class="task-meta">${esc(person(r.reviewerId)?.name)}</span></div><span class="due" data-tone="${d.tone}">${esc(d.text)}</span><time class="due-date">${fmtShort(r.due)}</time></li>`;
    }).join('')}</ul>`;
  }

  function feed(limit = 8) {
    const rows = activity(limit);
    if (!rows.length) return empty('Chưa có hoạt động');
    return `<ul class="feed">${rows.map(x => `<li><span class="feed-dot"></span><div><button type="button" class="link" data-action="detail" data-id="${esc(x.a.id)}">${esc(x.a.code)}</button> <span>${esc(x.text)}</span></div><time>${esc(ago(x.at))}</time></li>`).join('')}</ul>`;
  }

  function donut(list) {
    const keys = Object.keys(B.statuses);
    const total = list.length;
    let acc = 0;
    const segs = keys.map(k => {
      const n = list.filter(a => a.status === k).length;
      const pct = total ? n / total * 100 : 0;
      const out = n ? `<circle class="seg" data-s="${k}" cx="21" cy="21" r="15.9155" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}"/>` : '';
      acc += pct;
      return out;
    }).join('');
    const legend = keys.map(k => `<li data-s="${k}"><span class="dot"></span><span>${esc(B.statuses[k])}</span><strong>${list.filter(a => a.status === k).length}</strong></li>`).join('');
    return `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="Tỷ lệ bài theo trạng thái"><circle class="ring" cx="21" cy="21" r="15.9155"/>${segs}</svg><div class="donut-center"><strong>${total}</strong><span>bài</span></div></div><ul class="legend">${legend}</ul></div>`;
  }

  const meter = (value, max, tone = '') => `<span class="meter${tone ? ' ' + tone : ''}"><i style="width:${max ? Math.min(100, value / max * 100) : 0}%"></i></span>`;

  const scoreAvg = c => c ? (Object.values(c).reduce((s, v) => s + v, 0) / Object.values(c).length).toFixed(1) : '';

  function scoreList(c) {
    if (!c) return '';
    return `<ul class="scores" aria-label="Điểm theo tiêu chí">${Object.entries(B.criteria).map(([k, label]) => `<li><span>${esc(label)}</span><span class="pips" role="img" aria-label="${c[k]} trên 5">${[1, 2, 3, 4, 5].map(n => `<i${n <= c[k] ? ' class="on"' : ''}></i>`).join('')}</span></li>`).join('')}</ul>`;
  }

  /* ---------- Bảng và Kanban ---------- */

  function progressCell(a) {
    const reviewer = S.actor.role === 'reviewer';
    const secretary = S.actor.role === 'secretary';
    const rr = a.reviews.filter(r => r.version === a.version);
    const own = rr.find(r => r.reviewerId === S.actor.id);
    const done = rr.filter(r => r.result).length;
    if (reviewer) {
      if (!own) return '<span class="muted">Lượt trước đã kết thúc</span>';
      const info = dueInfo(own.due, !!own.result);
      return `<span class="due" data-tone="${info.tone}">${esc(own.result ? B.results[own.result] : info.text)}</span><small class="sub">Hạn ${fmt(own.due)}</small>`;
    }
    if (secretary && rr.length) return `<div class="progress-line">${meter(done, rr.length)}<span>${done}/${rr.length}</span></div><small class="sub">kết quả đã nhận</small>`;
    return `<span class="muted">Phiên bản ${pad(a.version)}</span>`;
  }

  function articleTable(list) {
    if (!list.length) return empty('Không có hồ sơ phù hợp', 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa tìm kiếm.');
    const secretary = S.actor.role === 'secretary';
    const head = `<tr><th scope="col">Bài viết</th>${secretary ? '<th scope="col" class="c-who">Người nộp</th>' : ''}<th scope="col">Trạng thái</th><th scope="col">${S.actor.role === 'reviewer' ? 'Hạn phản biện' : 'Tiến độ'}</th><th scope="col"><span class="sr-only">Mở</span></th></tr>`;
    const rows = list.map(a => `<tr class="row-link" data-action="detail" data-id="${esc(a.id)}">
      <td class="c-title"><button type="button" class="link title" data-action="detail" data-id="${esc(a.id)}">${esc(a.title)}</button><span class="sub"><span>${esc(a.code)}</span><span>${esc(a.category)}</span>${secretary ? `<span class="sub-who">${esc(a.authorName)}</span>` : ''}</span></td>
      ${secretary ? `<td class="c-who"><div class="who">${avatar(a.authorName)}<span>${esc(a.authorName)}<small class="sub">${esc(a.agency)}</small></span></div></td>` : ''}
      <td class="c-status">${badge(a.status)}</td>
      <td class="c-progress">${progressCell(a)}</td>
      <td class="c-go">${icon('chevronRight')}</td>
    </tr>`).join('');
    return `<div class="table-wrap"><table class="tbl tbl-articles"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function board(list) {
    const keys = Object.keys(B.statuses);
    return `<div class="board" role="list">${keys.map(k => {
      const items = list.filter(a => a.status === k);
      return `<section class="lane" data-s="${k}" role="listitem" aria-label="${esc(B.statuses[k])}"><header><span class="dot"></span><h3>${esc(B.statuses[k])}</h3><span class="count">${items.length}</span></header><div class="lane-body">${items.map(a => {
        const rr = a.reviews.filter(r => r.version === a.version);
        const done = rr.filter(r => r.result).length;
        const next = rr.filter(r => !r.result).map(r => r.due).sort()[0];
        const info = next && ['reviewing', 'results'].includes(a.status) ? dueInfo(next) : null;
        return `<button type="button" class="card" data-action="detail" data-id="${esc(a.id)}"><strong>${esc(a.title)}</strong><span class="sub"><span>${esc(a.code)}</span><span>${esc(a.category)}</span></span>${rr.length ? `<div class="progress-line">${meter(done, rr.length)}<span>${done}/${rr.length}</span></div>` : ''}${info && a.status === 'reviewing' ? `<span class="due" data-tone="${info.tone}">${esc(info.text)}</span>` : ''}</button>`;
      }).join('') || '<p class="lane-empty">Trống</p>'}</div></section>`;
    }).join('')}</div>`;
  }

  function articleList() {
    const all = projected();
    const list = filterArticles(all);
    const body = S.view === 'board' && S.actor.role === 'secretary' ? board(list) : articleTable(list);
    return `${body}<div class="list-foot">Hiển thị ${list.length} trên ${all.length} hồ sơ</div>`;
  }

  function statusChips() {
    const all = projected();
    const keys = Object.keys(B.statuses).filter(k => all.some(a => a.status === k) || S.filter === k);
    const chip = (value, label, count) => `<button type="button" class="chip" data-action="chip" data-id="${value}" aria-pressed="${S.filter === value}">${esc(label)}<span>${count}</span></button>`;
    return `<div class="chips" role="group" aria-label="Lọc theo trạng thái">${chip('', 'Tất cả', all.length)}${keys.map(k => chip(k, B.statuses[k], all.filter(a => a.status === k).length)).join('')}</div>`;
  }

  /* ---------- Tổng quan ---------- */

  function authorCards(list) {
    if (!list.length) return empty('Chưa có bài đã nộp', 'Tiếp nhận bản thảo mới.', button('Nộp bài mới', 'submit', '', 'btn btn-primary', 'plus'));
    return `<div class="story-list">${list.map(a => {
      const note = a.status === 'revision' && a.feedback.at(-1) ? `<p class="story-note">${esc(a.feedback.at(-1).text)}</p>` : '';
      return `<article class="story" data-s="${a.status}"><div class="story-top"><div><button type="button" class="link story-title" data-action="detail" data-id="${esc(a.id)}">${esc(a.title)}</button><span class="sub"><span>${esc(a.code)}</span><span>${esc(a.category)}</span><span>Phiên bản ${pad(a.version)}</span></span></div>${badge(a.status)}</div>${stepper(a.status, true)}${note}${a.status === 'revision' ? `<div class="story-actions">${button('Nộp bản chỉnh sửa', 'resubmit', a.id, 'btn btn-primary btn-sm', 'repeat')}</div>` : ''}</article>`;
    }).join('')}</div>`;
  }

  function secretaryOverview() {
    const list = S.state.articles;
    const queue = tasks();
    return `${pageHead('Tổng quan', `${list.length} hồ sơ đang theo dõi, ${pendingReviews().length} lượt phản biện chưa có kết quả.`, button('Thêm người nộp mới', 'author-register', '', 'btn btn-primary', 'plus') + button('Tạo số bản tin', 'issue-edit', '', 'btn', 'book'))}
      ${pipeline(list, true)}
      <div class="grid-main">
        ${panel('Cần xử lý', queue.length ? `${queue.length} việc, sắp theo mức độ gấp` : 'Không còn việc tồn đọng', taskList(queue, 7))}
        ${panel('Hạn phản biện', 'Các lượt chưa có kết quả', `<div class="panel-body tight">${deadlines(6)}</div>`, button('Xem tất cả', 'nav-reviews', '', 'link'))}
      </div>
      ${panel('Hoạt động gần đây', 'Ghi nhận từ lịch sử xử lý của các hồ sơ', `<div class="panel-body">${feed(7)}</div>`)}`;
  }

  function authorOverview() {
    const list = projected().sort((x, y) => String(y.created).localeCompare(String(x.created)));
    const need = tasks();
    return `${pageHead('Bài của tôi', 'Theo dõi từng bản thảo và nộp bản chỉnh sửa khi có yêu cầu.', button('Thông tin cá nhân', 'author-edit', S.actor.id, 'btn', 'people') + button('Nộp bài mới', 'submit', '', 'btn btn-primary', 'plus'))}
      ${need.length ? `<div class="callout" data-tone="warn">${icon('alert')}<div><strong>${need.length} bài đang chờ bản chỉnh sửa</strong><p>Đọc ý kiến của thư ký trong từng bài rồi gửi bản sửa để được sơ duyệt lại.</p></div></div>` : ''}
      ${authorCards(list)}`;
  }

  function reviewerOverview() {
    const todo = tasks();
    const mine = scoped().flatMap(a => a.reviews.filter(r => r.reviewerId === S.actor.id && r.result).map(r => ({ a, r })));
    const doneRows = mine.length
      ? `<ul class="deadlines">${mine.map(({ a, r }) => `<li><div><button type="button" class="link" data-action="detail" data-id="${esc(a.id)}">${esc(a.code)}</button><span class="task-meta">Gửi ngày ${fmt(r.submitted)}</span></div>${badge(r.result)}<span></span></li>`).join('')}</ul>`
      : empty('Chưa gửi kết quả nào');
    return `${pageHead('Bài được giao', 'Bản thảo ẩn danh thuộc các lượt được phân công.')}
      <div class="grid-main">
        ${panel('Cần đánh giá', todo.length ? `${todo.length} lượt chưa gửi kết quả` : 'Đã hoàn tất các lượt được giao', taskList(todo, 6))}
        ${panel('Đã gửi', 'Kết quả đã gửi về thư ký', `<div class="panel-body tight">${doneRows}</div>`)}
      </div>
      <div class="callout" data-tone="info">${icon('shield')}<div><strong>Bản thảo ẩn danh</strong><p>Không hiển thị tên tác giả và nhận xét của người phản biện khác.</p></div></div>`;
  }

  function leaderOverview() {
    const m = B.metrics(S.state);
    return `${pageHead('Tổng quan', 'Số liệu và tiến độ chung. Vai trò này chỉ xem, không xử lý hồ sơ.', button('Xem báo cáo', 'nav-reports', '', 'btn', 'chart'))}
      ${pipeline(S.state.articles, false)}
      ${figures([
        { label: 'Lượt phản biện đang chờ', value: m.reviews.pending },
        { label: 'Lượt quá hạn', value: m.reviews.overdue, tone: m.reviews.overdue ? 'late' : '' },
        { label: 'Tỷ lệ bài đạt hoặc đã đăng', value: m.completionRate + '%' },
        { label: 'Số bản tin đã phát hành', value: S.state.issues.filter(x => x.published).length }
      ])}
      <div class="grid-even">
        ${panel('Phân bố theo trạng thái', '', `<div class="panel-body">${donut(S.state.articles)}</div>`)}
        ${panel('Theo chuyên mục', '', `<div class="panel-body">${categoryBars(m)}</div>`)}
      </div>`;
  }

  const categoryBars = m => {
    const max = Math.max(1, ...m.categories.map(c => c.count));
    return `<ul class="bars">${m.categories.map(c => `<li><span>${esc(c.name)}</span>${meter(c.count, max)}<strong>${c.count}</strong></li>`).join('')}</ul>`;
  };

  function overview() {
    const role = S.actor.role;
    return role === 'secretary' ? secretaryOverview() : role === 'author' ? authorOverview() : role === 'reviewer' ? reviewerOverview() : leaderOverview();
  }

  /* ---------- Bài viết ---------- */

  function articles() {
    const role = S.actor.role;
    const title = U.pageLabel('articles');
    const text = role === 'reviewer' ? 'Bản thảo ẩn danh được phân công.' : role === 'author' ? 'Các bản thảo đã nộp.' : 'Theo dõi hồ sơ từ sơ duyệt, phản biện, chỉnh sửa đến đăng bản tin.';
    const toggle = role === 'secretary'
      ? `<div class="segmented" role="group" aria-label="Kiểu hiển thị"><button type="button" data-action="view" data-id="list" aria-pressed="${S.view === 'list'}">${icon('list')}<span>Danh sách</span></button><button type="button" data-action="view" data-id="board" aria-pressed="${S.view === 'board'}">${icon('columns')}<span>Bảng</span></button></div>`
      : '';
    const sort = `<label class="select-wrap"><span class="sr-only">Sắp xếp</span><select id="article-sort" aria-label="Sắp xếp">${[['recent', 'Mới nhất'], ['oldest', 'Cũ nhất'], ['status', 'Theo trạng thái'], ['title', 'Theo tên bài']].map(([v, l]) => `<option value="${v}"${S.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `${pageHead(title, text, role === 'author' ? button('Nộp bài mới', 'submit', '', 'btn btn-primary', 'plus') : role === 'secretary' ? button('Danh sách người nộp bài', 'author-list', '', 'btn', 'people') + button('Thêm người nộp mới', 'author-register', '', 'btn btn-primary', 'plus') : '')}
      <section class="panel">
        <div class="toolbar"><div class="search">${icon('search')}<input id="article-search" type="search" aria-label="Tìm bài viết" placeholder="Tìm theo tên bài hoặc mã hồ sơ" value="${esc(S.search)}" autocomplete="off"></div>${sort}${toggle}</div>
        <div id="chips">${statusChips()}</div>
        <div id="articles-body" class="${S.view === 'board' && role === 'secretary' ? 'is-board' : ''}">${articleList()}</div>
      </section>`;
  }

  /* ---------- Phản biện ---------- */

  function reviewRows() {
    return scoped().flatMap(a => a.reviews
      .filter(r => r.version === a.version && (S.actor.role !== 'reviewer' || r.reviewerId === S.actor.id))
      .map(r => ({ a: B.projectArticle(a, S.actor), r })));
  }

  function reviews() {
    const role = S.actor.role;
    const rows = reviewRows();
    const waiting = rows.filter(x => !x.r.result && ['reviewing', 'results'].includes(x.a.status));
    const groups = [
      ['Quá hạn', waiting.filter(x => B.daysUntil(x.r.due) < 0), 'late'],
      ['Trong 3 ngày tới', waiting.filter(x => { const n = B.daysUntil(x.r.due); return n >= 0 && n <= 3; }), 'soon'],
      ['Muộn hơn', waiting.filter(x => B.daysUntil(x.r.due) > 3), 'ok']
    ];
    const agenda = waiting.length
      ? `<div class="agenda">${groups.filter(g => g[1].length).map(([label, items, tone]) => `<section data-tone="${tone}"><h3>${label}<span>${items.length}</span></h3><ul>${items.sort((x, y) => x.r.due.localeCompare(y.r.due)).map(({ a, r }) => {
          const d = dueInfo(r.due);
          const mine = role === 'reviewer';
          return `<li><div><button type="button" class="link" data-action="detail" data-id="${esc(a.id)}">${esc(mine ? a.title : a.code)}</button><span class="task-meta">${mine ? esc(a.code) : esc(person(r.reviewerId)?.name)}</span></div><span class="due" data-tone="${d.tone}">${esc(d.text)}</span><time class="due-date">${fmtShort(r.due)}</time></li>`;
        }).join('')}</ul></section>`).join('')}</div>`
      : empty('Không có lượt nào đang chờ kết quả');
    const m = B.metrics(S.state, scoped());
    const own = rows.filter(x => x.r.result).length;
    const fig = role === 'reviewer'
      ? [{ label: 'Được giao', value: rows.length }, { label: 'Chờ đánh giá', value: waiting.length }, { label: 'Đã gửi', value: own }, { label: 'Quá hạn', value: overdue().length, tone: overdue().length ? 'late' : '' }]
      : [{ label: 'Lượt được giao', value: m.reviews.assigned }, { label: 'Đang chờ', value: m.reviews.pending }, { label: 'Đã có kết quả', value: m.reviews.done }, { label: 'Quá hạn', value: m.reviews.overdue, tone: m.reviews.overdue ? 'late' : '' }];
    const table = rows.length ? `<div class="table-wrap"><table class="tbl tbl-reviews"><thead><tr><th scope="col">Bài viết</th>${role === 'secretary' ? '<th scope="col">Người phản biện</th>' : ''}<th scope="col">Hạn</th><th scope="col">Kết quả</th><th scope="col"><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${rows.map(({ a, r }) => {
      const active = !r.result && a.status === 'reviewing';
      const d = dueInfo(r.due, !!r.result);
      const result = r.result ? badge(r.result) : ['reviewing', 'results'].includes(a.status) ? badge(d.tone === 'late' ? 'late' : 'reviewing', d.tone === 'late' ? 'Quá hạn' : 'Đang thực hiện') : badge('ready', 'Lượt đã kết thúc');
      const acts = role === 'reviewer'
        ? button(active ? 'Đánh giá' : 'Xem', active ? 'review' : 'detail', a.id, active ? 'btn btn-sm btn-primary' : 'btn btn-sm')
        : `${button('Xem', 'detail', a.id, 'btn btn-sm')}${active ? button('Gia hạn', 'extend', a.id, 'btn btn-sm', '', `data-reviewer="${esc(r.reviewerId)}"`) : ''}${active && d.days !== null && d.days <= 1 ? button('Nhắc hạn', 'remind', a.id, 'btn btn-sm', '', `data-reviewer="${esc(r.reviewerId)}"`) : ''}`;
      return `<tr><td class="c-title"><button type="button" class="link title" data-action="detail" data-id="${esc(a.id)}">${esc(a.title)}</button><span class="sub"><span>${esc(a.code)}</span><span>Phiên bản ${r.version}</span></span></td>${role === 'secretary' ? `<td class="c-who"><div class="who">${avatar(person(r.reviewerId)?.name)}<span>${esc(person(r.reviewerId)?.name)}<small class="sub">${esc(person(r.reviewerId)?.specialty)}</small></span></div></td>` : ''}<td class="c-due"><span>${fmt(r.due)}</span>${r.result ? '' : `<small class="due" data-tone="${d.tone}">${esc(d.text)}</small>`}</td><td class="c-status">${result}${r.criteria ? `<small class="sub">Điểm trung bình ${scoreAvg(r.criteria)}</small>` : ''}</td><td class="c-actions">${acts}</td></tr>`;
    }).join('')}</tbody></table></div>` : empty('Chưa có lượt phân công');
    return `${pageHead('Theo dõi phản biện', role === 'reviewer' ? 'Các lượt đánh giá được phân công.' : 'Mỗi người phản biện có thời hạn và kết quả riêng.', role === 'secretary' ? button('Danh sách người phản biện', 'reviewer-list', '', 'btn', 'people') + button('Thêm người phản biện', 'reviewer-add', '', 'btn btn-primary', 'plus') : '')}
      ${figures(fig)}
      ${panel('Lịch hạn', 'Các lượt đang chờ kết quả, xếp theo mức độ gấp', `<div class="panel-body">${agenda}</div>`)}
      ${panel(role === 'reviewer' ? 'Các lượt được phân công' : 'Danh sách phân công', '', table)}`;
  }

  /* ---------- Số bản tin ---------- */

  function issues() {
    const cards = S.state.issues.slice().reverse().map(x => {
      const items = x.articleIds.map(id => S.state.articles.find(a => a.id === id)).filter(Boolean);
      return `<article class="issue">
        <header class="issue-cover"><span class="issue-no">Số ${esc(x.number)}</span><h3>${esc(x.title)}</h3><span class="issue-school">Trường Chính trị tỉnh Tây Ninh</span></header>
        <div class="issue-meta">${badge(x.published ? 'published' : 'ready', x.published ? 'Đã phát hành' : 'Đang biên tập')}<span>${items.length} bài</span><span>${x.published ? 'Phát hành' : 'Dự kiến'} ${fmt(x.published ? (x.publishedAt || x.date) : x.date)}</span></div>
        ${items.length ? `<ol class="toc">${items.map(a => `<li><button type="button" class="link" data-action="detail" data-id="${esc(a.id)}">${esc(a.title)}</button></li>`).join('')}</ol>` : '<p class="muted pad">Chưa có bài trong mục lục.</p>'}
        <footer class="issue-actions">${button(x.published ? 'Xem mục lục' : 'Biên tập mục lục', 'issue-edit', x.id, 'btn btn-sm', x.published ? 'book' : 'edit')}${button('In mục lục', 'issue-print', x.id, 'btn btn-sm', 'printer')}${!x.published ? button('Phát hành số', 'issue-publish', x.id, 'btn btn-sm btn-primary', 'send') : ''}</footer>
      </article>`;
    }).join('');
    return `${pageHead('Số bản tin', 'Xếp bài đạt phản biện vào số, sắp thứ tự mục lục và ghi nhận phát hành.', button('Tạo số bản tin', 'issue-edit', '', 'btn btn-primary', 'plus'))}<div class="issues">${cards || empty('Chưa có số bản tin')}</div>`;
  }

  /* ---------- Báo cáo ---------- */

  function reports() {
    const list = scoped();
    const m = B.metrics(S.state, list);
    const author = S.actor.role === 'author';
    const fig = author
      ? [{ label: 'Bài đã nộp', value: m.total }, { label: 'Đang phản biện', value: m.byStatus.reviewing + m.byStatus.results }, { label: 'Cần chỉnh sửa', value: m.byStatus.revision, tone: m.byStatus.revision ? 'warn' : '' }, { label: 'Đạt hoặc đã đăng', value: m.completionRate + '%' }]
      : [{ label: 'Tổng bài tiếp nhận', value: m.total }, { label: 'Đúng hạn', value: m.onTimeRate == null ? '—' : m.onTimeRate + '%', note: 'trên các lượt đã có kết quả' }, { label: 'Tỷ lệ lượt đạt', value: m.passRate == null ? '—' : m.passRate + '%' }, { label: 'Lượt quá hạn', value: m.reviews.overdue, tone: m.reviews.overdue ? 'late' : '' }];
    const workload = S.actor.role === 'secretary'
      ? panel('Khối lượng của người phản biện', 'Số lượt được giao, đã xong và quá hạn', `<div class="panel-body"><ul class="workload">${m.workload.map(w => `<li><div>${avatar(w.name)}<span>${esc(w.name)}<small class="sub">${esc(w.specialty || '')}</small></span></div><div class="stack">${meter(w.done, Math.max(1, w.assigned), 'ok')}<span>${w.done}/${w.assigned}${w.overdue ? `<b class="due" data-tone="late">${w.overdue} quá hạn</b>` : ''}</span></div></li>`).join('')}</ul></div>`)
      : '';
    return `${pageHead(author ? 'Tiến độ bài đã nộp' : 'Báo cáo', author ? 'Thống kê các hồ sơ đã nộp.' : 'Tình hình tiếp nhận, phản biện và phát hành.', button('Tải báo cáo CSV', 'csv', '', 'btn', 'download'))}
      ${figures(fig)}
      <div class="grid-even">
        ${panel('Trạng thái bài viết', `${m.total} hồ sơ`, `<div class="panel-body">${donut(list)}</div>`)}
        ${panel('Theo chuyên mục', '', `<div class="panel-body">${categoryBars(m)}</div>`)}
      </div>
      ${workload}`;
  }

  /* ---------- Hướng dẫn ---------- */

  const flowSteps = [
    ['Nộp bài', 'Người nộp gửi tên bài, tóm tắt và tệp Word hoặc PDF.'],
    ['Sơ duyệt', 'Thư ký kiểm tra bản thảo. Bài chưa đủ điều kiện được trả lại kèm ý kiến.'],
    ['Phân công', 'Thư ký chuẩn bị bản ẩn danh, chọn người phản biện và đặt hạn cho từng người.'],
    ['Phản biện', 'Mỗi người đánh giá độc lập: Đạt, Cần chỉnh sửa hoặc Không đạt, kèm nhận xét và điểm theo tiêu chí.'],
    ['Tổng hợp', 'Tất cả đạt thì thư ký xác nhận. Nếu chưa, thư ký tổng hợp ý kiến gửi người nộp, không nêu tên người phản biện.'],
    ['Đăng bản tin', 'Bài đạt được xếp vào số bản tin và ghi nhận phát hành.']
  ];

  function flow() {
    return `<ol class="flow">${flowSteps.map(([t, d]) => `<li><strong>${esc(t)}</strong><p>${esc(d)}</p></li>`).join('')}</ol>
      <div class="callout" data-tone="warn">${icon('loop')}<div><p>Bản chỉnh sửa quay lại bước sơ duyệt và được phân công phản biện lại. Kết quả của phiên bản cũ được giữ trong lịch sử.</p></div></div>`;
  }

  function permissionTable() {
    const rows = [
      ['Người nộp bài', 'Hồ sơ của mình, tiến độ và ý kiến tổng hợp', 'Nộp bài; gửi bản chỉnh sửa khi có yêu cầu'],
      ['Thư ký', 'Danh tính tác giả, bản gốc và kết quả của từng người phản biện', 'Quản lý người nộp và người phản biện; sơ duyệt, phân công, tổng hợp, biên tập và đăng'],
      ['Người phản biện', 'Bản ẩn danh được giao và nhận xét của chính mình', 'Đánh giá độc lập và gửi kết quả về thư ký'],
      ['Trưởng, Phó Ban biên tập', 'Số liệu, tiến độ và thống kê chung', 'Chỉ xem, không xử lý hồ sơ']
    ];
    return `<div class="table-wrap"><table class="tbl tbl-plain"><thead><tr><th scope="col">Vai trò</th><th scope="col">Được xem</th><th scope="col">Được thao tác</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r[0])}</strong></td><td data-label="Được xem">${esc(r[1])}</td><td data-label="Được thao tác">${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function guide() {
    const secretary = S.actor.role === 'secretary';
    const store = `<div class="panel-body"><p class="plain">Hồ sơ và tệp đính kèm được lưu trên thiết bị đang dùng. Muốn chuyển sang máy khác, thư ký xuất dữ liệu rồi nhập vào máy mới; tệp đính kèm không đi theo.</p><p class="plain">Việc đăng bài ghi nhận trạng thái trong hệ thống, chưa đưa bài lên website của trường.</p>${secretary ? `<div class="btn-row">${button('Xuất dữ liệu', 'backup', '', 'btn', 'download')}${button('Nhập dữ liệu', 'import', '', 'btn', 'upload')}${button('Khôi phục dữ liệu ban đầu', 'reset', '', 'btn', 'repeat')}${button('Hoàn tác', 'undo-reset', '', 'btn')}</div>` : ''}</div>`;
    const keys = [['Ctrl + K', 'Tìm nhanh trang, bài viết, thao tác'], ['/', 'Tìm bài viết'], ['Esc', 'Đóng cửa sổ đang mở']];
    return `${pageHead('Hướng dẫn', 'Quy trình xử lý bài và quyền của từng vai trò.')}
      ${panel('Quy trình xử lý bài viết', '', `<div class="panel-body">${flow()}</div>`)}
      ${panel('Quyền theo vai trò', '', permissionTable())}
      <div class="grid-even">
        ${panel('Lưu trữ dữ liệu', '', store)}
        ${panel('Phím tắt', '', `<div class="panel-body"><dl class="keys">${keys.map(([k, d]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(d)}</dd></div>`).join('')}</dl></div>`)}
      </div>`;
  }

  /* ---------- Chi tiết hồ sơ ---------- */

  function fileCard(a, file, label, kind, version) {
    label = [U.fileKind(file), U.fileSize(file), label].filter(Boolean).join(', ');
    return `<div class="file-card">${icon('file')}<div><strong>${esc(file.name)}</strong><small>${esc(label)}</small></div>${button('Tải về', 'download-file', a.id, 'btn btn-sm', 'download', `data-kind="${kind}" data-version="${version}"`)}</div>`;
  }

  function reviewCard(r, a, reviewer) {
    const name = reviewer ? 'Lượt phản biện hiện tại' : person(r.reviewerId)?.name;
    const status = r.result ? badge(r.result) : badge('reviewing', r.version === a.version && a.status === 'reviewing' ? 'Chờ kết quả' : 'Lượt đã kết thúc');
    return `<div class="review-card"><header><div><strong>${esc(name)}</strong><small class="sub"><span>Phiên bản ${r.version}</span><span>Hạn ${fmt(r.due)}</span>${r.submitted ? `<span>Gửi ${fmt(r.submitted)}</span>` : ''}</small></div>${status}</header>${scoreList(r.criteria)}${r.comment ? `<p class="comment">${esc(r.comment)}</p>` : ''}</div>`;
  }

  function detail(id) {
    const source = S.state.articles.find(a => a.id === id);
    const a = source && B.projectArticle(source, S.actor);
    if (!a) return null;
    const role = S.actor.role;
    const reviewer = role === 'reviewer', secretary = role === 'secretary';
    const own = a.reviews.find(r => r.version === a.version && r.reviewerId === S.actor.id);

    const meta = `<dl class="meta"><div><dt>Mã hồ sơ</dt><dd>${esc(a.code)}</dd></div><div><dt>Phiên bản</dt><dd>${pad(a.version)}</dd></div><div><dt>Chuyên mục</dt><dd>${esc(a.category)}</dd></div>${!reviewer ? `<div><dt>Người nộp</dt><dd>${esc(a.authorName)}</dd></div><div><dt>Đơn vị</dt><dd>${esc(a.agency)}</dd></div><div><dt>Tiếp nhận</dt><dd>${fmt(a.created)}</dd></div>` : ''}</dl>`;

    const summary = `<section class="block"><h3>${reviewer ? 'Nội dung dùng cho phản biện' : 'Tóm tắt bản thảo'}</h3><p class="reading">${esc(reviewer ? (a.anonymous?.text || 'Phiên bản mới đang được chuẩn bị; chờ phân công lại.') : a.text)}</p></section>`;
    const author = !reviewer ? person(a.authorId) : null;
    const contact = secretary && author ? `<section class="block"><h3>Liên hệ người nộp</h3><dl class="meta"><div><dt>Email</dt><dd>${esc(author.email || 'Chưa ghi')}</dd></div><div><dt>Điện thoại</dt><dd>${esc(author.phone || 'Chưa ghi')}</dd></div></dl>${button('Sửa thông tin người nộp', 'author-edit', author.id, 'btn btn-sm')}</section>` : '';
    const files = !reviewer ? `<section class="block"><h3>Tệp bản thảo</h3>${a.versions.slice().reverse().map(v => fileCard(a, v.file, `Bản ${v.number}, ${fmt(v.created)}`, 'original', v.number)).join('')}</section>` : '';
    const anon = (reviewer || secretary) && a.anonymous ? `<section class="block"><h3>Tệp đã ẩn danh</h3>${fileCard(a, a.anonymous.file, `Bản ${a.anonymous.version}, đã xác nhận kiểm tra`, 'anonymous', a.anonymous.version)}</section>` : '';
    const feedback = !reviewer && a.feedback.length ? `<section class="block"><h3>Ý kiến đã gửi người nộp</h3>${a.feedback.slice().reverse().map(f => `<div class="feedback"><small>Phiên bản ${f.version}, ${fmt(f.at)}</small><p>${esc(f.text)}</p></div>`).join('')}</section>` : '';
    const reviewBlock = (reviewer || secretary) && a.reviews.length
      ? `<section class="block"><h3>${reviewer ? 'Kết quả đã gửi' : 'Các lượt phản biện'}</h3>${a.reviews.slice().sort((x, y) => y.version - x.version).map(r => reviewCard(r, a, reviewer)).join('')}</section>`
      : '';
    const timeline = !reviewer ? `<section class="block"><h3>Lịch sử xử lý</h3><ul class="timeline">${a.history.slice().reverse().map(h => `<li><span>${esc(h.text)}</span><time>${fmt(h.at)}</time></li>`).join('')}</ul></section>` : '';

    let body;
    if (reviewer) {
      body = `<div class="callout" data-tone="info">${icon('shield')}<div><p>Bản thảo ẩn danh. Kết quả được gửi riêng về thư ký.</p></div></div>${summary}${anon}${reviewBlock}`;
    } else {
      const tabs = [['content', 'Nội dung', contact + summary + files + anon + feedback]];
      if (secretary) tabs.push(['reviews', `Phản biện${a.reviews.length ? ` (${a.reviews.length})` : ''}`, reviewBlock || `<p class="muted pad">Chưa giao cho người phản biện nào.</p>`]);
      tabs.push(['history', 'Lịch sử', timeline]);
      body = `${stepper(a.status)}${meta}<div class="tabs" role="tablist">${tabs.map(([k, label], i) => `<button type="button" role="tab" id="tab-${k}" aria-controls="pane-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-action="tab" data-id="${k}">${esc(label)}</button>`).join('')}</div>${tabs.map(([k, , html], i) => `<div class="pane" role="tabpanel" id="pane-${k}" aria-labelledby="tab-${k}"${i ? ' hidden' : ''}>${html}</div>`).join('')}`;
    }

    let actions = '';
    if (secretary) {
      if (a.status === 'submitted') actions += button('Sơ duyệt', 'screen', id, 'btn btn-primary', 'task');
      if (a.status === 'ready') actions += button('Chuẩn bị bản ẩn danh và phân công', 'assign', id, 'btn btn-primary', 'people');
      if (['reviewing', 'results'].includes(a.status) && B.activeReviews(source).some(r => ['reject', 'revise'].includes(r.result))) actions += button('Tổng hợp và trả bản sửa', 'return', id, 'btn btn-primary', 'repeat');
      if (a.status === 'results' && B.allPass(source)) actions += button('Xác nhận đạt phản biện', 'approve', id, 'btn btn-primary', 'task');
      if (a.status === 'approved') actions += button('Đăng vào số bản tin', 'publish', id, 'btn btn-primary', 'send');
    }
    if (role === 'author' && a.status === 'revision') actions += button('Nộp bản chỉnh sửa', 'resubmit', id, 'btn btn-primary', 'repeat');
    if (reviewer && own && !own.result && a.status === 'reviewing') actions += button('Gửi đánh giá', 'review', id, 'btn btn-primary', 'task');

    return { title: a.title, badge: badge(a.status), code: a.code, body, actions };
  }

  U.views = { overview, articles, reviews, issues, reports, guide, articleList, statusChips, flow, permissionTable, detail, taskList, pageHead };
})();
