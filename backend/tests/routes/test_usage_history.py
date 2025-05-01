import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
import json
from datetime import datetime, timezone, timedelta
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
    "is_shared": True
}

# 모의 사용 이력 데이터
mock_usage_history = {
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
def mock_auth():
    with patch("app.auth.jwt.get_current_user") as mock:
        mock.return_value = mock_user
        yield mock

# Prisma 데이터베이스 클라이언트 패치
@pytest.fixture
def mock_db():
    with patch("app.database.client.db") as mock_db:
        # Template 모델 메서드
        mock_db.template.find_unique = AsyncMock()
        
        # UsageHistory 모델 메서드
        mock_db.usagehistory.create = AsyncMock()
        mock_db.usagehistory.find_many = AsyncMock()
        mock_db.usagehistory.find_unique = AsyncMock()
        mock_db.usagehistory.update = AsyncMock()
        mock_db.usagehistory.delete_many = AsyncMock()
        mock_db.usagehistory.count = AsyncMock()
        
        yield mock_db

# 테스트: 사용 이력 생성
def test_create_usage_history(mock_db):
    # 모의 응답 설정
    mock_db.template.find_unique.return_value = mock_template
    mock_db.usagehistory.create.return_value = mock_usage_history
    
    # API 요청
    history_data = {
        "user_id": mock_user["id"],
        "template_id": mock_template["id"],
        "context": "테스트 컨텍스트",
        "generated_text": "생성된 텍스트",
        "selected": True,
        "domain": "테스트"
    }
    
    response = client.post(
        "/api/usage/",
        json=history_data
    )
    
    # 검증
    assert response.status_code == 201
    assert mock_db.template.find_unique.called
    assert mock_db.usagehistory.create.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["context"] == history_data["context"]
    assert result["generated_text"] == history_data["generated_text"]

# 테스트: 사용 이력 목록 조회
def test_get_usage_history(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.find_many.return_value = [mock_usage_history]
    
    # API 요청
    response = client.get("/api/usage/")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert len(result) == 1
    assert result[0]["id"] == mock_usage_history["id"]

# 테스트: 특정 사용 이력 조회
def test_get_usage_history_item(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.find_unique.return_value = mock_usage_history
    
    # API 요청
    response = client.get(f"/api/usage/{mock_usage_history['id']}")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.find_unique.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["id"] == mock_usage_history["id"]
    assert result["context"] == mock_usage_history["context"]

# 테스트: 사용 이력 업데이트
def test_update_usage_history(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.find_unique.return_value = mock_usage_history
    
    updated_history = mock_usage_history.copy()
    updated_history["selected"] = False
    
    mock_db.usagehistory.update.return_value = updated_history
    
    # API 요청
    update_data = {
        "selected": False
    }
    
    response = client.put(
        f"/api/usage/{mock_usage_history['id']}",
        json=update_data
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.find_unique.called
    assert mock_db.usagehistory.update.called
    
    # 응답 데이터 검증
    result = response.json()
    assert result["selected"] == False

# 테스트: 사용 이력 삭제
def test_clear_usage_history(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.delete_many.return_value = None
    
    # API 요청
    response = client.delete("/api/usage/clear")
    
    # 검증
    assert response.status_code == 204
    assert mock_db.usagehistory.delete_many.called

# 테스트: 사용 이력 통계 조회
def test_get_usage_statistics(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.count.side_effect = [10, 5]  # 전체 이력 수, 선택된 이력 수
    
    # API 요청
    response = client.get("/api/usage/stats/summary")
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.count.call_count == 2
    
    # 응답 데이터 검증
    result = response.json()
    assert result["total_count"] == 10
    assert result["selected_count"] == 5
    assert result["selected_percentage"] == 50.0

# 테스트: 날짜 범위로 사용 이력 조회
def test_get_usage_history_with_date_range(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.find_many.return_value = [mock_usage_history]
    
    # API 요청
    start_date = datetime.now(timezone.utc) - timedelta(days=7)
    end_date = datetime.now(timezone.utc)
    
    response = client.get(
        "/api/usage/",
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert len(result) == 1
    assert result[0]["id"] == mock_usage_history["id"]

# 테스트: 도메인별 사용 이력 조회
def test_get_usage_history_by_domain(mock_db):
    # 모의 응답 설정
    mock_db.usagehistory.find_many.return_value = [mock_usage_history]
    
    # API 요청
    response = client.get(
        "/api/usage/",
        params={"domain": "테스트"}
    )
    
    # 검증
    assert response.status_code == 200
    assert mock_db.usagehistory.find_many.called
    
    # 응답 데이터 검증
    result = response.json()
    assert len(result) == 1
    assert result[0]["domain"] == "테스트"
