from fastapi import APIRouter, Depends
from app.routes import auth, templates, settings, users, usage_history, prediction
from app.auth.jwt import get_current_user
from fastapi.responses import JSONResponse

# API 라우터
api_router = APIRouter(prefix="/api")

# 하위 라우터 포함
api_router.include_router(
    auth.router, 
    prefix="/auth", 
    tags=["Authentication & Authorization"],
    responses={401: {"description": "인증 실패"}}
)
api_router.include_router(
    users.router, 
    prefix="/users", 
    tags=["Users"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "인증되지 않은 사용자"}}
)
api_router.include_router(
    settings.router, 
    prefix="/settings", 
    tags=["Settings"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "인증되지 않은 사용자"}}
)
api_router.include_router(
    templates.router, 
    prefix="/templates", 
    tags=["Templates"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "인증되지 않은 사용자"}}
)
api_router.include_router(
    usage_history.router, 
    prefix="/usage-history", 
    tags=["Usage History"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "인증되지 않은 사용자"}}
)
api_router.include_router(
    prediction.router, 
    prefix="/predict", 
    tags=["Text Prediction"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "인증되지 않은 사용자"}}
)

@api_router.get("/health")
def health_check():
    """API 서버 상태 확인 엔드포인트"""
    return JSONResponse({"status": "healthy", "message": "API 서버가 정상적으로 실행 중입니다."}) 