from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.auth.jwt import get_current_user
from app.services.clova import clova_service, ClovaAPIException
from app.database.client import db

router = APIRouter()

# 예측 요청 스키마
class PredictionRequest(BaseModel):
    context: str = Field(..., description="현재 작성 중인 텍스트 컨텍스트", min_length=1)
    keyword: Optional[str] = Field(None, description="템플릿을 위한 키워드")
    domain: Optional[str] = Field(None, description="컨텍스트의 도메인 (예: 이메일, 메모, 보고서)")
    max_tokens: Optional[int] = Field(100, description="최대 생성 토큰 수", ge=1, le=500)

# 예측 응답 스키마
class PredictionResponse(BaseModel):
    generated_text: str
    context: str
    keyword: Optional[str] = None
    template_id: Optional[str] = None
    is_template: bool = False

# 템플릿 예측 응답 스키마
class TemplateMatchResponse(BaseModel):
    templates: List[Dict[str, Any]]
    keyword: str

@router.post("/predict", response_model=PredictionResponse)
async def predict_text(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """CLOVA API를 사용하여 현재 컨텍스트에 기반한 다음 텍스트를 예측합니다."""
    try:
        # CLOVA API 호출
        result = await clova_service.generate_text_completion(
            context=request.context,
            keyword=request.keyword,
            max_tokens=request.max_tokens
        )
        
        # 사용 이력 저장 (백그라운드 작업)
        background_tasks.add_task(
            save_usage_history,
            user_id=current_user.id,
            context=request.context,
            generated_text=result["generated_text"],
            domain=request.domain
        )
        
        # 응답 반환
        return {
            "generated_text": result["generated_text"],
            "context": request.context,
            "keyword": request.keyword,
            "is_template": False
        }
        
    except ClovaAPIException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.detail
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"텍스트 예측 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/match-templates", response_model=TemplateMatchResponse)
async def match_templates(
    keyword: str,
    limit: int = 5,
    current_user = Depends(get_current_user)
):
    """주어진 키워드에 맞는 템플릿을 검색합니다."""
    try:
        # 사용자의 템플릿과 공유된 템플릿 검색
        templates = await db.template.find_many(
            where={
                "OR": [
                    {"user_id": current_user.id},
                    {"is_shared": True}
                ],
                "keyword": {"contains": keyword, "mode": "insensitive"}
            },
            take=limit,
            order={"usage_count": "desc"}
        )
        
        # 템플릿 정보 변환
        result = [
            {
                "id": template.id,
                "title": template.title,
                "content": template.content,
                "keyword": template.keyword,
                "usage_count": template.usage_count,
                "is_owned": template.user_id == current_user.id
            }
            for template in templates
        ]
        
        return {
            "templates": result,
            "keyword": keyword
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 검색 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/select-template/{template_id}", response_model=PredictionResponse)
async def select_template(
    template_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """사용자가 템플릿을 선택했을 때 호출됩니다."""
    try:
        # 템플릿 조회
        template = await db.template.find_unique(
            where={"id": template_id}
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="템플릿을 찾을 수 없습니다."
            )
        
        # 소유자 또는 공유된 템플릿인지 확인
        if template.user_id != current_user.id and not template.is_shared:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 템플릿에 접근할 권한이 없습니다."
            )
        
        # 템플릿 사용 횟수 증가 (백그라운드 작업)
        background_tasks.add_task(
            increment_template_usage,
            template_id=template.id
        )
        
        # 사용 이력 저장 (백그라운드 작업)
        background_tasks.add_task(
            save_usage_history,
            user_id=current_user.id,
            context="",  # 템플릿 선택은 컨텍스트 없이 사용됨
            generated_text=template.content,
            template_id=template.id,
            selected=True
        )
        
        # 응답 반환
        return {
            "generated_text": template.content,
            "context": "",
            "keyword": template.keyword,
            "template_id": template.id,
            "is_template": True
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 선택 중 오류가 발생했습니다: {str(e)}"
        )

# 백그라운드 작업 함수들
async def save_usage_history(
    user_id: str,
    context: str,
    generated_text: str,
    template_id: Optional[str] = None,
    domain: Optional[str] = None,
    selected: bool = False
):
    """사용 이력을 저장합니다."""
    try:
        await db.usagehistory.create(
            data={
                "user_id": user_id,
                "template_id": template_id,
                "context": context,
                "generated_text": generated_text,
                "domain": domain,
                "selected": selected
            }
        )
    except Exception as e:
        print(f"사용 이력 저장 중 오류 발생: {str(e)}")

async def increment_template_usage(template_id: str):
    """템플릿 사용 횟수를 증가시킵니다."""
    try:
        template = await db.template.find_unique(
            where={"id": template_id}
        )
        
        if template:
            await db.template.update(
                where={"id": template_id},
                data={"usage_count": template.usage_count + 1}
            )
    except Exception as e:
        print(f"템플릿 사용 횟수 업데이트 중 오류 발생: {str(e)}") 