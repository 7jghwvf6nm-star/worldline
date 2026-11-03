/* WORLDLINE AI Studio - local-first extension; no OpenAI API key is stored in this file. */
(()=>{
'use strict';
const STORE='worldline_ai_studio_v2', ACCESS='worldline_ai_access_session';
const MEDIA_LABEL={novel:'📖 소설',anime:'✦ 애니',game:'🎮 게임',drama:'🎬 드라마'};
const defaultBible=(title='새로운 세계')=>({title,summary:'',setting:'',characters:[],rules:[],timeline:[],tensions:[],unknowns:[],sources:[]});
function init(){try{const p=JSON.parse(localStorage.getItem(STORE)||'null');return p&&typeof p==='object'?p:null}catch{return null}}
const saved=init();
const S={tab:'build',title:'',media:'novel',notes:'',links:'',player:'방문자',premise:'',endpoint:saved?.endpoint||'',worlds:Array.isArray(saved?.worlds)?saved.worlds.slice(0,18):[],activeId:saved?.activeId||'',run:saved?.run||null,bible:null,rawText:'',fileNames:[],fileInfo:'',busy:false,progress:'',pendingChoice:'',sources:[],status:'',preview:'',...{}};
S.bible = S.worlds.find(w=>w.id===S.activeId)?.bible||defaultBible();
let accessToken=sessionStorage.getItem(ACCESS)||'';
const esc=s=>clean(String(s??''));
const urlSafe=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const lines=s=>String(s||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,60);
const unique=a=>[...new Set(a)];
function persistStudio(){try{
  const worlds=S.worlds.slice(0,18).map(w=>({id:w.id,media:w.media,title:w.title,bible:w.bible,created:w.created}));
  const run=S.run?{worldId:S.run.worldId,player:S.run.player,premise:S.run.premise,chapter:S.run.chapter,history:S.run.history.slice(-60),current:S.run.current,recap:S.run.recap,choice:S.run.choice}:null;
  localStorage.setItem(STORE,JSON.stringify({endpoint:S.endpoint,worlds,activeId:S.activeId,run}));
}catch(e){alert('저장 공간이 부족해. 세계관을 줄이거나 기존 항목을 삭제한 뒤 다시 시도해.')}}
function activeWorld(){return S.worlds.find(w=>w.id===S.activeId)}
function updateStatus(msg){S.status=msg;const el=document.getElementById('studioStatus');if(el)el.textContent=msg}
function show(){if(state.screen==='studio')render()}
function captureSetup(){for(const [id,k] of [['wsTitle','title'],['wsNotes','notes'],['wsLinks','links'],['wsPlayer','player'],['wsPremise','premise'],['wsEndpoint','endpoint']]){
  const v=document.getElementById(id);if(v)S[k]=v.value;
}const m=document.getElementById('wsMedia');if(m)S.media=m.value}
function hasConfig(){return !!(S.endpoint&&accessToken)}
async function callAI(action,data){
  if(!hasConfig())throw Error('AI 연결 설정이 필요해. 먼저 연결 주소와 접근 암호를 등록해 줘.');
  const endpoint=S.endpoint.trim().replace(/\/$/,'');if(!/^https:\/\//.test(endpoint))throw Error('연결 주소는 https://로 시작해야 해.');
  const response=await fetch(endpoint+'/api',{method:'POST',headers:{'Content-Type':'application/json','X-Worldline-Access':accessToken},body:JSON.stringify({action,...data})});
  let result;try{result=await response.json()}catch{throw Error('서버 응답을 읽을 수 없어. Worker 주소를 확인해 줘.')}
  if(!response.ok)throw Error(result.error||`연결 오류 (${response.status})`);
  return result;
}
function normalizeBible(b,title){const output=defaultBible(title);if(!b||typeof b!=='object')return output;
  for(const k of ['title','summary','setting'])output[k]=String(b[k]||output[k]).slice(0,k==='title'?100:9000);
  output.characters=Array.isArray(b.characters)?b.characters.slice(0,45).map(v=>({name:String(v.name||'').slice(0,90),role:String(v.role||'').slice(0,140),traits:String(v.traits||'').slice(0,300),relationships:String(v.relationships||'').slice(0,350)})):[];
  for(const k of ['rules','timeline','tensions','unknowns'])output[k]=Array.isArray(b[k])?b[k].map(x=>String(x).slice(0,550)).slice(0,50):[];
  output.sources=Array.isArray(b.sources)?b.sources.filter(x=>urlSafe(x.url)).slice(0,20).map(x=>({title:String(x.title||'참고 자료').slice(0,160),url:urlSafe(x.url)})):[];
  return output;
}
function formField(label,id,value,opts=''){return `<div class="ws-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${opts}></div>`}
function area(label,id,value,rows=4,placeholder=''){return `<div class="ws-field"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`}
function btn(action,label,kind=''){return `<button class="btn ${kind}" data-studio="${action}" ${S.busy?'disabled':''}>${label}</button>`}
function renderNavTabs(){const tabs=[['build','① 자료 준비'],['knowledge','② 세계관 도감'],['play','③ AI 스토리'],['settings','⚙ AI 연결']];return `<div class="ws-tabs">${tabs.map(([k,l])=>`<button class="ws-tab ${S.tab===k?'active':''}" data-studio="tab" data-tab="${k}">${l}</button>`).join('')}</div>`}
function renderBuild(){return `<div class="ws-split"><section class="ws-card">
  <div class="ws-card-head"><span class="ws-step">01 / DATA</span><h2>작품과 자료 입력</h2><p>텍본이 있다면 파일로 올리고, 없으면 작품명·검색 자료·직접 만든 설정만 입력해도 돼.</p></div>
  <div class="ws-form-row">${formField('작품 또는 세계관 이름','wsTitle',S.title,'placeholder="작품명 또는 직접 만든 제목" maxlength="100"')}<div class="ws-field"><label for="wsMedia">장르</label><select id="wsMedia">${Object.entries(MEDIA_LABEL).map(([k,v])=>`<option value="${k}" ${S.media===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
  <div class="ws-upload"><label for="studioFiles" class="ws-upload-label"><span class="ws-upload-icon">⇧</span><b>텍본 업로드</b><small>TXT · MD · HTML · EPUB · JSON · 여러 파일 선택 가능</small></label><input type="file" id="studioFiles" multiple accept=".txt,.md,.markdown,.html,.htm,.epub,.json,text/plain,text/markdown,application/epub+zip" ${S.busy?'disabled':''}><p class="ws-file-info">${esc(S.fileInfo||'파일 내용은 먼저 기기에서 읽어. AI 분석을 누를 때만 설정한 서버로 전송돼.')}</p></div>
  ${area('추가 세계관·인물·금지할 전개·시작 상황','wsNotes',S.notes,6,'예: 세계의 능력 체계, 주요 인물 관계, 어느 사건에서 원작을 바꾸고 싶은지')}
  ${area('참고 링크 (한 줄에 하나)','wsLinks',S.links,3,'https://namu.wiki/w/...\nhttps://...')}
  <div class="ws-actions">${btn('draft','직접 입력으로 도감 만들기')}${btn('analyze','✧ 업로드 텍본 AI 분석','btn-primary')}${btn('research','⌕ 작품명으로 웹 자료 조사')}</div>
  <p class="ws-help">AI 분석은 별도 API 연결이 필요하며 사용량에 따라 요금이 발생할 수 있어. 긴 텍본은 나눠서 분석하고, 자료가 없으면 검색이나 직접 입력으로 시작할 수 있어.</p>
  </section><aside class="ws-card ws-info"><span class="ws-step">WORKFLOW</span><h3>세 가지 시작 방법</h3><div class="ws-path"><b>📄 텍본이 있을 때</b><p>파일을 올리고 AI가 인물·설정·세계의 규칙·사건 흐름을 나누어 정리해.</p></div><div class="ws-path"><b>🔎 텍본이 없을 때</b><p>작품명을 입력하고 웹 자료를 검색해. 나무위키 등은 확인 가능한 내용만 참고해.</p></div><div class="ws-path"><b>✍ 직접 설정할 때</b><p>네가 적은 설정을 도감으로 저장하고 원하는 지점에서 전개를 바꿔.</p></div><hr><h3>이미 저장한 세계</h3>${S.worlds.length?S.worlds.map(w=>`<div class="ws-saved"><span>${esc(w.title)}</span><button class="btn btn-small" data-studio="open" data-id="${esc(w.id)}">열기</button></div>`).join(''):'<p class="ws-muted">아직 저장한 세계가 없어.</p>'}</aside></div>`}
function renderSources(){const src=S.bible.sources||[];if(!src.length)return `<p class="ws-muted">등록된 링크가 없어. 웹 검색 결과를 사용한 경우 서버가 출처를 제공할 때만 표시돼.</p>`;return `<div class="ws-sources">${src.map(s=>{const u=urlSafe(s.url);return u?`<a target="_blank" rel="noopener noreferrer" href="${esc(u)}">${esc(s.title||u)} ↗</a>`:''}).join('')}</div>`}
function bibleFields(){const b=S.bible;const cs=b.characters.map(c=>[c.name,c.role,c.traits,c.relationships].map(x=>String(x||'').replaceAll('|','/')).join(' | ')).join('\n');return `${formField('세계/작품명','wsBibleTitle',b.title,'maxlength="100"')}${area('핵심 세계관 요약','wsSummary',b.summary,5,'세계의 핵심 갈등과 분위기')}${area('시대·지리·사회·배경','wsSetting',b.setting,4)}${area('주요 인물: 한 줄에 이름 | 역할 | 성격 | 관계','wsCharacters',cs,6,'주인공 | 학생 | 신중함 | A의 친구')}${area('능력·마법·기술·세계 규칙 (한 줄에 하나)','wsRules',b.rules.join('\n'),4)}${area('원작 주요 사건 흐름 (한 줄에 하나)','wsTimeline',b.timeline.join('\n'),5)}${area('갈등과 미해결 떡밥','wsTensions',b.tensions.join('\n'),4)}${area('불확실하거나 확인이 필요한 정보','wsUnknowns',b.unknowns.join('\n'),3)}`}
function renderKnowledge(){return `<div class="ws-split ws-knowledge"><section class="ws-card"><span class="ws-step">02 / WORLD BIBLE</span><h2>세계관 도감</h2><p class="ws-muted">AI 결과는 틀릴 수 있어. 네가 직접 고친 내용이 이야기 생성의 기준이 돼.</p><div class="ws-editor">${bibleFields()}</div><div class="ws-actions">${btn('save','✓ 세계관 저장','btn-primary')}${btn('saveplay','저장하고 이야기 시작 →')}${btn('chatprompt','ChatGPT 분석용 요청문 복사')}</div></section><aside class="ws-card ws-info"><span class="ws-step">REFERENCES</span><h3>참고한 링크</h3>${renderSources()}<hr><h3>세계관 정확도</h3><p class="ws-muted">업로드된 텍본과 입력한 메모는 우선 적용해. 웹에서 찾은 정보는 출처를 열어 확인할 수 있고, 근거가 모호한 부분은 ‘확인 필요’ 항목에 남겨.</p><hr><h3>작품의 장면 사용</h3><p class="ws-muted">원작 내용을 그대로 복제하기보다 인물과 세계의 설정을 참고하여 새로운 장면·선택·전개를 만드는 방식이야.</p>${S.activeId?btn('delete','이 세계 삭제'):''}</aside></div>`}
function renderPlay(){const run=S.run, w=activeWorld();if(!w)return `<section class="ws-card"><h2>먼저 세계관을 저장해 줘</h2><p>자료 준비 또는 도감 탭에서 세계를 만들고 ‘저장하고 이야기 시작’을 누르면 돼.</p><button class="btn btn-primary" data-studio="tab" data-tab="knowledge">세계관 도감으로</button></section>`;
  const scene=run?.current;return `<div class="ws-split ws-play"><section class="ws-card"><span class="ws-step">03 / ALTER THE STORY</span><h2>${esc(w.title)}</h2><p class="ws-muted">선택마다 사건·인물 관계가 달라지는 새로운 이야기. 원작 장면을 그대로 보여주는 기능은 아니야.</p>${!run||run.worldId!==w.id?`${formField('세계 속 내 이름','wsPlayer',S.player,'maxlength="40"')}${area('어디서부터 개입할까?','wsPremise',S.premise,4,'예: 1부 최종 사건 직전에 평범한 연구원으로 등장한다.')}${btn('start','세계에 들어가기 ↗','btn-primary')}`:
 `<div class="ws-play-card"><div class="ws-chapter">CHAPTER ${String(run.chapter||1).padStart(2,'0')} · ${esc(run.player)}</div>${scene?`<h3>${esc(scene.heading)}</h3><div class="ws-prose">${esc(scene.body).replace(/\n/g,'<br>')}</div>${scene.ending?'<p class="ws-small-note">이 장면은 결말처럼 마무리됐어. 계속하면 새로운 후일담을 만들 수 있어.</p>':''}<div class="ws-choices"><b>어떻게 행동할까?</b>${(scene.choices||[]).map((c,i)=>`<button class="ws-choice" data-studio="choose" data-index="${i}"><span class="ws-choice-index">${i+1}</span><span><strong>${esc(c.label)}</strong><small>${esc(c.impact)}</small></span></button>`).join('')}</div>${area('원하는 행동을 자유롭게 직접 입력','wsFreeChoice','',3,'예: 조력자에게 사실을 털어놓고 함께 탈출한다.')}${btn('freechoice','내 행동으로 진행 →')}`:`<div class="ws-loading"><b>${S.busy?'AI가 다음 장을 만드는 중…':'새로운 장을 만들 준비가 됐어.'}</b><p>${esc(S.progress||'이어서 진행을 누르면 다음 장면이 생성돼.')}</p></div>${btn('next','다음 장면 생성','btn-primary')}`}</div><div class="ws-actions">${btn('rewind','↶ 직전 선택 되돌리기')}${btn('restart','↻ 첫 장부터 다시')}${btn('export-story','↓ 이야기 TXT 저장')}</div>`}</section><aside class="ws-card ws-info"><span class="ws-step">STORY MEMORY</span><h3>지금까지 바꾼 세계선</h3>${run?.history?.length?`<ol class="ws-history">${run.history.map((h,i)=>`<li>제${i+1}장 · ${esc(h.choice)}</li>`).join('')}</ol>`:'<p class="ws-muted">첫 선택이 기록되기를 기다리고 있어.</p>'}<hr><h3>세계 설정 요약</h3><p class="ws-muted">${esc(w.bible.summary.slice(0,700)||'사용자가 직접 만든 세계관')}</p><hr><p class="ws-muted">${hasConfig()?'✧ AI 연결로 실시간 새 전개를 생성해.':'◌ 현재는 오프라인 템플릿 모드야. AI 연결을 설정하면 장면이 실시간 생성돼.'}</p></aside></div>`}
function renderSettings(){return `<div class="ws-split"><section class="ws-card"><span class="ws-step">SECURE CONNECTION</span><h2>ChatGPT 기반 AI 연결</h2><p class="ws-muted">ChatGPT 구독과 OpenAI API는 별개야. GitHub Pages에 비밀 API 키를 넣으면 노출되므로, Cloudflare Worker 보안 중계 서버를 사용해.</p>${formField('Cloudflare Worker 주소','wsEndpoint',S.endpoint,'placeholder="https://이름.계정.workers.dev" inputmode="url"')}${formField('WORLDLINE 접근 암호 (API 키 아님)','wsAccess','',`type="password" placeholder="Worker에 저장한 APP_ACCESS_TOKEN" autocomplete="off"`)}<div class="ws-actions">${btn('connect','연결 설정 저장','btn-primary')}${btn('ping','연결 확인')}</div><p class="ws-help">접근 암호는 이 브라우저 탭/세션에만 저장하고, GitHub나 내보내기 파일에 넣지 않아. 실제 OpenAI 키는 Worker Secrets에만 저장해야 해.</p><hr><h3>AI 연결 없이 사용하려면</h3><p>직접 세계관을 입력해 오프라인 선택형 이야기를 만들거나, 분석 요청문을 복사해 ChatGPT에서 분석한 JSON을 가져올 수 있어.</p>${btn('chatprompt','ChatGPT 요청문 복사')}${btn('importjson','ChatGPT 분석 JSON 붙여 넣기')}</section><aside class="ws-card ws-info"><span class="ws-step">IMPORTANT</span><h3>파일과 개인정보</h3><p class="ws-muted">텍본은 업로드 직후 이 기기에서 읽어. AI 분석이나 웹 조사를 실행하면 필요한 텍스트를 서버와 OpenAI API에 전송해. 원본 텍본은 WORLDLINE 서버에 저장하지 않아.</p><hr><h3>AI 연결 비용</h3><p class="ws-muted">API 호출은 별도 과금될 수 있어. 한 번에 처리하지 못하는 긴 문서는 여러 번 나눠 분석하므로 호출 횟수가 늘 수 있어.</p><hr><h3>오류가 날 때</h3><p class="ws-muted">연결이 실패하면 Worker 배포, 두 가지 Secret, ALLOWED_ORIGIN, 입력한 접근 암호를 확인해.</p></aside></div>`}
function render(){const tab=S.tab;return `<div class="page ws-page"><div class="ws-hero"><div><span class="eyebrow">WORLDLINE AI STUDIO</span><h1>원하는 세계로 들어가,<br><em>이야기를 다시 써.</em></h1><p>텍본 업로드 · 웹 자료 조사 · 세계관 직접 편집 · 선택형 AI 스토리</p></div><div class="ws-hero-mark">✧</div></div>${renderNavTabs()}<div class="ws-status" id="studioStatus" aria-live="polite">${esc(S.status||'작품 파일을 올리거나 세계관 이름을 입력해 시작해.')}</div>${S.busy?`<div class="ws-progress" role="status">${esc(S.progress||'처리 중…')}</div>`:''}${tab==='build'?renderBuild():tab==='knowledge'?renderKnowledge():tab==='play'?renderPlay():renderSettings()}<footer class="ws-footer">※ 창작용 팬 시뮬레이터야. 검색한 세계관 정보와 AI 생성 내용은 사실과 다를 수 있어.</footer></div>`}
function setBibleFromInputs(){const b=S.bible;
  for(const [id,k] of [['wsBibleTitle','title'],['wsSummary','summary'],['wsSetting','setting']]){const e=document.getElementById(id);if(e)b[k]=e.value.trim()}
  const chars=document.getElementById('wsCharacters');if(chars)b.characters=lines(chars.value).map(line=>{const p=line.split('|').map(x=>x.trim());return{name:p[0]||'',role:p[1]||'',traits:p[2]||'',relationships:p.slice(3).join(' / ')||''}}).filter(c=>c.name);
  for(const [id,k] of [['wsRules','rules'],['wsTimeline','timeline'],['wsTensions','tensions'],['wsUnknowns','unknowns']]){const e=document.getElementById(id);if(e)b[k]=lines(e.value)}
}
function ensureWorld(){setBibleFromInputs();const title=(S.bible.title||S.title).trim();if(!title){alert('세계 이름을 먼저 입력해 줘.');return null}S.bible.title=title;
  let w=activeWorld();if(!w){w={id:'ai_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),title,media:S.media,bible:S.bible,created:new Date().toISOString()};S.worlds.unshift(w);S.activeId=w.id}
  else{w.title=title;w.media=S.media;w.bible=normalizeBible(S.bible,title)}
  S.bible=w.bible;persistStudio();return w;
}
function getNotesLinks(){return unique(lines(S.links).map(urlSafe).filter(Boolean)).slice(0,8)}
function offlineBible(){captureSetup();if(!S.title.trim()){alert('작품명을 입력해 줘.');return}const b=defaultBible(S.title.trim());b.setting=S.notes.trim().slice(0,4000);b.summary=S.rawText?'업로드한 텍본을 읽었어. 인물·핵심 사건은 도감에서 직접 정리하거나 AI 분석으로 추출해 줘.':'사용자가 입력한 세계관으로 시작하는 이야기야. 아래 칸에서 설정을 구체화해 줘.';b.unknowns=['AI 분석 전이므로 파일의 전체 줄거리와 인물 관계는 자동으로 확인되지 않았어.'];b.sources=getNotesLinks().map(u=>({title:'사용자 참고 링크',url:u}));S.bible=b;S.activeId='';S.tab='knowledge';S.status='기본 도감을 만들었어. 내용을 수정하고 저장해 줘.';show()}
function errorNotice(e){S.status=String(e?.message||e||'알 수 없는 오류');alert(S.status)}
async function withBusy(work){if(S.busy)return;S.busy=true;S.progress='요청을 준비하고 있어…';show();try{await work()}catch(e){errorNotice(e)}finally{S.busy=false;S.progress='';show()}}
async function analyze(){captureSetup();if(!S.title.trim())throw Error('분석할 작품 이름을 입력해 줘.');if(!S.rawText.trim())throw Error('먼저 텍본 파일을 업로드해 줘.');if(!hasConfig()){S.tab='settings';show();throw Error('AI 파일 분석에는 Worker 연결이 필요해. 연결이 어렵다면 ChatGPT 분석용 요청문 복사를 이용해 줘.')}
  const CAP=540_000,STEP=16000;const text=S.rawText.slice(0,CAP);const total=Math.ceil(text.length/STEP);
  if(total>1&&!confirm(`총 ${total}개 구간을 AI로 순서대로 분석해. ${total}회 이상 API 호출이 발생하며 별도 요금이 청구될 수 있어. 진행할까?`))return;
  if(S.rawText.length>CAP)alert('텍본이 길어서 처음 54만 글자까지만 자동 분석해. 나머지는 다른 파일로 나눠 추가 분석할 수 있어.');
  let bible=S.bible.title===S.title?S.bible:defaultBible(S.title);
  for(let i=0;i<total;i++){
    S.progress=`원문 분석 중 ${i+1} / ${total} 구간`;show();
    const r=await callAI('analyze_chunk',{title:S.title,media:S.media,index:i+1,total,chunk:text.slice(i*STEP,(i+1)*STEP),notes:S.notes,bible});
    bible=normalizeBible(r.value,S.title);bible.sources=unique([...(S.bible.sources||[]),...(r.sources||[]),...getNotesLinks().map(url=>({url,title:'사용자 참고 링크'}))].map(x=>JSON.stringify(x))).map(x=>JSON.parse(x)).slice(0,15);
    S.bible=bible;
  }
  S.activeId='';S.tab='knowledge';S.status=`텍본 ${total}개 구간 분석 완료. 세계관 도감을 검토한 후 저장해 줘.`;
}
async function research(){captureSetup();if(!S.title.trim())throw Error('조사할 작품 이름을 입력해 줘.');if(!hasConfig()){S.tab='settings';show();throw Error('웹 검색에는 AI 서버 연결이 필요해. 현재는 제목과 참고 링크를 직접 입력해 도감을 만들 수 있어.')}
  S.progress='공개된 작품 정보와 출처를 조사하는 중…';show();
  const r=await callAI('research',{title:S.title,media:S.media,notes:S.notes,links:getNotesLinks()});
  S.bible=normalizeBible(r.value,S.title);S.bible.sources=unique([...(r.sources||[]),...getNotesLinks().map(url=>({url,title:'사용자가 지정한 링크 (내용 미검증)'}))].map(x=>JSON.stringify(x))).map(x=>JSON.parse(x)).slice(0,20);
  if(!S.bible.sources.length)S.bible.unknowns.push('검색 출처 URL이 확보되지 않았으므로 인물과 설정 정보를 검증해 줘.');
  S.activeId='';S.tab='knowledge';S.status='웹 자료 조사 완료. 확인된 링크를 열어 정확도를 검토해 줘.';
}
async function readFile(file){if(file.size>8*1024*1024)throw Error(file.name+' 파일은 8MB 이하만 읽을 수 있어.');const lower=file.name.toLowerCase();let content='';
  if(lower.endsWith('.epub')){
    if(!window.JSZip)throw Error('EPUB 읽기 모듈이 아직 로드되지 않았어. 다시 접속해 줘.');
    const z=await JSZip.loadAsync(await file.arrayBuffer());const container=await z.file('META-INF/container.xml')?.async('string');if(!container)throw Error('EPUB 내부 문서 정보를 찾지 못했어.');
    const doc=new DOMParser().parseFromString(container,'application/xml');const root=doc.querySelector('rootfile');const opfPath=root?.getAttribute('full-path');if(!opfPath)throw Error('EPUB 목차 파일이 없어.');
    const opfText=await z.file(opfPath)?.async('string');if(!opfText)throw Error('EPUB 문서를 열 수 없어.');
    const opf=new DOMParser().parseFromString(opfText,'application/xml');const items=[...opf.getElementsByTagName('item')];const itemMap=new Map(items.map(x=>[x.getAttribute('id'),x.getAttribute('href')]));
    const spine=[...opf.getElementsByTagName('itemref')].map(x=>itemMap.get(x.getAttribute('idref'))).filter(Boolean);
    const base=opfPath.includes('/')?opfPath.slice(0,opfPath.lastIndexOf('/')+1):'';
    const paragraphs=[];for(const href of spine.slice(0,300)){
      const path=decodeURIComponent(base+href.split('#')[0]);const part=z.file(path);if(!part)continue;
      const x=new DOMParser().parseFromString(await part.async('string'),'text/html');
      for(const bad of x.querySelectorAll('script,style,nav'))bad.remove();paragraphs.push(x.body?.textContent?.trim()||'');
    }content=paragraphs.join('\n\n');
  }else{
    const ab=await file.arrayBuffer();let utf=new TextDecoder('utf-8').decode(ab);const corrupt=(utf.match(/�/g)||[]).length;if(corrupt>Math.max(3,utf.length*.005)){
      try{const ko=new TextDecoder('euc-kr').decode(ab);if((ko.match(/�/g)||[]).length<corrupt)utf=ko}catch{}
    }
    if(/\.(html?|xhtml)$/.test(lower)){
      const doc=new DOMParser().parseFromString(utf,'text/html');doc.querySelectorAll('script,style,nav').forEach(x=>x.remove());content=doc.body?.textContent||'';
    }else if(lower.endsWith('.json')){
      try{const parsed=JSON.parse(utf);content=typeof parsed==='string'?parsed:JSON.stringify(parsed,null,2)}catch{content=utf}
    }else content=utf;
  }
  return content.replace(/\r\n?/g,'\n').replace(/\n{5,}/g,'\n\n\n').trim();
}
async function filesChanged(files){if(!files?.length)return;const selected=[...files].slice(0,8);S.fileInfo='파일 읽는 중…';show();try{
  const a=[];for(const f of selected){const text=await readFile(f);if(text)a.push(`\n\n[파일: ${f.name}]\n${text}`)}
  S.rawText=a.join('\n').trim();S.fileNames=selected.map(f=>f.name);S.preview=S.rawText.slice(0,3500);
  S.fileInfo=`${selected.length}개 파일 · ${S.rawText.length.toLocaleString('ko-KR')}글자 읽음 · ${S.rawText.length>540000?'AI 분석은 앞의 54만 글자까지':'AI 분석 준비 완료'}`;
  S.status='파일 내용을 기기에서 읽었어. AI 분석 버튼을 눌러야 서버에 전송돼.';show();
}catch(e){errorNotice(e)}}
function goPlay(){const w=ensureWorld();if(!w)return;S.tab='play';S.run=S.run?.worldId===w.id?S.run:null;show()}
function makeOfflineScene(run,w){const b=w.bible;const c=b.characters[0]?.name||'한 인물';const setting=b.setting.slice(0,120)||w.title;const theme=b.tensions[0]||b.timeline[0]||'새로운 사건';const last=run.choice||'아직 선택하지 않았다';const step=run.chapter;
  return {heading:step===1?'이야기 속 첫 발자국':`${step}번째 갈림길`,body:`${setting}\n\n${run.player}은(는) ${w.title}의 세계에 나타났다. 이 세계에서 ${c}은(는) ${theme}에 관해 중요한 말을 꺼낸다.\n\n앞서 네가 내린 결정은 ‘${last}’이었다. 그 선택은 사람들의 기대를 바꾸었고, 이제 다음 행동에 책임을 져야 한다.\n\n이 장면은 오프라인 템플릿이야. AI를 연결하면 입력한 세계관과 지난 선택을 바탕으로 더 풍부하고 새로운 장면이 생성돼.`,recap:`${run.recap||''} ${run.player}의 최근 선택: ${last}`.slice(-1500),ending:false,choices:[{label:`${c}에게 협력을 요청한다`,impact:'관계를 중심으로 사건을 진행'},{label:`${theme}에 대한 단서를 조사한다`,impact:'규칙과 비밀을 살핀다'},{label:'예상하지 못한 새 행동으로 상황을 바꾼다',impact:'현재 사건에 변수를 만든다'}]};
}
async function generateScene(){const run=S.run,w=activeWorld();if(!run||!w)throw Error('시작할 세계를 골라 줘.');S.progress=`제${run.chapter}장 생성 중…`;
  if(hasConfig()){
    const r=await callAI('scene',{title:w.title,bible:w.bible,player:run.player,premise:run.premise,recap:run.recap,chapter:run.chapter,choice:run.choice,history:run.history.map(h=>h.choice)});
    run.current=r.value;run.recap=String(r.value.recap||run.recap).slice(-4000);
  }else run.current=makeOfflineScene(run,w);
  S.run=run;persistStudio();S.status=`제${run.chapter}장 준비 완료.`;show();
}
async function beginRun(){captureSetup();const w=activeWorld();if(!w)throw Error('세계관을 먼저 저장해 줘.');S.run={worldId:w.id,player:S.player.trim()||'방문자',premise:S.premise.trim(),chapter:1,history:[],current:null,recap:'',choice:''};persistStudio();await generateScene()}
async function chooseRun(choice){const r=S.run;if(!r?.current)throw Error('먼저 장면을 생성해 줘.');const c=r.current;r.history.push({chapter:r.chapter,scene:c,choice});r.recap=`${r.recap}\n제${r.chapter}장: ${c.heading}. 선택: ${choice}`.slice(-4000);r.chapter++;r.choice=choice;r.current=null;persistStudio();await generateScene()}
function rewindRun(){const r=S.run;if(!r?.history.length){updateStatus('되돌릴 선택이 없어.');return}const prev=r.history.pop();r.current=prev.scene;r.chapter=prev.chapter;r.choice=r.history.length?r.history[r.history.length-1].choice:'';r.recap=r.history.length?(r.history[r.history.length-1].scene.recap||''):'';persistStudio();show()}
function storyTXT(){const r=S.run;if(!r){alert('진행 중인 이야기가 없어.');return}const w=activeWorld();const a=[`WORLDLINE AI / ${w?.title||''}`,`주인공: ${r.player}`,'',...r.history.flatMap(h=>[`[제${h.chapter}장] ${h.scene.heading}`,h.scene.body,`선택: ${h.choice}`,'']),...(r.current?[`[제${r.chapter}장] ${r.current.heading}`,r.current.body]:[])];download(new Blob([a.join('\n\n')],{type:'text/plain;charset=utf-8'}),'WORLDLINE_AI_이야기.txt')}
function parseChatJSON(input){let data=JSON.parse(input.replace(/```(?:json)?\s*|```/g,'').trim());if(data.bible)data=data.bible;S.bible=normalizeBible(data,S.title||'분석한 세계');S.activeId='';S.tab='knowledge';S.status='ChatGPT 분석 도감을 불러왔어. 수정 후 저장해 줘.';show()}
function chatPrompt(){captureSetup();const b=S.bible||defaultBible(S.title);const prompt=`너는 선택형 스토리 앱 WORLDLINE의 세계관 분석가야. 작품의 원문을 길게 복제하지 말고 사실 설정만 요약해. 아래 자료와 사용자 메모를 구분하고, 불확실한 내용은 unknowns에 넣어 줘. 웹 검색을 할 수 있다면 공개 출처를 확인하고 출처 URL을 sources에 넣어 줘. 제목: ${S.title||b.title} / 형식: ${MEDIA_LABEL[S.media]}. 참고 URL: ${S.links}. 사용자 메모: ${S.notes}.\n\n원문 일부(전체가 아닐 수 있음):\n${S.rawText.slice(0,11500)}\n\n출력은 설명 없이 JSON 객체만. 키: title (string), summary (string), setting (string), characters ([{name,role,traits,relationships}]), rules (string[]), timeline (string[]), tensions (string[]), unknowns (string[]), sources ([{title,url}]). 작품 설정을 바탕으로 새 이야기를 쓸 수 있도록 정확하게 정리해 줘.`;
  navigator.clipboard.writeText(prompt).then(()=>{alert('요청문을 복사했어. ChatGPT에서 붙여넣고, 반환된 JSON을 앱의 「분석 JSON 붙여 넣기」로 가져올 수 있어.');window.open('https://chatgpt.com/','_blank','noopener')}).catch(()=>{promptFallback(prompt)});
}
function promptFallback(t){const e=document.createElement('textarea');e.value=t;e.style.cssText='position:fixed;inset:10%;z-index:99999;background:white;color:black;width:80%;height:50%;';document.body.appendChild(e);e.select();alert('요청문을 선택했어. 복사한 다음 ChatGPT에 붙여 넣어 줘.');setTimeout(()=>e.remove(),15000)}
function onClick(e,b){const action=b.dataset.studio;if(!action)return false;
  if(action==='tab'){captureSetup();S.tab=b.dataset.tab||'build';show();return true}
  if(action==='open'){const w=S.worlds.find(w=>w.id===b.dataset.id);if(w){S.activeId=w.id;S.bible=normalizeBible(w.bible,w.title);S.media=w.media;S.title=w.title;S.tab='knowledge';persistStudio();show()}return true}
  if(action==='draft'){offlineBible();return true}
  if(action==='analyze'){captureSetup();withBusy(analyze);return true}
  if(action==='research'){captureSetup();withBusy(research);return true}
  if(action==='save'){if(ensureWorld()){S.status='세계관 저장 완료';show()}return true}
  if(action==='saveplay'){goPlay();return true}
  if(action==='delete'){const w=activeWorld();if(w&&confirm('선택한 세계관을 삭제할까?')){S.worlds=S.worlds.filter(v=>v.id!==w.id);if(S.run?.worldId===w.id)S.run=null;S.activeId='';S.bible=defaultBible();S.tab='build';persistStudio();show()}return true}
  if(action==='connect'){captureSetup();const el=document.getElementById('wsAccess');if(el?.value.trim())accessToken=el.value.trim();if(accessToken)sessionStorage.setItem(ACCESS,accessToken);persistStudio();S.status='연결 설정 저장 완료. 「연결 확인」을 눌러 봐.';show();return true}
  if(action==='ping'){captureSetup();withBusy(async()=>{const url=S.endpoint.trim().replace(/\/$/,'');if(!/^https:\/\//.test(url))throw Error('Worker 주소를 입력해 줘.');const r=await fetch(url+'/health');if(!r.ok)throw Error('서버 상태를 확인할 수 없어.');const data=await r.json();if(!data.configured)throw Error('Worker에서 API 키 또는 접근 암호가 설정되지 않았어.');S.status='Worker 응답 확인 완료. 실제 AI 호출은 분석 시 이루어져.'});return true}
  if(action==='chatprompt'){chatPrompt();return true}
  if(action==='importjson'){const input=prompt('ChatGPT에서 받은 JSON 전체를 붙여넣어 줘.');if(input){try{parseChatJSON(input)}catch{alert('JSON 형식이 올바르지 않아. 코드블록 대신 JSON 전체를 복사해 줘.')}}return true}
  if(action==='start'){captureSetup();withBusy(beginRun);return true}
  if(action==='next'){withBusy(generateScene);return true}
  if(action==='choose'){const c=S.run?.current?.choices?.[Number(b.dataset.index)];if(c)withBusy(()=>chooseRun(c.label));return true}
  if(action==='freechoice'){const c=document.getElementById('wsFreeChoice')?.value.trim();if(!c){alert('할 행동을 입력해 줘.');return true}withBusy(()=>chooseRun(c.slice(0,900)));return true}
  if(action==='rewind'){rewindRun();return true}
  if(action==='restart'){if(confirm('현재 AI 스토리 기록을 초기화할까?')){S.run=null;persistStudio();show()}return true}
  if(action==='export-story'){storyTXT();return true}
  return false;
}
function onChange(e){if(e.target.id==='studioFiles'){filesChanged(e.target.files);return true}return false}
window.WorldlineStudio={render,onClick,onChange,open(){state.screen='studio';S.tab='build';show()},get state(){return S}};
})();
