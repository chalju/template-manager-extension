# AI 문장 자동완성 어시스턴트 - 백엔드

브라우저 확장 기반 AI 문장 자동완성 어시스턴트의 백엔드 API 서버입니다.

## 기술 스택

- FastAPI (Python 웹 프레임워크)
- Prisma (Python ORM)
- PostgreSQL (데이터베이스)
- JWT (인증)
- CLOVA Studio HCX-005 (AI 모델)

## 설치 방법

### 1. 가상 환경 설정

```bash
# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화 (Windows)
venv\Scripts\activate

# 가상 환경 활성화 (macOS/Linux)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_assistant_db"

# Authentication
SECRET_KEY="your-secret-key-here"
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CLOVA API
CLOVA_API_KEY="your-clova-api-key"
CLOVA_API_ENDPOINT="https://api.clova.ai/hcx-005/api-path"
```

### 3. Prisma 설정

```bash
# Node.js 종속성 설치
npm install

# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션
npm run prisma:migrate
```

또는 제공된 스크립트 사용:

```bash
# 실행 권한 부여
chmod +x scripts/generate_prisma_client.sh scripts/migrate.sh

# 마이그레이션 실행
./scripts/migrate.sh "init"
```

## 실행 방법

```bash
# 개발 서버 실행
uvicorn main:app --reload
```

서버가 기본적으로 http://localhost:8000 에서 실행됩니다.

## API 문서

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 데이터베이스 관리

Prisma Studio를 사용하여 데이터베이스를 시각적으로 관리할 수 있습니다:

```bash
npm run prisma:studio
```

Prisma Studio가 http://localhost:5555 에서 실행됩니다. 