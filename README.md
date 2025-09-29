# 🎓 WOW-CAMPUS 외국인 구인구직 및 유학생 지원 플랫폼

[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://w-campus.com)
[![Security](https://img.shields.io/badge/security-enhanced-blue)](#-보안)
[![Cloudflare](https://img.shields.io/badge/powered%20by-Cloudflare-orange)](https://www.cloudflare.com/)

## 🌐 **라이브 사이트**
- **메인 도메인**: https://w-campus.com
- **관리자 대시보드**: https://w-campus.com/static/admin-dashboard.html

---

## 🎯 **프로젝트 개요**

WOW-CAMPUS는 외국인 구직자와 한국 기업을 연결하는 전문 플랫폼입니다.

### 주요 기능
- 🔍 **스마트 매칭**: AI 기반 구인구직 매칭
- 🎓 **유학 지원**: 어학연수부터 학위과정까지 체계적 지원
- 🤝 **에이전트 관리**: 해외 에이전트 네트워크 관리
- 📊 **실시간 통계**: 플랫폼 운영 현황 모니터링

---

## 🚀 **기술 스택**

### Frontend
- **Framework**: Hono.js + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend & Infrastructure
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages
- **CDN**: Cloudflare CDN

### Security
- **Authentication**: JWT + PBKDF2
- **Rate Limiting**: 15분당 100요청
- **Security Headers**: CSP, XSS Protection
- **Input Validation**: Comprehensive sanitization

---

## 📋 **설치 및 실행**

### 1. 저장소 클론
```bash
git clone https://github.com/seojeongju/k-work-platform.git
cd k-work-platform
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경변수 설정
```bash
# 환경변수 파일 복사
cp .env.example .env.local

# 필요한 값들을 설정
nano .env.local
```

### 4. 데이터베이스 마이그레이션
```bash
# 로컬 D1 데이터베이스 마이그레이션
npm run db:migrate:local

# 시드 데이터 추가
npm run db:seed
```

### 5. 개발 서버 실행
```bash
# Vite 개발 서버
npm run dev

# 또는 Cloudflare Pages 개발 환경
npm run dev:sandbox
```

---

## 📁 **프로젝트 구조**

```
w-campus/
├── src/
│   ├── index.tsx          # 메인 애플리케이션
│   ├── logger.ts          # 로깅 유틸리티
│   └── renderer.tsx       # 렌더링 엔진
├── public/
│   └── static/            # 정적 HTML/JS 파일들
├── migrations/            # D1 데이터베이스 마이그레이션
├── .env.example          # 환경변수 템플릿
├── wrangler.toml         # Cloudflare 설정
├── vite.config.ts        # Vite 빌드 설정
└── package.json
```

---

## 🔒 **보안**

### 🚨 **중요**: 보안 가이드라인 준수 필수
이 프로젝트는 엄격한 보안 정책을 따릅니다.

#### 핵심 보안 규칙:
1. **절대 민감정보를 코드에 하드코딩하지 마세요**
2. **모든 API 토큰은 환경변수로 관리**
3. **커밋 전 보안 검사 실행 필수**

#### 보안 검사 실행:
```bash
# 커밋 전 보안 검사
./security-check.sh

# Pre-commit 훅 설정
ln -sf ../../security-check.sh .git/hooks/pre-commit
```

#### 필수 문서:
- 📖 [**보안 가이드라인**](./SECURITY_GUIDELINES.md) - 반드시 읽어주세요
- 🚨 [**긴급 보안 조치**](./URGENT_SECURITY_ACTION.md) - 토큰 노출 대응

---

## 🚀 **배포**

### Cloudflare Pages 배포
```bash
# 프로덕션 빌드 및 배포
npm run deploy

# 또는 토큰을 통한 자동 배포
./deploy-with-token.sh
```

### 환경변수 설정 (배포 환경)
```bash
# Wrangler 시크릿 설정
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put JWT_SECRET
```

---

## 📊 **API 엔드포인트**

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입

### 구인구직
- `GET /api/jobs` - 구인정보 조회
- `POST /api/jobs` - 구인정보 등록
- `GET /api/jobseekers` - 구직자 조회

### 통계
- `GET /api/stats` - 플랫폼 통계

### 에이전트
- `GET /api/agents/:id` - 에이전트 정보
- `POST /api/agents/:id/jobseekers` - 구직자 등록

---

## 🧪 **테스트**

```bash
# API 연결 테스트
npm run test

# 헬스 체크
npm run test:health

# 보안 검사
npm run security:check
```

---

## 🔧 **개발 스크립트**

```bash
# 개발 서버 (Vite)
npm run dev

# 개발 서버 (Cloudflare Pages)
npm run dev:sandbox

# 빌드
npm run build

# 배포
npm run deploy

# 데이터베이스 관리
npm run db:migrate:local    # 마이그레이션
npm run db:seed            # 시드 데이터
npm run db:reset           # 데이터베이스 리셋
npm run db:console:local   # D1 콘솔

# Git 헬퍼
npm run git:status
npm run git:commit "message"
```

---

## 🐛 **문제 해결**

### 자주 발생하는 문제들

#### 1. 데이터베이스 연결 실패
```bash
# D1 데이터베이스 상태 확인
npx wrangler d1 info w-campus-production

# 로컬 D1 재시작
npm run db:reset
```

#### 2. 빌드 실패
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
rm -rf .wrangler dist
npm run build
```

#### 3. 인증 문제
```bash
# Wrangler 재인증
npx wrangler logout
npx wrangler login
```

---

## 🤝 **기여하기**

### 개발 워크플로우
1. **이슈 생성**: 기능 요청이나 버그 리포트
2. **브랜치 생성**: `feature/기능명` 또는 `fix/버그명`
3. **개발 및 테스트**: 로컬에서 테스트 완료
4. **보안 검사**: `./security-check.sh` 실행
5. **Pull Request**: 상세한 설명과 함께 PR 생성

### 코딩 스타일
- **TypeScript** 타입 안전성 준수
- **ESLint** + **Prettier** 규칙 따르기
- **커밋 메시지**: [Conventional Commits](https://www.conventionalcommits.org/) 형식

---

## 📄 **라이선스**

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

---

## 📞 **지원 및 문의**

- **이슈 트래커**: [GitHub Issues](https://github.com/seojeongju/k-work-platform/issues)
- **프로젝트 문의**: 프로젝트 관리자에게 연락
- **보안 문제**: [보안 가이드라인](./SECURITY_GUIDELINES.md) 참고

---

## 📈 **프로젝트 상태**

- ✅ **메인 기능**: 구현 완료
- ✅ **보안 강화**: 완료 (2025.09.29)
- ✅ **배포**: w-campus.com 라이브
- 🔄 **코드 리팩토링**: 진행 예정
- 📋 **추가 기능**: 백로그 관리 중

---

**🎉 WOW-CAMPUS로 외국인 취업의 새로운 기회를 열어보세요!**

*마지막 업데이트: 2025년 9월 29일*