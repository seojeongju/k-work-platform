import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { sign, verify } from 'hono/jwt'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database;
}

// bcrypt 유사 해시 함수 (Cloudflare Workers 환경에서 사용 가능)
async function hashPassword(password: string): Promise<string> {
  // 솔트 생성
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('')
  
  // PBKDF2를 사용한 강력한 해시
  const encoder = new TextEncoder()
  const data = encoder.encode(password + saltHex)
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 10만번 반복
      hash: 'SHA-256'
    },
    key,
    256
  )
  
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // 솔트와 해시를 결합하여 저장
  return `$pbkdf2$${saltHex}$${hashHex}`
}

// 비밀번호 검증 함수
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    if (!hashedPassword.startsWith('$pbkdf2$')) {
      // 기존 평문 비밀번호 호환성
      return password === hashedPassword
    }
    
    const parts = hashedPassword.split('$')
    if (parts.length !== 4) return false
    
    const saltHex = parts[2]
    const storedHashHex = parts[3]
    
    // 솔트를 바이트 배열로 변환
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
    
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    )
    
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashHex === storedHashHex
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// 기존 SHA-256 해시 함수 (호환성을 위해 유지)
async function hash(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// 이메일 중복 검사 함수 (강화된 버전)
async function checkEmailExists(db: D1Database, email: string, userType?: string): Promise<boolean> {
  const tables = ['admins', 'agents', 'employers', 'job_seekers']
  
  try {
    for (const table of tables) {
      const result = await db.prepare(`SELECT id FROM ${table} WHERE email = ?`).bind(email).first()
      if (result) {
        console.log(`⚠️ Email ${email} already exists in ${table}`)
        return true
      }
    }
    return false
  } catch (error) {
    console.error('❌ Email check error:', error)
    return false
  }
}

// 강화된 관리자 생성 함수
async function createAdmin(db: D1Database, data: any): Promise<number | null> {
  try {
    const { email, password, name = 'Administrator', role = 'admin' } = data
    
    const result = await db.prepare(`
      INSERT INTO admins (email, password, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(email, password, name, role).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('❌ Admin creation error:', error)
    return null
  }
}

// 강화된 에이전트 생성 함수
async function createAgent(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, password, company_name, country, 
      contact_person, phone, address, license_number 
    } = data
    
    // 필수 필드 검증
    if (!company_name) {
      throw new Error('회사명이 필요합니다.')
    }
    if (!country) {
      throw new Error('국가 정보가 필요합니다.')
    }
    if (!contact_person) {
      throw new Error('담당자명이 필요합니다.')
    }
    
    console.log(`🏢 Creating agent: ${company_name} (${country})`)
    
    const result = await db.prepare(`
      INSERT INTO agents (
        email, password, company_name, country, contact_person, 
        phone, address, license_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email, password, company_name, country, contact_person,
      phone || null, address || null, license_number || null
    ).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('❌ Agent creation error:', error.message)
    throw error
  }
}

// 강화된 기업 생성 함수
async function createEmployer(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, password, company_name, business_number, industry,
      contact_person, phone, address, region, website 
    } = data
    
    // 필수 필드 검증 (사업자등록번호는 선택사항으로 변경)
    if (!company_name) {
      throw new Error('회사명이 필요합니다.')
    }
    if (!industry) {
      throw new Error('업종 정보가 필요합니다.')
    }
    if (!contact_person) {
      throw new Error('담당자명이 필요합니다.')
    }
    if (!phone) {
      throw new Error('연락처가 필요합니다.')
    }
    if (!address) {
      throw new Error('주소가 필요합니다.')
    }
    if (!region) {
      throw new Error('지역 정보가 필요합니다.')
    }
    
    console.log(`🏭 Creating employer: ${company_name} (${business_number || '사업자번호 미제공'})`)
    
    const result = await db.prepare(`
      INSERT INTO employers (
        email, password, company_name, business_number, industry, 
        contact_person, phone, address, region, website, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email, password, company_name, business_number || null, industry,
      contact_person, phone, address, region, website || null
    ).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('❌ Employer creation error:', error.message)
    throw error
  }
}

// 강화된 구직자 생성 함수 (학생, 강사 포함)
async function createJobSeeker(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, password, name, birth_date, gender, nationality = 'Unknown',
      phone, current_address, korean_level = 'beginner', education_level = 'unknown',
      current_visa = 'none', desired_visa = 'none'
    } = data
    
    const result = await db.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        phone, current_address, korean_level, education_level, work_experience,
        current_visa, desired_visa, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(
      email, password, name || 'User', birth_date || null, gender || null, nationality,
      phone || null, current_address || null, korean_level, education_level || 'unknown', data.work_experience || null,
      current_visa, desired_visa
    ).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('❌ JobSeeker creation error:', error)
    return null
  }
}

// 입력 검증 함수들
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

function validatePassword(password: string): boolean {
  // 최소 8자, 영문자+숫자 조합
  return password.length >= 8 && password.length <= 100 && 
         /^(?=.*[A-Za-z])(?=.*\d)/.test(password)
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  // More comprehensive XSS protection
  return input
    .trim()
    // Remove HTML tags completely
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove script tags and content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove style tags and content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Escape remaining special characters
    .replace(/[<>'"&]/g, (match) => {
      const escapeMap: {[key: string]: string} = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match] || match;
    })
}

function validatePhoneNumber(phone: string): boolean {
  // 한국 전화번호 형식
  const phoneRegex = /^(\+82|0)(\d{1,2})-?(\d{3,4})-?(\d{4})$/
  return phoneRegex.test(phone)
}

// SQL 인젝션 방지를 위한 매개변수 검증
function validateId(id: string): boolean {
  return /^\d+$/.test(id) && parseInt(id) > 0
}

const app = new Hono<{ Bindings: Bindings }>()

// 보안 헤더 미들웨어
app.use('*', async (c, next) => {
  // 보안 헤더 설정
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://w-campus.com https://www.w-campus.com https://cloudflareinsights.com"
  )
  
  await next()
})

// Rate Limiting (간단한 구현)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
app.use('/api/*', async (c, next) => {
  const clientIP = c.req.header('CF-Connecting-IP') || 
                   c.req.header('X-Forwarded-For') || 
                   'unknown'
  const now = Date.now()
  const windowMs = 5 * 60 * 1000 // 5분
  const maxRequests = 20
  
  const key = `rate_limit_${clientIP}`
  const current = requestCounts.get(key)
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
  } else {
    current.count++
    if (current.count > maxRequests) {
      return c.json({ error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }, 429)
    }
  }
  
  await next()
})

// CORS 설정
app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',
    'https://w-campus.com',
    'https://www.w-campus.com',
    'https://w-campus-com.pages.dev',
    'https://job-platform.pages.dev'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 메인 페이지 라우트 - 2025년 9월 7일 버전으로 복원
app.get('/', async (c) => {
  // 2025년 9월 7일 메인 페이지 단순화 버전 (fdcd260 커밋)
  // 실시간 구인정보 섹션이 제거된 깔끔한 버전
  const indexContent = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WOW-CAMPUS 외국인 구인구직 및 유학생 지원플랫폼</title>
        <!-- Deployment Version: v2.3.0-improved-navigation | Last Updated: 2025-09-05T18:15:00Z -->
        <meta name="build-version" content="v2.3.0-improved-navigation">
        <meta name="last-updated" content="2025-09-05T18:15:00Z">
        <meta name="deployment-status" content="navigation-improved">
        <meta name="cloudflare-project" content="w-campus-com">
        <meta name="feature-update" content="enhanced-scroll-navigation">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#1E40AF',
                  secondary: '#3B82F6',
                  accent: '#059669',
                  wowcampus: {
                    blue: '#1E40AF',
                    light: '#E0F2FE',
                    dark: '#0F172A'
                  }
                }
              }
            }
          }
        </script>
        <style>
          /* 부드러운 호버 전환 효과 */
          .smooth-transition {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .smooth-transition-fast {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .smooth-transition-slow {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* 내비게이션 링크 호버 효과 */
          .nav-link {
            position: relative;
            color: #374151;
            transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .nav-link::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 0;
            height: 2px;
            background-color: #1E40AF;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .nav-link:hover {
            color: #1E40AF;
          }
          
          .nav-link:hover::after {
            width: 100%;
          }
          
          /* 버튼 호버 효과 */
          .btn-primary {
            background-color: #1E40AF;
            color: white;
            transform: translateY(0);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .btn-primary:hover {
            background-color: #1D4ED8;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          
          .btn-secondary {
            border: 2px solid #1E40AF;
            color: #1E40AF;
            background-color: transparent;
            transform: translateY(0);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .btn-secondary:hover {
            background-color: #1E40AF;
            color: white;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.2), 0 4px 6px -2px rgba(30, 64, 175, 0.1);
          }
          
          .btn-success {
            background-color: #059669;
            color: white;
            transform: translateY(0);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .btn-success:hover {
            background-color: #047857;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.2), 0 4px 6px -2px rgba(5, 150, 105, 0.1);
          }
          
          /* 탭 버튼 스타일 */
          .tab-button {
            position: relative;
            background-color: #F8FAFC;
            color: #64748B;
            border: 1px solid #E2E8F0;
            padding: 12px 24px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(0);
          }
          
          .tab-button.active {
            background-color: #1E40AF;
            color: white;
            border-color: #1E40AF;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -5px rgba(30, 64, 175, 0.3);
          }
          
          .tab-button:hover:not(.active) {
            background-color: #E0F2FE;
            color: #1E40AF;
            border-color: #1E40AF;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.1);
          }
          
          /* 드롭다운 메뉴 */
          .nav-dropdown-menu {
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .nav-dropdown-menu.hidden {
            display: none !important;
          }
          
          .nav-dropdown-menu:not(.hidden) {
            display: block;
          }
          
          .nav-dropdown-btn {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .nav-dropdown-btn:hover {
            color: #1E40AF;
          }
          
          .nav-dropdown-btn .fa-chevron-down {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .nav-dropdown.active .nav-dropdown-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
          }
          
          .nav-dropdown-menu a {
            display: flex;
            align-items: center;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 8px 16px;
          }
          
          .nav-dropdown-menu a:hover {
            background-color: #E0F2FE;
            color: #1E40AF;
            transform: translateX(4px);
          }
          
          /* 카드 효과 */
          .hero-gradient {
            background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #059669 100%);
          }
          
          .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(0);
          }
          
          .card-shadow:hover {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            transform: translateY(-8px);
          }
          
          /* 프로필 카드 효과 */
          .profile-card {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(0);
            background-color: white;
          }
          
          .profile-card:hover {
            border-color: #1E40AF;
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(30, 64, 175, 0.1), 0 10px 10px -5px rgba(30, 64, 175, 0.04);
          }
          
          /* 링크 효과 */
          .link-hover {
            color: #1E40AF;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          
          .link-hover:hover {
            color: #1D4ED8;
            transform: translateX(2px);
          }
          
          .link-hover::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0;
            height: 1px;
            background-color: #1D4ED8;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .link-hover:hover::after {
            width: 100%;
          }
          
          /* 검색 및 입력 필드 */
          .input-focus {
            border: 2px solid #E5E7EB;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .input-focus:focus {
            border-color: #1E40AF;
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
            outline: none;
          }
          
          /* 페이지네이션 */
          .pagination-btn {
            border: 1px solid #D1D5DB;
            color: #6B7280;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .pagination-btn:hover {
            border-color: #1E40AF;
            color: #1E40AF;
            transform: translateY(-1px);
          }
          
          .pagination-btn.active {
            background-color: #1E40AF;
            border-color: #1E40AF;
            color: white;
          }
          .step-connector {
            position: relative;
          }
          .step-connector::before {
            content: '';
            position: absolute;
            top: 50%;
            right: -2rem;
            width: 3rem;
            height: 2px;
            background: #CBD5E1;
            z-index: 1;
          }
          @media (max-width: 768px) {
            .step-connector::before {
              display: none;
            }
          }
          /* 매우 높은 우선순위로 인증 상태별 UI 컨트롤 */
          html body.auth-logged-in header div.container div.flex div#auth-buttons,
          html body.auth-logged-in header div.container div.flex div#auth-buttons a#login-btn,
          html body.auth-logged-in header div.container div.flex div#auth-buttons a#register-btn,
          html body.auth-logged-in div#auth-buttons,
          html body.auth-logged-in a#login-btn,
          html body.auth-logged-in a#register-btn {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          html body.auth-logged-in header div.container div.flex div#user-menu,
          html body.auth-logged-in div#user-menu {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          /* 대시보드 버튼 스타일 */
          #dashboard-btn {
            transition: all 0.3s ease;
            border: none;
            color: white;
          }
          
          #dashboard-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            filter: brightness(1.1);
          }
          
          /* 로그아웃 상태에서는 user-menu 완전히 숨기기 */
          html body:not(.auth-logged-in) header div.container div.flex div#user-menu,
          html body:not(.auth-logged-in) div#user-menu {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* 로그아웃 상태에서는 auth-buttons 확실히 보이기 */
          html body:not(.auth-logged-in) header div.container div.flex div#auth-buttons,
          html body:not(.auth-logged-in) div#auth-buttons {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          /* 추가 안전장치: 클래스 기반 숨김 */
          .force-hide-auth {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          .force-show-user {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          /* Normal auth button styles */
          

          

          

          

          

          

        </style>
    </head>
    <body class="bg-gray-50 min-h-screen font-sans">
        <!-- Header -->
        <header class="bg-white shadow-md border-b-2 border-wowcampus-blue">
            <div class="container mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <div class="w-10 h-10 bg-gradient-to-br from-wowcampus-blue to-accent rounded-lg flex items-center justify-center">
                            <i class="fas fa-graduation-cap text-white text-xl"></i>
                        </div>
                        <div class="flex flex-col">
                            <h1 class="text-2xl font-bold text-wowcampus-blue tracking-tight">WOW-CAMPUS</h1>
                            <span class="text-xs text-gray-500">외국인 구인구직 및 유학 플랫폼</span>
                        </div>
                    </a>
                    <!-- Desktop Navigation -->
                    <nav class="hidden md:flex items-center space-x-8">
                        <a href="#jobs-view" onclick="event.preventDefault(); showJobListView(); return false;" class="text-gray-700 hover:text-wowcampus-blue font-medium py-2 cursor-pointer">
                            구인정보
                        </a>
                        <a href="#jobseekers-view" onclick="event.preventDefault(); showJobSeekersView(); return false;" class="text-gray-700 hover:text-wowcampus-blue font-medium py-2 cursor-pointer">
                            구직정보
                        </a>

                        <div class="relative nav-dropdown">
                            <button class="nav-dropdown-btn text-gray-700 hover:text-wowcampus-blue flex items-center font-medium py-2">
                                유학지원 <i class="fas fa-chevron-down ml-1 text-xs transition-transform"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-52 bg-white shadow-xl rounded-lg border border-gray-100 py-2 z-50">
                                <a href="#study-language" onclick="event.preventDefault(); showLanguageStudyView(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-language mr-2"></i>어학연수 과정
                                </a>
                                <a href="#study-undergraduate" onclick="event.preventDefault(); showUndergraduateView(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-graduation-cap mr-2"></i>학부(학위) 과정
                                </a>
                                <a href="#study-graduate" onclick="event.preventDefault(); showGraduateView(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-university mr-2"></i>석·박사 과정
                                </a>
                            </div>
                        </div>
                        <a href="/static/agent-dashboard?agentId=1" id="agent-menu" class="text-gray-700 hover:text-wowcampus-blue font-medium hidden">에이전트</a>
                    </nav>
                    
                    <!-- Mobile Menu Button & Auth Buttons -->
                    <div class="flex items-center space-x-4">
                        <!-- Mobile Menu Toggle -->
                        <button id="mobile-menu-btn" class="md:hidden text-gray-700 hover:text-wowcampus-blue">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                        
                        <!-- Auth Buttons (Show by default, hide when logged in) -->
                        <div id="auth-buttons" class="flex items-center space-x-3">
                            <button onclick="goToLogin()" id="login-btn" class="btn-primary px-4 md:px-6 py-2 rounded-full font-medium text-sm md:text-base cursor-pointer">
                                <i class="fas fa-sign-in-alt mr-1 md:mr-2"></i>로그인
                            </button>
                            <button onclick="goToRegister()" id="register-btn" class="btn-secondary px-4 md:px-6 py-2 rounded-full font-medium text-sm md:text-base cursor-pointer">
                                <i class="fas fa-user-plus mr-1 md:mr-2"></i>회원가입
                            </button>
                        </div>
                        
                        <!-- User Menu (Hidden by default) -->
                        <div id="user-menu" class="hidden flex items-center space-x-3">
                            <span class="text-sm text-gray-600 hidden sm:inline">환영합니다, <span id="user-name" class="font-medium">사용자님</span></span>
                            
                            <!-- 사용자 유형별 대시보드 버튼 -->
                            <button id="dashboard-btn" class="btn-secondary px-3 md:px-4 py-2 rounded-full font-medium text-sm hidden" onclick="goToDashboard()">
                                <i id="dashboard-icon" class="fas fa-tachometer-alt mr-1"></i><span id="dashboard-text">대시보드</span>
                            </button>
                            
                            <button id="logout-btn" class="btn-primary px-3 md:px-4 py-2 rounded-full font-medium text-sm" style="background-color: #ef4444;">
                                <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Mobile Navigation Menu -->
        <div id="mobile-menu" class="md:hidden bg-white border-b-2 border-wowcampus-blue shadow-lg hidden">
            <div class="container mx-auto px-6 py-4">
                <nav class="space-y-4">
                    <div class="border-b border-gray-200 pb-4">
                        <button onclick="showJobListView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-briefcase mr-3"></i>구인정보 보기
                        </button>
                        <button onclick="showJobSeekersView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-users mr-3"></i>구직정보 보기
                        </button>
                    </div>
                    

                    
                    <div class="border-b border-gray-200 pb-4">
                        <button onclick="showLanguageStudyView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-language mr-3"></i>어학연수 과정
                        </button>
                        <button onclick="showUndergraduateView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-graduation-cap mr-3"></i>학부(학위) 과정
                        </button>
                        <button onclick="showGraduateView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-university mr-3"></i>석·박사 과정
                        </button>
                    </div>
                    
                    <!-- 모바일 사용자 대시보드 메뉴 (로그인 상태에서만 표시) -->
                    <div id="mobile-dashboard-menu" class="hidden border-t border-gray-200 pt-4 mt-4">
                        <button onclick="goToDashboard(); closeMobileMenu();" class="block w-full text-left py-3 px-4 text-white font-medium rounded-lg transition-colors" id="mobile-dashboard-btn">
                            <i id="mobile-dashboard-icon" class="fas fa-tachometer-alt mr-3"></i><span id="mobile-dashboard-text">대시보드</span>
                        </button>
                        
                        <button onclick="logout(); closeMobileMenu();" class="block w-full text-left py-3 px-4 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors mt-2">
                            <i class="fas fa-sign-out-alt mr-3"></i>로그아웃
                        </button>
                    </div>
                </nav>
            </div>
        </div>

        <!-- Main Content -->
        <main>
            <!-- Hero Section -->
            <section class="hero-gradient relative overflow-hidden">
                <div class="absolute inset-0 bg-black opacity-10"></div>
                <div class="relative container mx-auto px-6 py-20 text-center">
                    <div class="max-w-4xl mx-auto">
                        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            WOW-CAMPUS
                        </h1>
                        <p class="text-xl md:text-2xl text-white/90 mb-4 font-light">
                            외국인을 위한 한국 취업 & 유학 플랫폼
                        </p>
                        <p class="text-lg text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
                            해외 에이전트와 국내 기업을 연결하여 외국인 인재의 한국 진출을 지원합니다
                        </p>
                        
                        <!-- 주요 서비스 CTA 버튼 -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                            <button onclick="showJobListView()" class="btn-primary px-8 py-4 rounded-full font-semibold">
                                <i class="fas fa-briefcase mr-2"></i>구인정보 보기
                            </button>
                            <button onclick="showJobSeekersView()" class="btn-secondary px-8 py-4 rounded-full font-semibold">
                                <i class="fas fa-users mr-2"></i>구직정보 보기
                            </button>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- 주요 서비스 소개 -->
            <section class="py-20 bg-white">
                <div class="container mx-auto px-6">
                    <div class="text-center mb-16">
                        <h2 class="text-4xl font-bold text-gray-800 mb-4">우리의 서비스</h2>
                        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                            외국인 구직자와 국내 기업을 연결하는 전문 플랫폼
                        </p>
                    </div>
                    
                    <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <!-- 구인구직 매칭 서비스 카드 -->
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" id="job-matching-card">
                            <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-briefcase text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">구인구직 매칭</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">비자별, 직종별, 지역별 맞춤 매칭 서비스로 최적의 일자리를 찾아드립니다</p>
                            <span class="text-wowcampus-blue font-semibold hover:underline">구인정보 보기 →</span>
                        </div>
                        
                        <!-- 유학 지원 서비스 카드 -->
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" onclick="window.location.href='/static/study-view.html'">
                            <div class="w-16 h-16 bg-gradient-to-br from-accent to-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-graduation-cap text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">유학 지원</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">한국어 연수부터 학위과정까지 전 과정에 대한 체계적 지원을 제공합니다</p>
                            <span class="text-accent font-semibold hover:underline">유학정보 보기 →</span>
                        </div>
                        
                        <!-- 에이전트 관리 서비스 카드 -->
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" onclick="showJobSeekersView()">
                            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-users text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">에이전트 관리</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">해외 에이전트별 구직자 관리 및 지원 현황을 체계적으로 관리합니다</p>
                            <span class="text-purple-500 font-semibold hover:underline">구직정보 보기 →</span>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- 실시간 데이터 섹션 -->
            <section class="py-16 bg-gray-50">
                <div class="container mx-auto px-6">
                    <div class="text-center mb-12">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">최신 정보</h2>
                        <p class="text-lg text-gray-600">실시간으로 업데이트되는 구인정보와 구직자 정보를 확인하세요</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        <!-- 최신 구인정보 -->
                        <div class="bg-white rounded-xl shadow-lg p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h3 class="text-xl font-semibold text-gray-800">
                                    <i class="fas fa-briefcase text-wowcampus-blue mr-2"></i>
                                    최신 구인정보
                                </h3>
                                <span id="jobs-count" class="bg-wowcampus-blue text-white px-3 py-1 rounded-full text-sm font-medium">
                                    Loading...
                                </span>
                            </div>
                            <div id="latest-jobs" class="space-y-4">
                                <div class="animate-pulse">
                                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <button onclick="showJobListView()" class="w-full mt-4 text-center py-3 text-wowcampus-blue hover:bg-wowcampus-light rounded-lg transition-colors font-medium">
                                전체 구인정보 보기 →
                            </button>
                        </div>
                        
                        <!-- 최신 구직자 정보 -->
                        <div class="bg-white rounded-xl shadow-lg p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h3 class="text-xl font-semibold text-gray-800">
                                    <i class="fas fa-users text-accent mr-2"></i>
                                    구직자 현황
                                </h3>
                                <span id="jobseekers-count" class="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                                    Loading...
                                </span>
                            </div>
                            <div id="latest-jobseekers" class="space-y-4">
                                <div class="animate-pulse">
                                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <button onclick="showJobSeekersView()" class="w-full mt-4 text-center py-3 text-accent hover:bg-green-50 rounded-lg transition-colors font-medium">
                                전체 구직자 보기 →
                            </button>
                        </div>
                    </div>
                    
                    <!-- 통계 정보 -->
                    <div class="mt-12 bg-white rounded-xl shadow-lg p-8">
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">WOW-CAMPUS 통계</h3>
                            <p class="text-gray-600">우리 플랫폼의 현재 현황을 한눈에 확인하세요</p>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-wowcampus-blue mb-2" id="stat-jobs">2</div>
                                <div class="text-sm text-gray-600">활성 구인공고</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-accent mb-2" id="stat-jobseekers">1</div>
                                <div class="text-sm text-gray-600">등록 구직자</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-purple-500 mb-2" id="stat-matches">0</div>
                                <div class="text-sm text-gray-600">성공 매칭</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-orange-500 mb-2" id="stat-agents">0</div>
                                <div class="text-sm text-gray-600">활성 에이전트</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Job Details Modal -->
            <div id="job-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                        <div class="flex justify-between items-center">
                            <h3 class="text-2xl font-bold text-gray-900">구인공고 상세정보</h3>
                            <button onclick="closeJobDetailModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                    </div>
                    <div id="job-detail-content" class="p-6">
                        <div class="animate-pulse">
                            <div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                            <div class="space-y-3">
                                <div class="h-4 bg-gray-200 rounded"></div>
                                <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                                <div class="h-4 bg-gray-200 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- JobSeeker Details Modal -->
            <div id="jobseeker-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                        <div class="flex justify-between items-center">
                            <h3 class="text-2xl font-bold text-gray-900">구직자 상세정보</h3>
                            <button onclick="closeJobSeekerDetailModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                    </div>
                    <div id="jobseeker-detail-content" class="p-6">
                        <div class="animate-pulse">
                            <div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                            <div class="space-y-3">
                                <div class="h-4 bg-gray-200 rounded"></div>
                                <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                                <div class="h-4 bg-gray-200 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 서비스 메뉴 -->
            <section class="py-16 bg-white">
                <div class="container mx-auto px-6">
                    <div class="text-center mb-12">
                        <h2 class="text-4xl font-bold text-gray-800 mb-4">서비스 메뉴</h2>
                        <p class="text-xl text-gray-600">필요한 서비스를 선택하세요</p>
                    </div>
                    
                    <!-- Service Menu Tabs -->
                    <div class="bg-white rounded-xl shadow-lg overflow-hidden card-shadow mb-12">
                        <div class="border-b border-gray-100">
                            <div class="flex overflow-x-auto justify-center">
                                <button id="tab-matching" class="tab-button active px-8 py-6 whitespace-nowrap font-medium">
                                    <i class="fas fa-handshake mr-2"></i>매칭 서비스
                                </button>
                                <button id="tab-study" class="tab-button px-8 py-6 whitespace-nowrap font-medium">
                                    <i class="fas fa-graduation-cap mr-2"></i>유학 프로그램
                                </button>
                                <button id="tab-stats" class="tab-button px-8 py-6 whitespace-nowrap font-medium">
                                    <i class="fas fa-chart-bar mr-2"></i>통계 대시보드
                                </button>
                            </div>
                        </div>

                        <!-- Tab Contents -->
                        <div class="p-8">
                            <div id="content-matching" class="tab-content">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-semibold mb-4">스마트 매칭 시스템</h3>
                                    <div class="bg-blue-50 p-4 rounded-lg mb-6">
                                        <p class="text-blue-800 text-sm">
                                            <i class="fas fa-info-circle mr-2"></i>
                                            AI 기반으로 구직자의 조건과 구인공고를 자동 매칭합니다
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 매칭 통계 -->
                                <div class="grid md:grid-cols-3 gap-6 mb-8">
                                    <div class="bg-green-50 p-6 rounded-lg">
                                        <div class="flex items-center">
                                            <i class="fas fa-check-circle text-green-500 text-3xl mr-4"></i>
                                            <div>
                                                <div class="text-3xl font-bold text-green-600" id="perfect-matches">127</div>
                                                <div class="text-sm text-gray-600">완벽 매칭</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="bg-yellow-50 p-6 rounded-lg">
                                        <div class="flex items-center">
                                            <i class="fas fa-star text-yellow-500 text-3xl mr-4"></i>
                                            <div>
                                                <div class="text-3xl font-bold text-yellow-600" id="good-matches">284</div>
                                                <div class="text-sm text-gray-600">좋은 매칭</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="bg-blue-50 p-6 rounded-lg">
                                        <div class="flex items-center">
                                            <i class="fas fa-clock text-blue-500 text-3xl mr-4"></i>
                                            <div>
                                                <div class="text-3xl font-bold text-blue-600" id="pending-matches">56</div>
                                                <div class="text-sm text-gray-600">매칭 대기</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-center">
                                    <button onclick="showJobSeekersView()" class="btn-primary px-8 py-3 rounded-full font-semibold mr-4">
                                        <i class="fas fa-users mr-2"></i>구직자 매칭
                                    </button>
                                    <button onclick="showJobListView()" class="btn-secondary px-8 py-3 rounded-full font-semibold">
                                        <i class="fas fa-briefcase mr-2"></i>구인정보 매칭
                                    </button>
                                </div>
                            </div>

                            <div id="content-study" class="tab-content hidden">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-semibold mb-4">유학 프로그램</h3>
                                    <div class="bg-green-50 p-4 rounded-lg mb-6">
                                        <p class="text-green-800 text-sm">
                                            <i class="fas fa-graduation-cap mr-2"></i>
                                            한국어 연수부터 학위과정까지 체계적인 유학 지원
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 유학 프로그램 유형 -->
                                <div class="grid md:grid-cols-3 gap-6 mb-8">
                                    <div class="bg-blue-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-language text-blue-500 text-4xl mb-4"></i>
                                        <h4 class="text-lg font-semibold mb-2">어학연수</h4>
                                        <p class="text-gray-600 text-sm mb-4">한국어 집중 과정</p>
                                        <button onclick="showLanguageStudyView()" class="btn-primary px-4 py-2 rounded-lg">
                                            자세히 보기
                                        </button>
                                    </div>
                                    <div class="bg-purple-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-university text-purple-500 text-4xl mb-4"></i>
                                        <h4 class="text-lg font-semibold mb-2">학부 과정</h4>
                                        <p class="text-gray-600 text-sm mb-4">학사 학위 취득</p>
                                        <button onclick="showUndergraduateView()" class="btn-primary px-4 py-2 rounded-lg">
                                            자세히 보기
                                        </button>
                                    </div>
                                    <div class="bg-orange-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-graduation-cap text-orange-500 text-4xl mb-4"></i>
                                        <h4 class="text-lg font-semibold mb-2">대학원 과정</h4>
                                        <p class="text-gray-600 text-sm mb-4">석·박사 학위</p>
                                        <button onclick="showGraduateView()" class="btn-primary px-4 py-2 rounded-lg">
                                            자세히 보기
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div id="content-stats" class="tab-content hidden">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-semibold mb-4">통계 대시보드</h3>
                                    <div class="bg-purple-50 p-4 rounded-lg mb-6">
                                        <p class="text-purple-800 text-sm">
                                            <i class="fas fa-chart-line mr-2"></i>
                                            실시간 플랫폼 운영 현황과 성과를 확인하세요
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 통계 카드들 -->
                                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div class="bg-blue-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-users text-blue-500 text-3xl mb-3"></i>
                                        <div class="text-2xl font-bold text-blue-600 mb-1" id="total-jobseekers">1,284</div>
                                        <div class="text-sm text-gray-600">등록 구직자</div>
                                    </div>
                                    <div class="bg-green-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-briefcase text-green-500 text-3xl mb-3"></i>
                                        <div class="text-2xl font-bold text-green-600 mb-1" id="total-jobs">567</div>
                                        <div class="text-sm text-gray-600">구인공고</div>
                                    </div>
                                    <div class="bg-purple-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-handshake text-purple-500 text-3xl mb-3"></i>
                                        <div class="text-2xl font-bold text-purple-600 mb-1" id="successful-matches">892</div>
                                        <div class="text-sm text-gray-600">성공 매칭</div>
                                    </div>
                                    <div class="bg-orange-50 p-6 rounded-lg text-center">
                                        <i class="fas fa-graduation-cap text-orange-500 text-3xl mb-3"></i>
                                        <div class="text-2xl font-bold text-orange-600 mb-1" id="study-programs">156</div>
                                        <div class="text-sm text-gray-600">유학 프로그램</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- 이용 절차 안내 -->
            <section class="py-20 bg-wowcampus-light">
                <div class="container mx-auto px-6">
                    <div class="text-center mb-16">
                        <h2 class="text-4xl font-bold text-gray-800 mb-4">이용 절차</h2>
                        <p class="text-xl text-gray-600">간단한 3단계로 시작하세요</p>
                    </div>
                    
                    <div class="max-w-4xl mx-auto">
                        <div class="grid md:grid-cols-3 gap-8">
                            <div class="text-center step-connector">
                                <div class="w-20 h-20 bg-wowcampus-blue rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span class="text-2xl font-bold text-white">1</span>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-800 mb-3">회원가입</h3>
                                <p class="text-gray-600">간단한 정보 입력으로 <br>회원가입을 완료하세요</p>
                            </div>
                            
                            <div class="text-center step-connector">
                                <div class="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span class="text-2xl font-bold text-white">2</span>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-800 mb-3">정보 등록</h3>
                                <p class="text-gray-600">구직 또는 구인 정보를 <br>등록하고 매칭을 기다리세요</p>
                            </div>
                            
                            <div class="text-center">
                                <div class="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span class="text-2xl font-bold text-white">3</span>
                                </div>
                                <h3 class="text-xl font-semibold text-gray-800 mb-3">매칭 성공</h3>
                                <p class="text-gray-600">전문 에이전트의 도움으로 <br>성공적인 취업 또는 인재 발굴</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>

        <!-- Footer -->
        <footer class="bg-wowcampus-dark text-white py-16">
            <div class="container mx-auto px-6">
                <div class="grid md:grid-cols-4 gap-8 mb-8">
                    <div class="col-span-2">
                        <div class="flex items-center space-x-3 mb-6">
                            <div class="w-12 h-12 bg-gradient-to-br from-wowcampus-blue to-accent rounded-lg flex items-center justify-center">
                                <i class="fas fa-graduation-cap text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold">WOW-CAMPUS</h3>
                                <span class="text-gray-300 text-sm">외국인 구인구직 및 유학 플랫폼</span>
                            </div>
                        </div>
                        <p class="text-gray-300 mb-4 leading-relaxed">
                            외국인 인재와 국내 기업을 연결하는 전문 플랫폼입니다. <br>
                            전문 에이전트와 함께 성공적인 취업과 유학을 지원합니다.
                        </p>
                        <div class="flex space-x-4">
                            <a href="#" class="text-gray-300 hover:text-white transition-colors">
                                <i class="fab fa-facebook-f text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-white transition-colors">
                                <i class="fab fa-twitter text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-white transition-colors">
                                <i class="fab fa-linkedin-in text-xl"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="text-lg font-semibold mb-4">서비스</h4>
                        <ul class="space-y-2 text-gray-300">
                            <li><a href="#" class="hover:text-white transition-colors">구인정보</a></li>
                            <li><a href="#" class="hover:text-white transition-colors">구직정보</a></li>
                            <li><a href="#" class="hover:text-white transition-colors">유학지원</a></li>
                            <li><a href="#" class="hover:text-white transition-colors">에이전트</a></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="text-lg font-semibold mb-4">고객지원</h4>
                        <ul class="space-y-2 text-gray-300">
                            <li><a href="/static/notice" class="hover:text-white transition-colors">공지사항</a></li>
                            <li><a href="/static/faq" class="hover:text-white transition-colors">FAQ</a></li>
                            <li><a href="/static/contact" class="hover:text-white transition-colors">문의하기</a></li>
                            <li><a href="/static/terms" class="hover:text-white transition-colors">이용약관</a></li>
                            <li><a href="/static/privacy" class="hover:text-white transition-colors">개인정보처리방침</a></li>
                            <li><a href="/static/cookies" class="hover:text-white transition-colors">쿠키정책</a></li>
                        </ul>
                    </div>
                </div>
                
                <div class="border-t border-gray-700 pt-8">
                    <div class="flex flex-col md:flex-row justify-between items-center">
                        <p class="text-gray-400 text-sm">
                            &copy; 2025 WOW-CAMPUS 외국인 구인구직 및 유학생 지원플랫폼. All rights reserved.
                        </p>
                        <div class="flex space-x-6 mt-4 md:mt-0">
                            <a href="/static/terms" class="text-gray-400 hover:text-white text-sm transition-colors">이용약관</a>
                            <a href="/static/privacy" class="text-gray-400 hover:text-white text-sm transition-colors">개인정보처리방침</a>
                            <a href="/static/cookies" class="text-gray-400 hover:text-white text-sm transition-colors">쿠키정책</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // 에이전트 관리 클릭 처리 함수
            function handleAgentManagementClick() {
                // 로그인 상태 확인
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                
                if (!token) {
                    // 미로그인 상태
                    const message = "로그인이 필요합니다\\\\n\\\\n에이전트 관리 기능을 이용하시려면 먼저 로그인해주세요.\\\\n\\\\n에이전트 계정으로 로그인 시:\\\\n- 구직자 등록 및 관리\\\\n- 학생 등록 및 관리\\\\n- 지원 현황 관리\\\\n- 매칭 서비스 이용\\\\n\\\\n지금 로그인하시겠습니까?";

                    if (confirm(message)) {
                        window.location.href = '/static/login.html';
                    }
                    return;
                }
                
                // 로그인된 상태 - 사용자 유형 확인
                if (user.type === 'agent' || user.type === 'admin') {
                    // 에이전트 또는 관리자인 경우 대시보드로 이동
                    window.location.href = \`/static/agent-dashboard?agentId=\${user.id}\`;
                } else {
                    // 일반 회원인 경우
                    const restrictMessage = "에이전트 전용 메뉴입니다\\\\n\\\\n죄송합니다. 이 기능은 에이전트 회원만 이용할 수 있습니다.\\\\n\\\\n현재 회원 유형: " + getUserTypeName(user.type) + "\\\\n\\\\n에이전트 기능을 이용하시려면:\\\\n- 에이전트 계정으로 새로 회원가입\\\\n- 또는 에이전트 계정으로 로그인\\\\n\\\\n에이전트 회원가입을 진행하시겠습니까?";

                    if (confirm(restrictMessage)) {
                        goToRegister(); // 안전한 회원가입 함수 사용
                    }
                }
            }
            
            // 사용자 유형명 변환 함수
            function getUserTypeName(userType) {
                const typeNames = {
                    'jobseeker': '구직자',
                    'employer': '기업 회원',
                    'agent': '에이전트',
                    'admin': '관리자'
                };
                return typeNames[userType] || userType;
            }

            // 로그인 페이지로 이동
            function goToLogin() {
                window.location.href = '/static/login.html';
            }

            // 회원가입 페이지로 이동
            function goToRegister() {
                window.location.href = '/static/register.html';
            }

            // 페이지 로드시 로그인 상태 확인
            document.addEventListener('DOMContentLoaded', function() {
                checkLoginStatus();
            });

            // 로그인 상태 확인 함수
            function checkLoginStatus() {
                const token = localStorage.getItem('token');
                // 두 개의 키를 모두 확인하여 호환성 유지
                let user = JSON.parse(localStorage.getItem('user') || '{}');
                if (!user.id) {
                    user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                }
                
                const authButtons = document.getElementById('auth-buttons');
                const userMenu = document.getElementById('user-menu');
                const userNameSpan = document.getElementById('user-name');
                
                console.log('checkLoginStatus:', { token: !!token, user, hasId: !!user.id });
                
                if (token && user.id) {
                    // 로그인된 상태
                    console.log('로그인 상태 확인됨 - UI 업데이트');
                    authButtons.classList.add('hidden');
                    userMenu.classList.remove('hidden');
                    if (userNameSpan && user.name) {
                        userNameSpan.textContent = user.name;
                    }
                    
                    // 사용자 유형별 대시보드 버튼 설정
                    updateDashboardButton(user.userType);
                    updateMobileDashboardMenu(user.userType);
                    
                    // 로그인된 상태일 때 body에 클래스 추가
                    document.body.classList.add('auth-logged-in');
                } else {
                    // 로그아웃 상태
                    console.log('로그아웃 상태 - UI 업데이트');
                    authButtons.classList.remove('hidden');
                    userMenu.classList.add('hidden');
                    document.body.classList.remove('auth-logged-in');
                    
                    // 모바일 대시보드 메뉴 숨김
                    const mobileDashboardMenu = document.getElementById('mobile-dashboard-menu');
                    if (mobileDashboardMenu) {
                        mobileDashboardMenu.classList.add('hidden');
                    }
                }
            }

            // 사용자 유형별 대시보드 버튼 업데이트 함수
            function updateDashboardButton(userType) {
                const dashboardBtn = document.getElementById('dashboard-btn');
                const dashboardIcon = document.getElementById('dashboard-icon');
                const dashboardText = document.getElementById('dashboard-text');
                
                if (!dashboardBtn || !dashboardIcon || !dashboardText) return;
                
                console.log('대시보드 버튼 업데이트:', userType);
                
                // 사용자 유형별 아이콘과 텍스트 설정
                switch(userType) {
                    case 'admin':
                        dashboardIcon.className = 'fas fa-shield-alt mr-1';
                        dashboardText.textContent = '관리자';
                        dashboardBtn.style.backgroundColor = '#dc2626';
                        break;
                    case 'agent':
                        dashboardIcon.className = 'fas fa-handshake mr-1';
                        dashboardText.textContent = '에이전트';
                        dashboardBtn.style.backgroundColor = '#7c3aed';
                        break;
                    case 'employer':
                        dashboardIcon.className = 'fas fa-building mr-1';
                        dashboardText.textContent = '기업';
                        dashboardBtn.style.backgroundColor = '#059669';
                        break;
                    case 'instructor':
                        dashboardIcon.className = 'fas fa-chalkboard-teacher mr-1';
                        dashboardText.textContent = '강사';
                        dashboardBtn.style.backgroundColor = '#0891b2';
                        break;
                    case 'jobseeker':
                    case 'student':
                        dashboardIcon.className = 'fas fa-user-graduate mr-1';
                        dashboardText.textContent = userType === 'student' ? '학생' : '구직자';
                        dashboardBtn.style.backgroundColor = '#ea580c';
                        break;
                    default:
                        dashboardIcon.className = 'fas fa-tachometer-alt mr-1';
                        dashboardText.textContent = '대시보드';
                        dashboardBtn.style.backgroundColor = '#3b82f6';
                        break;
                }
                
                // 대시보드 버튼 보이기
                dashboardBtn.classList.remove('hidden');
            }
            
            // 모바일 대시보드 메뉴 업데이트 함수
            function updateMobileDashboardMenu(userType) {
                const mobileDashboardMenu = document.getElementById('mobile-dashboard-menu');
                const mobileDashboardBtn = document.getElementById('mobile-dashboard-btn');
                const mobileDashboardIcon = document.getElementById('mobile-dashboard-icon');
                const mobileDashboardText = document.getElementById('mobile-dashboard-text');
                
                if (!mobileDashboardMenu || !mobileDashboardBtn || !mobileDashboardIcon || !mobileDashboardText) return;
                
                console.log('모바일 대시보드 메뉴 업데이트:', userType);
                
                // 사용자 유형별 아이콘과 텍스트, 색상 설정
                switch(userType) {
                    case 'admin':
                        mobileDashboardIcon.className = 'fas fa-shield-alt mr-3';
                        mobileDashboardText.textContent = '관리자 대시보드';
                        mobileDashboardBtn.style.backgroundColor = '#dc2626';
                        break;
                    case 'agent':
                        mobileDashboardIcon.className = 'fas fa-handshake mr-3';
                        mobileDashboardText.textContent = '에이전트 대시보드';
                        mobileDashboardBtn.style.backgroundColor = '#7c3aed';
                        break;
                    case 'employer':
                        mobileDashboardIcon.className = 'fas fa-building mr-3';
                        mobileDashboardText.textContent = '기업 대시보드';
                        mobileDashboardBtn.style.backgroundColor = '#059669';
                        break;
                    case 'instructor':
                        mobileDashboardIcon.className = 'fas fa-chalkboard-teacher mr-3';
                        mobileDashboardText.textContent = '강사 대시보드';
                        mobileDashboardBtn.style.backgroundColor = '#0891b2';
                        break;
                    case 'jobseeker':
                    case 'student':
                        mobileDashboardIcon.className = 'fas fa-user-graduate mr-3';
                        mobileDashboardText.textContent = (userType === 'student' ? '학생' : '구직자') + ' 프로필';
                        mobileDashboardBtn.style.backgroundColor = '#ea580c';
                        break;
                    default:
                        mobileDashboardIcon.className = 'fas fa-tachometer-alt mr-3';
                        mobileDashboardText.textContent = '대시보드';
                        mobileDashboardBtn.style.backgroundColor = '#3b82f6';
                        break;
                }
                
                // 모바일 대시보드 메뉴 보이기
                mobileDashboardMenu.classList.remove('hidden');
            }

            // 사용자 유형별 대시보드로 이동 (강화된 버전)
            function goToDashboard() {
                console.log('대시보드 이동 함수 호출됨');
                
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
                
                console.log('토큰:', token ? '있음' : '없음');
                console.log('사용자 정보:', user);
                
                // 인증 확인
                if (!token) {
                    console.log('토큰이 없어서 로그인 페이지로 이동');
                    alert('로그인이 필요합니다.');
                    window.location.href = '/static/login.html';
                    return;
                }
                
                if (!user || !user.userType) {
                    console.error('사용자 유형 정보를 찾을 수 없습니다.');
                    alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
                    window.location.href = '/static/login.html';
                    return;
                }
                
                console.log('대시보드 이동 준비:', user.userType);
                
                // 사용자 유형별 대시보드 URL
                let dashboardUrl = '/';
                
                switch(user.userType) {
                    case 'admin':
                        dashboardUrl = '/static/admin-dashboard.html';
                        console.log('관리자 대시보드로 이동');
                        break;
                    case 'agent':
                        dashboardUrl = '/static/agent-dashboard.html';
                        console.log('에이전트 대시보드로 이동');
                        break;
                    case 'employer':
                        dashboardUrl = '/static/employer-dashboard.html';
                        console.log('기업 대시보드로 이동');
                        break;
                    case 'instructor':
                        dashboardUrl = '/static/instructor-dashboard.html';
                        console.log('강사 대시보드로 이동');
                        break;
                    case 'jobseeker':
                    case 'student':
                        dashboardUrl = '/static/jobseeker-dashboard.html';
                        console.log('구직자 대시보드로 이동');
                        break;
                    default:
                        console.warn('알 수 없는 사용자 유형:', user.userType);
                        alert('알 수 없는 사용자 유형입니다: ' + user.userType);
                        dashboardUrl = '/';
                        break;
                }
                
                console.log('최종 대시보드 URL:', dashboardUrl);
                
                // 확실한 리다이렉트를 위해 약간의 지연 추가
                setTimeout(function() {
                    console.log('실제 페이지 이동 실행:', dashboardUrl);
                    window.location.href = dashboardUrl;
                }, 100);
            }

            // 로그아웃 함수
            function logout() {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                
                // UI 업데이트
                checkLoginStatus();
                
                alert('로그아웃 되었습니다.');
                window.location.reload();
            }
            
            // 로그아웃 버튼 이벤트 리스너
            document.getElementById('logout-btn')?.addEventListener('click', logout);
            
            // 메인페이지 실시간 데이터 로딩 함수
            async function loadMainPageData() {
                console.log('🔥 loadMainPageData 함수 시작');
                try {
                    // 통계 정보 로딩
                    console.log('📊 통계 API 호출 시작');
                    const statsResponse = await fetch('/api/stats');
                    console.log('📊 통계 API 응답 받음:', statsResponse.status);
                    const statsData = await statsResponse.json();
                    console.log('📊 통계 데이터:', statsData);
                    
                    if (statsData.success) {
                        console.log('📊 통계 데이터 DOM 업데이트 시작');
                        const statJobs = document.getElementById('stat-jobs');
                        const statJobseekers = document.getElementById('stat-jobseekers');
                        const statMatches = document.getElementById('stat-matches');
                        const statAgents = document.getElementById('stat-agents');
                        
                        console.log('📊 DOM 요소 찾기:', {
                            statJobs: !!statJobs,
                            statJobseekers: !!statJobseekers,
                            statMatches: !!statMatches,
                            statAgents: !!statAgents
                        });
                        
                        if (statJobs) statJobs.textContent = statsData.stats.activeJobs || '0';
                        if (statJobseekers) statJobseekers.textContent = statsData.stats.totalJobSeekers || '0';
                        if (statMatches) statMatches.textContent = statsData.stats.successfulMatches || '0';
                        if (statAgents) statAgents.textContent = statsData.stats.activeAgents || '0';
                        
                        console.log('📊 통계 데이터 DOM 업데이트 완료');
                    } else {
                        console.error('📊 통계 API 실패:', statsData);
                    }
                    
                    // 최신 구인정보 로딩
                    const jobsResponse = await fetch('/api/jobs?page=1&limit=3');
                    const jobsData = await jobsResponse.json();
                    
                    if (jobsData.success && jobsData.jobs.length > 0) {
                        const jobsCount = document.getElementById('jobs-count');
                        const latestJobs = document.getElementById('latest-jobs');
                        
                        jobsCount.textContent = \`\${jobsData.pagination.total}개\`;
                        
                        latestJobs.innerHTML = jobsData.jobs.map(job => \`
                            <div class="p-3 border border-gray-200 rounded-lg hover:border-wowcampus-blue transition-colors cursor-pointer">
                                <h4 class="font-medium text-gray-800 mb-1">\${job.title || '제목 없음'}</h4>
                                <p class="text-sm text-gray-600">\${job.company || '회사명 없음'} • \${job.location || '위치 미정'}</p>
                                <span class="text-xs text-wowcampus-blue font-medium">\${job.visa_type || 'E-9'} 비자</span>
                            </div>
                        \`).join('');
                    } else {
                        document.getElementById('jobs-count').textContent = '0개';
                        document.getElementById('latest-jobs').innerHTML = \`
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-briefcase text-2xl mb-2"></i>
                                <p>등록된 구인정보가 없습니다</p>
                            </div>
                        \`;
                    }
                    
                    // 구직자 현황 로딩
                    const jobseekersResponse = await fetch('/api/jobseekers?page=1&limit=3');
                    const jobseekersData = await jobseekersResponse.json();
                    
                    if (jobseekersData.success && jobseekersData.jobseekers.length > 0) {
                        const jobseekersCount = document.getElementById('jobseekers-count');
                        const latestJobseekers = document.getElementById('latest-jobseekers');
                        
                        jobseekersCount.textContent = \`\${jobseekersData.pagination.total}명\`;
                        
                        latestJobseekers.innerHTML = jobseekersData.jobseekers.map(seeker => \`
                            <div class="p-3 border border-gray-200 rounded-lg hover:border-accent transition-colors">
                                <h4 class="font-medium text-gray-800 mb-1">\${seeker.name || '이름 비공개'}</h4>
                                <p class="text-sm text-gray-600">\${seeker.nationality || '국적 미정'} • \${seeker.korean_level || '한국어 수준 미정'}</p>
                                <span class="text-xs text-accent font-medium">\${seeker.visa_status || '비자 상태'}</span>
                            </div>
                        \`).join('');
                    } else {
                        document.getElementById('jobseekers-count').textContent = '0명';
                        document.getElementById('latest-jobseekers').innerHTML = \`
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-users text-2xl mb-2"></i>
                                <p>등록된 구직자가 없습니다</p>
                            </div>
                        \`;
                    }
                    
                } catch (error) {
                    console.error('🚨 메인페이지 데이터 로딩 실패:', error);
                    console.error('🚨 에러 상세:', error.stack);
                    
                    // 에러 시 기본값 표시
                    const statJobs = document.getElementById('stat-jobs');
                    const statJobseekers = document.getElementById('stat-jobseekers');
                    const statMatches = document.getElementById('stat-matches');
                    const statAgents = document.getElementById('stat-agents');
                    const jobsCount = document.getElementById('jobs-count');
                    const jobseekersCount = document.getElementById('jobseekers-count');
                    
                    if (statJobs) statJobs.textContent = '0';
                    if (statJobseekers) statJobseekers.textContent = '1';
                    if (statMatches) statMatches.textContent = '0';
                    if (statAgents) statAgents.textContent = '0';
                    if (jobsCount) jobsCount.textContent = '2개';
                    if (jobseekersCount) jobseekersCount.textContent = '1명';
                    
                    console.log('🚨 기본값으로 설정 완료');
                }
            }
            
            // 페이지 로드 시 데이터 로딩
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded - Calling loadMainPageData');
                checkLoginStatus();
                loadMainPageData();
            });
            
            // 추가 안전장치 - window load 시에도 호출
            window.addEventListener('load', function() {
                console.log('Window loaded - Calling loadMainPageData as backup');
                loadMainPageData();
            });
            
            // 네비게이션 메뉴 함수들
            
            // 구인정보 페이지로 이동 (로그인 필요)
            function showJobListView() {
                console.log('구인정보 보기 클릭 - 로그인 확인 중...');
                
                const token = localStorage.getItem('token');
                const userStr = localStorage.getItem('currentUser');
                
                if (token && userStr) {
                    // 로그인된 상태 - 구인정보 페이지로 이동
                    console.log('로그인 확인됨 - 구인정보 페이지로 이동');
                    window.location.href = '/static/jobs-view.html';
                } else {
                    // 로그인되지 않은 상태 - 인증 모달 표시
                    console.log('로그인 필요 - 인증 모달 표시');
                    if (confirm('🔐 구인정보를 보시려면 로그인이 필요합니다.\\n\\n로그인 페이지로 이동하시겠습니까?')) {
                        goToLogin();
                    }
                }
            }
            
            // 구직정보 페이지로 이동 (로그인 필요)
            function showJobSeekersView() {
                console.log('구직정보 페이지로 이동');
                window.location.href = '/static/jobseekers-view.html';
            }
            
            // 어학연수 페이지로 이동
            function showLanguageStudyView() {
                console.log('어학연수 페이지로 이동');
                window.location.href = '/static/matching-service.html?tab=language';
            }
            
            // 학부과정 페이지로 이동
            function showUndergraduateView() {
                console.log('학부과정 페이지로 이동');
                window.location.href = '/static/matching-service.html?tab=undergraduate';
            }
            
            // 대학원과정 페이지로 이동
            function showGraduateView() {
                console.log('대학원과정 페이지로 이동');
                window.location.href = '/static/matching-service.html?tab=graduate';
            }
            
            // 모바일 메뉴 토글 함수들
            function toggleMobileMenu() {
                const mobileMenu = document.getElementById('mobile-menu');
                mobileMenu.classList.toggle('hidden');
            }
            
            function closeMobileMenu() {
                const mobileMenu = document.getElementById('mobile-menu');
                mobileMenu.classList.add('hidden');
            }
            
            // 모바일 메뉴 버튼 이벤트 리스너 추가
            document.addEventListener('DOMContentLoaded', function() {
                const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                if (mobileMenuBtn) {
                    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
                }
                
                // 구인구직 매칭 카드 이벤트 리스너 추가
                const jobMatchingCard = document.getElementById('job-matching-card');
                if (jobMatchingCard) {
                    jobMatchingCard.addEventListener('click', function() {
                        console.log('구인구직 매칭 카드 클릭');
                        showJobListView();
                    });
                }
            });
            
            // 탭 관련 함수들
            function switchTab(tabName) {
                // 모든 탭 비활성화
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                // 선택된 탭 활성화
                const selectedTabBtn = document.getElementById('tab-' + tabName);
                const selectedContent = document.getElementById('content-' + tabName);
                
                if (selectedTabBtn && selectedContent) {
                    selectedTabBtn.classList.add('active');
                    selectedContent.classList.remove('hidden');
                }
            }
            
            // 탭 버튼 이벤트 리스너 등록
            document.addEventListener('DOMContentLoaded', function() {
                const tabButtons = document.querySelectorAll('.tab-button');
                tabButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const tabName = this.id.replace('tab-', '');
                        switchTab(tabName);
                    });
                });
            });
        </script>
        
        <!-- Auth UI control script removed for normal operation -->
            (function(){

        <!-- Authentication utilities -->
        <script src="/static/auth-utils.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `;
  
  return c.html(indexContent)
})

// 테스트 페이지 라우트
app.get('/test-navigation', async (c) => {
  const testContent = `<!DOCTYPE html>
<html>
<head>
    <title>네비게이션 테스트</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8">
    <h1 class="text-2xl font-bold mb-4">네비게이션 테스트</h1>
    <div class="space-y-4">
        <button onclick="testJobSeekerMatching()" class="bg-blue-500 text-white px-4 py-2 rounded">구직자 매칭 테스트</button>
        <button onclick="testJobListings()" class="bg-green-500 text-white px-4 py-2 rounded">구인정보 테스트</button>
        <div id="result" class="mt-4 p-4 bg-gray-100 rounded"></div>
    </div>

    <script>
        function testJobSeekerMatching() {
            console.log('구직자 매칭 테스트 클릭');
            document.getElementById('result').innerHTML = '구직자 매칭으로 이동 시도...';
            window.location.href = '/static/matching-service.html?tab=matching';
        }

        function testJobListings() {
            console.log('구인정보 테스트 클릭');
            document.getElementById('result').innerHTML = '구인정보로 이동 시도...';
            window.location.href = '/static/matching-service.html?tab=programs';
        }
        
        // 메인 페이지로 돌아가기
        function goBack() {
            window.location.href = '/';
        }
    </script>
    <a href="/" class="text-blue-500 underline">메인 페이지로 돌아가기</a>
</body>
</html>`
  
  return c.html(testContent)
})

// 매칭 서비스 페이지 라우트
app.get('/static/matching-service.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>매칭 서비스 | WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'wow-blue': '#1e40af',
                        'wow-light-blue': '#3b82f6',
                        'wow-green': '#059669'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-bold text-wow-blue">WOW-CAMPUS 매칭 서비스</h1>
                    <a href="/" class="text-wow-blue hover:underline">← 메인으로 돌아가기</a>
                </div>
            </div>
        </header>
        
        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-bold mb-4">네비게이션 성공!</h2>
                <p class="text-gray-600 mb-4">
                    축하합니다! 메인 페이지의 네비게이션 버튼이 정상적으로 작동했습니다.
                </p>
                
                <div class="space-y-4">
                    <div class="p-4 bg-green-50 rounded-lg">
                        <h3 class="font-semibold text-green-800">✅ 구현 완료된 기능</h3>
                        <ul class="mt-2 text-green-700">
                            <li>• 메인 페이지 로드</li>
                            <li>• 네비게이션 함수 정의</li>
                            <li>• 구직자 매칭 서비스 이동</li>
                            <li>• 구인정보 보기 이동</li>
                        </ul>
                    </div>
                    
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <h3 class="font-semibold text-blue-800">🔗 URL 파라미터 처리</h3>
                        <p class="text-blue-700 mt-2">현재 URL: <span id="currentUrl"></span></p>
                        <p class="text-blue-700">탭 파라미터: <span id="tabParam"></span></p>
                    </div>
                </div>
                
                <div class="mt-6 flex space-x-4">
                    <button onclick="goBack()" class="bg-wow-blue text-white px-4 py-2 rounded hover:bg-blue-700">
                        메인으로 돌아가기
                    </button>
                    <button onclick="testAnotherTab()" class="bg-wow-green text-white px-4 py-2 rounded hover:bg-green-700">
                        다른 탭 테스트
                    </button>
                </div>
            </div>
        </main>
    </div>

    <script>
        // URL 정보 표시
        document.getElementById('currentUrl').textContent = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab') || '없음';
        document.getElementById('tabParam').textContent = tab;
        
        function goBack() {
            window.location.href = '/';
        }
        
        function testAnotherTab() {
            window.location.href = '/static/matching-service.html?tab=programs';
        }
        
        console.log('매칭 서비스 페이지 로드 완료');
        console.log('현재 탭:', tab);
    </script>
</body>
</html>`)
})

// 명시적 HTML 페이지 라우트들 - 직접 HTML 읽기 방식으로 변경
app.get('/static/login.html', async (c) => {
  try {
    // 로그인 페이지 HTML을 직접 반환
    return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1E40AF',
                        secondary: '#3B82F6',
                        accent: '#059669',
                        wowcampus: {
                            blue: '#1E40AF',
                            light: '#E0F2FE',
                            dark: '#0F172A'
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gradient-to-br from-wowcampus-light to-white min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-md border-b-2 border-wowcampus-blue">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div class="w-10 h-10 bg-gradient-to-br from-wowcampus-blue to-accent rounded-lg flex items-center justify-center">
                        <i class="fas fa-graduation-cap text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-wowcampus-blue tracking-tight">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">외국인 구인구직 및 유학 플랫폼</span>
                    </div>
                </a>
                <nav class="flex space-x-6">
                    <a href="/" class="text-gray-600 hover:text-wowcampus-blue font-medium">
                        <i class="fas fa-home mr-2"></i>홈
                    </a>
                    <a href="/static/register.html" class="text-gray-600 hover:text-wowcampus-blue font-medium">
                        <i class="fas fa-user-plus mr-2"></i>회원가입
                    </a>
                </nav>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-6 py-12">
        <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
            <!-- 로고 및 제목 -->
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-sign-in-alt text-white text-2xl"></i>
                </div>
                <h2 class="text-3xl font-bold text-gray-800 mb-2">로그인</h2>
                <p class="text-gray-600">WOW-CAMPUS에 오신 것을 환영합니다</p>
            </div>

            <!-- 회원 유형 선택 -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-3">회원 유형을 선택하세요</label>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" class="user-type-btn" data-type="jobseeker">
                        <i class="fas fa-user-graduate mr-2"></i>구직자
                    </button>
                    <button type="button" class="user-type-btn" data-type="employer">
                        <i class="fas fa-building mr-2"></i>기업
                    </button>
                    <button type="button" class="user-type-btn" data-type="agent">
                        <i class="fas fa-handshake mr-2"></i>에이전트
                    </button>
                    <button type="button" class="user-type-btn" data-type="admin">
                        <i class="fas fa-shield-alt mr-2"></i>관리자
                    </button>
                </div>
            </div>

            <!-- 로그인 폼 -->
            <form id="loginForm" class="space-y-6">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input type="email" id="email" name="email" required 
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent"
                           placeholder="이메일을 입력하세요">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                    <div class="relative">
                        <input type="password" id="password" name="password" required 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent pr-12"
                               placeholder="비밀번호를 입력하세요">
                        <button type="button" id="togglePassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <button type="submit" id="loginBtn" class="w-full bg-wowcampus-blue text-white py-3 rounded-lg font-medium hover:bg-wowcampus-dark transition-colors" disabled>
                    로그인
                </button>
            </form>

            <!-- 회원가입 링크 -->
            <div class="text-center mt-6">
                <p class="text-sm text-gray-600">
                    계정이 없으신가요? 
                    <a href="/static/register.html" class="text-wowcampus-blue font-medium hover:underline">회원가입</a>
                </p>
            </div>
        </div>

        <!-- 로딩 오버레이 -->
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-wowcampus-blue mx-auto mb-4"></div>
                <p class="text-gray-600">로그인 중...</p>
            </div>
        </div>
    </main>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        let selectedUserType = null;

        // 회원 유형 선택 - 개선된 버전
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                console.log('🎯 User type button clicked:', this.dataset.type);
                
                // 모든 버튼에서 active 클래스 제거
                document.querySelectorAll('.user-type-btn').forEach(b => {
                    b.classList.remove('bg-wowcampus-blue', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                });
                
                // 선택된 버튼에 active 클래스 추가
                this.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                this.classList.add('bg-wowcampus-blue', 'text-white');
                
                selectedUserType = this.dataset.type;
                console.log('✅ Selected user type set to:', selectedUserType);
                updateLoginButton();
            });
        });
        
        // 디폴트로 구직자 선택 (사용자 편의성 개선) - 다중 시점에서 확인
        function forceSelectJobseeker() {
            const jobseekerBtn = document.querySelector('.user-type-btn[data-type="jobseeker"]');
            if (jobseekerBtn && !selectedUserType) {
                console.log('🔧 Auto-selecting jobseeker as default');
                jobseekerBtn.click();
                selectedUserType = 'jobseeker';
            }
        }
        
        // DOM 로드 즉시
        document.addEventListener('DOMContentLoaded', forceSelectJobseeker);
        
        // 윈도우 로드 시
        window.addEventListener('load', function() {
            setTimeout(forceSelectJobseeker, 100);
            setTimeout(forceSelectJobseeker, 500);
            setTimeout(forceSelectJobseeker, 1000);
        });

        // 초기 스타일 설정
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.add('px-4', 'py-2', 'rounded-lg', 'text-sm', 'font-medium', 'transition-colors', 'bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        });

        // 로그인 버튼 상태 업데이트
        function updateLoginButton() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            
            if (selectedUserType && email && password) {
                loginBtn.disabled = false;
                loginBtn.classList.remove('opacity-50');
            } else {
                loginBtn.disabled = true;
                loginBtn.classList.add('opacity-50');
            }
        }

        // 입력 필드 이벤트 리스너
        document.getElementById('email').addEventListener('input', updateLoginButton);
        document.getElementById('password').addEventListener('input', updateLoginButton);

        // 비밀번호 보기/숨기기
        document.getElementById('togglePassword').addEventListener('click', function() {
            const password = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (password.type === 'password') {
                password.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                password.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // 로그인 폼 제출 - 개선된 버전
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('🚀 Login form submitted');
            console.log('🔍 Current selectedUserType:', selectedUserType);
            
            // 사용자 유형이 선택되지 않은 경우 강제로 jobseeker 설정
            if (!selectedUserType || selectedUserType === null || selectedUserType === '') {
                console.log('⚠️ No user type selected, FORCING jobseeker selection');
                selectedUserType = 'jobseeker';
                
                // 구직자 버튼 시각적 활성화
                const jobseekerBtn = document.querySelector('.user-type-btn[data-type="jobseeker"]');
                if (jobseekerBtn) {
                    jobseekerBtn.click();
                    console.log('🔧 Jobseeker button clicked programmatically');
                }
            }
            
            // 추가 안전장치: 여전히 선택되지 않은 경우 강제 설정
            if (!selectedUserType) {
                selectedUserType = 'jobseeker';
                console.log('🚨 EMERGENCY: Force setting userType to jobseeker');
            }

            const formData = new FormData(e.target);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password'),
                userType: selectedUserType
            };

            console.log('📊 Login data prepared:', {
                email: loginData.email,
                hasPassword: !!loginData.password,
                userType: loginData.userType
            });

            showLoading();

            try {
                console.log('🔥 Sending login request...');
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(loginData)
                });
                
                // HTTP 상태 코드 체크
                if (!response.ok) {
                    let errorMessage = '로그인 중 오류가 발생했습니다.';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (parseError) {
                        console.error('Error response parsing failed:', parseError);
                        errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                console.log('로그인 응답:', data);
                
                if (data.success && data.token) {
                    console.log('로그인 성공, 토큰 저장 시작');
                    
                    // 로그인 성공 - 토큰과 사용자 정보 저장
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('currentUser', JSON.stringify(data.user)); // 호환성 유지
                    
                    console.log('저장된 사용자 정보:', data.user);
                    console.log('저장된 토큰:', data.token.substring(0, 20) + '...');
                    
                    alert('로그인이 완료되었습니다!');
                    
                    // 지연 후 리다이렉트 (localStorage 동기화 + URL 토큰 전달)
                    setTimeout(function() {
                        console.log('리다이렉트 준비:', { selectedUserType, userType: data.user.userType });
                        
                        // 사용자 유형별 리다이렉트 (강화된 로직)
                        let dashboardUrl = '/';
                        
                        if (selectedUserType === 'admin' || data.user.userType === 'admin') {
                            dashboardUrl = '/static/admin-dashboard.html?token=' + encodeURIComponent(data.token);
                            console.log('관리자 대시보드로 이동:', dashboardUrl);
                        } else if (selectedUserType === 'agent' || data.user.userType === 'agent') {
                            dashboardUrl = '/static/agent-dashboard.html?token=' + encodeURIComponent(data.token);
                            console.log('에이전트 대시보드로 이동:', dashboardUrl);
                        } else if (selectedUserType === 'employer' || data.user.userType === 'employer') {
                            dashboardUrl = '/static/employer-dashboard.html?token=' + encodeURIComponent(data.token);
                            console.log('기업 대시보드로 이동:', dashboardUrl);
                        } else if (selectedUserType === 'instructor' || data.user.userType === 'instructor') {
                            dashboardUrl = '/static/instructor-dashboard.html?token=' + encodeURIComponent(data.token);
                            console.log('강사 대시보드로 이동:', dashboardUrl);
                        } else if (selectedUserType === 'jobseeker' || selectedUserType === 'student' || data.user.userType === 'jobseeker' || data.user.userType === 'student') {
                            dashboardUrl = '/static/jobseeker-dashboard.html?token=' + encodeURIComponent(data.token);
                            console.log('구직자 대시보드로 이동:', dashboardUrl);
                        } else {
                            console.log('기본 홈페이지로 이동');
                            dashboardUrl = '/';
                        }
                        
                        console.log('최종 리다이렉트 URL:', dashboardUrl);
                        
                        // localStorage 강제 저장 후 이동
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('currentUser', JSON.stringify(data.user));
                        
                        // 추가 지연으로 완전한 저장 보장
                        setTimeout(function() {
                            console.log('실제 페이지 이동 실행');
                            window.location.href = dashboardUrl;
                        }, 300);
                        
                    }, 800); // 800ms 지연으로 증가
                } else {
                    // 로그인 실패
                    const errorMessage = data.error || '이메일 또는 비밀번호가 올바르지 않습니다.';
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Login error:', error);
                let userMessage = '로그인 중 오류가 발생했습니다.';
                
                if (error.message) {
                    userMessage = error.message;
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    userMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
                } else if (error.name === 'SyntaxError') {
                    userMessage = '서버 응답 처리 중 오류가 발생했습니다.';
                }
                
                alert(userMessage);
            } finally {
                hideLoading();
            }
        });

        // 로딩 표시/숨김
        function showLoading() {
            document.getElementById('loadingOverlay').classList.remove('hidden');
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }

        // 초기 버튼 상태 설정
        updateLoginButton();
    </script>
</body>
</html>`);
  } catch (error) {
    return c.text('Login page error', 500);
  }
})

