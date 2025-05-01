from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SuggestionFrequency(str, Enum):
    """추천 빈도 열거형"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class UserSettingsBase(BaseModel):
    """기본 사용자 설정 속성"""
    enable_suggestions: bool = True
    suggestion_frequency: SuggestionFrequency = SuggestionFrequency.MEDIUM
    enable_history: bool = True
    domains: List[str] = []

class UserSettingsCreate(UserSettingsBase):
    """사용자 설정 생성 스키마"""
    pass

class UserSettingsUpdate(BaseModel):
    """사용자 설정 업데이트 스키마"""
    enable_suggestions: Optional[bool] = None
    suggestion_frequency: Optional[SuggestionFrequency] = None
    enable_history: Optional[bool] = None
    domains: Optional[List[str]] = None

class UserSettingsResponse(UserSettingsBase):
    """사용자 설정 응답 스키마"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 