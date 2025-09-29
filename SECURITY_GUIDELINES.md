# 🛡️ WOW-CAMPUS 보안 가이드라인

## 🚨 **중요한 보안 규칙**

### 1. **민감한 정보 관리**

#### ❌ **절대 하지 말 것**
- API 토큰을 코드에 하드코딩
- 평문으로 문서에 토큰 기록
- Git 커밋에 민감 정보 포함
- 공개 채널에 토큰 공유

#### ✅ **해야 할 것**
- 모든 민감 정보를 환경변수로 관리
- `.env` 파일을 `.gitignore`에 추가
- 정기적으로 토큰 순환(rotation)
- 접근 권한을 최소화

### 2. **환경변수 관리**

#### **로컬 개발환경**
```bash
# .env.local 파일 생성 (Git에 추가하지 않음)
cp .env.example .env.local

# 실제 값으로 수정
CLOUDFLARE_API_TOKEN=your_actual_token_here
JWT_SECRET=your_strong_random_secret
```

#### **배포환경 (Cloudflare)**
```bash
# Wrangler를 통한 환경변수 설정
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put JWT_SECRET
```

### 3. **API 토큰 보안**

#### **Cloudflare API 토큰 권한 제한**
- ✅ **필요한 권한만 부여**:
  - `Zone:Zone:Read`
  - `Zone:DNS:Edit`
  - `Account:Cloudflare Pages:Edit`
  - `Account:D1:Edit`

- ❌ **과도한 권한 금지**:
  - `Account:Account Settings:Edit`
  - `Zone:Zone Settings:Edit`
  - Global API Key 사용 금지

#### **토큰 순환 정책**
- 매 3개월마다 토큰 교체
- 의심스러운 활동 감지 시 즉시 교체
- 팀원 변경 시 모든 토큰 재발급

### 4. **데이터베이스 보안**

#### **D1 데이터베이스**
- Database ID는 wrangler.toml에서만 관리
- 프로덕션 DB 접근은 제한된 인원만
- 정기적인 백업 실시
- SQL 쿼리 파라미터화 필수

### 5. **인증 시스템**

#### **JWT 토큰**
- 강력한 시크릿 키 사용 (32자 이상)
- 토큰 만료 시간 설정 (24시간 권장)
- Refresh Token 구현 고려

#### **비밀번호 정책**
- PBKDF2 해싱 사용 (100,000회 이상 반복)
- 최소 8자, 영문+숫자 조합
- 주기적인 비밀번호 변경 권장

### 6. **배포 보안**

#### **Cloudflare Pages**
- 환경별 분리 (dev/staging/production)
- 민감한 로그 정보 제거
- HTTPS 강제 사용
- CSP 헤더 설정

### 7. **모니터링 및 감사**

#### **보안 로깅**
- 인증 실패 로그
- 비정상적인 API 호출 추적
- 데이터베이스 접근 로그

#### **정기적 보안 검토**
- 월간 토큰 사용 현황 확인
- 분기별 권한 재검토
- 연간 보안 감사

### 8. **사고 대응**

#### **토큰 노출 시 대응절차**
1. **즉시 토큰 비활성화**
2. **새 토큰 발급 및 배포**
3. **영향 범위 분석**
4. **로그 확인 및 모니터링 강화**
5. **사고 보고서 작성**

### 9. **개발팀 가이드라인**

#### **코드 리뷰 체크포인트**
- [ ] 하드코딩된 토큰이 없는가?
- [ ] 환경변수가 올바르게 사용되는가?
- [ ] SQL 쿼리가 안전한가?
- [ ] 민감한 정보가 로그에 출력되지 않는가?

#### **Git 커밋 전 체크**
```bash
# 민감한 파일 검사
git diff --cached | grep -E "(token|secret|password|key)"

# .env 파일 제외 확인
git status --ignored
```

### 10. **준수사항**

#### **필수 도구**
- `.gitignore` 설정으로 민감 파일 제외
- `git-secrets` 같은 pre-commit 훅 사용
- 정적 보안 분석 도구 활용

#### **문서화**
- 모든 보안 관련 변경사항 기록
- 토큰 사용 현황 문서화
- 접근 권한 명세서 유지

---

## 📞 **보안 문의**
- 보안 이슈 발견 시 즉시 팀 리더에게 보고
- 긴급 상황: 즉시 토큰 비활성화 후 보고

**마지막 업데이트**: 2025년 9월 29일  
**담당자**: 개발팀  
**검토 주기**: 분기별