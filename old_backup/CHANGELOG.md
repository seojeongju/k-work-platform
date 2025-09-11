# 변경 이력

WOW-CAMPUS 플랫폼의 모든 주요 변경사항이 이 파일에 문서화됩니다.

## [Unreleased]

### 추가됨
- GitHub Pages 미리보기 기능 지원
- 프로젝트 홈페이지 (index.html) 추가
- GitHub Actions 배포 워크플로우 설정
- 기여 가이드라인 (CONTRIBUTING.md) 작성
- Pull Request 템플릿 추가

### 개선됨
- README.md 프로젝트 설명 개선
- 프로젝트 구조 문서화

## [1.0.0] - 2025-08-26

### WOW-CAMPUS 리브랜딩 완료

#### 추가됨
- **브랜딩**: WOW-CAMPUS (World-Oriented Workforce Campus) 브랜드 정체성 확립
- **디자인 시스템**: K-work.or.kr 참조한 전문적이고 신뢰감 있는 UI/UX
- **색상 체계**: WOW-CAMPUS Blue (#1E40AF) 중심의 브랜드 컬러
- **메인 플랫폼**: Hero 섹션, 3단계 이용절차, 실시간 통계 대시보드
- **스마트 매칭 시스템**: AI 기반 매칭 알고리즘 (완벽/좋은/보통매칭)
- **에이전트 관리 시스템**: 구직자 등록/수정/삭제, 지원 현황 추적
- **유학 프로그램**: 한국어 연수 및 학위과정 정보 제공

#### API 엔드포인트 (26개)
- 사용자 인증: `/api/auth/*` (6개)
- 구인정보: `/api/jobs/*` (3개)
- 구직자: `/api/job-seekers/*` (4개)
- 에이전트 관리: `/api/agent/*` (5개)
- 매칭 시스템: `/api/matching/*` (4개)
- 통계 및 메타데이터: `/api/stats`, `/api/visa-types` 등 (4개)

#### 데이터 모델
- **사용자**: agents, employers, job_seekers
- **구인구직**: job_postings, job_applications, job_matches
- **유학**: study_programs, study_applications
- **메타데이터**: visa_types, job_categories, regions

#### 기술 스택
- **백엔드**: Hono + TypeScript + Cloudflare Workers + D1
- **프론트엔드**: HTML5 + TailwindCSS + FontAwesome + Axios
- **개발도구**: Vite + PM2 + Wrangler CLI

## [0.1.0] - 2025-08-25

### 초기 프로젝트 설정

#### 추가됨
- 프로젝트 초기 구조 설정
- Cloudflare Workers + D1 데이터베이스 연동
- 기본 API 라우트 구성
- 로컬 개발 환경 설정 (PM2, Wrangler)

#### 기술적 기반
- Hono 프레임워크 도입
- TypeScript 타입 안전성 확보
- SQLite 기반 D1 데이터베이스 스키마 설계
- Vite 빌드 시스템 구성

---

## 범례

- `추가됨`: 새로운 기능
- `개선됨`: 기존 기능의 개선
- `수정됨`: 버그 수정
- `제거됨`: 삭제된 기능
- `보안`: 보안 관련 변경사항
- `사용 중단`: 곧 제거될 예정인 기능

## 버전 관리

이 프로젝트는 [Semantic Versioning](https://semver.org/) 규칙을 따릅니다:
- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 새로운 기능
- **PATCH**: 하위 호환되는 버그 수정