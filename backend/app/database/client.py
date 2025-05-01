from prisma import Prisma
from contextlib import asynccontextmanager

# Prisma 클라이언트 초기화
db = Prisma()

async def initialize_db():
    """애플리케이션 시작 시 Prisma 클라이언트를 연결합니다."""
    await db.connect()
    print("Database connected")

async def close_db():
    """애플리케이션 종료 시 Prisma 클라이언트 연결을 종료합니다."""
    if db.is_connected():
        await db.disconnect()
        print("Database disconnected")

@asynccontextmanager
async def get_db():
    """요청마다 데이터베이스 컨텍스트를 제공하는 AsyncContextManager입니다."""
    try:
        if not db.is_connected():
            await db.connect()
        yield db
    finally:
        # 여기서는 연결을 종료하지 않습니다. 애플리케이션 종료 시에만 종료합니다.
        pass 