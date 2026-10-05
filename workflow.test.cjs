const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('./workflow.js');
const sample={auto:true,ext:'docx',size:0};
const actor=(state,key)=>B.actorInfo(state,key);
const item=(state,id)=>state.articles.find(a=>a.id===id);
const secretary=state=>actor(state,'secretary');
const assignPayload=(a,ids=['reviewer1','reviewer2'])=>({id:a.id,reviewerIds:ids,title:a.title,text:a.text,file:sample,checked:true,dueMap:Object.fromEntries(ids.map((id,i)=>[id,B.offset(7+i)]))});

test('nhiều phản biện, trả sửa, phân công lại và phát hành đúng phiên bản',()=>{
 let s=B.seed(),id='article8';
 s=B.apply(s,secretary(s),'screen',{id,decision:'pass'});
 s=B.apply(s,secretary(s),'assign',assignPayload(item(s,id)));
 assert.equal(item(s,id).reviews.length,2);
 assert.notEqual(item(s,id).reviews[0].due,item(s,id).reviews[1].due);
 s=B.apply(s,actor(s,'reviewer1'),'review',{id,result:'pass',comment:'Nội dung phù hợp yêu cầu chuyên môn.'});
 assert.equal(item(s,id).status,'reviewing');
 assert.throws(()=>B.apply(s,secretary(s),'approve',{id}),/tất cả/);
 s=B.apply(s,actor(s,'reviewer2'),'review',{id,result:'revise',comment:'Cần bổ sung dẫn chứng thực tiễn cụ thể.'});
 assert.equal(item(s,id).status,'results');
 assert.throws(()=>B.apply(s,secretary(s),'approve',{id}),/tất cả/);
 s=B.apply(s,secretary(s),'return',{id,note:'Bổ sung dẫn chứng thực tiễn và làm rõ nhóm giải pháp.',checked:true});
 assert.equal(item(s,id).status,'revision');
 s=B.apply(s,actor(s,'author1'),'resubmit',{id,text:'Nội dung bản sửa đã bổ sung dẫn chứng và giải pháp cụ thể theo ý kiến tổng hợp của thư ký.',file:sample});
 assert.equal(item(s,id).version,2);
 assert.equal(item(s,id).anonymous,null);
 assert.equal(B.allPass(item(s,id)),false);
 s=B.apply(s,secretary(s),'screen',{id,decision:'pass'});
 s=B.apply(s,secretary(s),'assign',assignPayload(item(s,id),['reviewer1','reviewer3']));
 assert.equal(B.projectArticle(item(s,id),actor(s,'reviewer2')).anonymous,null);
 assert.equal(B.projectArticle(item(s,id),actor(s,'reviewer2')).text,'');
 assert.throws(()=>B.apply(s,actor(s,'reviewer2'),'review',{id,result:'pass',comment:'Nội dung đã đạt yêu cầu.'}),/không thuộc/);
 s=B.apply(s,actor(s,'reviewer1'),'review',{id,result:'pass',comment:'Bản sửa đã đáp ứng đầy đủ yêu cầu.'});
 s=B.apply(s,actor(s,'reviewer3'),'review',{id,result:'pass',comment:'Đồng ý với nội dung và giải pháp bản sửa.'});
 s=B.apply(s,secretary(s),'approve',{id});
 assert.equal(item(s,id).status,'approved');
 s=B.apply(s,secretary(s),'issue_save',{issueId:'issue2',number:'02/2026',title:'Thông tin lý luận và thực tiễn',date:B.offset(10),articleIds:[id,'article2']});
 s=B.apply(s,secretary(s),'issue_publish',{issueId:'issue2'});
 assert.equal(item(s,id).status,'published');
 assert.equal(item(s,'article2').status,'published');
 assert.equal(s.issues.find(x=>x.id==='issue2').published,true);
 assert.ok(s.issues.find(x=>x.id==='issue2').publishedAt);
 assert.equal(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.issues.find(x=>x.id==='issue2').publishedAt)),B.date());
});

test('phản biện không nhận danh tính, tệp gốc, ý kiến của phản biện khác',()=>{
 const s=B.seed(),a=item(s,'article4'),r=B.projectArticle(a,actor(s,'reviewer1'));
 assert.equal('authorId' in r,false);assert.equal('authorName' in r,false);assert.equal('agency' in r,false);assert.equal('versions' in r,false);assert.equal('feedback' in r,false);
 assert.equal(r.reviews.length,1);assert.equal(r.reviews[0].reviewerId,'reviewer1');
 assert.ok(r.anonymous.file.name.includes('phan-bien'));
 assert.ok(r.anonymous.file.name.endsWith('.docx'));
 assert.ok(r.anonymous.body.blocks.length>5);
 assert.equal(JSON.stringify(r).includes(a.authorName),false);
 const author=B.projectArticle(a,actor(s,'author2'));assert.equal(author.reviews.length,0);assert.equal('anonymous' in author,false);
 assert.equal(B.projectArticle(a,actor(s,'author1')),null);
 assert.equal(B.projectArticle(item(s,'article8'),actor(s,'reviewer1')),null);
});

