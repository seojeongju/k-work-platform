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
- **메인 플랫폼**: https://3000-iz905ai991ifyhm1e8zt5-6532622b.e2b.dev
- **에이전트 대시보드**: https://3000-iz905ai991ifyhm1e8zt5-6532622b.e2b.dev/static/agent-dashboard.html?agentId=1
- **GitHub**: (리포지토리 URL 업데이트 예정)

## 🎨 디자인 특징
- **K-work.or.kr 참조**: 정부기관 수준의 전문적이고 신뢰감 있는 UI/UX
- **색상 스킴**: 차분한 블루 계열 (WOW-CAMPUS Blue #1E40AF)
- **타이포그래피**: 가독성 높은 산세리프체
- **레이아웃**: 직관적이고 깔끔한 구조
- **사용자 경험**: 국제학생 친화적 접근성

## 📊 데이터 아키텍처

### 데이터베이스 구조 (Cloudflare D1)
- **사용자 관리**: agents, employers, job_seekers 테이블
- **구인구직**: job_postings, job_applications 테이블
- **유학 지원**: study_programs, study_applications 테이블
- **매칭 시스템**: job_matches 테이블
- **메타데이터**: visa_types, job_categories, regions 테이블

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

2. **에이전트 관리 시스템**
   - 구직자 등록/수정/삭제 기능
   - 에이전트별 구직자 현황 관리
   - 지원 현황 추적
   - 구인정보 매칭 기능

3. **스마트 매칭 시스템**
   - AI 기반 매칭 점수 계산
   - 비자/직종/지역/한국어수준/급여 매칭
   - 완벽매칭/좋은매칭/보통매칭 분류
   - 매칭 이유 자동 생성

4. **API 엔드포인트 (26개)**
   - 사용자 인증: `/api/auth/*`
   - 구인정보: `/api/jobs`, `/api/jobs/:id`
   - 구직자: `/api/job-seekers`, `/api/job-seekers/:id`
   - 유학프로그램: `/api/study-programs`
   - 에이전트 관리: `/api/agent/:id/*`
   - 매칭 시스템: `/api/matching/*`
   - 통계: `/api/stats`
   - 메타데이터: `/api/visa-types`, `/api/job-categories`, `/api/regions`

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
- **Styling**: Tailwind CSS (WOW-CAMPUS 커스텀 색상)
- **Icons**: FontAwesome
- **HTTP Client**: Axios
- **UI**: Responsive Design with K-work inspired UX

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
1. WOW-CAMPUS 메인 페이지에서 구인정보 검색
2. 비자타입별 필터링으로 맞춤 검색
3. 유학프로그램 탐색 및 지원
4. 3단계 간편 이용절차 따라 시작

### 에이전트용
1. 에이전트 대시보드 접속
2. 구직자/유학생 등록 및 관리
3. 스마트 매칭 시스템으로 구인정보 매칭
4. 지원 현황 추적 및 관리
5. 통계 확인 및 성과 추적

### 기업용
1. 구인공고 등록 (API 또는 웹 인터페이스)
2. 지원자 관리 및 매칭 결과 확인
3. 에이전트와의 협업

## 📈 배포 정보
- **플랫폼**: Cloudflare Workers/Pages (개발 준비 완료)
- **현재 상태**: ✅ 로컬 개발환경 활성 (WOW-CAMPUS 브랜딩 완료)
- **기술 스택**: Hono + TypeScript + Cloudflare D1 + TailwindCSS
- **디자인**: K-work.or.kr 참조한 전문적 UI/UX
- **마지막 업데이트**: 2025-08-26 (WOW-CAMPUS 리브랜딩)
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