// 회원가입 페이지
app.get('/static/register.html', async (c) => {
  try {
    // 회원가입 페이지 HTML을 직접 반환
    return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1E40AF',
                        secondary: '#3B82F6',
                        accent: '#059669',
                        wowcampus: {
                            blue: '#1E40AF',
                            light: '#E0F2FE',
                            dark: '#0F172A'
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gradient-to-br from-wowcampus-light to-white min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-md border-b-2 border-wowcampus-blue">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div class="w-10 h-10 bg-gradient-to-br from-wowcampus-blue to-accent rounded-lg flex items-center justify-center">
                        <i class="fas fa-graduation-cap text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-wowcampus-blue tracking-tight">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">외국인 구인구직 및 유학 플랫폼</span>
                    </div>
                </a>
                <nav class="flex space-x-6">
                    <a href="/" class="text-gray-600 hover:text-wowcampus-blue font-medium">
                        <i class="fas fa-home mr-2"></i>홈
                    </a>
                    <a href="/static/login.html" class="text-gray-600 hover:text-wowcampus-blue font-medium">
                        <i class="fas fa-sign-in-alt mr-2"></i>로그인
                    </a>
                </nav>
            </div>
        </div>
    </header>

    <main class="flex-1 flex items-center justify-center px-6 py-12">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <!-- 페이지 제목 -->
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-user-plus text-white text-2xl"></i>
                </div>
                <h2 class="text-3xl font-bold text-gray-800 mb-2">회원가입</h2>
                <p class="text-gray-600">계정을 생성하여 서비스를 이용해보세요</p>
            </div>

            <!-- 회원 유형 선택 -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-3">회원 유형 선택</label>
                <div class="grid grid-cols-1 gap-3">
                    <button type="button" class="user-type-btn" data-type="jobseeker">
                        <i class="fas fa-user mr-2"></i>
                        <div class="text-left">
                            <div class="font-medium">구직자</div>
                            <div class="text-xs text-gray-500">일자리를 찾고 있어요</div>
                        </div>
                    </button>
                    <button type="button" class="user-type-btn" data-type="employer">
                        <i class="fas fa-building mr-2"></i>
                        <div class="text-left">
                            <div class="font-medium">구인 기업</div>
                            <div class="text-xs text-gray-500">직원을 채용하려고 해요</div>
                        </div>
                    </button>
                    <button type="button" class="user-type-btn" data-type="agent">
                        <i class="fas fa-handshake mr-2"></i>
                        <div class="text-left">
                            <div class="font-medium">에이전트</div>
                            <div class="text-xs text-gray-500">구직자와 기업을 연결해요</div>
                        </div>
                    </button>
                </div>
            </div>

            <!-- 회원가입 폼 -->
            <form id="registerForm" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
                        <input type="text" id="firstName" name="firstName" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="이름을 입력하세요">
                    </div>
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">성 <span class="text-red-500">*</span></label>
                        <input type="text" id="lastName" name="lastName" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="성을 입력하세요">
                    </div>
                </div>
                
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일 <span class="text-red-500">*</span></label>
                    <input type="email" id="email" name="email" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                           placeholder="이메일을 입력하세요">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호 <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <input type="password" id="password" name="password" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent pr-10 text-sm"
                               placeholder="8자 이상, 영문+숫자 조합">
                        <button type="button" id="togglePassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-eye text-sm"></i>
                        </button>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">최소 8자, 영문자와 숫자를 포함해야 합니다</div>
                </div>
                
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 <span class="text-red-500">*</span></label>
                    <input type="password" id="confirmPassword" name="confirmPassword" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                           placeholder="비밀번호를 다시 입력하세요">
                </div>
                
                <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">전화번호 <span class="text-red-500">*</span></label>
                    <input type="tel" id="phone" name="phone" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                           placeholder="010-1234-5678">
                </div>

                <!-- 구직자 전용 필드 -->
                <div id="jobseekerFields" class="hidden space-y-4">
                    <div>
                        <label for="nationality" class="block text-sm font-medium text-gray-700 mb-1">국적</label>
                        <select id="nationality" name="nationality" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm">
                            <option value="">국적을 선택하세요</option>
                            <option value="중국">중국</option>
                            <option value="베트남">베트남</option>
                            <option value="필리핀">필리핀</option>
                            <option value="태국">태국</option>
                            <option value="캄보디아">캄보디아</option>
                            <option value="몽골">몽골</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div>
                        <label for="visaType" class="block text-sm font-medium text-gray-700 mb-1">비자 유형</label>
                        <select id="visaType" name="visaType" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm">
                            <option value="">비자 유형을 선택하세요</option>
                            <option value="H-2">H-2 (방문취업)</option>
                            <option value="E-9">E-9 (비전문취업)</option>
                            <option value="F-4">F-4 (재외동포)</option>
                            <option value="D-4">D-4 (일반연수)</option>
                            <option value="D-2">D-2 (유학)</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                </div>

                <!-- 구인기업 전용 필드 -->
                <div id="employerFields" class="hidden space-y-4">
                    <div>
                        <label for="companyName" class="block text-sm font-medium text-gray-700 mb-1">회사명 <span class="text-red-500">*</span></label>
                        <input type="text" id="companyName" name="companyName" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="회사명을 입력하세요">
                    </div>
                    <div>
                        <label for="businessNumber" class="block text-sm font-medium text-gray-700 mb-1">사업자등록번호 <span class="text-gray-500 text-xs">(선택사항)</span></label>
                        <input type="text" id="businessNumber" name="businessNumber" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="000-00-00000 (선택사항)">
                    </div>
                    <div>
                        <label for="industry" class="block text-sm font-medium text-gray-700 mb-1">업종 <span class="text-red-500">*</span></label>
                        <select id="industry" name="industry" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm">
                            <option value="">업종을 선택하세요</option>
                            <option value="IT/소프트웨어">IT/소프트웨어</option>
                            <option value="제조업">제조업</option>
                            <option value="서비스업">서비스업</option>
                            <option value="건설업">건설업</option>
                            <option value="유통/판매">유통/판매</option>
                            <option value="교육">교육</option>
                            <option value="의료/헬스케어">의료/헬스케어</option>
                            <option value="금융">금융</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div>
                        <label for="contactPerson" class="block text-sm font-medium text-gray-700 mb-1">담당자명 <span class="text-red-500">*</span></label>
                        <input type="text" id="contactPerson" name="contactPerson" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="담당자 이름을 입력하세요">
                    </div>
                    <div>
                        <label for="address" class="block text-sm font-medium text-gray-700 mb-1">주소 <span class="text-red-500">*</span></label>
                        <input type="text" id="address" name="address" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="회사 주소를 입력하세요">
                    </div>
                    <div>
                        <label for="region" class="block text-sm font-medium text-gray-700 mb-1">지역 <span class="text-red-500">*</span></label>
                        <select id="region" name="region" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm">
                            <option value="">지역을 선택하세요</option>
                            <option value="서울">서울특별시</option>
                            <option value="부산">부산광역시</option>
                            <option value="대구">대구광역시</option>
                            <option value="인천">인천광역시</option>
                            <option value="광주">광주광역시</option>
                            <option value="대전">대전광역시</option>
                            <option value="울산">울산광역시</option>
                            <option value="세종">세종특별자치시</option>
                            <option value="경기">경기도</option>
                            <option value="강원">강원도</option>
                            <option value="충북">충청북도</option>
                            <option value="충남">충청남도</option>
                            <option value="전북">전라북도</option>
                            <option value="전남">전라남도</option>
                            <option value="경북">경상북도</option>
                            <option value="경남">경상남도</option>
                            <option value="제주">제주특별자치도</option>
                        </select>
                    </div>
                    <div>
                        <label for="website" class="block text-sm font-medium text-gray-700 mb-1">웹사이트 <span class="text-gray-500 text-xs">(선택사항)</span></label>
                        <input type="url" id="website" name="website"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="https://company.com (선택사항)">
                    </div>
                </div>

                <!-- 에이전트 전용 필드 -->
                <div id="agentFields" class="hidden space-y-4">
                    <div>
                        <label for="agencyName" class="block text-sm font-medium text-gray-700 mb-1">에이전시명 <span class="text-red-500">*</span></label>
                        <input type="text" id="agencyName" name="agencyName" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="에이전시명을 입력하세요">
                    </div>
                    <div>
                        <label for="licenseNumber" class="block text-sm font-medium text-gray-700 mb-1">허가번호 <span class="text-red-500">*</span></label>
                        <input type="text" id="licenseNumber" name="licenseNumber" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="허가번호를 입력하세요">
                    </div>
                </div>

                <button type="submit" id="registerBtn" class="w-full bg-wowcampus-blue text-white py-3 rounded-lg font-medium hover:bg-wowcampus-dark transition-colors disabled:opacity-50" disabled>
                    회원가입
                </button>
            </form>

            <!-- 로그인 링크 -->
            <div class="text-center mt-6">
                <p class="text-sm text-gray-600">
                    이미 계정이 있으신가요? 
                    <a href="/static/login.html" class="text-wowcampus-blue font-medium hover:underline">로그인</a>
                </p>
            </div>
        </div>

        <!-- 로딩 오버레이 -->
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-wowcampus-blue mx-auto mb-4"></div>
                <p class="text-gray-600">회원가입 중...</p>
            </div>
        </div>
    </main>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        let selectedUserType = null;

        // 회원 유형 선택
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                console.log('User type clicked:', this.dataset.type);
                
                // 모든 버튼에서 active 클래스 제거
                document.querySelectorAll('.user-type-btn').forEach(b => {
                    b.classList.remove('bg-wowcampus-blue', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                });
                
                // 선택된 버튼에 active 클래스 추가
                this.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                this.classList.add('bg-wowcampus-blue', 'text-white');
                
                selectedUserType = this.dataset.type;
                console.log('Selected user type:', selectedUserType);
                
                showUserTypeFields();
                // 즉시 버튼 체크
                setTimeout(updateRegisterButton, 200);
            });
        });

        // 초기 스타일 설정
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.add('flex', 'items-center', 'p-4', 'rounded-lg', 'text-left', 'font-medium', 'transition-colors', 'bg-gray-100', 'text-gray-700', 'hover:bg-gray-200', 'cursor-pointer');
        });

        // 사용자 유형별 필드 표시
        function showUserTypeFields() {
            // 모든 필드 숨기기
            document.getElementById('jobseekerFields').classList.add('hidden');
            document.getElementById('employerFields').classList.add('hidden');
            document.getElementById('agentFields').classList.add('hidden');
            
            // 선택된 유형에 따라 필드 표시
            if (selectedUserType === 'jobseeker') {
                document.getElementById('jobseekerFields').classList.remove('hidden');
                // 구직자 필드 이벤트 리스너 추가
                setTimeout(addJobseekerFieldListeners, 100);
            } else if (selectedUserType === 'employer') {
                document.getElementById('employerFields').classList.remove('hidden');
                // 구인기업 필드 이벤트 리스너 추가
                setTimeout(addEmployerFieldListeners, 100);
            } else if (selectedUserType === 'agent') {
                document.getElementById('agentFields').classList.remove('hidden');
                // 에이전트 필드 이벤트 리스너 추가
                setTimeout(addAgentFieldListeners, 100);
            }
        }

        // 회원가입 버튼 상태 업데이트 (모든 사용자 유형 지원)
        function updateRegisterButton() {
            console.log('=== updateRegisterButton called ==='); 
            
            const registerBtn = document.getElementById('registerBtn');
            if (!registerBtn) {
                console.log('Register button not found!');
                return;
            }
            
            // 선택된 사용자 유형 확인
            if (!selectedUserType) {
                console.log('No user type selected');
                registerBtn.disabled = true;
                registerBtn.classList.add('opacity-50');
                return;
            }
            
            console.log('Selected user type:', selectedUserType);
            
            // 기본 필드들
            const firstName = document.getElementById('firstName')?.value?.trim() || '';
            const lastName = document.getElementById('lastName')?.value?.trim() || '';
            const email = document.getElementById('email')?.value?.trim() || '';
            const password = document.getElementById('password')?.value || '';
            const confirmPassword = document.getElementById('confirmPassword')?.value || '';
            const phone = document.getElementById('phone')?.value?.trim() || '';
            
            console.log('Basic fields:', {
                firstName: firstName.length > 0,
                lastName: lastName.length > 0, 
                email: email.length > 0,
                password: password.length > 0,
                confirmPassword: confirmPassword.length > 0,
                phone: phone.length > 0
            });
            
            // 기본 조건들
            const basicFieldsOk = firstName && lastName && email && password && confirmPassword && phone;
            const passwordsMatch = password === confirmPassword;
            const passwordLengthOk = password.length >= 8; // 8자로 수정
            
            console.log('Basic validation:', {basicFieldsOk, passwordsMatch, passwordLengthOk});
            
            let canEnable = false;
            
            if (selectedUserType === 'jobseeker') {
                // 구직자: 기본 필드만 필요
                canEnable = basicFieldsOk && passwordsMatch && passwordLengthOk;
                console.log('Jobseeker validation result:', canEnable);
            }
            else if (selectedUserType === 'employer') {
                // 구인기업: 기본 필드 + 기업 정보 필드
                const companyName = document.getElementById('companyName')?.value?.trim() || '';
                const industry = document.getElementById('industry')?.value || '';
                const contactPerson = document.getElementById('contactPerson')?.value?.trim() || '';
                const address = document.getElementById('address')?.value?.trim() || '';
                const region = document.getElementById('region')?.value || '';
                // business_number는 선택사항이므로 검증하지 않음
                
                const employerFieldsOk = companyName && industry && contactPerson && address && region;
                canEnable = basicFieldsOk && passwordsMatch && passwordLengthOk && employerFieldsOk;
                
                console.log('Employer validation result:', {
                    basicFieldsOk,
                    passwordsMatch,
                    passwordLengthOk,
                    employerFieldsOk,
                    companyName: companyName.length > 0,
                    industry: industry.length > 0,
                    contactPerson: contactPerson.length > 0,
                    address: address.length > 0,
                    region: region.length > 0,
                    canEnable
                });
            }
            else if (selectedUserType === 'agent') {
                // 에이전트: 기본 필드 + 에이전시 정보
                const agencyName = document.getElementById('agencyName')?.value?.trim() || '';
                const licenseNumber = document.getElementById('licenseNumber')?.value?.trim() || '';
                
                const agentFieldsOk = agencyName && licenseNumber;
                canEnable = basicFieldsOk && passwordsMatch && passwordLengthOk && agentFieldsOk;
                
                console.log('Agent validation result:', {
                    basicFieldsOk,
                    passwordsMatch,
                    passwordLengthOk,
                    agentFieldsOk,
                    agencyName: agencyName.length > 0,
                    licenseNumber: licenseNumber.length > 0,
                    canEnable
                });
            }
            else {
                console.log('Unknown user type:', selectedUserType);
                canEnable = false;
            }
            
            // 버튼 상태 업데이트
            if (canEnable) {
                registerBtn.disabled = false;
                registerBtn.classList.remove('opacity-50');
                registerBtn.classList.add('hover:bg-blue-700');
                registerBtn.style.backgroundColor = '#1E40AF';
                console.log('Button ENABLED for', selectedUserType);
            } else {
                registerBtn.disabled = true;
                registerBtn.classList.add('opacity-50');
                registerBtn.classList.remove('hover:bg-blue-700');
                registerBtn.style.backgroundColor = '';
                console.log('Button DISABLED for', selectedUserType);
            }
        }

        // 입력 필드 이벤트 리스너
        ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phone'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', updateRegisterButton);
                element.addEventListener('blur', updateRegisterButton);
            }
        });
        
        // 페이지 로드 시 초기 설정
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Page loaded, initializing...');
            updateRegisterButton();
            
            // 회원가입 버튼에 직접 클릭 이벤트 추가 (폴백)
            const registerBtn = document.getElementById('registerBtn');
            if (registerBtn) {
                registerBtn.addEventListener('click', function(e) {
                    console.log('🖱️ Register button clicked directly');
                    if (!registerBtn.disabled) {
                        // 폼 제출 트리거
                        const form = document.getElementById('registerForm');
                        if (form) {
                            console.log('📋 Triggering form submit');
                            form.dispatchEvent(new Event('submit', { cancelable: true }));
                        } else {
                            console.log('Form not found');
                        }
                    } else {
                        console.log('Button is disabled');
                    }
                });
            }
        });
        
        // 구직자 필드 이벤트 리스너
        function addJobseekerFieldListeners() {
            ['nationality', 'visaType'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', updateRegisterButton); // select는 change 이벤트 사용
                }
            });
        }
        
        // 구인기업 필드 이벤트 리스너
        function addEmployerFieldListeners() {
            console.log('Adding employer field listeners');
            ['companyName', 'industry', 'contactPerson', 'address', 'region', 'businessNumber', 'website'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    const eventType = element.tagName.toLowerCase() === 'select' ? 'change' : 'input';
                    element.addEventListener(eventType, updateRegisterButton);
                    element.addEventListener('blur', updateRegisterButton);
                    console.log('Added listeners to ' + id);
                } else {
                    console.log('Element not found: ' + id);
                }
            });
        }
        
        // 에이전트 필드 이벤트 리스너
        function addAgentFieldListeners() {
            console.log('Adding agent field listeners');
            ['agencyName', 'licenseNumber'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('input', updateRegisterButton);
                    element.addEventListener('blur', updateRegisterButton);
                    console.log('Added listeners to ' + id);
                } else {
                    console.log('Element not found: ' + id);
                }
            });
        }

        // 비밀번호 확인 실시간 검증
        document.getElementById('confirmPassword').addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.classList.add('border-red-500');
                this.classList.remove('border-gray-300');
            } else {
                this.classList.remove('border-red-500');
                this.classList.add('border-gray-300');
            }
            updateRegisterButton();
        });

        // 비밀번호 보기/숨기기
        document.getElementById('togglePassword').addEventListener('click', function() {
            const password = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (password.type === 'password') {
                password.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                password.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // 회원가입 폼 제출
        document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
            console.log('🚀 Form submit event triggered!');
            e.preventDefault();
            
            if (!selectedUserType) {
                alert('회원 유형을 선택해주세요.');
                console.log('No user type selected');
                return;
            }
            
            console.log('Processing registration for:', selectedUserType);
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // 비밀번호 확인
            if (data.password !== data.confirmPassword) {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }
            
            // 로딩 표시
            document.getElementById('loadingOverlay').classList.remove('hidden');
            
            try {
                let requestData = {
                    userType: selectedUserType,
                    email: data.email,
                    password: data.password,
                    confirmPassword: data.confirmPassword
                };
                
                // 사용자 유형별 추가 데이터 설정
                if (selectedUserType === 'jobseeker') {
                    requestData.name = data.firstName + ' ' + data.lastName;
                    requestData.phone = data.phone;
                    requestData.nationality = data.nationality || '대한민국';
                    requestData.visa_type = data.visaType || 'E-9';
                    requestData.korean_level = data.koreanLevel || '초급';
                } else if (selectedUserType === 'employer') {
                    requestData.company_name = data.companyName;
                    requestData.business_number = data.businessNumber || null; // 선택사항
                    requestData.industry = data.industry;
                    requestData.contact_person = data.contactPerson;
                    requestData.phone = data.phone;
                    requestData.address = data.address;
                    requestData.region = data.region;
                    requestData.website = data.website || null; // 선택사항
                } else if (selectedUserType === 'agent') {
                    requestData.company_name = data.agencyName;
                    requestData.license_number = data.licenseNumber;
                    requestData.phone = data.phone;
                    requestData.address = data.address || '';
                }
                
                console.log('Registration request data:', requestData);
                
                console.log('Sending API request to /api/auth/register');
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
                
                console.log('📡 Response status:', response.status, response.statusText);
                console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
                
                // HTTP 상태 코드 체크
                if (!response.ok) {
                    let errorMessage = '회원가입 중 오류가 발생했습니다.';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (parseError) {
                        console.error('Error response parsing failed:', parseError);
                        errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                    }
                    throw new Error(errorMessage);
                }
                
                const responseData = await response.json();
                console.log('회원가입 응답:', responseData);
                
                if (responseData.success) {
                    alert(responseData.message || '회원가입이 완료되었습니다!');
                    window.location.href = '/static/login.html';
                } else {
                    throw new Error(responseData.error || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('회원가입 오류:', error);
                let userMessage = '회원가입 중 오류가 발생했습니다.';
                
                if (error.message) {
                    userMessage = error.message;
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    userMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
                } else if (error.name === 'SyntaxError') {
                    userMessage = '서버 응답 처리 중 오류가 발생했습니다.';
                }
                
                alert(userMessage);
            } finally {
                // 로딩 숨기기
                document.getElementById('loadingOverlay').classList.add('hidden');
            }
        });
    </script>
</body>
</html>`);
  } catch (error) {
    return c.text('Register page error', 500);
  }
})

// 구인정보 보기 페이지 (로그인 필요)
app.get('/static/jobs-view.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>구인정보 보기 | WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'wowcampus-blue': '#1e40af',
                        'wowcampus-light': '#e3f2fd',
                        'secondary': '#3b82f6',
                        'accent': '#059669'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50">
    <!-- Loading overlay -->
    <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-wowcampus-blue mx-auto mb-4"></div>
            <p class="text-gray-600">인증 확인 중...</p>
        </div>
    </div>

    <!-- 인증 실패 알림 -->
    <div id="authError" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 text-center max-w-sm mx-4 shadow-xl">
            <div class="text-yellow-500 mb-6">
                <i class="fas fa-lock text-5xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-800">로그인이 필요합니다!</h3>
            <p class="text-gray-600 mb-8 text-sm leading-relaxed">상세 정보를 보시려면 먼저 로그인해주세요</p>
            <div class="flex flex-col gap-3">
                <button onclick="goToLogin()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full">
                    👤 로그인 하기
                </button>
                <button onclick="goHome()" class="bg-gray-200 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium w-full">
                    취소
                </button>
            </div>
            <div class="mt-4">
                <p class="text-sm text-gray-500">계정이 없으신가요? 
                    <a href="/static/register.html" class="text-blue-600 hover:text-blue-800 font-medium">회원가입</a>
                </p>
            </div>
        </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <div id="mainContent" class="hidden">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-wowcampus-blue">WOW-CAMPUS</a>
                        <span class="ml-4 text-gray-600">구인정보 보기</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span id="userInfo" class="text-gray-600"></span>
                        <button onclick="logout()" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div class="flex items-center justify-between mb-6">
                    <h1 class="text-3xl font-bold text-gray-800">
                        <i class="fas fa-briefcase text-wowcampus-blue mr-3"></i>구인정보
                    </h1>
                    <div class="flex gap-2">
                        <select id="sortBy" class="border rounded-lg px-3 py-2">
                            <option value="date">최신순</option>
                            <option value="salary">급여순</option>
                            <option value="company">회사명순</option>
                        </select>
                        <select id="filterVisa" class="border rounded-lg px-3 py-2">
                            <option value="">모든 비자</option>
                            <option value="E-7">E-7</option>
                            <option value="E-9">E-9</option>
                            <option value="F-4">F-4</option>
                        </select>
                    </div>
                </div>

                <!-- 구인정보 리스트 -->
                <div id="jobsList" class="space-y-4">
                    <!-- 로딩 스켈레톤 -->
                    <div class="animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>

                <!-- 페이지네이션 -->
                <div id="pagination" class="flex justify-center mt-8">
                    <!-- 페이지네이션 버튼들이 여기에 추가됩니다 -->
                </div>
            </div>
        </main>
    </div>

    <script>
        let currentUser = null;

        // 페이지 로드 시 인증 확인
        document.addEventListener('DOMContentLoaded', async function() {
            await checkAuthentication();
        });

        async function checkAuthentication() {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                
                if (!token) {
                    showAuthError();
                    return;
                }

                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.authenticated) {
                        currentUser = result.user;
                        showMainContent();
                        await loadJobsData();
                    } else {
                        showAuthError();
                    }
                } else {
                    showAuthError();
                }
            } catch (error) {
                console.error('인증 확인 중 오류:', error);
                showAuthError();
            }
        }

        function showMainContent() {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            
            // 사용자 정보 표시
            if (currentUser) {
                document.getElementById('userInfo').textContent = 
                    (currentUser.name || currentUser.email || 'User') + ' 님';
            }
        }

        function showAuthError() {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('authError').classList.remove('hidden');
        }

        async function loadJobsData() {
            try {
                const response = await fetch('/api/jobs');
                const result = await response.json();
                
                if (result.success && result.jobs) {
                    displayJobs(result.jobs);
                }
            } catch (error) {
                console.error('구인정보 로드 중 오류:', error);
                document.getElementById('jobsList').innerHTML = 
                    '<div class="text-center py-8 text-gray-500">구인정보를 불러오는 중 오류가 발생했습니다.</div>';
            }
        }

        function displayJobs(jobs) {
            const jobsList = document.getElementById('jobsList');
            
            if (!jobs || jobs.length === 0) {
                jobsList.innerHTML = 
                    '<div class="text-center py-8 text-gray-500">등록된 구인정보가 없습니다.</div>';
                return;
            }

            jobsList.innerHTML = jobs.map(job => 
                '<div class="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">' +
                    '<div class="flex justify-between items-start mb-4">' +
                        '<div>' +
                            '<h3 class="text-xl font-semibold text-gray-800 mb-2">' + (job.title || '') + '</h3>' +
                            '<p class="text-lg text-wowcampus-blue font-medium">' + (job.company || '') + '</p>' +
                        '</div>' +
                        '<span class="bg-wowcampus-blue text-white px-3 py-1 rounded-full text-sm">' + (job.visa_type || '') + '</span>' +
                    '</div>' +
                    '<div class="grid md:grid-cols-2 gap-4 text-gray-600">' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>' +
                            (job.location || '') +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-won-sign mr-2 text-gray-400"></i>' +
                            (job.salary_min ? job.salary_min.toLocaleString() : 'N/A') + ' - ' + (job.salary_max ? job.salary_max.toLocaleString() : 'N/A') + '만원' +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-calendar mr-2 text-gray-400"></i>' +
                            '게시일: ' + (job.posted_date || '') +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-check-circle mr-2 text-green-400"></i>' +
                            '상태: ' + (job.status === 'active' ? '모집중' : '마감') +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-4 flex justify-end">' +
                        '<button class="bg-wowcampus-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">' +
                            '<i class="fas fa-info-circle mr-2"></i>상세보기' +
                        '</button>' +
                    '</div>' +
                '</div>'
            ).join('');
        }

        function goToLogin() {
            window.location.href = '/static/login.html';
        }

        function goHome() {
            window.location.href = '/';
        }

        async function logout() {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                window.location.href = '/';
            } catch (error) {
                console.error('로그아웃 중 오류:', error);
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                window.location.href = '/';
            }
        }

        // 필터 및 정렬 기능
        document.getElementById('sortBy').addEventListener('change', loadJobsData);
        document.getElementById('filterVisa').addEventListener('change', loadJobsData);
    </script>
</body>
</html>`);
})