test('phạm vi vai trò: người nộp chỉ hồ sơ của mình; lãnh đạo không xử lý nghiệp vụ',()=>{
 const s=B.seed();
 assert.ok(B.visibleArticles(s,actor(s,'author1')).every(a=>a.authorId==='author1'));
 assert.equal(B.visibleArticles(s,actor(s,'chief')).length,0);
 for(const key of ['author1','reviewer1','chief','deputy'])assert.throws(()=>B.apply(s,actor(s,key),'screen',{id:'article8',decision:'pass'}));
 assert.throws(()=>B.apply(s,actor(s,'author2'),'resubmit',{id:'article5',text:'Nội dung sửa giả định có đủ độ dài để được kiểm tra.',file:sample}));
 assert.throws(()=>B.apply(s,actor(s,'chief'),'issue_publish',{issueId:'issue2'}));
});

test('ẩn danh bắt buộc; không phân công sai người hoặc hạn quá khứ',()=>{
 let s=B.seed(),a=item(s,'article7'),p=assignPayload(a);
 assert.throws(()=>B.apply(s,secretary(s),'assign',{...p,checked:false}),/ẩn danh/);
 assert.throws(()=>B.apply(s,secretary(s),'assign',{...p,reviewerIds:[]}),/ít nhất/);
 assert.throws(()=>B.apply(s,secretary(s),'assign',{...p,reviewerIds:['author1']}),/ít nhất/);
 assert.throws(()=>B.apply(s,secretary(s),'assign',{...p,dueMap:{reviewer1:B.offset(-1),reviewer2:B.offset(1)}}),/hạn/);
 s=B.apply(s,secretary(s),'assign',{...p,reviewerIds:['reviewer1','reviewer1'],due:B.offset(2)});
 assert.equal(B.activeReviews(item(s,a.id)).length,1);
});

test('không thể đăng khi đang xử lý, kết quả cũ không hợp lệ hoặc chưa có phản biện',()=>{
 const s=B.seed(),id='article6';
 assert.throws(()=>B.apply(s,secretary(s),'publish',{id,issueId:'issue2'}),/điều kiện/);
 const bad=structuredClone(s);item(bad,'article2').version=2;
 assert.throws(()=>B.apply(bad,secretary(bad),'publish',{id:'article2',issueId:'issue2'}),/điều kiện/);
 const noReviews=structuredClone(s);item(noReviews,'article2').reviews=[];
 assert.throws(()=>B.apply(noReviews,secretary(noReviews),'publish',{id:'article2',issueId:'issue2'}),/điều kiện/);
 assert.throws(()=>B.apply(s,secretary(s),'issue_save',{issueId:'issue2',number:'02/2026',title:'Bản tin',date:B.offset(5),articleIds:['article8']}),/Chỉ chọn/);
});

test('bài lẻ đã đăng vẫn phát hành được trong số; bài đã đăng không bị bỏ khỏi mục lục',()=>{
 let s=B.seed();s=B.apply(s,secretary(s),'publish',{id:'article2',issueId:'issue2'});
 assert.throws(()=>B.apply(s,secretary(s),'issue_save',{issueId:'issue2',number:'02/2026',title:'Bản tin',date:B.offset(5),articleIds:[]}),/bỏ bài/);
 s=B.apply(s,secretary(s),'issue_publish',{issueId:'issue2'});
 assert.equal(s.issues.find(x=>x.id==='issue2').published,true);
});

test('trả sơ duyệt có ý kiến, sửa chỉ khi được yêu cầu, nộp mới không đổi hồ sơ người khác',()=>{
 let s=B.seed();assert.throws(()=>B.apply(s,secretary(s),'screen',{id:'article8',decision:'return',note:''}),/ý kiến|nội dung/);
 s=B.apply(s,secretary(s),'screen',{id:'article8',decision:'return',note:'Cần bổ sung tóm tắt và luận cứ cho bài viết.'});
 assert.equal(item(s,'article8').feedback.length,1);
 assert.throws(()=>B.apply(s,actor(s,'author1'),'resubmit',{id:'article2',text:'Nội dung đủ độ dài nhưng không có yêu cầu chỉnh sửa.',file:sample}));
 const before=item(s,'article8').title;
 s=B.apply(s,actor(s,'author2'),'submit',{title:'Bài viết mới về đổi mới công tác đào tạo',text:'Bản thảo mẫu phân tích thực tiễn đào tạo và đề xuất các giải pháp triển khai trong thời gian tới.',category:'Nghiên cứu, trao đổi',file:sample,articleId:'new-one'});
 assert.equal(s.articles.length,9);assert.equal(item(s,'new-one').authorId,'author2');assert.equal(item(s,'article8').title,before);
});

