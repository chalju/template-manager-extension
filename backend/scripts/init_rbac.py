#!/usr/bin/env python3
"""
역할 기반 접근 제어(RBAC) 초기화 스크립트

이 스크립트는 기본 역할 및 권한을 생성하고, 초기 관리자 계정을 설정합니다.
"""

import asyncio
import os
import sys

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.client import db
from app.auth.jwt import get_password_hash
from config import ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME

# 기본 권한
DEFAULT_PERMISSIONS = [
    # 사용자 관리 권한
    {"name": "users:read", "description": "사용자 정보 조회 권한"},
    {"name": "users:write", "description": "사용자 정보 수정 권한"},
    {"name": "users:delete", "description": "사용자 삭제 권한"},
    
    # 템플릿 관리 권한
    {"name": "templates:read", "description": "템플릿 조회 권한"},
    {"name": "templates:write", "description": "템플릿 생성 및 수정 권한"},
    {"name": "templates:delete", "description": "템플릿 삭제 권한"},
    {"name": "templates:admin", "description": "모든 사용자의 템플릿 관리 권한"},
    
    # 사용 이력 관리 권한
    {"name": "history:read", "description": "사용 이력 조회 권한"},
    {"name": "history:write", "description": "사용 이력 생성 및 수정 권한"},
    {"name": "history:delete", "description": "사용 이력 삭제 권한"},
    {"name": "history:admin", "description": "모든 사용자의 사용 이력 관리 권한"},
    
    # 설정 관리 권한
    {"name": "settings:read", "description": "설정 조회 권한"},
    {"name": "settings:write", "description": "설정 수정 권한"},
    
    # 관리자 권한
    {"name": "roles:read", "description": "역할 조회 권한"},
    {"name": "roles:write", "description": "역할 생성 및 수정 권한"},
    {"name": "permissions:read", "description": "권한 조회 권한"},
    {"name": "permissions:write", "description": "권한 생성 및 수정 권한"},
    {"name": "system:admin", "description": "시스템 관리 권한"},
]

# 기본 역할
DEFAULT_ROLES = [
    {
        "name": "user",
        "description": "일반 사용자 역할",
        "permissions": [
            "templates:read", "templates:write", "templates:delete",
            "history:read", "history:write", "history:delete",
            "settings:read", "settings:write",
            "users:read"
        ]
    },
    {
        "name": "admin",
        "description": "관리자 역할",
        "permissions": [
            "users:read", "users:write", "users:delete",
            "templates:read", "templates:write", "templates:delete", "templates:admin",
            "history:read", "history:write", "history:delete", "history:admin",
            "settings:read", "settings:write",
            "roles:read", "roles:write",
            "permissions:read", "permissions:write",
            "system:admin"
        ]
    }
]

async def create_permissions():
    """기본 권한을 생성합니다."""
    print("기본 권한 생성 중...")
    for permission_data in DEFAULT_PERMISSIONS:
        # 이미 존재하는 권한 확인
        existing = await db.permission.find_unique(
            where={"name": permission_data["name"]}
        )
        
        if not existing:
            await db.permission.create(
                data=permission_data
            )
            print(f"생성됨: {permission_data['name']}")
        else:
            print(f"이미 존재함: {permission_data['name']}")

async def create_roles():
    """기본 역할을 생성합니다."""
    print("\n기본 역할 생성 중...")
    for role_data in DEFAULT_ROLES:
        # 이미 존재하는 역할 확인
        existing = await db.role.find_unique(
            where={"name": role_data["name"]}
        )
        
        permissions = role_data.pop("permissions")
        
        if not existing:
            # 역할 생성
            created_role = await db.role.create(
                data=role_data
            )
            
            # 권한 연결
            for permission_name in permissions:
                await db.role.update(
                    where={"id": created_role.id},
                    data={
                        "permissions": {
                            "connect": {"name": permission_name}
                        }
                    }
                )
            
            print(f"생성됨: {role_data['name']} (권한: {len(permissions)}개)")
        else:
            print(f"이미 존재함: {role_data['name']}")

async def create_admin_user():
    """관리자 사용자를 생성합니다."""
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("\n관리자 계정 정보가 구성되지 않았습니다. 환경 변수를 확인하세요.")
        return
    
    print("\n관리자 계정 생성 중...")
    
    # 관리자 사용자 이미 존재하는지 확인
    existing = await db.user.find_unique(
        where={"email": ADMIN_EMAIL}
    )
    
    if existing:
        print(f"관리자 계정이 이미 존재합니다: {ADMIN_EMAIL}")
        return
    
    # 관리자 역할 가져오기
    admin_role = await db.role.find_unique(
        where={"name": "admin"}
    )
    
    if not admin_role:
        print("오류: 관리자 역할을 찾을 수 없습니다. 역할 설정을 확인하세요.")
        return
    
    # 관리자 계정 생성
    hashed_password = get_password_hash(ADMIN_PASSWORD)
    
    admin_user = await db.user.create(
        data={
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME or "관리자",
            "password_hash": hashed_password,
            "role_id": admin_role.id
        }
    )
    
    # 기본 사용자 설정 생성
    await db.usersettings.create(
        data={
            "user_id": admin_user.id,
            "enable_suggestions": True,
            "suggestion_frequency": "medium",
            "enable_history": True,
            "domains": []
        }
    )
    
    print(f"관리자 계정이 생성되었습니다: {ADMIN_EMAIL}")

async def main():
    """RBAC 초기화 메인 함수"""
    # 데이터베이스 연결 추가
    await db.connect()
    
    try:
        print("역할 기반 접근 제어(RBAC) 초기화를 시작합니다...\n")
        
        # 권한 생성
        await create_permissions()
        
        # 역할 생성
        await create_roles()
        
        # 관리자 계정 생성
        await create_admin_user()
        
        print("\nRBAC 초기화가 완료되었습니다.")
    finally:
        # 연결 종료 추가
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 