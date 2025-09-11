# Cloudflare Pages 자동배포 설정 가이드

## 🚀 GitHub Actions를 통한 자동배포 설정

### 1단계: Cloudflare API 토큰 생성

1. [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) 접속
2. "Create Token" 클릭
3. "Custom token" 선택
4. 다음 권한 설정:
   ```
   Account - Cloudflare Pages:Edit
   Zone - Page Rules:Edit
   Zone - Zone Settings:Edit
   Zone - Zone:Read
   ```
5. Account Resources: `Include - All accounts`
6. Zone Resources: `Include - All zones`
7. 토큰 생성 후 복사 (다시 볼 수 없음!)

### 2단계: Cloudflare Account ID 확인

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. 오른쪽 사이드바에서 Account ID 복사

### 3단계: GitHub Secrets 설정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 Secret들 추가:
   ```
   CLOUDFLARE_API_TOKEN: [1단계에서 생성한 토큰]
   CLOUDFLARE_ACCOUNT_ID: [2단계에서 확인한 Account ID]
   ```

### 4단계: 배포 테스트

1. 아무 파일이나 수정 후 커밋 & 푸시
2. GitHub Actions 탭에서 워크플로우 실행 확인
3. 성공 시 자동으로 https://w-campus.com에 배포됨

## 🔧 문제 해결

### 일반적인 문제들

1. **API Token 권한 부족**
   - Cloudflare Pages:Edit 권한 확인
   - Account와 Zone 리소스 접근 권한 확인

2. **Project Name 불일치**
   - Cloudflare Pages 대시보드에서 실제 프로젝트명 확인
   - 워크플로우 파일의 `projectName` 수정

3. **빌드 실패**
   - `npm run build` 로컬에서 테스트
   - package.json의 빌드 스크립트 확인

### 수동 배포 (백업 방법)

로컬에서 직접 배포:
```bash
# API 토큰 설정 (임시)
export CLOUDFLARE_API_TOKEN="your_token_here"

# 빌드 & 배포
npm run build
npx wrangler pages deploy dist --project-name w-campus
```

## 📞 추가 도움

- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [GitHub Actions Cloudflare Pages](https://github.com/marketplace/actions/cloudflare-pages-github-action)