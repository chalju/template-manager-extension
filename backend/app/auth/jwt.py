from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from passlib.context import CryptContext
from typing import Optional, List, Dict, Set
from app.database.client import get_db, db
from app.schemas.auth import TokenData
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
import uuid
import secrets

# OAuth2 스키마
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/auth/login",
    scopes={
        "admin": "관리자 권한으로 모든 리소스에 접근",
        "user": "일반 사용자 권한으로 자신의 리소스에 접근",
    },
)

# 비밀번호 해싱을 위한 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """일반 텍스트 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """비밀번호를 해시합니다."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """액세스 토큰을 생성합니다."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

async def create_refresh_token(user_id: str) -> str:
    """리프레시 토큰을 생성하고 데이터베이스에 저장합니다."""
    # 토큰 생성
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # 데이터베이스에 저장
    await db.refreshtoken.create(
        data={
            "token": token,
            "user_id": user_id,
            "expires_at": expires_at,
        }
    )
    
    return token

async def get_user_permissions(user_id: str) -> List[str]:
    """사용자의 권한 목록을 가져옵니다."""
    user = await db.user.find_unique(
        where={"id": user_id},
        include={"role": {"include": {"permissions": True}}}
    )
    
    if not user or not user.role:
        return []
    
    return [perm.name for perm in user.role.permissions]

def has_permission(required_permissions: List[str], user_permissions: List[str]) -> bool:
    """사용자가 필요한 권한을 가지고 있는지 확인합니다."""
    if not required_permissions:
        return True
    
    user_permission_set = set(user_permissions)
    return any(perm in user_permission_set for perm in required_permissions)

async def get_current_user(security_scopes: SecurityScopes, token: str = Depends(oauth2_scheme)):
    """현재 인증된 사용자를 가져옵니다."""
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다",
        headers={"WWW-Authenticate": authenticate_value},
    )
    
    try:
        # 토큰 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        # 토큰의 만료 시간 확인
        exp = payload.get("exp")
        if exp is None or datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 만료되었습니다",
                headers={"WWW-Authenticate": authenticate_value},
            )
        
        token_data = TokenData(
            user_id=user_id,
            role=payload.get("role"),
            permissions=payload.get("permissions", [])
        )
    except JWTError:
        raise credentials_exception
    
    # 데이터베이스에서 사용자 조회
    user = await db.user.find_unique(
        where={"id": token_data.user_id},
        include={"role": True}
    )
    
    if user is None:
        raise credentials_exception
    
    # 권한 검사
    if security_scopes.scopes:
        user_permissions = await get_user_permissions(user.id)
        if not has_permission(security_scopes.scopes, user_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 작업을 수행할 권한이 없습니다",
                headers={"WWW-Authenticate": authenticate_value},
            )
    
    return user

async def get_current_active_user(current_user = Security(get_current_user, scopes=["user"])):
    """현재 인증된 활성 사용자를 가져옵니다."""
    return current_user

async def get_admin_user(current_user = Security(get_current_user, scopes=["admin"])):
    """현재 인증된 관리자 사용자를 가져옵니다."""
    return current_user

def require_permissions(required_permissions: List[str]):
    """특정 권한이 필요한 엔드포인트를 위한 의존성"""
    async def dependency(current_user = Depends(get_current_user)):
        user_permissions = await get_user_permissions(current_user.id)
        if not has_permission(required_permissions, user_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 작업을 수행할 권한이 없습니다"
            )
        return current_user
    return dependency 