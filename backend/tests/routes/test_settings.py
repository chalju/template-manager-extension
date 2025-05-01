"""
사용자 설정 API 엔드포인트 테스트
"""
import pytest
from unittest.mock import AsyncMock

class TestSettingsAPI:
    """사용자 설정 API 엔드포인트 테스트 클래스"""
    
    def test_get_user_settings(self, client, auth_headers, mock_db_settings):
        """사용자 설정 조회 테스트"""
        response = client.get("/api/settings/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "enable_suggestions" in data
        assert "suggestion_frequency" in data
        assert "enable_history" in data
        assert "domains" in data
        assert "id" in data
        assert "user_id" in data
        assert data["enable_suggestions"] == True
        assert data["suggestion_frequency"] == "medium"
    
    def test_get_user_settings_not_found(self, client, auth_headers, mock_db_user, monkeypatch):
        """존재하지 않는 사용자 설정 조회 테스트"""
        from app.database.client import db
        
        # 사용자 설정 없음 모킹
        mock_find_unique = AsyncMock(return_value=None)
        monkeypatch.setattr(db.usersettings, "find_unique", mock_find_unique)
        
        response = client.get("/api/settings/", headers=auth_headers)
        
        assert response.status_code == 404
        assert "사용자 설정을 찾을 수 없습니다" in response.json()["detail"]
    
    def test_update_user_settings(self, client, auth_headers, mock_db_settings, monkeypatch):
        """사용자 설정 업데이트 테스트"""
        from app.database.client import db
        
        # 업데이트 API 모킹
        mock_update = AsyncMock()
        mock_update.return_value = type('UserSettings', (), {
            "id": "test-settings-id",
            "user_id": "test-user-id",
            "enable_suggestions": False,
            "suggestion_frequency": "low",
            "enable_history": False,
            "domains": ["example.com", "test.com"],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-02T00:00:00Z"
        })
        monkeypatch.setattr(db.usersettings, "update", mock_update)
        
        # 업데이트 요청
        response = client.put(
            "/api/settings/",
            headers=auth_headers,
            json={
                "enable_suggestions": False,
                "suggestion_frequency": "low",
                "enable_history": False,
                "domains": ["example.com", "test.com"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enable_suggestions"] == False
        assert data["suggestion_frequency"] == "low"
        assert data["enable_history"] == False
        assert len(data["domains"]) == 2
        assert "example.com" in data["domains"]
        assert "test.com" in data["domains"]
        
        # 업데이트 호출 검증
        mock_update.assert_called_once()
    
    def test_update_settings_not_found(self, client, auth_headers, mock_db_user, monkeypatch):
        """존재하지 않는 사용자 설정 업데이트 시도 테스트"""
        from app.database.client import db
        
        # 사용자 설정 없음 모킹
        mock_find_unique = AsyncMock(return_value=None)
        monkeypatch.setattr(db.usersettings, "find_unique", mock_find_unique)
        
        response = client.put(
            "/api/settings/",
            headers=auth_headers,
            json={"enable_suggestions": False}
        )
        
        assert response.status_code == 404
        assert "사용자 설정을 찾을 수 없습니다" in response.json()["detail"]
    
    def test_reset_user_settings(self, client, auth_headers, mock_db_settings, monkeypatch):
        """사용자 설정 초기화 테스트"""
        from app.database.client import db
        
        # 업데이트 API 모킹
        mock_update = AsyncMock()
        mock_update.return_value = type('UserSettings', (), {
            "id": "test-settings-id",
            "user_id": "test-user-id",
            "enable_suggestions": True,
            "suggestion_frequency": "medium",
            "enable_history": True,
            "domains": [],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-02T00:00:00Z"
        })
        monkeypatch.setattr(db.usersettings, "update", mock_update)
        
        # 초기화 요청
        response = client.post("/api/settings/reset", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["enable_suggestions"] == True
        assert data["suggestion_frequency"] == "medium"
        assert data["enable_history"] == True
        assert len(data["domains"]) == 0
        
        # 업데이트 호출 검증
        mock_update.assert_called_once()
        call_args = mock_update.call_args[1]
        assert "data" in call_args
        assert call_args["data"]["enable_suggestions"] == True
        assert call_args["data"]["suggestion_frequency"] == "medium"
        assert call_args["data"]["enable_history"] == True
        assert call_args["data"]["domains"] == []
    
    def test_reset_settings_not_found(self, client, auth_headers, mock_db_user, monkeypatch):
        """존재하지 않는 사용자 설정 초기화 시도 테스트"""
        from app.database.client import db
        
        # 사용자 설정 없음 모킹
        mock_find_unique = AsyncMock(return_value=None)
        monkeypatch.setattr(db.usersettings, "find_unique", mock_find_unique)
        
        response = client.post("/api/settings/reset", headers=auth_headers)
        
        assert response.status_code == 404
        assert "사용자 설정을 찾을 수 없습니다" in response.json()["detail"]
    
    def test_unauthorized_access(self, client):
        """인증 없이 설정 접근 시도 테스트"""
        response = client.get("/api/settings/")
        assert response.status_code == 401
        
        response = client.put("/api/settings/", json={"enable_suggestions": False})
        assert response.status_code == 401
        
        response = client.post("/api/settings/reset")
        assert response.status_code == 401 