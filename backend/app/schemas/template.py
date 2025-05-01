from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TemplateBase(BaseModel):
    """템플릿 기본 스키마"""
    name: str = Field(..., description="Template name (required)")
    title: Optional[str] = Field(None, description="Template title (optional, defaults to name)")
    content: str = Field(..., description="Template content")
    shortcut: Optional[str] = Field(None, description="Template shortcut")
    categories: Optional[List[str]] = Field(default_factory=list, description="Template categories")
    
class TemplateCreate(TemplateBase):
    """템플릿 생성 스키마"""
    user_id: Optional[str] = None

class TemplateUpdate(BaseModel):
    """템플릿 업데이트 스키마"""
    name: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    shortcut: Optional[str] = None

class TemplateResponse(TemplateBase):
    """템플릿 응답 스키마"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    categories: Optional[List[str]] = []
    
    class Config:
        from_attributes = True  # ORM 모델과 호환

class TemplateSearchResponse(BaseModel):
    """템플릿 검색 응답 스키마"""
    templates: List[TemplateResponse]

class TemplateVersion(BaseModel):
    """템플릿 버전 스키마"""
    version_id: str
    content: str
    version_note: Optional[str] = None
    created_at: datetime

class TemplateVersionResponse(BaseModel):
    """템플릿 버전 응답 스키마"""
    template_id: str
    versions: List[TemplateVersion]

class TemplateSearchParams(BaseModel):
    """템플릿 검색 파라미터 스키마"""
    keyword: Optional[str] = None
    title_contains: Optional[str] = None
    content_contains: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    is_shared: Optional[bool] = None
    min_usage_count: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

class TemplateVersionBase(BaseModel):
    """템플릿 버전 기본 스키마"""
    version_number: int
    content: str
    version_note: Optional[str] = None

class TemplateVersionCreate(TemplateVersionBase):
    """템플릿 버전 생성 스키마"""
    template_id: str

class TemplateVersionListResponse(BaseModel):
    """템플릿 버전 목록 응답 스키마"""
    versions: List[TemplateVersionResponse] 