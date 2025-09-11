#!/usr/bin/env node
/**
 * w-campus.com 완전 새로운 배포 스크립트
 * Cloudflare Pages + D1 데이터베이스 통합 배포
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 W-Campus 완전 새로운 배포 시작...');
console.log('🎯 도메인: w-campus.com');

// 환경변수 확인
function checkEnvironment() {
  console.log('\n📋 환경 설정 확인 중...');
  
  try {
    execSync('npx wrangler whoami', { stdio: 'inherit' });
    console.log('✅ Cloudflare 인증 확인됨');
  } catch (error) {
    console.error('❌ Cloudflare 인증이 필요합니다.');
    console.log('💡 다음 명령으로 로그인하세요: npx wrangler auth login');
    process.exit(1);
  }
}

// 새로운 D1 데이터베이스 생성
function createDatabase() {
  console.log('\n📊 새로운 D1 데이터베이스 생성 중...');
  
  const dbName = 'w-campus-production-fresh';
  
  try {
    console.log(`🔨 데이터베이스 생성: ${dbName}`);
    const output = execSync(`npx wrangler d1 create ${dbName}`, { 
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'inherit']
    });
    
    // database_id 추출
    const matches = output.match(/database_id = "(.*?)"/);
    if (matches && matches[1]) {
      const databaseId = matches[1];
      console.log(`✅ 데이터베이스 ID: ${databaseId}`);
      
      // wrangler.toml 업데이트
      updateWranglerConfig(dbName, databaseId);
      
      return databaseId;
    } else {
      throw new Error('데이터베이스 ID를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 생성 실패:', error.message);
    process.exit(1);
  }
}

// wrangler.toml 설정 업데이트
function updateWranglerConfig(dbName, databaseId) {
  console.log('\n⚙️  wrangler.toml 설정 업데이트...');
  
  const config = `name = "w-campus-fresh"
compatibility_date = "2025-09-11"

[build]
command = "npm run build"

[vars]
SITE_NAME = "WOW-CAMPUS"
ENVIRONMENT = "production"

# Production D1 Database
[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${databaseId}"
`;

  fs.writeFileSync('wrangler.toml', config);
  console.log('✅ wrangler.toml 업데이트 완료');
}

// 데이터베이스 마이그레이션 실행
function runMigrations(dbName) {
  console.log('\n🗄️  데이터베이스 마이그레이션 실행...');
  
  try {
    console.log('📄 마이그레이션 파일 확인...');
    if (!fs.existsSync('migrations/0001_fresh_start_schema.sql')) {
      throw new Error('마이그레이션 파일이 존재하지 않습니다.');
    }
    
    console.log('🔧 마이그레이션 적용 중...');
    execSync(`npx wrangler d1 execute ${dbName} --file=./migrations/0001_fresh_start_schema.sql`, {
      stdio: 'inherit'
    });
    
    console.log('✅ 데이터베이스 마이그레이션 완료');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  }
}

// 프로젝트 빌드
function buildProject() {
  console.log('\n🔨 프로젝트 빌드 중...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ 빌드 완료');
  } catch (error) {
    console.error('❌ 빌드 실패:', error.message);
    process.exit(1);
  }
}

// Cloudflare Pages 배포
function deployToPages() {
  console.log('\n🚀 Cloudflare Pages 배포 중...');
  
  try {
    execSync('npx wrangler pages deploy dist --project-name w-campus-fresh', {
      stdio: 'inherit'
    });
    
    console.log('✅ Cloudflare Pages 배포 완료');
    console.log('🌐 배포 URL: https://w-campus-fresh.pages.dev');
    
  } catch (error) {
    console.error('❌ 배포 실패:', error.message);
    process.exit(1);
  }
}

// 도메인 설정 안내
function domainSetupGuide() {
  console.log('\n🌍 도메인 w-campus.com 연결 안내:');
  console.log('');
  console.log('1. Cloudflare Dashboard → Pages → w-campus-fresh');
  console.log('2. Custom domains → Set up a custom domain');
  console.log('3. 도메인 입력: w-campus.com');
  console.log('4. DNS 레코드 자동 생성 확인');
  console.log('5. 도메인 네임서버를 Cloudflare로 변경');
  console.log('');
  console.log('🎉 배포가 완료되었습니다!');
}

// 메인 실행 함수
async function main() {
  try {
    checkEnvironment();
    
    const databaseId = createDatabase();
    runMigrations('w-campus-production-fresh');
    buildProject();
    deployToPages();
    domainSetupGuide();
    
    console.log('\n🎯 모든 배포 작업이 성공적으로 완료되었습니다!');
    
  } catch (error) {
    console.error('\n💥 배포 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main };