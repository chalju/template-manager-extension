from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# 팀 스키마
class TeamBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class TeamCreate(TeamBase):
    pass

class TeamUpdate(TeamBase):
    name: Optional[str] = Field(None, min_length=2, max_length=100)

class TeamMemberBase(BaseModel):
    role: str = Field(..., pattern="^(admin|editor|viewer)$")
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ["admin", "editor", "viewer"]:
            raise ValueError("역할은 'admin', 'editor', 'viewer' 중 하나여야 합니다.")
        return v

class TeamMemberCreate(TeamMemberBase):
    user_id: str

class TeamMemberUpdate(TeamMemberBase):
    pass

class TeamInvitationBase(BaseModel):
    email: EmailStr
    role: str = Field(..., pattern="^(admin|editor|viewer)$")
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ["admin", "editor", "viewer"]:
            raise ValueError("역할은 'admin', 'editor', 'viewer' 중 하나여야 합니다.")
        return v

class TeamInvitationCreate(TeamInvitationBase):
    pass

class TeamTemplateBase(BaseModel):
    permissions: str = Field(..., pattern="^(read-only|editable)$")
    
    @validator('permissions')
    def validate_permissions(cls, v):
        if v not in ["read-only", "editable"]:
            raise ValueError("권한은 'read-only' 또는 'editable'이어야 합니다.")
        return v

class TeamTemplateCreate(TeamTemplateBase):
    template_id: str

class TeamTemplateUpdate(TeamTemplateBase):
    pass

# 응답 모델
class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    
    class Config:
        from_attributes = True

class TemplateInfo(BaseModel):
    id: str
    title: str
    keyword: str
    category: Optional[str] = None
    usage_count: int
    
    class Config:
        from_attributes = True

class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    role: str
    joined_at: datetime
    user: Optional[UserInfo] = None
    
    class Config:
        from_attributes = True

class TeamTemplateResponse(BaseModel):
    id: str
    team_id: str
    template_id: str
    shared_by: str
    permissions: str
    shared_at: datetime
    template: Optional[TemplateInfo] = None
    
    class Config:
        from_attributes = True

class TeamInvitationResponse(BaseModel):
    id: str
    team_id: str
    email: str
    role: str
    invited_by: str
    expires_at: datetime
    created_at: datetime
    invitation_link: Optional[str] = None
    
    class Config:
        from_attributes = True

class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members: Optional[List[TeamMemberResponse]] = None
    shared_templates: Optional[List[TeamTemplateResponse]] = None
    
    class Config:
        from_attributes = True 