test('chấm tiêu chí: đủ bốn tiêu chí trong khoảng 1 đến 5, hoặc bỏ trống cả bốn', () => {
  const s = B.seed(), id = 'article6';
  const ok = { id, result: 'pass', comment: 'Bài viết đáp ứng yêu cầu chuyên môn.', criteria: { content: 5, argument: 4, practice: 4, form: 5 } };
  const next = B.apply(s, actor(s, 'reviewer1'), 'review', ok);
  assert.deepEqual(item(next, id).reviews.find(r => r.reviewerId === 'reviewer1').criteria, ok.criteria);
  assert.throws(() => B.apply(s, actor(s, 'reviewer1'), 'review', { ...ok, criteria: { content: 5, argument: 4, practice: 4, form: 6 } }), /tiêu chí/);
  assert.throws(() => B.apply(s, actor(s, 'reviewer1'), 'review', { ...ok, criteria: { content: 5, argument: 4 } }), /tiêu chí/);
  const blank = B.apply(s, actor(s, 'reviewer1'), 'review', { ...ok, criteria: { content: '', argument: '', practice: '', form: '' } });
  assert.equal('criteria' in item(blank, id).reviews.find(r => r.reviewerId === 'reviewer1'), false);
});

test('gia hạn: chỉ thư ký, chỉ lượt chưa có kết quả, hạn mới không ở quá khứ', () => {
  const s = B.seed(), id = 'article3';
  const next = B.apply(s, secretary(s), 'extend', { id, reviewerId: 'reviewer1', due: B.offset(4) });
  assert.equal(item(next, id).reviews.find(r => r.reviewerId === 'reviewer1').due, B.offset(4));
  assert.throws(() => B.apply(s, secretary(s), 'extend', { id, reviewerId: 'reviewer1', due: B.offset(-1) }), /hạn/);
  assert.throws(() => B.apply(s, secretary(s), 'extend', { id, reviewerId: 'reviewer2', due: B.offset(4) }), /chờ kết quả/);
  assert.throws(() => B.apply(s, actor(s, 'reviewer1'), 'extend', { id, reviewerId: 'reviewer1', due: B.offset(4) }));
  assert.throws(() => B.apply(s, actor(s, 'author2'), 'extend', { id, reviewerId: 'reviewer1', due: B.offset(4) }));
  const note = item(next, id).history.at(-1);
  assert.equal(note.audience, 'secretary');
  const forAuthor = B.projectArticle(item(next, id), actor(next, 'author2'));
  assert.equal(forAuthor.history.some(h => /Gia hạn/.test(h.text)), false);
});

test('số liệu báo cáo: đếm đúng lượt, quá hạn và khối lượng từng người phản biện', () => {
  const s = B.seed(), m = B.metrics(s);
  assert.equal(m.total, 8);
  assert.equal(m.reviews.assigned, 12);
  assert.equal(m.reviews.done, 9);
  assert.equal(m.reviews.pending, 3);
  assert.equal(m.reviews.overdue, 1);
  assert.equal(m.workload.find(w => w.id === 'reviewer1').overdue, 1);
  assert.equal(m.categories.reduce((n, c) => n + c.count, 0), 8);
  assert.equal(B.metrics(s, []).completionRate, 0);
  assert.equal(B.metrics(s, []).onTimeRate, null);
});

test('kiểm tra dữ liệu nhập: từ chối tệp sai cấu trúc, nhận dữ liệu mẫu', () => {
  const s = B.seed();
  assert.equal(B.isValidState(s), true);
  assert.equal(B.isValidState(null), false);
  assert.equal(B.isValidState({}), false);
  assert.equal(B.isValidState({ ...s, schema: 1 }), false);
  assert.equal(B.isValidState({ ...s, articles: [{ id: 'x', title: 'y', status: 'khong-co', version: 1, reviews: [], history: [], versions: [], feedback: [] }] }), false);
  assert.equal(B.isValidState({ ...s, people: [{ id: 'p', role: 'admin', name: 'A' }] }), false);
});

