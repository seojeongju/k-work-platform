#!/usr/bin/env node
/**
 * 로컬 개발용 DB 초기화 스크립트
 * SQLite 파일을 직접 생성하여 개발 환경 구축
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 DB 파일 경로
const DB_DIR = path.join(__dirname, '.wrangler', 'state', 'v3', 'd1');
const DB_FILE = path.join(DB_DIR, 'miniflare-D1DatabaseObject', 'w-campus-local.sqlite');

console.log('🚀 로컬 DB 초기화 시작...');

// 디렉터리 생성
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ DB 디렉터리 생성 완료');
}

// 기존 DB 파일 제거 (완전 초기화)
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
  console.log('🗑️ 기존 DB 파일 제거 완료');
}

// 마이그레이션 파일 읽기
const migrationFile = path.join(__dirname, 'migrations', '0001_fresh_start_schema.sql');
if (!fs.existsSync(migrationFile)) {
  console.error('❌ 마이그레이션 파일을 찾을 수 없습니다:', migrationFile);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
console.log('📄 마이그레이션 파일 읽기 완료');

// SQLite 파일 생성 (임시)
const sqlite3 = `
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('${DB_FILE}');

console.log('📦 SQLite DB 파일 생성 중...');

// 마이그레이션 실행
const statements = \`${migrationSQL}\`.split(';').filter(stmt => stmt.trim());

statements.forEach((statement, index) => {
  const trimmed = statement.trim();
  if (trimmed) {
    try {
      db.exec(trimmed + ';');
      console.log(\`✅ 실행 완료: \${index + 1}/\${statements.length}\`);
    } catch (error) {
      console.error(\`❌ 오류 발생 (\${index + 1}): \${error.message}\`);
    }
  }
});

db.close();
console.log('✅ 로컬 DB 초기화 완료!');
`;

// 임시 실행 파일 생성 및 실행
const tempFile = path.join(__dirname, 'temp-db-init.js');
fs.writeFileSync(tempFile, sqlite3);

try {
  const { execSync } = await import('child_process');
  
  // better-sqlite3 설치 확인
  try {
    execSync('npm list better-sqlite3', { stdio: 'ignore' });
  } catch (error) {
    console.log('📦 better-sqlite3 설치 중...');
    execSync('npm install --save-dev better-sqlite3', { stdio: 'inherit' });
  }
  
  // DB 초기화 실행
  execSync(`node ${tempFile}`, { stdio: 'inherit' });
  
  // 임시 파일 정리
  fs.unlinkSync(tempFile);
  
  console.log('🎉 로컬 DB 초기화가 완료되었습니다!');
  console.log('💡 이제 "npm run dev" 명령으로 개발 서버를 시작할 수 있습니다.');
  
} catch (error) {
  console.error('❌ DB 초기화 중 오류:', error.message);
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
  process.exit(1);
}