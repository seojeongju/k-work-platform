#!/bin/bash
# w-campus.com 즉시 배포 스크립트

echo "🚀 W-Campus.com 배포 시작..."

# 토큰 설정 확인
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN이 설정되지 않았습니다."
    echo "💡 다음 명령으로 토큰을 설정하세요:"
    echo "   export CLOUDFLARE_API_TOKEN='your_token_here'"
    exit 1
fi

echo "✅ API 토큰 확인됨"

# 인증 확인
echo "🔐 Cloudflare 인증 확인 중..."
npx wrangler whoami

if [ $? -eq 0 ]; then
    echo "✅ Cloudflare 인증 성공"
else 
    echo "❌ 인증 실패. 토큰을 다시 확인해주세요."
    exit 1
fi

# 자동 배포 실행
echo "🚀 자동 배포 스크립트 실행..."
node fresh-deploy.cjs

echo "🎉 배포 완료!"
echo "🌐 임시 URL: https://w-campus-fresh.pages.dev"
echo "🎯 최종 URL: https://w-campus.com (DNS 전파 후)"