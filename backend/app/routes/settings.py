from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdate
from app.auth.jwt import get_current_user
from app.database.client import db

router = APIRouter()

@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(current_user = Depends(get_current_user)):
    """현재 인증된 사용자의 설정을 조회합니다."""
    settings = await db.usersettings.find_unique(
        where={"user_id": current_user.id}
    )
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 설정을 찾을 수 없습니다."
        )
    
    return settings

@router.put("/", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_data: UserSettingsUpdate, 
    current_user = Depends(get_current_user)
):
    """현재 인증된 사용자의 설정을 업데이트합니다."""
    # 현재 설정 조회
    current_settings = await db.usersettings.find_unique(
        where={"user_id": current_user.id}
    )
    
    if not current_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 설정을 찾을 수 없습니다."
        )
    
    # 업데이트할 데이터 필터링 (None 값은 제외)
    update_data = {k: v for k, v in settings_data.model_dump(exclude_unset=True).items() if v is not None}
    
    # 설정 업데이트
    updated_settings = await db.usersettings.update(
        where={"id": current_settings.id},
        data=update_data
    )
    
    return updated_settings

@router.post("/reset", response_model=UserSettingsResponse)
async def reset_user_settings(current_user = Depends(get_current_user)):
    """사용자 설정을 기본값으로 재설정합니다."""
    # 현재 설정 조회
    current_settings = await db.usersettings.find_unique(
        where={"user_id": current_user.id}
    )
    
    if not current_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 설정을 찾을 수 없습니다."
        )
    
    # 기본 설정으로 재설정
    reset_settings = await db.usersettings.update(
        where={"id": current_settings.id},
        data={
            "enable_suggestions": True,
            "suggestion_frequency": "medium",
            "enable_history": True,
            "domains": []
        }
    )
    
    return reset_settings 