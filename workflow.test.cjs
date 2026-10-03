const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('./workflow.js');
const sample={sample:true,ext:'txt',size:0};
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
