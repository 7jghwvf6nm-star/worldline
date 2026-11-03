WORLDLINE — 이야기를 다시 쓰다 (웹앱 1.0)

[기능]
- 원작과 무관한 오리지널 세계 4개: 소설, 애니, 게임, 드라마
- 세계별 5장 / 각 장 선택지 3개 / 결말 4종
- 이전 선택으로 되돌리기, 진행상태 브라우저 저장
- 세계관 직접 만들기, JSON 백업/복원, 이야기 기록 TXT 저장
- 인터넷 연결이나 계정 없이 콘텐츠 자체 작동

[아이패드에서 사용]
방법 1. 단일 HTML: Worldline_선택형_스토리앱.html 파일을 Safari에서 열어 사용합니다. 일부 iPadOS 버전의 파일 앱은 HTML을 미리보기만 할 수 있으므로 이 경우 방법 2를 사용하세요.
방법 2. 웹앱으로 홈 화면에 설치: 압축을 풀어 나온 Worldline_App 폴더의 index.html, manifest.webmanifest, sw.js, icon 파일을 HTTPS 정적 호스팅(GitHub Pages/Netlify 등)에 올리고 Safari로 접속합니다. Safari 공유 메뉴의 '홈 화면에 추가'를 선택하면 일반 앱처럼 열 수 있습니다. HTTPS에서 서비스 워커가 등록되면 방문 이후 오프라인에도 접근할 수 있습니다.

[정적 웹 호스팅 예: GitHub Pages]
1. GitHub에서 새 공개 저장소를 만듭니다.
2. 이 폴더 안의 index.html, manifest.webmanifest, sw.js, icon-192.png, icon-512.png 파일을 저장소 최상위에 업로드합니다. (미리보기 PNG와 설명 문서는 필수 아님)
3. 저장소 Settings → Pages에서 'Deploy from a branch'를 선택하고 main, /(root)를 지정합니다.
4. 배포된 HTTPS 주소를 Safari에서 열고 공유 → '홈 화면에 추가'를 누릅니다.

[주의]
이 앱은 AI 기반 무한 생성기가 아니라 분기형 텍스트 게임 엔진입니다. 상업 작품의 스토리를 자동으로 수집하거나 원작을 정확히 재현하지 않습니다. 사용자 이름/장소/동료/사건으로 맞춤형 분기 이야기를 생성하는 기능은 내장되어 있습니다.
저장 데이터는 현재 브라우저의 localStorage에 저장되므로 브라우저 데이터를 삭제하면 지워질 수 있습니다. 중요한 기록은 내 서재 → JSON 백업으로 보관하세요.
