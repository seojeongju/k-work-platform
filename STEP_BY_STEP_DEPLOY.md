# 🎯 W-Campus.com 단계별 배포 가이드

## 현재 상태 ✅
- Cloudflare 도메인 추가 완료: w-campus.com
- DNS 스캔 완료
- 다음: "Continue to activation" 클릭 대기

## 🔄 동시 진행 단계

### A. Cloudflare Dashboard에서
1. **"Continue to activation"** 클릭 ← **지금 진행**
2. 네임서버 변경 안내 확인
3. 플랜 선택 (Free 선택 권장)

### B. API 토큰 생성 (새 탭에서)
1. 프로필 → My Profile → API Tokens
2. "Create Token" → "Cloudflare Pages:Edit" 템플릿
3. 토큰 복사

### C. 즉시 배포 실행
토큰을 받으면 다음 명령어 실행:

```bash
# 1. 토큰 설정
export CLOUDFLARE_API_TOKEN="your_token_here"

# 2. 즉시 배포
./deploy-with-token.sh
```

## 🎯 예상 결과

배포 성공 시:
- ✅ 새 D1 데이터베이스 생성
- ✅ Cloudflare Pages 프로젝트 생성  
- ✅ 13개 테이블 + 기본 데이터 구축
- ✅ https://w-campus-fresh.pages.dev 즉시 접속 가능
- ✅ w-campus.com 도메인 연결 준비 완료

## ⚡ 다음 단계 미리 준비

배포 완료 후:
1. Pages 프로젝트에서 Custom Domain 설정
2. w-campus.com → w-campus-fresh.pages.dev 연결
3. DNS 레코드 자동 생성 확인
4. SSL 인증서 발급 대기

---

**지금 "Continue to activation"을 클릭하고 API 토큰을 생성해주세요!** 🚀