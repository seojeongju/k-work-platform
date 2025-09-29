# 🚨 긴급 보안 조치 필요

## ⚠️ **즉시 수행해야 할 보안 작업**

### 📅 **발견일**: 2025년 9월 29일
### 🔍 **문제**: Cloudflare API 토큰이 공개 문서에 노출됨

---

## 🔥 **1단계: 즉시 토큰 무효화 (HIGH PRIORITY)**

### 노출된 토큰:
- `Tm2YhROFnBNIJho9mXC5W_UEZeMztJltRQXqaq6c`

### 즉시 수행할 작업:
1. **Cloudflare 대시보드에 로그인**
2. **My Profile > API Tokens**로 이동
3. **해당 토큰을 찾아 즉시 삭제/비활성화**
4. **새로운 토큰 생성**

### 새 토큰 생성 시 권한 설정:
```
✅ 필요한 권한만 부여:
- Zone:Zone:Read (특정 도메인만)
- Zone:DNS:Edit (w-campus.com만)
- Account:Cloudflare Pages:Edit (w-campus 프로젝트만)
- Account:D1:Edit (해당 데이터베이스만)

❌ 절대 부여하지 말 것:
- Account:Account Settings:Edit
- Zone:Zone Settings:Edit
- Global API Key 사용 금지
```

---

## 🛠️ **2단계: 새 토큰 배포 설정**

### Cloudflare Pages 환경변수 설정:
1. **Cloudflare Pages 대시보드** → **w-campus 프로젝트**
2. **Settings** → **Environment Variables**
3. **Production 환경에 추가**:
   ```
   CLOUDFLARE_API_TOKEN=새로발급받은토큰값
   ```

### Wrangler 로컬 시크릿 설정:
```bash
# 로컬 개발환경에서 실행
npx wrangler secret put CLOUDFLARE_API_TOKEN
# 프롬프트에서 새 토큰 입력
```

---

## 📊 **3단계: 피해 범위 분석**

### 확인해야 할 사항:
- [ ] 토큰 사용 로그 확인
- [ ] 비정상적인 API 호출 여부
- [ ] 도메인/DNS 설정 변경 여부
- [ ] 데이터베이스 접근 로그 확인
- [ ] Pages 배포 히스토리 확인

### Cloudflare 분석 대시보드에서 확인:
1. **Analytics** → **Security Events**
2. **Audit Logs** (Enterprise 요금제인 경우)
3. **API 토큰 사용량** 모니터링

---

## 🔒 **4단계: 향후 보안 강화**

### 즉시 적용할 정책:
1. **토큰 순환 정책**: 3개월마다 토큰 교체
2. **권한 최소화**: 필요한 리소스에만 접근 허용
3. **IP 제한**: 가능하면 특정 IP에서만 접근 허용
4. **모니터링**: 이상 활동 알림 설정

### Git pre-commit 훅 설치:
```bash
# 보안 검사 스크립트를 pre-commit 훅으로 설정
ln -sf ../../security-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 📋 **체크리스트**

### 즉시 수행 (24시간 이내):
- [ ] 노출된 토큰 즉시 비활성화
- [ ] 새 토큰 발급 및 권한 설정
- [ ] 새 토큰으로 배포 환경 업데이트
- [ ] 토큰 사용 로그 분석

### 단기 조치 (1주일 이내):
- [ ] 모든 팀원에게 보안 가이드라인 공유
- [ ] pre-commit 훅 설정
- [ ] 정기적인 보안 스캔 도구 도입
- [ ] 백업 복구 절차 테스트

### 장기 조치 (1개월 이내):
- [ ] 보안 정책 문서화
- [ ] 정기적인 보안 감사 일정 수립
- [ ] 팀 보안 교육 실시
- [ ] 사고 대응 절차서 작성

---

## 📞 **긴급 연락처**

### 보안 사고 발생시:
1. **개발팀 리더**에게 즉시 보고
2. **Cloudflare 지원팀** (Enterprise 고객인 경우)
3. **GitHub Security** (코드 노출시)

---

## 📚 **참고 문서**
- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md)
- [Cloudflare API Token Security](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Git Secrets Prevention](https://github.com/awslabs/git-secrets)

---

**⏰ 최종 업데이트**: 2025년 9월 29일  
**✅ 상태**: 조치 필요  
**🔄 다음 검토**: 토큰 교체 완료 후