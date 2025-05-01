#!/bin/bash

# Prisma 마이그레이션 스크립트

# Python 가상환경이 활성화되어 있는지 확인
if [[ "$VIRTUAL_ENV" == "" ]]; then
  echo "⚠️  가상환경이 활성화되지 않았습니다. 가상환경을 활성화하고 다시 시도하세요."
  echo "예: source venv/bin/activate"
  exit 1
fi

# 마이그레이션 이름 입력 받기
if [ -z "$1" ]; then
  echo "⚠️  마이그레이션 이름을 지정하세요."
  echo "사용법: ./scripts/migrate.sh \"migration_name\""
  exit 1
fi

MIGRATION_NAME=$1
echo "🔄 마이그레이션 \"$MIGRATION_NAME\" 생성 중..."

# Prisma 마이그레이션 실행
prisma migrate dev --name "$MIGRATION_NAME"

# 성공 여부 확인
if [ $? -eq 0 ]; then
  echo "✅ 마이그레이션이 성공적으로 적용되었습니다."
else
  echo "❌ 마이그레이션 실패"
  exit 1
fi

# Prisma 클라이언트 생성 확인
if [ ! -d "prisma/client" ]; then
  echo "⚠️  Prisma 클라이언트가 없습니다. 클라이언트를 생성합니다."
  ./scripts/generate_prisma_client.sh
fi 