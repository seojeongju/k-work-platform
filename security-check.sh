#!/bin/bash
# 🛡️ WOW-CAMPUS 보안 검증 스크립트
# 이 스크립트는 커밋 전 보안 점검을 수행합니다.

set -e

echo "🔍 보안 검증 시작..."

# 1. 민감한 파일이 Git에 추가되었는지 검사
echo "📂 민감한 파일 검사 중..."
SENSITIVE_FILES=$(git diff --cached --name-only | grep -E '\.(env|secret|key|token)$' || true)
if [ ! -z "$SENSITIVE_FILES" ]; then
    echo "❌ 민감한 파일이 커밋에 포함되어 있습니다:"
    echo "$SENSITIVE_FILES"
    echo "💡 이 파일들을 .gitignore에 추가하고 스테이징에서 제거하세요."
    exit 1
fi

# 2. 하드코딩된 토큰/비밀번호 검사
echo "🔑 하드코딩된 시크릿 검사 중..."
HARDCODED_SECRETS=$(git diff --cached | grep -E '(api[_-]?key|token|secret|password)\s*[=:]\s*["\'][^"\']{20,}["\']' || true)
if [ ! -z "$HARDCODED_SECRETS" ]; then
    echo "❌ 하드코딩된 시크릿이 발견되었습니다:"
    echo "$HARDCODED_SECRETS"
    echo "💡 환경변수를 사용하도록 코드를 수정하세요."
    exit 1
fi

# 3. 문서에서 실제 토큰 검사
echo "📄 문서 내 토큰 노출 검사 중..."
DOC_TOKENS=$(git diff --cached | grep -E '[A-Za-z0-9_-]{40,}' | grep -v 'REDACTED' | grep -v 'example' | grep -v 'your-' || true)
if [ ! -z "$DOC_TOKENS" ]; then
    echo "⚠️  긴 문자열이 발견되었습니다. 실제 토큰이 아닌지 확인하세요:"
    echo "$DOC_TOKENS"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 4. .gitignore 파일 검증
echo "🚫 .gitignore 파일 검증 중..."
if ! grep -q "\.env" .gitignore; then
    echo "❌ .gitignore에 .env 패턴이 없습니다."
    exit 1
fi

if ! grep -q "\*secret\*" .gitignore; then
    echo "❌ .gitignore에 *secret* 패턴이 없습니다."
    exit 1
fi

# 5. 환경변수 사용 검증
echo "🌿 환경변수 사용 검증 중..."
HARDCODED_URLS=$(git diff --cached | grep -E 'https://.*\.pages\.dev' | grep -v 'example' || true)
if [ ! -z "$HARDCODED_URLS" ]; then
    echo "⚠️  하드코딩된 URL이 발견되었습니다:"
    echo "$HARDCODED_URLS"
    echo "💡 가능하면 환경변수 사용을 고려하세요."
fi

echo "✅ 보안 검증 완료!"
echo ""
echo "🔐 배포 전 체크리스트:"
echo "  □ 모든 시크릿이 환경변수로 설정됨"
echo "  □ .env.local 파일이 Git에서 제외됨" 
echo "  □ wrangler secret을 통해 운영 시크릿 설정됨"
echo "  □ API 토큰이 최소 권한으로 제한됨"
echo ""
echo "🚀 안전한 커밋을 진행하세요!"