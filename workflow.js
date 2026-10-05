(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bulletin = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const statuses = {
    submitted: 'Chờ sơ duyệt',
    ready: 'Chờ phân công',
    reviewing: 'Đang phản biện',
    results: 'Chờ tổng hợp',
    revision: 'Chờ bản sửa',
    approved: 'Đạt phản biện',
    published: 'Đã đăng'
  };
  const results = { pass: 'Đạt', revise: 'Cần chỉnh sửa', reject: 'Không đạt' };
  const criteria = { content: 'Nội dung', argument: 'Lập luận', practice: 'Gắn thực tiễn', form: 'Hình thức' };
  const categories = ['Đào tạo, bồi dưỡng', 'Nghiên cứu, trao đổi', 'Thực tiễn cơ sở'];

  const clone = value => JSON.parse(JSON.stringify(value));
  const vnDay = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const date = () => vnDay(new Date());
  const offset = n => {
    const d = new Date(date() + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const stamp = () => new Date().toISOString();
  const dayOf = value => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    return isNaN(d) ? '' : vnDay(d);
  };
  const daysUntil = value => Math.round((Date.parse(dayOf(value) + 'T00:00:00Z') - Date.parse(date() + 'T00:00:00Z')) / 86400000);
  const isDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T12:00:00Z'));
  const required = (value, min, max = 5000) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
  const fail = message => { throw new Error(message); };
  const requireRole = (actor, role) => {
    if (actor.role !== role) fail('Vai trò hiện tại không được thực hiện thao tác này.');
  };

  function autoFile(code, version, anonymous = false) {
    return { key: null, name: `${code}-${anonymous ? 'phan-bien' : 'ban-thao'}-v${version}.docx`, ext: 'docx', size: 0, auto: true };
  }

  function loadSamples() {
    if (typeof globalThis !== 'undefined' && globalThis.BulletinSamples) return globalThis.BulletinSamples;
    if (typeof require === 'function') return require('./samples.js');
    throw new Error('Thiếu bộ bài viết khởi tạo.');
  }

  function checkFile(file) {
    const bad = !file || (!file.auto && (!['pdf', 'doc', 'docx'].includes(file.ext) || !file.key || file.size > 10 * 1024 * 1024));
    if (bad) fail('Chọn tệp DOC, DOCX hoặc PDF, tối đa 10 MB.');
  }

  function activeReviews(article) {
    return article.reviews.filter(r => r.version === article.version);
  }

  function allPass(article) {
    const reviews = activeReviews(article);
    return !!article.anonymous?.checked && article.anonymous.version === article.version && reviews.length > 0 && reviews.every(r => r.result === 'pass');
  }

  function maySee(actor, article) {
    return actor.role === 'secretary'
      || (actor.role === 'author' && article.authorId === actor.id)
      || (actor.role === 'reviewer' && article.reviews.some(r => r.reviewerId === actor.id));
  }

  function visibleArticles(state, actor) {
    return state.articles.filter(a => maySee(actor, a));
  }

  function actorInfo(state, key) {
    if (key === 'secretary') return { role: 'secretary', id: 'secretary', name: 'Thư ký biên tập', label: 'Thư ký' };
    if (key === 'chief' || key === 'deputy') {
      const name = key === 'chief' ? 'Trưởng Ban biên tập' : 'Phó Ban biên tập';
      return { role: 'leader', id: key, name, label: 'Chỉ xem số liệu' };
    }
    const person = state.people.find(p => p.id === key);
    if (!person) fail('Không tìm thấy vai trò.');
    return { ...person, label: person.role === 'author' ? 'Người nộp bài' : 'Người phản biện' };
  }

  function projectArticle(article, actor) {
    if (!maySee(actor, article)) return null;
    if (actor.role === 'reviewer') {
      const own = article.reviews.filter(r => r.reviewerId === actor.id);
      const allowed = own.some(r => r.version === article.version) && article.anonymous?.version === article.version ? article.anonymous : null;
      return {
        id: article.id, code: article.code, title: allowed?.title || 'Lượt phản biện đã kết thúc', category: article.category,
        text: allowed?.text || '', version: article.version, status: article.status,
        anonymous: allowed ? clone(allowed) : null,
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

  function isValidState(s) {
    return !!s && s.schema === 2
      && Array.isArray(s.people) && Array.isArray(s.articles) && Array.isArray(s.issues)
      && s.people.every(p => p && typeof p.id === 'string' && ['author', 'reviewer'].includes(p.role) && typeof p.name === 'string')
      && s.articles.every(a => a && typeof a.id === 'string' && typeof a.title === 'string' && statuses[a.status]
        && Number.isInteger(a.version) && Array.isArray(a.reviews) && Array.isArray(a.history) && Array.isArray(a.versions) && Array.isArray(a.feedback))
      && s.issues.every(i => i && typeof i.id === 'string' && Array.isArray(i.articleIds));
  }

  function metrics(state, list = state.articles) {
    const today = date();
    const byStatus = Object.fromEntries(Object.keys(statuses).map(k => [k, list.filter(a => a.status === k).length]));
    const rows = list.flatMap(a => a.reviews.map(r => ({ a, r })));
    const done = rows.filter(x => x.r.result);
    const pending = rows.filter(x => !x.r.result && x.r.version === x.a.version && ['reviewing', 'results'].includes(x.a.status));
    const overdue = pending.filter(x => x.r.due < today);
    const onTime = done.filter(x => dayOf(x.r.submitted) <= x.r.due);
    return {
      total: list.length,
      byStatus,
      reviews: { assigned: rows.length, done: done.length, pending: pending.length, overdue: overdue.length },
      onTimeRate: done.length ? Math.round(onTime.length / done.length * 100) : null,
      passRate: done.length ? Math.round(done.filter(x => x.r.result === 'pass').length / done.length * 100) : null,
      completionRate: list.length ? Math.round((byStatus.approved + byStatus.published) / list.length * 100) : 0,
      categories: categories.map(name => ({ name, count: list.filter(a => a.category === name).length })),
      workload: state.people.filter(p => p.role === 'reviewer').map(p => {
        const mine = rows.filter(x => x.r.reviewerId === p.id);
        return {
          id: p.id, name: p.name, specialty: p.specialty,
          assigned: mine.length,
          done: mine.filter(x => x.r.result).length,
          overdue: overdue.filter(x => x.r.reviewerId === p.id).length
        };
      })
    };
  }

  function seed() {
    const data = loadSamples();
    const year = new Date().getFullYear();
    const people = clone(data.people);
    const stages = ['published', 'approved', 'reviewing', 'results', 'revision', 'reviewing', 'ready', 'submitted'];
    const goodScore = [
      { content: 5, argument: 4, practice: 4, form: 5 },
      { content: 4, argument: 4, practice: 5, form: 4 }
    ];
    const passNote = [
      'Bài viết có bố cục rõ ràng, lập luận chặt chẽ, dẫn chứng phù hợp. Đề nghị biên tập lại một số câu cho gọn.',
      'Nội dung đáp ứng yêu cầu của bản tin; các giải pháp đưa ra có tính khả thi. Có thể đăng.'
    ];
    const articles = data.articles.map((sample, i) => {
      const code = `BT-${year}-${String(i + 1).padStart(3, '0')}`;
      const author = people.find(p => p.id === sample.author);
      const created = offset(-20 + i * 2);
      const body = { keywords: sample.keywords, blocks: clone(sample.blocks), refs: clone(sample.refs) };
      const article = {
        id: `article${i + 1}`, code, title: sample.title, category: sample.category,
        authorId: author.id, authorName: author.name, agency: author.agency,
        text: sample.summary, created, version: 1, status: stages[i],
        issueId: i === 0 ? 'issue1' : i === 1 ? 'issue2' : null,
        reviews: [], feedback: [],
        history: [{ at: created, text: 'Tiếp nhận bản thảo phiên bản 01.' }],
        versions: [{ number: 1, created, text: sample.summary, body, file: autoFile(code, 1) }],
        anonymous: null
      };
      if (i < 6) {
        article.anonymous = { version: 1, title: sample.title, text: sample.summary, body: clone(body), file: autoFile(code, 1, true), checked: true };
        const reviewerIds = ['reviewer1', i === 2 || i === 4 ? 'reviewer3' : 'reviewer2'];
        article.reviews = reviewerIds.map((id, n) => {
          const passed = [0, 1, 3].includes(i);
          const finished = passed || i === 4 || (i === 2 && n === 1);
          const result = passed ? 'pass' : i === 4 ? (n === 0 ? 'revise' : 'reject') : (i === 2 && n === 1 ? 'pass' : null);
          const comment = passed ? passNote[n % 2]
            : i === 4 ? (n === 0 ? 'Các giải pháp còn nêu chung. Cần bổ sung dẫn chứng thực tiễn từ một số cơ sở đã ứng dụng và làm rõ thứ tự ưu tiên.' : 'Phần thực trạng chưa có ví dụ hoặc số liệu cụ thể. Đề nghị viết lại để làm rõ điều kiện áp dụng của từng giải pháp.')
            : i === 2 && n === 1 ? 'Bản thảo đáp ứng yêu cầu; quy trình năm bước rõ ràng, dễ vận dụng.' : '';
          const review = { reviewerId: id, version: 1, due: offset(i === 2 && n === 0 ? -3 : 5 + n), result, comment, submitted: finished ? offset(-1) : null };
          if (passed || (i === 2 && n === 1)) review.criteria = goodScore[n % 2];
          if (i === 4) review.criteria = n === 0 ? { content: 3, argument: 3, practice: 2, form: 4 } : { content: 2, argument: 2, practice: 2, form: 3 };
          return review;
        });
        article.history.push({ at: offset(-5), text: 'Giao 02 người phản biện độc lập.', publicText: 'Bản thảo được chuyển phản biện.' });
      }
      if (i === 4) {
        article.feedback.push({ version: 1, at: offset(-1), text: 'Bổ sung dẫn chứng thực tiễn từ một số cơ sở đã ứng dụng công nghệ số; làm rõ lộ trình thực hiện, thứ tự ưu tiên và điều kiện áp dụng của từng nhóm giải pháp.' });
        article.history.push({ at: offset(-1), text: 'Gửi ý kiến tổng hợp và yêu cầu chỉnh sửa.' });
      }
      if (i === 6) article.history.push({ at: offset(-1), text: 'Sơ duyệt đạt; chờ chuẩn bị bản ẩn danh và phân công.' });
      if (i === 0) article.history.push({ at: offset(-1), text: `Đăng trong số bản tin 01/${year}.` });
      return article;
    });
    return {
      schema: 2, people, articles,
      issues: [
        { id: 'issue1', title: 'Thông tin lý luận và thực tiễn', number: `01/${year}`, date: offset(-1), articleIds: ['article1'], published: true },
        { id: 'issue2', title: 'Thông tin lý luận và thực tiễn', number: `02/${year}`, date: offset(10), articleIds: ['article2'], published: false }
      ]
    };
  }

  function readCriteria(input) {
    if (!input) return null;
    const keys = Object.keys(criteria);
    const given = keys.filter(k => input[k] != null && input[k] !== '');
    if (!given.length) return null;
    const valid = given.length === keys.length && keys.every(k => Number.isInteger(Number(input[k])) && Number(input[k]) >= 1 && Number(input[k]) <= 5);
    if (!valid) fail('Chấm đủ 4 tiêu chí, mỗi tiêu chí từ 1 đến 5 điểm, hoặc để trống cả bốn.');
    return Object.fromEntries(keys.map(k => [k, Number(input[k])]));
  }

  function personFields(payload, role) {
    const read = key => typeof payload[key] === 'string' ? payload[key].trim() : '';
    const value = Object.fromEntries(['name', 'agency', 'specialty', 'email', 'phone'].map(key => [key, read(key)]));
    if (!required(value.name, 3, 100)) fail('Nhập họ tên từ 3 đến 100 ký tự.');
    if (role === 'author' && !required(value.agency, 2, 200)) fail('Nhập đơn vị công tác từ 2 đến 200 ký tự.');
    if (value.agency.length > 200 || value.specialty.length > 200) fail('Đơn vị và chuyên môn tối đa 200 ký tự.');
    if (value.email && (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) fail('Địa chỉ email chưa hợp lệ.');
    if (value.phone && (!/^[+\d\s().-]+$/.test(value.phone) || !/^\d{8,15}$/.test(value.phone.replace(/\D/g, '')))) fail('Số điện thoại phải có từ 8 đến 15 chữ số.');
    if (role === 'author' && !value.email && !value.phone) fail('Nhập email hoặc số điện thoại để liên hệ.');
    if (role === 'reviewer' && !value.specialty) value.specialty = 'Chuyên môn khác';
    return value;
  }

  function savePerson(state, role, payload, editing = false) {
    const next = clone(state);
    const fields = personFields(payload, role);
    const existing = editing ? next.people.find(p => p.id === payload.personId && p.role === role) : null;
    if (editing && !existing) fail('Không tìm thấy người cần cập nhật.');
    const same = (x, y) => x.trim().normalize('NFC').toLocaleLowerCase('vi') === y.trim().normalize('NFC').toLocaleLowerCase('vi');
    const phoneKey = phone => (phone || '').replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '0');
    const duplicate = next.people.some(p => p.role === role && p.id !== existing?.id &&
      ((fields.email && p.email && same(p.email, fields.email)) ||
       (fields.phone && p.phone && phoneKey(p.phone) === phoneKey(fields.phone)) ||
       (same(p.name, fields.name) && same(p.agency || '', fields.agency))));
    if (duplicate) fail('Thông tin này đã có trong danh sách. Kiểm tra họ tên, đơn vị, email hoặc số điện thoại.');
    const id = existing?.id || payload.personId || `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    if (!existing && (['secretary', 'chief', 'deputy'].includes(id) || next.people.some(p => p.id === id))) fail('Mã người dùng đã tồn tại.');
    if (existing) {
      Object.assign(existing, fields, { updatedAt: stamp() });
      if (role === 'author') next.articles.filter(a => a.authorId === id).forEach(a => {
        if (a.authorName !== fields.name || a.agency !== fields.agency) {
          a.authorName = fields.name;
          a.agency = fields.agency;
          a.history.push({ at: stamp(), text: 'Cập nhật thông tin người nộp bài.' });
        }
      });
    } else next.people.push({ id, role, ...fields, createdAt: stamp() });
    return next;
  }

  // Người mới chỉ tạo hồ sơ của mình; không sửa người khác hoặc đổi quyền.
  function registerAuthor(state, payload) {
    return savePerson(state, 'author', payload);
  }

  function apply(state, actor, type, payload = {}) {
    const next = clone(state);
    const a = next.articles.find(item => item.id === payload.id);
    const history = (text, extra = {}) => a.history.push({ at: stamp(), text, ...extra });

    if (type === 'submit') {
      requireRole(actor, 'author');
      const author = next.people.find(p => p.id === actor.id && p.role === 'author');
      if (!author) fail('Không tìm thấy người nộp bài.');
      if (!required(payload.title, 10, 300) || !required(payload.text, 40, 6000)) fail('Nhập tên bài từ 10 ký tự và tóm tắt từ 40 ký tự.');
      checkFile(payload.file);
      const n = Math.max(0, ...next.articles.map(x => Number(x.code.split('-').at(-1)) || 0)) + 1;
      const code = `BT-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
      const file = payload.file.auto ? autoFile(code, 1) : clone(payload.file);
      next.articles.unshift({
        id: payload.articleId || `article-${Date.now()}`, code, title: payload.title.trim(),
        category: categories.includes(payload.category) ? payload.category : categories[0],
        authorId: author.id, authorName: author.name, agency: payload.agency?.trim() || author.agency || 'Chưa ghi đơn vị',
        text: payload.text.trim(), created: stamp(), version: 1, status: 'submitted', issueId: null,
        reviews: [], feedback: [], anonymous: null,
        versions: [{ number: 1, created: stamp(), text: payload.text.trim(), body: null, file }],
        history: [{ at: stamp(), text: 'Tiếp nhận bản thảo phiên bản 01.' }]
      });
      return next;
    }

    if (['reviewer_add', 'reviewer_update', 'author_add', 'author_update'].includes(type)) {
      const role = type.startsWith('reviewer') ? 'reviewer' : 'author';
      const editing = type.endsWith('update');
      if (role === 'author' && editing && actor.role === 'author' && payload.personId === actor.id) {
        return savePerson(state, role, payload, true);
      }
      requireRole(actor, 'secretary');
      return savePerson(state, role, payload, editing);
    }

    if (type === 'issue_save') {
      requireRole(actor, 'secretary');
      if (!required(payload.number, 1, 30) || !required(payload.title, 3, 200) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date || '')) fail('Điền đủ tên, số bản tin và ngày phát hành.');
      const existing = next.issues.find(x => x.id === payload.issueId);
      if (existing?.published) fail('Số bản tin đã phát hành, chỉ được xem.');
      const ids = [...new Set(payload.articleIds || [])];
      const eligible = id => next.articles.some(x => x.id === id
        && (x.status === 'approved' || (x.status === 'published' && x.issueId === existing?.id))
        && (!x.issueId || x.issueId === existing?.id));
      if (ids.some(id => !eligible(id))) fail('Chỉ chọn bài đạt phản biện và chưa thuộc số bản tin khác.');
      if (existing && next.articles.some(x => x.status === 'published' && x.issueId === existing.id && !ids.includes(x.id))) fail('Không thể bỏ bài đã đăng khỏi số bản tin.');
      const item = { id: existing?.id || `issue-${Date.now()}`, number: payload.number.trim(), title: payload.title.trim(), date: payload.date, articleIds: ids, published: false };
      if (next.issues.some(x => x.id !== item.id && x.number === item.number)) fail('Số bản tin này đã tồn tại.');
      if (existing) {
        next.articles.filter(x => x.issueId === existing.id && !ids.includes(x.id)).forEach(x => { x.issueId = null; });
        Object.assign(existing, item);
      } else next.issues.push(item);
      ids.forEach(id => { next.articles.find(x => x.id === id).issueId = item.id; });
      return next;
    }

    if (type === 'issue_publish') {
      requireRole(actor, 'secretary');
      const issue = next.issues.find(x => x.id === payload.issueId);
      if (!issue || issue.published || issue.articleIds.length === 0) fail('Số bản tin phải có bài đạt phản biện trước khi phát hành.');
      const members = issue.articleIds.map(id => next.articles.find(x => x.id === id));
      if (members.some(x => !x || !['approved', 'published'].includes(x.status) || x.issueId !== issue.id || !allPass(x))) fail('Chưa đủ kết quả đạt để phát hành số bản tin.');
      issue.published = true;
      issue.publishedAt = stamp();
      members.filter(x => x.status !== 'published').forEach(x => {
        x.status = 'published';
        x.issueId = issue.id;
        x.history.push({ at: stamp(), text: `Đăng trong số bản tin ${issue.number}.` });
      });
      return next;
    }

    if (!a || !maySee(actor, a)) fail('Hồ sơ không thuộc phạm vi của vai trò hiện tại.');

    if (type === 'screen') {
      requireRole(actor, 'secretary');
      if (a.status !== 'submitted') fail('Hồ sơ không còn chờ sơ duyệt.');
      if (payload.decision === 'pass') {
        a.status = 'ready';
        history('Sơ duyệt đạt; chuyển chuẩn bị bản ẩn danh và phân công.');
      } else {
        if (!required(payload.note, 10, 5000)) fail('Ghi rõ nội dung cần bổ sung hoặc lý do trả bài.');
        a.status = 'revision';
        a.feedback.push({ version: a.version, at: stamp(), text: payload.note.trim() });
        history('Trả bản thảo sau sơ duyệt, kèm ý kiến bổ sung.');
      }
    } else if (type === 'assign') {
      requireRole(actor, 'secretary');
      if (a.status !== 'ready') fail('Hoàn thành sơ duyệt trước khi phân công.');
      const ids = [...new Set(payload.reviewerIds || [])];
      if (!ids.length || ids.some(id => !next.people.some(p => p.id === id && p.role === 'reviewer'))) fail('Chọn ít nhất một người phản biện trong danh sách.');
      if (!payload.checked || !required(payload.title, 10, 300) || !required(payload.text, 40, 6000)) fail('Chuẩn bị nội dung ẩn danh và xác nhận đã kiểm tra danh tính.');
      const deadlines = Object.fromEntries(ids.map(id => [id, payload.dueMap?.[id] || payload.due]));
      if (Object.values(deadlines).some(d => !isDay(d) || d < date())) fail('Nhập hạn phản biện hợp lệ, không trước ngày hiện tại.');
      checkFile(payload.file);
      const file = payload.file.auto
        ? autoFile(a.code, a.version, true)
        : { ...clone(payload.file), name: `${a.code}-phan-bien-v${a.version}.${payload.file.ext}` };
      const current = a.versions.find(v => v.number === a.version);
      a.anonymous = { version: a.version, title: payload.title.trim(), text: payload.text.trim(), body: current?.body ? clone(current.body) : null, file, checked: true };
      a.reviews.push(...ids.map(id => ({ reviewerId: id, version: a.version, due: deadlines[id], result: null, comment: '', submitted: null })));
      a.status = 'reviewing';
      history(`Giao ${ids.length} người phản biện với thời hạn riêng.`, { publicText: 'Bản thảo được chuyển phản biện.' });
    } else if (type === 'review') {
      requireRole(actor, 'reviewer');
      const r = activeReviews(a).find(x => x.reviewerId === actor.id);
      if (!r || r.result || a.status !== 'reviewing') fail('Lượt phản biện này đã kết thúc hoặc không thuộc phân công hiện tại.');
      if (!results[payload.result] || !required(payload.comment, 10, 5000)) fail('Chọn kết quả và ghi nhận xét từ 10 ký tự.');
      const scores = readCriteria(payload.criteria);
      Object.assign(r, { result: payload.result, comment: payload.comment.trim(), submitted: stamp(), ...(scores ? { criteria: scores } : {}) });
      history(`${actor.name} gửi kết quả: ${results[payload.result]}.`, { audience: 'secretary' });
      if (activeReviews(a).every(x => x.result)) {
        a.status = 'results';
        history('Đã nhận đủ kết quả; chờ thư ký tổng hợp.');
      }
    } else if (type === 'extend') {
      requireRole(actor, 'secretary');
      const r = activeReviews(a).find(x => x.reviewerId === payload.reviewerId);
      if (!r || r.result || a.status !== 'reviewing') fail('Chỉ gia hạn cho lượt phản biện đang chờ kết quả.');
      if (!isDay(payload.due) || payload.due < date()) fail('Nhập hạn mới hợp lệ, không trước ngày hiện tại.');
      const who = next.people.find(p => p.id === r.reviewerId)?.name || 'người phản biện';
      r.due = payload.due;
      history(`Gia hạn phản biện cho ${who} đến ${payload.due.split('-').reverse().join('/')}.`, { audience: 'secretary' });
    } else if (type === 'return') {
      requireRole(actor, 'secretary');
      if (!['reviewing', 'results'].includes(a.status) || !activeReviews(a).some(r => ['revise', 'reject'].includes(r.result))) fail('Chưa có kết quả yêu cầu chỉnh sửa hoặc không đạt để trả bài.');
      if (!payload.checked || !required(payload.note, 10, 5000)) fail('Nhập ý kiến tổng hợp và xác nhận không tiết lộ người phản biện.');
      a.status = 'revision';
      a.feedback.push({ version: a.version, at: stamp(), text: payload.note.trim() });
      history('Gửi ý kiến tổng hợp, yêu cầu bổ sung bản chỉnh sửa.');
    } else if (type === 'resubmit') {
      requireRole(actor, 'author');
      if (a.authorId !== actor.id || a.status !== 'revision') fail('Chỉ người nộp hồ sơ được bổ sung bản chỉnh sửa khi có yêu cầu.');
      if (!required(payload.text, 40, 6000)) fail('Nhập nội dung bản sửa từ 40 ký tự.');
      checkFile(payload.file);
      a.version += 1;
      a.text = payload.text.trim();
      a.anonymous = null;
      a.status = 'submitted';
      a.versions.push({ number: a.version, created: stamp(), text: a.text, body: null, file: payload.file.auto ? autoFile(a.code, a.version) : clone(payload.file) });
      history(`Tiếp nhận phiên bản ${String(a.version).padStart(2, '0')}; sơ duyệt lại trước khi phản biện.`);
    } else if (type === 'approve') {
      requireRole(actor, 'secretary');
      if (a.status !== 'results' || !allPass(a)) fail('Chỉ xác nhận đạt khi tất cả người được phân công đều đánh giá đạt cho phiên bản hiện tại.');
      a.status = 'approved';
      history('Tất cả phản biện đạt; hoàn tất tổng hợp và đưa vào danh sách biên tập.');
    } else if (type === 'publish') {
      requireRole(actor, 'secretary');
      if (a.status !== 'approved' || !allPass(a)) fail('Chưa đủ điều kiện đăng bài.');
      const issue = next.issues.find(x => x.id === payload.issueId);
      if (!issue || issue.published || (a.issueId && a.issueId !== issue.id)) fail('Chọn số bản tin đang biên tập phù hợp với hồ sơ.');
      a.status = 'published';
      a.issueId = issue.id;
      if (!issue.articleIds.includes(a.id)) issue.articleIds.push(a.id);
      history(`Đăng trong số bản tin ${issue.number}.`);
    } else fail('Thao tác không hợp lệ.');
    return next;
  }

  return {
    statuses, results, criteria, categories,
    seed, apply, registerAuthor, actorInfo, visibleArticles, projectArticle, activeReviews, allPass, maySee,
    autoFile, date, offset, dayOf, daysUntil, isValidState, metrics
  };
});