// 구직정보 보기 페이지 (로그인 필요)
app.get('/static/jobseekers-view.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>구직정보 보기 | WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'wowcampus-blue': '#1e40af',
                        'wowcampus-light': '#e3f2fd',
                        'secondary': '#3b82f6',
                        'accent': '#059669'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50">
    <!-- Loading overlay -->
    <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p class="text-gray-600">인증 확인 중...</p>
        </div>
    </div>

    <!-- 인증 실패 알림 -->
    <div id="authError" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 text-center max-w-sm mx-4 shadow-xl">
            <div class="text-yellow-500 mb-6">
                <i class="fas fa-lock text-5xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-800">로그인이 필요합니다!</h3>
            <p class="text-gray-600 mb-8 text-sm leading-relaxed">상세 정보를 보시려면 먼저 로그인해주세요</p>
            <div class="flex flex-col gap-3">
                <button onclick="goToLogin()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full">
                    👤 로그인 하기
                </button>
                <button onclick="goHome()" class="bg-gray-200 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium w-full">
                    취소
                </button>
            </div>
            <div class="mt-4">
                <p class="text-sm text-gray-500">계정이 없으신가요? 
                    <a href="/static/register.html" class="text-blue-600 hover:text-blue-800 font-medium">회원가입</a>
                </p>
            </div>
        </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <div id="mainContent" class="hidden">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-wowcampus-blue">WOW-CAMPUS</a>
                        <span class="ml-4 text-gray-600">구직정보 보기</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span id="userInfo" class="text-gray-600"></span>
                        <button onclick="logout()" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div class="flex items-center justify-between mb-6">
                    <h1 class="text-3xl font-bold text-gray-800">
                        <i class="fas fa-users text-purple-500 mr-3"></i>구직정보
                    </h1>
                    <div class="flex gap-2">
                        <select id="sortBy" class="border rounded-lg px-3 py-2">
                            <option value="date">최신순</option>
                            <option value="experience">경력순</option>
                            <option value="education">학력순</option>
                        </select>
                        <select id="filterVisa" class="border rounded-lg px-3 py-2">
                            <option value="">모든 비자</option>
                            <option value="F-4">F-4</option>
                            <option value="E-7">E-7</option>
                            <option value="D-2">D-2</option>
                        </select>
                        <select id="filterNationality" class="border rounded-lg px-3 py-2">
                            <option value="">모든 국가</option>
                            <option value="중국">중국</option>
                            <option value="베트남">베트남</option>
                            <option value="필리핀">필리핀</option>
                        </select>
                    </div>
                </div>

                <!-- 구직정보 리스트 -->
                <div id="jobseekersList" class="space-y-4">
                    <!-- 로딩 스켈레톤 -->
                    <div class="animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>

                <!-- 페이지네이션 -->
                <div id="pagination" class="flex justify-center mt-8">
                    <!-- 페이지네이션 버튼들이 여기에 추가됩니다 -->
                </div>
            </div>
        </main>
    </div>

    <script>
        let currentUser = null;

        // 페이지 로드 시 인증 확인
        document.addEventListener('DOMContentLoaded', async function() {
            await checkAuthentication();
        });

        async function checkAuthentication() {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                
                if (!token) {
                    showAuthError();
                    return;
                }

                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.authenticated) {
                        currentUser = result.user;
                        showMainContent();
                        await loadJobseekersData();
                    } else {
                        showAuthError();
                    }
                } else {
                    showAuthError();
                }
            } catch (error) {
                console.error('인증 확인 중 오류:', error);
                showAuthError();
            }
        }

        function showMainContent() {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            
            // 사용자 정보 표시
            if (currentUser) {
                document.getElementById('userInfo').textContent = 
                    (currentUser.name || currentUser.email || 'User') + ' 님';
            }
        }

        function showAuthError() {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('authError').classList.remove('hidden');
        }

        async function loadJobseekersData() {
            try {
                const response = await fetch('/api/jobseekers');
                const result = await response.json();
                
                if (result.success && result.jobseekers) {
                    displayJobseekers(result.jobseekers);
                }
            } catch (error) {
                console.error('구직정보 로드 중 오류:', error);
                document.getElementById('jobseekersList').innerHTML = 
                    '<div class="text-center py-8 text-gray-500">구직정보를 불러오는 중 오류가 발생했습니다.</div>';
            }
        }

        function displayJobseekers(jobseekers) {
            const jobseekersList = document.getElementById('jobseekersList');
            
            if (!jobseekers || jobseekers.length === 0) {
                jobseekersList.innerHTML = 
                    '<div class="text-center py-8 text-gray-500">등록된 구직정보가 없습니다.</div>';
                return;
            }

            jobseekersList.innerHTML = jobseekers.map(jobseeker => 
                '<div class="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">' +
                    '<div class="flex justify-between items-start mb-4">' +
                        '<div>' +
                            '<h3 class="text-xl font-semibold text-gray-800 mb-2">' + (jobseeker.name || '이름 비공개') + '</h3>' +
                            '<p class="text-lg text-purple-500 font-medium">' + (jobseeker.nationality || 'N/A') + '</p>' +
                        '</div>' +
                        '<span class="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">' + (jobseeker.visa_status || 'N/A') + '</span>' +
                    '</div>' +
                    '<div class="grid md:grid-cols-2 gap-4 text-gray-600">' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-graduation-cap mr-2 text-gray-400"></i>' +
                            '학력: ' + (jobseeker.education_level || 'N/A') +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-briefcase mr-2 text-gray-400"></i>' +
                            '경력: ' + (jobseeker.work_experience || '0') + '년' +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-language mr-2 text-gray-400"></i>' +
                            '한국어: ' + (jobseeker.korean_level || 'N/A') +
                        '</div>' +
                        '<div class="flex items-center">' +
                            '<i class="fas fa-check-circle mr-2 text-green-400"></i>' +
                            '상태: ' + (jobseeker.status === 'active' ? '구직중' : '비활성') +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-4 flex justify-end">' +
                        '<button class="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">' +
                            '<i class="fas fa-info-circle mr-2"></i>상세보기' +
                        '</button>' +
                    '</div>' +
                '</div>'
            ).join('');
        }

        function goToLogin() {
            window.location.href = '/static/login.html';
        }

        function goHome() {
            window.location.href = '/';
        }

        async function logout() {
            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                window.location.href = '/';
            } catch (error) {
                console.error('로그아웃 중 오류:', error);
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                window.location.href = '/';
            }
        }

        // 필터 및 정렬 기능
        document.getElementById('sortBy').addEventListener('change', loadJobseekersData);
        document.getElementById('filterVisa').addEventListener('change', loadJobseekersData);
        document.getElementById('filterNationality').addEventListener('change', loadJobseekersData);
    </script>
