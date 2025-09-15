#!/usr/bin/env node
/**
 * 해시된 D1 데이터베이스 파일에 마이그레이션 적용
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 해시된 DB 파일 경로
const dbFile = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/e6b5b20f2f7fdd93b571d94dc1eae15d4282a0ba1ed637fe56492d3a73d605d7.sqlite';

console.log('📋 기존 해시 DB 파일에 마이그레이션 적용...');

try {
  const db = new Database(dbFile);
  
  // 먼저 현재 테이블 목록 확인
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('현재 테이블:', tables.map(t => t.name).join(', '));
  
  // job_seekers 테이블이 없으면 마이그레이션 적용
  const hasJobSeekersTable = tables.some(t => t.name === 'job_seekers');
  
  if (!hasJobSeekersTable) {
    console.log('job_seekers 테이블이 없어서 마이그레이션 적용...');
    
    const migrationSQL = fs.readFileSync('migrations/0001_fresh_start_schema.sql', 'utf8');
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    statements.forEach((statement, index) => {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          db.exec(trimmed + ';');
          console.log(`✅ 실행 완료: ${index + 1}/${statements.length}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`⚠️ 경고 (${index + 1}): ${error.message}`);
          }
        }
      }
    });
    
    // 다시 테이블 목록 확인
    const newTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('마이그레이션 후 테이블:', newTables.map(t => t.name).join(', '));
  } else {
    console.log('job_seekers 테이블이 이미 존재합니다.');
  }
  
  db.close();
  console.log('✅ 완료');
  
} catch (error) {
  console.error('❌ 오류:', error.message);
  process.exit(1);
}