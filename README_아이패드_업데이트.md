# WORLDLINE 2.0 — 아이패드 웹앱 업데이트

## 1. 기존 worldline 저장소에 새 파일을 올리기 (새 저장소 만들지 않기)

이미 만들었던 저장소:
https://github.com/7jghwvf6nm-star/worldline

1. Safari에서 위 저장소를 엽니다. 필요하면 **데스크탑 웹 사이트 요청**을 켭니다.
2. ZIP 파일을 **파일 앱에서 압축 해제**합니다. `index.html`이 보이는 폴더로 이동합니다.
3. GitHub 저장소의 **Code** 탭에서 `Go to file` 옆의 작은 **+** 버튼 → **Upload files**를 누릅니다.
4. 압축을 푼 파일을 선택합니다. `index.html`, `studio.js`, `studio.css`, `jszip.min.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`를 **저장소 최상위**에 올립니다. `index.html`이 `README.md` 바로 옆에 있어야 합니다.
5. **Commit changes**를 누릅니다. 변경 파일을 올렸다고 새 Repository를 만들 필요는 없습니다.
6. https://7jghwvf6nm-star.github.io/worldline/ 에 접속합니다. Pages가 이미 설정돼 있다면 다시 설정하지 않아도 됩니다. 기존 화면만 계속 나오면 Safari 탭을 새로 열고 새로고침하거나 홈 화면 앱을 종료했다 열어 보세요.

## 2. AI 서버 연결 전에 바로 사용할 수 있는 기능

* WORLDLINE → **AI 세계관 스튜디오** → **① 자료 준비**
* 텍본 파일(TXT, MD, HTML, EPUB, JSON)을 올려서 아이패드에서 텍스트를 읽습니다.
* 작품명, 직접 작성한 인물·규칙·사건, 참고 링크를 적습니다.
* **직접 입력으로 도감 만들기**를 누르면 세계관 편집 화면으로 이동합니다.
* **② 세계관 도감**에서 인물·사건·갈등을 정리하고 저장할 수 있습니다.
* **③ AI 스토리**에서 직접 행동을 선택하고 기록을 되돌릴 수 있습니다.

이 상태에서는 자동 의미 분석이나 실시간 창작은 작동하지 않습니다. AI 서버가 없는 경우의 이야기 생성은 오프라인 템플릿이며, 자료를 읽어 인물·사건을 자동 파악했다고 주장하지 않습니다.

## 3. ChatGPT에서 세계관 분석하고 결과 가져오기 (서버 설정 없이)

1. 세계관 스튜디오에서 작품명과 텍본 또는 메모를 입력합니다.
2. **④ AI 연결**에서 **ChatGPT 요청문 복사**를 누릅니다.
3. ChatGPT에 붙여넣어 세계관 분석 JSON을 받습니다. 복사된 텍본은 길이에 따라 일부만 포함될 수 있습니다.
4. 같은 화면의 **ChatGPT가 만든 JSON 붙여넣기** 칸에 결과를 붙여넣고 **분석 JSON 가져오기**를 누릅니다.
5. 도감에서 오류를 수정한 다음 저장하고 스토리를 시작합니다.

이 방법은 ChatGPT 웹페이지에서 분석을 요청하는 수동 연동입니다. 파일 업로드 후 자동으로 분석하고, 자유 선택에 따라 매번 새로운 장면을 생성하려면 아래 API 연결이 필요합니다.

## 4. 자동 AI 분석/웹 세계관 조사/실시간 선택형 전개 설정 (고급)

**중요:** ChatGPT 앱의 구독과 OpenAI API는 별도입니다. API 이용에는 자체 API 설정과 사용량에 따른 요금이 필요할 수 있습니다. GitHub Pages에 `OPENAI_API_KEY`를 올리지 마세요.

Cloudflare Worker를 이용하면 아이패드만으로도 보안 중계 서버를 배포할 수 있습니다.

