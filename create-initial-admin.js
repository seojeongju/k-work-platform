// 초기 관리자 계정 생성 스크립트
import { hash } from 'crypto';

// 암호화 함수 (서버와 동일)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 초기 관리자 생성
async function createInitialAdmin() {
  try {
    const adminEmail = 'admin@wowcampus.com';
    const adminPassword = 'admin2024!';
    const hashedPassword = await hashPassword(adminPassword);
    
    console.log('초기 관리자 계정 정보:');
    console.log('이메일:', adminEmail);
    console.log('비밀번호:', adminPassword);
    console.log('해시된 비밀번호:', hashedPassword);
    
    console.log('\nSQL 실행문:');
    console.log(`INSERT INTO admins (email, password, name, role, status) VALUES ('${adminEmail}', '${hashedPassword}', '시스템 관리자', 'super_admin', 'active');`);
    
    // 실제 계정들도 생성
    const accounts = [
      { email: 'test.jobseeker@gmail.com', password: 'password123', name: '김구직', type: 'jobseeker' },
      { email: 'test.employer@gmail.com', password: 'password123', name: '삼성전자', type: 'employer' },
      { email: 'test.agent@gmail.com', password: 'password123', name: 'Global Agency', type: 'agent' }
    ];
    
    console.log('\n실제 사용 계정들:');
    for (const account of accounts) {
      const hashedPwd = await hashPassword(account.password);
      console.log(`\n${account.type.toUpperCase()}:`);
      console.log(`이메일: ${account.email}`);
      console.log(`비밀번호: ${account.password}`);
      console.log(`해시: ${hashedPwd}`);
    }
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createInitialAdmin();