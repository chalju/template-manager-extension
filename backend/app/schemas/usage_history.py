from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UsageHistoryBase(BaseModel):
    """기본 사용 이력 속성"""
    context: str
    generated_text: str
    selected: bool = False
    domain: Optional[str] = None

class UsageHistoryCreate(UsageHistoryBase):
    """사용 이력 생성 스키마"""
    user_id: str
    template_id: Optional[str] = None

class UsageHistoryUpdate(BaseModel):
    """사용 이력 업데이트 스키마"""
    selected: Optional[bool] = None

class UsageHistoryResponse(UsageHistoryBase):
    """사용 이력 응답 스키마"""
    id: str
    user_id: str
    template_id: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True 