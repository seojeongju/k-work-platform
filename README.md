# WOW-CAMPUS - 외국인 구인구직 및 유학 플랫폼

## 프로젝트 개요
- **이름**: WOW-CAMPUS (World-Oriented Workforce Campus for International Professionals & Students)
- **목표**: 해외 에이전트와 국내 기업을 연결하여 외국인 인재의 한국 진출을 지원하는 종합 플랫폼
- **주요 기능**: 
  - 비자별/직종별/지역별 구인구직 매칭
  - 해외 에이전트별 구직자 관리 시스템
  - 한국어 연수 및 학위과정 유학 지원
  - K-work.or.kr 참조한 전문적이고 신뢰감 있는 디자인
  - 다국어 지원 (한국어/영어 기반)

## 🌐 접속 URL
- **메인 플랫폼**: https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev
- **에이전트 대시보드**: https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev/static/agent-dashboard.html?agentId=1
- **관리자 대시보드**: https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev/static/admin-dashboard.html
- **구인기업 대시보드**: https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev/static/employer-dashboard.html
- **구직자 프로필**: https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev/static/jobseeker-profile.html
- **GitHub**: (리포지토리 URL 업데이트 예정)

## 🎨 디자인 특징
- **K-work.or.kr 참조**: 정부기관 수준의 전문적이고 신뢰감 있는 UI/UX
- **색상 스킴**: 차분한 블루 계열 (WOW-CAMPUS Blue #1E40AF)
- **타이포그래피**: 가독성 높은 산세리프체
- **레이아웃**: 직관적이고 깔끔한 구조
- **사용자 경험**: 국제학생 친화적 접근성

## 📊 데이터 아키텍처

### 데이터베이스 구조 (Cloudflare D1)
- **사용자 관리**: agents, employers, job_seekers 테이블 (status, temp_password 컬럼 포함)
- **구인구직**: job_postings, job_applications 테이블
- **유학 지원**: study_programs, study_applications 테이블
- **매칭 시스템**: job_matches 테이블
- **컨텐츠 관리**: notices, faqs, policies 테이블
- **메타데이터**: visa_types, job_categories, regions 테이블
- **마이그레이션**: 0001_initial_schema.sql, 0002_add_temp_password_column.sql

### 핵심 데이터 모델
1. **에이전트 (agents)**: 해외 인력 에이전트 정보
2. **구인기업 (employers)**: 국내 채용 기업 정보
3. **구직자 (job_seekers)**: 외국인 구직자 정보
4. **구인공고 (job_postings)**: 채용 공고 정보
5. **유학프로그램 (study_programs)**: 한국 대학/기관 프로그램 정보
6. **매칭결과 (job_matches)**: AI 기반 매칭 결과

### 데이터 관계
- 에이전트 ↔ 구직자 (1:N)
- 기업 ↔ 구인공고 (1:N)
- 구직자 ↔ 지원내역 (1:N)
- 구직자 ↔ 매칭결과 (1:N)
- 비자타입별/지역별/직종별 분류 체계

## 🎯 주요 기능 현황

### ✅ 완료된 기능
1. **메인 플랫폼 (WOW-CAMPUS 브랜딩)**
   - K-work 스타일의 전문적인 디자인
   - Hero 섹션과 그라디언트 배경
   - 3단계 이용절차 안내
   - 구인정보 조회 (비자별/직종별/지역별 필터링)
   - 유학프로그램 검색 및 상세 정보
   - 실시간 통계 대시보드
   - 반응형 UI (모바일 지원)

2. **관리자 시스템 (신규 구현)**
   - **사용자 승인/차단 시스템**: 모든 회원가입 시 관리자 승인 필요
   - **임시 패스워드 발급**: 사용자별 6자리 임시 패스워드 생성 및 복사 기능
   - **사용자 상태 관리**: pending/approved/blocked/suspended 상태 제어
   - **통합 사용자 관리**: 구인기업/에이전트/구직자 통합 관리 대시보드
   - **실시간 통계**: 사용자 수, 승인 대기, 활성 공고 등 실시간 모니터링
   - **컨텐츠 관리 시스템**: 공지사항, FAQ, 정책 문서 통합 관리
   - 관리자 접속: `https://3000-itsb6umxcoqmg7u4mkim7-6532622b.e2b.dev/static/admin-dashboard.html`

3. **권한별 사용자 시스템**
   - **로그인 상태에 따른 동적 메뉴**: 사용자 유형별 맞춤 메뉴 표시
   - **구인기업 대시보드**: 내 구인공고 관리, 지원자 관리, 매칭 결과
   - **구직자 프로필 관리**: 프로필 완성도, 지원 내역, 맞춤 추천
   - **에이전트 관리 시스템**: 구직자/유학생 통합 관리
   - **권한별 페이지 라우팅**: 사용자 유형에 따른 적절한 페이지 이동
   - **회원가입 승인 시스템**: 모든 신규 가입자는 pending 상태로 시작, 관리자 승인 필요

4. **구인기업 전용 기능**
   - 구인공고 등록/수정/삭제
   - 지원자 관리 및 상태 업데이트
   - AI 매칭 결과 확인
   - 구인 통계 및 성과 분석
   - `/static/employer-dashboard.html` 전용 대시보드

5. **구직자 전용 기능**
   - 프로필 완성도 체크 및 관리
   - 지원 내역 추적 및 관리
   - 맞춤형 구인공고 추천
   - AI 매칭 결과 확인
   - `/static/jobseeker-profile.html` 전용 프로필 페이지

6. **에이전트 관리 시스템**
   - 구직자 등록/수정/삭제 기능
   - 에이전트별 구직자 현황 관리
   - 지원 현황 추적
   - 구인정보 매칭 기능

7. **스마트 매칭 시스템**
   - AI 기반 매칭 점수 계산
   - 비자/직종/지역/한국어수준/급여 매칭
   - 완벽매칭/좋은매칭/보통매칭 분류
   - 매칭 이유 자동 생성

8. **API 엔드포인트 (40개+)**
   - 사용자 인증: `/api/auth/*`
   - 구인정보: `/api/jobs`, `/api/jobs/:id` (PUT/DELETE 추가)
   - 구직자: `/api/job-seekers`, `/api/job-seekers/:id` (PUT 추가)
   - 구인기업 전용: `/api/employers/:id/*` (jobs, applications, matches)
   - 구직자 전용: `/api/job-seekers/:id/*` (applications, matches)
   - 추천 시스템: `/api/jobs/recommended/:jobSeekerId`
   - 지원 시스템: `/api/applications` (POST/DELETE)
   - 에이전트 관리: `/api/agent/:id/*`
   - 매칭 시스템: `/api/matching/*`
   - 통계: `/api/stats`
   - 메타데이터: `/api/visa-types`, `/api/job-categories`, `/api/regions`
   - 관리자: `/api/admin/users/*`, `/api/admin/stats`, `/api/admin/users/:id/temp-password`

### 🔄 개발 중인 기능
1. **사용자 인증 강화**
   - JWT 토큰 기반 보안 인증
   - 구글 OAuth 연동
   - 비밀번호 암호화
   - 세션 관리

2. **고급 기능**
   - 메시지 시스템
   - 알림 시스템
   - 파일 업로드 (이력서, 증명서)
   - 평가 시스템

3. **권한별 추가 기능**
   - 구직자 지원 이력 상세 페이지 (`/static/application-history.html`)
   - 구인기업 구인공고 등록 전용 페이지 (`/static/job-register.html`)
   - 에이전트 관리 기능 강화
   - 관리자 시스템 구축

### 📋 향후 개발 계획
1. **관리자 시스템 고도화**
   - 벌크 사용자 상태 변경 기능
   - 사용자별 활동 로그 추적
   - 고급 통계 및 분석 도구
   - 이메일 알림 시스템

2. **모바일 앱**
   - React Native 기반 모바일 앱
   - 푸시 알림 지원

3. **결제 시스템**
   - 에이전트 수수료 관리
   - 프리미엄 서비스

4. **다국어 확장**
   - 베트남어, 태국어, 필리핀어 지원
   - 자동 번역 기능

## 🛠 기술 스택

### 백엔드
- **Framework**: Hono (TypeScript)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Development**: Wrangler CLI + PM2

### 프론트엔드
- **Core**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS (WOW-CAMPUS 커스텀 색상)
- **Icons**: FontAwesome
- **HTTP Client**: Axios
- **UI**: Responsive Design with K-work inspired UX

### 개발 도구
- **Build Tool**: Vite
- **Process Manager**: PM2 (개발환경)
- **Database**: Local SQLite (--local mode) + Migration System
- **Authentication**: JWT + Hash (SHA-256)
- **Version Control**: Git

## 🚀 개발 환경 설정

### 로컬 개발 시작
```bash
# 의존성 설치
npm install

# 로컬 D1 데이터베이스 마이그레이션
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 프로젝트 빌드
npm run build

# PM2로 개발 서버 시작
pm2 start ecosystem.config.cjs

# 서버 상태 확인
curl http://localhost:3000/api/stats
```

### 유용한 명령어
```bash
# 포트 정리
npm run clean-port

# 데이터베이스 관리
npm run db:reset
npm run db:migrate:local
npm run db:seed

# 관리자 API 테스트
curl -X GET "http://localhost:3000/api/admin/users/employers" \
  -H "Authorization: Bearer token_1_admin"

curl -X POST "http://localhost:3000/api/admin/users/1/temp-password" \
  -H "Authorization: Bearer token_1_admin" \
  -H "Content-Type: application/json" \
  -d '{"userType": "employer"}'

# PM2 관리
pm2 logs --nostream
pm2 restart job-platform
pm2 list

# Git 관리
npm run git:status
npm run git:commit "메시지"
```

## 👥 사용자 가이드

### 구직자용
1. **비로그인**: WOW-CAMPUS 메인 페이지에서 구인정보 검색 (제한적)
2. **로그인 후**: 
   - "구직정보" 메뉴 → "내 프로필 관리"로 자동 이동
   - 프로필 완성도 확인 및 정보 수정
   - 맞춤형 구인공고 추천 받기
   - 지원 내역 관리 및 매칭 결과 확인
3. 비자타입별 필터링으로 맞춤 검색
4. 유학프로그램 탐색 및 지원

### 구인기업용
1. **비로그인**: 일반 구인정보 등록 폼 사용
2. **로그인 후**:
   - "구인정보" 메뉴 → "내 구인정보 관리"로 자동 이동
   - 구인기업 전용 대시보드에서 통합 관리
   - 구인공고 등록/수정/삭제
   - 지원자 관리 및 상태 업데이트
   - AI 매칭 결과 및 통계 확인

### 에이전트용
1. 에이전트 대시보드 접속 (기존 기능 유지)
2. 구직자/유학생 등록 및 관리
3. 스마트 매칭 시스템으로 구인정보 매칭
4. 지원 현황 추적 및 관리
5. 통계 확인 및 성과 추적

### 관리자용
1. **접속**: `/static/admin-dashboard.html` (자동 관리자 토큰 설정)
2. **주요 기능**:
   - **사용자 관리**: 구인기업/에이전트/구직자 통합 조회 및 상태 관리
   - **승인 시스템**: pending → approved/blocked 상태 변경
   - **임시 패스워드**: 6자리 랜덤 패스워드 발급 및 클립보드 복사
   - **통계 대시보드**: 실시간 사용자 수, 승인 대기 현황
   - **컨텐츠 관리**: 공지사항, FAQ, 정책 문서 편집
3. **사용자 상세 정보**: 클릭으로 상세 프로필 확인 및 관리
4. **벌크 작업**: 다중 사용자 상태 일괄 변경

### 권한별 메뉴 시스템
- **비로그인**: 기본 정보 보기, 회원가입 유도
- **구직자**: 프로필 관리 중심, 추천 및 지원 기능
- **구인기업**: 구인공고 관리 중심, 지원자 관리 기능
- **에이전트**: 통합 관리 기능, 매칭 및 관리 도구
- **관리자**: 전체 플랫폼 관리, 사용자 승인/차단, 임시 패스워드 발급

## 📈 배포 정보
- **플랫폼**: Cloudflare Workers/Pages (개발 준비 완료)
- **현재 상태**: ✅ 로컬 개발환경 활성 (WOW-CAMPUS 브랜딩 완료)
- **기술 스택**: Hono + TypeScript + Cloudflare D1 + TailwindCSS
- **디자인**: K-work.or.kr 참조한 전문적 UI/UX
- **마지막 업데이트**: 2025-09-01 (관리자 시스템 및 사용자 승인 시스템 구축 완료)
- **데이터**: 샘플 데이터 포함 (에이전트 3명, 기업 3곳, 구직자 3명, 구인공고 3개, 유학프로그램 3개)

## 🔗 API 문서

### 인증 API
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/register/employer` - 기업 회원가입
- `POST /api/auth/register/jobseeker` - 구직자 회원가입
- `POST /api/auth/register/agent` - 에이전트 회원가입
- `POST /api/auth/google` - 구글 OAuth 인증
- `GET /api/auth/verify` - 로그인 상태 확인

### 구인정보 API
- `GET /api/jobs` - 구인공고 목록 (필터링 지원)
- `GET /api/jobs/:id` - 구인공고 상세정보 (인증 필요)
- `POST /api/jobs` - 구인공고 등록

### 구직자 API
- `GET /api/job-seekers` - 구직자 목록 (필터링 지원)
- `GET /api/job-seekers/:id` - 구직자 상세정보 (인증 필요)
- `POST /api/job-seekers` - 구직자 등록
- `POST /api/job-seekers/register` - 구직자 직접 회원가입

### 유학프로그램 API
- `GET /api/study-programs` - 유학프로그램 목록

### 에이전트 관리 API
- `GET /api/agents/:id/students` - 에이전트별 유학생 목록
- `GET /api/agents/:id/jobseekers` - 에이전트별 구직자 목록
- `POST /api/agents/:id/register-student` - 유학생/구직자 등록
- `GET /api/agent/:id/job-seekers` - 에이전트별 구직자 목록
- `POST /api/agent/job-seekers` - 구직자 등록
- `PUT /api/agent/job-seekers/:id` - 구직자 정보 수정
- `DELETE /api/agent/job-seekers/:id` - 구직자 삭제

### 매칭 시스템 API
- `POST /api/matching/generate` - 매칭 생성
- `GET /api/matching/results` - 매칭 결과 조회
- `GET /api/matching/stats` - 매칭 통계
- `GET /api/job-seekers/:id/matches` - 구직자별 매칭 결과

### 통계 API
- `GET /api/stats` - 플랫폼 전체 통계

### 메타데이터 API
- `GET /api/visa-types` - 비자 유형 목록
- `GET /api/job-categories` - 직종 분류 목록  
- `GET /api/regions` - 지역 정보 목록

### 관리자 API (신규)
- `GET /api/admin/users/:userType` - 사용자 목록 조회 (employers/agents/jobseekers)
- `GET /api/admin/stats` - 관리자 대시보드 통계 정보
- `PUT /api/admin/users/:id/status` - 사용자 상태 변경 (pending/approved/blocked/suspended)
- `POST /api/admin/users/:id/temp-password` - 임시 패스워드 발급 (6자리 랜덤)
- `PUT /api/admin/users/bulk-status` - 벌크 사용자 상태 변경
- `GET /api/admin/notices` - 공지사항 목록
- `POST /api/admin/notices` - 공지사항 등록
- `PUT /api/admin/notices/:id` - 공지사항 수정
- `DELETE /api/admin/notices/:id` - 공지사항 삭제

## 🎯 WOW-CAMPUS 브랜딩 특징

### 디자인 철학
- **신뢰감**: 정부기관 수준의 전문성
- **접근성**: 국제학생 친화적 인터페이스
- **직관성**: 명확한 사용자 플로우
- **현대성**: 깔끔하고 모던한 디자인

### 색상 시스템
- **Primary**: WOW-CAMPUS Blue (#1E40AF) - 신뢰감과 전문성
- **Secondary**: Light Blue (#3B82F6) - 친근함과 현대성
- **Accent**: Green (#059669) - 성장과 기회
- **Background**: Light Gray (#F8FAFC) - 깔끔함과 가독성

### UI/UX 개선사항
- Hero 섹션의 그라디언트 배경
- 카드 기반 정보 구성
- 3단계 이용절차 시각화
- 반응형 네비게이션
- 전문적인 푸터 구성

---

**개발팀**: GenSpark AI Assistant  
**라이센스**: MIT  
**연락처**: 플랫폼 문의사항은 GitHub Issues를 통해 제출해주세요.

**WOW-CAMPUS**: World-Oriented Workforce Campus for International Professionals & Students - 외국인의 꿈이 현실이 되는 곳