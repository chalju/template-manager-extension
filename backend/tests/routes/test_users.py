"""
사용자 API 엔드포인트 테스트
"""
import pytest
from unittest.mock import AsyncMock

class TestUserAPI:
    """사용자 API 엔드포인트 테스트 클래스"""
    
    def test_get_current_user_info(self, client, auth_headers, mock_db_user):
        """현재 사용자 정보 조회 테스트"""
        response = client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "id" in data
        assert "password" not in data
    
    def test_update_user_info(self, client, auth_headers, mock_db_user, monkeypatch):
        """사용자 정보 업데이트 테스트"""
        from app.database.client import db
        
        # 업데이트 API 모킹
        mock_update = AsyncMock()
        mock_update.return_value = type('User', (), {
            "id": "test-user-id",
            "email": "updated@example.com",
            "name": "Updated User",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-02T00:00:00Z"
        })
        monkeypatch.setattr(db.user, "update", mock_update)
        
        # 업데이트 요청
        response = client.put(
            "/api/users/me",
            headers=auth_headers,
            json={"name": "Updated User", "email": "updated@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated User"
        assert data["email"] == "updated@example.com"
        
        # 업데이트 호출 검증
        mock_update.assert_called_once()
    
    def test_update_user_with_duplicate_email(self, client, auth_headers, mock_db_user, monkeypatch):
        """중복 이메일로 사용자 업데이트 시도 테스트"""
        from app.database.client import db
        
        # 이메일 중복 유저 모킹
        async def mock_find_unique_duplicate(*args, **kwargs):
            if kwargs.get("where", {}).get("email") == "duplicate@example.com":
                return type('User', (), {"id": "another-user-id"})
            return None
        
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique_duplicate)
        
        # 중복 이메일로 업데이트 요청
        response = client.put(
            "/api/users/me",
            headers=auth_headers,
            json={"email": "duplicate@example.com"}
        )
        
        assert response.status_code == 400
        assert "이미 사용 중인 이메일입니다" in response.json()["detail"]
    
    def test_delete_user(self, client, auth_headers, mock_db_user, monkeypatch):
        """사용자 계정 삭제 테스트"""
        from app.database.client import db
        
        # 삭제 API 모킹
        mock_delete = AsyncMock()
        monkeypatch.setattr(db.user, "delete", mock_delete)
        
        # 삭제 요청
        response = client.delete("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 204
        assert response.content == b''
        
        # 삭제 호출 검증
        mock_delete.assert_called_once()
        mock_delete.assert_called_with(where={"id": "test-user-id"})
    
    def test_unauthorized_access(self, client):
        """인증 없이 접근 시도 테스트"""
        response = client.get("/api/users/me")
        assert response.status_code == 401
        
        response = client.put("/api/users/me", json={"name": "Hacker"})
        assert response.status_code == 401
        
        response = client.delete("/api/users/me")
        assert response.status_code == 401 