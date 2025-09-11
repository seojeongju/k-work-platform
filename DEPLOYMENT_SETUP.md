# WOW-CAMPUS 도메인 연결 및 배포 가이드

## 🌐 현재 상태
- ✅ 로컬 개발 환경 완료 
- ✅ 새로운 D1 데이터베이스 구축 완료
- ✅ 프로젝트 빌드 및 실행 확인 완료
- **🔧 진행 중**: 도메인 w-campus.com 연결

## 📍 개발 서버 접속 정보
- **로컬 URL**: http://localhost:3000
- **공개 개발 URL**: https://3000-ir4edbqhzd4yutf3qnlj0-6532622b.e2b.dev
- **서버 상태**: 정상 운영 중 (PM2 관리)

## 🚀 Cloudflare Pages 배포를 위한 단계

### 1. Cloudflare API 토큰 설정 (필수)
```bash
# 환경변수로 설정
export CLOUDFLARE_API_TOKEN="your_token_here"

# 또는 wrangler 로그인
npx wrangler auth login
```

### 2. 새로운 D1 데이터베이스 생성 (프로덕션용)
```bash
# 새 프로덕션 DB 생성
npx wrangler d1 create w-campus-production-new

# 반환되는 database_id를 wrangler.toml에 추가
```

### 3. wrangler.toml 프로덕션 설정 업데이트
```toml
name = "w-campus"
compatibility_date = "2025-09-11"

[build]
command = "npm run build"

[vars]
SITE_NAME = "WOW-CAMPUS"
ENVIRONMENT = "production"

# Production D1 Database
[[d1_databases]]
binding = "DB"
database_name = "w-campus-production-new"
database_id = "여기에_실제_database_id_입력"
```

### 4. 프로덕션 DB 마이그레이션
```bash
# 프로덕션 DB에 마이그레이션 적용
npx wrangler d1 migrations apply w-campus-production-new

# 또는 SQL 직접 실행
npx wrangler d1 execute w-campus-production-new --file=./migrations/0001_fresh_start_schema.sql
```

### 5. Cloudflare Pages 프로젝트 생성
```bash
# Pages 프로젝트 생성
npx wrangler pages deploy dist --project-name w-campus

# 커스텀 도메인 연결 (Cloudflare Dashboard에서 진행)
```

### 6. 도메인 w-campus.com 연결 절차

#### A. Cloudflare Dashboard 설정
1. **Cloudflare Dashboard** → **Pages** → **w-campus 프로젝트**
2. **Custom domains** → **Set up a custom domain**
3. **도메인 입력**: `w-campus.com`, `www.w-campus.com`
4. **DNS 레코드 설정** 확인 (자동 생성됨)

#### B. 도메인 네임서버 설정
```
# w-campus.com의 네임서버를 Cloudflare로 변경
네임서버 1: xxx.ns.cloudflare.com
네임서버 2: yyy.ns.cloudflare.com
```

#### C. DNS 레코드 확인
```
Type: CNAME
Name: w-campus.com
Value: w-campus.pages.dev

Type: CNAME  
Name: www
Value: w-campus.pages.dev
```

## 🔧 배포 명령어

### 로컬 개발
```bash
# 로컬 DB 초기화 (필요시)
node init-local-db.cjs

# 프로젝트 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 status
pm2 logs --nostream
```

### 프로덕션 배포
```bash
# 빌드
npm run build

# Cloudflare Pages 배포
npx wrangler pages deploy dist --project-name w-campus

# DB 마이그레이션 (최초 배포시)
npx wrangler d1 migrations apply w-campus-production-new
```

## 📊 데이터베이스 구조

### 생성된 테이블
- **admins**: 관리자 계정
- **agents**: 외국인 에이전트
- **employers**: 구인 기업  
- **job_seekers**: 구직자
- **job_postings**: 구인 공고
- **job_applications**: 구직 지원
- **job_matches**: 매칭 시스템
- **study_programs**: 유학 과정
- **study_applications**: 유학 지원
- **visa_types**: 비자 정보
- **job_categories**: 직종 분류
- **regions**: 지역 정보

### 기본 데이터 포함
- ✅ 관리자 계정: admin@w-campus.com
- ✅ 기본 비자 유형 (D-4, E-7, F-2, F-4, H-2)
- ✅ 직종 분류 (IT, 제조업, 서비스업 등)
- ✅ 전국 지역 정보

## 🎯 다음 작업 계획

1. **Cloudflare API 토큰 설정**
2. **프로덕션 D1 DB 생성**  
3. **Cloudflare Pages 배포**
4. **도메인 연결 및 DNS 설정**
5. **SSL/HTTPS 설정 확인**
6. **성능 최적화 및 모니터링**

---

**개발 환경 준비 완료** ✅  
**도메인 연결 준비 대기** ⏳  
**프로덕션 배포 준비** 📦

모든 로컬 개발 환경이 완료되었으며, Cloudflare API 토큰만 있으면 즉시 프로덕션 배포가 가능합니다!