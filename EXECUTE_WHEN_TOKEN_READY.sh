#!/bin/bash
# API 토큰을 받으시면 이 스크립트를 실행해주세요

echo "🔑 Cloudflare API 토큰을 입력해주세요:"
read -p "토큰: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ 토큰이 입력되지 않았습니다."
    exit 1
fi

echo "🔧 토큰 설정 중..."
export CLOUDFLARE_API_TOKEN="$TOKEN"

echo "✅ 토큰 설정 완료"
echo "🚀 배포 시작..."

# 배포 스크립트 실행
./deploy-with-token.sh

echo "🎉 배포 완료!"
echo ""
echo "🌐 접속 가능한 URL:"
echo "- 임시: https://w-campus-fresh.pages.dev"
echo "- 최종: https://w-campus.com (DNS 전파 후)"