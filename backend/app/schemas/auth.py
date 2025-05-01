from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class Token(BaseModel):
    """JWT 토큰 스키마"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """JWT 토큰 데이터 스키마"""
    user_id: str
    role: Optional[str] = None
    permissions: List[str] = []

class RefreshTokenRequest(BaseModel):
    """리프레시 토큰 요청 스키마"""
    refresh_token: str

class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    """비밀번호 변경 요청 스키마"""
    current_password: str
    new_password: str = Field(..., min_length=8, description="8자 이상의 비밀번호")

class RoleCreate(BaseModel):
    """역할 생성 스키마"""
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleResponse(BaseModel):
    """역할 응답 스키마"""
    id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class PermissionCreate(BaseModel):
    """권한 생성 스키마"""
    name: str
    description: Optional[str] = None

class PermissionResponse(BaseModel):
    """권한 응답 스키마"""
    id: str
    name: str
    description: Optional[str] = None 