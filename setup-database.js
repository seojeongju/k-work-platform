// 데이터베이스 초기화 및 마이그레이션 스크립트
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cloudflare D1 데이터베이스 설정은 wrangler.toml에서 처리됩니다.
// 이 스크립트는 로컬 개발용입니다.

console.log('📋 데이터베이스 초기화 가이드');
console.log('================================\n');

console.log('1. 데이터베이스 마이그레이션 실행:');
console.log('   npx wrangler d1 migrations apply w-campus-production --local\n');

console.log('2. 초기 데이터 삽입:');
console.log('   npx wrangler d1 execute w-campus-production --local --file=./migrations/0006_initial_real_accounts.sql\n');

console.log('3. 시드 데이터 삽입:');
console.log('   npx wrangler d1 execute w-campus-production --local --file=./seed.sql\n');

console.log('4. 실제 사용 계정 정보:');
console.log('   관리자: admin@wowcampus.com / admin2024!');
console.log('   구직자: test.jobseeker@gmail.com / password123');
console.log('   기업: test.employer@gmail.com / password123');
console.log('   에이전트: test.agent@gmail.com / password123\n');

console.log('5. 서버 시작:');
console.log('   npm run dev:sandbox\n');

console.log('이제 실제 회원가입과 로그인이 가능합니다! 🚀');