test('lịch hạn: tính số ngày còn lại theo múi giờ Việt Nam', () => {
  assert.equal(B.daysUntil(B.date()), 0);
  assert.equal(B.daysUntil(B.offset(3)), 3);
  assert.equal(B.daysUntil(B.offset(-2)), -2);
  assert.equal(B.dayOf('2026-10-05'), '2026-10-05');
});

const W = require('./docx.js');
const zlib = require('node:zlib');

function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, 'thiếu bản ghi kết thúc ZIP');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const crc = view.getUint32(at + 16, true), size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true), offset = view.getUint32(at + 42, true);
    const name = Buffer.from(bytes.subarray(at + 46, at + 46 + nameLen)).toString('utf8');
    const dataStart = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    assert.equal(zlib.crc32(Buffer.from(data)) >>> 0, crc, 'sai CRC của ' + name);
    files[name] = Buffer.from(data).toString('utf8');
    at += 46 + nameLen;
  }
  return files;
}

test('tệp Word: cấu trúc ZIP đúng, có đủ các phần cần thiết và dữ liệu không bị hỏng', () => {
  const doc = { title: 'Bài thử & <ký tự đặc biệt>', category: 'Nghiên cứu, trao đổi', author: 'Nguyễn Văn A', agency: 'Khoa X', abstract: 'Tóm tắt thử.', keywords: 'a; b',
    blocks: [['h', 'I. MỞ ĐẦU'], ['p', 'Đoạn **đậm** và __nghiêng__.'], ['li', ['một', 'hai']], ['tbl', 'Bảng 1', ['A', 'B'], [['1', '2']], [1, 1]]], refs: ['Tài liệu 1'] };
  const files = readZip(W.build(doc));
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/footer1.xml', 'word/_rels/document.xml.rels', 'docProps/core.xml']) assert.ok(name in files, 'thiếu ' + name);
  assert.ok(files['word/document.xml'].includes('Bài thử &amp; &lt;ký tự đặc biệt&gt;'));
  assert.ok(files['word/document.xml'].includes('<w:tbl>'));
  assert.ok(files['word/document.xml'].includes('TÀI LIỆU THAM KHẢO'));
  assert.ok(files['docProps/core.xml'].includes('<dc:creator>Nguyễn Văn A</dc:creator>'));
  const anon = readZip(W.build({ ...doc, author: undefined, agency: undefined }));
  assert.ok(anon['docProps/core.xml'].includes('<dc:creator></dc:creator>'));
  assert.equal(anon['word/document.xml'].includes('Nguyễn Văn A'), false);
  assert.equal(anon['word/document.xml'].includes('Khoa X'), false);
});

test('bài mẫu: đầy đủ nội dung và bản ẩn danh không chứa tên hay đơn vị tác giả', () => {
  const s = B.seed();
  assert.equal(s.articles.length, 8);
  for (const a of s.articles) {
    const body = a.versions[0].body;
    assert.ok(a.text.length > 250, a.code + ': tóm tắt quá ngắn');
    assert.ok(body.blocks.filter(b => b[0] === 'h').length >= 4, a.code + ': thiếu mục');
    assert.ok(body.blocks.filter(b => b[0] === 'p').length >= 6, a.code + ': thiếu đoạn văn');
    assert.ok(body.refs.length >= 3, a.code + ': thiếu tài liệu tham khảo');
    assert.ok(body.keywords.length > 10);
    if (a.anonymous) {
      const dump = JSON.stringify(a.anonymous);
      assert.equal(dump.includes(a.authorName), false, a.code + ': lộ tên tác giả');
      assert.equal(dump.includes(a.agency), false, a.code + ': lộ đơn vị');
      assert.ok(a.anonymous.file.name.endsWith('.docx'));
    }
  }
  const names = new Set(s.people.map(p => p.id));
  assert.equal(s.articles.every(a => names.has(a.authorId)), true);
  const mine = a => B.visibleArticles(s, B.actorInfo(s, a)).length;
  assert.equal(mine('author1') + mine('author2') + mine('author3'), 8);
});

test('phân công tạo bản ẩn danh kèm nội dung của phiên bản hiện tại', () => {
  let s = B.seed();
  s = B.apply(s, secretary(s), 'screen', { id: 'article8', decision: 'pass' });
  s = B.apply(s, secretary(s), 'assign', assignPayload(item(s, 'article8')));
  const an = item(s, 'article8').anonymous;
  assert.ok(an.body.blocks.length > 5);
  assert.deepEqual(an.body.refs, item(s, 'article8').versions[0].body.refs);
});
