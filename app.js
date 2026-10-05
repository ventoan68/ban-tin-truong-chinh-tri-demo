(() => {
  'use strict';

  const U = window.UI;
  const { B, S, KEYS, $, $$, esc, fold, icon, fmt, pad, badge, button, avatar, person, toast, tasks, dueInfo } = U;
  const V = U.views;

  let lastFocused = null;
  let dialogReturn = null;
  let pendingImport = null;
  let fileDatabase = null;

  /* ---------- Hiển thị khung ứng dụng ---------- */

  const roleInitials = actor => actor.role === 'secretary' ? 'TK' : actor.role === 'leader' ? (actor.id === 'chief' ? 'TB' : 'PB') : U.initials(actor.name);

  function renderShell() {
    const pages = U.allowedPages();
    const link = (p, cls) => `<button type="button" class="${cls}${S.page === p ? ' active' : ''}" data-page="${p}" aria-label="${esc(U.pageLabel(p))}"${S.page === p ? ' aria-current="page"' : ''}>${icon(U.pageIcons[p])}<span>${esc(U.pageLabel(p))}</span>${cls === 'nav-item' && p === 'articles' ? `<span class="nav-count">${U.projected().length}</span>` : ''}</button>`;
    $('#navigation').innerHTML = pages.map(p => link(p, 'nav-item')).join('');
    $('#tabbar').innerHTML = pages.map(p => link(p, 'tab-item')).join('');
    document.title = `${U.pageLabel(S.page)} | Bản tin Trường Chính trị tỉnh Tây Ninh`;
    const label = `${esc(S.actor.name)}`;
    $('#role-btn').innerHTML = `${avatar(roleInitials(S.actor))}<span class="role-text"><strong>${label}</strong><small>${esc(S.actor.label)}</small></span>${icon('chevron')}`;
    $('#role-btn-top').innerHTML = avatar(roleInitials(S.actor));
    $('#role-btn-top').setAttribute('aria-label', `Vai trò hiện tại: ${S.actor.name}. Đổi vai trò`);
    const count = tasks().length;
    const badgeEl = $('#bell-count');
    badgeEl.textContent = count > 9 ? '9+' : String(count);
    badgeEl.hidden = !count;
    $('#theme-btn').innerHTML = icon(U.currentTheme() === 'dark' ? 'sun' : 'moon');
    $('#theme-btn').setAttribute('aria-label', U.currentTheme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  }

  function renderNotice() {
    const parts = [];
    if (S.notice) parts.push(`<div class="banner" data-tone="warn">${icon('alert')}<span>${esc(S.notice)}</span></div>`);
    $('#notice-slot').innerHTML = parts.join('');
  }

  function render() {
    if (!U.allowedPages().includes(S.page)) S.page = 'overview';
    renderShell();
    renderNotice();
    $('#content').innerHTML = V[S.page]();
  }

  function navigate(page, focus = true) {
    if (!U.allowedPages().includes(page)) return;
    closeDialog();
    closeMenu();
    S.page = page;
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) $('#content').focus({ preventScroll: true });
  }

  /* ---------- Hộp thoại ---------- */

  const dlg = () => $('#dialog');

  function openDialog({ title, meta = '', body, variant = 'modal' }) {
    const d = dlg();
    if (!d.open) lastFocused = document.activeElement;
    d.dataset.variant = variant;
    delete d.dataset.detailId;
    $('#dialog-title').textContent = title;
    $('#dialog-meta').innerHTML = meta;
    $('#dialog-content').innerHTML = body;
    $('.dlg-head', d).hidden = variant === 'palette';
    if (!d.open) d.showModal();
    $('.dlg-body', d)?.scrollTo?.(0, 0);
  }

  function closeDialog() {
    const d = dlg();
    dialogReturn = null;
    if (d.open) d.close();
  }

  function formDialog({ title, body, submit, type, id = '', variant = 'modal', meta = '', danger = false }) {
    const back = dlg().open && dlg().dataset.variant === 'drawer' ? dlg().dataset.detailId : null;
    dialogReturn = back || null;
    openDialog({
      title, meta, variant,
      body: `<form class="dlg-form" data-form="${esc(type)}" data-id="${esc(id)}" novalidate><div class="dlg-body">${body}<div class="form-error" role="alert"></div></div><div class="dlg-foot"><button type="button" class="btn" data-action="cancel">Hủy</button><button type="submit" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}">${esc(submit)}</button></div></form>`
    });
  }

  /* ---------- Thành phần biểu mẫu ---------- */

  const field = (label, control, { hint = '', required = false } = {}) =>
    `<label class="field"><span class="label">${esc(label)}${required ? '<em aria-hidden="true"> *</em>' : ''}</span>${control}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}</label>`;
  const input = (name, value = '', { required = true, placeholder = '', max = 300, type = 'text', extra = '' } = {}) =>
    `<input type="${type}" name="${name}" value="${esc(value)}"${required ? ' required' : ''} maxlength="${max}" placeholder="${esc(placeholder)}" autocomplete="off" ${extra}>`;
  const textarea = (name, value = '', { max = 6000, rows = 5, placeholder = '' } = {}) =>
    `<textarea name="${name}" rows="${rows}" maxlength="${max}" placeholder="${esc(placeholder)}" data-counter>${esc(value)}</textarea><span class="counter">${value.length} / ${max}</span>`;
  const note = (html, tone = 'info') => `<div class="callout" data-tone="${tone}">${icon(tone === 'warn' ? 'alert' : 'info')}<div>${html}</div></div>`;
  const check = (name, label, extra = '') => `<label class="check"><input type="checkbox" name="${name}" ${extra}><span>${esc(label)}</span></label>`;
  const articleRef = a => `<div class="ref"><strong>${esc(a.code)}</strong><span>${esc(a.title)}</span></div>`;

  function fileField(anonymous = false) {
    const label = anonymous ? 'Tệp đã ẩn danh' : 'Tệp bài viết';
    const hint = anonymous ? 'Không chọn tệp thì hệ thống tạo tệp Word ẩn danh từ nội dung ở trên.' : 'Không chọn tệp thì hệ thống tạo tệp Word từ tên bài và tóm tắt ở trên.';
    return `<div class="field"><span class="label">${label}</span>
      <label class="dropzone">
        <input type="file" name="attachment" accept=".doc,.docx,.pdf" aria-label="${label}">
        ${icon('upload')}
        <span class="dz-text"><strong>Chọn tệp</strong> hoặc kéo thả vào đây</span>
        <small>Word (DOC, DOCX) hoặc PDF, tối đa 10 MB</small>
        <span class="dz-name" hidden></span>
      </label>
      <small class="hint">${hint}</small>
    </div>`;
  }

  /* ---------- Chi tiết hồ sơ ---------- */

  function showDetail(id) {
    const view = V.detail(id);
    if (!view) { toast('Hồ sơ không thuộc phạm vi của vai trò hiện tại.', 'error'); return; }
    openDialog({
      title: view.title,
      meta: `${view.badge}<span class="code">${esc(view.code)}</span>`,
      variant: 'drawer',
      body: `<div class="dlg-body">${view.body}</div>${view.actions ? `<div class="dlg-foot">${view.actions}</div>` : ''}`
    });
    dlg().dataset.detailId = id;
  }

  /* ---------- Các biểu mẫu nghiệp vụ ---------- */

  function showSubmit() {
    if (S.actor.role !== 'author') return;
    formDialog({
      title: 'Nộp bài viết mới', type: 'submit', submit: 'Gửi bài',
      body: `${field('Tên bài viết', input('title', '', { placeholder: 'Từ 10 ký tự trở lên' }), { required: true })}
        <div class="form-grid">
          ${field('Chuyên mục', `<select name="category">${B.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select>`, { required: true })}
          ${field('Đơn vị công tác', input('agency', S.actor.agency || '', { required: false }))}
        </div>
        ${field('Tóm tắt nội dung', textarea('text', '', { placeholder: 'Nêu vấn đề, phạm vi và kết quả chính của bài viết (từ 40 ký tự)' }), { required: true })}
        ${fileField()}`
    });
  }

  function showScreen(id) {
    const a = S.state.articles.find(x => x.id === id);
    if (S.actor.role !== 'secretary' || a?.status !== 'submitted') return;
    formDialog({
      title: 'Sơ duyệt bài viết', type: 'screen', id, submit: 'Lưu sơ duyệt',
      body: `${articleRef(a)}
        <fieldset class="choice-group"><legend>Kết quả sơ duyệt</legend>
          <label class="choice" data-s="approved"><input type="radio" name="decision" value="pass" checked><span><strong>Đạt</strong><small>Chuyển sang phân công phản biện</small></span></label>
          <label class="choice" data-s="revision"><input type="radio" name="decision" value="return"><span><strong>Chưa đạt</strong><small>Trả lại người nộp để bổ sung</small></span></label>
        </fieldset>
        ${field('Ý kiến sơ duyệt', textarea('note', '', { rows: 4, max: 5000, placeholder: 'Bắt buộc khi trả bài: nêu rõ nội dung cần bổ sung' }))}`
    });
  }

  function showAssign(id) {
    const a = S.state.articles.find(x => x.id === id);
    if (S.actor.role !== 'secretary' || a?.status !== 'ready') return;
    const reviewers = S.state.people.filter(p => p.role === 'reviewer');
    formDialog({
      title: 'Chuẩn bị bản ẩn danh và phân công', type: 'assign', id, submit: 'Giao phản biện',
      body: `${note('<p>Kiểm tra tên tác giả, đơn vị, lời cảm ơn, bình luận và thuộc tính của tệp trước khi giao.</p>', 'warn')}
        ${field('Tiêu đề dùng cho phản biện', input('title', a.title), { required: true })}
        ${field('Nội dung dùng cho phản biện', textarea('text', a.text), { required: true })}
        ${fileField(true)}
        ${check('checked', 'Đã kiểm tra tiêu đề, nội dung và tệp; bản phản biện không tiết lộ danh tính tác giả.')}
        <fieldset class="people-pick"><legend>Người phản biện và hạn xử lý</legend>
          ${reviewers.map(p => `<div class="pick-row"><label class="check"><input type="checkbox" name="reviewerIds" value="${esc(p.id)}"><span><strong>${esc(p.name)}</strong><small>${esc(p.specialty)}</small></span></label><label class="pick-due"><span class="sr-only">Hạn của ${esc(p.name)}</span><input type="date" name="due-${esc(p.id)}" value="${B.offset(7)}" min="${B.date()}"></label></div>`).join('')}
        </fieldset>`
    });
  }

  function showReview(id) {
    const a = S.state.articles.find(x => x.id === id);
    const view = a && B.projectArticle(a, S.actor);
    const own = a && B.activeReviews(a).find(r => r.reviewerId === S.actor.id);
    if (S.actor.role !== 'reviewer' || !view || !own || own.result || a.status !== 'reviewing') return;
    const d = dueInfo(own.due);
    formDialog({
      title: 'Gửi kết quả phản biện', type: 'review', id, submit: 'Gửi kết quả',
      meta: `<span class="code">${esc(a.code)}</span><span class="due" data-tone="${d.tone}">${esc(d.text)}</span>`,
      body: `<section class="block"><h3>${esc(view.title)}</h3><p class="reading">${esc(view.anonymous?.text)}</p>${view.anonymous ? `<div class="file-card">${icon('file')}<div><strong>${esc(view.anonymous.file.name)}</strong><small>${esc(U.fileKind(view.anonymous.file))}, đã ẩn danh</small></div>${button('Tải về', 'download-file', a.id, 'btn btn-sm', 'download', `data-kind="anonymous" data-version="${a.version}"`)}</div>` : ''}</section>
        <fieldset class="choice-group"><legend>Kết quả đánh giá</legend>
          <label class="choice" data-s="approved"><input type="radio" name="result" value="pass"><span><strong>Đạt</strong><small>Đáp ứng yêu cầu</small></span></label>
          <label class="choice" data-s="revision"><input type="radio" name="result" value="revise"><span><strong>Cần chỉnh sửa</strong><small>Chấp nhận nếu sửa theo ý kiến</small></span></label>
          <label class="choice" data-s="reject"><input type="radio" name="result" value="reject"><span><strong>Không đạt</strong><small>Chưa phù hợp để đăng</small></span></label>
        </fieldset>
        <fieldset class="criteria"><legend>Chấm theo tiêu chí <small>Không bắt buộc. 1 là thấp nhất, 5 là cao nhất.</small></legend>
          ${Object.entries(B.criteria).map(([k, label]) => `<div class="crit"><span>${esc(label)}</span><div class="scale" role="radiogroup" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="crit-${k}" value="${n}"><span>${n}</span></label>`).join('')}</div></div>`).join('')}
        </fieldset>
        ${field('Nhận xét gửi thư ký', textarea('comment', '', { rows: 5, max: 5000, placeholder: 'Từ 10 ký tự trở lên' }), { required: true })}
        ${note('<p>Nhận xét được gửi riêng về thư ký để tổng hợp. Sau khi gửi, lượt đánh giá này hoàn tất và không sửa lại được.</p>')}`
    });
  }

  function showReturn(id) {
    const a = S.state.articles.find(x => x.id === id);
    if (S.actor.role !== 'secretary' || !a) return;
    const got = B.activeReviews(a).filter(r => r.result);
    formDialog({
      title: 'Tổng hợp ý kiến và trả bản sửa', type: 'return', id, submit: 'Gửi yêu cầu chỉnh sửa',
      body: `${articleRef(a)}
        <section class="block"><h3>Ý kiến đã nhận</h3>${got.map(r => `<div class="review-card"><header><strong>${esc(person(r.reviewerId)?.name)}</strong>${badge(r.result)}</header>${r.comment ? `<p class="comment">${esc(r.comment)}</p>` : ''}</div>`).join('') || '<p class="muted">Chưa có ý kiến nào.</p>'}</section>
        ${field('Ý kiến tổng hợp gửi người nộp', textarea('note', '', { rows: 5, max: 5000, placeholder: 'Viết lại ý kiến, không nêu tên hoặc dấu hiệu nhận dạng người phản biện' }), { required: true })}
        ${check('checked', 'Đã kiểm tra ý kiến tổng hợp không tiết lộ tên và danh tính người phản biện.')}`
    });
  }

  function showResubmit(id) {
    const a = S.state.articles.find(x => x.id === id);
    if (S.actor.role !== 'author' || a?.authorId !== S.actor.id || a.status !== 'revision') return;
    const last = a.feedback.at(-1);
    formDialog({
      title: 'Nộp bản chỉnh sửa', type: 'resubmit', id, submit: 'Gửi bản chỉnh sửa',
      body: `${articleRef(a)}
        ${last ? `<div class="feedback"><small>Yêu cầu gần nhất của thư ký</small><p>${esc(last.text)}</p></div>` : ''}
        ${field(`Nội dung bản sửa (phiên bản ${pad(a.version + 1)})`, textarea('text', a.text), { required: true })}
        ${fileField()}
        ${note('<p>Bản sửa được chuyển lại cho thư ký để sơ duyệt, sau đó phân công phản biện cho phiên bản mới.</p>')}`
    });
  }

  function showApprove(id) {
    const a = S.state.articles.find(x => x.id === id);
    if (S.actor.role !== 'secretary' || !a) return;
    formDialog({
      title: 'Xác nhận đạt phản biện', type: 'approve', id, submit: 'Xác nhận đạt',
      body: `${articleRef(a)}<section class="block"><h3>Kết quả của phiên bản ${a.version}</h3><ul class="plain-list">${B.activeReviews(a).map(r => `<li><span>${esc(person(r.reviewerId)?.name)}</span>${badge(r.result || 'reviewing', r.result ? B.results[r.result] : 'Chưa có kết quả')}</li>`).join('')}</ul></section>${note('<p>Chỉ xác nhận khi tất cả người được giao đều đánh giá đạt cho phiên bản hiện tại.</p>')}`
    });
  }

  function showPublish(id) {
    if (S.actor.role !== 'secretary') return;
    const a = S.state.articles.find(x => x.id === id);
    const open = S.state.issues.filter(x => !x.published && (!a.issueId || a.issueId === x.id));
    if (!open.length) {
      openDialog({ title: 'Đăng vào số bản tin', body: `<div class="dlg-body">${note('<p>Chưa có số bản tin đang biên tập phù hợp. Tạo số mới hoặc chỉnh mục lục trước khi đăng.</p>', 'warn')}</div><div class="dlg-foot"><button type="button" class="btn" data-action="cancel">Đóng</button>${button('Tạo số bản tin', 'issue-edit', '', 'btn btn-primary', 'plus')}</div>` });
      return;
    }
    formDialog({
      title: 'Đăng vào số bản tin', type: 'publish', id, submit: 'Xác nhận đăng',
      body: `${articleRef(a)}${field('Số bản tin', `<select name="issueId">${open.map(x => `<option value="${esc(x.id)}">Số ${esc(x.number)}, ${esc(x.title)}</option>`).join('')}</select>`, { required: true })}${note('<p>Bài sẽ được ghi nhận là đã đăng trong số bản tin đã chọn.</p>')}`
    });
  }

  function showExtend(id, reviewerId) {
    const a = S.state.articles.find(x => x.id === id);
    const r = a && B.activeReviews(a).find(x => x.reviewerId === reviewerId);
    if (S.actor.role !== 'secretary' || !r || r.result) return;
    const base = r.due > B.date() ? r.due : B.date();
    const d = new Date(base + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 3);
    formDialog({
      title: 'Gia hạn phản biện', type: 'extend', id, submit: 'Lưu hạn mới',
      body: `${articleRef(a)}<div class="ref"><strong>${esc(person(reviewerId)?.name)}</strong><span>Hạn hiện tại ${fmt(r.due)}</span></div><input type="hidden" name="reviewerId" value="${esc(reviewerId)}">${field('Hạn mới', `<input type="date" name="due" value="${d.toISOString().slice(0, 10)}" min="${B.date()}" required>`, { required: true })}`
    });
  }

  function showRemind(id, reviewerId) {
    const a = S.state.articles.find(x => x.id === id);
    const r = a && B.activeReviews(a).find(x => x.reviewerId === reviewerId);
    if (S.actor.role !== 'secretary' || !r) return;
    const text = U.reminderText(a, r);
    openDialog({
      title: 'Nhắc hạn phản biện',
      body: `<div class="dlg-body">${note('<p>Sao chép nội dung dưới đây rồi gửi qua Zalo hoặc email.</p>')}<label class="field"><span class="label">Nội dung nhắc</span><textarea id="remind-text" rows="6" readonly>${esc(text)}</textarea></label></div><div class="dlg-foot"><button type="button" class="btn" data-action="cancel">Đóng</button>${button('Sao chép nội dung', 'copy-remind', '', 'btn btn-primary', 'copy')}</div>`
    });
  }

  function showReviewerAdd() {
    if (S.actor.role !== 'secretary') return;
    formDialog({
      title: 'Thêm người phản biện', type: 'reviewer_add', submit: 'Thêm',
      body: `${field('Tên hiển thị', input('name', '', { placeholder: 'Ví dụ: TS. Nguyễn Văn Nam' }), { required: true, hint: 'Tên này chỉ thư ký nhìn thấy.' })}${field('Chuyên môn', input('specialty', '', { required: false }))}`
    });
  }

  function showIssue(id) {
    if (S.actor.role !== 'secretary') return;
    const issue = S.state.issues.find(x => x.id === id);
    if (issue?.published) {
      openDialog({
        title: `Mục lục số ${issue.number}`,
        meta: badge('published', 'Đã phát hành'),
        body: `<div class="dlg-body"><p class="muted">Phát hành ngày ${fmt(issue.publishedAt || issue.date)}.</p><ol class="toc">${issue.articleIds.map(aid => { const a = S.state.articles.find(x => x.id === aid); return a ? `<li><button type="button" class="link" data-action="detail" data-id="${esc(aid)}">${esc(a.title)}</button></li>` : ''; }).join('')}</ol></div><div class="dlg-foot"><button type="button" class="btn" data-action="cancel">Đóng</button></div>`
      });
      return;
    }
    const selected = issue?.articleIds || [];
    const candidates = [...selected, ...S.state.articles.filter(a => a.status === 'approved' && (!a.issueId || a.issueId === issue?.id) && !selected.includes(a.id)).map(a => a.id)];
    formDialog({
      title: issue ? `Biên tập số ${issue.number}` : 'Tạo số bản tin', type: 'issue_save', id, submit: 'Lưu số bản tin',
      body: `<div class="form-grid">${field('Số bản tin', input('number', issue?.number || `${pad(S.state.issues.length + 1)}/${new Date().getFullYear()}`), { required: true })}${field('Ngày dự kiến phát hành', `<input type="date" name="date" value="${issue?.date || B.offset(7)}" required>`, { required: true })}</div>
        ${field('Tên bản tin', input('title', issue?.title || 'Thông tin lý luận và thực tiễn'), { required: true })}
        <fieldset class="picks"><legend>Chọn bài và sắp thứ tự mục lục</legend><div id="issue-picks">${candidates.map(cid => {
          const a = S.state.articles.find(x => x.id === cid);
          return `<div class="issue-pick" data-pick="${esc(cid)}"><label class="check"><input type="checkbox" name="articleIds" value="${esc(cid)}"${selected.includes(cid) ? ' checked' : ''}${a.status === 'published' ? ' disabled' : ''}><span><strong>${esc(a.title)}</strong><small>${esc(a.code)}, ${esc(B.statuses[a.status])}</small></span></label><span class="move"><button type="button" class="icon-btn small" data-action="issue-up" aria-label="Đưa ${esc(a.code)} lên">${icon('up')}</button><button type="button" class="icon-btn small" data-action="issue-down" aria-label="Đưa ${esc(a.code)} xuống">${icon('down')}</button></span></div>`;
        }).join('') || '<p class="muted pad">Chưa có bài đạt phản biện để xếp vào số.</p>'}</div></fieldset>`
    });
  }

  function showIssuePublish(id) {
    if (S.actor.role !== 'secretary') return;
    const issue = S.state.issues.find(x => x.id === id);
    formDialog({
      title: `Phát hành số ${issue.number}`, type: 'issue_publish', id, submit: 'Xác nhận phát hành',
      body: `<div class="ref"><strong>${esc(issue.title)}</strong><span>${issue.articleIds.length} bài</span></div>${note('<p>Tất cả bài trong mục lục phải đạt phản biện ở phiên bản hiện tại.</p>')}`
    });
  }

  function showIssuePrint(id) {
    const issue = S.state.issues.find(x => x.id === id);
    if (!issue) return;
    const items = issue.articleIds.map(aid => S.state.articles.find(a => a.id === aid)).filter(Boolean);
    openDialog({
      title: `Mục lục số ${issue.number}`,
      body: `<div class="dlg-body print-sheet"><p class="sheet-school">Trường Chính trị tỉnh Tây Ninh</p><h3>${esc(issue.title)}</h3><p class="sheet-no">Số ${esc(issue.number)}, ${fmt(issue.published ? (issue.publishedAt || issue.date) : issue.date)}</p><ol class="toc print">${items.map(a => `<li><span>${esc(a.title)}</span><small>${esc(a.category)}</small></li>`).join('') || '<li><span>Chưa có bài trong mục lục.</span></li>'}</ol></div><div class="dlg-foot"><button type="button" class="btn" data-action="cancel">Đóng</button>${button('In mục lục', 'print', '', 'btn btn-primary', 'printer')}</div>`
    });
  }

  function showReset() {
    if (S.actor.role !== 'secretary') return;
    formDialog({
      title: 'Khôi phục dữ liệu ban đầu', type: 'reset', submit: 'Khôi phục', danger: true,
      body: note('<p>Toàn bộ thao tác trên trình duyệt này sẽ được thay bằng bộ hồ sơ khởi tạo. Trạng thái hiện tại được giữ lại để hoàn tác.</p>', 'warn')
    });
  }

  function showImportConfirm(info) {
    formDialog({
      title: 'Nhập dữ liệu', type: 'import_confirm', submit: 'Nhập và thay thế', danger: true,
      body: `${note(`<p>Tệp <strong>${esc(info.name)}</strong> có ${info.articles} hồ sơ và ${info.issues} số bản tin. Dữ liệu hiện tại sẽ được thay thế; bản hiện tại được giữ lại để hoàn tác.</p>`, 'warn')}`
    });
  }

  /* ---------- Tìm nhanh ---------- */

  let paletteIndex = 0;
  let paletteRows = [];

  function paletteItems(query) {
    const q = fold(query.trim());
    const out = [];
    for (const p of U.allowedPages()) out.push({ kind: 'Trang', ico: U.pageIcons[p], label: U.pageLabel(p), run: () => navigate(p) });
    if (S.actor.role === 'author') out.push({ kind: 'Thao tác', ico: 'plus', label: 'Nộp bài mới', run: showSubmit });
    if (S.actor.role === 'secretary') {
      out.push({ kind: 'Thao tác', ico: 'plus', label: 'Tạo số bản tin', run: () => showIssue('') });
      out.push({ kind: 'Thao tác', ico: 'plus', label: 'Thêm người phản biện', run: showReviewerAdd });
    }
    out.push({ kind: 'Thao tác', ico: U.currentTheme() === 'dark' ? 'sun' : 'moon', label: U.currentTheme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối', run: () => { U.toggleTheme(); render(); } });
    if (S.actor.role !== 'leader') {
      for (const a of U.projected()) out.push({ kind: 'Bài viết', ico: 'file', label: a.title, sub: `${a.code}${a.authorName && S.actor.role === 'secretary' ? ', ' + a.authorName : ''}`, hay: `${a.title} ${a.code} ${a.authorName || ''}`, run: () => showDetail(a.id) });
    }
    return out.filter(x => !q || fold(x.hay || x.label).includes(q)).slice(0, 12);
  }

  function renderPalette(query = '') {
    paletteRows = paletteItems(query);
    paletteIndex = Math.min(paletteIndex, Math.max(0, paletteRows.length - 1));
    const list = $('#palette-list');
    list.innerHTML = paletteRows.length
      ? paletteRows.map((r, i) => `<li role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === paletteIndex}">${icon(r.ico)}<span class="pal-main"><strong>${esc(r.label)}</strong>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="pal-kind">${esc(r.kind)}</span></li>`).join('')
      : '<li class="pal-empty">Không tìm thấy kết quả phù hợp</li>';
    $('#palette-input').setAttribute('aria-activedescendant', paletteRows.length ? `pal-${paletteIndex}` : '');
    $(`#pal-${paletteIndex}`)?.scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    closeMenu();
    paletteIndex = 0;
    openDialog({
      title: 'Tìm nhanh', variant: 'palette',
      body: `<div class="palette"><div class="pal-input">${icon('search')}<input id="palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-label="Tìm trang, bài viết hoặc thao tác" placeholder="Tìm trang, bài viết hoặc thao tác" autocomplete="off"><kbd>Esc</kbd></div><ul id="palette-list" role="listbox"></ul></div>`
    });
    renderPalette();
    $('#palette-input').focus();
  }

  function runPalette(i) {
    const row = paletteRows[i];
    if (!row) return;
    closeDialog();
    row.run();
  }

  /* ---------- Menu nổi ---------- */

  let menuTrigger = null;

  function closeMenu() {
    const m = $('#menu');
    if (m.hidden) return;
    m.hidden = true;
    menuTrigger?.setAttribute('aria-expanded', 'false');
    menuTrigger = null;
  }

  function openMenu(trigger, html, placement) {
    const m = $('#menu');
    if (!m.hidden && menuTrigger === trigger) { closeMenu(); return; }
    closeMenu();
    menuTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    m.innerHTML = html;
    m.hidden = false;
    m.style.cssText = '';
    const r = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 16);
    m.style.width = width + 'px';
    if (placement === 'up') {
      m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';
      m.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      m.style.maxHeight = Math.max(160, r.top - 16) + 'px';
    } else {
      m.style.top = (r.bottom + 8) + 'px';
      m.style.left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)) + 'px';
      m.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 16) + 'px';
    }
    m.querySelector('button')?.focus();
  }

  function roleMenu(trigger) {
    const people = S.state.people;
    const item = (key, name, sub, av) => `<button type="button" role="menuitemradio" aria-checked="${S.actorKey === key}" class="menu-item${S.actorKey === key ? ' active' : ''}" data-action="role" data-id="${esc(key)}">${avatar(av)}<span><strong>${esc(name)}</strong><small>${esc(sub)}</small></span>${S.actorKey === key ? icon('tick') : ''}</button>`;
    const group = (label, items) => `<div class="menu-group" role="group" aria-label="${esc(label)}"><p>${esc(label)}</p>${items}</div>`;
    const html = `<div class="menu-head"><strong>Đổi vai trò</strong><p>Mỗi vai trò có màn hình và quyền riêng.</p></div>
      ${group('Biên tập', item('secretary', 'Thư ký biên tập', 'Xử lý toàn bộ quy trình', 'TK'))}
      ${group('Người nộp bài', people.filter(p => p.role === 'author').map(p => item(p.id, p.name, p.agency, p.name)).join(''))}
      ${group('Người phản biện', people.filter(p => p.role === 'reviewer').map(p => item(p.id, p.name, p.specialty, p.name)).join(''))}
      ${group('Chỉ xem số liệu', item('chief', 'Trưởng Ban biên tập', 'Theo dõi tiến độ', 'TB') + item('deputy', 'Phó Ban biên tập', 'Theo dõi tiến độ', 'PB'))}`;
    openMenu(trigger, `<div class="menu-inner" role="menu" aria-label="Đổi vai trò">${html}</div>`, trigger.id === 'role-btn' ? 'up' : 'down');
  }

  function bellMenu(trigger) {
    const list = tasks();
    const rows = list.slice(0, 6).map(t => `<button type="button" class="menu-item note-item" data-tone="${t.tone}" data-action="detail" data-id="${esc(t.id)}"><span class="task-ico">${icon(t.ico)}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.note)}</small></span></button>`).join('');
    const html = `<div class="menu-head"><strong>Việc cần xử lý</strong><p>${list.length ? `${list.length} việc trong vai trò hiện tại` : 'Không có việc tồn đọng'}</p></div>${rows || ''}${list.length ? `<div class="menu-foot">${button('Mở tổng quan', 'nav-overview', '', 'link')}</div>` : ''}`;
    openMenu(trigger, `<div class="menu-inner" role="dialog" aria-label="Việc cần xử lý">${html}</div>`, 'down');
  }

  /* ---------- Tệp đính kèm ---------- */

  function openDatabase() {
    if (!fileDatabase) {
      fileDatabase = new Promise((resolve, reject) => {
        const request = indexedDB.open('tayninh-bantin-files-v2', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Không mở được nơi lưu tệp trên trình duyệt.'));
      });
    }
    return fileDatabase;
  }

  async function fileStore(operation, key, value) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', operation === 'put' ? 'readwrite' : 'readonly');
      const store = tx.objectStore('files');
      const req = operation === 'put' ? store.put(value, key) : store.get(key);
      let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(new Error('Chưa lưu được tệp. Kiểm tra dung lượng trình duyệt.'));
      tx.onabort = () => reject(new Error('Thao tác lưu tệp bị gián đoạn.'));
    });
  }

  async function collectFile(form) {
    const f = form.elements.attachment.files[0];
    if (!f) return { auto: true, ext: 'docx', size: 0 };
    const ext = f.name.split('.').at(-1).toLowerCase();
    if (!['doc', 'docx', 'pdf'].includes(ext) || f.size > 10 * 1024 * 1024 || f.size === 0) throw new Error('Chọn tệp DOC, DOCX hoặc PDF có nội dung, tối đa 10 MB.');
    const key = crypto.randomUUID();
    await fileStore('put', key, f);
    return { key, name: f.name, ext, size: f.size, auto: false };
  }

  function saveDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const SCHOOL = 'Trường Chính trị tỉnh Tây Ninh';

  /* Dựng tài liệu Word từ dữ liệu bài viết (chỉ dùng phần mà vai trò hiện tại được xem) */
  function wordDocument(view, kind, version) {
    if (kind === 'anonymous') {
      const an = view.anonymous;
      const body = an.body;
      return {
        category: view.category, title: an.title, created: view.created,
        ...(body ? { abstract: an.text, keywords: body.keywords, blocks: body.blocks, refs: body.refs } : { blocks: WordFile.fromText(an.text) })
      };
    }
    const v = view.versions.find(x => x.number === Number(version));
    const body = v.body;
    return {
      category: view.category, title: view.title, created: v.created,
      author: view.authorName,
      agency: view.agency ? (/Trường/.test(view.agency) ? view.agency : `${view.agency}, ${SCHOOL}`) : SCHOOL,
      ...(body ? { abstract: v.text, keywords: body.keywords, blocks: body.blocks, refs: body.refs } : { blocks: WordFile.fromText(v.text) })
    };
  }

  async function downloadFile(id, kind, version) {
    const a = S.state.articles.find(x => x.id === id);
    const view = a && B.projectArticle(a, S.actor);
    if (!view) throw new Error('Tệp không thuộc phạm vi vai trò hiện tại.');
    let file;
    if (kind === 'anonymous' && ['reviewer', 'secretary'].includes(S.actor.role) && view.anonymous && view.anonymous.version === Number(version)) {
      file = view.anonymous.file;
    } else if (kind === 'original' && ['secretary', 'author'].includes(S.actor.role)) {
      file = view.versions.find(x => x.number === Number(version))?.file;
    }
    if (!file) throw new Error('Tệp không thuộc phân công hoặc phiên bản được phép xem.');
    const blob = file.auto || file.sample ? WordFile.blob(wordDocument(view, kind, version)) : await fileStore('get', file.key);
    if (!blob) throw new Error('Tệp không còn trên trình duyệt này.');
    saveDownload(blob, file.name);
  }

  function exportCSV() {
    const list = U.scoped();
    const rows = [['Trạng thái', 'Số bài'], ...Object.entries(B.statuses).map(([s, label]) => [label, list.filter(a => a.status === s).length])];
    if (S.actor.role === 'secretary') {
      rows.push([], ['Mã hồ sơ', 'Tên bài', 'Người nộp', 'Chuyên mục', 'Phiên bản', 'Trạng thái'], ...list.map(a => [a.code, a.title, a.authorName, a.category, a.version, B.statuses[a.status]]));
    }
    const safe = v => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    saveDownload(new Blob(['\ufeff' + rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `bao-cao-ban-tin-${B.date()}.csv`);
    toast('Đã tải báo cáo theo phạm vi vai trò hiện tại.');
  }

  /* ---------- Gửi biểu mẫu ---------- */

  const DONE = {
    submit: 'Đã tiếp nhận bài viết.',
    screen: 'Đã lưu kết quả sơ duyệt.',
    assign: 'Đã giao bản ẩn danh cho người phản biện.',
    review: 'Đã gửi kết quả về thư ký.',
    return: 'Đã gửi yêu cầu chỉnh sửa cho người nộp.',
    resubmit: 'Đã nộp phiên bản mới, chờ sơ duyệt lại.',
    approve: 'Đã xác nhận đạt phản biện.',
    publish: 'Đã ghi nhận đăng bài vào số bản tin.',
    extend: 'Đã lưu hạn phản biện mới.',
    issue_save: 'Đã lưu số bản tin.',
    issue_publish: 'Đã phát hành số bản tin.',
    reviewer_add: 'Đã thêm người phản biện.'
  };

  async function handleForm(event) {
    const f = event.target;
    if (!f.matches('form[data-form]')) return;
    event.preventDefault();
    const submit = f.querySelector('button[type=submit]');
    const error = f.querySelector('.form-error');
    submit.disabled = true;
    error.classList.remove('visible');
    try {
      const data = new FormData(f);
      const type = f.dataset.form;
      const p = { id: f.dataset.id };
      for (const name of ['title', 'text', 'category', 'agency', 'decision', 'note', 'result', 'comment', 'issueId', 'number', 'date', 'specialty', 'name', 'reviewerId', 'due']) {
        if (data.has(name)) p[name] = data.get(name);
      }
      p.checked = data.has('checked');
      if (['submit', 'assign', 'resubmit'].includes(type)) p.file = await collectFile(f);
      if (type === 'assign') {
        p.reviewerIds = data.getAll('reviewerIds');
        p.dueMap = Object.fromEntries(p.reviewerIds.map(id => [id, data.get('due-' + id)]));
      }
      if (type === 'review') p.criteria = Object.fromEntries(Object.keys(B.criteria).map(k => [k, data.get('crit-' + k)]));
      if (type === 'issue_save') {
        p.issueId = f.dataset.id || null;
        p.articleIds = $$('input[name=articleIds]', f).filter(el => el.checked).map(el => el.value);
      }
      if (type === 'issue_publish') p.issueId = f.dataset.id;

      if (type === 'reset' || type === 'import_confirm') {
        const next = type === 'reset' ? B.seed() : pendingImport?.state;
        if (!next) throw new Error('Chưa có dữ liệu để nhập.');
        try { localStorage.setItem(KEYS.backup, JSON.stringify(S.state)); } catch { throw new Error('Chưa lưu được bản để hoàn tác.'); }
        U.commit(next);
        pendingImport = null;
        if (!S.state.people.some(x => x.id === S.actorKey) && !['secretary', 'chief', 'deputy'].includes(S.actorKey)) U.setActor('secretary');
        else S.actor = B.actorInfo(S.state, S.actorKey);
        closeDialog();
        render();
        toast(type === 'reset' ? 'Đã khôi phục dữ liệu ban đầu. Có thể hoàn tác ở trang Hướng dẫn.' : 'Đã nhập dữ liệu. Có thể hoàn tác ở trang Hướng dẫn.');
        return;
      }

      U.commit(B.apply(S.state, S.actor, type, p));
      S.actor = B.actorInfo(S.state, S.actorKey);
      closeDialog();
      render();
      toast(DONE[type] || 'Đã lưu thao tác.', 'ok');
    } catch (e) {
      error.textContent = e.message;
      error.classList.add('visible');
      submit.disabled = false;
      const scroller = f.querySelector('.dlg-body');
      if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    }
  }

  /* ---------- Điều khiển sự kiện ---------- */

  function refreshArticles() {
    const body = $('#articles-body');
    if (!body) return;
    body.className = S.view === 'board' && S.actor.role === 'secretary' ? 'is-board' : '';
    body.innerHTML = V.articleList();
    $('#chips').innerHTML = V.statusChips();
  }

  const openers = {
    detail: id => showDetail(id), submit: showSubmit, screen: showScreen, assign: showAssign, review: showReview,
    return: showReturn, resubmit: showResubmit, approve: showApprove, publish: showPublish,
    'issue-edit': id => showIssue(id), 'issue-publish': showIssuePublish, 'issue-print': showIssuePrint
  };

  async function onAction(target) {
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action.startsWith('nav-')) return navigate(action.slice(4));
    if (openers[action]) return openers[action](id);
    switch (action) {
      case 'cancel': {
        const back = dialogReturn;
        closeDialog();
        if (back) showDetail(back);
        return;
      }
      case 'stage': S.filter = id; S.search = ''; return navigate('articles');
      case 'chip': S.filter = id; refreshArticles(); return;
      case 'view': S.view = id; U.remember(KEYS.view, id); refreshArticles(); $$('.segmented button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id))); return;
      case 'tab': return selectTab(target);
      case 'role': {
        closeMenu();
        U.setActor(id);
        S.search = ''; S.filter = ''; S.page = 'overview';
        closeDialog();
        render();
        window.scrollTo({ top: 0, behavior: 'instant' });
        toast(`Đang xem với vai trò: ${S.actor.name}`);
        return;
      }
      case 'remind': return showRemind(id, target.dataset.reviewer);
      case 'extend': return showExtend(id, target.dataset.reviewer);
      case 'reviewer-add': return showReviewerAdd();
      case 'reset': return showReset();
      case 'download-file': return downloadFile(id, target.dataset.kind, target.dataset.version);
      case 'csv': return exportCSV();
      case 'print': return window.print();
      case 'copy-remind': {
        const ok = await U.copyText($('#remind-text').value);
        toast(ok ? 'Đã sao chép nội dung nhắc.' : 'Không sao chép được. Hãy chọn và sao chép thủ công.', ok ? 'ok' : 'error');
        return;
      }
      case 'issue-up':
      case 'issue-down': {
        const row = target.closest('.issue-pick');
        const parent = row.parentElement;
        if (action === 'issue-up' && row.previousElementSibling) parent.insertBefore(row, row.previousElementSibling);
        if (action === 'issue-down' && row.nextElementSibling) parent.insertBefore(row.nextElementSibling, row);
        target.focus();
        return;
      }
      case 'backup': {
        if (S.actor.role !== 'secretary') return;
        saveDownload(new Blob([JSON.stringify(S.state, null, 2)], { type: 'application/json' }), `du-lieu-ban-tin-${B.date()}.json`);
        toast('Đã xuất dữ liệu hồ sơ, không gồm tệp đính kèm.');
        return;
      }
      case 'import': return $('#import-input').click();
      case 'undo-reset': {
        if (S.actor.role !== 'secretary') return;
        let previous = null;
        try { previous = JSON.parse(localStorage.getItem(KEYS.backup) || 'null'); } catch { previous = null; }
        if (!B.isValidState(previous)) throw new Error('Chưa có lần khôi phục hoặc nhập dữ liệu để hoàn tác.');
        const current = S.state;
        U.commit(previous);
        localStorage.setItem(KEYS.backup, JSON.stringify(current));
        render();
        toast('Đã hoàn tác.');
        return;
      }
      default:
    }
  }

  function selectTab(tab) {
    const list = tab.closest('[role=tablist]');
    $$('[role=tab]', list).forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const pane = document.getElementById(t.getAttribute('aria-controls'));
      if (pane) pane.hidden = !on;
    });
  }

  document.addEventListener('submit', handleForm);

  document.addEventListener('click', async event => {
    const t = event.target;
    const menu = $('#menu');
    if (!menu.hidden && !menu.contains(t) && !t.closest('#role-btn, #role-btn-top, #bell')) closeMenu();
    const el = t.closest('[data-page],[data-action]');
    if (!el) return;
    if (el.dataset.page) { navigate(el.dataset.page); return; }
    if (menu.contains(el)) closeMenu();
    try { await onAction(el); }
    catch (e) { toast(e.message, 'error'); }
  });

  $('#role-btn').addEventListener('click', e => roleMenu(e.currentTarget));
  $('#role-btn-top').addEventListener('click', e => roleMenu(e.currentTarget));
  $('#bell').addEventListener('click', e => bellMenu(e.currentTarget));
  $('#open-palette').addEventListener('click', openPalette);
  $('#theme-btn').addEventListener('click', () => { U.toggleTheme(); renderShell(); });
  $('#close-dialog').addEventListener('click', closeDialog);
  $('.brand').addEventListener('click', e => { e.preventDefault(); navigate('overview'); });

  dlg().addEventListener('click', e => { if (e.target === dlg()) closeDialog(); });
  dlg().addEventListener('close', () => {
    if (dlg().open) return;
    delete dlg().dataset.detailId;
    if (lastFocused?.isConnected) lastFocused.focus();
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'article-search') { S.search = t.value; refreshArticles(); }
    else if (t.id === 'palette-input') { paletteIndex = 0; renderPalette(t.value); }
    else if (t.matches('[data-counter]')) { const c = t.nextElementSibling; if (c?.classList.contains('counter')) c.textContent = `${t.value.length} / ${t.maxLength}`; }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'article-sort') { S.sort = t.value; refreshArticles(); }
    else if (t.type === 'file' && t.name === 'attachment') {
      const zone = t.closest('.dropzone');
      const name = $('.dz-name', zone);
      const file = t.files[0];
      name.hidden = !file;
      name.textContent = file ? `${file.name} (${(file.size / 1048576).toFixed(2)} MB)` : '';
      zone.classList.toggle('has-file', !!file);
    }
  });

  document.addEventListener('dragover', e => { const z = e.target.closest?.('.dropzone'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', e => e.target.closest?.('.dropzone')?.classList.remove('over'));
  document.addEventListener('drop', e => {
    const z = e.target.closest?.('.dropzone');
    if (!z) return;
    e.preventDefault();
    z.classList.remove('over');
    const inputEl = $('input[type=file]', z);
    if (e.dataTransfer.files.length) { inputEl.files = e.dataTransfer.files; inputEl.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !t.closest('input, textarea, select, [contenteditable]') && !dlg().open) {
      e.preventDefault();
      const box = $('#article-search');
      if (box) box.focus(); else openPalette();
      return;
    }
    if (e.key === 'Escape' && !$('#menu').hidden) { const trigger = menuTrigger; closeMenu(); trigger?.focus(); return; }
    if (t.id === 'palette-input') {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteRows.length - 1, paletteIndex + 1); renderPalette(t.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(0, paletteIndex - 1); renderPalette(t.value); }
      else if (e.key === 'Enter') { e.preventDefault(); runPalette(paletteIndex); }
    }
    if (t.matches?.('[role=tab]') && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const tabs = $$('[role=tab]', t.closest('[role=tablist]'));
      const next = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    }
    const menuItems = t.closest?.('#menu') ? $$('#menu .menu-item') : [];
    if (menuItems.length && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const i = menuItems.indexOf(t);
      menuItems[(i + (e.key === 'ArrowDown' ? 1 : -1) + menuItems.length) % menuItems.length].focus();
    }
  });

  document.addEventListener('click', e => {
    const row = e.target.closest('#palette-list li[data-i]');
    if (row) runPalette(Number(row.dataset.i));
  });

  $('#import-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || S.actor.role !== 'secretary') return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Tệp quá lớn để nhập. Chỉ nhận tệp dữ liệu xuất từ ứng dụng.');
      const state = JSON.parse(await file.text());
      if (!B.isValidState(state)) throw new Error('Tệp không đúng định dạng dữ liệu của ứng dụng.');
      pendingImport = { state, name: file.name };
      showImportConfirm({ name: file.name, articles: state.articles.length, issues: state.issues.length });
    } catch (err) {
      toast(err instanceof SyntaxError ? 'Tệp không phải dữ liệu hợp lệ.' : err.message, 'error');
    }
  });

  window.addEventListener('storage', e => {
    if (e.key !== KEYS.state || !e.newValue) return;
    try {
      const updated = JSON.parse(e.newValue);
      if (!B.isValidState(updated)) return;
      S.state = updated;
      try { S.actor = B.actorInfo(S.state, S.actorKey); } catch { U.setActor('secretary'); }
      closeDialog();
      render();
      toast('Dữ liệu vừa được cập nhật từ một thẻ khác của trình duyệt.');
    } catch { /* bỏ qua */ }
  });

  /* ---------- Khởi động ---------- */

  U.initSession();
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  U.render = render;
})();
