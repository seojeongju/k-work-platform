# 🔧 토큰 권한 부족 문제 해결

## 🎯 현재 상황
- ✅ Cloudflare 인증 성공
- ❌ Pages 프로젝트 생성 권한 부족
- ❌ D1 데이터베이스 생성 권한 부족

## 🔑 해결 방법 1: 새 토큰 생성 (권장)

**Custom Token으로 다음 권한 설정:**

```
Permissions:
- Account: Cloudflare Pages:Edit
- Account: D1:Write  
- Zone: Zone:Read
- Zone: DNS:Edit
- User: User Details:Read

Account Resources: All accounts
Zone Resources: All zones
```

## 🔑 해결 방법 2: 대시보드에서 수동 생성

### A. Pages 프로젝트 생성
1. Cloudflare Dashboard → Pages
2. "Create a project" → "Upload assets"
3. 프로젝트명: `w-campus-fresh`
4. 아무 파일 업로드 후 생성

### B. D1 데이터베이스 생성  
1. Cloudflare Dashboard → D1
2. "Create database"
3. 데이터베이스명: `w-campus-production-fresh`

## ⚡ 수동 생성 후 배포

프로젝트를 수동으로 생성한 후:
```bash
# 배포만 실행 (생성된 프로젝트에)
npx wrangler pages deploy dist --project-name w-campus-fresh
```

---

**어떤 방법을 선택하시겠습니까?**
1. 새 토큰 생성 (더 많은 권한)
2. 대시보드에서 수동 생성