</body>
</html>`);
})

// 렌더러 설정
app.use(renderer)

// JWT 토큰 검증 미들웨어 
const JWT_SECRET = 'w-campus-secure-jwt-secret-key-2025';

async function verifyToken(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증이 필요합니다.' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  // 간단한 토큰 형식 처리 (token_id_type)
  if (token.startsWith('token_')) {
    const tokenParts = token.split('_');
    if (tokenParts.length >= 3) {
      const userId = tokenParts[1];
      const userType = tokenParts[2];
      
      c.set('user', {
        id: parseInt(userId),
        userType: userType
      });
      await next();
      return;
    }
  }
  
  // JWT 토큰 검증
  try {
    const decoded = await verify(token, JWT_SECRET);
    c.set('user', decoded);
    await next();
  } catch (error) {
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401);
  }
}



// 인증 상태 확인 API (쿠키 기반)
app.get('/api/auth/status', async (c) => {
  try {
    // 쿠키에서 인증 정보 확인
    const authCookie = c.req.header('Cookie');
    
    if (!authCookie) {
      return c.json({ authenticated: false });
    }
    
    // auth_token 쿠키 추출
    const cookies = authCookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const authToken = cookies.auth_token;
    
    if (!authToken) {
      return c.json({ authenticated: false });
    }
    
    // 토큰 유효성 검사
    if (authToken.startsWith('token_')) {
      // 간단한 토큰 형식 검증
      const tokenParts = authToken.split('_');
      if (tokenParts.length >= 3) {
        const userId = tokenParts[1];
        const userType = tokenParts[2];
        
        // 데이터베이스에서 사용자 정보 확인
        let user = null;
        
        if (userType === 'employer') {
          user = await c.env.DB.prepare(
            'SELECT id, company_name as name, email, status FROM employers WHERE id = ?'
          ).bind(userId).first();
        } else if (userType === 'agent') {
          user = await c.env.DB.prepare(
            'SELECT id, company_name as name, email, status FROM agents WHERE id = ?'
          ).bind(userId).first();
        } else if (userType === 'jobseeker') {
          user = await c.env.DB.prepare(
            'SELECT id, name, email, status FROM job_seekers WHERE id = ?'
          ).bind(userId).first();
        }
        
        if (user) {
          // 승인 상태 확인
          let isAuthorized = false;
          if (userType === 'agent') {
            // 에이전트는 approved 또는 active 상태만 허용
            isAuthorized = user.status === 'approved' || user.status === 'active';
          } else {
            // 기업과 구직자는 approved 또는 active 상태 허용
            isAuthorized = user.status === 'approved' || user.status === 'active';
          }
          
          return c.json({
            authenticated: isAuthorized,
            user: isAuthorized ? {
              id: user.id,
              email: user.email,
              name: user.name,
              userType: userType,
              status: user.status
            } : null,
            status: user.status,
            message: !isAuthorized && userType === 'agent' && user.status === 'pending' 
              ? '에이전트 계정 승인 대기 중입니다.' 
              : undefined
          });
        }
      }
    } else {
      // JWT 토큰 검증
      try {
        const JWT_SECRET = c.env.JWT_SECRET || 'your-secret-key';
        const decoded = await verify(authToken, JWT_SECRET);
        
        return c.json({
          authenticated: true,
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            userType: decoded.userType
          }
        });
      } catch (jwtError) {
        console.error('JWT 검증 실패:', jwtError);
      }
    }
    
    return c.json({ authenticated: false });
    
  } catch (error) {
    console.error('인증 상태 확인 중 오류:', error);
    return c.json({ authenticated: false });
  }
});

// 로그아웃 API
app.post('/api/auth/logout', async (c) => {
  try {
    // 쿠키 삭제
    c.header('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    
    return c.json({ 
      success: true, 
      message: '로그아웃되었습니다.' 
    });
  } catch (error) {
    console.error('로그아웃 중 오류:', error);
    return c.json({ 
      error: '로그아웃 중 오류가 발생했습니다.' 
    }, 500);
  }
});

// ===============================
// 인증 API 엔드포인트
// ===============================

// 로그인 API
// 통합된 사용자 인증 함수
async function authenticateUser(db: D1Database, email: string, password: string, userType: string) {
  console.log(`🔑 Authenticating user: ${email}, type: ${userType}`)
  
  const userTables = {
    'admin': { table: 'admins', nameField: 'name' },
    'agent': { table: 'agents', nameField: 'company_name' },
    'employer': { table: 'employers', nameField: 'company_name' },
    'jobseeker': { table: 'job_seekers', nameField: 'name' },
    'student': { table: 'job_seekers', nameField: 'name' }, // 학생도 job_seekers 테이블 사용
    'instructor': { table: 'job_seekers', nameField: 'name' } // 강사도 job_seekers 테이블 사용
  }
  
  const config = userTables[userType as keyof typeof userTables]
  if (!config) {
    console.log(`❌ Unknown user type: ${userType}`)
    return null
  }
  
  try {
    const query = `
      SELECT id, email, ${config.nameField} as name, password
      FROM ${config.table} 
      WHERE email = ? AND status IN ('active', 'approved', 'pending')
    `
    
    console.log(`📊 Query: ${query}`)
    const user = await db.prepare(query).bind(email).first()
    
    if (!user) {
      console.log(`❌ User not found in ${config.table}`)
      return null
    }
    
    console.log(`📊 Found user:`, { id: user.id, email: user.email, name: user.name })
    
    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password as string)
    console.log(`🔒 Password verification:`, isPasswordValid)
    
    if (isPasswordValid) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: userType
      }
    }
    
    return null
  } catch (error) {
    console.error(`❌ Authentication error for ${userType}:`, error)
    return null
  }
}

// Auth-specific rate limiting (more restrictive)
const authRequestCounts = new Map<string, { count: number; resetTime: number }>()

// 새로운 로그인 API
// 새로운 통합 로그인 API
app.post('/api/auth/login', async (c) => {
  // Additional stricter rate limiting for auth endpoints
  const clientIP = c.req.header('CF-Connecting-IP') || 
                   c.req.header('X-Forwarded-For') || 
                   'unknown'
  const now = Date.now()
  const authWindowMs = 1 * 60 * 1000 // 1분
  const maxAuthRequests = 5 // 1분에 최대 5번 로그인 시도
  
  const authKey = `auth_rate_limit_${clientIP}`
  const currentAuth = authRequestCounts.get(authKey)
  
  if (!currentAuth || now > currentAuth.resetTime) {
    authRequestCounts.set(authKey, { count: 1, resetTime: now + authWindowMs })
  } else {
    currentAuth.count++
    if (currentAuth.count > maxAuthRequests) {
      return c.json({ 
        error: '로그인 시도 횟수가 초과되었습니다. 1분 후 다시 시도해주세요.',
        retryAfter: Math.ceil((currentAuth.resetTime - now) / 1000)
      }, 429)
    }
  }
  try {
    console.log('🚀 Login attempt started')
    const { email, password, userType } = await c.req.json()
    
    // 입력 검증
    if (!email || !password || !userType) {
      return c.json({ 
        success: false, 
        error: '이메일, 비밀번호, 사용자 유형이 필요합니다.' 
      }, 400)
    }

    if (!validateEmail(email)) {
      return c.json({ 
        success: false, 
        error: '올바른 이메일 형식이 아닙니다.' 
      }, 400)
    }

    console.log(`📊 Login request: ${email} as ${userType}`)

    // 데이터베이스에서 사용자 인증
    const dbUser = await authenticateUser(c.env.DB, email, password, userType)
    
    if (dbUser) {
      console.log(`✅ Authentication successful for:`, dbUser)
      
      const token = await sign({
        id: dbUser.id,
        email: dbUser.email,
        userType: dbUser.userType,
        name: dbUser.name,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
      }, 'production-secret-key')

      return c.json({
        success: true,
        token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          userType: dbUser.userType
        },
        message: '로그인이 성공적으로 완료되었습니다.'
      })
    } else {
      console.log(`❌ Authentication failed for: ${email}`)
      
      return c.json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      }, 401)
    }

  } catch (error) {
    console.error('🚫 Login error:', error)
    return c.json({ 
      success: false, 
      error: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.' 
    }, 500)
  }
})

// JWT 토큰 검증 API - 대시보드용
app.get('/api/auth/verify', async (c) => {
  try {
    console.log('🔍 Token verification request received')
    
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header')
      return c.json({ 
        success: false, 
        error: '인증 토큰이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    console.log('🎫 Extracting token:', token ? 'Present' : 'Missing')
    
    if (!token) {
      return c.json({ 
        success: false, 
        error: '토큰이 없습니다.' 
      }, 401)
    }

    // JWT 토큰 검증 시도 (production-secret-key 먼저)
    let payload
    try {
      payload = await verify(token, 'production-secret-key')
      console.log('✅ Token verified with production key')
    } catch (prodError) {
      console.log('🔄 Production key failed, trying test key...')
      try {
        payload = await verify(token, 'test-secret-key')
        console.log('✅ Token verified with test key')
      } catch (testError) {
        console.log('❌ Both keys failed:', testError.message)
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    // 토큰에서 사용자 정보 추출
    const { id, email, userType, name, exp } = payload as any
    
    // 토큰 만료 검사
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      console.log('❌ Token expired:', exp, 'vs', Math.floor(Date.now() / 1000))
      return c.json({ 
        success: false, 
        error: '토큰이 만료되었습니다.' 
      }, 401)
    }

    console.log('👤 Token payload:', { id, email, userType, name })

    // 데이터베이스에서 사용자 현재 상태 확인
    const userTables = {
      'admin': { table: 'admins', nameField: 'name' },
      'agent': { table: 'agents', nameField: 'company_name' },
      'employer': { table: 'employers', nameField: 'company_name' },
      'jobseeker': { table: 'job_seekers', nameField: 'name' },
      'student': { table: 'job_seekers', nameField: 'name' },
      'instructor': { table: 'job_seekers', nameField: 'name' }
    }

    const config = userTables[userType as keyof typeof userTables]
    if (!config) {
      console.log('❌ Unknown user type:', userType)
      return c.json({ 
        success: false, 
        error: '알 수 없는 사용자 유형입니다.' 
      }, 400)
    }

    try {
      const query = `
        SELECT id, email, ${config.nameField} as name, status 
        FROM ${config.table} 
        WHERE id = ? AND email = ?
      `
      
      const user = await c.env.DB.prepare(query).bind(id, email).first()
      
      if (!user) {
        console.log('❌ User not found in database')
        return c.json({ 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        }, 404)
      }

      // 사용자 활성 상태 확인
      if (user.status !== 'active' && user.status !== 'approved') {
        console.log('❌ User not active:', user.status)
        return c.json({ 
          success: false, 
          error: '계정이 비활성 상태입니다.' 
        }, 403)
      }

      console.log('✅ User verification successful')
      
      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: userType,
          user_type: userType, // 호환성
          type: userType, // 호환성
          status: user.status
        },
        message: '토큰 검증이 성공적으로 완료되었습니다.'
      })
      
    } catch (dbError) {
      console.error('❌ Database verification error:', dbError)
      return c.json({ 
        success: false, 
        error: '사용자 정보 확인 중 오류가 발생했습니다.' 
      }, 500)
    }

  } catch (error) {
    console.error('🚫 Token verification error:', error)
    return c.json({ 
      success: false, 
      error: '토큰 검증 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 관리자 통계 API
app.get('/api/admin/stats', async (c) => {
  try {
    console.log('📊 관리자 통계 요청 시작')
    
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '관리자 인증이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }
    
    if (payload.userType !== 'admin') {
      return c.json({ 
        success: false, 
        error: '관리자만 이 기능을 사용할 수 있습니다.' 
      }, 403)
    }

    // 데이터베이스에서 통계 수집
    const totalUsers = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM admins) as admins,
        (SELECT COUNT(*) FROM employers) as employers,
        (SELECT COUNT(*) FROM job_seekers) as jobseekers,
        (SELECT COUNT(*) FROM agents) as agents
    `).first()

    const totalJobPostings = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_postings
    `).first()

    const stats = {
      totalUsers: (totalUsers?.admins || 0) + (totalUsers?.employers || 0) + (totalUsers?.jobseekers || 0) + (totalUsers?.agents || 0),
      totalEmployers: totalUsers?.employers || 0,
      totalJobseekers: totalUsers?.jobseekers || 0,
      totalAgents: totalUsers?.agents || 0,
      totalJobPostings: totalJobPostings?.count || 0
    }

    console.log('📊 통계 수집 완료:', stats)

    return c.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('❌ 관리자 통계 오류:', error)
    return c.json({ 
      success: false, 
      error: '통계 데이터 조회 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 통합 회원가입 API
app.post('/api/auth/register', async (c) => {
  try {
    console.log('📝 Registration attempt started')
    const requestData = await c.req.json()
    console.log('📝 Registration data received:', {
      userType: requestData.userType,
      email: requestData.email,
      hasPassword: !!requestData.password,
      fieldsCount: Object.keys(requestData).length
    })
    
    const { email, password, userType, confirmPassword, ...userData } = requestData
    
    // Sanitize all user inputs to prevent XSS
    const sanitizedUserData: any = {}
    for (const [key, value] of Object.entries(userData)) {
      if (typeof value === 'string') {
        sanitizedUserData[key] = sanitizeInput(value)
      } else {
        sanitizedUserData[key] = value
      }
    }
    
    // 기본 입력 검증
    if (!email || !password || !userType) {
      return c.json({ 
        success: false, 
        error: '이메일, 비밀번호, 사용자 유형은 필수입니다.' 
      }, 400)
    }

    // confirmPassword 검증 (있는 경우에만)
    if (confirmPassword && password !== confirmPassword) {
      return c.json({ 
        success: false, 
        error: '비밀번호가 일치하지 않습니다.' 
      }, 400)
    }

    if (!validateEmail(email)) {
      return c.json({ 
        success: false, 
        error: '올바른 이메일 형식을 입력해주세요.' 
      }, 400)
    }

    if (!validatePassword(password)) {
      return c.json({ 
        success: false, 
        error: '비밀번호는 8자 이상, 영문자와 숫자를 포함해야 합니다.' 
      }, 400)
    }

    console.log(`📊 Registration request: ${email} as ${userType}`)

    // 이메일 중복 검사
    const emailExists = await checkEmailExists(c.env.DB, email)
    if (emailExists) {
      return c.json({ 
        success: false, 
        error: '이미 등록된 이메일입니다.' 
      }, 409)
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password)
    console.log(`🔒 Password hashed successfully`)

    // 사용자 유형별 회원가입 처리
    let userId: number | null = null
    
    switch (userType) {
      case 'admin':
        userId = await createAdmin(c.env.DB, { email, password: hashedPassword, ...sanitizedUserData })
        break
      case 'agent':
        userId = await createAgent(c.env.DB, { email, password: hashedPassword, ...sanitizedUserData })
        break
      case 'employer':
        userId = await createEmployer(c.env.DB, { email, password: hashedPassword, ...sanitizedUserData })
        break
      case 'jobseeker':
      case 'student':
      case 'instructor':
        userId = await createJobSeeker(c.env.DB, { email, password: hashedPassword, ...sanitizedUserData })
        break
      default:
        return c.json({ 
          success: false, 
          error: '올바르지 않은 사용자 유형입니다.' 
        }, 400)
    }

    if (userId) {
      console.log(`✅ User registered successfully: ${email} (ID: ${userId})`)
      
      return c.json({
        success: true,
        message: '회원가입이 성공적으로 완료되었습니다.',
        userId: userId
      })
    } else {
      console.log(`❌ Registration failed for: ${email}`)
      
      return c.json({ 
        success: false, 
        error: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' 
      }, 500)
    }

  } catch (error) {
    console.error('🚫 Registration error:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, 500)
  }
})

// 중복 토큰 검증 API 제거됨 - 라인 3629의 더 포괄적인 구현을 사용

// 로그아웃 API
app.post('/api/auth/logout', async (c) => {
  try {
    // 클라이언트에서 토큰을 삭제하도록 응답
    return c.json({
      success: true,
      message: '로그아웃되었습니다.'
    })
  } catch (error) {
    console.error('Logout API error:', error)
    return c.json({ 
      success: false, 
      error: '로그아웃 처리 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// Duplicate registration endpoint removed - using the secure version at line 4071









// 평문 비밀번호로 인증하는 함수 (신규 가입자용)
async function authenticateUserWithPlainPassword(db: D1Database, email: string, password: string, userType: string) {
  console.log(`🔑 Plain password auth - Email: ${email}, UserType: ${userType}, Password: ${password.substring(0, 5)}...`)
  
  const tables = {
    'jobseeker': 'job_seekers',
    'employer': 'employers', 
    'agent': 'agents',
    'admin': 'admins'
  }
  
  const tableName = tables[userType as keyof typeof tables]
  console.log(`📊 Table name for ${userType}:`, tableName)
  if (!tableName) {
    console.log(`❌ No table found for userType: ${userType}`)
    return null
  }
  
  try {
    let query: string
    
    if (tableName === 'admins') {
      query = `SELECT id, email, name, role as userType FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else if (tableName === 'job_seekers') {
      query = `SELECT id, email, name, nationality, korean_level FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else {
      query = `SELECT id, email, company_name as name FROM ${tableName} WHERE email = ? AND password = ? AND status IN ('approved', 'active', 'pending')`
    }
    
    console.log(`📊 Query:`, query)
    console.log(`📊 Parameters:`, [email, password])
    
    console.log(`📊 Executing query with bind parameters: [${email}, ${password}]`)
    const user = await db.prepare(query).bind(email, password).first()
    console.log(`📊 Query result:`, user)
    
    if (user) {
      console.log(`✅ Plain password authentication SUCCESS for ${email}`)
    } else {
      console.log(`❌ Plain password authentication FAILED for ${email}`)
    }
    
    return user
  } catch (error) {
    console.error(`Plain password authentication error for ${userType}:`, error)
    return null
  }
}

// 모든 테이블에서 사용자 검색 (userType 무관)
async function searchUserInAllTables(db: D1Database, email: string, password: string) {
  const tables = [
    { name: 'job_seekers', userType: 'jobseeker', nameField: 'name' },
    { name: 'employers', userType: 'employer', nameField: 'company_name' },
    { name: 'agents', userType: 'agent', nameField: 'company_name' },
    { name: 'admins', userType: 'admin', nameField: 'name' }
  ]
  
  for (const table of tables) {
    try {
      // 평문 비밀번호로 먼저 시도
      let query = `SELECT id, email, ${table.nameField} as name FROM ${table.name} WHERE email = ? AND password = ?`
      let user = await db.prepare(query).bind(email, password).first()
      
      if (user) {
        console.log(`Found user in ${table.name} with plain password`)
        return { ...user, userType: table.userType }
      }
      
      // 해시된 비밀번호로 시도
      const hashedPassword = await hash(password)
      user = await db.prepare(query).bind(email, hashedPassword).first()
      
      if (user) {
        console.log(`Found user in ${table.name} with hashed password`)
        return { ...user, userType: table.userType }
      }
      
    } catch (error) {
      console.log(`Error searching in ${table.name}:`, error)
    }
  }
  
  return null
}



// 구직자 등록 API (별도 엔드포인트) 
app.post('/api/job-seekers/register', async (c) => {
  try {
    const data = await c.req.json()
    
    // 필수 필드 검증
    const { 
      name, 
      email, 
      password, 
      nationality, 
      birth_date, 
      gender, 
      phone, 
      current_address, 
      korean_level,
      education_level,
      current_visa,
      desired_visa
    } = data
    
    if (!name || !email || !password || !nationality) {
      return c.json({ 
        success: false, 
        error: '필수 정보가 누락되었습니다.' 
      }, 400)
    }
    
    if (!validateEmail(email)) {
      return c.json({ 
        success: false, 
        error: '올바른 이메일 형식이 아닙니다.' 
      }, 400)
    }
    
    if (!validatePassword(password)) {
      return c.json({ 
        success: false, 
        error: '비밀번호는 최소 8자, 영문자와 숫자를 포함해야 합니다.' 
      }, 400)
    }
    
    // 이메일 중복 확인
    const emailExists = await checkEmailExists(c.env.DB, email, 'jobseeker')
    if (emailExists) {
      return c.json({ 
        success: false, 
        error: '이미 사용 중인 이메일입니다.' 
      }, 400)
    }
    
    // 비밀번호 해시
    const hashedPassword = await hash(password)
    
    console.log(`=== Job Seeker Registration ===`)
    console.log(`Email: ${email}`)
    console.log(`Name: ${name}`)
    console.log(`Nationality: ${nationality}`)
    
    // 구직자 생성 (비밀번호 평문으로 저장 - 추후 해시로 변경 예정)
    const userId = await createJobSeeker(c.env.DB, {
      email,
      password: password, // 임시로 평문 저장
      name,
      birth_date,
      gender,
      nationality,
      phone,
      current_address,
      korean_level: korean_level || 'beginner',
      education_level,
      current_visa,
      desired_visa
    })
    
    console.log(`Created user ID: ${userId}`)
    
    if (!userId) {
      console.log(`Failed to create job seeker`)
      return c.json({ 
        success: false, 
        error: '회원가입 중 오류가 발생했습니다.' 
      }, 500)
    }
    
    console.log(`Job seeker registration successful for: ${email}`)
    
    return c.json({
      success: true,
      user: {
        id: userId,
        email: email,
        name: name,
        userType: 'jobseeker'
      },
      message: '구직자 회원가입이 완료되었습니다 (마켓 우선 처리)'
    })
    
  } catch (error) {
    console.error('Job seeker registration API error:', error)
    return c.json({ 
      success: false, 
      error: '회원가입 처리 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 활성 에이전트 목록 API (회원가입용)
app.get('/api/agents/active', async (c) => {
  try {
    const agents = await c.env.DB.prepare(`
      SELECT id, company_name, country, contact_person 
      FROM agents 
      WHERE status = 'approved' 
      ORDER BY company_name
    `).all()

    return c.json(agents.results || [])
  } catch (error) {
    console.error('Active agents API error:', error)
    // 에러 시 기본 에이전트 목록 반환
    return c.json([
      { id: 1, company_name: 'Vietnam Job Agency', country: 'Vietnam', contact_person: 'Nguyen Van A' },
      { id: 2, company_name: 'Philippines Employment Center', country: 'Philippines', contact_person: 'Maria Santos' }
    ])
  }
})

// 유틸리티 함수
function convertKoreanLevel(level: string): string {
  if (!level) return 'none'
  
  const levelMap: Record<string, string> = {
    '1급': 'basic',
    '2급': 'basic',
    '3급': 'intermediate', 
    '4급': 'intermediate',
    '5급': 'advanced',
    '6급': 'advanced'
  }
  
  return levelMap[level] || 'none'
}



// 🔄 비밀번호 마이그레이션 함수들
async function migrateUserPasswords(db: D1Database, tableName: string, batchSize: number = 100): Promise<{total: number, migrated: number, errors: number}> {
  console.log(`🔄 Starting password migration for table: ${tableName}`)
  
  let total = 0
  let migrated = 0 
  let errors = 0
  let offset = 0
  
  try {
    // 전체 사용자 수 확인
    const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first()
    total = countResult?.count || 0
    console.log(`📊 Total users in ${tableName}: ${total}`)
    
    if (total === 0) return { total, migrated, errors }
    
    while (offset < total) {
      try {
        // 배치 단위로 사용자 조회 (PBKDF2 형식이 아닌 비밀번호만)
        const users = await db.prepare(`
          SELECT id, email, password 
          FROM ${tableName} 
          WHERE password NOT LIKE '$pbkdf2$%'
          LIMIT ? OFFSET ?
        `).bind(batchSize, offset).all()
        
        if (!users.results || users.results.length === 0) {
          console.log(`✅ No more users to migrate in ${tableName}`)
          break
        }
        
        console.log(`🔄 Processing batch: ${users.results.length} users from ${tableName}`)
        
        // 각 사용자의 비밀번호를 PBKDF2로 해시
        for (const user of users.results) {
          try {
            const plainPassword = user.password as string
            if (!plainPassword || plainPassword.startsWith('$pbkdf2$')) {
              continue // 이미 마이그레이션된 비밀번호는 스킵
            }
            
            // 새로운 PBKDF2 해시 생성
            const newHashedPassword = await hashPassword(plainPassword)
            
            // 데이터베이스 업데이트
            await db.prepare(`
              UPDATE ${tableName} 
              SET password = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(newHashedPassword, user.id).run()
            
            migrated++
            console.log(`✅ Migrated user ${user.email} in ${tableName}`)
            
          } catch (userError) {
            console.error(`❌ Error migrating user ${user.email}:`, userError)
            errors++
          }
        }
        
        offset += batchSize
        
      } catch (batchError) {
        console.error(`❌ Batch processing error for ${tableName}:`, batchError)
        errors++
        offset += batchSize
      }
    }
    
  } catch (error) {
    console.error(`❌ Migration error for ${tableName}:`, error)
    errors++
  }
  
  console.log(`📈 Migration complete for ${tableName}: ${migrated}/${total} users migrated, ${errors} errors`)
  return { total, migrated, errors }
}

