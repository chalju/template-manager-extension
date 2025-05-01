"""
데이터베이스 초기화 및 Prisma 설정 스크립트
실행 방법: python setup_db.py
"""
import os
import asyncio
from prisma import Prisma
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

async def init_db():
    """Prisma 클라이언트 생성 및 데이터베이스 연결 테스트"""
    try:
        # Prisma 클라이언트 초기화
        prisma = Prisma()
        await prisma.connect()
        
        print("✅ 데이터베이스 연결 성공")
        
        # 연결 테스트: User 테이블에서 데이터 조회 시도
        test_query = await prisma.user.count()
        print(f"🔍 User 테이블 레코드 수: {test_query}")
        
        # 테스트 데이터 생성 (선택 사항)
        if test_query == 0 and os.getenv("CREATE_TEST_DATA", "false").lower() == "true":
            print("🔄 테스트 데이터 생성 중...")
            # 테스트 사용자 생성
            test_user = await prisma.user.create(
                data={
                    "email": "test@example.com",
                    "password_hash": "hashed_password",
                    "name": "테스트 사용자",
                }
            )
            print(f"✅ 테스트 사용자 생성됨: {test_user.id}")
            
            # 사용자 설정 생성
            test_settings = await prisma.usersettings.create(
                data={
                    "user_id": test_user.id,
                    "enable_suggestions": True,
                    "suggestion_frequency": "medium",
                    "enable_history": True,
                    "domains": ["example.com", "company.com"]
                }
            )
            print(f"✅ 테스트 사용자 설정 생성됨: {test_settings.id}")
            
            # 템플릿 생성
            test_template = await prisma.template.create(
                data={
                    "user_id": test_user.id,
                    "title": "서버 점검 안내",
                    "content": "안녕하세요, 서버 점검 안내드립니다. {날짜}에 {시간}부터 {시간}까지 점검이 있을 예정입니다. 양해 부탁드립니다.",
                    "keyword": "서버",
                    "usage_count": 5,
                    "is_shared": True
                }
            )
            print(f"✅ 테스트 템플릿 생성됨: {test_template.id}")
        
        await prisma.disconnect()
        print("✅ 데이터베이스 초기화 완료")
        
    except Exception as e:
        print(f"❌ 데이터베이스 초기화 실패: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(init_db()) 