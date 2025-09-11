# 🔐 Cloudflare 인증 설정 가이드

현재 개발 환경에서는 브라우저를 통한 OAuth 로그인이 제한되어 있으므로, API 토큰을 직접 설정하는 방법을 안내드립니다.

## 🔑 API 토큰 생성 방법

### 1단계: Cloudflare Dashboard에서 토큰 생성
1. **Cloudflare Dashboard** 접속: https://dash.cloudflare.com
2. **우측 상단 프로필** → **My Profile** → **API Tokens** 클릭
3. **Create Token** 클릭
4. **Custom token** 선택

### 2단계: 토큰 권한 설정
다음 권한들을 설정해주세요:

```
Account: All accounts - Zone:Read, Account:Read
Zone: All zones - Zone:Read, DNS:Edit  
User: User Details:Read
```

또는 **Cloudflare Pages:Edit** 템플릿 사용 (권장)

### 3단계: 토큰 복사 및 환경변수 설정
생성된 토큰을 복사한 후, 다음 명령어로 설정:

```bash
# 환경변수로 설정
export CLOUDFLARE_API_TOKEN="your_api_token_here"

# 또는 .env 파일에 저장
echo "CLOUDFLARE_API_TOKEN=your_api_token_here" >> .env
```

## 🚀 토큰 설정 후 배포 진행

토큰이 설정되면 다음 명령어로 배포를 진행할 수 있습니다:

### 자동 배포 (권장)
```bash
node fresh-deploy.cjs
```

### 수동 배포
```bash
# 1. 새로운 D1 데이터베이스 생성
npx wrangler d1 create w-campus-production-fresh

# 2. 데이터베이스 ID를 wrangler.toml에 설정

# 3. 마이그레이션 실행
npx wrangler d1 execute w-campus-production-fresh --file=./migrations/0001_fresh_start_schema.sql

# 4. 빌드
npm run build

# 5. Pages 배포
npx wrangler pages deploy dist --project-name w-campus-fresh
```

## 📊 현재 준비된 상태

✅ **로컬 개발 환경**: 완전 구축 완료  
✅ **데이터베이스 스키마**: 13개 테이블 + 기본 데이터  
✅ **빌드 시스템**: Vite + TypeScript 정상 작동  
✅ **배포 스크립트**: 자동화 완료  
⏳ **Cloudflare 인증**: API 토큰 설정 대기  

## 💡 참고사항

- API 토큰은 안전한 곳에 보관해주세요
- 토큰에는 최소 필요 권한만 부여하세요  
- 배포 후에는 토큰을 환경변수에서 제거할 수 있습니다

---

**API 토큰 설정이 완료되면 즉시 w-campus.com 배포가 가능합니다!** 🎯