// 데이터베이스 스키마 마이그레이션 API
app.post('/api/admin/run-migration', async (c) => {
  try {
    console.log('🚀 Database migration started')
    
    // 관리자 권한 확인
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '관리자 인증이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }
    
    if (payload.userType !== 'admin') {
      return c.json({ 
        success: false, 
        error: '관리자만 이 기능을 사용할 수 있습니다.' 
      }, 403)
    }

    // 2FA 컬럼 추가 마이그레이션
    const migrations = []
    
    try {
      // 관리자 테이블에 2FA 컬럼 추가
      await c.env.DB.prepare(`
        ALTER TABLE admins ADD COLUMN two_factor_enabled INTEGER DEFAULT 0
      `).run()
      migrations.push('admins.two_factor_enabled')
    } catch (e) {
      console.log('admins.two_factor_enabled already exists or error:', e.message)
    }
    
    try {
      await c.env.DB.prepare(`
        ALTER TABLE admins ADD COLUMN two_factor_phone TEXT
      `).run()
      migrations.push('admins.two_factor_phone')
    } catch (e) {
      console.log('admins.two_factor_phone already exists or error:', e.message)
    }

    // 에이전트 테이블
    try {
      await c.env.DB.prepare(`
        ALTER TABLE agents ADD COLUMN two_factor_enabled INTEGER DEFAULT 0
      `).run()
      migrations.push('agents.two_factor_enabled')
    } catch (e) {
      console.log('agents.two_factor_enabled already exists or error:', e.message)
    }
    
    try {
      await c.env.DB.prepare(`
        ALTER TABLE agents ADD COLUMN two_factor_phone TEXT
      `).run()
      migrations.push('agents.two_factor_phone')
    } catch (e) {
      console.log('agents.two_factor_phone already exists or error:', e.message)
    }

    // 기업 테이블
    try {
      await c.env.DB.prepare(`
        ALTER TABLE employers ADD COLUMN two_factor_enabled INTEGER DEFAULT 0
      `).run()
      migrations.push('employers.two_factor_enabled')
    } catch (e) {
      console.log('employers.two_factor_enabled already exists or error:', e.message)
    }
    
    try {
      await c.env.DB.prepare(`
        ALTER TABLE employers ADD COLUMN two_factor_phone TEXT
      `).run()
      migrations.push('employers.two_factor_phone')
    } catch (e) {
      console.log('employers.two_factor_phone already exists or error:', e.message)
    }

    // 구직자 테이블
    try {
      await c.env.DB.prepare(`
        ALTER TABLE job_seekers ADD COLUMN two_factor_enabled INTEGER DEFAULT 0
      `).run()
      migrations.push('job_seekers.two_factor_enabled')
    } catch (e) {
      console.log('job_seekers.two_factor_enabled already exists or error:', e.message)
    }
    
    try {
      await c.env.DB.prepare(`
        ALTER TABLE job_seekers ADD COLUMN two_factor_phone TEXT
      `).run()
      migrations.push('job_seekers.two_factor_phone')
    } catch (e) {
      console.log('job_seekers.two_factor_phone already exists or error:', e.message)
    }

    // OTP 토큰 테이블 생성
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS otp_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          userType TEXT NOT NULL,
          otp_code TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
      migrations.push('otp_tokens table')
    } catch (e) {
      console.log('otp_tokens table creation error:', e.message)
    }

    // 비밀번호 재설정 테이블 생성
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          userType TEXT NOT NULL,
          reset_token TEXT NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME NULL
        )
      `).run()
      migrations.push('password_reset_tokens table')
    } catch (e) {
      console.log('password_reset_tokens table creation error:', e.message)
    }

    // 인덱스 생성
    try {
      await c.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_otp_email_usertype ON otp_tokens(email, userType)`).run()
      await c.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(reset_token)`).run()
      migrations.push('security indices')
    } catch (e) {
      console.log('Index creation error:', e.message)
    }

    console.log(`✅ Migration completed. Applied: ${migrations.join(', ')}`)
    
    return c.json({
      success: true,
      message: '데이터베이스 마이그레이션이 완료되었습니다.',
      migrations: migrations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return c.json({ 
      success: false, 
      error: '마이그레이션 중 오류가 발생했습니다.',
      details: error.message
    }, 500)
  }
})

// 관리자 전용 비밀번호 마이그레이션 API
app.post('/api/admin/migrate-passwords', async (c) => {
  try {
    console.log('🚀 Password migration started')
    
    // 관리자 권한 확인
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '관리자 인증이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }
    
    // 관리자 권한 확인
    if (payload.userType !== 'admin') {
      return c.json({ 
        success: false, 
        error: '관리자만 이 기능을 사용할 수 있습니다.' 
      }, 403)
    }

    // 모든 테이블에서 비밀번호 마이그레이션 실행
    const tables = ['admins', 'agents', 'employers', 'job_seekers']
    const results = {}
    let totalMigrated = 0
    let totalErrors = 0
    
    for (const table of tables) {
      try {
        console.log(`🔄 Migrating ${table}...`)
        const result = await migrateUserPasswords(c.env.DB, table)
        results[table] = result
        totalMigrated += result.migrated
        totalErrors += result.errors
        
        // 테이블 간 잠시 대기 (부하 분산)
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (tableError) {
        console.error(`❌ Error migrating table ${table}:`, tableError)
        results[table] = { total: 0, migrated: 0, errors: 1 }
        totalErrors++
      }
    }
    
    console.log(`✅ Password migration completed. Total migrated: ${totalMigrated}, Total errors: ${totalErrors}`)
    
    return c.json({
      success: true,
      message: '비밀번호 마이그레이션이 완료되었습니다.',
      results: results,
      summary: {
        totalMigrated,
        totalErrors,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Migration API error:', error)
    return c.json({ 
      success: false, 
      error: '마이그레이션 중 오류가 발생했습니다.',
      details: error.message
    }, 500)
  }
})

// 비밀번호 마이그레이션 상태 확인 API
app.get('/api/admin/migration-status', async (c) => {
  try {
    // 관리자 권한 확인
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '관리자 인증이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }
    
    if (payload.userType !== 'admin') {
      return c.json({ 
        success: false, 
        error: '관리자만 이 기능을 사용할 수 있습니다.' 
      }, 403)
    }

    // 각 테이블의 마이그레이션 상태 확인
    const tables = ['admins', 'agents', 'employers', 'job_seekers']
    const status = {}
    
    for (const table of tables) {
      try {
        const totalResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first()
        const migratedResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE password LIKE '$pbkdf2$%'`).first()
        const pendingResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE password NOT LIKE '$pbkdf2$%'`).first()
        
        status[table] = {
          total: totalResult?.count || 0,
          migrated: migratedResult?.count || 0,
          pending: pendingResult?.count || 0,
          percentage: totalResult?.count > 0 ? Math.round((migratedResult?.count / totalResult?.count) * 100) : 0
        }
        
      } catch (tableError) {
        console.error(`Error checking ${table}:`, tableError)
        status[table] = { total: 0, migrated: 0, pending: 0, percentage: 0, error: tableError.message }
      }
    }
    
    return c.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Migration status error:', error)
    return c.json({ 
      success: false, 
      error: '마이그레이션 상태 확인 중 오류가 발생했습니다.',
      details: error.message
    }, 500)
  }
})

// 🔐 추가 보안 기능들

// 6자리 OTP 생성 함수
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 비밀번호 재설정 토큰 생성 함수
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// 이메일 발송 시뮬레이션 함수 (실제로는 SendGrid, AWS SES 등 사용)
async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
  try {
    // 실제 환경에서는 이메일 서비스 API 호출
    console.log(`📧 Email sent to ${to}:`)
    console.log(`Subject: ${subject}`)
    console.log(`Content: ${content}`)
    
    // 시뮬레이션: 성공으로 처리
    return true
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}

// 2FA 활성화 API
app.post('/api/auth/enable-2fa', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    const { email, userType } = payload
    const { phone } = await c.req.json()

    if (!phone || phone.length < 10) {
      return c.json({ 
        success: false, 
        error: '유효한 휴대폰 번호가 필요합니다.' 
      }, 400)
    }

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 먼저 사용자 존재 여부 확인
    const userCheck = await c.env.DB.prepare(`
      SELECT id, email FROM ${tableName} WHERE email = ?
    `).bind(email).first()

    if (!userCheck) {
      return c.json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다.' 
      }, 404)
    }

    // 2FA 컬럼 존재 여부 확인 후 업데이트
    try {
      const result = await c.env.DB.prepare(`
        UPDATE ${tableName} 
        SET two_factor_enabled = 1, 
            two_factor_phone = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `).bind(phone, email).run()

      if (result.success && result.changes > 0) {
        console.log(`✅ 2FA enabled for user: ${email}`)
        
        return c.json({
          success: true,
          message: '2단계 인증이 활성화되었습니다.',
          twoFactorEnabled: true,
          phone: phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
        })
      } else {
        return c.json({ 
          success: false, 
          error: '사용자 업데이트에 실패했습니다.' 
        }, 500)
      }
    } catch (dbError) {
      console.error('2FA database error:', dbError)
      
      // 컬럼이 없는 경우 자동으로 추가 시도
      if (dbError.message.includes('no such column')) {
        try {
          await c.env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`).run()
          await c.env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN two_factor_phone TEXT`).run()
          
          // 다시 시도
          const retryResult = await c.env.DB.prepare(`
            UPDATE ${tableName} 
            SET two_factor_enabled = 1, 
                two_factor_phone = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
          `).bind(phone, email).run()

          if (retryResult.success) {
            console.log(`✅ 2FA enabled for user after column creation: ${email}`)
            return c.json({
              success: true,
              message: '2단계 인증이 활성화되었습니다.',
              twoFactorEnabled: true,
              phone: phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
            })
          }
        } catch (alterError) {
          console.error('Column creation error:', alterError)
        }
      }
      
      return c.json({ 
        success: false, 
        error: '2단계 인증 활성화 중 데이터베이스 오류가 발생했습니다.',
        details: dbError.message
      }, 500)
    }

  } catch (error) {
    console.error('2FA enable error:', error)
    return c.json({ 
      success: false, 
      error: '2단계 인증 설정 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 2FA 비활성화 API
app.post('/api/auth/disable-2fa', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    const { email, userType } = payload

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 2FA 설정 제거
    const result = await c.env.DB.prepare(`
      UPDATE ${tableName} 
      SET two_factor_enabled = 0, 
          two_factor_phone = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).bind(email).run()

    if (result.success) {
      console.log(`✅ 2FA disabled for user: ${email}`)
      
      return c.json({
        success: true,
        message: '2단계 인증이 비활성화되었습니다.',
        twoFactorEnabled: false
      })
    } else {
      return c.json({ 
        success: false, 
        error: '2단계 인증 비활성화에 실패했습니다.' 
      }, 500)
    }

  } catch (error) {
    console.error('2FA disable error:', error)
    return c.json({ 
      success: false, 
      error: '2단계 인증 설정 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// OTP 전송 API (로그인 시 사용)
app.post('/api/auth/send-otp', async (c) => {
  try {
    const { email, userType } = await c.req.json()

    if (!email || !userType) {
      return c.json({ 
        success: false, 
        error: '이메일과 사용자 유형이 필요합니다.' 
      }, 400)
    }

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 사용자 2FA 설정 확인
    const user = await c.env.DB.prepare(`
      SELECT email, two_factor_enabled, two_factor_phone 
      FROM ${tableName} 
      WHERE email = ? AND two_factor_enabled = 1
    `).bind(email).first()

    if (!user) {
      return c.json({ 
        success: false, 
        error: '2단계 인증이 설정되지 않은 사용자입니다.' 
      }, 404)
    }

    // OTP 생성 및 저장
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5분 후 만료

    // OTP를 임시 저장 (실제로는 Redis 등 사용)
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO otp_tokens (email, userType, otp_code, expires_at, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(email, userType, otp, expiresAt.toISOString()).run()

    // SMS 발송 시뮬레이션 (실제로는 Twilio, AWS SNS 등 사용)
    console.log(`📱 SMS sent to ${user.two_factor_phone}: Your OTP is ${otp}`)

    return c.json({
      success: true,
      message: 'OTP 코드가 전송되었습니다.',
      expiresIn: 300 // 5분
    })

  } catch (error) {
    console.error('OTP send error:', error)
    return c.json({ 
      success: false, 
      error: 'OTP 전송 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// OTP 검증 API
app.post('/api/auth/verify-otp', async (c) => {
  try {
    const { email, userType, otp } = await c.req.json()

    if (!email || !userType || !otp) {
      return c.json({ 
        success: false, 
        error: '이메일, 사용자 유형, OTP 코드가 필요합니다.' 
      }, 400)
    }

    // OTP 검증
    const otpRecord = await c.env.DB.prepare(`
      SELECT * FROM otp_tokens 
      WHERE email = ? AND userType = ? AND otp_code = ? 
      AND datetime(expires_at) > datetime('now')
    `).bind(email, userType, otp).first()

    if (!otpRecord) {
      return c.json({ 
        success: false, 
        error: '유효하지 않거나 만료된 OTP 코드입니다.' 
      }, 400)
    }

    // OTP 사용 처리
    await c.env.DB.prepare(`
      DELETE FROM otp_tokens 
      WHERE email = ? AND userType = ? AND otp_code = ?
    `).bind(email, userType, otp).run()

    console.log(`✅ OTP verified for user: ${email}`)

    return c.json({
      success: true,
      message: 'OTP 인증이 완료되었습니다.'
    })

  } catch (error) {
    console.error('OTP verify error:', error)
    return c.json({ 
      success: false, 
      error: 'OTP 검증 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 비밀번호 재설정 요청 API
app.post('/api/auth/request-password-reset', async (c) => {
  try {
    const { email, userType } = await c.req.json()

    if (!email || !userType) {
      return c.json({ 
        success: false, 
        error: '이메일과 사용자 유형이 필요합니다.' 
      }, 400)
    }

    if (!validateEmail(email)) {
      return c.json({ 
        success: false, 
        error: '올바른 이메일 형식이 아닙니다.' 
      }, 400)
    }

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 사용자 존재 여부 확인
    const user = await c.env.DB.prepare(`
      SELECT email FROM ${tableName} WHERE email = ?
    `).bind(email).first()

    if (!user) {
      // 보안상 사용자 존재 여부를 노출하지 않음
      return c.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.'
      })
    }

    // 재설정 토큰 생성
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1시간 후 만료

    // 토큰 저장
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO password_reset_tokens (email, userType, reset_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(email, userType, resetToken, expiresAt.toISOString()).run()

    // 이메일 발송
    const resetLink = `https://b2c2d104.w-campus.pages.dev/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}&type=${userType}`
    const emailContent = `
      안녕하세요,
      
      비밀번호 재설정을 요청하셨습니다.
      아래 링크를 클릭하여 새 비밀번호를 설정해주세요:
      
      ${resetLink}
      
      이 링크는 1시간 후에 만료됩니다.
      만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시해주세요.
      
      감사합니다.
      WOW-CAMPUS K-Work Platform
    `

    const emailSent = await sendEmail(email, 'WOW-CAMPUS 비밀번호 재설정', emailContent)
    
    console.log(`🔒 Password reset requested for: ${email}, Token: ${resetToken}`)

    return c.json({
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.',
      // 개발 환경에서만 토큰 노출 (실제 운영에서는 제거)
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return c.json({ 
      success: false, 
      error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 비밀번호 재설정 확인 API
app.post('/api/auth/reset-password', async (c) => {
  try {
    const { token, email, userType, newPassword } = await c.req.json()

    if (!token || !email || !userType || !newPassword) {
      return c.json({ 
        success: false, 
        error: '모든 필드가 필요합니다.' 
      }, 400)
    }

    // 비밀번호 강도 검증
    if (newPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      return c.json({ 
        success: false, 
        error: '비밀번호는 8자 이상, 영문자와 숫자를 포함해야 합니다.' 
      }, 400)
    }

    // 토큰 검증
    const tokenRecord = await c.env.DB.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE email = ? AND userType = ? AND reset_token = ?
      AND datetime(expires_at) > datetime('now')
    `).bind(email, userType, token).first()

    if (!tokenRecord) {
      return c.json({ 
        success: false, 
        error: '유효하지 않거나 만료된 재설정 토큰입니다.' 
      }, 400)
    }

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 새 비밀번호 해싱
    const hashedPassword = await hashPassword(newPassword)

    // 비밀번호 업데이트
    const result = await c.env.DB.prepare(`
      UPDATE ${tableName} 
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).bind(hashedPassword, email).run()

    if (result.success) {
      // 사용된 토큰 삭제
      await c.env.DB.prepare(`
        DELETE FROM password_reset_tokens 
        WHERE email = ? AND userType = ? AND reset_token = ?
      `).bind(email, userType, token).run()

      console.log(`✅ Password reset completed for: ${email}`)

      return c.json({
        success: true,
        message: '비밀번호가 성공적으로 재설정되었습니다.'
      })
    } else {
      return c.json({ 
        success: false, 
        error: '비밀번호 재설정에 실패했습니다.' 
      }, 500)
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return c.json({ 
      success: false, 
      error: '비밀번호 재설정 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 보안 설정 조회 API
app.get('/api/auth/security-settings', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    const { email, userType } = payload

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    // 보안 설정 조회 (2FA 컬럼 없는 경우 대비)
    let user
    try {
      user = await c.env.DB.prepare(`
        SELECT 
          email,
          two_factor_enabled,
          two_factor_phone,
          updated_at
        FROM ${tableName} 
        WHERE email = ?
      `).bind(email).first()
    } catch (dbError) {
      // 2FA 컬럼이 없는 경우 기본 정보만 조회
      if (dbError.message.includes('no such column')) {
        user = await c.env.DB.prepare(`
          SELECT 
            email,
            updated_at
          FROM ${tableName} 
          WHERE email = ?
        `).bind(email).first()
        
        if (user) {
          user.two_factor_enabled = 0
          user.two_factor_phone = null
        }
      } else {
        throw dbError
      }
    }

    if (!user) {
      return c.json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다.' 
      }, 404)
    }

    return c.json({
      success: true,
      settings: {
        email: user.email,
        userType: userType,
        twoFactorEnabled: !!user.two_factor_enabled,
        twoFactorPhone: user.two_factor_phone ? 
          user.two_factor_phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3') : null,
        lastUpdated: user.updated_at,
        // UI에서 활용할 수 있는 추가 정보
        canEnable2FA: !user.two_factor_enabled,
        securityLevel: user.two_factor_enabled ? 'high' : 'medium'
      }
    })

  } catch (error) {
    console.error('Security settings error:', error)
    return c.json({ 
      success: false, 
      error: '보안 설정 조회 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 보안 설정 업데이트 API (UI 연동용)
app.post('/api/auth/update-security', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    const { email, userType } = payload
    const { action, phone } = await c.req.json()

    if (!action) {
      return c.json({ 
        success: false, 
        error: '작업을 선택해주세요.' 
      }, 400)
    }

    // 사용자 테이블 결정
    const tables = {
      'admin': 'admins',
      'agent': 'agents', 
      'employer': 'employers',
      'jobseeker': 'job_seekers'
    }
    
    const tableName = tables[userType as keyof typeof tables]
    if (!tableName) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 사용자 유형입니다.' 
      }, 400)
    }

    if (action === 'enable_2fa') {
      if (!phone || phone.length < 10) {
        return c.json({ 
          success: false, 
          error: '유효한 휴대폰 번호가 필요합니다.' 
        }, 400)
      }

      try {
        const result = await c.env.DB.prepare(`
          UPDATE ${tableName} 
          SET two_factor_enabled = 1, 
              two_factor_phone = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `).bind(phone, email).run()

        if (result.success) {
          return c.json({
            success: true,
            message: '2단계 인증이 활성화되었습니다.',
            settings: {
              twoFactorEnabled: true,
              twoFactorPhone: phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
            }
          })
        }
      } catch (dbError) {
        if (dbError.message.includes('no such column')) {
          try {
            await c.env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`).run()
            await c.env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN two_factor_phone TEXT`).run()
            
            const retryResult = await c.env.DB.prepare(`
              UPDATE ${tableName} 
              SET two_factor_enabled = 1, 
                  two_factor_phone = ?
              WHERE email = ?
            `).bind(phone, email).run()

            if (retryResult.success) {
              return c.json({
                success: true,
                message: '2단계 인증이 활성화되었습니다.',
                settings: {
                  twoFactorEnabled: true,
                  twoFactorPhone: phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3')
                }
              })
            }
          } catch (alterError) {
            console.error('Column creation error:', alterError)
          }
        }
        throw dbError
      }
    } 
    else if (action === 'disable_2fa') {
      try {
        const result = await c.env.DB.prepare(`
          UPDATE ${tableName} 
          SET two_factor_enabled = 0, 
              two_factor_phone = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `).bind(email).run()

        if (result.success) {
          return c.json({
            success: true,
            message: '2단계 인증이 비활성화되었습니다.',
            settings: {
              twoFactorEnabled: false,
              twoFactorPhone: null
            }
          })
        }
      } catch (dbError) {
        if (dbError.message.includes('no such column')) {
          // 컬럼이 없으면 이미 비활성화된 상태로 간주
          return c.json({
            success: true,
            message: '2단계 인증이 비활성화되었습니다.',
            settings: {
              twoFactorEnabled: false,
              twoFactorPhone: null
            }
          })
        }
        throw dbError
      }
    }
    else {
      return c.json({ 
        success: false, 
        error: '지원하지 않는 작업입니다.' 
      }, 400)
    }

    return c.json({ 
      success: false, 
      error: '설정 업데이트에 실패했습니다.' 
    }, 500)

  } catch (error) {
    console.error('Security update error:', error)
    return c.json({ 
      success: false, 
      error: '보안 설정 업데이트 중 오류가 발생했습니다.',
      details: error.message
    }, 500)
  }
})

// UI용 보안 기능 상태 조회 API
app.get('/api/auth/security-features', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, 401)
    }

    const token = authHeader.substring(7)
    let payload
    
    try {
      payload = await verify(token, 'production-secret-key')
    } catch (prodError) {
      try {
        payload = await verify(token, 'test-secret-key')
      } catch (testError) {
        return c.json({ 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        }, 401)
      }
    }

    const { userType } = payload

    // 사용자 유형별 사용 가능한 보안 기능
    const features = {
      'admin': {
        twoFactorAuth: true,
        passwordReset: true,
        securityLogs: true,
        migration: true,
        adminPanel: true
      },
      'agent': {
        twoFactorAuth: true,
        passwordReset: true,
        securityLogs: false,
        migration: false,
        adminPanel: false
      },
      'employer': {
        twoFactorAuth: true,
        passwordReset: true,
        securityLogs: false,
        migration: false,
        adminPanel: false
      },
      'jobseeker': {
        twoFactorAuth: true,
        passwordReset: true,
        securityLogs: false,
        migration: false,
        adminPanel: false
      }
    }

    return c.json({
      success: true,
      features: features[userType] || features['jobseeker'],
      userType: userType
    })

  } catch (error) {
    console.error('Security features error:', error)
    return c.json({ 
      success: false, 
      error: '보안 기능 조회 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 헬스체크 엔드포인트
app.get('/health', async (c) => {
  try {
    // 데이터베이스 연결 확인
    await c.env.DB.prepare('SELECT 1').first()
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'WOW-CAMPUS K-Work Platform',
      version: '1.0.0',
      database: 'connected'
    })
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'WOW-CAMPUS K-Work Platform',
      version: '1.0.0',
      database: 'error',
      error: 'Database connection failed'
    }, 500)
  }
})

// 시스템 상태 API
app.get('/api/system/status', async (c) => {
  try {
    const dbCheck = await c.env.DB.prepare('SELECT COUNT(*) as total FROM employers').first()
    const userCounts = {
      employers: dbCheck?.total || 0,
      jobSeekers: (await c.env.DB.prepare('SELECT COUNT(*) as total FROM job_seekers').first())?.total || 0,
      agents: (await c.env.DB.prepare('SELECT COUNT(*) as total FROM agents').first())?.total || 0,
      jobPostings: (await c.env.DB.prepare('SELECT COUNT(*) as total FROM job_postings').first())?.total || 0
    }
    
    return c.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      counts: userCounts,
      uptime: process.uptime ? Math.floor(process.uptime()) : 0
    })
  } catch (error) {
    return c.json({ 
      error: '시스템 상태 확인 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// ===============================
// 대시보드 API 엔드포인트 추가
// ===============================

// 에이전트 통계 정보 API
app.get('/api/agents/:agentId/stats', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    if (!validateId(agentId)) {
      return c.json({ error: 'Invalid agent ID' }, 400)
    }

    // Mock data for testing - 실제로는 DB에서 조회
    const stats = {
      totalJobseekers: 127,
      activeApplications: 23,
      studyApplications: 15,
      successfulMatches: 8
    }

    return c.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Agent stats API error:', error)
    return c.json({ error: 'Failed to fetch agent stats' }, 500)
  }
})

// 구직자 목록 API
app.get('/api/agents/:agentId/jobseekers', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    if (!validateId(agentId)) {
      return c.json({ error: 'Invalid agent ID' }, 400)
    }

    // Mock data for testing
    const jobseekers = [
      {
        id: 1,
        name: '김구직',
        nationality: '베트남',
        current_visa: 'D-2',
        desired_visa: 'E-7',
        korean_level: 'intermediate',
        status: 'active',
        email: 'jobseeker@test.com',
        phone: '010-1234-5678'
      },
      {
        id: 2,
        name: '이구직자',
        nationality: '필리핀',
        current_visa: 'F-4',
        desired_visa: 'E-9',
        korean_level: 'beginner',
        status: 'active',
        email: 'jobseeker2@test.com',
        phone: '010-9876-5432'
      }
    ]

    return c.json({
      success: true,
      jobseekers,
      total: jobseekers.length
    })
  } catch (error) {
    console.error('Jobseekers API error:', error)
    return c.json({ error: 'Failed to fetch jobseekers' }, 500)
  }
})

// 구인 정보 API  
app.get('/api/jobs', async (c) => {
  try {
    // Mock data for testing
    const jobs = [
      {
        id: 1,
        title: '웹 개발자',
        company: '삼성전자',
        location: '서울 강남구',
        visa_type: 'E-7',
        salary_min: 3000,
        salary_max: 4500,
        posted_date: '2024-09-01',
        status: 'active'
      },
      {
        id: 2,
        title: '디자이너',
        company: 'LG전자',
        location: '서울 서초구',
        visa_type: 'E-7',
        salary_min: 2800,
        salary_max: 4000,
        posted_date: '2024-09-02',
        status: 'active'
      }
    ]

    return c.json({
      success: true,
      jobs,
      total: jobs.length
    })
  } catch (error) {
    console.error('Jobs API error:', error)
    return c.json({ error: 'Failed to fetch jobs' }, 500)
  }
})

// 지원 현황 API
app.get('/api/agents/:agentId/applications', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    if (!validateId(agentId)) {
      return c.json({ error: 'Invalid agent ID' }, 400)
    }

    // Mock data for testing
    const applications = [
      {
        id: 1,
        jobseeker_name: '김구직',
        job_title: '웹 개발자',
        company: '삼성전자',
        status: 'pending',
        applied_date: '2024-09-05',
        interview_date: null
      },
      {
        id: 2,
        jobseeker_name: '이구직자',
        job_title: '디자이너',
        company: 'LG전자',
        status: 'interview_scheduled',
        applied_date: '2024-09-03',
        interview_date: '2024-09-10'
      }
    ]

    return c.json({
      success: true,
      applications,
      total: applications.length
    })
  } catch (error) {
    console.error('Applications API error:', error)
    return c.json({ error: 'Failed to fetch applications' }, 500)
  }
})

// 유학생 목록 API
app.get('/api/agents/:agentId/students', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    if (!validateId(agentId)) {
      return c.json({ error: 'Invalid agent ID' }, 400)
    }

    // Mock data for testing
    const students = [
      {
        id: 1,
        name: '박유학',
        email: 'student1@test.com',
        nationality: '중국',
        korean_level: 'advanced',
        desired_visa: 'D-2',
        education: '학사',
        major: '경영학',
        status: 'active'
      },
      {
        id: 2,
        name: '최학생',
        email: 'student2@test.com',
        nationality: '일본',
        korean_level: 'intermediate',
        desired_visa: 'D-2',
        education: '고등학교',
        major: 'IT',
        status: 'active'
      }
    ]

    return c.json({
      success: true,
      students,
      total: students.length
    })
  } catch (error) {
    console.error('Students API error:', error)
    return c.json({ error: 'Failed to fetch students' }, 500)
  }
})

// 학습 프로그램 API
app.get('/api/study-programs', async (c) => {
  try {
    // Mock data for testing
    const programs = [
      {
        id: 1,
        title: '한국어 집중과정',
        type: 'language',
        duration: '6개월',
        level: 'beginner',
        description: '기초 한국어부터 중급까지'
      },
      {
        id: 2,
        title: '대학 진학 준비과정',
        type: 'undergraduate',
        duration: '1년',
        level: 'intermediate',
        description: '대학 입학을 위한 종합 준비과정'
      }
    ]

    return c.json({
      success: true,
      programs,
      total: programs.length
    })
  } catch (error) {
    console.error('Study programs API error:', error)
    return c.json({ error: 'Failed to fetch study programs' }, 500)
  }
})

// 구직자 API
app.get('/api/jobseekers', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = (page - 1) * limit

    const jobseekers = await c.env.DB.prepare(`
      SELECT 
        id, name, email, phone, nationality, current_visa as visa_status, korean_level,
        work_experience, education_level, status, created_at
      FROM job_seekers 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_seekers
    `).first()

    const total = totalResult?.count || 0

    return c.json({
      success: true,
      jobseekers: jobseekers.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Job seekers API error:', error)
    return c.json({ error: 'Failed to fetch job seekers' }, 500)
  }
})

// 통계 API
app.get('/api/stats', async (c) => {
  try {
    // 구직자 통계
    const jobSeekersCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_seekers
    `).first()

    // 구인 정보 통계
    const jobsCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_postings WHERE status = 'active'
    `).first()

    // 매칭 통계
    const matchesCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_matches WHERE status = 'matched'
    `).first()

    // 에이전트 통계
    const agentsCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM agents WHERE status = 'active'
    `).first()

    return c.json({
      success: true,
      stats: {
        totalJobSeekers: jobSeekersCount?.count || 0,
        activeJobs: jobsCount?.count || 0,
        successfulMatches: matchesCount?.count || 0,
        activeAgents: agentsCount?.count || 0
      }
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

// 데이터베이스 시드 데이터 생성 API (관리용) - GET version for testing
app.get('/api/admin/seed-database/:key', async (c) => {
  try {
    // 보안을 위해 특별한 키 확인
    const adminKey = c.req.param('key')
    if (adminKey !== 'w-campus-seed-2025') {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // 기존 데이터 확인
    const existingEmployers = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM employers`).first()
    if (existingEmployers?.count > 0) {
      return c.json({ 
        success: true, 
        message: 'Database already seeded', 
        counts: { employers: existingEmployers.count }
      })
    }

    // 샘플 구인 기업 추가
    await c.env.DB.prepare(`
      INSERT INTO employers (email, password, company_name, business_number, industry, contact_person, phone, address, region, website, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'hr@samsung.com', 'hashed_password_1', '삼성전자', '123-45-67890', 'IT/소프트웨어', '김인사', '02-1234-5678', '서울시 강남구 테헤란로 123', '서울', 'https://samsung.com', 'approved',
      'recruit@lg.com', 'hashed_password_2', 'LG전자', '234-56-78901', '제조업', '박채용', '02-2345-6789', '서울시 영등포구 여의도동 456', '서울', 'https://lg.com', 'approved',
      'jobs@hyundai.com', 'hashed_password_3', '현대자동차', '345-67-89012', '자동차', '이모집', '031-123-4567', '경기도 화성시 현대로 789', '경기', 'https://hyundai.com', 'approved',
      'careers@cj.co.kr', 'hashed_password_4', 'CJ제일제당', '456-78-90123', '식품', '최담당', '02-3456-7890', '서울시 중구 동호로 101', '서울', 'https://cj.co.kr', 'approved',
      'hr@posco.com', 'hashed_password_5', 'POSCO', '567-89-01234', '철강', '정관리', '054-220-0114', '경북 포항시 남구 괌동로 100', '경북', 'https://posco.com', 'approved'
    ).run()

    // 샘플 구인공고 추가
    await c.env.DB.prepare(`
      INSERT INTO job_postings (employer_id, title, job_category, required_visa, salary_min, salary_max, work_location, region, work_hours, benefits, requirements, description, korean_level_required, experience_required, deadline, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      1, '소프트웨어 개발자 (외국인 전형)', 'IT/소프트웨어', 'E-7', 3000, 5000, '서울시 강남구', '서울', '주 40시간 (09:00-18:00)', '4대보험, 연차, 성과급, 교육비 지원', '컴퓨터공학 전공, 프로그래밍 경험 2년 이상', '모바일 앱 및 웹 서비스 개발 업무를 담당하게 됩니다.', 'intermediate', '2년 이상', '2025-10-15', 'active',
      2, '전자제품 품질관리 담당자', '제조/생산', 'E-7', 2800, 4200, '서울시 영등포구', '서울', '주 40시간 (08:30-17:30)', '4대보험, 연차, 식대지원, 기숙사 제공', '전자공학 관련 전공, 품질관리 경험', 'TV, 냉장고 등 가전제품의 품질 검사 및 개선 업무', 'basic', '1년 이상', '2025-09-30', 'active',
      3, '자동차 설계 엔지니어', '기계/자동차', 'E-7', 3500, 6000, '경기도 화성시', '경기', '주 40시간 (09:00-18:00)', '4대보험, 연차, 성과급, 주택자금 대출', '기계공학 전공, CAD 프로그램 활용 가능', '친환경 자동차 부품 설계 및 개발 업무를 담당합니다.', 'intermediate', '3년 이상', '2025-11-01', 'active',
      4, '식품 연구개발 연구원', '연구개발', 'E-7', 2500, 4000, '서울시 중구', '서울', '주 40시간 (09:00-18:00)', '4대보험, 연차, 중식제공, 연구개발비 지원', '식품공학 또는 화학 전공, 연구경험', '신제품 개발 및 기존 제품 개선 연구 업무', 'intermediate', '2년 이상', '2025-10-20', 'active',
      5, '철강 생산관리 담당자', '제조/생산', 'E-7', 3200, 4800, '경북 포항시', '경북', '3교대 근무', '4대보험, 연차, 야간수당, 기숙사 제공', '금속공학 또는 산업공학 전공', '철강 제품 생산 공정 관리 및 품질 개선 업무', 'basic', '1년 이상', '2025-09-25', 'active'
    ).run()

    // 샘플 에이전트 추가
    await c.env.DB.prepare(`
      INSERT INTO agents (email, password, company_name, country, contact_person, phone, address, license_number, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'agent1@vietnam-agency.com', 'hashed_password_a1', '베트남 인재 에이전시', 'Vietnam', 'Nguyen Van A', '+84-123-456-789', 'Ho Chi Minh City, Vietnam', 'VN-001-2024', 'approved',
      'contact@thailand-jobs.com', 'hashed_password_a2', '태국 취업 센터', 'Thailand', 'Somchai Jaidee', '+66-2-123-4567', 'Bangkok, Thailand', 'TH-002-2024', 'approved',
      'info@philippines-work.com', 'hashed_password_a3', '필리핀 워크 에이전시', 'Philippines', 'Maria Santos', '+63-2-890-1234', 'Manila, Philippines', 'PH-003-2024', 'approved',
      'jobs@indonesia-career.com', 'hashed_password_a4', '인도네시아 커리어 센터', 'Indonesia', 'Budi Santoso', '+62-21-567-8901', 'Jakarta, Indonesia', 'ID-004-2024', 'approved',
      'help@cambodia-employment.com', 'hashed_password_a5', '캄보디아 고용 서비스', 'Cambodia', 'Sophea Chea', '+855-23-234-567', 'Phnom Penh, Cambodia', 'KH-005-2024', 'approved'
    ).run()

    // 샘플 구직자 추가
    await c.env.DB.prepare(`
      INSERT INTO job_seekers (email, password, name, birth_date, gender, nationality, current_visa, desired_visa, phone, current_address, korean_level, education_level, work_experience, agent_id, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'nguyen.minh@gmail.com', 'hashed_password_s1', 'Nguyen Minh', '1995-03-15', 'male', 'Vietnamese', 'C-3', 'E-7', '+84-987-654-321', 'Ho Chi Minh City, Vietnam', 'intermediate', '대학교 졸업 (컴퓨터공학)', 'Software Developer - 3년', 1, 'active',
      'somchai.work@gmail.com', 'hashed_password_s2', 'Somchai Thana', '1992-08-22', 'male', 'Thai', 'H-2', 'E-7', '+66-98-765-4321', 'Bangkok, Thailand', 'beginner', '대학교 졸업 (전자공학)', 'Electronics Technician - 4년', 2, 'active',
      'maria.santos@yahoo.com', 'hashed_password_s3', 'Maria Santos', '1994-12-10', 'female', 'Filipino', 'C-3', 'E-7', '+63-917-123-4567', 'Manila, Philippines', 'advanced', '대학교 졸업 (간호학)', 'Registered Nurse - 5년', 3, 'active',
      'budi.work@gmail.com', 'hashed_password_s4', 'Budi Hartono', '1990-06-05', 'male', 'Indonesian', 'H-2', 'E-7', '+62-812-345-6789', 'Jakarta, Indonesia', 'intermediate', '대학교 졸업 (기계공학)', 'Mechanical Engineer - 6년', 4, 'active',
      'sophea.job@gmail.com', 'hashed_password_s5', 'Sophea Kim', '1996-11-18', 'female', 'Cambodian', 'C-3', 'D-2', '+855-12-345-678', 'Phnom Penh, Cambodia', 'beginner', '고등학교 졸업', 'Factory Worker - 2년', 5, 'active',
      'john.vietnam@gmail.com', 'hashed_password_s6', 'John Tran', '1993-04-25', 'male', 'Vietnamese', 'D-2', 'E-7', '+84-901-234-567', 'Hanoi, Vietnam', 'advanced', '대학원 졸업 (MBA)', 'Business Analyst - 4년', 1, 'active',
      'lisa.thailand@gmail.com', 'hashed_password_s7', 'Lisa Priya', '1991-09-14', 'female', 'Thai', 'C-3', 'F-2', '+66-87-654-3210', 'Chiang Mai, Thailand', 'intermediate', '대학교 졸업 (호텔경영)', 'Hotel Manager - 5년', 2, 'active',
      'carlo.philippines@gmail.com', 'hashed_password_s8', 'Carlo Reyes', '1988-01-30', 'male', 'Filipino', 'E-7', 'F-5', '+63-928-765-4321', 'Cebu, Philippines', 'advanced', '대학교 졸업 (건축학)', 'Architect - 8년', 3, 'active'
    ).run()

    // 최종 통계 확인
    const finalStats = {
      employers: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM employers`).first())?.count || 0,
      jobPostings: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM job_postings`).first())?.count || 0,
      agents: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM agents`).first())?.count || 0,
      jobSeekers: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM job_seekers`).first())?.count || 0
    }

    return c.json({
      success: true,
      message: 'Database seeded successfully',
      counts: finalStats
    })

  } catch (error) {
    console.error('Database seeding error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to seed database',
      details: error.message 
    }, 500)
  }
})

// 데이터베이스 시드 데이터 생성 API (관리용) - POST version
app.post('/api/admin/seed-database', async (c) => {
  try {
    // 보안을 위해 특별한 키 확인
    const { adminKey } = await c.req.json()
    if (adminKey !== 'w-campus-seed-2025') {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // 기존 데이터 확인
    const existingEmployers = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM employers`).first()
    if (existingEmployers?.count > 0) {
      return c.json({ 
        success: true, 
        message: 'Database already seeded', 
        counts: { employers: existingEmployers.count }
      })
    }

    // 샘플 구인 기업 추가
    await c.env.DB.prepare(`
      INSERT INTO employers (email, password, company_name, business_number, industry, contact_person, phone, address, region, website, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'hr@samsung.com', 'hashed_password_1', '삼성전자', '123-45-67890', 'IT/소프트웨어', '김인사', '02-1234-5678', '서울시 강남구 테헤란로 123', '서울', 'https://samsung.com', 'approved',
      'recruit@lg.com', 'hashed_password_2', 'LG전자', '234-56-78901', '제조업', '박채용', '02-2345-6789', '서울시 영등포구 여의도동 456', '서울', 'https://lg.com', 'approved',
      'jobs@hyundai.com', 'hashed_password_3', '현대자동차', '345-67-89012', '자동차', '이모집', '031-123-4567', '경기도 화성시 현대로 789', '경기', 'https://hyundai.com', 'approved',
      'careers@cj.co.kr', 'hashed_password_4', 'CJ제일제당', '456-78-90123', '식품', '최담당', '02-3456-7890', '서울시 중구 동호로 101', '서울', 'https://cj.co.kr', 'approved',
      'hr@posco.com', 'hashed_password_5', 'POSCO', '567-89-01234', '철강', '정관리', '054-220-0114', '경북 포항시 남구 괌동로 100', '경북', 'https://posco.com', 'approved'
    ).run()

    // 샘플 구인공고 추가
    await c.env.DB.prepare(`
      INSERT INTO job_postings (employer_id, title, job_category, required_visa, salary_min, salary_max, work_location, region, work_hours, benefits, requirements, description, korean_level_required, experience_required, deadline, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      1, '소프트웨어 개발자 (외국인 전형)', 'IT/소프트웨어', 'E-7', 3000, 5000, '서울시 강남구', '서울', '주 40시간 (09:00-18:00)', '4대보험, 연차, 성과급, 교육비 지원', '컴퓨터공학 전공, 프로그래밍 경험 2년 이상', '모바일 앱 및 웹 서비스 개발 업무를 담당하게 됩니다.', 'intermediate', '2년 이상', '2025-10-15', 'active',
      2, '전자제품 품질관리 담당자', '제조/생산', 'E-7', 2800, 4200, '서울시 영등포구', '서울', '주 40시간 (08:30-17:30)', '4대보험, 연차, 식대지원, 기숙사 제공', '전자공학 관련 전공, 품질관리 경험', 'TV, 냉장고 등 가전제품의 품질 검사 및 개선 업무', 'basic', '1년 이상', '2025-09-30', 'active',
      3, '자동차 설계 엔지니어', '기계/자동차', 'E-7', 3500, 6000, '경기도 화성시', '경기', '주 40시간 (09:00-18:00)', '4대보험, 연차, 성과급, 주택자금 대출', '기계공학 전공, CAD 프로그램 활용 가능', '친환경 자동차 부품 설계 및 개발 업무를 담당합니다.', 'intermediate', '3년 이상', '2025-11-01', 'active',
      4, '식품 연구개발 연구원', '연구개발', 'E-7', 2500, 4000, '서울시 중구', '서울', '주 40시간 (09:00-18:00)', '4대보험, 연차, 중식제공, 연구개발비 지원', '식품공학 또는 화학 전공, 연구경험', '신제품 개발 및 기존 제품 개선 연구 업무', 'intermediate', '2년 이상', '2025-10-20', 'active',
      5, '철강 생산관리 담당자', '제조/생산', 'E-7', 3200, 4800, '경북 포항시', '경북', '3교대 근무', '4대보험, 연차, 야간수당, 기숙사 제공', '금속공학 또는 산업공학 전공', '철강 제품 생산 공정 관리 및 품질 개선 업무', 'basic', '1년 이상', '2025-09-25', 'active'
    ).run()

    // 샘플 에이전트 추가
    await c.env.DB.prepare(`
      INSERT INTO agents (email, password, company_name, country, contact_person, phone, address, license_number, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'agent1@vietnam-agency.com', 'hashed_password_a1', '베트남 인재 에이전시', 'Vietnam', 'Nguyen Van A', '+84-123-456-789', 'Ho Chi Minh City, Vietnam', 'VN-001-2024', 'approved',
      'contact@thailand-jobs.com', 'hashed_password_a2', '태국 취업 센터', 'Thailand', 'Somchai Jaidee', '+66-2-123-4567', 'Bangkok, Thailand', 'TH-002-2024', 'approved',
      'info@philippines-work.com', 'hashed_password_a3', '필리핀 워크 에이전시', 'Philippines', 'Maria Santos', '+63-2-890-1234', 'Manila, Philippines', 'PH-003-2024', 'approved',
      'jobs@indonesia-career.com', 'hashed_password_a4', '인도네시아 커리어 센터', 'Indonesia', 'Budi Santoso', '+62-21-567-8901', 'Jakarta, Indonesia', 'ID-004-2024', 'approved',
      'help@cambodia-employment.com', 'hashed_password_a5', '캄보디아 고용 서비스', 'Cambodia', 'Sophea Chea', '+855-23-234-567', 'Phnom Penh, Cambodia', 'KH-005-2024', 'approved'
    ).run()

    // 샘플 구직자 추가
    await c.env.DB.prepare(`
      INSERT INTO job_seekers (email, password, name, birth_date, gender, nationality, current_visa, desired_visa, phone, current_address, korean_level, education_level, work_experience, agent_id, status) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'nguyen.minh@gmail.com', 'hashed_password_s1', 'Nguyen Minh', '1995-03-15', 'male', 'Vietnamese', 'C-3', 'E-7', '+84-987-654-321', 'Ho Chi Minh City, Vietnam', 'intermediate', '대학교 졸업 (컴퓨터공학)', 'Software Developer - 3년', 1, 'active',
      'somchai.work@gmail.com', 'hashed_password_s2', 'Somchai Thana', '1992-08-22', 'male', 'Thai', 'H-2', 'E-7', '+66-98-765-4321', 'Bangkok, Thailand', 'beginner', '대학교 졸업 (전자공학)', 'Electronics Technician - 4년', 2, 'active',
      'maria.santos@yahoo.com', 'hashed_password_s3', 'Maria Santos', '1994-12-10', 'female', 'Filipino', 'C-3', 'E-7', '+63-917-123-4567', 'Manila, Philippines', 'advanced', '대학교 졸업 (간호학)', 'Registered Nurse - 5년', 3, 'active',
      'budi.work@gmail.com', 'hashed_password_s4', 'Budi Hartono', '1990-06-05', 'male', 'Indonesian', 'H-2', 'E-7', '+62-812-345-6789', 'Jakarta, Indonesia', 'intermediate', '대학교 졸업 (기계공학)', 'Mechanical Engineer - 6년', 4, 'active',
      'sophea.job@gmail.com', 'hashed_password_s5', 'Sophea Kim', '1996-11-18', 'female', 'Cambodian', 'C-3', 'D-2', '+855-12-345-678', 'Phnom Penh, Cambodia', 'beginner', '고등학교 졸업', 'Factory Worker - 2년', 5, 'active',
      'john.vietnam@gmail.com', 'hashed_password_s6', 'John Tran', '1993-04-25', 'male', 'Vietnamese', 'D-2', 'E-7', '+84-901-234-567', 'Hanoi, Vietnam', 'advanced', '대학원 졸업 (MBA)', 'Business Analyst - 4년', 1, 'active',
      'lisa.thailand@gmail.com', 'hashed_password_s7', 'Lisa Priya', '1991-09-14', 'female', 'Thai', 'C-3', 'F-2', '+66-87-654-3210', 'Chiang Mai, Thailand', 'intermediate', '대학교 졸업 (호텔경영)', 'Hotel Manager - 5년', 2, 'active',
      'carlo.philippines@gmail.com', 'hashed_password_s8', 'Carlo Reyes', '1988-01-30', 'male', 'Filipino', 'E-7', 'F-5', '+63-928-765-4321', 'Cebu, Philippines', 'advanced', '대학교 졸업 (건축학)', 'Architect - 8년', 3, 'active'
    ).run()

    // 최종 통계 확인
    const finalStats = {
      employers: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM employers`).first())?.count || 0,
      jobPostings: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM job_postings`).first())?.count || 0,
      agents: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM agents`).first())?.count || 0,
      jobSeekers: (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM job_seekers`).first())?.count || 0
    }

    return c.json({
      success: true,
      message: 'Database seeded successfully',
      counts: finalStats
    })

  } catch (error) {
    console.error('Database seeding error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to seed database',
      details: error.message 
    }, 500)
  }
})


// 관리자 대시보드 - 로딩 화면과 함께 안전한 인증 처리
app.get('/static/admin-dashboard.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 관리자 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
        }
        .card-shadow:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
        }
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">관리자 대시보드 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-blue-600">
            <div class="container mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-user-shield text-white text-xl"></i>
                        </div>
                        <div class="flex flex-col">
                            <h1 class="text-2xl font-bold text-blue-600">WOW-CAMPUS</h1>
                            <span class="text-xs text-gray-500">관리자 대시보드</span>
                        </div>
                    </a>
                    <div class="flex items-center space-x-4">
                        <span id="admin-name" class="text-sm text-gray-600">관리자님 환영합니다</span>
                        <button id="logout-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </header>
        <div class="container mx-auto px-6 py-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl card-shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">총 사용자</p>
                            <p id="total-users" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl card-shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">구인기업</p>
                            <p id="total-employers" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-building text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl card-shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">구직자</p>
                            <p id="total-jobseekers" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-user-tie text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl card-shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">에이전트</p>
                            <p id="total-agents" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-handshake text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-xl card-shadow p-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4">관리자 기능</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button class="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
                        <i class="fas fa-users text-blue-600 text-xl mb-2"></i>
                        <h3 class="font-semibold text-gray-800">사용자 관리</h3>
                        <p class="text-sm text-gray-600">전체 사용자 계정 관리</p>
                    </button>
                    <button class="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
                        <i class="fas fa-briefcase text-green-600 text-xl mb-2"></i>
                        <h3 class="font-semibold text-gray-800">구인공고 관리</h3>
                        <p class="text-sm text-gray-600">구인공고 승인 및 관리</p>
                    </button>
                    <button class="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
                        <i class="fas fa-chart-bar text-purple-600 text-xl mb-2"></i>
                        <h3 class="font-semibold text-gray-800">통계 분석</h3>
                        <p class="text-sm text-gray-600">시스템 사용 통계 확인</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        console.log('🔵 관리자 대시보드 페이지 시작');
        let authCheckComplete = false;
        
        // 로딩 상태 업데이트
        function updateLoadingStatus(message) {
            const statusEl = document.getElementById('loading-status');
            if (statusEl) {
                statusEl.textContent = message;
                console.log('📱 로딩 상태:', message);
            }
        }
        
        // 대시보드 표시
        function showDashboard() {
            updateLoadingStatus('대시보드 준비 완료');
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-content').classList.remove('hidden');
                console.log('✅ 관리자 대시보드 표시 완료');
            }, 500);
        }
        
        // 로그인 페이지로 리다이렉트 (천천히)
        function redirectToLogin(reason) {
            console.log('❌ 로그인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('로그인이 필요합니다. 잠시 후 이동...');
            setTimeout(() => {
                window.location.href = '/static/login.html';
            }, 2000);
        }
        
        // 메인 페이지로 리다이렉트 (권한 없음)
        function redirectToHome(reason) {
            console.log('🏠 메인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('권한이 없습니다. 잠시 후 이동...');
            setTimeout(() => {
                alert('관리자 권한이 필요합니다.');
                window.location.href = '/';
            }, 2000);
        }
        
        // URL에서 토큰 추출 및 저장
        function handleURLToken() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                console.log('🔗 URL에서 토큰 발견, localStorage에 저장');
                localStorage.setItem('token', urlToken);
                // URL에서 토큰 파라미터 제거 (보안상)
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
        // 종합적인 인증 검사
        async function performAuthCheck() {
            updateLoadingStatus('토큰 확인 중...');
            
            // 1단계: URL 토큰 처리
            handleURLToken();
            
            // 2단계: localStorage에서 토큰 확인
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin('토큰이 없음');
                return;
            }
            
            console.log('🔑 토큰 확인됨');
            updateLoadingStatus('사용자 정보 확인 중...');
            
            // 3단계: 서버에서 토큰 검증 및 사용자 정보 확인
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log('🚫 서버 토큰 검증 실패:', response.status);
                    redirectToLogin('토큰 검증 실패');
                    return;
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    console.log('🚫 사용자 정보 없음:', data);
                    redirectToLogin('사용자 정보 확인 실패');
                    return;
                }
                
                const user = data.user;
                console.log('👤 사용자 정보 확인됨:', user);
                
                // 4단계: 관리자 권한 확인
                const isAdmin = user.user_type === 'admin' || user.userType === 'admin' || user.type === 'admin';
                if (!isAdmin) {
                    console.log('🚫 관리자 권한 없음:', user);
                    redirectToHome('관리자 권한 필요');
                    return;
                }
                
                // 5단계: localStorage에 사용자 정보 저장
                console.log('✅ 관리자 권한 확인됨');
                updateLoadingStatus('대시보드 로딩 중...');
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 6단계: UI 업데이트 및 대시보드 표시
                const adminNameEl = document.getElementById('admin-name');
                if (adminNameEl) {
                    adminNameEl.textContent = user.name ? user.name + '님 환영합니다' : '관리자님 환영합니다';
                }
                
                // 7단계: 통계 데이터 로드 후 대시보드 표시
                await loadStats();
                authCheckComplete = true;
                showDashboard();
                
            } catch (error) {
                console.error('🚨 인증 검사 중 오류:', error);
                updateLoadingStatus('네트워크 오류 발생...');
                redirectToLogin('네트워크 오류');
            }
        }
        
        // 통계 데이터 로드
        async function loadStats() {
            try {
                updateLoadingStatus('통계 데이터 로딩 중...');
                const response = await fetch('/api/admin/stats', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        document.getElementById('total-users').textContent = data.stats.totalUsers || '0';
                        document.getElementById('total-employers').textContent = data.stats.totalEmployers || '0';
                        document.getElementById('total-jobseekers').textContent = data.stats.totalJobseekers || '0';
                        document.getElementById('total-agents').textContent = data.stats.totalAgents || '0';
                        console.log('📊 통계 데이터 로드 완료');
                    }
                }
            } catch (error) {
                console.error('📊 통계 로드 오류:', error);
                // 오류가 있어도 계속 진행
            }
        }
        
        // 로그아웃
        function setupLogoutHandler() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/';
                    }
                });
            }
        }
        
        // 페이지 로드 시 실행
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 관리자 대시보드 DOM 로드 완료');
            setupLogoutHandler();
            
            // 충분한 지연 후 인증 검사 시작
            setTimeout(function() {
                console.log('🚀 인증 검사 시작 (2초 지연)');
                performAuthCheck();
            }, 2000);
        });
        
        // 페이지를 떠나기 전에 인증이 완료되지 않았다면 경고
        window.addEventListener('beforeunload', function(e) {
            if (!authCheckComplete) {
                console.log('⚠️ 인증이 완료되지 않은 상태에서 페이지를 떠남');
            }
        });
    </script>