1. https://dash.cloudflare.com/ 에 로그인하고 **Workers & Pages → Create**에서 새 Worker를 만듭니다. 대시보드의 편집 메뉴에서 **Edit code**를 선택합니다.
2. 별도 서버 설정 파일인 `ai-worker/worker.js` 코드를 복사해 Worker 편집기에 붙여 넣고 Deploy 합니다.
3. Worker의 Settings → Variables and Secrets에서 다음 값을 설정합니다.
   - `OPENAI_API_KEY` (Secret) : OpenAI API에서 발급한 키. **공개 GitHub 저장소나 앱 HTML에 절대 입력하지 않습니다.**
   - `APP_ACCESS_TOKEN` (Secret) : 본인이 만든 **길고 추측하기 어려운 임의의 암호** (OpenAI 키와 별도). 개인 접속을 제한하기 위한 인증입니다.
   - `ALLOWED_ORIGIN` (일반 변수): `https://7jghwvf6nm-star.github.io`
   - `OPENAI_MODEL` (선택 변수): `gpt-5.4-mini`
4. Worker를 다시 배포하고 `https://<워커주소>.workers.dev/health`에 접속했을 때 `configured: true`인지 확인합니다.
5. WORLDLINE → AI 세계관 스튜디오 → **④ AI 연결**에서 Worker 주소와 `APP_ACCESS_TOKEN`을 입력하고 **연결 설정 저장**을 누릅니다.
6. **① 자료 준비 → 텍본 AI 분석** 또는 **작품명으로 웹 자료 조사** 버튼을 이용할 수 있습니다. 
7. 도감을 검토하고 저장한 다음 **③ AI 스토리**에서 선택하거나 자유 행동을 입력하면 새 장면을 생성합니다.

API 호출: 텍본은 구간당 약 16,000자씩 순차 요약해 핵심 설정을 누적합니다. 54만 글자까지 자동 분석하며 그보다 긴 문서는 일부만 분석한 사실을 표시합니다. 여러 번 호출하므로 비용이 늘 수 있습니다. 웹 자료 조사에서 위키나 나무위키를 참고할 수 있지만 접근/검증되지 않는 내용을 사실처럼 취급하지 않도록 설계했습니다. **참고 링크**는 실제 내용을 읽었음을 보장하지 않습니다.

## 5. 개인정보와 저작물 관련

- 파일은 브라우저에서 먼저 읽습니다. **AI 분석 버튼을 누르면** 입력 자료의 일부 또는 전체가 설정한 Worker와 OpenAI API에 전송됩니다.
- 원문 텍본은 WORLDLINE의 GitHub 저장소에 자동 업로드되지 않습니다. 공유할 권한이 없는 원문 텍본을 GitHub에 게시하지 마세요.
- 이 웹앱은 상업 작품의 원문이나 장면을 통째로 재현하지 않고, 세계관을 참고해 새로운 외전/갈림길 이야기를 생성하도록 요청합니다.
- 저장한 세계관과 선택 기록은 브라우저 `localStorage`에 저장됩니다. 브라우저 데이터를 삭제하면 사라질 수 있습니다.
- 모델의 추론은 틀릴 수 있으므로 세계관 도감의 인물, 규칙, 사건을 꼭 검토하세요.

## 6. 기술적인 한계

- 현재 파일은 정적 웹앱 + 선택적으로 설치하는 Worker 코드입니다. Worker 미설치 시 자동 AI 분석/웹 검색/AI 생성은 사용할 수 없습니다.
- 이 작업 환경에서 iPad 실기기 테스트나 실제 OpenAI API 호출은 하지 않았습니다. 브라우저 오프라인 흐름 및 모의 API 테스트 결과는 별도로 안내합니다.
- 한 작품 텍본이 매우 길면 용량 제한과 API 비용 때문에 나누어 읽어야 합니다.
- EPUB은 암호화되지 않은 일반 EPUB이어야 합니다. DRM이 적용된 파일은 지원하지 않습니다.

## 7. 원본 앱 기능 보존

기존 `세계 탐험`, 4종 기본 세계, 사용자 세계 만들기, `내 서재`, 분기형 기본 스토리 등의 UI/코드는 유지했습니다. 새 AI 스튜디오는 별도 탭입니다.

---

AI Worker 공식 가이드: https://developers.cloudflare.com/workers/get-started/dashboard/
OpenAI Responses API: https://developers.openai.com/api/docs/guides/tools-web-search
OpenAI JSON schema outputs: https://developers.openai.com/api/docs/guides/structured-outputs
