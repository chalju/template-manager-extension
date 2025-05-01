from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import Token, LoginRequest, ChangePasswordRequest, RefreshTokenRequest
from app.schemas.auth import RoleCreate, RoleResponse, PermissionCreate, PermissionResponse
from app.schemas.user import UserCreate, UserResponse, UserRoleUpdate
from app.auth.jwt import (
    create_access_token, create_refresh_token, get_password_hash, 
    verify_password, get_current_user, get_admin_user
)
from app.database.client import db
from datetime import datetime, timedelta
from config import (
    ACCESS_TOKEN_EXPIRE_MINUTES, GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
)
from typing import List
import httpx
import json

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """새 사용자를 등록합니다."""
    # 이메일 중복 확인
    existing_user = await db.user.find_unique(
        where={"email": user_data.email}
    )
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )
    
    # 비밀번호 해싱
    hashed_password = get_password_hash(user_data.password)
    
    # 기본 역할 검색 (없으면 사용자 역할)
    default_role = await db.role.find_first(
        where={"name": "user"}
    )
    
    if not default_role:
        # 기본 역할 생성
        default_role = await db.role.create(
            data={
                "name": "user",
                "description": "기본 사용자 역할"
            }
        )
    
    # 사용자 생성
    new_user = await db.user.create(
        data={
            "email": user_data.email,
            "name": user_data.name,
            "password_hash": hashed_password,
            "role_id": default_role.id
        }
    )
    
    # 기본 사용자 설정 생성
    await db.usersettings.create(
        data={
            "user_id": new_user.id,
            "enable_suggestions": True,
            "suggestion_frequency": "medium",
            "enable_history": True,
            "domains": []
        }
    )
    
    # 응답에서 비밀번호 제외
    return new_user

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """사용자 로그인 및 액세스 토큰 발급"""
    # 사용자 조회
    user = await db.user.find_unique(
        where={"email": login_data.email},
        include={"role": {"include": {"permissions": True}}}
    )
    
    # 사용자가 존재하지 않거나 비밀번호가 일치하지 않는 경우
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 일치하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 액세스 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 권한 목록 추출
    permissions = []
    if user.role and user.role.permissions:
        permissions = [p.name for p in user.role.permissions]
    
    token_data = {
        "sub": user.id,
        "role": user.role.name if user.role else None,
        "permissions": permissions
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    # 리프레시 토큰 생성
    refresh_token = await create_refresh_token(user.id)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: RefreshTokenRequest):
    """리프레시 토큰을 사용하여 새 액세스 토큰 발급"""
    # 데이터베이스에서 리프레시 토큰 조회
    refresh_token = await db.refreshtoken.find_unique(
        where={"token": token_data.refresh_token}
    )
    
    if not refresh_token or refresh_token.revoked or refresh_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 리프레시 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 정보 조회
    user = await db.user.find_unique(
        where={"id": refresh_token.user_id},
        include={"role": {"include": {"permissions": True}}}
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 새 액세스 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 권한 목록 추출
    permissions = []
    if user.role and user.role.permissions:
        permissions = [p.name for p in user.role.permissions]
    
    token_data = {
        "sub": user.id,
        "role": user.role.name if user.role else None,
        "permissions": permissions
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    # 새 리프레시 토큰 생성 (기존 토큰 무효화)
    await db.refreshtoken.update(
        where={"id": refresh_token.id},
        data={"revoked": True}
    )
    
    new_refresh_token = await create_refresh_token(user.id)
    
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(token_data: RefreshTokenRequest):
    """로그아웃 및 리프레시 토큰 무효화"""
    # 리프레시 토큰 무효화
    await db.refreshtoken.update_many(
        where={"token": token_data.refresh_token},
        data={"revoked": True}
    )
    
    return {"message": "성공적으로 로그아웃되었습니다."}

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(password_data: ChangePasswordRequest, current_user = Depends(get_current_user)):
    """사용자 비밀번호 변경"""
    # 현재 비밀번호 확인
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 일치하지 않습니다."
        )
    
    # 새 비밀번호 해싱
    new_hashed_password = get_password_hash(password_data.new_password)
    
    # 비밀번호 업데이트
    await db.user.update(
        where={"id": current_user.id},
        data={"password_hash": new_hashed_password}
    )
    
    # 모든 리프레시 토큰 무효화
    await db.refreshtoken.update_many(
        where={"user_id": current_user.id},
        data={"revoked": True}
    )
    
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}

