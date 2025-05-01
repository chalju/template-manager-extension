"""
인증 API 엔드포인트 테스트
"""
import pytest
from unittest.mock import AsyncMock
from app.auth.jwt import verify_password

class TestAuthAPI:
    """인증 API 엔드포인트 테스트 클래스"""
    
    def test_register_user(self, client, monkeypatch):
        """새 사용자 등록 테스트"""
        from app.database.client import db
        
        # 이메일 중복 확인 모킹 (중복 없음)
        mock_find_unique = AsyncMock(return_value=None)
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique)
        
        # 사용자 생성 모킹
        mock_create_user = AsyncMock()
        mock_create_user.return_value = type('User', (), {
            "id": "new-user-id",
            "email": "new@example.com",
            "name": "New User",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        })
        monkeypatch.setattr(db.user, "create", mock_create_user)
        
        # 설정 생성 모킹
        mock_create_settings = AsyncMock()
        monkeypatch.setattr(db.usersettings, "create", mock_create_settings)
        
        # 등록 요청
        response = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "name": "New User",
                "password": "securepassword123"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert data["name"] == "New User"
        assert "id" in data
        assert "password" not in data
        
        # 비밀번호 해싱 검증을 위한 create 호출 확인
        create_call_args = mock_create_user.call_args[1]
        assert "data" in create_call_args
        assert "password_hash" in create_call_args["data"]
        # 해시된 비밀번호인지 확인
        assert create_call_args["data"]["password_hash"] != "securepassword123"
        
        # 사용자 설정 생성 확인
        mock_create_settings.assert_called_once()
    
    def test_register_with_duplicate_email(self, client, monkeypatch):
        """중복 이메일로 사용자 등록 시도 테스트"""
        from app.database.client import db
        
        # 이메일 중복 모킹
        mock_find_unique = AsyncMock()
        mock_find_unique.return_value = type('User', (), {"id": "existing-user-id"})
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique)
        
        # 등록 요청
        response = client.post(
            "/api/auth/register",
            json={
                "email": "duplicate@example.com",
                "name": "Duplicate User",
                "password": "password123"
            }
        )
        
        assert response.status_code == 400
        assert "이미 등록된 이메일입니다" in response.json()["detail"]
    
    def test_login_success(self, client, monkeypatch):
        """로그인 성공 테스트"""
        from app.database.client import db
        from app.auth.jwt import get_password_hash
        
        # 테스트 사용자 비밀번호 해시
        password = "correctpassword123"
        hashed_password = get_password_hash(password)
        
        # 사용자 조회 모킹
        mock_find_unique = AsyncMock()
        mock_find_unique.return_value = type('User', (), {
            "id": "test-user-id",
            "email": "test@example.com",
            "password_hash": hashed_password
        })
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique)
        
        # 로그인 요청
        response = client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": password
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client, monkeypatch):
        """잘못된 자격 증명으로 로그인 시도 테스트"""
        from app.database.client import db
        from app.auth.jwt import get_password_hash
        
        # 테스트 사용자 비밀번호 해시
        correct_password = "correctpassword123"
        hashed_password = get_password_hash(correct_password)
        
        # 사용자 조회 모킹
        mock_find_unique = AsyncMock()
        mock_find_unique.return_value = type('User', (), {
            "id": "test-user-id",
            "email": "test@example.com",
            "password_hash": hashed_password
        })
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique)
        
        # 잘못된 비밀번호로 로그인 시도
        response = client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpassword123"
            }
        )
        
        assert response.status_code == 401
        assert "이메일 또는 비밀번호가 일치하지 않습니다" in response.json()["detail"]
        
        # 존재하지 않는 사용자 모킹
        mock_find_unique.return_value = None
        
        # 존재하지 않는 사용자로 로그인 시도
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "anypassword123"
            }
        )
        
        assert response.status_code == 401
        assert "이메일 또는 비밀번호가 일치하지 않습니다" in response.json()["detail"]
    
    def test_change_password(self, client, auth_headers, mock_db_user, monkeypatch):
        """비밀번호 변경 테스트"""
        from app.database.client import db
        from app.auth.jwt import get_password_hash
        
        # 현재 비밀번호 해시
        current_password = "currentpassword123"
        hashed_password = get_password_hash(current_password)
        
        # 사용자 조회 모킹 (올바른 비밀번호 해시 포함)
        async def mock_find_unique_with_password(*args, **kwargs):
            user = await mock_db_user(*args, **kwargs)
            user.password_hash = hashed_password
            return user
        
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique_with_password)
        
        # 업데이트 API 모킹
        mock_update = AsyncMock()
        monkeypatch.setattr(db.user, "update", mock_update)
        
        # 비밀번호 변경 요청
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": current_password,
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "비밀번호가 성공적으로 변경되었습니다" in result["message"]
        
        # 업데이트 호출 확인
        mock_update.assert_called_once()
        call_args = mock_update.call_args[1]
        assert "data" in call_args
        assert "password_hash" in call_args["data"]
        
        # 새 비밀번호가 해시되었는지 확인
        new_hash = call_args["data"]["password_hash"]
        assert verify_password("newpassword123", new_hash)
    
    def test_change_password_incorrect_current(self, client, auth_headers, mock_db_user, monkeypatch):
        """잘못된 현재 비밀번호로 비밀번호 변경 시도 테스트"""
        from app.database.client import db
        from app.auth.jwt import get_password_hash
        
        # 현재 비밀번호 해시
        correct_password = "correctpassword123"
        hashed_password = get_password_hash(correct_password)
        
        # 사용자 조회 모킹 (올바른 비밀번호 해시 포함)
        async def mock_find_unique_with_password(*args, **kwargs):
            user = await mock_db_user(*args, **kwargs)
            user.password_hash = hashed_password
            return user
        
        monkeypatch.setattr(db.user, "find_unique", mock_find_unique_with_password)
        
        # 잘못된 현재 비밀번호로 비밀번호 변경 시도
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword123",
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 400
        assert "현재 비밀번호가 일치하지 않습니다" in response.json()["detail"] 