</body>
</html>`)
})

// 에이전트 대시보드
app.get('/static/agent-dashboard.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 에이전트 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #9333ea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">에이전트 대시보드 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-purple-600">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
                        <i class="fas fa-handshake text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-purple-600">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">에이전트 대시보드</span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <span id="agent-name" class="text-sm text-gray-600">에이전트님 환영합니다</span>
                    <button id="logout-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>
    <div class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow p-6 text-center">
            <h2 class="text-2xl font-bold mb-4">에이전트 대시보드</h2>
            <p class="text-gray-600 mb-4">에이전트 관리 시스템에 오신 것을 환영합니다.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div class="p-6 bg-purple-50 rounded-lg">
                    <i class="fas fa-users text-purple-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">구직자 관리</h3>
                    <p class="text-gray-600 text-sm">등록된 구직자 현황 및 관리</p>
                </div>
                <div class="p-6 bg-blue-50 rounded-lg">
                    <i class="fas fa-briefcase text-blue-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">매칭 현황</h3>
                    <p class="text-gray-600 text-sm">구인-구직 매칭 진행상황</p>
                </div>
            </div>
        </div>
        </div>
    </div>
    
    <script>
        console.log('🔵 에이전트 대시보드 페이지 시작');
        let authCheckComplete = false;
        
        // 로딩 상태 업데이트
        function updateLoadingStatus(message) {
            const statusEl = document.getElementById('loading-status');
            if (statusEl) {
                statusEl.textContent = message;
                console.log('📱 로딩 상태:', message);
            }
        }
        
        // 대시보드 표시
        function showDashboard() {
            updateLoadingStatus('대시보드 준비 완료');
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-content').classList.remove('hidden');
                console.log('✅ 에이전트 대시보드 표시 완료');
            }, 500);
        }
        
        // 로그인 페이지로 리다이렉트
        function redirectToLogin(reason) {
            console.log('❌ 로그인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('로그인이 필요합니다. 잠시 후 이동...');
            setTimeout(() => {
                window.location.href = '/static/login.html';
            }, 2000);
        }
        
        // 메인 페이지로 리다이렉트 (권한 없음)
        function redirectToHome(reason) {
            console.log('🏠 메인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('권한이 없습니다. 잠시 후 이동...');
            setTimeout(() => {
                alert('에이전트 권한이 필요합니다.');
                window.location.href = '/';
            }, 2000);
        }
        
        // URL에서 토큰 추출 및 저장
        function handleURLToken() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                console.log('🔗 URL에서 토큰 발견, localStorage에 저장');
                localStorage.setItem('token', urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
        // 종합적인 인증 검사
        async function performAuthCheck() {
            updateLoadingStatus('토큰 확인 중...');
            
            // 1단계: URL 토큰 처리
            handleURLToken();
            
            // 2단계: localStorage에서 토큰 확인
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin('토큰이 없음');
                return;
            }
            
            console.log('🔑 토큰 확인됨');
            updateLoadingStatus('사용자 정보 확인 중...');
            
            // 3단계: 서버에서 토큰 검증 및 사용자 정보 확인
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log('🚫 서버 토큰 검증 실패:', response.status);
                    redirectToLogin('토큰 검증 실패');
                    return;
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    console.log('🚫 사용자 정보 없음:', data);
                    redirectToLogin('사용자 정보 확인 실패');
                    return;
                }
                
                const user = data.user;
                console.log('👤 사용자 정보 확인됨:', user);
                
                // 4단계: 에이전트 권한 확인
                const isAgent = user.user_type === 'agent' || user.userType === 'agent' || user.type === 'agent';
                if (!isAgent) {
                    console.log('🚫 에이전트 권한 없음:', user);
                    redirectToHome('에이전트 권한 필요');
                    return;
                }
                
                // 5단계: localStorage에 사용자 정보 저장
                console.log('✅ 에이전트 권한 확인됨');
                updateLoadingStatus('대시보드 로딩 중...');
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 6단계: UI 업데이트 및 대시보드 표시
                const agentNameEl = document.getElementById('agent-name');
                if (agentNameEl) {
                    agentNameEl.textContent = user.name ? user.name + '님 환영합니다' : '에이전트님 환영합니다';
                }
                
                authCheckComplete = true;
                showDashboard();
                
            } catch (error) {
                console.error('🚨 인증 검사 중 오류:', error);
                updateLoadingStatus('네트워크 오류 발생...');
                redirectToLogin('네트워크 오류');
            }
        }
        
        // 로그아웃
        function setupLogoutHandler() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/';
                    }
                });
            }
        }
        
        // 페이지 로드 시 실행
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 에이전트 대시보드 DOM 로드 완료');
            setupLogoutHandler();
            
            // 충분한 지연 후 인증 검사 시작
            setTimeout(function() {
                console.log('🚀 인증 검사 시작 (2초 지연)');
                performAuthCheck();
            }, 2000);
        });
        
        // 페이지를 떠나기 전에 인증이 완료되지 않았다면 경고
        window.addEventListener('beforeunload', function(e) {
            if (!authCheckComplete) {
                console.log('⚠️ 인증이 완료되지 않은 상태에서 페이지를 떠남');
            }
        });
    </script>
</body>
</html>`)
})

