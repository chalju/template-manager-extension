from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserResponse, UserUpdate
from app.auth.jwt import get_current_user
from app.database.client import db
from typing import Optional

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """현재 인증된 사용자 정보를 조회합니다."""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_user_info(user_data: UserUpdate, current_user = Depends(get_current_user)):
    """현재 인증된 사용자 정보를 업데이트합니다."""
    # 업데이트할 데이터 필터링 (None 값은 제외)
    update_data = {k: v for k, v in user_data.model_dump(exclude_unset=True).items() if v is not None}
    
    # 비밀번호가 있으면 별도로 처리 (직접 변경 금지)
    if "password" in update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호 변경은 /auth/change-password 엔드포인트를 사용하세요."
        )
    
    # 이메일 변경 시 중복 확인
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_user = await db.user.find_unique(
            where={"email": update_data["email"]}
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 이메일입니다."
            )
    
    # 사용자 정보 업데이트
    updated_user = await db.user.update(
        where={"id": current_user.id},
        data=update_data
    )
    
    return updated_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(current_user = Depends(get_current_user)):
    """현재 인증된 사용자 계정을 삭제합니다."""
    await db.user.delete(
        where={"id": current_user.id}
    )
    
    return None 