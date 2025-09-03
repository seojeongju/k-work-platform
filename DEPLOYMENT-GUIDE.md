# 🚀 WOW-CAMPUS 배포 가이드

## w-campus.com 도메인 배포 절차

### 1. 사전 준비사항

#### Cloudflare 설정
1. **Cloudflare 계정 준비**
   - w-campus.com 도메인이 Cloudflare에서 관리되고 있어야 함
   - DNS 레코드가 올바르게 설정되어 있어야 함

2. **Wrangler CLI 인증**
   ```bash
   npx wrangler login
   ```

### 2. 데이터베이스 설정

#### Production 데이터베이스 생성
```bash
# D1 데이터베이스 생성
npx wrangler d1 create w-campus-production

# wrangler.jsonc의 database_id 업데이트 (Cloudflare에서 제공하는 ID로)
```

#### 마이그레이션 실행
```bash
# Production 데이터베이스 마이그레이션
npm run db:migrate:prod

# 기본 데이터 삽입 (선택사항)
npx wrangler d1 execute w-campus-production --file=./test-accounts.sql
```

### 3. 환경 변수 설정

#### Cloudflare Pages 환경 변수
Cloudflare Dashboard에서 설정:
```
DOMAIN_NAME=w-campus.com
SITE_NAME=WOW-CAMPUS
ENVIRONMENT=production
JWT_SECRET=your-secure-jwt-secret-here
```

### 4. 도메인 연결

#### DNS 설정 확인
```
Type: CNAME
Name: www
Value: w-campus-com.pages.dev

Type: CNAME  
Name: @
Value: w-campus-com.pages.dev
```

### 5. 배포 실행

#### 프로덕션 배포
```bash
# 프로젝트 빌드 및 배포
npm run deploy:domain

# 또는 수동 배포
npm run build
npx wrangler pages deploy dist --project-name w-campus-com --compatibility-date=2025-08-25
```

### 6. 배포 후 확인사항

#### 기능 테스트
1. **웹사이트 접속 확인**
   ```bash
   curl -I https://w-campus.com
   curl -I https://www.w-campus.com
   ```

2. **헬스체크 확인**
   ```bash
   curl https://w-campus.com/health
   ```

3. **API 테스트**
   ```bash
   curl https://w-campus.com/api/system/status
   ```

#### SSL 및 보안 확인
- [ ] HTTPS 리다이렉트 작동 확인
- [ ] SSL 인증서 유효성 확인
- [ ] 보안 헤더 확인 (Security Headers 스캔)

### 7. 성능 및 SEO 최적화

#### 성능 테스트
- Google PageSpeed Insights
- GTmetrix
- WebPageTest

#### SEO 설정
- Google Search Console 등록
- 사이트맵 제출
- robots.txt 확인

### 8. 모니터링 설정

#### Cloudflare Analytics
- Real User Monitoring (RUM) 활성화
- Bot Management 설정
- Rate Limiting 규칙 적용

#### 로그 모니터링
```bash
# 실시간 로그 확인
npx wrangler pages deployment tail --project-name w-campus-com
```

### 9. 백업 및 복구

#### 데이터베이스 백업
```bash
# 정기 백업
npm run db:backup

# 수동 백업
npx wrangler d1 export w-campus-production --output=./backup-$(date +%Y%m%d-%H%M%S).sql
```

### 10. 트러블슈팅

#### 일반적인 문제해결
1. **도메인 연결 문제**
   - DNS 전파 시간 (최대 48시간) 확인
   - Cloudflare DNS 설정 재확인

2. **데이터베이스 연결 오류**
   - wrangler.jsonc의 database_id 확인
   - 마이그레이션 상태 확인

3. **빌드 오류**
   - 의존성 설치 확인: `npm install`
   - TypeScript 오류 확인

### 📞 지원 및 문의

배포 중 문제가 발생하면:
1. GitHub Issues 등록
2. Cloudflare 문서 참조
3. Wrangler CLI 도움말: `npx wrangler --help`

### 🔄 지속적 통합/배포 (CI/CD)

향후 GitHub Actions를 통한 자동 배포 설정 권장:
- 코드 푸시 시 자동 테스트
- 마스터 브랜치 병합 시 자동 배포
- 데이터베이스 마이그레이션 자동화