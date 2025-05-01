#!/bin/bash

# Prisma 클라이언트 생성 스크립트

# 필요한 디렉토리 생성
mkdir -p scripts

# Python 가상환경이 활성화되어 있는지 확인
if [[ "$VIRTUAL_ENV" == "" ]]; then
  echo "⚠️  가상환경이 활성화되지 않았습니다. 가상환경을 활성화하고 다시 시도하세요."
  echo "예: source venv/bin/activate"
  exit 1
fi

echo "🔄 Prisma 클라이언트 생성 중..."

# Prisma 클라이언트 생성
prisma generate

# 성공 여부 확인
if [ $? -eq 0 ]; then
  echo "✅ Prisma 클라이언트가 성공적으로 생성되었습니다."
else
  echo "❌ Prisma 클라이언트 생성 실패"
  exit 1
fi 