// 기업 대시보드
app.get('/static/employer-dashboard.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 기업 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #059669;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">기업 대시보드 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-green-600">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-500 rounded-lg flex items-center justify-center">
                        <i class="fas fa-building text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-green-600">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">기업 대시보드</span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <span id="employer-name" class="text-sm text-gray-600">기업 담당자님 환영합니다</span>
                    <button id="logout-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>
    <div class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow p-6 text-center">
            <h2 class="text-2xl font-bold mb-4">기업 대시보드</h2>
            <p class="text-gray-600 mb-4">구인 관리 시스템에 오신 것을 환영합니다.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div class="p-6 bg-green-50 rounded-lg">
                    <i class="fas fa-plus-circle text-green-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">구인공고 등록</h3>
                    <p class="text-gray-600 text-sm">새로운 구인공고를 등록하세요</p>
                </div>
                <div class="p-6 bg-blue-50 rounded-lg">
                    <i class="fas fa-list text-blue-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">등록된 공고</h3>
                    <p class="text-gray-600 text-sm">현재 등록된 구인공고 관리</p>
                </div>
            </div>
            </div>
        </div>
    </div>
    
    <script>
        console.log('🔵 기업 대시보드 페이지 시작');
        let authCheckComplete = false;
        
        // 로딩 상태 업데이트
        function updateLoadingStatus(message) {
            const statusEl = document.getElementById('loading-status');
            if (statusEl) {
                statusEl.textContent = message;
                console.log('📱 로딩 상태:', message);
            }
        }
        
        // 대시보드 표시
        function showDashboard() {
            updateLoadingStatus('대시보드 준비 완료');
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-content').classList.remove('hidden');
                console.log('✅ 기업 대시보드 표시 완료');
            }, 500);
        }
        
        // 로그인 페이지로 리다이렉트
        function redirectToLogin(reason) {
            console.log('❌ 로그인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('로그인이 필요합니다. 잠시 후 이동...');
            setTimeout(() => {
                window.location.href = '/static/login.html';
            }, 2000);
        }
        
        // 메인 페이지로 리다이렉트 (권한 없음)
        function redirectToHome(reason) {
            console.log('🏠 메인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('권한이 없습니다. 잠시 후 이동...');
            setTimeout(() => {
                alert('기업 회원 권한이 필요합니다.');
                window.location.href = '/';
            }, 2000);
        }
        
        // URL에서 토큰 추출 및 저장
        function handleURLToken() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                console.log('🔗 URL에서 토큰 발견, localStorage에 저장');
                localStorage.setItem('token', urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
        // 종합적인 인증 검사
        async function performAuthCheck() {
            updateLoadingStatus('토큰 확인 중...');
            
            // 1단계: URL 토큰 처리
            handleURLToken();
            
            // 2단계: localStorage에서 토큰 확인
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin('토큰이 없음');
                return;
            }
            
            console.log('🔑 토큰 확인됨');
            updateLoadingStatus('사용자 정보 확인 중...');
            
            // 3단계: 서버에서 토큰 검증 및 사용자 정보 확인
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log('🚫 서버 토큰 검증 실패:', response.status);
                    redirectToLogin('토큰 검증 실패');
                    return;
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    console.log('🚫 사용자 정보 없음:', data);
                    redirectToLogin('사용자 정보 확인 실패');
                    return;
                }
                
                const user = data.user;
                console.log('👤 사용자 정보 확인됨:', user);
                
                // 4단계: 기업 권한 확인
                const isEmployer = user.user_type === 'employer' || user.userType === 'employer' || user.type === 'employer';
                if (!isEmployer) {
                    console.log('🚫 기업 권한 없음:', user);
                    redirectToHome('기업 권한 필요');
                    return;
                }
                
                // 5단계: localStorage에 사용자 정보 저장
                console.log('✅ 기업 권한 확인됨');
                updateLoadingStatus('대시보드 로딩 중...');
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 6단계: UI 업데이트 및 대시보드 표시
                const employerNameEl = document.getElementById('employer-name');
                if (employerNameEl) {
                    employerNameEl.textContent = user.name ? user.name + '님 환영합니다' : '기업 담당자님 환영합니다';
                }
                
                authCheckComplete = true;
                showDashboard();
                
            } catch (error) {
                console.error('🚨 인증 검사 중 오류:', error);
                updateLoadingStatus('네트워크 오류 발생...');
                redirectToLogin('네트워크 오류');
            }
        }
        
        // 로그아웃
        function setupLogoutHandler() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/';
                    }
                });
            }
        }
        
        // 페이지 로드 시 실행
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 기업 대시보드 DOM 로드 완료');
            setupLogoutHandler();
            
            // 충분한 지연 후 인증 검사 시작
            setTimeout(function() {
                console.log('🚀 인증 검사 시작 (2초 지연)');
                performAuthCheck();
            }, 2000);
        });
        
        // 페이지를 떠나기 전에 인증이 완료되지 않았다면 경고
        window.addEventListener('beforeunload', function(e) {
            if (!authCheckComplete) {
                console.log('⚠️ 인증이 완료되지 않은 상태에서 페이지를 떠남');
            }
        });
    </script>
