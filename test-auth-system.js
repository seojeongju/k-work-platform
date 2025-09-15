#!/usr/bin/env node
/**
 * 🧪 WOW-CAMPUS K-Work Platform 
 * 통합 인증 시스템 완전 테스트 스크립트
 * 
 * 모든 사용자 유형별 회원가입, 로그인, 보안 기능 테스트
 * Date: 2025-09-15
 */

const BASE_URL = 'https://b2c2d104.w-campus.pages.dev'
// const BASE_URL = 'https://genspark-ai-developer.w-campus.pages.dev' // 개발 브랜치용

// 테스트 데이터
const TEST_DATA = {
  admin: {
    email: 'test-admin@w-campus.com',
    password: 'AdminPass123!',
    userType: 'admin',
    name: '테스트 관리자',
    role: 'admin'
  },
  agent: {
    email: 'test-agent@global-recruit.com',
    password: 'AgentPass123!',
    userType: 'agent',
    company_name: '글로벌 인재 에이전시',
    country: '한국',
    contact_person: '김에이전트',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    license_number: 'AG-2024-001'
  },
  employer: {
    email: 'test-company@techcorp.co.kr',
    password: 'EmployerPass123!',
    userType: 'employer',
    company_name: '테크코퍼레이션',
    business_number: '123-45-67890',
    industry: 'IT',
    contact_person: '박기업담당',
    phone: '02-9876-5432',
    address: '서울시 서초구 서초대로 456',
    region: 'SEL',
    website: 'https://techcorp.co.kr'
  },
  jobseeker: {
    email: 'test-seeker@example.com',
    password: 'SeekerPass123!',
    userType: 'jobseeker',
    name: '이구직자',
    birth_date: '1995-03-15',
    gender: 'male',
    nationality: '베트남',
    phone: '010-1111-2222',
    current_address: '서울시 영등포구 여의도동',
    korean_level: 'intermediate',
    education_level: '대학교 졸업',
    current_visa: 'D-4',
    desired_visa: 'E-7'
  }
}

// HTTP 요청 헬퍼 함수
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  try {
    console.log(`🌐 ${config.method} ${url}`)
    if (config.body && config.method !== 'GET') {
      console.log(`📤 Request body:`, JSON.parse(config.body))
    }
    
    const response = await fetch(url, config)
    const data = await response.json()
    
    console.log(`📥 Response (${response.status}):`, data)
    
    return { 
      ok: response.ok, 
      status: response.status, 
      data 
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error.message)
    return { ok: false, status: 0, data: { error: error.message } }
  }
}

// 테스트 결과 추적
const testResults = {
  passed: 0,
  failed: 0,
  results: []
}

function logTest(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL'
  const message = `${status} ${testName}`
  
  console.log(message + (details ? ` - ${details}` : ''))
  
  testResults.results.push({ testName, success, details })
  if (success) {
    testResults.passed++
  } else {
    testResults.failed++
  }
}

// 헬스체크
async function testHealthCheck() {
  console.log('\n🏥 === 헬스체크 테스트 ===')
  
  const response = await makeRequest('/health')
  logTest('헬스체크', response.ok && response.data.status === 'healthy')
  
  return response.ok
}

// 회원가입 테스트
async function testRegistration(userType) {
  console.log(`\n📝 === ${userType.toUpperCase()} 회원가입 테스트 ===`)
  
  const userData = TEST_DATA[userType]
  
  // 기존 사용자 삭제 시도 (에러 무시)
  console.log(`🗑️ 기존 테스트 사용자 정리 중...`)
  
  const response = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: userData
  })
  
  const success = response.ok && response.data.success
  logTest(`${userType} 회원가입`, success, 
    success ? `사용자 ID: ${response.data.userId}` : response.data.error)
  
  return { success, data: response.data }
}

