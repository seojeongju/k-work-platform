# 외국인 구인구직 플랫폼 (Foreign Job Matching Platform)

## 프로젝트 개요
- **이름**: 외국인 구인구직 플랫폼
- **목표**: 해외 에이전트와 국내 기업을 연결하여 외국인 인재의 한국 진출을 지원하는 종합 플랫폼
- **주요 기능**: 
  - 비자별/직종별/지역별 구인구직 매칭
  - 해외 에이전트별 구직자 관리 시스템
  - 한국어 연수 및 학위과정 유학 지원
  - 다국어 지원 (한국어/영어 기반)

## 🌐 접속 URL
- **메인 플랫폼**: https://3000-iuq2i6f6qrwh522u0d0ha-6532622b.e2b.dev
- **에이전트 대시보드**: https://3000-iuq2i6f6qrwh522u0d0ha-6532622b.e2b.dev/static/agent-dashboard.html?agentId=1

## 📊 데이터 아키텍처

### 데이터베이스 구조 (Cloudflare D1)
- **사용자 관리**: agents, employers, job_seekers 테이블
- **구인구직**: job_postings, job_applications 테이블
- **유학 지원**: study_programs, study_applications 테이블
- **메타데이터**: visa_types, job_categories, regions 테이블

### 핵심 데이터 모델
1. **에이전트 (agents)**: 해외 인력 에이전트 정보
2. **구인기업 (employers)**: 국내 채용 기업 정보
3. **구직자 (job_seekers)**: 외국인 구직자 정보
4. **구인공고 (job_postings)**: 채용 공고 정보
5. **유학프로그램 (study_programs)**: 한국 대학/기관 프로그램 정보

### 데이터 관계
- 에이전트 ↔ 구직자 (1:N)
- 기업 ↔ 구인공고 (1:N)
- 구직자 ↔ 지원내역 (1:N)
- 비자타입별/지역별/직종별 분류 체계

## 🎯 주요 기능 현황

### ✅ 완료된 기능
1. **메인 플랫폼**
   - 구인정보 조회 (비자별/직종별/지역별 필터링)
   - 유학프로그램 검색
   - 실시간 통계 대시보드
   - 반응형 UI (모바일 지원)

2. **에이전트 관리 시스템**
   - 구직자 등록/수정/삭제 기능
   - 에이전트별 구직자 현황 관리
   - 지원 현황 추적
   - 구인정보 매칭 기능

3. **API 엔드포인트**
   - 사용자 인증: `/api/auth/login`
   - 구인정보: `/api/jobs`, `/api/jobs/:id`
   - 유학프로그램: `/api/study-programs`
   - 에이전트 관리: `/api/agent/:id/job-seekers`
   - 지원 관리: `/api/applications/*`
   - 통계: `/api/stats`
   - 메타데이터: `/api/visa-types`, `/api/job-categories`, `/api/regions`

### 🔄 개발 중인 기능
1. **사용자 인증 강화**
   - JWT 토큰 기반 보안 인증
   - 비밀번호 암호화
   - 세션 관리

2. **고급 매칭 알고리즘**
   - AI 기반 구직자-구인공고 매칭
   - 추천 시스템

3. **알림 시스템**
   - 이메일/SMS 알림
   - 실시간 푸시 알림

### 📋 향후 개발 계획
1. **관리자 시스템**
   - 플랫폼 전체 관리 대시보드
   - 에이전트 승인 시스템
   - 통계 및 분석 도구

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
- **Styling**: Tailwind CSS
- **Icons**: FontAwesome
- **HTTP Client**: Axios
- **UI**: Responsive Design

### 개발 도구
- **Build Tool**: Vite
- **Process Manager**: PM2 (개발환경)
- **Database**: Local SQLite (--local mode)
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

# 데이터베이스 리셋
npm run db:reset

# PM2 로그 확인
pm2 logs --nostream

# 서버 재시작
pm2 restart job-platform

# Git 관리
npm run git:status
npm run git:commit "메시지"
```

## 👥 사용자 가이드

### 구직자용
1. 메인 페이지에서 구인정보 검색
2. 비자타입별 필터링으로 맞춤 검색
3. 유학프로그램 탐색 및 지원

### 에이전트용
1. 에이전트 대시보드 접속
2. 구직자 등록 및 관리
3. 구인정보 매칭 및 지원 관리
4. 통계 확인 및 성과 추적

### 기업용
1. 구인공고 등록 (API 통해)
2. 지원자 관리
3. 에이전트와의 협업

## 📈 배포 정보
- **플랫폼**: Cloudflare Workers/Pages (개발 준비 완료)
- **현재 상태**: ✅ 로컬 개발환경 활성
- **기술 스택**: Hono + TypeScript + Cloudflare D1 + TailwindCSS
- **마지막 업데이트**: 2025-08-25
- **데이터**: 샘플 데이터 포함 (에이전트 3명, 기업 3곳, 구직자 3명, 구인공고 3개, 유학프로그램 3개)

## 🔗 API 문서

### 인증
- `POST /api/auth/login` - 사용자 로그인

### 구인정보
- `GET /api/jobs` - 구인공고 목록 (필터링 지원)
- `GET /api/jobs/:id` - 구인공고 상세정보

### 유학프로그램
- `GET /api/study-programs` - 유학프로그램 목록

### 에이전트 관리
- `GET /api/agent/:id/job-seekers` - 에이전트별 구직자 목록
- `POST /api/agent/job-seekers` - 구직자 등록
- `PUT /api/agent/job-seekers/:id` - 구직자 정보 수정
- `DELETE /api/agent/job-seekers/:id` - 구직자 삭제

### 통계
- `GET /api/stats` - 플랫폼 전체 통계

### 메타데이터
- `GET /api/visa-types` - 비자 유형 목록
- `GET /api/job-categories` - 직종 분류 목록  
- `GET /api/regions` - 지역 정보 목록

---

**개발팀**: GenSpark AI Assistant  
**라이센스**: MIT  
**연락처**: 플랫폼 문의사항은 GitHub Issues를 통해 제출해주세요.