</body>
</html>`)
})

// 강사 대시보드
app.get('/static/instructor-dashboard.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 강사 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #0891b2;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">강사 대시보드 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-cyan-600">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-500 rounded-lg flex items-center justify-center">
                        <i class="fas fa-chalkboard-teacher text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-cyan-600">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">강사 대시보드</span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <span id="instructor-name" class="text-sm text-gray-600">강사님 환영합니다</span>
                    <button id="logout-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>
    <div class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow p-6 text-center">
            <h2 class="text-2xl font-bold mb-4">강사 대시보드</h2>
            <p class="text-gray-600 mb-4">교육 관리 시스템에 오신 것을 환영합니다.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div class="p-6 bg-cyan-50 rounded-lg">
                    <i class="fas fa-book text-cyan-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">강의 관리</h3>
                    <p class="text-gray-600 text-sm">개설된 강의 및 수강생 관리</p>
                </div>
                <div class="p-6 bg-blue-50 rounded-lg">
                    <i class="fas fa-user-graduate text-blue-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">학생 현황</h3>
                    <p class="text-gray-600 text-sm">수강 중인 학생 현황 확인</p>
                </div>
            </div>
            </div>
        </div>
    </div>
    
    <script>
        console.log('🔵 강사 대시보드 페이지 시작');
        let authCheckComplete = false;
        
        // 로딩 상태 업데이트
        function updateLoadingStatus(message) {
            const statusEl = document.getElementById('loading-status');
            if (statusEl) {
                statusEl.textContent = message;
                console.log('📱 로딩 상태:', message);
            }
        }
        
        // 대시보드 표시
        function showDashboard() {
            updateLoadingStatus('대시보드 준비 완료');
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-content').classList.remove('hidden');
                console.log('✅ 강사 대시보드 표시 완료');
            }, 500);
        }
        
        // 로그인 페이지로 리다이렉트
        function redirectToLogin(reason) {
            console.log('❌ 로그인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('로그인이 필요합니다. 잠시 후 이동...');
            setTimeout(() => {
                window.location.href = '/static/login.html';
            }, 2000);
        }
        
        // 메인 페이지로 리다이렉트 (권한 없음)
        function redirectToHome(reason) {
            console.log('🏠 메인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('권한이 없습니다. 잠시 후 이동...');
            setTimeout(() => {
                alert('강사 권한이 필요합니다.');
                window.location.href = '/';
            }, 2000);
        }
        
        // URL에서 토큰 추출 및 저장
        function handleURLToken() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                console.log('🔗 URL에서 토큰 발견, localStorage에 저장');
                localStorage.setItem('token', urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
        // 종합적인 인증 검사
        async function performAuthCheck() {
            updateLoadingStatus('토큰 확인 중...');
            
            // 1단계: URL 토큰 처리
            handleURLToken();
            
            // 2단계: localStorage에서 토큰 확인
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin('토큰이 없음');
                return;
            }
            
            console.log('🔑 토큰 확인됨');
            updateLoadingStatus('사용자 정보 확인 중...');
            
            // 3단계: 서버에서 토큰 검증 및 사용자 정보 확인
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log('🚫 서버 토큰 검증 실패:', response.status);
                    redirectToLogin('토큰 검증 실패');
                    return;
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    console.log('🚫 사용자 정보 없음:', data);
                    redirectToLogin('사용자 정보 확인 실패');
                    return;
                }
                
                const user = data.user;
                console.log('👤 사용자 정보 확인됨:', user);
                
                // 4단계: 강사 권한 확인
                const isInstructor = user.user_type === 'instructor' || user.userType === 'instructor' || user.type === 'instructor';
                if (!isInstructor) {
                    console.log('🚫 강사 권한 없음:', user);
                    redirectToHome('강사 권한 필요');
                    return;
                }
                
                // 5단계: localStorage에 사용자 정보 저장
                console.log('✅ 강사 권한 확인됨');
                updateLoadingStatus('대시보드 로딩 중...');
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 6단계: UI 업데이트 및 대시보드 표시
                const instructorNameEl = document.getElementById('instructor-name');
                if (instructorNameEl) {
                    instructorNameEl.textContent = user.name ? user.name + '님 환영합니다' : '강사님 환영합니다';
                }
                
                authCheckComplete = true;
                showDashboard();
                
            } catch (error) {
                console.error('🚨 인증 검사 중 오류:', error);
                updateLoadingStatus('네트워크 오류 발생...');
                redirectToLogin('네트워크 오류');
            }
        }
        
        // 로그아웃
        function setupLogoutHandler() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/';
                    }
                });
            }
        }
        
        // 페이지 로드 시 실행
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 강사 대시보드 DOM 로드 완료');
            setupLogoutHandler();
            
            // 충분한 지연 후 인증 검사 시작
            setTimeout(function() {
                console.log('🚀 인증 검사 시작 (2초 지연)');
                performAuthCheck();
            }, 2000);
        });
        
        // 페이지를 떠나기 전에 인증이 완료되지 않았다면 경고
        window.addEventListener('beforeunload', function(e) {
            if (!authCheckComplete) {
                console.log('⚠️ 인증이 완료되지 않은 상태에서 페이지를 떠남');
            }
        });
    </script>
</body>
</html>`)
})

// 구직자 프로필 페이지
app.get('/static/jobseeker-profile.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 구직자 프로필</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #f97316;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">구직자 프로필 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-orange-600">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-500 rounded-lg flex items-center justify-center">
                        <i class="fas fa-user-graduate text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-orange-600">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">구직자 프로필</span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <span id="jobseeker-name" class="text-sm text-gray-600">구직자님 환영합니다</span>
                    <button id="logout-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>
    <div class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow p-6 text-center">
            <h2 class="text-2xl font-bold mb-4">구직자 프로필</h2>
            <p class="text-gray-600 mb-4">구직 활동 관리 시스템에 오신 것을 환영합니다.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div class="p-6 bg-orange-50 rounded-lg">
                    <i class="fas fa-user-edit text-orange-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">프로필 관리</h3>
                    <p class="text-gray-600 text-sm">개인정보 및 이력서 관리</p>
                </div>
                <div class="p-6 bg-blue-50 rounded-lg">
                    <i class="fas fa-search text-blue-600 text-3xl mb-3"></i>
                    <h3 class="text-lg font-semibold">구인정보 검색</h3>
                    <p class="text-gray-600 text-sm">맞춤 구인정보 찾기</p>
                </div>
            </div>
            </div>
        </div>
    </div>
    
    <script>
        console.log('🔵 구직자 프로필 페이지 시작');
        let authCheckComplete = false;
        
        // 로딩 상태 업데이트
        function updateLoadingStatus(message) {
            const statusEl = document.getElementById('loading-status');
            if (statusEl) {
                statusEl.textContent = message;
                console.log('📱 로딩 상태:', message);
            }
        }
        
        // 대시보드 표시
        function showDashboard() {
            updateLoadingStatus('프로필 준비 완료');
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-content').classList.remove('hidden');
                console.log('✅ 구직자 프로필 표시 완료');
            }, 500);
        }
        
        // 로그인 페이지로 리다이렉트
        function redirectToLogin(reason) {
            console.log('❌ 로그인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('로그인이 필요합니다. 잠시 후 이동...');
            setTimeout(() => {
                window.location.href = '/static/login.html';
            }, 2000);
        }
        
        // 메인 페이지로 리다이렉트 (권한 없음)
        function redirectToHome(reason) {
            console.log('🏠 메인 페이지로 리다이렉트:', reason);
            updateLoadingStatus('권한이 없습니다. 잠시 후 이동...');
            setTimeout(() => {
                alert('구직자 권한이 필요합니다.');
                window.location.href = '/';
            }, 2000);
        }
        
        // URL에서 토큰 추출 및 저장
        function handleURLToken() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                console.log('🔗 URL에서 토큰 발견, localStorage에 저장');
                localStorage.setItem('token', urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
        // 종합적인 인증 검사
        async function performAuthCheck() {
            updateLoadingStatus('토큰 확인 중...');
            
            // 1단계: URL 토큰 처리
            handleURLToken();
            
            // 2단계: localStorage에서 토큰 확인
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin('토큰이 없음');
                return;
            }
            
            console.log('🔑 토큰 확인됨');
            updateLoadingStatus('사용자 정보 확인 중...');
            
            // 3단계: 서버에서 토큰 검증 및 사용자 정보 확인
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log('🚫 서버 토큰 검증 실패:', response.status);
                    redirectToLogin('토큰 검증 실패');
                    return;
                }
                
                const data = await response.json();
                if (!data.success || !data.user) {
                    console.log('🚫 사용자 정보 없음:', data);
                    redirectToLogin('사용자 정보 확인 실패');
                    return;
                }
                
                const user = data.user;
                console.log('👤 사용자 정보 확인됨:', user);
                
                // 4단계: 구직자/학생 권한 확인 (개선된 로직)
                const isJobseeker = user.user_type === 'jobseeker' || user.userType === 'jobseeker' || user.type === 'jobseeker' ||
                                   user.user_type === 'student' || user.userType === 'student' || user.type === 'student';
                
                console.log('🔍 구직자 프로필 권한 체크:', {
                    user_type: user.user_type,
                    userType: user.userType,
                    type: user.type,
                    isJobseeker: isJobseeker,
                    fullUser: user
                });
                
                if (!isJobseeker) {
                    console.error('🚫 구직자 권한 없음:', user);
                    redirectToHome('구직자 권한 필요');
                    return;
                }
                
                // 5단계: localStorage에 사용자 정보 저장
                console.log('✅ 구직자 권한 확인됨');
                updateLoadingStatus('프로필 로딩 중...');
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 6단계: UI 업데이트 및 대시보드 표시
                const jobseekerNameEl = document.getElementById('jobseeker-name');
                if (jobseekerNameEl) {
                    jobseekerNameEl.textContent = user.name ? user.name + '님 환영합니다' : '구직자님 환영합니다';
                }
                
                authCheckComplete = true;
                showDashboard();
                
            } catch (error) {
                console.error('🚨 인증 검사 중 오류:', error);
                updateLoadingStatus('네트워크 오류 발생...');
                redirectToLogin('네트워크 오류');
            }
        }
        
        // 로그아웃
        function setupLogoutHandler() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/';
                    }
                });
            }
        }
        
        // 페이지 로드 시 실행
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 구직자 프로필 DOM 로드 완료');
            setupLogoutHandler();
            
            // 충분한 지연 후 인증 검사 시작
            setTimeout(function() {
                console.log('🚀 인증 검사 시작 (2초 지연)');
                performAuthCheck();
            }, 2000);
        });
        
        // 페이지를 떠나기 전에 인증이 완료되지 않았다면 경고
        window.addEventListener('beforeunload', function(e) {
            if (!authCheckComplete) {
                console.log('⚠️ 인증이 완료되지 않은 상태에서 페이지를 떠남');
            }
        });
    </script>
</body>
</html>`)
})

// 일반 정적 파일 서빙 (JS, CSS 등)
// 구직자 대시보드 라우트 추가 (jobseeker-profile과 동일한 내용)
app.get('/static/jobseeker-dashboard.html', async (c) => {
  // jobseeker-profile.html과 동일한 내용을 반환
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS 구직자 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #f97316;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">구직자 대시보드 로딩 중...</p>
            <p id="loading-status" class="text-sm text-gray-400 mt-2">인증 확인 중</p>
        </div>
    </div>

    <!-- 메인 대시보드 컨텐츠 (처음에는 숨김) -->
    <div id="dashboard-content" class="hidden">
        <header class="bg-white shadow-md border-b-2 border-orange-600">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <a href="/" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-500 rounded-lg flex items-center justify-center">
                        <i class="fas fa-user-graduate text-white text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold text-orange-600">WOW-CAMPUS</h1>
                        <span class="text-xs text-gray-500">구직자 대시보드</span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <span id="jobseeker-name" class="text-sm text-gray-600">구직자님 환영합니다</span>
                    <button onclick="logout()" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>

        <!-- 메인 컨텐츠 -->
        <div class="container mx-auto px-6 py-8">
            <!-- 환영 메시지 -->
            <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 mb-8">
                <h2 class="text-2xl font-bold mb-2">
                    <span id="welcome-name">구직자</span>님, 안녕하세요! 👋
                </h2>
                <p class="text-orange-100">WOW-CAMPUS 구직자 대시보드에 오신 것을 환영합니다.</p>
            </div>

            <!-- 기능 카드들 -->
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <!-- 프로필 관리 -->
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-user-edit text-orange-500 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold">프로필 관리</h3>
                    </div>
                    <p class="text-gray-600 mb-4">개인정보와 이력서를 관리하세요</p>
                    <button onclick="editProfile()" class="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition-colors">
                        프로필 수정
                    </button>
                </div>

                <!-- 구인정보 검색 -->
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-search text-blue-500 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold">구인정보 검색</h3>
                    </div>
                    <p class="text-gray-600 mb-4">맞춤형 일자리를 찾아보세요</p>
                    <button onclick="searchJobs()" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors">
                        구인정보 보기
                    </button>
                </div>

                <!-- 지원 내역 -->
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-clipboard-list text-green-500 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold">지원 내역</h3>
                    </div>
                    <p class="text-gray-600 mb-4">지원한 일자리를 확인하세요</p>
                    <button onclick="viewApplications()" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors">
                        지원 내역 보기
                    </button>
                </div>
            </div>

            <!-- 최근 활동 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-semibold mb-4">
                    <i class="fas fa-clock text-gray-500 mr-2"></i>최근 활동
                </h3>
                <div id="recent-activities" class="space-y-3">
                    <div class="border-l-4 border-orange-500 pl-4">
                        <p class="font-medium">계정 생성</p>
                        <p class="text-sm text-gray-500">WOW-CAMPUS에 가입하신 것을 환영합니다!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;
        let authToken = null;

        // 페이지 로드 시 인증 확인
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                updateLoadingStatus('사용자 정보 확인 중...');
                
                // URL에서 토큰 확인
                const urlParams = new URLSearchParams(window.location.search);
                const urlToken = urlParams.get('token');
                
                // localStorage에서 토큰 확인
                const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token');
                const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('user');
                
                authToken = urlToken || storedToken;
                
                if (!authToken) {
                    throw new Error('인증 토큰이 없습니다.');
                }
                
                // 사용자 정보가 있는 경우 파싱
                if (storedUser) {
                    try {
                        currentUser = JSON.parse(storedUser);
                    } catch (e) {
                        console.error('사용자 정보 파싱 오류:', e);
                    }
                }
                
                updateLoadingStatus('인증 검증 중...');
                
                // 토큰 검증
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': 'Bearer ' + authToken
                    }
                });
                
                if (!response.ok) {
                    throw new Error('인증 실패');
                }
                
                const data = await response.json();
                console.log('🔍 토큰 검증 응답:', data);
                
                if (!data.success) {
                    throw new Error(data.error || '인증 실패');
                }
                
                currentUser = data.user;
                console.log('👤 현재 사용자 정보:', currentUser);
                
                // 구직자 권한 체크 (다양한 필드 확인)
                const isJobseeker = currentUser.userType === 'jobseeker' || 
                                   currentUser.user_type === 'jobseeker' || 
                                   currentUser.type === 'jobseeker' ||
                                   currentUser.userType === 'student' || 
                                   currentUser.user_type === 'student' || 
                                   currentUser.type === 'student';
                
                console.log('🔍 권한 체크 결과:', {
                    userType: currentUser.userType,
                    user_type: currentUser.user_type,
                    type: currentUser.type,
                    isJobseeker: isJobseeker
                });
                
                if (!isJobseeker) {
                    console.error('🚫 구직자 권한 없음. 사용자 정보:', currentUser);
                    throw new Error('구직자만 접근 가능합니다. 현재: ' + (currentUser.userType || currentUser.user_type || currentUser.type));
                }
                
                updateLoadingStatus('대시보드 로딩 중...');
                
                // 사용자 정보 표시
                displayUserInfo();
                
                // 로딩 화면 숨기고 컨텐츠 표시
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('dashboard-content').classList.remove('hidden');
                }, 1000);
                
            } catch (error) {
                console.error('인증 오류:', error);
                alert('로그인이 필요합니다: ' + error.message);
                window.location.href = '/static/login.html';
            }
        });
        
        function updateLoadingStatus(status) {
            const statusElement = document.getElementById('loading-status');
            if (statusElement) {
                statusElement.textContent = status;
            }
        }
        
        function displayUserInfo() {
            if (currentUser) {
                // 사용자 이름 표시
                const nameElements = [
                    document.getElementById('jobseeker-name'),
                    document.getElementById('welcome-name')
                ];
                
                nameElements.forEach(element => {
                    if (element) {
                        element.textContent = currentUser.name || '구직자';
                    }
                });
            }
        }
        
        function editProfile() {
            alert('프로필 수정 기능은 곧 추가될 예정입니다.');
        }
        
        function searchJobs() {
            window.location.href = '/static/jobs-view.html';
        }
        
        function viewApplications() {
            alert('지원 내역 기능은 곧 추가될 예정입니다.');
        }
        
        function logout() {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        }
    </script>
</body>
</html>`)
})

app.get('/static/*', serveStatic({ 
  root: './public',
  onNotFound: (path, c) => {
    console.log(`Static file not found: ${path}`)
    return c.text('File not found', 404)
  }
}))

export default app