// 로그인 테스트
async function testLogin(userType) {
  console.log(`\n🔐 === ${userType.toUpperCase()} 로그인 테스트 ===`)
  
  const { email, password, userType: type } = TEST_DATA[userType]
  
  const response = await makeRequest('/api/auth/login', {
    method: 'POST', 
    body: { email, password, userType: type }
  })
  
  const success = response.ok && response.data.success && response.data.token
  logTest(`${userType} 로그인`, success, 
    success ? `토큰 획득: ${response.data.token.substring(0, 20)}...` : response.data.error)
  
  return { success, token: response.data.token, data: response.data }
}

// 토큰 검증 테스트
async function testTokenVerification(userType, token) {
  console.log(`\n🔍 === ${userType.toUpperCase()} 토큰 검증 테스트 ===`)
  
  if (!token) {
    logTest(`${userType} 토큰 검증`, false, '토큰이 없습니다')
    return { success: false }
  }
  
  const response = await makeRequest('/api/auth/verify', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}` 
    }
  })
  
  const success = response.ok && response.data.success
  logTest(`${userType} 토큰 검증`, success,
    success ? `사용자: ${response.data.user?.email}` : response.data.error)
  
  return { success, data: response.data }
}

// 2FA 활성화 테스트
async function test2FAEnable(userType, token) {
  console.log(`\n🔒 === ${userType.toUpperCase()} 2FA 활성화 테스트 ===`)
  
  if (!token) {
    logTest(`${userType} 2FA 활성화`, false, '토큰이 없습니다')
    return { success: false }
  }
  
  const response = await makeRequest('/api/auth/enable-2fa', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}` 
    },
    body: {
      phone: '010-1234-5678'
    }
  })
  
  const success = response.ok && response.data.success
  logTest(`${userType} 2FA 활성화`, success, response.data.message || response.data.error)
  
  return { success, data: response.data }
}

