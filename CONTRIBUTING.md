# 기여 가이드

WOW-CAMPUS 프로젝트에 기여해주셔서 감사합니다! 🎉

## 🚀 프로젝트 설정

### 1. 리포지토리 포크 및 클론
```bash
git clone https://github.com/seojeongju/k-work-platform.git
cd k-work-platform
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 로컬 개발 환경 설정
```bash
# 데이터베이스 마이그레이션
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 프로젝트 빌드
npm run build

# PM2로 개발 서버 시작
pm2 start ecosystem.config.cjs
```

## 📝 개발 가이드라인

### 코드 스타일
- **TypeScript**: 타입 안전성을 위해 엄격한 타입 체크 사용
- **ESLint**: 코드 품질 유지를 위한 린팅 규칙 준수
- **Prettier**: 일관된 코드 포매팅 적용

### 커밋 메시지 규칙
```
type(scope): description

예시:
feat(auth): 구글 OAuth 로그인 기능 추가
fix(api): 구직자 등록 시 비자타입 검증 버그 수정
docs(readme): API 문서 업데이트
style(ui): 메인 페이지 반응형 디자인 개선
```

**타입:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 업데이트
- `style`: UI/스타일 변경
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 기타 작업

### 브랜치 전략
- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치
- `feature/기능명`: 새로운 기능 개발
- `fix/버그명`: 버그 수정
- `docs/문서명`: 문서 업데이트

## 🔧 주요 기술 스택

### 백엔드
- **Hono**: 고성능 웹 프레임워크
- **TypeScript**: 타입 안전성
- **Cloudflare Workers**: 서버리스 런타임
- **Cloudflare D1**: SQLite 기반 데이터베이스

### 프론트엔드
- **Vanilla JavaScript**: 경량화된 클라이언트
- **TailwindCSS**: 유틸리티 우선 CSS 프레임워크
- **FontAwesome**: 아이콘 라이브러리

## 📋 기여 프로세스

### 1. 이슈 확인
- 기존 이슈를 확인하여 중복을 방지
- 새로운 이슈는 적절한 템플릿 사용

### 2. 브랜치 생성
```bash
git checkout -b feature/새기능명
# 또는
git checkout -b fix/버그명
```

### 3. 개발 및 테스트
- 기능 개발 또는 버그 수정
- 로컬 테스트 수행
- 코드 리뷰 가능한 수준으로 정리

### 4. 커밋 및 푸시
```bash
git add .
git commit -m "feat(scope): 새기능 설명"
git push origin feature/새기능명
```

### 5. Pull Request 생성
- PR 템플릿에 따라 상세한 설명 작성
- 리뷰어 지정 및 라벨 추가
- CI/CD 통과 확인

## 🧪 테스트 가이드

### API 테스트
```bash
# 서버 상태 확인
curl http://localhost:3000/api/stats

# 구인정보 조회
curl http://localhost:3000/api/jobs

# 구직자 목록 조회
curl http://localhost:3000/api/job-seekers
```

### 프론트엔드 테스트
- 브라우저에서 `http://localhost:3000` 접속
- 각 페이지의 기능 동작 확인
- 반응형 디자인 테스트
- 다양한 브라우저 호환성 확인

## 📚 프로젝트 구조

```
k-work-platform/
├── src/                    # 백엔드 소스 코드
│   ├── index.ts           # 메인 애플리케이션
│   ├── routes/            # API 라우트
│   ├── models/            # 데이터 모델
│   └── utils/             # 유틸리티 함수
├── public/                # 정적 파일
│   └── static/            # HTML, CSS, JS 파일
├── migrations/            # 데이터베이스 마이그레이션
├── dist/                  # 빌드 결과물
├── .github/               # GitHub 설정
└── docs/                  # 프로젝트 문서
```

## 🎯 기여 영역

### 우선순위 높은 기여 영역
1. **사용자 인증 시스템 강화**
   - JWT 토큰 보안
   - OAuth 연동 확대

2. **고급 기능 개발**
   - 실시간 메시징
   - 알림 시스템
   - 파일 업로드

3. **다국어 지원 확대**
   - 베트남어, 태국어, 필리핀어 추가
   - 자동 번역 기능

4. **성능 최적화**
   - API 응답 시간 개선
   - 프론트엔드 번들 최적화

### 초보자 친화적인 기여 영역
- 문서 작성 및 번역
- UI/UX 개선
- 테스트 케이스 추가
- 버그 리포트 및 수정

## 💬 소통 채널

- **GitHub Issues**: 버그 리포트, 기능 제안
- **GitHub Discussions**: 일반적인 질문, 아이디어 논의
- **Pull Request**: 코드 리뷰, 기술적 논의

## 🎉 인정과 감사

모든 기여자들은 `CONTRIBUTORS.md` 파일에 기록됩니다. 
여러분의 기여가 WOW-CAMPUS 프로젝트를 더욱 발전시킵니다!

---

**질문이 있으시면 GitHub Issues를 통해 언제든지 문의해 주세요!** 🚀