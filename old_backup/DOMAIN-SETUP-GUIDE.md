# 🌐 커스텀 도메인 연결 가이드

이 문서는 로컬 개발이 완료된 후 w-campus.com 도메인을 Cloudflare Pages에 연결하는 방법을 설명합니다.

## 📋 사전 요구사항

- ✅ 로컬 개발 완료
- ✅ Cloudflare Pages 배포 성공 (https://w-campus.pages.dev)
- ✅ w-campus.com 도메인 소유
- ✅ Cloudflare에서 도메인 관리

## 🚀 도메인 연결 단계

### 1단계: Cloudflare DNS 설정

1. **Cloudflare 대시보드** 접속
   - https://dash.cloudflare.com 로그인
   - w-campus.com 도메인 선택

2. **DNS 레코드 추가**
   ```
   Type: CNAME
   Name: www
   Target: w-campus.pages.dev
   
   Type: CNAME  
   Name: @
   Target: w-campus.pages.dev
   ```

### 2단계: Cloudflare Pages에서 커스텀 도메인 추가

1. **Pages 대시보드 접속**
   - https://dash.cloudflare.com/pages
   - w-campus 프로젝트 선택

2. **커스텀 도메인 추가**
   - "Custom domains" 탭 클릭
   - "Set up a custom domain" 클릭
   - 도메인 입력: `w-campus.com`
   - "Continue" 클릭하여 설정 완료

3. **www 서브도메인 추가** (선택사항)
   - 같은 방식으로 `www.w-campus.com` 추가

### 3단계: 설정 파일 업데이트

도메인 연결 후 다음 파일들을 업데이트하세요:

#### wrangler.jsonc
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "w-campus",
  "compatibility_date": "2025-08-25",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "DOMAIN_NAME": "w-campus.com",
    "SITE_NAME": "WOW-CAMPUS",
    "ENVIRONMENT": "production"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "w-campus-production",
      "database_id": "35e76aa0-0043-4008-9a96-8546ac02b99c"
    }
  ],
  "routes": [
    "w-campus.com/*",
    "www.w-campus.com/*"
  ]
}
```

#### GitHub Actions 워크플로우 업데이트
`.github/workflows/auto-deploy.yml`에서 건강 확인 URL을 업데이트:
```yaml
- name: Deployment Health Check
  run: |
    echo "🔗 Live URL: https://w-campus.com"
    # 기존 pages.dev URL 대신 커스텀 도메인 사용
```

### 4단계: 환경 변수 업데이트

#### .env.production (새로 생성)
```env
VITE_APP_NAME=WOW-CAMPUS
VITE_APP_ENVIRONMENT=production
VITE_APP_URL=https://w-campus.com
VITE_API_BASE_URL=https://w-campus.com
```

#### Cloudflare Pages 환경 변수
Pages 대시보드에서 Environment variables 설정:
- `DOMAIN_NAME`: `w-campus.com`
- `ENVIRONMENT`: `production`

### 5단계: SSL/TLS 설정 확인

1. **SSL/TLS 설정 확인**
   - Cloudflare 대시보드 → SSL/TLS 탭
   - "Full (strict)" 모드 권장

2. **Always Use HTTPS 활성화**
   - SSL/TLS → Edge Certificates
   - "Always Use HTTPS" 옵션 켜기

### 6단계: 검증 및 테스트

#### 자동 검증 스크립트 실행
```bash
npm run domain:verify
```

#### 수동 확인
1. **DNS 전파 확인**
   ```bash
   nslookup w-campus.com
   dig w-campus.com
   ```

2. **HTTP/HTTPS 접근 확인**
   ```bash
   curl -I https://w-campus.com
   curl -I https://www.w-campus.com
   ```

3. **리디렉션 확인**
   - http://w-campus.com → https://w-campus.com
   - https://www.w-campus.com → https://w-campus.com

## 🔧 도메인 연결 스크립트

도메인 연결 완료 후 실행할 스크립트를 추가해보세요:

#### package.json에 스크립트 추가
```json
{
  "scripts": {
    "domain:setup": "node scripts/domain-setup.cjs",
    "domain:verify": "node scripts/domain-verify.cjs",
    "deploy:production": "npm run build && wrangler pages deploy dist --project-name w-campus --compatibility-date=2025-08-25"
  }
}
```

## ⚠️ 주의사항

1. **DNS 전파 시간**: 변경사항이 전 세계에 전파되는데 최대 48시간 소요
2. **SSL 인증서**: Cloudflare에서 자동으로 발급 (몇 분 ~ 24시간)
3. **캐시 정리**: 도메인 변경 후 브라우저 캐시 및 CDN 캐시 정리 필요

## 🆘 문제 해결

### 일반적인 문제들

1. **"Domain not found" 오류**
   - DNS 레코드가 올바르게 설정되었는지 확인
   - DNS 전파 상태 확인: https://dnschecker.org

2. **SSL 인증서 오류**
   - Cloudflare SSL 설정이 "Full (strict)"인지 확인
   - 몇 시간 후 다시 시도

3. **리디렉션 무한 루프**
   - Cloudflare SSL 모드를 "Full" 또는 "Full (strict)"로 변경

### 도움 리소스

- [Cloudflare Pages 커스텀 도메인 공식 문서](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [DNS 설정 가이드](https://developers.cloudflare.com/dns/)
- [SSL/TLS 설정 가이드](https://developers.cloudflare.com/ssl/)

## 📈 성능 최적화 (도메인 연결 후)

도메인 연결 완료 후 다음 최적화를 고려하세요:

1. **CDN 설정 최적화**
2. **브라우저 캐시 정책 설정**  
3. **이미지 최적화**
4. **Gzip/Brotli 압축 활성화**
5. **보안 헤더 설정**

---

💡 **팁**: 도메인 연결 전에 https://w-campus.pages.dev에서 충분히 테스트를 완료하세요!