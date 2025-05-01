"""
pytest 픽스처 정의
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from asynctest import CoroutineMock as AsyncMock
from main import app
from app.auth.jwt import create_access_token
from datetime import timedelta, datetime, timezone
from config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.database.client import db
from uuid import uuid4

@pytest.fixture
def client():
    """
    테스트 클라이언트 픽스처를 반환합니다.
    """
    return TestClient(app)

@pytest.fixture
def test_user():
    """
    테스트용 사용자 데이터를 반환합니다.
    """
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "password": "testpassword123"
    }

@pytest.fixture
def auth_headers(test_user):
    """
    인증된 요청을 위한 헤더를 반환합니다.
    """
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": test_user["id"]},
        expires_delta=access_token_expires
    )
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def mock_db_user(monkeypatch, test_user):
    """
    데이터베이스 사용자 조회 모킹
    """
    async def mock_find_unique(*args, **kwargs):
        return type('User', (), {
            "id": test_user["id"],
            "email": test_user["email"],
            "name": test_user["name"],
            "password_hash": "$2b$12$test_hash_for_password",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        })
    
    monkeypatch.setattr(db.user, "find_unique", mock_find_unique)

@pytest.fixture
def mock_db_settings(monkeypatch, test_user):
    """
    데이터베이스 사용자 설정 조회 모킹
    """
    async def mock_find_unique(*args, **kwargs):
        return type('UserSettings', (), {
            "id": "test-settings-id",
            "user_id": test_user["id"],
            "enable_suggestions": True,
            "suggestion_frequency": "medium",
            "enable_history": True,
            "domains": [],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        })
    
    monkeypatch.setattr(db.usersettings, "find_unique", mock_find_unique)

# 모의 사용자 데이터
@pytest.fixture
def mock_user():
    return {
        "id": str(uuid4()),
        "email": "test@example.com",
        "name": "테스트 사용자"
    }

# 모의 템플릿 데이터
@pytest.fixture
def mock_template(mock_user):
    return {
        "id": str(uuid4()),
        "user_id": mock_user["id"],
        "title": "테스트 템플릿",
        "content": "테스트 내용입니다.",
        "keyword": "테스트",
        "is_shared": False,
        "tags": ["테스트", "예시"],
        "category": "일반",
        "usage_count": 0,
        "version": 1,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

# 모의 템플릿 버전 데이터
@pytest.fixture
def mock_template_version(mock_template):
    return {
        "id": str(uuid4()),
        "template_id": mock_template["id"],
        "version_number": 1,
        "content": "테스트 내용입니다.",
        "version_note": None,
        "created_at": datetime.now(timezone.utc)
    }

# 모의 사용 이력 데이터
@pytest.fixture
def mock_usage_history(mock_user, mock_template):
    return {
        "id": str(uuid4()),
        "user_id": mock_user["id"],
        "template_id": mock_template["id"],
        "context": "테스트 컨텍스트",
        "generated_text": "생성된 텍스트",
        "selected": True,
        "domain": "테스트",
        "timestamp": datetime.now(timezone.utc)
    }

# 인증 미들웨어 패치
@pytest.fixture(autouse=True)
def mock_auth(mock_user):
    with patch("app.auth.jwt.get_current_user") as mock:
        mock.return_value = mock_user
        yield mock

# Prisma 데이터베이스 클라이언트 패치
@pytest.fixture
def mock_db():
    with patch("app.database.client.db") as mock_db:
        # Template 모델 메서드
        mock_db.template.create = AsyncMock()
        mock_db.template.find_many = AsyncMock()
        mock_db.template.find_unique = AsyncMock()
        mock_db.template.update = AsyncMock()
        mock_db.template.delete = AsyncMock()
        
        # TemplateVersion 모델 메서드
        mock_db.templateversion.create = AsyncMock()
        mock_db.templateversion.find_many = AsyncMock()
        mock_db.templateversion.find_unique = AsyncMock()
        
        # UsageHistory 모델 메서드
        mock_db.usagehistory.create = AsyncMock()
        mock_db.usagehistory.find_many = AsyncMock()
        mock_db.usagehistory.find_unique = AsyncMock()
        mock_db.usagehistory.update = AsyncMock()
        mock_db.usagehistory.delete_many = AsyncMock()
        mock_db.usagehistory.count = AsyncMock()
        
        yield mock_db 