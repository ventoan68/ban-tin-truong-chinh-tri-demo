(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bulletin = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const statuses = { submitted: 'Chờ sơ duyệt', ready: 'Chờ phân công', reviewing: 'Đang phản biện', results: 'Chờ tổng hợp', revision: 'Chờ bản chỉnh sửa', approved: 'Đạt phản biện', published: 'Đã đăng' };
  const results = { pass: 'Đạt', revise: 'Cần chỉnh sửa', reject: 'Không đạt' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const date = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const offset = n => { const d = new Date(date() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const stamp = () => new Date().toISOString();
  const required = (value, min, max = 5000) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
  const fail = message => { throw new Error(message); };
  const requireRole = (actor, role) => { if (actor.role !== role) fail('Vai trò hiện tại không được thực hiện thao tác này.'); };
  function sampleFile(code, version, anonymous = false) {
    return { key: null, name: `${code}-${anonymous ? 'phan-bien' : 'ban-thao'}-v${version}.txt`, ext: 'txt', size: 0, sample: true };
  }
  function checkFile(file) {
    if (!file || (!file.sample && (!['pdf', 'doc', 'docx'].includes(file.ext) || !file.key || file.size > 10 * 1024 * 1024))) fail('Chọn tệp DOC, DOCX hoặc PDF, tối đa 10 MB.');
  }
  function activeReviews(article) { return article.reviews.filter(r => r.version === article.version); }
  function allPass(article) {
    const reviews = activeReviews(article);
    return !!article.anonymous?.checked && article.anonymous.version === article.version && reviews.length > 0 && reviews.every(r => r.result === 'pass');
  }
  function maySee(actor, article) {
    return actor.role === 'secretary' || (actor.role === 'author' && article.authorId === actor.id) || (actor.role === 'reviewer' && article.reviews.some(r => r.reviewerId === actor.id));
  }
  function visibleArticles(state, actor) { return state.articles.filter(a => maySee(actor, a)); }
  function actorInfo(state, key) {
    if (key === 'secretary') return { role: 'secretary', id: 'secretary', name: 'Thư ký biên tập', label: 'Thư ký' };
    if (key === 'chief' || key === 'deputy') return { role: 'leader', id: key, name: key === 'chief' ? 'Trưởng Ban biên tập' : 'Phó Ban biên tập', label: key === 'chief' ? 'Trưởng Ban biên tập' : 'Phó Ban biên tập' };
    const person = state.people.find(p => p.id === key);
    if (!person) fail('Không tìm thấy vai trò.');
    return { ...person, label: person.role === 'author' ? 'Người nộp bài' : 'Người phản biện' };
  }
  function projectArticle(article, actor) {
    if (!maySee(actor, article)) return null;
    if (actor.role === 'reviewer') {
      const own = article.reviews.filter(r => r.reviewerId === actor.id);
      const permittedAnonymous = own.some(r => r.version === article.version) && article.anonymous?.version === article.version ? article.anonymous : null;
      return {
        id: article.id, code: article.code, title: permittedAnonymous?.title || 'Lượt phản biện đã kết thúc', category: article.category,
        text: permittedAnonymous?.text || '', version: article.version, status: article.status,
        anonymous: permittedAnonymous ? clone(permittedAnonymous) : null,
        reviews: clone(own), created: article.created,
        history: [{ at: article.created, text: 'Hồ sơ được giao phản biện.' }]
      };
    }
    const copy = clone(article);
    if (actor.role === 'author') {
      delete copy.anonymous;
      copy.reviews = [];
      copy.history = copy.history.filter(h => h.audience !== 'secretary').map(h => ({ at: h.at, text: h.publicText || h.text }));
    }
    return copy;
  }
  function seed() {
    const people = [
      { id: 'author1', role: 'author', name: 'Tác giả mẫu 01', agency: 'Đơn vị mẫu 01' },
      { id: 'author2', role: 'author', name: 'Tác giả mẫu 02', agency: 'Đơn vị mẫu 02' },
      { id: 'reviewer1', role: 'reviewer', name: 'Phản biện 01', specialty: 'Lý luận chính trị' },
      { id: 'reviewer2', role: 'reviewer', name: 'Phản biện 02', specialty: 'Đào tạo, bồi dưỡng' },
      { id: 'reviewer3', role: 'reviewer', name: 'Phản biện 03', specialty: 'Thực tiễn cơ sở' }
    ];
    const titles = [
      'Xây dựng văn hóa học tập trong đội ngũ cán bộ cơ sở',
      'Gắn nghiên cứu khoa học với tổng kết thực tiễn địa phương',
      'Rèn luyện kỹ năng xử lý tình huống cho đội ngũ cán bộ',
      'Nâng cao hiệu quả phối hợp trong thực hiện nhiệm vụ ở cơ sở',
      'Ứng dụng công nghệ số trong quản lý hoạt động bồi dưỡng',
      'Đổi mới phương pháp giảng dạy gắn lý luận với thực tiễn',
      'Phát huy vai trò của cán bộ cơ sở trong chuyển đổi số',
      'Nâng cao chất lượng bồi dưỡng lý luận chính trị tại cơ sở'
    ];
    const stages = ['published', 'approved', 'reviewing', 'results', 'revision', 'reviewing', 'ready', 'submitted'];
    const articles = titles.map((title, i) => {
      const code = `BT-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`;
      const person = people[i === 2 || i === 3 || i === 6 ? 1 : 0];
      const text = `Bài viết tập trung vào ${title.toLocaleLowerCase('vi')}, phân tích những vấn đề đặt ra trong thực tiễn và đề xuất giải pháp thực hiện. Nội dung này là bản thảo minh họa phục vụ thử quy trình tiếp nhận, phản biện và biên tập bản tin.`;
      const a = { id: `article${i + 1}`, code, title, category: ['Đào tạo, bồi dưỡng', 'Nghiên cứu, trao đổi', 'Thực tiễn cơ sở'][i % 3], authorId: person.id, authorName: person.name, agency: person.agency, text, created: offset(-20 + i * 2), version: 1, status: stages[i], issueId: i === 0 ? 'issue1' : i === 1 ? 'issue2' : null, reviews: [], feedback: [], history: [{ at: offset(-20 + i * 2), text: 'Tiếp nhận bản thảo phiên bản 01.' }], versions: [{ number: 1, created: offset(-20 + i * 2), text, file: sampleFile(code, 1) }], anonymous: null };
      if (i < 6) {
        a.anonymous = { version: 1, title, text, file: sampleFile(code, 1, true), checked: true };
        a.reviews = ['reviewer1', i === 2 || i === 4 ? 'reviewer3' : 'reviewer2'].map((id, n) => ({ reviewerId: id, version: 1, due: offset(i === 2 && n === 0 ? -3 : 5 + n), result: [0, 1, 3].includes(i) ? 'pass' : i === 4 ? (n === 0 ? 'revise' : 'reject') : i === 2 && n === 1 ? 'pass' : null, comment: [0, 1, 3].includes(i) ? 'Nội dung đáp ứng yêu cầu; bố cục và luận cứ phù hợp.' : i === 4 ? 'Cần bổ sung dẫn chứng thực tiễn và làm rõ nhóm giải pháp.' : i === 2 && n === 1 ? 'Bản thảo đáp ứng yêu cầu đánh giá.' : '', submitted: [0, 1, 3, 4].includes(i) || i === 2 && n === 1 ? offset(-1) : null }));
        a.history.push({ at: offset(-5), text: 'Giao 02 người phản biện độc lập.', publicText: 'Bản thảo được chuyển phản biện.' });
      }
      if (i === 4) {
        a.feedback.push({ version: 1, at: offset(-1), text: 'Bổ sung các dẫn chứng thực tiễn; làm rõ cách triển khai, đơn vị thực hiện và điều kiện áp dụng các giải pháp.' });
        a.history.push({ at: offset(-1), text: 'Gửi ý kiến tổng hợp và yêu cầu chỉnh sửa.' });
      }
      if (i === 6) a.history.push({ at: offset(-1), text: 'Sơ duyệt đạt; chờ chuẩn bị bản ẩn danh và phân công.' });
      if (i === 0) a.history.push({ at: offset(-1), text: 'Đã đăng trong số bản tin mẫu 01/2026.' });
      return a;
    });
    return { schema: 2, people, articles, issues: [{ id: 'issue1', title: 'Thông tin lý luận và thực tiễn', number: '01/2026', date: offset(-1), articleIds: ['article1'], published: true }, { id: 'issue2', title: 'Thông tin lý luận và thực tiễn', number: '02/2026', date: offset(10), articleIds: ['article2'], published: false }] };
  }
  function apply(state, actor, type, payload = {}) {
    const next = clone(state);
    const a = next.articles.find(item => item.id === payload.id);
    const history = (text, extra = {}) => a.history.push({ at: stamp(), text, ...extra });
    if (type === 'submit') {
      requireRole(actor, 'author');
      if (!required(payload.title, 10, 300) || !required(payload.text, 40, 6000)) fail('Nhập tên bài từ 10 ký tự và tóm tắt từ 40 ký tự.');
      checkFile(payload.file);
      const n = Math.max(0, ...next.articles.map(x => Number(x.code.split('-').at(-1)) || 0)) + 1;
      const code = `BT-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
      const file = payload.file.sample ? sampleFile(code, 1) : clone(payload.file);
      next.articles.unshift({ id: payload.articleId || `article-${Date.now()}`, code, title: payload.title.trim(), category: payload.category, authorId: actor.id, authorName: actor.name, agency: payload.agency?.trim() || actor.agency || 'Đơn vị mẫu', text: payload.text.trim(), created: stamp(), version: 1, status: 'submitted', issueId: null, reviews: [], feedback: [], anonymous: null, versions: [{ number: 1, created: stamp(), text: payload.text.trim(), file }], history: [{ at: stamp(), text: 'Tiếp nhận bản thảo phiên bản 01.' }] });
      return next;
    }
    if (type === 'reviewer_add') {
      requireRole(actor, 'secretary');
      if (!required(payload.name, 3, 100)) fail('Nhập tên hiển thị người phản biện.');
      if (next.people.some(p => p.role === 'reviewer' && p.name.toLowerCase() === payload.name.trim().toLowerCase())) fail('Tên người phản biện đã có trong danh sách.');
      next.people.push({ id: payload.personId || `reviewer-${Date.now()}`, role: 'reviewer', name: payload.name.trim(), specialty: payload.specialty?.trim() || 'Chuyên môn khác' });
      return next;
    }
    if (type === 'issue_save') {
      requireRole(actor, 'secretary');
      if (!required(payload.number, 1, 30) || !required(payload.title, 3, 200) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date || '')) fail('Điền đủ tên, số bản tin và ngày phát hành.');
      const existing = next.issues.find(x => x.id === payload.issueId);
      if (existing?.published) fail('Số bản tin đã phát hành, chỉ được xem.');
      const ids = [...new Set(payload.articleIds || [])];
      if (ids.some(id => !next.articles.some(x => x.id === id && (x.status === 'approved' || x.status === 'published' && x.issueId === existing?.id) && (!x.issueId || x.issueId === existing?.id)))) fail('Chỉ chọn bài đạt phản biện và chưa thuộc số bản tin khác.');
      if (existing && next.articles.some(x => x.status === 'published' && x.issueId === existing.id && !ids.includes(x.id))) fail('Không thể bỏ bài đã đăng khỏi số bản tin.');
      const item = { id: existing?.id || `issue-${Date.now()}`, number: payload.number.trim(), title: payload.title.trim(), date: payload.date, articleIds: ids, published: false };
      if (next.issues.some(x => x.id !== item.id && x.number === item.number)) fail('Số bản tin này đã tồn tại.');
      if (existing) { next.articles.filter(x => x.issueId === existing.id && !ids.includes(x.id)).forEach(x => x.issueId = null); Object.assign(existing, item); }
      else next.issues.push(item);
      ids.forEach(id => next.articles.find(x => x.id === id).issueId = item.id);
      return next;
    }
    if (type === 'issue_publish') {
      requireRole(actor, 'secretary');
      const issue = next.issues.find(x => x.id === payload.issueId);
      if (!issue || issue.published || issue.articleIds.length === 0) fail('Số bản tin phải có bài đạt phản biện trước khi phát hành.');
      const members = issue.articleIds.map(id => next.articles.find(x => x.id === id));
      if (members.some(x => !x || !['approved', 'published'].includes(x.status) || x.issueId !== issue.id || !allPass(x))) fail('Chưa đủ kết quả đạt để phát hành số bản tin.');
      issue.published = true;
      members.filter(x => x.status !== 'published').forEach(x => { x.status = 'published'; x.issueId = issue.id; x.history.push({ at: stamp(), text: `Đăng trong số bản tin ${issue.number} (bản dùng thử).` }); });
      return next;
    }
    if (!a || !maySee(actor, a)) fail('Hồ sơ không thuộc phạm vi của vai trò hiện tại.');
    if (type === 'screen') {
      requireRole(actor, 'secretary');
      if (a.status !== 'submitted') fail('Hồ sơ không còn chờ sơ duyệt.');
      if (payload.decision === 'pass') { a.status = 'ready'; history('Sơ duyệt đạt; chuyển chuẩn bị bản ẩn danh và phân công.'); }
      else {
        if (!required(payload.note, 10, 5000)) fail('Ghi rõ nội dung cần bổ sung hoặc lý do trả bài.');
        a.status = 'revision'; a.feedback.push({ version: a.version, at: stamp(), text: payload.note.trim() }); history('Trả bản thảo sau sơ duyệt, kèm ý kiến bổ sung.');
      }
    } else if (type === 'assign') {
      requireRole(actor, 'secretary');
      if (a.status !== 'ready') fail('Hoàn thành sơ duyệt trước khi phân công.');
      const ids = [...new Set(payload.reviewerIds || [])];
      if (!ids.length || ids.some(id => !next.people.some(p => p.id === id && p.role === 'reviewer'))) fail('Chọn ít nhất một người phản biện trong danh sách.');
      if (!payload.checked || !required(payload.title, 10, 300) || !required(payload.text, 40, 6000)) fail('Chuẩn bị nội dung ẩn danh và xác nhận đã kiểm tra danh tính.');
      const deadlines = Object.fromEntries(ids.map(id => [id, payload.dueMap?.[id] || payload.due]));
      if (Object.values(deadlines).some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d || '') || d < date() || !Number.isFinite(Date.parse(d + 'T12:00:00Z')))) fail('Nhập hạn phản biện hợp lệ, không trước ngày hiện tại.');
      checkFile(payload.file);
      const file = payload.file.sample ? sampleFile(a.code, a.version, true) : { ...clone(payload.file), name: `${a.code}-phan-bien-v${a.version}.${payload.file.ext}` };
      a.anonymous = { version: a.version, title: payload.title.trim(), text: payload.text.trim(), file, checked: true };
      a.reviews.push(...ids.map(id => ({ reviewerId: id, version: a.version, due: deadlines[id], result: null, comment: '', submitted: null })));
      a.status = 'reviewing';
      history(`Giao ${ids.length} người phản biện với thời hạn riêng.`, { publicText: 'Bản thảo được chuyển phản biện.' });
    } else if (type === 'review') {
      requireRole(actor, 'reviewer');
      const r = activeReviews(a).find(r => r.reviewerId === actor.id);
      if (!r || r.result || a.status !== 'reviewing') fail('Lượt phản biện này đã kết thúc hoặc không thuộc phân công hiện tại.');
      if (!results[payload.result] || !required(payload.comment, 10, 5000)) fail('Chọn kết quả và ghi nhận xét từ 10 ký tự.');
      Object.assign(r, { result: payload.result, comment: payload.comment.trim(), submitted: stamp() });
      history(`${actor.name} gửi kết quả: ${results[payload.result]}.`, { audience: 'secretary' });
      if (activeReviews(a).every(r => r.result)) { a.status = 'results'; history('Đã nhận đủ kết quả; chờ thư ký tổng hợp.'); }
    } else if (type === 'return') {
      requireRole(actor, 'secretary');
      if (!['reviewing', 'results'].includes(a.status) || !activeReviews(a).some(r => ['revise', 'reject'].includes(r.result))) fail('Chưa có kết quả yêu cầu chỉnh sửa hoặc không đạt để trả bài.');
      if (!payload.checked || !required(payload.note, 10, 5000)) fail('Nhập ý kiến tổng hợp và xác nhận không tiết lộ người phản biện.');
      a.status = 'revision'; a.feedback.push({ version: a.version, at: stamp(), text: payload.note.trim() }); history('Gửi ý kiến tổng hợp, yêu cầu bổ sung bản chỉnh sửa.');
    } else if (type === 'resubmit') {
      requireRole(actor, 'author');
      if (a.authorId !== actor.id || a.status !== 'revision') fail('Chỉ người nộp hồ sơ được bổ sung bản chỉnh sửa khi có yêu cầu.');
      if (!required(payload.text, 40, 6000)) fail('Nhập nội dung bản sửa từ 40 ký tự.');
      checkFile(payload.file); a.version += 1; a.text = payload.text.trim(); a.anonymous = null; a.status = 'submitted';
      a.versions.push({ number: a.version, created: stamp(), text: a.text, file: payload.file.sample ? sampleFile(a.code, a.version) : clone(payload.file) });
      history(`Tiếp nhận phiên bản ${String(a.version).padStart(2, '0')}; sơ duyệt lại trước khi phản biện.`);
    } else if (type === 'approve') {
      requireRole(actor, 'secretary');
      if (a.status !== 'results' || !allPass(a)) fail('Chỉ xác nhận đạt khi tất cả người được phân công đều đánh giá đạt cho phiên bản hiện tại.');
      a.status = 'approved'; history('Tất cả phản biện đạt; hoàn tất tổng hợp và đưa vào danh sách biên tập.');
    } else if (type === 'publish') {
      requireRole(actor, 'secretary');
      if (a.status !== 'approved' || !allPass(a)) fail('Chưa đủ điều kiện đăng bài.');
      const issue = next.issues.find(x => x.id === payload.issueId);
      if (!issue || issue.published || a.issueId && a.issueId !== issue.id) fail('Chọn số bản tin đang biên tập phù hợp với hồ sơ.');
      a.status = 'published'; a.issueId = issue.id;
      if (!issue.articleIds.includes(a.id)) issue.articleIds.push(a.id);
      history(`Đăng trong số bản tin ${issue.number} (bản dùng thử).`);
    } else fail('Thao tác không hợp lệ.');
    return next;
  }
  return { statuses, results, seed, apply, actorInfo, visibleArticles, projectArticle, activeReviews, allPass, sampleFile, date, offset };
});
