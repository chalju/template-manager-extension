from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database.client import initialize_db, close_db
from app.routes.api import api_router
from app.api_docs import api_metadata, tags_metadata
from config import CORS_ORIGINS

# FastAPI 앱 인스턴스 생성 (API 문서 설정 적용)
app = FastAPI(
    title=api_metadata["title"],
    description=api_metadata["description"],
    version=api_metadata["version"],
    contact=api_metadata["contact"],
    license_info=api_metadata["license_info"],
    openapi_tags=tags_metadata,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router)

# 이벤트 핸들러 등록
@app.on_event("startup")
async def startup():
    await initialize_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# 루트 라우트
@app.get("/")
async def root():
    return {
        "message": "AI 문장 자동완성 어시스턴트 API에 오신 것을 환영합니다!",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }

# 애플리케이션 실행 (직접 실행할 경우)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 