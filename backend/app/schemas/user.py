from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    """사용자 기본 스키마"""
    email: EmailStr
    name: str

class UserCreate(UserBase):
    """사용자 생성 스키마"""
    password: str = Field(..., min_length=8, description="8자 이상의 비밀번호")

class UserUpdate(BaseModel):
    """사용자 업데이트 스키마"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    """사용자 응답 스키마"""
    id: str
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # ORM 모델과 호환
    
class UserWithRole(UserResponse):
    """역할 정보를 포함한 사용자 응답 스키마"""
    permissions: List[str] = []

class UserRoleUpdate(BaseModel):
    """사용자 역할 업데이트 스키마"""
    role_id: str 