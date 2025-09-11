# 🚀 W-Campus 완전 새로운 시작 가이드

## 🎯 목표
- 기존 w-campus 애플리케이션 완전 삭제
- 새로운 w-campus-fresh 프로젝트로 처음부터 시작
- w-campus.com 도메인 연결

## 📋 사전 준비사항

### 1. Cloudflare 기존 애플리케이션 삭제
1. **Cloudflare Dashboard** 접속
2. **Pages** → **w-campus** 선택  
3. **Settings** → **Advanced** → **Delete project**
4. 프로젝트명 확인 후 삭제 완료

### 2. Cloudflare 인증 확인
```bash
# Cloudflare 로그인 상태 확인
npx wrangler whoami

# 로그인이 필요한 경우
npx wrangler auth login
```

## 🚀 새로운 배포 프로세스

### 방법 1: 자동 배포 스크립트 사용
```bash
# 모든 과정을 자동으로 실행
node fresh-deploy.cjs
```

### 방법 2: 단계별 수동 배포

#### Step 1: 새로운 D1 데이터베이스 생성
```bash
npx wrangler d1 create w-campus-production-fresh
```

반환되는 `database_id`를 복사하여 `wrangler.toml` 파일을 업데이트:

```toml
name = "w-campus-fresh"
compatibility_date = "2025-09-11"

[build]
command = "npm run build"

[vars] 
SITE_NAME = "WOW-CAMPUS"
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "w-campus-production-fresh"
database_id = "여기에_실제_database_id_입력"
```

#### Step 2: 데이터베이스 마이그레이션
```bash
npx wrangler d1 execute w-campus-production-fresh --file=./migrations/0001_fresh_start_schema.sql
```

#### Step 3: 프로젝트 빌드
```bash
npm run build
```

#### Step 4: Cloudflare Pages 배포
```bash
npx wrangler pages deploy dist --project-name w-campus-fresh
```

## 🌍 도메인 w-campus.com 연결

### 1. Cloudflare Pages에서 커스텀 도메인 설정
1. **Cloudflare Dashboard** → **Pages** → **w-campus-fresh**
2. **Custom domains** → **Set up a custom domain**
3. 도메인 입력: `w-campus.com`
4. DNS 레코드 자동 생성 확인

### 2. 도메인 네임서버 설정
w-campus.com의 네임서버를 Cloudflare로 변경:
```
네임서버 1: xxx.ns.cloudflare.com
네임서버 2: yyy.ns.cloudflare.com
```

### 3. DNS 레코드 확인
자동 생성되는 DNS 레코드:
```
Type: CNAME
Name: w-campus.com  
Value: w-campus-fresh.pages.dev

Type: CNAME
Name: www
Value: w-campus-fresh.pages.dev
```

## 📊 배포 후 확인사항

### 1. 애플리케이션 접속 테스트
- **임시 URL**: https://w-campus-fresh.pages.dev
- **최종 URL**: https://w-campus.com (DNS 전파 후)

### 2. 데이터베이스 테스트
```bash
# 데이터베이스 연결 테스트
npx wrangler d1 execute w-campus-production-fresh --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 3. 기본 데이터 확인
```bash
# 관리자 계정 확인
npx wrangler d1 execute w-campus-production-fresh --command="SELECT * FROM admins;"

# 기본 데이터 확인
npx wrangler d1 execute w-campus-production-fresh --command="SELECT COUNT(*) as count FROM visa_types;"
```

## 🎉 완료 후 상태

✅ **새로운 Cloudflare Pages 프로젝트**: w-campus-fresh  
✅ **새로운 D1 데이터베이스**: w-campus-production-fresh  
✅ **13개 테이블 + 기본 데이터** 완전 구축  
✅ **도메인 연결 준비**: w-campus.com  

## 🔧 문제 해결

### 데이터베이스 생성 실패시
```bash
# 기존 DB가 있는지 확인
npx wrangler d1 list

# 필요시 기존 DB 삭제
npx wrangler d1 delete w-campus-production-fresh
```

### 배포 실패시
```bash
# Pages 프로젝트 목록 확인
npx wrangler pages project list

# 빌드 파일 확인
ls -la dist/
```

---

**🎯 이제 완전히 새로운 환경에서 w-campus.com을 시작할 수 있습니다!**