# OAuth2.0 - Google 로그인 관련 엔드포인트
@router.get("/google/login")
async def google_login():
    """Google OAuth2.0 로그인 URL 생성"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth2.0 설정이 완료되지 않았습니다."
        )
    
    # Google 인증 URL 생성
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
    )
    
    return {"url": auth_url}

@router.get("/google/callback")
async def google_callback(code: str, request: Request):
    """Google OAuth2.0 콜백 처리"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth2.0 설정이 완료되지 않았습니다."
        )
    
    # 액세스 토큰 요청
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=token_data)
        token_response = response.json()
        
        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth 오류: {token_response.get('error_description', token_response['error'])}"
            )
        
        # 사용자 정보 요청
        user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        user_response = await client.get(
            user_info_url,
            headers={"Authorization": f"Bearer {token_response['access_token']}"}
        )
        user_info = user_response.json()
    
    # 사용자 조회 또는 생성
    user = await db.user.find_unique(
        where={"email": user_info["email"]}
    )
    
    if not user:
        # 기본 역할 검색
        default_role = await db.role.find_first(
            where={"name": "user"}
        )
        
        if not default_role:
            # 기본 역할 생성
            default_role = await db.role.create(
                data={
                    "name": "user",
                    "description": "기본 사용자 역할"
                }
            )
        
        # 새 사용자 생성
        user = await db.user.create(
            data={
                "email": user_info["email"],
                "name": user_info.get("name", user_info["email"].split("@")[0]),
                "password_hash": get_password_hash(f"google-oauth2-{datetime.utcnow().timestamp()}"),
                "role_id": default_role.id
            }
        )
        
        # 기본 사용자 설정 생성
        await db.usersettings.create(
            data={
                "user_id": user.id,
                "enable_suggestions": True,
                "suggestion_frequency": "medium",
                "enable_history": True,
                "domains": []
            }
        )
    
    # 액세스 토큰 및 리프레시 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 사용자 역할 및 권한 조회
    user_with_role = await db.user.find_unique(
        where={"id": user.id},
        include={"role": {"include": {"permissions": True}}}
    )
    
    # 권한 목록 추출
    permissions = []
    if user_with_role.role and user_with_role.role.permissions:
        permissions = [p.name for p in user_with_role.role.permissions]
    
    token_data = {
        "sub": user.id,
        "role": user_with_role.role.name if user_with_role.role else None,
        "permissions": permissions
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    # 리프레시 토큰 생성
    refresh_token = await create_refresh_token(user.id)
    
    # 성공 페이지로 리다이렉트 (토큰 포함)
    redirect_url = f"{request.url.scheme}://{request.url.netloc}/auth-success?access_token={access_token}&refresh_token={refresh_token}"
    return {"redirect_url": redirect_url}

# 역할 및 권한 관리 엔드포인트 (관리자 전용)
@router.post("/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(permission_data: PermissionCreate, admin_user = Depends(get_admin_user)):
    """새 권한을 생성합니다. (관리자 전용)"""
    # 이미 존재하는 권한 확인
    existing_permission = await db.permission.find_unique(
        where={"name": permission_data.name}
    )
    
    if existing_permission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 권한 이름입니다."
        )
    
    # 권한 생성
    new_permission = await db.permission.create(
        data={
            "name": permission_data.name,
            "description": permission_data.description
        }
    )
    
    return new_permission

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(admin_user = Depends(get_admin_user)):
    """모든 권한을 조회합니다. (관리자 전용)"""
    permissions = await db.permission.find_many()
    return permissions

@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(role_data: RoleCreate, admin_user = Depends(get_admin_user)):
    """새 역할을 생성합니다. (관리자 전용)"""
    # 이미 존재하는 역할 확인
    existing_role = await db.role.find_unique(
        where={"name": role_data.name}
    )
    
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 역할 이름입니다."
        )
    
    # 존재하는 권한인지 확인
    for permission_name in role_data.permissions:
        permission = await db.permission.find_unique(
            where={"name": permission_name}
        )
        
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"존재하지 않는 권한입니다: {permission_name}"
            )
    
    # 역할 생성
    create_data = {
        "name": role_data.name,
        "description": role_data.description,
    }
    
    if role_data.permissions:
        create_data["permissions"] = {
            "connect": [{"name": name} for name in role_data.permissions]
        }
    
    new_role = await db.role.create(
        data=create_data,
        include={"permissions": True}
    )
    
    # 응답 형식 맞추기
    return {
        "id": new_role.id,
        "name": new_role.name,
        "description": new_role.description,
        "permissions": [p.name for p in new_role.permissions]
    }

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(admin_user = Depends(get_admin_user)):
    """모든 역할을 조회합니다. (관리자 전용)"""
    roles = await db.role.find_many(
        include={"permissions": True}
    )
    
    # 응답 형식 맞추기
    return [{
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permissions": [p.name for p in role.permissions]
    } for role in roles]

@router.put("/users/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_user_role(user_id: str, role_data: UserRoleUpdate, admin_user = Depends(get_admin_user)):
    """사용자의 역할을 업데이트합니다. (관리자 전용)"""
    # 사용자 존재 여부 확인
    user = await db.user.find_unique(
        where={"id": user_id}
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    # 역할 존재 여부 확인
    role = await db.role.find_unique(
        where={"id": role_data.role_id}
    )
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="역할을 찾을 수 없습니다."
        )
    
    # 사용자 역할 업데이트
    await db.user.update(
        where={"id": user_id},
        data={"role_id": role_data.role_id}
    )
    
    return {"message": "사용자 역할이 성공적으로 업데이트되었습니다."} 