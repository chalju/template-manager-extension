import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
import json
from datetime import datetime, timezone
from uuid import uuid4

# 테스트 클라이언트
client = TestClient(app)

# 모의 사용자 데이터
mock_user = {
    "id": str(uuid4()),
    "email": "test@example.com",
    "name": "테스트 사용자"
}

# 모의 템플릿 데이터
mock_template = {
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
mock_template_version = {
    "id": str(uuid4()),
    "template_id": mock_template["id"],
    "version_number": 1,
    "content": "테스트 내용입니다.",
    "version_note": None,
    "created_at": datetime.now(timezone.utc)
}

# 인증 미들웨어 패치
@pytest.fixture(autouse=True)
def mock_auth():
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
        
        yield mock_db

# 테스트: 템플릿 생성
def test_create_template(mock_db):
    # 모의 응답 설정
    mock_db.template.create.return_value = mock_template
    mock_db.templateversion.create.return_value = mock_template_version
    
    # API 요청
    template_data = {
        "title": "테스트 템플릿",
        "content": "테스트 내용입니다.",
        "keyword": "테스트",
        "is_shared": False,
        "tags": ["테스트", "예시"],
        "category": "일반"
    }
    
    response = client.post(
        "/api/templates/",
        json=template_data
    )
    
    # 검증
    assert response.status_code == 201
    assert mock_db.template.create.called
    assert mock_db.templateversion.create.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["title"] == template_data["title"]
    assert result["content"] == template_data["content"]

# 테스트: 템플릿 목록 조회
def test_get_templates(mock_db):
    # 모의 응답 설정
    mock_db.template.find_many.return_value = [mock_template]
    
    # API 요청
    response = client.get("/api/templates/")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert len(result) == 1
    assert result[0]["id"] == mock_template["id"]

# 테스트: 고급 검색
def test_search_templates(mock_db):
    # 모의 응답 설정
    mock_db.template.find_many.return_value = [mock_template]
    
    # API 요청
    search_params = {
        "title_contains": "테스트",
        "tags": ["예시"],
        "category": "일반"
    }
    
    response = client.post(
        "/api/templates/search",
        json=search_params
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert len(result) == 1
    assert result[0]["id"] == mock_template["id"]

# 테스트: 특정 템플릿 조회
def test_get_template(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    
    # API 요청
    response = client.get(f"/api/templates/{mock_template['id']}")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_unique.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["id"] == mock_template["id"]
    assert result["title"] == mock_template["title"]

# 테스트: 템플릿 업데이트
def test_update_template(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    
    updated_template = mock_template.copy()
    updated_template["title"] = "업데이트된 제목"
    updated_template["version"] = 2
    
    mock_db.template.update.return_value = updated_template
    
    # API 요청
    update_data = {
        "title": "업데이트된 제목",
        "content": "업데이트된 내용입니다.",
        "version_note": "내용 업데이트"
    }
    
    response = client.put(
        f"/api/templates/{mock_template['id']}",
        json=update_data
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_unique.called
    assert mock_db.template.update.called
    assert mock_db.templateversion.create.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["title"] == "업데이트된 제목"

# 테스트: 템플릿 버전 조회
def test_get_template_versions(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    mock_db.templateversion.find_many.return_value = [mock_template_version]
    
    # API 요청
    response = client.get(f"/api/templates/{mock_template['id']}/versions")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_unique.called
    assert mock_db.templateversion.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["template_id"] == mock_template["id"]
    assert len(result["versions"]) == 1
    assert result["versions"][0]["version_id"] == mock_template_version["id"]

# 테스트: 템플릿 버전 복원
def test_restore_template_version(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    mock_db.templateversion.find_unique.return_value = mock_template_version
    
    updated_template = mock_template.copy()
    updated_template["version"] = 2
    
    mock_db.template.update.return_value = updated_template
    
    # API 요청
    response = client.post(
        f"/api/templates/{mock_template['id']}/restore/{mock_template_version['id']}"
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_unique.called
    assert mock_db.templateversion.find_unique.called
    assert mock_db.template.update.called
    assert mock_db.templateversion.create.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["version"] == 2

# 테스트: 템플릿 삭제
def test_delete_template(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    
    # API 요청
    response = client.delete(f"/api/templates/{mock_template['id']}")
    
    # 검증
    assert response.status_code == 204
    assert mock_db.template.find_unique.called
    assert mock_db.template.delete.called

# 테스트: 템플릿 사용 횟수 증가
def test_increment_template_usage(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    
    updated_template = mock_template.copy()
    updated_template["usage_count"] = 1
    
    mock_db.template.update.return_value = updated_template
    
    # API 요청
    response = client.post(f"/api/templates/{mock_template['id']}/increment-usage")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.template.find_unique.called
    assert mock_db.template.update.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["usage_count"] == 1
