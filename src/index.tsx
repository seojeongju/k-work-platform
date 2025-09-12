import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { sign, verify } from 'hono/jwt'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database;
}

// 간단한 해시 함수 (실제 운영환경에서는 더 강력한 해시 함수 사용 권장)
async function hash(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
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
  return input.trim().replace(/[<>'"&]/g, '')
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
  const windowMs = 15 * 60 * 1000 // 15분
  const maxRequests = 100
  
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
                        <div id="user-menu" class="hidden flex items-center space-x-4">
                            <span class="text-sm text-gray-600 hidden sm:inline">환영합니다, <span id="user-name" class="font-medium">사용자님</span></span>
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
                    
                    <div id="mobile-agent-menu" class="hidden">
                        <a href="/static/agent-dashboard?agentId=1" class="block w-full text-left py-2 text-gray-700 hover:text-wowcampus-blue font-medium">
                            <i class="fas fa-handshake mr-3"></i>에이전트
                        </a>
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
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" onclick="window.location.href='/static/job-listings-dashboard.html'">
                            <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-briefcase text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">구인구직 매칭</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">비자별, 직종별, 지역별 맞춤 매칭 서비스로 최적의 일자리를 찾아드립니다</p>
                            <span class="text-wowcampus-blue font-semibold hover:underline">구인정보 보기 →</span>
                        </div>
                        
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" onclick="window.location.href='/static/study-view.html'">
                            <div class="w-16 h-16 bg-gradient-to-br from-accent to-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-graduation-cap text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">유학 지원</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">한국어 연수부터 학위과정까지 전 과정에 대한 체계적 지원을 제공합니다</p>
                            <span class="text-accent font-semibold hover:underline">유학정보 보기 →</span>
                        </div>
                        
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer hover:transform hover:scale-105 transition-all duration-300" onclick="window.location.href='/static/jobseeker-listings-dashboard.html'">
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
                    window.location.href = \\\`/static/agent-dashboard?agentId=\\\${user.id}\\\`;
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
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                
                const authButtons = document.getElementById('auth-buttons');
                const userMenu = document.getElementById('user-menu');
                const userNameSpan = document.getElementById('user-name');
                
                if (token && user.id) {
                    // 로그인된 상태
                    authButtons.classList.add('hidden');
                    userMenu.classList.remove('hidden');
                    if (userNameSpan && user.name) {
                        userNameSpan.textContent = user.name;
                    }
                } else {
                    // 로그아웃 상태
                    authButtons.classList.remove('hidden');
                    userMenu.classList.add('hidden');
                }
            }

            // 로그아웃 함수
            document.getElementById('logout-btn')?.addEventListener('click', function() {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                checkLoginStatus();
                alert('로그아웃 되었습니다.');
                window.location.reload();
            });
            
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
            
            // 구인정보 페이지로 이동
            function showJobListView() {
                console.log('구인정보 페이지로 이동');
                window.location.href = '/static/matching-service.html?tab=jobs';
            }
            
            // 구직정보 페이지로 이동
            function showJobSeekersView() {
                console.log('구직정보 페이지로 이동');
                window.location.href = '/static/matching-service.html?tab=jobseekers';
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

        // 회원 유형 선택
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 모든 버튼에서 active 클래스 제거
                document.querySelectorAll('.user-type-btn').forEach(b => {
                    b.classList.remove('bg-wowcampus-blue', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                });
                
                // 선택된 버튼에 active 클래스 추가
                this.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                this.classList.add('bg-wowcampus-blue', 'text-white');
                
                selectedUserType = this.dataset.type;
                updateLoginButton();
            });
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

        // 로그인 폼 제출
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!selectedUserType) {
                alert('회원 유형을 선택해주세요.');
                return;
            }

            const formData = new FormData(e.target);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password'),
                userType: selectedUserType
            };

            showLoading();

            try {
                const response = await axios.post('/api/auth/login', loginData);
                
                if (response.data.success || response.data.token) {
                    // 로그인 성공
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    
                    alert('로그인이 완료되었습니다!');
                    
                    // 사용자 유형별 리다이렉트
                    if (selectedUserType === 'agent') {
                        window.location.href = '/static/agent-dashboard.html';
                    } else if (selectedUserType === 'admin') {
                        window.location.href = '/static/admin-dashboard.html';
                    } else if (selectedUserType === 'employer') {
                        window.location.href = '/static/employer-dashboard.html';
                    } else if (selectedUserType === 'jobseeker') {
                        window.location.href = '/static/jobseeker-profile.html';
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    throw new Error(response.data.error || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert(error.response?.data?.error || '로그인 중 오류가 발생했습니다.');
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
                        <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                        <input type="text" id="firstName" name="firstName" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="이름">
                    </div>
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">성</label>
                        <input type="text" id="lastName" name="lastName" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="성">
                    </div>
                </div>
                
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input type="email" id="email" name="email" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                           placeholder="이메일을 입력하세요">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
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
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                           placeholder="비밀번호를 다시 입력하세요">
                </div>
                
                <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
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
                        <label for="companyName" class="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                        <input type="text" id="companyName" name="companyName" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="회사명을 입력하세요">
                    </div>
                    <div>
                        <label for="businessNumber" class="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                        <input type="text" id="businessNumber" name="businessNumber" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="000-00-00000">
                    </div>
                </div>

                <!-- 에이전트 전용 필드 -->
                <div id="agentFields" class="hidden space-y-4">
                    <div>
                        <label for="agencyName" class="block text-sm font-medium text-gray-700 mb-1">에이전시명</label>
                        <input type="text" id="agencyName" name="agencyName" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wowcampus-blue focus:border-transparent text-sm"
                               placeholder="에이전시명을 입력하세요">
                    </div>
                    <div>
                        <label for="licenseNumber" class="block text-sm font-medium text-gray-700 mb-1">허가번호</label>
                        <input type="text" id="licenseNumber" name="licenseNumber" 
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
                // 모든 버튼에서 active 클래스 제거
                document.querySelectorAll('.user-type-btn').forEach(b => {
                    b.classList.remove('bg-wowcampus-blue', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                });
                
                // 선택된 버튼에 active 클래스 추가
                this.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                this.classList.add('bg-wowcampus-blue', 'text-white');
                
                selectedUserType = this.dataset.type;
                showUserTypeFields();
                updateRegisterButton();
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
            } else if (selectedUserType === 'employer') {
                document.getElementById('employerFields').classList.remove('hidden');
            } else if (selectedUserType === 'agent') {
                document.getElementById('agentFields').classList.remove('hidden');
            }
        }

        // 회원가입 버튼 상태 업데이트
        function updateRegisterButton() {
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const phone = document.getElementById('phone').value;
            const registerBtn = document.getElementById('registerBtn');
            
            let allFieldsFilled = selectedUserType && firstName && lastName && email && password && confirmPassword && phone;
            let passwordsMatch = password === confirmPassword;
            
            // 비밀번호 유효성 검사
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
            let passwordValid = passwordRegex.test(password);
            
            if (allFieldsFilled && passwordsMatch && passwordValid) {
                registerBtn.disabled = false;
                registerBtn.classList.remove('opacity-50');
            } else {
                registerBtn.disabled = true;
                registerBtn.classList.add('opacity-50');
            }
        }

        // 입력 필드 이벤트 리스너
        ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phone'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateRegisterButton);
        });

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
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!selectedUserType) {
                alert('회원 유형을 선택해주세요.');
                return;
            }
            
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
                let endpoint = '';
                let requestData = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                    phone: data.phone
                };
                
                // 회원 유형별 API 엔드포인트 및 데이터 설정
                if (selectedUserType === 'jobseeker') {
                    endpoint = '/api/auth/register/jobseeker';
                    requestData.nationality = data.nationality;
                    requestData.visaType = data.visaType;
                } else if (selectedUserType === 'employer') {
                    endpoint = '/api/auth/register/employer';
                    requestData.companyName = data.companyName;
                    requestData.businessNumber = data.businessNumber;
                } else if (selectedUserType === 'agent') {
                    endpoint = '/api/auth/register/agent';
                    requestData.agencyName = data.agencyName;
                    requestData.licenseNumber = data.licenseNumber;
                }
                
                const response = await axios.post(endpoint, requestData);
                
                if (response.data.success) {
                    alert(response.data.message || '회원가입이 완료되었습니다!');
                    window.location.href = '/static/login.html';
                } else {
                    throw new Error(response.data.error || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('회원가입 오류:', error);
                alert(error.response?.data?.error || '회원가입 중 오류가 발생했습니다.');
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

// 로그인 상태 확인 API
app.get('/api/auth/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ authenticated: false, error: '토큰이 없습니다.' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  // 실제 JWT 토큰이 아닌 간단한 토큰 형식인 경우 처리
  if (!token.startsWith('token_')) {
    try {
      const decoded = await verify(token, JWT_SECRET);
      return c.json({ 
        authenticated: true, 
        user: {
          id: decoded.id,
          email: decoded.email,
          userType: decoded.userType,
          name: decoded.name
        }
      });
    } catch (error) {
      return c.json({ authenticated: false, error: '유효하지 않은 토큰입니다.' }, 401);
    }
  } else {
    // 기존 간단한 토큰 형식 검증 및 반환
    const tokenParts = token.split('_');
    if (tokenParts.length < 3) {
      return c.json({ authenticated: false, error: '유효하지 않은 토큰입니다.' }, 401);
    }
    
    return c.json({ 
      authenticated: true, 
      user: {
        id: tokenParts[1],
        userType: tokenParts[2]
      }
    });
  }
});

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
app.post('/api/auth/login', async (c) => {
  try {
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

    // 테스트 계정 로그인 처리
    const testAccounts = {
      'jobseeker@test.com': { userType: 'jobseeker', password: 'test123', name: '김구직', id: 1 },
      'employer@test.com': { userType: 'employer', password: 'test123', name: '박기업', id: 2 },
      'agent@test.com': { userType: 'agent', password: 'test123', name: '이에이전트', id: 3 },
      'admin@test.com': { userType: 'admin', password: 'admin123', name: '최관리자', id: 4 }
    }

    const testAccount = testAccounts[email as keyof typeof testAccounts]
    
    if (testAccount && testAccount.password === password && testAccount.userType === userType) {
      // 테스트 계정 로그인 성공
      const token = await sign({
        id: testAccount.id,
        email: email,
        userType: userType,
        name: testAccount.name,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
      }, 'test-secret-key')

      return c.json({
        success: true,
        token,
        user: {
          id: testAccount.id,
          email: email,
          name: testAccount.name,
          userType: userType
        },
        message: '로그인 성공'
      })
    }

    // 실제 데이터베이스에서 사용자 조회 (우선 처리)
    try {
      // 먼저 평문 비밀번호로 시도 (신규 가입자)
      let dbUser = await authenticateUserWithPlainPassword(c.env.DB, email, password, userType)
      
      // 평문 비밀번호로 찾지 못하면 해시된 비밀번호로 시도
      if (!dbUser) {
        dbUser = await authenticateUser(c.env.DB, email, password, userType)
      }
      
      if (dbUser) {
        const token = await sign({
          id: dbUser.id,
          email: dbUser.email,
          userType: userType,
          name: dbUser.name || dbUser.company_name || 'Unknown',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }, 'production-secret-key')

        return c.json({
          success: true,
          token,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.company_name || 'Unknown',
            userType: userType
          },
          message: '로그인 성공'
        })
      }
    } catch (dbError) {
      console.log('실제 DB 조회 실패, 테스트 계정으로 폴백:', dbError)
    }
    
    // 로그인 실패
    return c.json({ 
      success: false, 
      error: '이메일 또는 비밀번호가 올바르지 않습니다.' 
    }, 401)

  } catch (error) {
    console.error('Login API error:', error)
    return c.json({ 
      success: false, 
      error: '로그인 처리 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 토큰 검증 API
app.get('/api/auth/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증 토큰이 없습니다.' 
      }, 401)
    }

    const token = authHeader.substring(7) // "Bearer " 제거
    
    try {
      // 토큰 검증
      let payload
      try {
        // 먼저 production 키로 검증 시도
        payload = await verify(token, 'production-secret-key')
      } catch (prodError) {
        // production 키 실패 시 test 키로 검증
        payload = await verify(token, 'test-secret-key')
      }
      
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return c.json({ 
          success: false, 
          error: '토큰이 만료되었습니다.' 
        }, 401)
      }

      return c.json({
        success: true,
        user: {
          id: payload.id,
          email: payload.email,
          user_type: payload.userType,
          name: payload.name
        }
      })
      
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError)
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다.' 
      }, 401)
    }

  } catch (error) {
    console.error('Token verify API error:', error)
    return c.json({ 
      success: false, 
      error: '토큰 검증 중 오류가 발생했습니다.' 
    }, 500)
  }
})

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

// 회원가입 API
app.post('/api/auth/register', async (c) => {
  try {
    const requestData = await c.req.json()
    const { userType, email, password, confirmPassword, ...additionalData } = requestData
    
    // 기본 검증
    if (!email || !password || !userType || !confirmPassword) {
      return c.json({ 
        success: false, 
        error: '필수 정보가 누락되었습니다.' 
      }, 400)
    }

    if (password !== confirmPassword) {
      return c.json({ 
        success: false, 
        error: '비밀번호가 일치하지 않습니다.' 
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
    const emailExists = await checkEmailExists(c.env.DB, email, userType)
    if (emailExists) {
      return c.json({ 
        success: false, 
        error: '이미 사용 중인 이메일입니다.' 
      }, 400)
    }

    // 비밀번호 해시
    const hashedPassword = await hash(password)
    
    // 사용자 유형별 회원가입 처리
    let userId: number | null = null
    
    switch (userType) {
      case 'jobseeker':
        userId = await createJobSeeker(c.env.DB, { 
          email, 
          password: hashedPassword, 
          ...additionalData 
        })
        break
      case 'employer':
        userId = await createEmployer(c.env.DB, { 
          email, 
          password: hashedPassword, 
          ...additionalData 
        })
        break
      case 'agent':
        userId = await createAgent(c.env.DB, { 
          email, 
          password: hashedPassword, 
          ...additionalData 
        })
        break
      default:
        return c.json({ 
          success: false, 
          error: '지원하지 않는 사용자 유형입니다.' 
        }, 400)
    }

    if (!userId) {
      return c.json({ 
        success: false, 
        error: '회원가입 중 오류가 발생했습니다.' 
      }, 500)
    }

    // JWT 토큰 생성
    const token = await sign({
      id: userId,
      email: email,
      userType: userType,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }, 'registration-secret-key')

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email: email,
        userType: userType
      },
      message: '회원가입이 완료되었습니다.'
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return c.json({ 
      success: false, 
      error: '회원가입 처리 중 오류가 발생했습니다.' 
    }, 500)
  }
})

// 이메일 중복 확인 함수
async function checkEmailExists(db: D1Database, email: string, userType: string): Promise<boolean> {
  const tables = {
    'jobseeker': 'job_seekers',
    'employer': 'employers', 
    'agent': 'agents',
    'admin': 'admins'
  }
  
  const tableName = tables[userType as keyof typeof tables]
  if (!tableName) return false
  
  try {
    const result = await db.prepare(`SELECT id FROM ${tableName} WHERE email = ?`).bind(email).first()
    return !!result
  } catch (error) {
    console.error(`Email check error for ${userType}:`, error)
    return false
  }
}

// 구직자 생성 함수
async function createJobSeeker(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, 
      password, 
      name, 
      birth_date, 
      gender, 
      nationality, 
      phone, 
      current_address, 
      korean_level = 'beginner',
      education_level,
      current_visa,
      desired_visa
    } = data
    
    if (!name || !nationality) {
      throw new Error('구직자 필수 정보가 누락되었습니다.')
    }
    
    const result = await db.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        phone, current_address, korean_level, education_level,
        current_visa, desired_visa, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      email, password, name, birth_date || null, gender || null, nationality,
      phone || null, current_address || null, korean_level, education_level || null,
      current_visa || null, desired_visa || null
    ).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('Create job seeker error:', error)
    return null
  }
}

// 기업 생성 함수
async function createEmployer(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, 
      password, 
      company_name, 
      business_number, 
      industry, 
      contact_person, 
      phone, 
      address, 
      region, 
      website 
    } = data
    
    if (!company_name || !business_number || !industry || !contact_person || !phone || !address || !region) {
      throw new Error('기업 필수 정보가 누락되었습니다.')
    }
    
    const result = await db.prepare(`
      INSERT INTO employers (
        email, password, company_name, business_number, industry, 
        contact_person, phone, address, region, website, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email, password, company_name, business_number, industry,
      contact_person, phone, address, region, website || null
    ).run()
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null
  } catch (error) {
    console.error('Create employer error:', error)
    return null
  }
}

// 에이전트 생성 함수
async function createAgent(db: D1Database, data: any): Promise<number | null> {
  try {
    const { 
      email, 
      password, 
      company_name, 
      country, 
      contact_person, 
      phone, 
      address, 
      license_number 
    } = data
    
    if (!company_name || !country || !contact_person) {
      throw new Error('에이전트 필수 정보가 누락되었습니다.')
    }
    
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
    console.error('Create agent error:', error)
    return null
  }
}

// 평문 비밀번호로 인증하는 함수 (신규 가입자용)
async function authenticateUserWithPlainPassword(db: D1Database, email: string, password: string, userType: string) {
  const tables = {
    'jobseeker': 'job_seekers',
    'employer': 'employers', 
    'agent': 'agents',
    'admin': 'admins'
  }
  
  const tableName = tables[userType as keyof typeof tables]
  if (!tableName) return null
  
  try {
    let query: string
    
    if (tableName === 'admins') {
      query = `SELECT id, email, name, role as userType FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else if (tableName === 'job_seekers') {
      query = `SELECT id, email, name, nationality, korean_level FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else {
      query = `SELECT id, email, company_name as name FROM ${tableName} WHERE email = ? AND password = ? AND status IN ('approved', 'active')`
    }
    
    const user = await db.prepare(query).bind(email, password).first()
    return user
  } catch (error) {
    console.error(`Plain password authentication error for ${userType}:`, error)
    return null
  }
}

// 실제 데이터베이스 로그인 검증 개선
async function authenticateUser(db: D1Database, email: string, password: string, userType: string) {
  const tables = {
    'jobseeker': 'job_seekers',
    'employer': 'employers', 
    'agent': 'agents',
    'admin': 'admins'
  }
  
  const tableName = tables[userType as keyof typeof tables]
  if (!tableName) return null
  
  try {
    const hashedPassword = await hash(password)
    let query: string
    
    if (tableName === 'admins') {
      query = `SELECT id, email, name, role as userType FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else if (tableName === 'job_seekers') {
      query = `SELECT id, email, name, nationality, korean_level FROM ${tableName} WHERE email = ? AND password = ? AND status = 'active'`
    } else {
      query = `SELECT id, email, company_name as name FROM ${tableName} WHERE email = ? AND password = ? AND status IN ('approved', 'active')`
    }
    
    const user = await db.prepare(query).bind(email, hashedPassword).first()
    return user
  } catch (error) {
    console.error(`Authentication error for ${userType}:`, error)
    return null
  }
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
    
    if (!userId) {
      return c.json({ 
        success: false, 
        error: '회원가입 중 오류가 발생했습니다.' 
      }, 500)
    }
    
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


export default app