// 보안 설정 조회 테스트
async function testSecuritySettings(userType, token) {
  console.log(`\n🛡️ === ${userType.toUpperCase()} 보안 설정 조회 테스트 ===`)
  
  if (!token) {
    logTest(`${userType} 보안 설정 조회`, false, '토큰이 없습니다')
    return { success: false }
  }
  
  const response = await makeRequest('/api/auth/security-settings', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}` 
    }
  })
  
  const success = response.ok && response.data.success
  logTest(`${userType} 보안 설정 조회`, success,
    success ? `2FA 상태: ${response.data.settings?.twoFactorEnabled}` : response.data.error)
  
  return { success, data: response.data }
}

// 비밀번호 재설정 요청 테스트 
async function testPasswordResetRequest(userType) {
  console.log(`\n🔄 === ${userType.toUpperCase()} 비밀번호 재설정 요청 테스트 ===`)
  
  const { email, userType: type } = TEST_DATA[userType]
  
  const response = await makeRequest('/api/auth/request-password-reset', {
    method: 'POST',
    body: { email, userType: type }
  })
  
  const success = response.ok && response.data.success
  logTest(`${userType} 비밀번호 재설정 요청`, success, response.data.message || response.data.error)
  
  return { 
    success, 
    data: response.data,
    resetToken: response.data.resetToken // 개발 환경에서만 노출
  }
}

// 단일 사용자 유형 완전 테스트
async function testUserTypeComplete(userType) {
  console.log(`\n🎯 === ${userType.toUpperCase()} 완전 테스트 시작 ===`)
  
  const results = {
    userType,
    registration: null,
    login: null,
    tokenVerification: null,
    twoFactorEnable: null,
    securitySettings: null,
    passwordResetRequest: null
  }
  
  try {
    // 1. 회원가입 테스트
    results.registration = await testRegistration(userType)
    
    // 2. 로그인 테스트
    results.login = await testLogin(userType)
    
    // 3. 토큰 검증 테스트
    if (results.login.success && results.login.token) {
      results.tokenVerification = await testTokenVerification(userType, results.login.token)
      
      // 4. 2FA 활성화 테스트
      results.twoFactorEnable = await test2FAEnable(userType, results.login.token)
      
      // 5. 보안 설정 조회 테스트
      results.securitySettings = await testSecuritySettings(userType, results.login.token)
    }
    
    // 6. 비밀번호 재설정 요청 테스트
    results.passwordResetRequest = await testPasswordResetRequest(userType)
    
  } catch (error) {
    console.error(`❌ ${userType} 테스트 중 오류:`, error)
  }
  
  return results
}

// 관리자 전용 기능 테스트
async function testAdminFeatures(adminToken) {
  console.log(`\n👑 === 관리자 전용 기능 테스트 ===`)
  
  if (!adminToken) {
    logTest('관리자 마이그레이션 상태 확인', false, '관리자 토큰이 없습니다')
    return
  }
  
  // 1. 마이그레이션 상태 확인
  const statusResponse = await makeRequest('/api/admin/migration-status', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${adminToken}` 
    }
  })
  
  const statusSuccess = statusResponse.ok && statusResponse.data.success
  logTest('관리자 마이그레이션 상태 확인', statusSuccess, 
    statusSuccess ? '마이그레이션 상태 조회 성공' : statusResponse.data.error)
  
  // 2. 비밀번호 마이그레이션 실행 (소량)
  const migrateResponse = await makeRequest('/api/admin/migrate-passwords', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${adminToken}` 
    }
  })
  
  const migrateSuccess = migrateResponse.ok && migrateResponse.data.success
  logTest('관리자 비밀번호 마이그레이션', migrateSuccess,
    migrateSuccess ? `마이그레이션 완료: ${migrateResponse.data.summary?.totalMigrated}건` : migrateResponse.data.error)
  
  return { statusSuccess, migrateSuccess }
}

// 전체 시스템 테스트 실행
async function runCompleteTest() {
  console.log('🚀 === WOW-CAMPUS 통합 인증 시스템 완전 테스트 시작 ===\n')
  console.log(`🌐 테스트 대상: ${BASE_URL}`)
  console.log(`📅 테스트 시간: ${new Date().toLocaleString('ko-KR')}`)
  
  // 헬스체크
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    console.log('\n❌ 헬스체크 실패, 테스트 중단')
    return
  }
  
  // 각 사용자 유형별 테스트
  const userTypes = ['admin', 'agent', 'employer', 'jobseeker']
  const allResults = {}
  let adminToken = null
  
  for (const userType of userTypes) {
    const result = await testUserTypeComplete(userType)
    allResults[userType] = result
    
    // 관리자 토큰 저장
    if (userType === 'admin' && result.login?.success) {
      adminToken = result.login.token
    }
    
    // 테스트 간 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 관리자 전용 기능 테스트
  if (adminToken) {
    await testAdminFeatures(adminToken)
  }
  
  // 최종 결과 요약
  console.log('\n\n📊 === 테스트 결과 요약 ===')
  console.log(`✅ 성공: ${testResults.passed}개`)
  console.log(`❌ 실패: ${testResults.failed}개`)
  console.log(`📈 성공률: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`)
  
  console.log('\n📝 === 상세 결과 ===')
  testResults.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${result.testName}`)
    if (result.details) {
      console.log(`   💬 ${result.details}`)
    }
  })
  
  console.log('\n🎯 === 사용자 유형별 요약 ===')
  userTypes.forEach(userType => {
    const result = allResults[userType]
    if (result) {
      const tests = [
        result.registration?.success,
        result.login?.success, 
        result.tokenVerification?.success,
        result.twoFactorEnable?.success,
        result.securitySettings?.success,
        result.passwordResetRequest?.success
      ]
      const passCount = tests.filter(Boolean).length
      const totalCount = tests.length
      console.log(`${userType.toUpperCase()}: ${passCount}/${totalCount} 테스트 통과`)
    }
  })
  
  console.log('\n🏁 === 테스트 완료 ===')
  console.log(`총 테스트 시간: ${new Date().toLocaleString('ko-KR')}`)
  
  return allResults
}

// 스크립트 실행
if (require.main === module) {
  runCompleteTest()
    .then(() => {
      console.log('\n✨ 모든 테스트가 완료되었습니다!')
      process.exit(testResults.failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('\n💥 테스트 실행 중 심각한 오류:', error)
      process.exit(1)
    })
}

module.exports = {
  runCompleteTest,
  testUserTypeComplete,
  TEST_DATA,
  BASE_URL
}