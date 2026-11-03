/* WORLDLINE AI Studio - local-first extension; no OpenAI API key is stored in this file. */
(()=>{
'use strict';
const STORE='worldline_ai_studio_v3', OLD_STORE='worldline_ai_studio_v2', ACCESS='worldline_ai_access_session';
const MEDIA_LABEL={novel:'📖 소설',anime:'✦ 애니',game:'🎮 게임',drama:'🎬 드라마'};
const DEFAULT_STYLE='섬세한 한국·일본풍 판타지 애니메이션 일러스트, 연한 아이보리와 은빛이 섞인 맑은 색감, 자연광, 부드러운 수채화 풍 채색, 가느다란 머리카락과 섬세한 눈 묘사, 서정적인 분위기, 장면에 어울리는 절제된 붉은색 포인트. 인물과 배경·의상은 반드시 현재 이야기의 설정에 맞게 새롭게 디자인. 매번 다른 구도·시점·표정·조명. 원본 사진을 복제하거나 특정 인물을 고정 등장시키지 말 것.';
const defaultBible=(title='새로운 세계')=>({title,summary:'',setting:'',characters:[],rules:[],timeline:[],tensions:[],unknowns:[],sources:[]});
function init(){try{const p=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(OLD_STORE)||'null');return p&&typeof p==='object'?p:null}catch{return null}}
const saved=init();
const S={tab:'build',title:'',media:'novel',notes:'',links:'',player:'방문자',premise:'',endpoint:saved?.endpoint||'',worlds:Array.isArray(saved?.worlds)?saved.worlds.slice(0,18):[],activeId:saved?.activeId||'',run:saved?.run||null,bible:null,rawText:'',fileNames:[],fileInfo:'',busy:false,progress:'',pendingChoice:'',sources:[],status:'',preview:'',visualStyle:saved?.visualStyle||DEFAULT_STYLE,appearance:saved?.appearance||'',styleReference:saved?.styleReference||'',illustrationBusy:false,illustrationStatus:'',styleInfo:saved?.styleReference?'이전에 업로드한 스타일 참조 이미지가 저장돼 있어.':'참조 이미지는 선택 사항이야.',...{}};
S.bible = S.worlds.find(w=>w.id===S.activeId)?.bible||defaultBible();
S.bridgeMode=saved?.bridgeMode!==false; // default: ChatGPT manual bridge, no paid API calls
const imageCache=new Map(); let imgDBPromise=null;
function imageDB(){if(!('indexedDB' in window))return Promise.reject(Error('indexedDB unavailable'));if(!imgDBPromise)imgDBPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('worldline-scenes-v3',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return imgDBPromise}
async function imagePut(key,b64){imageCache.set(key,b64);try{const db=await imageDB();await new Promise((res,rej)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(b64,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch{}}
async function imageGet(key){if(imageCache.has(key))return imageCache.get(key);try{const db=await imageDB();return await new Promise((res,rej)=>{const tx=db.transaction('images','readonly');const r=tx.objectStore('images').get(key);r.onsuccess=()=>{if(r.result)imageCache.set(key,r.result);res(r.result||'')};r.onerror=()=>rej(r.error)})}catch{return ''}}
async function hydrateImages(){for(const el of document.querySelectorAll('[data-worldline-image]')){const key=el.dataset.worldlineImage;if(!key||el.dataset.ready==='yes')continue;const data=await imageGet(key);if(data&&el.isConnected){el.src='data:image/png;base64,'+data;el.dataset.ready='yes'}}}
let accessToken=sessionStorage.getItem(ACCESS)||'';
const esc=s=>clean(String(s??''));
const urlSafe=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const lines=s=>String(s||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,60);
const unique=a=>[...new Set(a)];
function persistStudio(){try{
  const worlds=S.worlds.slice(0,18).map(w=>({id:w.id,media:w.media,title:w.title,bible:w.bible,created:w.created}));
  const run=S.run?{worldId:S.run.worldId,player:S.run.player,premise:S.run.premise,chapter:S.run.chapter,history:S.run.history.slice(-60),current:S.run.current,recap:S.run.recap,choice:S.run.choice,continuity:S.run.continuity||[],visualHistory:S.run.visualHistory||[],illustrations:S.run.illustrations||{}}:null;
  localStorage.setItem(STORE,JSON.stringify({endpoint:S.endpoint,worlds,activeId:S.activeId,run,visualStyle:S.visualStyle,appearance:S.appearance,styleReference:S.styleReference,bridgeMode:S.bridgeMode}));
}catch(e){alert('저장 공간이 부족해. 세계관을 줄이거나 기존 항목을 삭제한 뒤 다시 시도해.')}}
function activeWorld(){return S.worlds.find(w=>w.id===S.activeId)}
function updateStatus(msg){S.status=msg;const el=document.getElementById('studioStatus');if(el)el.textContent=msg}
function show(){if(state.screen==='studio'){window.render();Promise.resolve().then(hydrateImages)}}
function captureSetup(){for(const [id,k] of [['wsTitle','title'],['wsNotes','notes'],['wsLinks','links'],['wsPlayer','player'],['wsPremise','premise'],['wsEndpoint','endpoint'],['wsStyle','visualStyle'],['wsAppearance','appearance']]){
  const v=document.getElementById(id);if(v)S[k]=v.value;
}const m=document.getElementById('wsMedia');if(m)S.media=m.value}
function hasConfig(){return !!(S.endpoint&&accessToken)}
function useBridge(){return S.bridgeMode||!hasConfig()}
async function callAI(action,data){
  if(!hasConfig())throw Error('AI 연결 설정이 필요해. 먼저 연결 주소와 접근 암호를 등록해 줘.');
  const endpoint=S.endpoint.trim().replace(/\/$/,'');if(!/^https:\/\//.test(endpoint))throw Error('연결 주소는 https://로 시작해야 해.');
  const response=await fetch(endpoint+'/api',{method:'POST',headers:{'Content-Type':'application/json','X-Worldline-Access':accessToken,'X-Worldline-Operation':action},body:JSON.stringify({action,...data})});
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
function renderNavTabs(){const tabs=[['build','① 작품·텍본'],['knowledge','② 세계관 도감'],['play','③ 자유 입력 스토리'],['settings','⚙ AI 연결']];return `<div class="ws-tabs">${tabs.map(([k,l])=>`<button class="ws-tab ${S.tab===k?'active':''}" data-studio="tab" data-tab="${k}">${l}</button>`).join('')}</div>`}
function renderBuild(){return `<div class="ws-split"><section class="ws-card">
  <div class="ws-card-head"><span class="ws-step">01 / DATA</span><h2>작품과 자료 입력</h2><p>텍본이 있다면 파일로 올리고, 없으면 작품명·검색 자료·직접 만든 설정만 입력해도 돼.</p></div>
  <div class="ws-form-row">${formField('작품 또는 세계관 이름','wsTitle',S.title,'placeholder="작품명 또는 직접 만든 제목" maxlength="100"')}<div class="ws-field"><label for="wsMedia">장르</label><select id="wsMedia">${Object.entries(MEDIA_LABEL).map(([k,v])=>`<option value="${k}" ${S.media===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
  <div class="ws-upload"><label for="studioFiles" class="ws-upload-label"><span class="ws-upload-icon">⇧</span><b>텍본 업로드</b><small>TXT · MD · HTML · EPUB · JSON · 여러 파일 선택 가능</small></label><input type="file" id="studioFiles" multiple accept=".txt,.md,.markdown,.html,.htm,.epub,.json,text/plain,text/markdown,application/epub+zip" ${S.busy?'disabled':''}><p class="ws-file-info">${esc(S.fileInfo||'파일 내용은 먼저 기기에서 읽어. AI 분석을 누를 때만 설정한 서버로 전송돼.')}</p></div>
  ${area('추가 세계관·인물·금지할 전개·시작 상황','wsNotes',S.notes,6,'예: 세계의 능력 체계, 주요 인물 관계, 어느 사건에서 원작을 바꾸고 싶은지')}
  ${area('참고 링크 (한 줄에 하나)','wsLinks',S.links,3,'https://namu.wiki/w/...\nhttps://...')}
  <div class="ws-actions">${btn('chatprompt','📋 ChatGPT에 세계관 분석 요청','btn-primary')}${btn('draft','직접 입력으로 도감 만들기')}${!useBridge()?btn('analyze','✧ API 텍본 분석'):''}${!useBridge()?btn('research','⌕ API 웹 조사'):''}</div>
  <p class="ws-help">ChatGPT 왕복 모드는 별도 API 충전이 필요 없어. 요청문 복사 후 ChatGPT에서 파일을 직접 첨부해 분석하고, 반환된 JSON을 앱에 가져와. 긴 원문 전문은 이 앱에서 자동으로 ChatGPT에 업로드되지 않아.</p>
  </section><aside class="ws-card ws-info"><span class="ws-step">WORKFLOW</span><h3>세 가지 시작 방법</h3><div class="ws-path"><b>📄 텍본이 있을 때</b><p>파일을 올리고 AI가 인물·설정·세계의 규칙·사건 흐름을 나누어 정리해.</p></div><div class="ws-path"><b>🔎 텍본이 없을 때</b><p>작품명을 입력하고 웹 자료를 검색해. 나무위키 등은 확인 가능한 내용만 참고해.</p></div><div class="ws-path"><b>✍ 직접 설정할 때</b><p>네가 적은 설정을 도감으로 저장하고 원하는 지점에서 전개를 바꿔.</p></div><hr><h3>이미 저장한 세계</h3>${S.worlds.length?S.worlds.map(w=>`<div class="ws-saved"><span>${esc(w.title)}</span><button class="btn btn-small" data-studio="open" data-id="${esc(w.id)}">열기</button></div>`).join(''):'<p class="ws-muted">아직 저장한 세계가 없어.</p>'}</aside></div>`}
function renderSources(){const src=S.bible.sources||[];if(!src.length)return `<p class="ws-muted">등록된 링크가 없어. 웹 검색 결과를 사용한 경우 서버가 출처를 제공할 때만 표시돼.</p>`;return `<div class="ws-sources">${src.map(s=>{const u=urlSafe(s.url);return u?`<a target="_blank" rel="noopener noreferrer" href="${esc(u)}">${esc(s.title||u)} ↗</a>`:''}).join('')}</div>`}
function bibleFields(){const b=S.bible;const cs=b.characters.map(c=>[c.name,c.role,c.traits,c.relationships].map(x=>String(x||'').replaceAll('|','/')).join(' | ')).join('\n');return `${formField('세계/작품명','wsBibleTitle',b.title,'maxlength="100"')}${area('핵심 세계관 요약','wsSummary',b.summary,5,'세계의 핵심 갈등과 분위기')}${area('시대·지리·사회·배경','wsSetting',b.setting,4)}${area('주요 인물: 한 줄에 이름 | 역할 | 성격 | 관계','wsCharacters',cs,6,'주인공 | 학생 | 신중함 | A의 친구')}${area('능력·마법·기술·세계 규칙 (한 줄에 하나)','wsRules',b.rules.join('\n'),4)}${area('원작 주요 사건 흐름 (한 줄에 하나)','wsTimeline',b.timeline.join('\n'),5)}${area('갈등과 미해결 떡밥','wsTensions',b.tensions.join('\n'),4)}${area('불확실하거나 확인이 필요한 정보','wsUnknowns',b.unknowns.join('\n'),3)}`}
function renderKnowledge(){return `<div class="ws-split ws-knowledge"><section class="ws-card"><span class="ws-step">02 / WORLD BIBLE</span><h2>세계관 도감</h2><p class="ws-muted">AI 결과는 틀릴 수 있어. 네가 직접 고친 내용이 이야기 생성의 기준이 돼.</p><div class="ws-editor">${bibleFields()}</div><div class="ws-actions">${btn('save','✓ 세계관 저장','btn-primary')}${btn('saveplay','저장하고 이야기 시작 →')}${btn('chatprompt','📋 ChatGPT 분석 요청문 복사')}${btn('go-settings','분석 JSON 가져오기')}</div></section><aside class="ws-card ws-info"><span class="ws-step">REFERENCES</span><h3>참고한 링크</h3>${renderSources()}<hr><h3>세계관 정확도</h3><p class="ws-muted">업로드된 텍본과 입력한 메모는 우선 적용해. 웹에서 찾은 정보는 출처를 열어 확인할 수 있고, 근거가 모호한 부분은 ‘확인 필요’ 항목에 남겨.</p><hr><h3>작품의 장면 사용</h3><p class="ws-muted">원작 내용을 그대로 복제하기보다 인물과 세계의 설정을 참고하여 새로운 장면·선택·전개를 만드는 방식이야.</p>${S.activeId?btn('delete','이 세계 삭제'):''}</aside></div>`}
function imageKey(run,chapter,variant){return `world:${run.worldId}:chapter:${chapter}:v${variant}`}
function currentIllustrations(run){return Array.isArray(run.illustrations?.[run.chapter])?run.illustrations[run.chapter]:[]}
function renderIllustrations(run){
 const arts=currentIllustrations(run);
 const controls=useBridge()?`${btn('prompt-image','📋 ChatGPT에 일러스트 요청','btn-primary')}<button class="btn" data-studio="open-chatgpt">↗ ChatGPT 열기</button><label for="wsIllustrationImport" class="btn">↑ 만든 그림 불러오기</label><input id="wsIllustrationImport" type="file" accept="image/png,image/jpeg,image/webp" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">`:btn('illustrate','✧ 이번 장면 일러스트 생성','btn-primary');
 return `<div class="ws-illustration-section"><div class="ws-ill-head"><div><strong>장면 일러스트</strong><p>요청할 때만 새 그림 · 구도/표정/배경 변주</p></div><div class="ws-actions">${controls}</div></div>${S.illustrationBusy?'<div class="ws-progress">이미지 처리 중…</div>':''}${arts.length?`<div class="ws-gallery">${arts.map((a,i)=>`<figure class="ws-art"><img alt="제${run.chapter}장 일러스트 ${i+1}" data-worldline-image="${esc(a.key)}"><figcaption>${esc(a.caption||'장면 일러스트 '+(i+1))} · <button class="ws-link" data-studio="save-image" data-key="${esc(a.key)}" data-chapter="${run.chapter}">이미지 저장 ↓</button></figcaption></figure>`).join('')}</div>`:'<p class="ws-muted">생성한 그림이 아직 없어. ChatGPT에서 만든 그림을 아이패드에 저장한 다음 이곳으로 불러오면 돼.</p>'}<p class="ws-small-note">모델을 재학습시키는 것이 아니라 이전 그림의 구도 기록과 설정을 다음 그림 요청에 참고해. ChatGPT에서 만든 이미지는 자동으로 웹앱에 전송되지 않아.</p></div>`;
}
function renderPlay(){
 const r=S.run,w=activeWorld();
 if(!w)return `<section class="ws-card"><h2>먼저 세계관을 저장해 줘</h2><p>텍본을 분석하거나 직접 도감을 만든 뒤 이야기 시작을 눌러 줘.</p><button class="btn btn-primary" data-studio="tab" data-tab="knowledge">세계관 도감으로</button></section>`;
 let content='';
 if(!r||r.worldId!==w.id){
   content=`${formField('세계 속 내 이름','wsPlayer',S.player,'maxlength="40"')}${area('개입할 시점과 첫 상황','wsPremise',S.premise,5,'예: 왕녀가 왕궁을 탈출하는 날, 내가 도서관 사서로 그 현장에 있다.')}${btn('start','✧ 첫 상황 생성하기','btn-primary')}`;
 }else{
   const sc=r.current;
   let narrative='';
   if(sc){
     const paragraphs=esc(sc.body).split(/\n\s*\n/).map(x=>`<p>${x.replace(/\n/g,'<br>')}</p>`).join('');
     const consequences=(sc.consequences||[]).length?`<div class="ws-causality"><b>이번 장면의 변화</b><ul>${sc.consequences.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';
     narrative=`<h3>${esc(sc.heading)}</h3><div class="ws-prose">${paragraphs}</div>${sc.ending?'<p class="ws-small-note">하나의 결말처럼 마무리됐어. 원하면 후일담도 계속할 수 있어.</p>':''}${consequences}${renderIllustrations(r)}<div class="ws-free-action"><b>이제 어떻게 행동할까?</b><p>선택지 없이 대사·행동·전략·시간 이동 요청까지 직접 입력해. 불가능한 행동은 설정에 따라 실패하거나 다른 결과가 나올 수 있어.</p>${area('내 행동 직접 입력','wsFreeChoice','',5,'예: 왕녀의 정체를 숨기고 경비대장에게 질문하며 시간을 번다.')}${btn(useBridge()?'manual-next':'freechoice',useBridge()?'📋 이 행동으로 ChatGPT에 다음 장 요청':'내 행동으로 다음 장 생성 ↗','btn-primary')}<p class="ws-small-note">${useBridge()?'입력한 행동·세계관·인물 관계·사건 기록을 요청문에 묶어. ChatGPT 답변을 붙여 넣으면 다음 장으로 넘어가.':'AI 서버로 다음 장을 생성해.'}</p></div>`;
   }else{
     narrative=`<div class="ws-loading"><b>${useBridge()?'이 장면은 ChatGPT에서 작성한 내용을 가져와 완성해.':S.busy?'새 장면을 작성 중…':'다음 장을 생성할 준비가 됐어.'}</b><p class="ws-muted">${useBridge()?'1. 요청문 복사 → 2. ChatGPT 열기 → 3. 답변 JSON 붙여넣기':'자동 AI 작성 중'}</p></div>${btn(useBridge()?'prompt-scene':'next',useBridge()?'📋 ChatGPT에 이 장면 요청':'장면 생성하기','btn-primary')}<button class="btn" data-studio="open-chatgpt">↗ ChatGPT 열기</button>`;
   }
   content=`<div class="ws-play-card"><div class="ws-chapter">CHAPTER ${String(r.chapter||1).padStart(2,'0')} · ${esc(r.player)}</div>${narrative}</div><div class="ws-actions">${btn('rewind','↶ 직전 행동으로 돌아가기')}${btn('restart','↻ 처음부터 새로')}${btn('export-story','↓ 이야기 TXT 저장')}${btn('prompt-scene','📋 ChatGPT 장면 요청문 복사')}${btn('open-chatgpt','↗ ChatGPT 열기')}</div><div class="ws-bridge-import"><h3>📥 ChatGPT 답변 가져오기</h3><p class="ws-muted">이 대화에서 받은 JSON 코드를 모두 복사해 아래에 붙여넣어. 앱이 본문과 기억을 저장해.</p>${area('ChatGPT가 만든 장면 JSON을 붙여 넣기','wsScenePaste','',4,'{"heading":"...","body":"...","recap":"...","ending":false,"consequences":[],"unresolved":[],"characterState":[],"illustrationBrief":"..."}')}${btn('import-scene','✓ 다음 장면 저장','btn-primary')}</div>`;
 }
 const mem=r?.history?.length?`<ol class="ws-history">${r.history.slice(-14).map(h=>`<li>제${h.chapter}장 · ${esc(h.choice)}</li>`).join('')}</ol>`:'<p class="ws-muted">첫 행동을 기다리고 있어.</p>';
 const continuity=r?.continuity?.length?`<ul class="ws-history">${r.continuity.slice(-12).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="ws-muted">관계·미해결 사건·결과가 여기에 기록돼.</p>';
 return `<div class="ws-split ws-play"><section class="ws-card"><span class="ws-step">03 / WRITE YOUR OWN ACTION</span><h2>${esc(w.title)}</h2><p class="ws-muted">고정 선택지가 없어. 네 행동을 입력하면 AI가 세계관·기존 사건·인물의 동기와 비교해 다음 장면을 생성해.</p>${content}</section><aside class="ws-card ws-info"><span class="ws-step">WORLD MEMORY</span><h3>바뀐 세계선</h3>${mem}<hr><h3>일관성 체크</h3>${continuity}<hr><h3>세계관 기준</h3><p class="ws-muted">${esc(w.bible.summary.slice(0,650)||'사용자 작성 도감')}</p><hr><p class="ws-muted">${useBridge()?'✦ ChatGPT 왕복 모드 · 별도 API 충전 불필요':hasConfig()?'✧ API 자동 연결됨':'◌ 미연결'}</p></aside></div>`;
}
function renderSettings(){return `<div class="ws-split"><section class="ws-card"><span class="ws-step">CHATGPT BRIDGE</span><h2>ChatGPT 왕복 모드</h2><p class="ws-muted">이 ChatGPT 대화를 API처럼 웹앱에 직접 연결할 수는 없어. 대신 앱이 요청문을 준비하고, ChatGPT 응답을 앱에 가져오는 방식이야. 추가 API 크레딧은 필요하지 않지만 복사·붙여넣기는 필요해.</p><div class="ws-actions">${btn('toggle-mode',S.bridgeMode?'✓ ChatGPT 왕복 모드 켜짐 (기본값)':'○ ChatGPT 왕복 모드 끄기','btn-primary')}${btn('open-chatgpt','↗ ChatGPT 열기')}</div><p class="ws-help">켜짐: WORLDLINE은 외부 AI API를 호출하지 않아. 꺼짐: 서버 연결이 구성된 경우 자동 API를 사용해 별도 요금이 발생할 수 있어.</p><hr><span class="ws-step">SECURE CONNECTION</span><h2>AI 글쓰기·일러스트 서버 연결</h2><p class="ws-muted">ChatGPT 구독과 OpenAI API는 별개야. GitHub Pages에 비밀 API 키를 넣으면 노출되므로, Cloudflare Worker 보안 중계 서버를 사용해.</p>${formField('Cloudflare Worker 주소','wsEndpoint',S.endpoint,'placeholder="https://이름.계정.workers.dev" inputmode="url"')}${formField('WORLDLINE 접근 암호 (API 키 아님)','wsAccess','',`type="password" placeholder="Worker에 저장한 APP_ACCESS_TOKEN" autocomplete="off"`)}<div class="ws-actions">${btn('connect','연결 설정 저장','btn-primary')}${btn('ping','연결 확인')}</div><p class="ws-help">접근 암호는 이 브라우저 탭/세션에만 저장하고, GitHub나 내보내기 파일에 넣지 않아. 실제 OpenAI 키는 Worker Secrets에만 저장해야 해.</p><hr><h3>그림 스타일 설정</h3>${area('계속 사용할 일러스트 스타일','wsStyle',S.visualStyle,5)}${area('인물 외형 설정 (일관성 유지)','wsAppearance',S.appearance,4,'예: 왕녀 라엘은 은발·회청색 눈·왼쪽 귀 은색 장식') }<div class="ws-field"><label for="wsStyleFile">내가 원하는 그림 분위기의 참조 이미지 (선택)</label><input id="wsStyleFile" type="file" accept="image/png,image/jpeg,image/webp"><small class="ws-muted">${esc(S.styleInfo)} · 업로드한 그림은 새 작품의 참고 화풍으로만 사용하며 공개 저장소에 올라가지 않아.</small></div><div class="ws-actions">${btn('save-style','일러스트 취향 저장')}${btn('clear-style','참조 그림 삭제')}</div><hr><h3>AI 연결 없이 사용하려면</h3><p>AI를 연결하지 않아도 세계관 도감을 직접 저장하고, ChatGPT에 장면 생성 프롬프트를 복사해 결과 JSON을 붙여 넣을 수 있어. 자동 이미지 생성에는 API가 필요해.</p>${btn('chatprompt','📋 ChatGPT 세계관 분석 요청문 복사')}${btn('open-chatgpt','↗ ChatGPT 열기')}${area('ChatGPT가 만든 JSON 붙여넣기','wsJSONPaste','',6,'여기에 ChatGPT가 반환한 JSON 객체 전체를 붙여 넣기')} ${btn('importjson','붙여넣은 JSON을 세계관으로 가져오기','btn-primary')}</section><aside class="ws-card ws-info"><span class="ws-step">IMPORTANT</span><h3>파일과 개인정보</h3><p class="ws-muted">텍본은 업로드 직후 이 기기에서 읽어. AI 분석이나 웹 조사를 실행하면 필요한 텍스트를 서버와 OpenAI API에 전송해. 원본 텍본은 WORLDLINE 서버에 저장하지 않아.</p><hr><h3>AI 글쓰기·그림 비용</h3><p class="ws-muted">OpenAI API 과금은 ChatGPT 구독과 별개야. 일러스트는 매번 새 API 이미지 생성이므로 더 많은 비용이 발생할 수 있어. 이미지 생성은 요청 버튼을 눌렀을 때만 수행돼.</p><hr><h3>오류가 날 때</h3><p class="ws-muted">연결이 실패하면 Worker 배포, 두 가지 Secret, ALLOWED_ORIGIN, 입력한 접근 암호를 확인해.</p></aside></div>`}
function render(){const tab=S.tab;return `<div class="page ws-page"><div class="ws-hero"><div><span class="eyebrow">WORLDLINE AI STUDIO</span><h1>원하는 세계로 들어가,<br><em>이야기를 다시 써.</em></h1><p>텍본 업로드 · 웹 자료 조사 · 세계관 직접 편집 · 자유 행동 입력형 AI 스토리</p></div><div class="ws-hero-mark">✧</div></div>${renderNavTabs()}<div class="ws-status" id="studioStatus" aria-live="polite">${esc(S.status||'작품 파일을 올리거나 세계관 이름을 입력해 시작해. 행동과 대사는 직접 입력해.')}</div>${S.busy?`<div class="ws-progress" role="status">${esc(S.progress||'처리 중…')}</div>`:''}${tab==='build'?renderBuild():tab==='knowledge'?renderKnowledge():tab==='play'?renderPlay():renderSettings()}<footer class="ws-footer">ChatGPT 왕복 모드는 별도 API 과금 없이 요청문을 복사하고 결과를 붙여넣는 방식이야. WORLDLINE이 이 대화에 직접 접근하는 것은 아니야. ※ 창작용 팬 시뮬레이터야. 검색한 세계관 정보와 AI 생성 내용은 사실과 다를 수 있어.</footer></div>`}
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
  if(activeWorld()?.title!==S.title)S.activeId='';S.tab='knowledge';S.status=`텍본 ${total}개 구간 분석 완료. 세계관 도감을 검토한 후 저장해 줘.`;
}
async function research(){captureSetup();if(!S.title.trim())throw Error('조사할 작품 이름을 입력해 줘.');if(!hasConfig()){S.tab='settings';show();throw Error('웹 검색에는 AI 서버 연결이 필요해. 현재는 제목과 참고 링크를 직접 입력해 도감을 만들 수 있어.')}
  S.progress='공개된 작품 정보와 출처를 조사하는 중…';show();
  const r=await callAI('research',{title:S.title,media:S.media,notes:S.notes,links:getNotesLinks()});
  S.bible=normalizeBible(r.value,S.title);S.bible.sources=unique([...(r.sources||[]),...getNotesLinks().map(url=>({url,title:'사용자가 지정한 링크 (내용 미검증)'}))].map(x=>JSON.stringify(x))).map(x=>JSON.parse(x)).slice(0,20);
  if(!S.bible.sources.length)S.bible.unknowns.push('검색 출처 URL이 확보되지 않았으므로 인물과 설정 정보를 검증해 줘.');
  if(activeWorld()?.title!==S.title)S.activeId='';S.tab='knowledge';S.status='웹 자료 조사 완료. 확인된 링크를 열어 정확도를 검토해 줘.';
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
async function filesChanged(files){if(!files?.length)return;captureSetup();const selected=[...files].slice(0,8);S.fileInfo='파일 읽는 중…';show();try{
  const a=[];for(const f of selected){const text=await readFile(f);if(text)a.push(`\n\n[파일: ${f.name}]\n${text}`)}
  S.rawText=a.join('\n').trim();if(!S.title.trim())S.title=selected[0].name.replace(/\.(txt|md|markdown|epub|html|htm|json)$/i,'').slice(0,100);S.fileNames=selected.map(f=>f.name);S.preview=S.rawText.slice(0,3500);
  S.fileInfo=`${selected.length}개 파일 · ${S.rawText.length.toLocaleString('ko-KR')}글자 읽음 · ${S.rawText.length>540000?'AI 분석은 앞의 54만 글자까지':'AI 분석 준비 완료'}`;
  S.status='파일 내용을 기기에서 읽었어. AI 분석 버튼을 눌러야 서버에 전송돼.';show();
}catch(e){errorNotice(e)}}
function goPlay(){const w=ensureWorld();if(!w)return;S.tab='play';S.run=S.run?.worldId===w.id?S.run:null;show()}
function makeOfflineScene(run,w){const b=w.bible;const c=b.characters[0]?.name||'낯선 인물';const setting=b.setting.slice(0,125)||w.title;const tension=b.tensions[0]||b.timeline[0]||'아직 밝혀지지 않은 사건';const action=run.choice||'아직 행동을 정하지 않았다';const first=run.chapter===1;
 return {heading:first?'이 세계에서 눈을 뜨다':`${run.chapter}장 · 행동의 여파`,body:first?`${setting}\n\n${run.player}은(는) 이곳에서 ${c}과(와) 마주한다. 눈앞에 펼쳐진 상황은 ${tension}과(와) 관련돼 있다. 지금 무슨 행동을 할지는 오직 너에게 달려 있다.\n\n※ 이 장면은 AI 미연결 체험용 문장으로, 업로드된 원문을 의미 분석해 생성한 내용이 아니야.`:`${run.player}은(는) 방금 ‘${action}’이라고 행동을 정했다. 그 결정에 대해 ${c}은(는) 즉시 대답하지 못한다. ${setting}에서는 누구의 행동도 결과 없이 지나가지 않는다.\n\n${tension}. 바로 다음 순간, 새로운 의문이 생겼다.\n\n※ AI가 연결되지 않은 체험 장면이야. 실제 인과적 창작은 AI 서버에서 생성돼.`,recap:`${run.recap||''}\n${run.chapter}장: ${action}`.slice(-4200),ending:false,consequences:[`플레이어의 행동: ${action}`],unresolved:[tension],characterState:[`${c}: 상황을 지켜보고 있음`],illustrationBrief:`${setting} 배경에서 ${c}이(가) 긴장하며 서 있는 장면`};
}
function normalizeScene(value){if(!value||typeof value!=='object'||!String(value.body||'').trim())throw Error('장면 JSON에 body가 필요해.');return {heading:String(value.heading||'새로운 상황').slice(0,160),body:String(value.body).slice(0,12000),recap:String(value.recap||'').slice(-5500),ending:!!value.ending,consequences:Array.isArray(value.consequences)?value.consequences.slice(0,10).map(String):[],unresolved:Array.isArray(value.unresolved)?value.unresolved.slice(0,10).map(String):[],characterState:Array.isArray(value.characterState)?value.characterState.slice(0,10).map(String):[],illustrationBrief:String(value.illustrationBrief||'').slice(0,1500)};}
async function generateScene(){const run=S.run,w=activeWorld();if(!run||!w)throw Error('시작할 세계를 골라 줘.');S.progress=`제${run.chapter}장 생성 중…`;
 if(hasConfig()){
   const r=await callAI('scene',{title:w.title,bible:w.bible,player:run.player,premise:run.premise,recap:run.recap,chapter:run.chapter,choice:run.choice,history:run.history.slice(-12).map(h=>({chapter:h.chapter,action:h.choice,heading:h.scene.heading,consequences:h.scene.consequences||[],unresolved:h.scene.unresolved||[],characterState:h.scene.characterState||[]})),continuity:run.continuity||[]});
   run.current=normalizeScene(r.value);run.recap=run.current.recap||run.recap;
 }else run.current=makeOfflineScene(run,w);
 run.continuity=[...new Set([...(run.continuity||[]),...(run.current.consequences||[]),...(run.current.unresolved||[]),...(run.current.characterState||[])])].slice(-35);
 S.run=run;persistStudio();S.status=`제${run.chapter}장 준비 완료.`;show();
}
async function beginRun(){captureSetup();const w=activeWorld();if(!w)throw Error('세계관을 먼저 저장해 줘.');S.run={worldId:w.id,player:S.player.trim()||'방문자',premise:S.premise.trim(),chapter:1,history:[],current:null,recap:'',choice:'',continuity:[],illustrations:{},visualHistory:[]};persistStudio();if(useBridge()){S.status='ChatGPT에 첫 장면을 요청한 후 JSON을 가져와 줘.';show()}else await generateScene()}
async function chooseRun(choice){const r=S.run;if(!r?.current)throw Error('먼저 장면을 생성해 줘.');const c=r.current;r.history.push({chapter:r.chapter,scene:c,choice});r.recap=`${r.recap}\n제${r.chapter}장: ${c.heading}. 행동: ${choice}`.slice(-5000);r.chapter++;r.choice=choice;r.current=null;persistStudio();await generateScene()}
function promptForManualScene(){
 const r=S.run,w=activeWorld();if(!r||!w){alert('세계관을 저장하고 이야기를 먼저 시작해 줘.');return}
 const sceneHistory=r.history.slice(-14).map(h=>({chapter:h.chapter,action:h.choice,title:h.scene.heading,results:h.scene.consequences,people:h.scene.characterState,unresolved:h.scene.unresolved}));
 const prompt=`[WORLDLINE · ChatGPT 왕복 모드 · ${r.chapter}장]\n너는 원작 고증을 중시하는 한국어 장편 인터랙티브 소설 작가다. 사용자가 행동을 자유롭게 결정하고, 너는 결과를 개연성 있게 이어 쓴다. 아래 세계관 도감과 사건 기억을 반드시 반영하라. 원작의 긴 문장과 대사를 그대로 재현하지 말고 새 장면을 창작하라. 무리한 능력 사용·설정 위반은 실패하거나 비용과 반작용이 있게 하라. 모순이나 부족한 근거는 임의로 확정하지 말고 드러내라. 이전 행동의 파급 효과와 다른 인물들의 독립적 동기를 유지하라. 대사·행동·주변 반응을 포함해 한국어 약 1000~1700자 분량으로 이어 써라. 선택지는 만들지 마라.\n\n제목: ${w.title}\n세계관 도감: ${JSON.stringify(w.bible)}\n사용자/주인공: ${r.player}\n개입 시작 상황: ${r.premise}\n현재 장: ${r.chapter}\n이번에 사용자가 선언한 행동: ${r.choice||'(첫 장면이므로 첫 상황을 제시해)'}\n사건 요약: ${r.recap||'(첫 장)'}\n인물 상태·미해결 사건: ${JSON.stringify(r.continuity||[])}\n최근 선택과 결과: ${JSON.stringify(sceneHistory)}\n그림 스타일은 파스텔 톤의 부드러운 빛과 섬세한 애니풍, 장면에 맞는 다른 구도.\n\n답변은 아래 스키마의 JSON 객체 하나만 반환하고 다른 문장은 쓰지 마. body는 여러 문단의 자연스러운 한국어 서사로 작성하라. 끝내야 하는 상황이 아니라면 ending=false.\n{"heading":"장면 제목","body":"이어지는 장면 본문","recap":"지금까지 인과관계가 반영된 누적 줄거리 요약","ending":false,"consequences":["이번 장면의 변화"],"unresolved":["미해결 복선"],"characterState":["인물의 상태·관계 변화"],"illustrationBrief":"새로운 구도의 해당 장면 일러스트 설명"}`;
 copyBridgeText(prompt,'장면 요청문을 복사했어. ChatGPT에 붙여넣고 답변 JSON을 WORLDLINE에 가져와.');
}
function copyBridgeText(prompt,msg){
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(prompt).then(()=>{updateStatus(msg);alert(msg)}).catch(()=>promptFallback(prompt));}
 else promptFallback(prompt);
}
function manualNext(){
 const r=S.run;
 const action=document.getElementById('wsFreeChoice')?.value?.trim();
 if(!r?.current||!action){alert('먼저 이번 장면에서 할 행동을 입력해 줘.');return}
 const current=r.current;
 r.history.push({chapter:r.chapter,scene:current,choice:action.slice(0,2000)});
 r.recap=`${r.recap||''}\n제${r.chapter}장: ${current.heading}. 사용자 행동: ${action}`.slice(-6500);
 r.chapter++;r.choice=action.slice(0,2000);r.current=null;
 persistStudio();promptForManualScene();show();
}
function promptForImage(){
 const r=S.run,w=activeWorld();if(!r?.current||!w){alert('먼저 생성된 장면이 필요해.');return}
 captureSetup();const prev=(r.visualHistory||[]).slice(-10);
 const variant=currentIllustrations(r).length+1;
 const prompt=`다음 세계관과 장면에 어울리는 새로운 세로형 일러스트 이미지를 생성해 줘.\n화풍: ${S.visualStyle}\n인물 외형: ${S.appearance}\n세계관: ${JSON.stringify({title:w.title,setting:w.bible.setting,characters:w.bible.characters})}\n현재 장면: 제${r.chapter}장 ${r.current.heading}\n상세 상황: ${r.current.body.slice(0,1500)}\n장면 그림 설명: ${r.current.illustrationBrief}\n이번 버전 번호: ${variant}\n이미 사용한 연출: ${JSON.stringify(prev)}\n동일 장면의 중복 그림을 재사용하지 말고, 머리 모양·눈 색·의상 같은 캐릭터 고유 특징은 유지하면서 카메라 각도·몸짓·표정·시간대·배경의 세부를 변화시킨 새 이미지로 만들어. 서정적이고 섬세한 빛과 채색, 세로형 2:3. 내가 제공한 참조 이미지를 그대로 복제하지 마. 그림 설명이 아니라 이미지를 생성해 줘.`;
 copyBridgeText(prompt,'일러스트 요청문을 복사했어. ChatGPT에서 이미지를 만든 뒤 아이패드에 저장하고 WORLDLINE에 불러와.');
}
async function importIllustration(file){
 if(!file||!S.run?.current)return;
 if(file.size>12*1024*1024){alert('12MB 이하 그림만 등록할 수 있어.');return}
 const img=await new Promise((res,rej)=>{const i=new Image();const url=URL.createObjectURL(file);i.onload=()=>{URL.revokeObjectURL(url);res(i)};i.onerror=()=>{URL.revokeObjectURL(url);rej(Error('이미지를 열 수 없어.'))};i.src=url});
 const max=1600,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*ratio);c.height=Math.round(img.naturalHeight*ratio);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 const data=c.toDataURL('image/png').split(',')[1],r=S.run,chapter=r.chapter,variant=currentIllustrations(r).length+1,key=imageKey(r,chapter,variant);
 await imagePut(key,data);r.illustrations??={};r.illustrations[chapter]??=[];r.illustrations[chapter].push({key,caption:`${r.current.heading} · ChatGPT 그림 ${variant}`,created:new Date().toISOString()});
 r.visualHistory??=[];r.visualHistory.push({chapter,variant,heading:r.current.heading,shot:`사용자 불러온 새로운 일러스트 ${variant}`,prompt:r.current.illustrationBrief.slice(0,160)});
 persistStudio();S.status='ChatGPT 일러스트를 이번 장면에 저장했어.';show();
}
async function styleFileChanged(file){if(!file)return;captureSetup();if(file.size>8*1024*1024){alert('8MB 이하 이미지로 선택해 줘.');return}const image=await createImageBitmap(file);const scale=Math.min(1,720/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);S.styleReference=canvas.toDataURL('image/jpeg',.72);S.styleInfo=`참조 이미지 등록됨 (${canvas.width}×${canvas.height})`;persistStudio();show()}
async function illustrateScene(){const r=S.run,w=activeWorld();if(!r?.current||!w)throw Error('일러스트를 만들 장면이 없어.');if(useBridge()){throw Error('ChatGPT 왕복 모드에서는 위 버튼으로 일러스트 요청문을 복사해 줘.')}if(!hasConfig()){S.tab='settings';show();throw Error('실제 이미지 생성에는 Worker와 OpenAI 이미지 API 연결이 필요해. 설정을 먼저 마쳐 줘.')}if(S.illustrationBusy)return;
 if(!confirm('이번 장면의 새 일러스트를 생성할까? 이미지 생성 API 요금이 청구될 수 있어.'))return;
 S.illustrationBusy=true;S.illustrationStatus='';show();try{
   captureSetup();const chapter=r.chapter,variant=currentIllustrations(r).length+1;
   const recent=(r.visualHistory||[]).slice(-8);const v=await callAI('illustrate',{title:w.title,bible:w.bible,heading:r.current.heading,body:r.current.body.slice(0,2600),illustrationBrief:r.current.illustrationBrief,player:r.player,chapter,variant,style:S.visualStyle,appearance:S.appearance,previous:recent,reference:S.styleReference||''});
   if(!v.image)throw Error('AI가 이미지를 반환하지 않았어.');const key=imageKey(r,chapter,variant);await imagePut(key,v.image);
   if(!r.illustrations)r.illustrations={};if(!r.illustrations[chapter])r.illustrations[chapter]=[];
   r.illustrations[chapter].push({key,caption:r.current.heading,created:new Date().toISOString()});
   r.visualHistory=[...(r.visualHistory||[]),{chapter,variant,heading:r.current.heading,shot:v.shot||'새 구도',prompt:r.current.illustrationBrief.slice(0,160)}].slice(-35);
   persistStudio();S.status=`제${chapter}장 일러스트 ${variant}번 생성 완료.`;
 }finally{S.illustrationBusy=false;show()}}
async function saveImage(key,chapter){const data=await imageGet(key);if(!data){alert('이미지 데이터를 찾지 못했어. 저장 공간이 지워졌을 수 있어.');return}const a=document.createElement('a');a.href='data:image/png;base64,'+data;a.download=`WORLDLINE_${chapter}장_${Date.now()}.png`;document.body.appendChild(a);a.click();a.remove()}
function rewindRun(){const r=S.run;if(!r?.history.length){updateStatus('되돌릴 선택이 없어.');return}const prev=r.history.pop();r.current=prev.scene;r.chapter=prev.chapter;r.choice=r.history.length?r.history[r.history.length-1].choice:'';r.recap=r.history.length?(r.history[r.history.length-1].scene.recap||''):'';persistStudio();show()}
function storyTXT(){const r=S.run;if(!r){alert('진행 중인 이야기가 없어.');return}const w=activeWorld();const a=[`WORLDLINE AI / ${w?.title||''}`,`주인공: ${r.player}`,'',...r.history.flatMap(h=>[`[제${h.chapter}장] ${h.scene.heading}`,h.scene.body,`선택: ${h.choice}`,'']),...(r.current?[`[제${r.chapter}장] ${r.current.heading}`,r.current.body]:[])];download(new Blob([a.join('\n\n')],{type:'text/plain;charset=utf-8'}),'WORLDLINE_AI_이야기.txt')}
function parseChatJSON(input){let data=JSON.parse(input.replace(/```(?:json)?\s*|```/g,'').trim());if(data.bible)data=data.bible;S.bible=normalizeBible(data,S.title||'분석한 세계');S.activeId='';S.tab='knowledge';S.status='ChatGPT 분석 도감을 불러왔어. 수정 후 저장해 줘.';show()}
function chatPrompt(){captureSetup();const b=S.bible||defaultBible(S.title);
 const prompt=`[WORLDLINE 세계관 도감 분석 요청]\n너는 인터랙티브 창작 세계관 분석가다. 다음 작품의 세계관을 정확히 정리해 줘. 만약 이 대화에 TXT/EPUB/PDF 원문 파일을 추가로 첨부했다면 그 자료를 우선으로 읽어. 출처 없이 원문 줄거리를 지어내지 마. 현재 앱에서 자동 복사되는 원문은 일부뿐이므로 원문이 길면 내가 이 대화에 파일을 직접 첨부할 수 있어. 정보 부족·불일치는 unknowns에 넣어 줘. 확실한 원작 설정/2차 자료/나의 추가 설정을 구분해. 원작의 대사나 본문을 길게 재현하지 말고 인물·능력 제약·사건 원인 결과·전개 분기점 등 설정만 구조화해. 가능하면 공개 출처를 확인해 URL을 sources에 기록해.\n\n작품: ${S.title||b.title}\n장르: ${MEDIA_LABEL[S.media]}\n내가 입력한 자료 링크: ${S.links}\n추가 설정 및 바꾸고 싶은 사건: ${S.notes}\n앱에서 복사한 텍본 발췌(전체가 아닐 수 있음): ${S.rawText.slice(0,8500)}\n\n아래 키를 가진 JSON 객체 하나만 반환해.\n{"title":"작품명","summary":"핵심 세계관 및 갈등 요약","setting":"시대/배경/공간","characters":[{"name":"인물명","role":"역할","traits":"성격과 동기","relationships":"관계"}],"rules":["능력·기술·마법 제약"],"timeline":["사건의 시간적 흐름과 인과관계"],"tensions":["갈등 및 복선"],"unknowns":["확인 필요한 점"],"sources":[{"title":"자료명","url":"https://..."}]}`;
 copyBridgeText(prompt,'세계관 분석 요청문을 복사했어. ChatGPT에서 파일을 첨부해 분석하고 JSON 답변을 가져와.');
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
  if(action==='go-settings'){setBibleFromInputs();S.tab='settings';show();return true}
  if(action==='toggle-mode'){S.bridgeMode=!S.bridgeMode;persistStudio();S.status=S.bridgeMode?'ChatGPT 왕복 모드로 바꿨어. 별도 API 호출은 하지 않아.':'자동 API 모드를 선택했어. 서버 연결 및 사용 요금이 필요할 수 있어.';show();return true}
  if(action==='open-chatgpt'){window.open('https://chatgpt.com/','_blank','noopener');return true}
  if(action==='manual-next'){manualNext();return true}
  if(action==='prompt-image'){promptForImage();return true}
  if(action==='importjson'){const input=document.getElementById('wsJSONPaste')?.value?.trim()||'';if(!input){alert('위 칸에 ChatGPT가 반환한 JSON을 먼저 붙여 넣어 줘.');return true}try{parseChatJSON(input)}catch{alert('JSON 형식이 올바르지 않아. 코드블록 대신 JSON 전체를 복사해 줘.')}return true}
  if(action==='start'){captureSetup();withBusy(beginRun);return true}
  if(action==='next'){withBusy(generateScene);return true}
  
  if(action==='freechoice'){const c=document.getElementById('wsFreeChoice')?.value.trim();if(!c){alert('할 행동을 입력해 줘.');return true}withBusy(()=>chooseRun(c.slice(0,2000)));return true}
 if(action==='illustrate'){withBusy(illustrateScene);return true}
 if(action==='save-image'){saveImage(b.dataset.key,Number(b.dataset.chapter)||1);return true}
 if(action==='save-style'){captureSetup();persistStudio();S.status='일러스트 취향을 저장했어.';show();return true}
 if(action==='clear-style'){S.styleReference='';S.styleInfo='참조 이미지를 삭제했어.';persistStudio();show();return true}
 if(action==='prompt-scene'){promptForManualScene();return true}
 if(action==='import-scene'){const raw=document.getElementById('wsScenePaste')?.value?.trim();if(!raw){alert('생성한 장면의 JSON을 붙여 넣어 줘.');return true}try{const result=normalizeScene(JSON.parse(raw.replace(/```(?:json)?\s*|```/g,'')));if(!S.run)throw Error('먼저 이야기를 시작해 줘.');S.run.current=result;S.run.recap=result.recap||S.run.recap;S.run.continuity=[...new Set([...(S.run.continuity||[]),...result.consequences,...result.unresolved,...result.characterState])].slice(-35);persistStudio();S.status='ChatGPT 생성 장면을 적용했어.';show()}catch(ex){alert('JSON을 읽지 못했어: '+ex.message)}return true}
  if(action==='rewind'){rewindRun();return true}
  if(action==='restart'){if(confirm('현재 AI 스토리 기록을 초기화할까?')){S.run=null;persistStudio();show()}return true}
  if(action==='export-story'){storyTXT();return true}
  return false;
}
function onChange(e){if(e.target.id==='wsIllustrationImport'){importIllustration(e.target.files?.[0]).catch(errorNotice);return true}if(e.target.id==='studioFiles'){filesChanged(e.target.files);return true}if(e.target.id==='wsStyleFile'){styleFileChanged(e.target.files?.[0]).catch(errorNotice);return true}return false}
window.WorldlineStudio={render,onClick,onChange,open(){state.screen='studio';S.tab=S.run?'play':'build';show()},get state(){return S}};
if(state.screen==='studio')show();
})();
