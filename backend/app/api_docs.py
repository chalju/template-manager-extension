"""
API 문서화 설정 파일
"""

# API 메타데이터
api_metadata = {
    "title": "문장 자동완성 어시스턴트 API",
    "description": """
    # 문장 자동완성 어시스턴트 API 문서

    이 API는 문장 자동완성 어시스턴트를 위한 백엔드 서비스를 제공합니다.
    Chrome 확장 프로그램에서 사용되며 NAVER CLOVA HCX-005 모델을 활용한 텍스트 예측 기능을 제공합니다.
    
    ## 주요 기능
    
    * **사용자 인증**: JWT 토큰 기반 인증 시스템
    * **사용자 관리**: 사용자 계정 생성 및 관리
    * **템플릿 관리**: 사용자 정의 텍스트 템플릿 저장 및 관리
    * **설정 관리**: 사용자별 애플리케이션 설정 저장 및 관리
    * **텍스트 예측**: CLOVA HCX-005 모델을 사용한 컨텍스트 기반 텍스트 예측
    * **사용 이력 관리**: 사용자 텍스트 입력 및 템플릿 사용 이력 관리
    
    ## 인증
    
    모든, 엔드포인트(인증 관련 제외)는 Bearer 토큰 인증이 필요합니다:
    
    ```
    Authorization: Bearer {access_token}
    ```
    
    인증 토큰은 `/api/auth/login` 엔드포인트를 통해 발급받을 수 있습니다.
    """,
    "version": "0.1.0",
    "contact": {
        "name": "문장 자동완성 어시스턴트 개발팀",
        "email": "support@example.com",
    },
    "license_info": {
        "name": "MIT",
    },
}

# 태그 메타데이터
tags_metadata = [
    {
        "name": "인증",
        "description": "사용자 등록, 로그인, 비밀번호 변경 등 인증 관련 엔드포인트",
    },
    {
        "name": "사용자",
        "description": "사용자 정보 조회, 업데이트 및 삭제 기능",
    },
    {
        "name": "사용자 설정",
        "description": "사용자별 애플리케이션 설정 관리 (추천 빈도, 도메인 등)",
    },
    {
        "name": "템플릿",
        "description": "사용자 정의 텍스트 템플릿 CRUD 기능",
    },
    {
        "name": "사용 이력",
        "description": "사용자 텍스트 입력 및 템플릿 사용 이력 관리",
    },
    {
        "name": "텍스트 예측",
        "description": "CLOVA HCX-005 모델을 활용한 문장 자동완성 및 추천 기능",
    },
] 