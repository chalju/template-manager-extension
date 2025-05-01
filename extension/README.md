# AI 문장 자동완성 어시스턴트 크롬 확장 프로그램

웹 기반 CRM 시스템과 기타 웹사이트에서 비즈니스 문장을 자동 완성하거나 추천해주는 크롬 확장 프로그램입니다. NAVER CLOVA HCX-005 모델을 활용하여 고품질 텍스트 예측을 제공합니다.

## 주요 기능

- 텍스트 입력 필드에서 문장 자동 완성
- 사용자 정의 템플릿 관리
- 자주 사용하는 표현 학습
- 웹사이트별 설정 관리
- 개인 및 팀 템플릿 공유

## 개발 환경 설정

### 필수 요구사항

- [Node.js](https://nodejs.org/) 14.0.0 이상
- [npm](https://www.npmjs.com/) 6.0.0 이상
- [Chrome](https://www.google.com/chrome/) 브라우저

### 설치 방법

1. 저장소 복제
   ```bash
   git clone https://github.com/yourusername/ai-sentence-assistant.git
   cd ai-sentence-assistant/extension
   ```

2. 의존성 설치
   ```bash
   npm install
   ```

3. 개발 모드로 실행
   ```bash
   npm run dev
   ```

4. 확장 프로그램 빌드
   ```bash
   npm run build
   ```

### 크롬에 확장 프로그램 로드하기

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 개발자 모드 활성화 (오른쪽 상단)
3. "압축해제된 확장 프로그램을 로드합니다" 버튼 클릭
4. `dist` 폴더 선택

## 프로젝트 구조

```
extension/
├── dist/                # 빌드 출력 디렉토리
├── src/                 # 소스 코드
│   ├── background/      # 백그라운드 스크립트
│   ├── content/         # 콘텐츠 스크립트
│   ├── popup/           # 팝업 UI
│   ├── options/         # 옵션 페이지
│   ├── utils/           # 유틸리티 함수
│   ├── assets/          # 에셋 (이미지 등)
│   └── icons/           # 확장 프로그램 아이콘
├── manifest.json        # 확장 프로그램 매니페스트
├── package.json         # npm 패키지 정보
├── tsconfig.json        # TypeScript 구성
└── webpack.config.js    # Webpack 구성
```

## 구성 요소

### 백그라운드 스크립트

백그라운드 스크립트는 확장 프로그램의 상태를 관리하고 API 통신을 처리합니다.

```typescript
// background/index.ts
// 백엔드 API 통신 및 상태 관리
```

### 콘텐츠 스크립트

콘텐츠 스크립트는 웹 페이지 내 텍스트 입력 필드를 탐지하고 사용자 입력을 모니터링하여 자동완성 기능을 제공합니다.

```typescript
// content/index.ts
// 텍스트 입력 감지 및 자동완성 제안
```

### 팝업 UI

팝업 UI는 사용자가 확장 프로그램의 기본 기능에 접근할 수 있는 인터페이스를 제공합니다.

```typescript
// popup/index.tsx
// 사용자 인터페이스 및 기본 설정
```

### 옵션 페이지

옵션 페이지는 고급 설정 및 템플릿 관리를 위한 인터페이스를 제공합니다.

```typescript
// options/index.tsx
// 고급 설정 및 템플릿 관리
```

## 백엔드 API

확장 프로그램은 다음 엔드포인트를 사용하여 백엔드와 통신합니다:

- `POST /api/auth/login`: 사용자 로그인
- `POST /api/auth/register`: 사용자 등록
- `GET /api/users/me`: 현재 사용자 정보 조회
- `GET /api/settings/`: 사용자 설정 조회
- `PUT /api/settings/`: 사용자 설정 업데이트
- `GET /api/templates/`: 템플릿 목록 조회
- `POST /api/templates/`: 새 템플릿 추가
- `PUT /api/templates/{id}`: 템플릿 수정
- `DELETE /api/templates/{id}`: 템플릿 삭제
- `GET /api/templates/search`: 키워드로 템플릿 검색
- `POST /api/predict/complete`: 텍스트 자동완성 예측

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 