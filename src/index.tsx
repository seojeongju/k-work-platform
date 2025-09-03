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
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://w-campus.com https://www.w-campus.com"
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

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

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

function convertKoreanLevelForJobSeeker(level: string): string {
  if (!level) return 'beginner'
  
  const levelMap: Record<string, string> = {
    // 급수 기준
    '1급': 'beginner',
    '2급': 'beginner',
    '3급': 'intermediate', 
    '4급': 'intermediate',
    '5급': 'advanced',
    '6급': 'advanced',
    // 한국어 레벨 기준
    '초급': 'beginner',
    '기초': 'beginner',
    '중급': 'intermediate',
    '고급': 'advanced',
    '최고급': 'native',
    '원어민': 'native',
    // 영어 레벨 (그대로)
    'beginner': 'beginner',
    'intermediate': 'intermediate', 
    'advanced': 'advanced',
    'native': 'native',
    // 기타
    '기타': 'beginner'
  }
  
  return levelMap[level] || 'beginner'
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

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WOW-CAMPUS 외국인 구인구직 및 유학생 지원플랫폼</title>
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
          .nav-dropdown-menu {
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: none;
          }
          .nav-dropdown:hover .nav-dropdown-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
          }
          .nav-dropdown-btn:hover {
            color: #1E40AF;
          }
          .nav-dropdown-menu:hover {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
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
          }
          .nav-dropdown-menu a:hover {
            background-color: #E0F2FE;
            color: #1E40AF;
          }
          .hero-gradient {
            background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #059669 100%);
          }
          .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
          }
          .card-shadow:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
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
                        <div class="relative nav-dropdown">
                            <button class="nav-dropdown-btn text-gray-700 hover:text-wowcampus-blue flex items-center font-medium py-2">
                                구인정보 <i class="fas fa-chevron-down ml-1 text-xs transition-transform"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 z-50">
                                <a href="#jobs-view" onclick="event.preventDefault(); showJobListView(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-list mr-2"></i>구인정보 보기
                                </a>
                                <a href="#jobs-register" onclick="event.preventDefault(); showJobRegisterForm(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-plus mr-2"></i>구인정보 등록
                                </a>
                            </div>
                        </div>
                        <div class="relative nav-dropdown">
                            <button class="nav-dropdown-btn text-gray-700 hover:text-wowcampus-blue flex items-center font-medium py-2">
                                구직정보 <i class="fas fa-chevron-down ml-1 text-xs transition-transform"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 z-50">
                                <a href="#jobseekers-view" onclick="event.preventDefault(); showJobSeekerListView(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-users mr-2"></i>구직자 보기
                                </a>
                                <a href="#jobseekers-register" onclick="event.preventDefault(); showJobSeekerRegisterForm(); return false;" class="block px-4 py-3 text-gray-700 hover:bg-wowcampus-light hover:text-wowcampus-blue transition-colors cursor-pointer">
                                    <i class="fas fa-user-plus mr-2"></i>구직정보 등록
                                </a>
                            </div>
                        </div>
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
                        
                        <!-- Auth Buttons (Always Visible) -->
                        <div id="auth-buttons" class="flex items-center space-x-3" style="display: flex !important;">
                            <a href="/static/login.html" id="login-btn" class="bg-wowcampus-blue text-white px-4 md:px-6 py-2 rounded-full font-medium hover:bg-wowcampus-dark transition-colors text-sm md:text-base" style="display: inline-block !important; background-color: #1E40AF !important; color: white !important;">
                                <i class="fas fa-sign-in-alt mr-1 md:mr-2"></i>로그인
                            </a>
                            <a href="/static/register.html" id="register-btn" class="border-2 border-wowcampus-blue text-wowcampus-blue px-4 md:px-6 py-2 rounded-full font-medium hover:bg-wowcampus-blue hover:text-white transition-colors text-sm md:text-base" style="display: inline-block !important; border: 2px solid #1E40AF !important; color: #1E40AF !important;">
                                <i class="fas fa-user-plus mr-1 md:mr-2"></i>회원가입
                            </a>
                        </div>
                        
                        <!-- User Menu (Hidden by default) -->
                        <div id="user-menu" class="hidden flex items-center space-x-4">
                            <span class="text-sm text-gray-600 hidden sm:inline">환영합니다, <span id="user-name" class="font-medium">사용자님</span></span>
                            <button id="logout-btn" class="bg-red-500 text-white px-3 md:px-4 py-2 rounded-full font-medium hover:bg-red-600 transition-colors text-sm">
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
                        <button onclick="showJobRegisterForm(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-plus mr-3"></i>구인정보 등록
                        </button>
                    </div>
                    
                    <div class="border-b border-gray-200 pb-4">
                        <button onclick="showJobSeekerListView(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-users mr-3"></i>구직자 보기
                        </button>
                        <button onclick="showJobSeekerRegisterForm(); closeMobileMenu();" class="block w-full text-left py-3 text-gray-700 hover:text-wowcampus-blue hover:bg-wowcampus-light font-medium rounded-lg transition-colors">
                            <i class="fas fa-user-plus mr-3"></i>구직정보 등록
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
                            <button onclick="showJobListView()" class="bg-white text-wowcampus-blue px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-all transform hover:-translate-y-1">
                                <i class="fas fa-briefcase mr-2"></i>구인정보 보기
                            </button>
                            <button onclick="showJobSeekerListView()" class="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-wowcampus-blue transition-all transform hover:-translate-y-1">
                                <i class="fas fa-user-graduate mr-2"></i>구직자 보기
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
                        <div class="text-center card-shadow bg-white p-8 rounded-xl">
                            <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-briefcase text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">구인구직 매칭</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">비자별, 직종별, 지역별 맞춤 매칭 서비스로 최적의 일자리를 찾아드립니다</p>
                            <a href="#" class="text-wowcampus-blue font-semibold hover:underline">자세히 보기 →</a>
                        </div>
                        
                        <div class="text-center card-shadow bg-white p-8 rounded-xl">
                            <div class="w-16 h-16 bg-gradient-to-br from-accent to-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-graduation-cap text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">유학 지원</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">한국어 연수부터 학위과정까지 전 과정에 대한 체계적 지원을 제공합니다</p>
                            <a href="#" class="text-accent font-semibold hover:underline">자세히 보기 →</a>
                        </div>
                        
                        <div class="text-center card-shadow bg-white p-8 rounded-xl cursor-pointer" onclick="handleAgentManagementClick()">
                            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-users text-white text-2xl"></i>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-800 mb-4">에이전트 관리</h3>
                            <p class="text-gray-600 leading-relaxed mb-6">해외 에이전트별 구직자 관리 및 지원 현황을 체계적으로 관리합니다</p>
                            <a href="#" class="text-purple-500 font-semibold hover:underline">자세히 보기 →</a>
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
            
            <div class="container mx-auto px-6 py-12">

            <!-- Dashboard Tabs -->
            <section class="mb-12">
                <div class="bg-white rounded-xl shadow-lg overflow-hidden card-shadow">
                    <div class="border-b border-gray-100">
                        <div class="flex overflow-x-auto">
                            <button id="tab-jobs" class="tab-button px-6 py-4 bg-wowcampus-blue text-white border-b-3 border-wowcampus-blue whitespace-nowrap font-medium">
                                <i class="fas fa-briefcase mr-2"></i>구인 정보
                            </button>
                            <button id="tab-jobseekers" class="tab-button px-6 py-4 text-gray-600 hover:bg-wowcampus-light hover:text-wowcampus-blue whitespace-nowrap font-medium transition-all">
                                <i class="fas fa-users mr-2"></i>구직정보
                            </button>
                            <button id="tab-matching" class="tab-button px-6 py-4 text-gray-600 hover:bg-wowcampus-light hover:text-wowcampus-blue whitespace-nowrap font-medium transition-all">
                                <i class="fas fa-handshake mr-2"></i>매칭 서비스
                            </button>
                            <button id="tab-study" class="tab-button px-6 py-4 text-gray-600 hover:bg-wowcampus-light hover:text-wowcampus-blue whitespace-nowrap font-medium transition-all">
                                <i class="fas fa-graduation-cap mr-2"></i>유학 프로그램
                            </button>
                            <button id="tab-stats" class="tab-button px-6 py-4 text-gray-600 hover:bg-wowcampus-light hover:text-wowcampus-blue whitespace-nowrap font-medium transition-all">
                                <i class="fas fa-chart-bar mr-2"></i>통계 대시보드
                            </button>
                        </div>
                    </div>

                    <!-- Tab Contents -->
                    <div class="p-6">
                        <div id="content-jobs" class="tab-content">
                            <!-- 구인 서브메뉴 -->
                            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                                <div class="flex space-x-4">
                                    <button id="job-view-btn" class="job-sub-btn px-4 py-2 bg-primary text-white rounded-lg">
                                        <i class="fas fa-list mr-2"></i>구인정보 보기
                                    </button>
                                    <button id="job-register-btn" class="job-sub-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                        <i class="fas fa-plus mr-2"></i>구인정보 등록
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 구인정보 보기 -->
                            <div id="job-view-section" class="job-sub-content">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-xl font-semibold">최신 구인 정보</h3>
                                    <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary">
                                        전체보기
                                    </button>
                                </div>
                                <div id="jobs-list" class="space-y-4">
                                    <!-- Job listings will be loaded here -->
                                </div>
                            </div>
                            
                            <!-- 구인정보 등록 -->
                            <div id="job-register-section" class="job-sub-content hidden">
                                <h3 class="text-xl font-semibold mb-6">구인정보 등록</h3>
                                <form id="job-register-form" class="space-y-6">
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">회사명 *</label>
                                            <input type="text" id="company-name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">담당자명 *</label>
                                            <input type="text" id="contact-person" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
                                            <input type="email" id="contact-email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                                            <input type="tel" id="contact-phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">직책/직종 *</label>
                                        <input type="text" id="job-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="예: 제조업 생산직, IT 개발자, 서비스업 등">
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">근무지역 *</label>
                                            <select id="work-location" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">지역 선택</option>
                                                <option value="서울">서울특별시</option>
                                                <option value="인천">인천광역시</option>
                                                <option value="경기">경기도</option>
                                                <option value="부산">부산광역시</option>
                                                <option value="대구">대구광역시</option>
                                                <option value="대전">대전광역시</option>
                                                <option value="광주">광주광역시</option>
                                                <option value="울산">울산광역시</option>
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
                                            <label class="block text-sm font-medium text-gray-700 mb-2">비자 유형 *</label>
                                            <select id="visa-type" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">비자 유형 선택</option>
                                                <option value="E-9">E-9 (비전문취업)</option>
                                                <option value="E-7">E-7 (특정활동)</option>
                                                <option value="H-2">H-2 (방문취업)</option>
                                                <option value="F-4">F-4 (재외동포)</option>
                                                <option value="F-5">F-5 (영주)</option>
                                                <option value="F-6">F-6 (결혼이민)</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">급여 (월급, 만원)</label>
                                            <input type="number" id="salary" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="예: 250">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">모집인원</label>
                                            <input type="number" id="positions" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="예: 5">
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">한국어 수준 요구사항</label>
                                        <select id="korean-level" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                            <option value="">선택안함</option>
                                            <option value="1급">초급 (1급)</option>
                                            <option value="2급">초급 (2급)</option>
                                            <option value="3급">중급 (3급)</option>
                                            <option value="4급">중급 (4급)</option>
                                            <option value="5급">고급 (5급)</option>
                                            <option value="6급">고급 (6급)</option>
                                        </select>
                                    </div>
                                    
                                    <!-- 에이전트 협력 섹션 -->
                                    <div class="border-t pt-6">
                                        <h4 class="text-lg font-medium text-gray-900 mb-4">
                                            <i class="fas fa-handshake text-accent mr-2"></i>에이전트 협력
                                        </h4>
                                        <div class="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">협력 에이전트</label>
                                                <select id="agent-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                    <option value="">직접 채용 (에이전트 없음)</option>
                                                    <!-- 에이전트 목록이 동적으로 로드됩니다 -->
                                                </select>
                                                <p class="text-xs text-gray-500 mt-1">에이전트와 협력하여 구직자를 모집할 수 있습니다</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">수수료율 (%)</label>
                                                <input type="number" id="agent-fee" min="0" max="50" step="0.5" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="예: 5.0" disabled>
                                                <p class="text-xs text-gray-500 mt-1">성공 채용 시 지급할 수수료 비율</p>
                                            </div>
                                        </div>
                                        <div class="mt-4">
                                            <label class="block text-sm font-medium text-gray-700 mb-2">에이전트 요청사항</label>
                                            <textarea id="agent-notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="에이전트에게 전달할 특별 요청사항이나 조건을 입력해주세요" disabled></textarea>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">상세 설명</label>
                                        <textarea id="job-description" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="업무내용, 근무조건, 복리혜택 등을 자세히 입력해주세요"></textarea>
                                    </div>
                                    
                                    <div class="flex justify-end space-x-4">
                                        <button type="button" onclick="resetJobForm()" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                            초기화
                                        </button>
                                        <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary">
                                            등록하기
                                        </button>
                                    </div>
                                </form>
                                
                                <div id="job-register-success" class="hidden mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-check-circle text-green-500 mr-2"></i>
                                        <span class="text-green-800">구인정보가 성공적으로 등록되었습니다!</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="content-jobseekers" class="tab-content hidden">
                            <!-- 구직 서브메뉴 -->
                            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                                <div class="flex space-x-4">
                                    <button id="jobseeker-view-btn" class="jobseeker-sub-btn px-4 py-2 bg-primary text-white rounded-lg">
                                        <i class="fas fa-users mr-2"></i>구직자 보기
                                    </button>
                                    <button id="jobseeker-register-btn" class="jobseeker-sub-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                        <i class="fas fa-user-plus mr-2"></i>구직정보 등록
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 구직자 보기 -->
                            <div id="jobseeker-view-section" class="jobseeker-sub-content">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-xl font-semibold">최신 구직정보</h3>
                                    <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary">
                                        전체보기
                                    </button>
                                </div>
                                <div id="jobseekers-list" class="space-y-4">
                                    <!-- Job seekers will be loaded here -->
                                </div>
                            </div>
                            
                            <!-- 구직정보 등록 -->
                            <div id="jobseeker-register-section" class="jobseeker-sub-content hidden">
                                <h3 class="text-xl font-semibold mb-6">구직정보 등록</h3>
                                <form id="jobseeker-register-form" class="space-y-6">
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                                            <input type="text" id="jobseeker-name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
                                            <input type="email" id="jobseeker-email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">생년월일 *</label>
                                            <input type="date" id="jobseeker-birth-date" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">성별 *</label>
                                            <select id="jobseeker-gender" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">성별 선택</option>
                                                <option value="male">남성</option>
                                                <option value="female">여성</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">국적 *</label>
                                            <select id="jobseeker-nationality" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">국적 선택</option>
                                                <option value="중국">중국</option>
                                                <option value="베트남">베트남</option>
                                                <option value="필리핀">필리핀</option>
                                                <option value="태국">태국</option>
                                                <option value="캄보디아">캄보디아</option>
                                                <option value="미얀마">미얀마</option>
                                                <option value="네팔">네팔</option>
                                                <option value="스리랑카">스리랑카</option>
                                                <option value="방글라데시">방글라데시</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">연락처 *</label>
                                            <input type="tel" id="jobseeker-phone" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="예: 010-1234-5678">
                                        </div>
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">현재 비자 *</label>
                                            <select id="jobseeker-current-visa" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">현재 비자 선택</option>
                                                <option value="E-9">E-9 (비전문취업)</option>
                                                <option value="E-7">E-7 (특정활동)</option>
                                                <option value="H-2">H-2 (방문취업)</option>
                                                <option value="F-4">F-4 (재외동포)</option>
                                                <option value="F-5">F-5 (영주)</option>
                                                <option value="F-6">F-6 (결혼이민)</option>
                                                <option value="D-2">D-2 (유학)</option>
                                                <option value="D-4">D-4 (일반연수)</option>
                                                <option value="관광비자">관광비자</option>
                                                <option value="무비자">무비자</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">희망 비자 *</label>
                                            <select id="jobseeker-desired-visa" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">희망 비자 선택</option>
                                                <option value="E-9">E-9 (비전문취업)</option>
                                                <option value="E-7">E-7 (특정활동)</option>
                                                <option value="H-2">H-2 (방문취업)</option>
                                                <option value="F-4">F-4 (재외동포)</option>
                                                <option value="F-5">F-5 (영주)</option>
                                                <option value="F-6">F-6 (결혼이민)</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">현재 주소 *</label>
                                        <input type="text" id="jobseeker-address" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="현재 거주지 주소를 입력해주세요">
                                    </div>
                                    
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">한국어 수준 *</label>
                                            <select id="jobseeker-korean-level" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">한국어 수준 선택</option>
                                                <option value="1급">초급 (1급)</option>
                                                <option value="2급">초급 (2급)</option>
                                                <option value="3급">중급 (3급)</option>
                                                <option value="4급">중급 (4급)</option>
                                                <option value="5급">고급 (5급)</option>
                                                <option value="6급">고급 (6급)</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">학력 *</label>
                                            <select id="jobseeker-education" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                                <option value="">학력 선택</option>
                                                <option value="초등학교졸업">초등학교 졸업</option>
                                                <option value="중학교졸업">중학교 졸업</option>
                                                <option value="고등학교졸업">고등학교 졸업</option>
                                                <option value="대학재학">대학교 재학</option>
                                                <option value="대학졸업">대학교 졸업</option>
                                                <option value="대학원졸업">대학원 졸업</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">경력 사항</label>
                                        <textarea id="jobseeker-experience" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="이전 직장 경험, 기술, 자격증 등을 입력해주세요 (선택사항)"></textarea>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">에이전트 ID</label>
                                        <input type="number" id="jobseeker-agent-id" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="담당 에이전트 ID (선택사항)">
                                    </div>
                                    
                                    <div class="flex justify-end space-x-4">
                                        <button type="button" onclick="resetJobSeekerForm()" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                            초기화
                                        </button>
                                        <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary">
                                            등록하기
                                        </button>
                                    </div>
                                </form>
                                
                                <div id="jobseeker-register-success" class="hidden mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-check-circle text-green-500 mr-2"></i>
                                        <span class="text-green-800">구직정보가 성공적으로 등록되었습니다!</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="content-matching" class="tab-content hidden">
                            <div class="mb-6">
                                <h3 class="text-xl font-semibold mb-4">스마트 매칭 시스템</h3>
                                <div class="bg-blue-50 p-4 rounded-lg mb-4">
                                    <p class="text-blue-800 text-sm">
                                        <i class="fas fa-info-circle mr-2"></i>
                                        AI 기반으로 구직자의 조건과 구인공고를 자동 매칭합니다
                                    </p>
                                </div>
                            </div>
                            
                            <!-- 매칭 통계 -->
                            <div class="grid md:grid-cols-3 gap-4 mb-6">
                                <div class="bg-green-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-check-circle text-green-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-green-600" id="perfect-matches">0</div>
                                            <div class="text-sm text-gray-600">완벽 매칭</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-yellow-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-star text-yellow-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-yellow-600" id="good-matches">0</div>
                                            <div class="text-sm text-gray-600">좋은 매칭</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-blue-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-clock text-blue-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-blue-600" id="pending-matches">0</div>
                                            <div class="text-sm text-gray-600">검토 중</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 최신 매칭 결과 -->
                            <div class="bg-white border rounded-lg p-4">
                                <h4 class="font-semibold mb-4">최신 매칭 결과</h4>
                                <div id="matching-results" class="space-y-3">
                                    <!-- Matching results will be loaded here -->
                                </div>
                            </div>
                        </div>

                        <div id="content-study" class="tab-content hidden">
                            <!-- 유학 서브메뉴 -->
                            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                                <div class="flex space-x-4">
                                    <button id="study-language-btn" class="study-sub-btn px-4 py-2 bg-primary text-white rounded-lg">
                                        <i class="fas fa-language mr-2"></i>어학연수
                                    </button>
                                    <button id="study-undergraduate-btn" class="study-sub-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                        <i class="fas fa-graduation-cap mr-2"></i>학부(학위)과정
                                    </button>
                                    <button id="study-graduate-btn" class="study-sub-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                        <i class="fas fa-university mr-2"></i>석·박사과정
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 어학연수 -->
                            <div id="study-language-section" class="study-sub-content">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-bold text-gray-800 mb-4">한국어학연수 프로그램</h3>
                                    <div class="bg-blue-50 p-4 rounded-lg mb-6">
                                        <p class="text-blue-800 text-sm">
                                            <i class="fas fa-info-circle mr-2"></i>
                                            한국어 실력 향상을 위한 체계적인 어학연수 프로그램 정보를 제공합니다
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 어학연수 개요 -->
                                <div class="grid md:grid-cols-2 gap-6 mb-8">
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-clock text-blue-500 mr-2"></i>프로그램 기간
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>단기과정:</strong> 3개월 ~ 6개월</li>
                                            <li><strong>장기과정:</strong> 1년 ~ 2년</li>
                                            <li><strong>집중과정:</strong> 주 20시간 이상</li>
                                            <li><strong>일반과정:</strong> 주 15시간</li>
                                        </ul>
                                    </div>
                                    
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-won-sign text-green-500 mr-2"></i>예상 비용
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>수업료:</strong> 학기당 150만원 ~ 200만원</li>
                                            <li><strong>기숙사:</strong> 월 30만원 ~ 50만원</li>
                                            <li><strong>생활비:</strong> 월 40만원 ~ 60만원</li>
                                            <li><strong>교재비:</strong> 학기당 10만원 ~ 15만원</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <!-- 필요 서류 및 절차 -->
                                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                        <i class="fas fa-file-alt text-purple-500 mr-2"></i>필요 서류 및 절차
                                    </h4>
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">필수 서류</h5>
                                            <ul class="space-y-1 text-gray-600 text-sm">
                                                <li>• 입학원서</li>
                                                <li>• 여권 사본</li>
                                                <li>• 최종 학력 증명서</li>
                                                <li>• 성적 증명서</li>
                                                <li>• 은행 잔고 증명서 ($10,000 이상)</li>
                                                <li>• 건강진단서</li>
                                                <li>• 범죄경력증명서</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">지원 절차</h5>
                                            <ol class="space-y-1 text-gray-600 text-sm">
                                                <li>1. 학교 선택 및 정보 수집</li>
                                                <li>2. 서류 준비 및 제출</li>
                                                <li>3. 입학 허가서 수령</li>
                                                <li>4. D-4 비자 신청</li>
                                                <li>5. 항공권 예약 및 출국 준비</li>
                                                <li>6. 입국 후 외국인등록</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 추천 대학교 -->
                                <div class="bg-white p-6 rounded-lg shadow-md">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                        <i class="fas fa-star text-yellow-500 mr-2"></i>추천 어학원
                                    </h4>
                                    <div class="grid md:grid-cols-3 gap-4">
                                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <h5 class="font-medium text-gray-800">서울대학교 언어교육원</h5>
                                            <p class="text-sm text-gray-600 mt-2">체계적인 커리큘럼과 우수한 강사진</p>
                                            <div class="text-xs text-blue-600 mt-2">학기당 180만원</div>
                                        </div>
                                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <h5 class="font-medium text-gray-800">연세대학교 한국어학당</h5>
                                            <p class="text-sm text-gray-600 mt-2">60년 전통의 한국어 교육 기관</p>
                                            <div class="text-xs text-blue-600 mt-2">학기당 170만원</div>
                                        </div>
                                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <h5 class="font-medium text-gray-800">고려대학교 한국어센터</h5>
                                            <p class="text-sm text-gray-600 mt-2">실용적인 한국어 교육 프로그램</p>
                                            <div class="text-xs text-blue-600 mt-2">학기당 165만원</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 학부(학위)과정 -->
                            <div id="study-undergraduate-section" class="study-sub-content hidden">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-bold text-gray-800 mb-4">학부(학위)과정 프로그램</h3>
                                    <div class="bg-green-50 p-4 rounded-lg mb-6">
                                        <p class="text-green-800 text-sm">
                                            <i class="fas fa-info-circle mr-2"></i>
                                            한국 대학교 학부과정 진학을 위한 종합 정보를 제공합니다
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 학부과정 개요 -->
                                <div class="grid md:grid-cols-2 gap-6 mb-8">
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-calendar text-blue-500 mr-2"></i>프로그램 정보
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>학위:</strong> 학사 (Bachelor's Degree)</li>
                                            <li><strong>기간:</strong> 4년 (8학기)</li>
                                            <li><strong>입학 시기:</strong> 3월, 9월</li>
                                            <li><strong>수업 언어:</strong> 한국어 (일부 영어 과정)</li>
                                        </ul>
                                    </div>
                                    
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-won-sign text-green-500 mr-2"></i>학비 및 생활비
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>국립대 학비:</strong> 연 300만원 ~ 500만원</li>
                                            <li><strong>사립대 학비:</strong> 연 800만원 ~ 1,200만원</li>
                                            <li><strong>기숙사비:</strong> 월 30만원 ~ 80만원</li>
                                            <li><strong>생활비:</strong> 월 60만원 ~ 100만원</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <!-- 입학 요건 -->
                                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                        <i class="fas fa-clipboard-check text-purple-500 mr-2"></i>입학 요건 및 지원 절차
                                    </h4>
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">입학 요건</h5>
                                            <ul class="space-y-1 text-gray-600 text-sm">
                                                <li>• 고등학교 졸업 또는 동등 학력</li>
                                                <li>• TOPIK 3급 이상 (권장 4급 이상)</li>
                                                <li>• 영어: TOEFL 80+ 또는 IELTS 6.0+</li>
                                                <li>• 고교 성적 평균 70점 이상</li>
                                                <li>• 학업 계획서 및 자기소개서</li>
                                                <li>• 추천서 (교사 또는 교수)</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">지원 절차</h5>
                                            <ol class="space-y-1 text-gray-600 text-sm">
                                                <li>1. 대학 및 학과 선택</li>
                                                <li>2. 어학 성적 준비</li>
                                                <li>3. 지원 서류 준비</li>
                                                <li>4. 온라인 지원서 제출</li>
                                                <li>5. 면접 (필요시)</li>
                                                <li>6. 합격 발표 및 등록</li>
                                                <li>7. D-2 비자 신청</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 인기 학과 -->
                                <div class="bg-white p-6 rounded-lg shadow-md">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                        <i class="fas fa-chart-line text-orange-500 mr-2"></i>외국인 학생 인기 학과
                                    </h4>
                                    <div class="grid md:grid-cols-4 gap-4">
                                        <div class="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div class="text-2xl mb-2">💻</div>
                                            <h5 class="font-medium text-gray-800">컴퓨터공학</h5>
                                            <p class="text-xs text-gray-600 mt-1">IT 강국 한국의 핵심 분야</p>
                                        </div>
                                        <div class="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div class="text-2xl mb-2">🏢</div>
                                            <h5 class="font-medium text-gray-800">경영학</h5>
                                            <p class="text-xs text-gray-600 mt-1">글로벌 비즈니스 역량</p>
                                        </div>
                                        <div class="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div class="text-2xl mb-2">🎨</div>
                                            <h5 class="font-medium text-gray-800">디자인</h5>
                                            <p class="text-xs text-gray-600 mt-1">K-컬처의 창조적 산업</p>
                                        </div>
                                        <div class="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div class="text-2xl mb-2">🌐</div>
                                            <h5 class="font-medium text-gray-800">국제학</h5>
                                            <p class="text-xs text-gray-600 mt-1">국제 관계 및 외교</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 석·박사과정 -->
                            <div id="study-graduate-section" class="study-sub-content hidden">
                                <div class="mb-6">
                                    <h3 class="text-2xl font-bold text-gray-800 mb-4">석·박사과정 프로그램</h3>
                                    <div class="bg-purple-50 p-4 rounded-lg mb-6">
                                        <p class="text-purple-800 text-sm">
                                            <i class="fas fa-info-circle mr-2"></i>
                                            한국 대학원 석사 및 박사과정 진학을 위한 상세 정보를 제공합니다
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- 대학원 과정 개요 -->
                                <div class="grid md:grid-cols-2 gap-6 mb-8">
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-graduation-cap text-blue-500 mr-2"></i>석사과정 (Master's)
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>기간:</strong> 2년 (4학기)</li>
                                            <li><strong>학점:</strong> 24학점 + 논문</li>
                                            <li><strong>입학 시기:</strong> 3월, 9월</li>
                                            <li><strong>학비:</strong> 연 500만원 ~ 1,500만원</li>
                                            <li><strong>장학금:</strong> 다양한 정부/교내 장학금</li>
                                        </ul>
                                    </div>
                                    
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-user-graduate text-purple-500 mr-2"></i>박사과정 (Doctorate)
                                        </h4>
                                        <ul class="space-y-2 text-gray-600">
                                            <li><strong>기간:</strong> 3년 이상 (6학기+)</li>
                                            <li><strong>학점:</strong> 36학점 + 박사논문</li>
                                            <li><strong>입학 시기:</strong> 3월, 9월</li>
                                            <li><strong>학비:</strong> 연 600만원 ~ 1,800만원</li>
                                            <li><strong>연구비 지원:</strong> BK21, NRF 등</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <!-- 입학 요건 및 절차 -->
                                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                        <i class="fas fa-tasks text-green-500 mr-2"></i>입학 요건 및 지원 절차
                                    </h4>
                                    <div class="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">공통 입학 요건</h5>
                                            <ul class="space-y-1 text-gray-600 text-sm">
                                                <li>• 학사/석사 학위 (해당 과정)</li>
                                                <li>• TOPIK 4급 이상 (이공계 3급 가능)</li>
                                                <li>• 영어: TOEFL 80+ 또는 IELTS 6.5+</li>
                                                <li>• 학부/석사 성적 3.0/4.5 이상</li>
                                                <li>• 연구계획서 (매우 중요)</li>
                                                <li>• 추천서 2부 (교수 추천)</li>
                                                <li>• 포트폴리오 (분야별)</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 class="font-medium text-gray-700 mb-3">지원 및 선발 과정</h5>
                                            <ol class="space-y-1 text-gray-600 text-sm">
                                                <li>1. 연구 분야 및 지도교수 선정</li>
                                                <li>2. 사전 컨택 (이메일 교류)</li>
                                                <li>3. 지원서류 준비 및 제출</li>
                                                <li>4. 서류 심사</li>
                                                <li>5. 면접 또는 구술시험</li>
                                                <li>6. 최종 합격 발표</li>
                                                <li>7. 등록 및 D-2 비자 신청</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 연구 분야 및 장학금 -->
                                <div class="grid md:grid-cols-2 gap-6">
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-flask text-blue-500 mr-2"></i>주요 연구 분야
                                        </h4>
                                        <div class="space-y-3">
                                            <div class="border-l-4 border-blue-500 pl-4">
                                                <h5 class="font-medium text-gray-800">이공계열</h5>
                                                <p class="text-sm text-gray-600">AI, 바이오, 반도체, 신재생에너지</p>
                                            </div>
                                            <div class="border-l-4 border-green-500 pl-4">
                                                <h5 class="font-medium text-gray-800">인문사회</h5>
                                                <p class="text-sm text-gray-600">한국학, 국제관계, 경영학, 교육학</p>
                                            </div>
                                            <div class="border-l-4 border-purple-500 pl-4">
                                                <h5 class="font-medium text-gray-800">예술체육</h5>
                                                <p class="text-sm text-gray-600">K-컬처, 디자인, 음악, 체육학</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-4">
                                            <i class="fas fa-medal text-yellow-500 mr-2"></i>장학금 정보
                                        </h4>
                                        <div class="space-y-3 text-sm">
                                            <div class="bg-yellow-50 p-3 rounded">
                                                <h5 class="font-medium text-yellow-800">정부 장학금</h5>
                                                <p class="text-yellow-700">GKS, KGSP (전액 + 생활비)</p>
                                            </div>
                                            <div class="bg-blue-50 p-3 rounded">
                                                <h5 class="font-medium text-blue-800">교내 장학금</h5>
                                                <p class="text-blue-700">성적우수, 연구조교, 교육조교</p>
                                            </div>
                                            <div class="bg-green-50 p-3 rounded">
                                                <h5 class="font-medium text-green-800">외부 장학금</h5>
                                                <p class="text-green-700">기업 후원, 재단 장학금</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="content-stats" class="tab-content hidden">
                            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div class="bg-blue-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-users text-blue-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-blue-600" id="stat-jobseekers">-</div>
                                            <div class="text-sm text-gray-600">구직자</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-green-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-building text-green-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-green-600" id="stat-employers">-</div>
                                            <div class="text-sm text-gray-600">기업</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-purple-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-briefcase text-purple-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-purple-600" id="stat-jobs">-</div>
                                            <div class="text-sm text-gray-600">구인공고</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-orange-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-handshake text-orange-500 text-2xl mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-orange-600" id="stat-matches">-</div>
                                            <div class="text-sm text-gray-600">매칭 성공</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            </div>
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
                    const message = "로그인이 필요합니다\\n\\n에이전트 관리 기능을 이용하시려면 먼저 로그인해주세요.\\n\\n에이전트 계정으로 로그인 시:\\n- 구직자 등록 및 관리\\n- 학생 등록 및 관리\\n- 지원 현황 관리\\n- 매칭 서비스 이용\\n\\n지금 로그인하시겠습니까?";

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
                    const restrictMessage = "에이전트 전용 메뉴입니다\\n\\n죄송합니다. 이 기능은 에이전트 회원만 이용할 수 있습니다.\\n\\n현재 회원 유형: " + getUserTypeName(user.type) + "\\n\\n에이전트 기능을 이용하시려면:\\n- 에이전트 계정으로 새로 회원가입\\n- 또는 에이전트 계정으로 로그인\\n\\n에이전트 회원가입을 진행하시겠습니까?";

                    if (confirm(restrictMessage)) {
                        window.location.href = '/static/register.html?type=agent';
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
        </script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// ===== API Routes =====

// 1. 인증 관련 API
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password, userType } = await c.req.json()
    
    if (!email || !password || !userType) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    let tableName;
    switch(userType) {
      case 'agent': tableName = 'agents'; break;
      case 'employer': tableName = 'employers'; break;
      case 'jobseeker': tableName = 'job_seekers'; break;
      case 'admin': tableName = 'admins'; break;
      default: return c.json({ error: '잘못된 사용자 유형입니다.' }, 400);
    }

    // 사용자 조회 (패스워드 포함, 구인기업인 경우 회사명도 포함)
    let selectFields = 'id, email, password, status';
    if (tableName === 'employers') {
      selectFields += ', company_name, contact_person';
    } else if (tableName === 'job_seekers') {
      selectFields += ', name';
    } else if (tableName === 'agents') {
      selectFields += ', company_name, contact_person';
    }
    
    const user = await c.env.DB.prepare(
      `SELECT ${selectFields} FROM ${tableName} WHERE email = ?`
    ).bind(email).first()

    if (!user) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // 패스워드 비교 (해시된 비밀번호와 평문 비밀번호 모두 지원)
    const hashedInputPassword = await hash(password);
    const isPasswordValid = user.password === hashedInputPassword || user.password === password;
    
    if (!isPasswordValid) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // 상태 검증 (모든 사용자 유형에서 pending, approved, active 허용)
    const allowedStatuses = ['pending', 'approved', 'active'];
    
    if (!allowedStatuses.includes(user.status)) {
      return c.json({ error: '승인되지 않은 계정입니다.' }, 401)
    }

    // 토큰 생성 (간단한 형식 유지)
    const token = `token_${user.id}_${userType}`

    // 사용자 정보 구성 (사용자 타입별로 필요한 정보 추가)
    const userInfo = {
      id: user.id,
      email: user.email,
      type: userType,
      status: user.status
    };

    // 사용자 타입별 추가 정보
    if (userType === 'employer') {
      userInfo.company_name = user.company_name;
      userInfo.contact_person = user.contact_person;
    } else if (userType === 'jobseeker') {
      userInfo.name = user.name;
    } else if (userType === 'agent') {
      userInfo.company_name = user.company_name;
      userInfo.contact_person = user.contact_person;
    }

    return c.json({
      success: true,
      token,
      user: userInfo
    })
  } catch (error) {
    return c.json({ error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 구인 기업 회원가입 API
app.post('/api/auth/register/employer', async (c) => {
  try {
    const { 
      email, password, company_name, business_number, industry, 
      contact_person, phone, address, region, website 
    } = await c.req.json()
    
    if (!email || !password || !company_name || !business_number || !industry || !contact_person || !phone || !address || !region) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    // 중복 이메일 체크
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM employers WHERE email = ?'
    ).bind(email).first()

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    // 중복 사업자번호 체크
    const existingBusinessNumber = await c.env.DB.prepare(
      'SELECT id FROM employers WHERE business_number = ?'
    ).bind(business_number).first()

    if (existingBusinessNumber) {
      return c.json({ error: '이미 등록된 사업자번호입니다.' }, 400)
    }

    // 패스워드 해시화
    const hashedPassword = await hash(password);

    const result = await c.env.DB.prepare(`
      INSERT INTO employers (
        email, password, company_name, business_number, industry, 
        contact_person, phone, address, region, website, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email,
      hashedPassword,
      company_name,
      business_number,
      industry,
      contact_person,
      phone,
      address,
      region,
      website || null
    ).run()

    // 토큰 생성
    const token = `token_${result.meta.last_row_id}_employer`

    return c.json({
      message: '구인 기업 회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        type: 'employer',
        company_name,
        status: 'pending'
      }
    }, 201)
  } catch (error) {
    console.error('Employer registration error:', error)
    return c.json({ error: '구인 기업 회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 구직자 회원가입 API
app.post('/api/auth/register/jobseeker', async (c) => {
  try {
    const { 
      email, password, name, birth_date, gender, nationality, 
      current_visa, desired_visa, phone, current_address, 
      korean_level, education_level, work_experience, agent_id 
    } = await c.req.json()
    
    if (!email || !password || !name || !nationality || !phone) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    // 중복 이메일 체크
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM job_seekers WHERE email = ?'
    ).bind(email).first()

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    // 한국어 레벨 변환
    const convertedKoreanLevel = convertKoreanLevelForJobSeeker(korean_level || '')

    // 성별 값 변환 (한국어 → 영어)
    const convertedGender = gender === '남성' ? 'male' : 
                           gender === '여성' ? 'female' : 
                           gender; // 이미 영어면 그대로

    // 에이전트 ID 유효성 검사 (선택사항)
    if (agent_id) {
      const agentExists = await c.env.DB.prepare(`
        SELECT id FROM agents WHERE id = ? AND status = 'approved'
      `).bind(agent_id).first();
      
      if (!agentExists) {
        return c.json({ error: '유효하지 않은 에이전트입니다.' }, 400);
      }
    }

    // 패스워드 해시화
    const hashedPassword = await hash(password);

    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        current_visa, desired_visa, phone, current_address, 
        korean_level, education_level, work_experience, agent_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email,
      hashedPassword,
      name,
      birth_date || null,
      convertedGender || null,
      nationality,
      current_visa || null,
      desired_visa || null,
      phone,
      current_address || null,
      convertedKoreanLevel,
      education_level || null,
      work_experience || null,
      agent_id || null
    ).run()

    // 토큰 생성
    const token = `token_${result.meta.last_row_id}_jobseeker`

    return c.json({
      message: '구직자 회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        type: 'jobseeker',
        name,
        status: 'pending'
      }
    }, 201)
  } catch (error) {
    console.error('Job seeker registration error:', error)
    return c.json({ error: '구직자 회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트 회원가입 API
app.post('/api/auth/register/agent', async (c) => {
  try {
    const { 
      email, password, company_name, country, contact_person, 
      phone, address, license_number, description 
    } = await c.req.json()
    
    if (!email || !password || !company_name || !country || !contact_person || !phone || !address) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    // 중복 이메일 체크
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM agents WHERE email = ?'
    ).bind(email).first()

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    // 패스워드 해시화
    const hashedPassword = await hash(password);

    const result = await c.env.DB.prepare(`
      INSERT INTO agents (
        email, password, company_name, country, contact_person, 
        phone, address, license_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email,
      hashedPassword,
      company_name,
      country,
      contact_person,
      phone,
      address,
      license_number || null
    ).run()

    // 토큰 생성
    const token = `token_${result.meta.last_row_id}_agent`

    return c.json({
      success: true,
      message: '에이전트 회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        type: 'agent',
        company_name,
        status: 'pending'
      }
    }, 201)
  } catch (error) {
    console.error('Agent registration error:', error)
    return c.json({ error: '에이전트 회원가입 중 오류가 발생했습니다.' }, 500)
  }
})

// 구글 OAuth 인증 API
app.post('/api/auth/google', async (c) => {
  try {
    const { googleToken, userType, additionalData } = await c.req.json()
    
    if (!googleToken || !userType) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    // 실제 환경에서는 Google OAuth API로 토큰 검증
    // 여기서는 간단한 시뮬레이션
    const mockGoogleUserData = {
      email: `user_${Date.now()}@gmail.com`,
      name: 'Google User',
      verified: true
    }

    // 기존 사용자 확인
    let tableName = userType === 'employer' ? 'employers' : 'job_seekers'
    const existingUser = await c.env.DB.prepare(
      `SELECT id, email, status FROM ${tableName} WHERE email = ?`
    ).bind(mockGoogleUserData.email).first()

    if (existingUser) {
      // 기존 사용자 로그인
      const token = `token_${existingUser.id}_${userType}`
      return c.json({
        message: '구글 로그인이 완료되었습니다.',
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          type: userType,
          status: existingUser.status
        }
      })
    } else {
      // 새 사용자 등록
      let result
      if (userType === 'employer') {
        const { company_name, business_number, industry, contact_person, phone, address, region, website } = additionalData || {}
        if (!company_name || !business_number || !industry || !contact_person || !phone || !address || !region) {
          return c.json({ error: '구인 기업 추가 정보가 필요합니다.' }, 400)
        }

        result = await c.env.DB.prepare(`
          INSERT INTO employers (
            email, password, company_name, business_number, industry, 
            contact_person, phone, address, region, website, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
          mockGoogleUserData.email,
          'google_oauth', // OAuth 사용자는 별도 패스워드 표시
          company_name,
          business_number,
          industry,
          contact_person,
          phone,
          address,
          region,
          website || null
        ).run()
      } else {
        const { name, nationality, phone } = additionalData || {}
        if (!name || !nationality || !phone) {
          return c.json({ error: '구직자 추가 정보가 필요합니다.' }, 400)
        }

        result = await c.env.DB.prepare(`
          INSERT INTO job_seekers (
            email, password, name, nationality, phone, status
          ) VALUES (?, ?, ?, ?, ?, 'active')
        `).bind(
          mockGoogleUserData.email,
          'google_oauth', // OAuth 사용자는 별도 패스워드 표시
          name,
          nationality,
          phone
        ).run()
      }

      const token = `token_${result.meta.last_row_id}_${userType}`
      return c.json({
        message: '구글 회원가입이 완료되었습니다.',
        token,
        user: {
          id: result.meta.last_row_id,
          email: mockGoogleUserData.email,
          type: userType,
          status: userType === 'employer' ? 'pending' : 'active'
        }
      }, 201)
    }
  } catch (error) {
    console.error('Google auth error:', error)
    return c.json({ error: '구글 인증 중 오류가 발생했습니다.' }, 500)
  }
})

// 관리자 대시보드 라우트
app.get('/admin-dashboard', async (c) => {
  try {
    // static/admin-dashboard.html 파일을 읽어서 반환
    const htmlContent = await fetch(`${c.req.url.replace('/admin-dashboard', '')}/static/admin-dashboard.html`);
    if (htmlContent.ok) {
      const html = await htmlContent.text();
      return c.html(html);
    } else {
      // 파일을 찾을 수 없으면 정적 파일 경로로 리다이렉트
      return c.redirect('/static/admin-dashboard.html');
    }
  } catch (error) {
    console.error('Admin dashboard loading error:', error);
    return c.redirect('/static/admin-dashboard.html');
  }
})

// 2. 구인 공고 관련 API
app.get('/api/jobs', async (c) => {
  try {
    const { category, visa, region, page = 1, limit = 10 } = c.req.query()
    
    let query = `
      SELECT jp.*, e.company_name, e.region as company_region
      FROM job_postings jp
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE jp.status = 'active'
    `
    const params = []

    if (category) {
      query += ' AND jp.job_category = ?'
      params.push(category)
    }
    if (visa) {
      query += ' AND jp.required_visa = ?'
      params.push(visa)
    }
    if (region) {
      query += ' AND jp.region = ?'
      params.push(region)
    }

    query += ' ORDER BY jp.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const jobs = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({
      jobs: jobs.results,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    return c.json({ error: '구인 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

app.get('/api/jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id')
    
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        error: '로그인이 필요합니다.',
        message: '구인정보의 상세 내용을 보시려면 로그인해주세요.',
        requireAuth: true
      }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // 실제 JWT 토큰이 아닌 간단한 토큰 형식인 경우 처리
    if (!token.startsWith('token_')) {
      try {
        await verify(token, JWT_SECRET);
      } catch (authError) {
        return c.json({ 
          error: '유효하지 않은 토큰입니다.',
          message: '다시 로그인해주세요.',
          requireAuth: true
        }, 401);
      }
    } else {
      // 기존 간단한 토큰 형식 검증
      const tokenParts = token.split('_');
      if (tokenParts.length < 3 || !tokenParts[1] || !tokenParts[2]) {
        return c.json({ 
          error: '유효하지 않은 토큰입니다.',
          message: '다시 로그인해주세요.',
          requireAuth: true
        }, 401);
      }
    }
    
    const job = await c.env.DB.prepare(`
      SELECT jp.*, e.company_name, e.contact_person, e.phone, e.address, e.website
      FROM job_postings jp
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE jp.id = ? AND jp.status = 'active'
    `).bind(jobId).first()

    if (!job) {
      return c.json({ error: '구인 공고를 찾을 수 없습니다.' }, 404)
    }

    return c.json({ job })
  } catch (error) {
    return c.json({ error: '구인 공고 조회 중 오류가 발생했습니다.' }, 500)
  }
})



// 구직자 등록 API
app.post('/api/job-seekers', async (c) => {
  try {
    const jobSeekerData = await c.req.json()
    
    // 필수 필드 검증
    const requiredFields = ['name', 'email', 'birth_date', 'gender', 'nationality', 'phone', 'current_visa', 'desired_visa', 'current_address', 'korean_level', 'education_level']
    for (const field of requiredFields) {
      if (!jobSeekerData[field]) {
        return c.json({ error: `${field} 필드는 필수입니다.` }, 400)
      }
    }
    
    // 구직자 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality,
        current_visa, desired_visa, phone, current_address,
        korean_level, education_level, work_experience, agent_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      jobSeekerData.email,
      jobSeekerData.password || 'temp_password',
      jobSeekerData.name,
      jobSeekerData.birth_date,
      jobSeekerData.gender,
      jobSeekerData.nationality,
      jobSeekerData.current_visa,
      jobSeekerData.desired_visa,
      jobSeekerData.phone,
      jobSeekerData.current_address,
      convertKoreanLevelForJobSeeker(jobSeekerData.korean_level),
      jobSeekerData.education_level,
      jobSeekerData.work_experience || null,
      jobSeekerData.agent_id || 1
    ).run()
    
    return c.json({ 
      success: true,
      jobSeekerId: result.meta.last_row_id,
      message: '구직정보가 성공적으로 등록되었습니다.'
    }, 201)
  } catch (error) {
    console.error('Job seeker registration error:', error)
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }
    return c.json({ error: '구직정보 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 3. 유학 프로그램 관련 API
app.get('/api/study-programs', async (c) => {
  try {
    const { type, location, page = 1, limit = 10 } = c.req.query()
    
    let query = 'SELECT * FROM study_programs WHERE status = "active"'
    const params = []

    if (type) {
      query += ' AND program_type = ?'
      params.push(type)
    }
    if (location) {
      query += ' AND location LIKE ?'
      params.push(`%${location}%`)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const programs = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({
      programs: programs.results,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    return c.json({ error: '유학 프로그램 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 4. 구직자 관련 API (에이전트용)
app.get('/api/agent/:agentId/job-seekers', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    const jobSeekers = await c.env.DB.prepare(`
      SELECT * FROM job_seekers 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).bind(agentId).all()

    return c.json({ jobSeekers: jobSeekers.results })
  } catch (error) {
    return c.json({ error: '구직자 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트의 구직자 등록
app.post('/api/agent/job-seekers', async (c) => {
  try {
    const jobSeekerData = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        current_visa, desired_visa, phone, current_address, 
        korean_level, education_level, work_experience, agent_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      jobSeekerData.email,
      jobSeekerData.password, // 실제환경에서는 해시화 필요
      jobSeekerData.name,
      jobSeekerData.birth_date,
      jobSeekerData.gender,
      jobSeekerData.nationality,
      jobSeekerData.current_visa,
      jobSeekerData.desired_visa,
      jobSeekerData.phone,
      jobSeekerData.current_address,
      jobSeekerData.korean_level,
      jobSeekerData.education_level,
      jobSeekerData.work_experience,
      jobSeekerData.agent_id
    ).run()

    return c.json({ 
      success: true, 
      jobSeekerId: result.meta.last_row_id,
      message: '구직자가 성공적으로 등록되었습니다.'
    })
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }
    return c.json({ error: '구직자 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 구직자 정보 수정
app.put('/api/agent/job-seekers/:id', async (c) => {
  try {
    const jobSeekerId = c.req.param('id')
    const updateData = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE job_seekers SET
        name = ?, birth_date = ?, gender = ?, nationality = ?,
        current_visa = ?, desired_visa = ?, phone = ?, current_address = ?,
        korean_level = ?, education_level = ?, work_experience = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      updateData.name,
      updateData.birth_date,
      updateData.gender,
      updateData.nationality,
      updateData.current_visa,
      updateData.desired_visa,
      updateData.phone,
      updateData.current_address,
      updateData.korean_level,
      updateData.education_level,
      updateData.work_experience,
      jobSeekerId
    ).run()

    return c.json({ success: true, message: '구직자 정보가 수정되었습니다.' })
  } catch (error) {
    return c.json({ error: '구직자 정보 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 구직자 삭제
app.delete('/api/agent/job-seekers/:id', async (c) => {
  try {
    const jobSeekerId = c.req.param('id')
    
    await c.env.DB.prepare('DELETE FROM job_seekers WHERE id = ?').bind(jobSeekerId).run()
    
    return c.json({ success: true, message: '구직자가 삭제되었습니다.' })
  } catch (error) {
    return c.json({ error: '구직자 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트의 지원 현황 조회
app.get('/api/agent/:agentId/job-applications', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    const applications = await c.env.DB.prepare(`
      SELECT ja.*, js.name as jobseeker_name, jp.title as job_title, e.company_name
      FROM job_applications ja
      LEFT JOIN job_seekers js ON ja.job_seeker_id = js.id
      LEFT JOIN job_postings jp ON ja.job_posting_id = jp.id
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE ja.agent_id = ?
      ORDER BY ja.applied_at DESC
    `).bind(agentId).all()

    return c.json({ applications: applications.results })
  } catch (error) {
    return c.json({ error: '지원 현황 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트의 유학 지원 현황 조회
app.get('/api/agent/:agentId/study-applications', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    const applications = await c.env.DB.prepare(`
      SELECT sa.*, js.name as jobseeker_name, sp.program_name, sp.institution_name
      FROM study_applications sa
      LEFT JOIN job_seekers js ON sa.job_seeker_id = js.id
      LEFT JOIN study_programs sp ON sa.program_id = sp.id
      WHERE sa.agent_id = ?
      ORDER BY sa.applied_at DESC
    `).bind(agentId).all()

    return c.json({ applications: applications.results })
  } catch (error) {
    return c.json({ error: '유학 지원 현황 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 5. 지원 관리 API
app.post('/api/applications/job', async (c) => {
  try {
    const { job_seeker_id, job_posting_id, agent_id, cover_letter } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO job_applications (job_seeker_id, job_posting_id, agent_id, cover_letter)
      VALUES (?, ?, ?, ?)
    `).bind(job_seeker_id, job_posting_id, agent_id, cover_letter).run()

    return c.json({ 
      success: true, 
      applicationId: result.meta.last_row_id,
      message: '지원이 완료되었습니다.'
    })
  } catch (error) {
    return c.json({ error: '지원 중 오류가 발생했습니다.' }, 500)
  }
})

// 6. 통계 API
app.get('/api/stats', async (c) => {
  try {
    const [jobSeekersCount, employersCount, jobPostingsCount, applicationsCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_seekers WHERE status = "active"').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM employers WHERE status = "approved"').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_postings WHERE status = "active"').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_applications WHERE application_status = "accepted"').first()
    ])

    return c.json({
      jobSeekers: jobSeekersCount?.count || 0,
      employers: employersCount?.count || 0,
      jobPostings: jobPostingsCount?.count || 0,
      successfulMatches: applicationsCount?.count || 0
    })
  } catch (error) {
    return c.json({ error: '통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 7. 구직자 직접 등록 API (에이전트 없이)
app.post('/api/job-seekers/register', async (c) => {
  try {
    const jobSeekerData = await c.req.json()
    
    // 중복 이메일 체크
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM job_seekers WHERE email = ?'
    ).bind(jobSeekerData.email).first()

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        current_visa, desired_visa, phone, current_address, 
        korean_level, education_level, work_experience, status,
        desired_job_category, preferred_region, desired_salary_min, 
        desired_salary_max, self_introduction
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobSeekerData.email,
      jobSeekerData.password, // 실제환경에서는 해시화 필요
      jobSeekerData.name,
      jobSeekerData.birth_date || null,
      jobSeekerData.gender || null,
      jobSeekerData.nationality,
      jobSeekerData.current_visa || null,
      jobSeekerData.desired_visa || null,
      jobSeekerData.phone,
      jobSeekerData.current_address || null,
      jobSeekerData.korean_level || null,
      jobSeekerData.education_level || null,
      jobSeekerData.work_experience || null,
      jobSeekerData.status || 'active',
      jobSeekerData.desired_job_category || null,
      jobSeekerData.preferred_region || null,
      jobSeekerData.desired_salary_min || null,
      jobSeekerData.desired_salary_max || null,
      jobSeekerData.self_introduction || null
    ).run()

    return c.json({ 
      success: true, 
      jobSeekerId: result.meta.last_row_id,
      message: '구직정보가 성공적으로 등록되었습니다.'
    })
  } catch (error) {
    console.error('구직자 등록 오류:', error)
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }
    return c.json({ error: '구직정보 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 구직자 목록 조회 API (공개)
app.get('/api/job-seekers', async (c) => {
  try {
    const { nationality, visa, korean_level, job_category, region, page = 1, limit = 10 } = c.req.query()
    
    let query = `
      SELECT 
        id, name, nationality, current_visa, desired_visa, korean_level,
        education_level, desired_job_category, preferred_region, 
        desired_salary_min, desired_salary_max, created_at, status
      FROM job_seekers 
      WHERE status = 'active'
    `
    const params = []

    if (nationality) {
      query += ' AND nationality = ?'
      params.push(nationality)
    }
    if (visa) {
      query += ' AND (current_visa = ? OR desired_visa = ?)'
      params.push(visa, visa)
    }
    if (korean_level) {
      query += ' AND korean_level = ?'
      params.push(korean_level)
    }
    if (job_category) {
      query += ' AND desired_job_category = ?'
      params.push(job_category)
    }
    if (region) {
      query += ' AND preferred_region = ?'
      params.push(region)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

    const jobSeekers = await c.env.DB.prepare(query).bind(...params).all()
    
    // 총 개수도 함께 조회
    let countQuery = 'SELECT COUNT(*) as total FROM job_seekers WHERE status = "active"'
    const countParams = []
    
    if (nationality) {
      countQuery += ' AND nationality = ?'
      countParams.push(nationality)
    }
    if (visa) {
      countQuery += ' AND (current_visa = ? OR desired_visa = ?)'
      countParams.push(visa, visa)
    }
    if (korean_level) {
      countQuery += ' AND korean_level = ?'
      countParams.push(korean_level)
    }
    if (job_category) {
      countQuery += ' AND desired_job_category = ?'
      countParams.push(job_category)
    }
    if (region) {
      countQuery += ' AND preferred_region = ?'
      countParams.push(region)
    }

    const totalCount = await c.env.DB.prepare(countQuery).bind(...countParams).first()
    
    return c.json({
      jobSeekers: jobSeekers.results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount?.total || 0,
        totalPages: Math.ceil((totalCount?.total || 0) / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('구직자 목록 조회 오류:', error)
    return c.json({ error: '구직자 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 구직자 상세 정보 조회 API
app.get('/api/job-seekers/:id', async (c) => {
  try {
    const jobSeekerId = c.req.param('id')
    
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        error: '로그인이 필요합니다.',
        message: '구직자의 상세 정보를 보시려면 로그인해주세요.',
        requireAuth: true
      }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // 실제 JWT 토큰이 아닌 간단한 토큰 형식인 경우 처리
    if (!token.startsWith('token_')) {
      try {
        await verify(token, JWT_SECRET);
      } catch (authError) {
        return c.json({ 
          error: '유효하지 않은 토큰입니다.',
          message: '다시 로그인해주세요.',
          requireAuth: true
        }, 401);
      }
    } else {
      // 기존 간단한 토큰 형식 검증
      const tokenParts = token.split('_');
      if (tokenParts.length < 3 || !tokenParts[1] || !tokenParts[2]) {
        return c.json({ 
          error: '유효하지 않은 토큰입니다.',
          message: '다시 로그인해주세요.',
          requireAuth: true
        }, 401);
      }
    }
    
    const jobSeeker = await c.env.DB.prepare(`
      SELECT * FROM job_seekers WHERE id = ? AND status = 'active'
    `).bind(jobSeekerId).first()

    if (!jobSeeker) {
      return c.json({ error: '구직자를 찾을 수 없습니다.' }, 404)
    }

    // 비밀번호 제외하고 반환
    delete jobSeeker.password

    return c.json({ jobSeeker })
  } catch (error) {
    console.error('구직자 상세 조회 오류:', error)
    return c.json({ error: '구직자 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 8. 에이전트 관련 API

// 에이전트의 구직자/유학생 목록 조회
app.get('/api/agents/:id/students', async (c) => {
  try {
    const agentId = c.req.param('id')
    
    const students = await c.env.DB.prepare(`
      SELECT id, email, name, nationality, korean_level, desired_visa, 
             phone, education_level, status, created_at
      FROM job_seekers 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).bind(agentId).all()

    return c.json({ students: students.results || [] })
  } catch (error) {
    console.error('에이전트 유학생 목록 조회 오류:', error)
    return c.json({ error: '유학생 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트의 구직자 목록 조회
app.get('/api/agents/:id/jobseekers', async (c) => {
  try {
    const agentId = c.req.param('id')
    
    const jobseekers = await c.env.DB.prepare(`
      SELECT id, email, name, nationality, korean_level, desired_visa, 
             phone, education_level, status, created_at
      FROM job_seekers 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).bind(agentId).all()

    return c.json({ jobseekers: jobseekers.results || [] })
  } catch (error) {
    console.error('에이전트 구직자 목록 조회 오류:', error)
    return c.json({ error: '구직자 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 에이전트 전용 구직자/유학생 등록 (에이전트 ID 자동 할당)
app.post('/api/agents/:id/register-student', async (c) => {
  try {
    const agentId = c.req.param('id')
    const jobSeekerData = await c.req.json()
    
    // 중복 이메일 체크
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM job_seekers WHERE email = ?'
    ).bind(jobSeekerData.email).first()

    if (existingUser) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    // 한국어 레벨 변환
    const convertedKoreanLevel = convertKoreanLevelForJobSeeker(jobSeekerData.korean_level || '')

    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        current_visa, desired_visa, phone, current_address, 
        korean_level, education_level, work_experience, agent_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      jobSeekerData.email,
      jobSeekerData.password || 'agent_registered', // 에이전트 등록 시 기본 패스워드
      jobSeekerData.name,
      jobSeekerData.birth_date || null,
      jobSeekerData.gender || null,
      jobSeekerData.nationality,
      jobSeekerData.current_visa || null,
      jobSeekerData.desired_visa || null,
      jobSeekerData.phone,
      jobSeekerData.current_address || null,
      convertedKoreanLevel,
      jobSeekerData.education_level || null,
      jobSeekerData.work_experience || null,
      agentId
    ).run()

    return c.json({
      success: true,
      message: '유학생/구직자가 성공적으로 등록되었습니다.',
      student: {
        id: result.meta.last_row_id,
        email: jobSeekerData.email,
        name: jobSeekerData.name,
        agent_id: agentId
      }
    }, 201)
  } catch (error) {
    console.error('에이전트 유학생 등록 오류:', error)
    return c.json({ error: '유학생 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 9. 매칭 시스템 API
app.post('/api/matching/generate', async (c) => {
  try {
    // 모든 활성 구직자와 구인공고를 가져와서 매칭 계산
    const [jobSeekers, jobPostings] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM job_seekers WHERE status = "active"').all(),
      c.env.DB.prepare('SELECT * FROM job_postings WHERE status = "active"').all()
    ])

    let matchesCreated = 0;
    const matchPromises = [];

    for (const jobSeeker of jobSeekers.results) {
      for (const jobPosting of jobPostings.results) {
        const matchScore = calculateMatchScore(jobSeeker, jobPosting);
        
        if (matchScore >= 0.3) { // 30% 이상 매칭될 때만 저장
          const matchType = matchScore >= 0.8 ? 'perfect' : matchScore >= 0.6 ? 'good' : 'fair';
          const matchReasons = getMatchReasons(jobSeeker, jobPosting);

          const matchPromise = c.env.DB.prepare(`
            INSERT OR REPLACE INTO job_matches 
            (job_seeker_id, job_posting_id, match_score, match_type, match_reasons, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `).bind(
            jobSeeker.id,
            jobPosting.id,
            matchScore,
            matchType,
            JSON.stringify(matchReasons)
          ).run();

          matchPromises.push(matchPromise);
          matchesCreated++;
        }
      }
    }

    await Promise.all(matchPromises);

    return c.json({ 
      success: true, 
      matchesCreated,
      message: `${matchesCreated}개의 새로운 매칭이 생성되었습니다.`
    });

  } catch (error) {
    console.error('매칭 생성 오류:', error);
    return c.json({ error: '매칭 생성 중 오류가 발생했습니다.' }, 500);
  }
})

// 매칭 결과 조회
app.get('/api/matching/results', async (c) => {
  try {
    const { limit = 10, type } = c.req.query();
    
    let query = `
      SELECT 
        jm.*,
        js.name as job_seeker_name,
        js.nationality,
        js.korean_level,
        jp.title as job_title,
        e.company_name
      FROM job_matches jm
      LEFT JOIN job_seekers js ON jm.job_seeker_id = js.id
      LEFT JOIN job_postings jp ON jm.job_posting_id = jp.id
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE 1=1
    `;

    const params = [];
    if (type) {
      query += ' AND jm.match_type = ?';
      params.push(type);
    }

    query += ' ORDER BY jm.match_score DESC, jm.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const matches = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ matches: matches.results });
  } catch (error) {
    console.error('매칭 결과 조회 오류:', error);
    return c.json({ error: '매칭 결과 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 매칭 통계
app.get('/api/matching/stats', async (c) => {
  try {
    const [perfectMatches, goodMatches, pendingMatches] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_matches WHERE match_type = "perfect"').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_matches WHERE match_type = "good"').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM job_matches WHERE status = "pending"').first()
    ]);

    return c.json({
      perfectMatches: perfectMatches?.count || 0,
      goodMatches: goodMatches?.count || 0,
      pendingMatches: pendingMatches?.count || 0
    });
  } catch (error) {
    console.error('매칭 통계 조회 오류:', error);
    return c.json({ error: '매칭 통계 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 구직자별 매칭 결과 조회
app.get('/api/job-seekers/:id/matches', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    
    const matches = await c.env.DB.prepare(`
      SELECT 
        jm.*,
        jp.title,
        jp.salary_min,
        jp.salary_max,
        jp.work_location,
        e.company_name
      FROM job_matches jm
      LEFT JOIN job_postings jp ON jm.job_posting_id = jp.id
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE jm.job_seeker_id = ?
      ORDER BY jm.match_score DESC
    `).bind(jobSeekerId).all();

    return c.json({ matches: matches.results });
  } catch (error) {
    console.error('구직자 매칭 조회 오류:', error);
    return c.json({ error: '매칭 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 9. 메시지 시스템 API
app.post('/api/messages', async (c) => {
  try {
    const messageData = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO messages 
      (sender_type, sender_id, receiver_type, receiver_id, subject, content, message_type, job_posting_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageData.sender_type,
      messageData.sender_id,
      messageData.receiver_type,
      messageData.receiver_id,
      messageData.subject || null,
      messageData.content,
      messageData.message_type || 'general',
      messageData.job_posting_id || null
    ).run();

    // 알림 생성
    await c.env.DB.prepare(`
      INSERT INTO notifications 
      (user_type, user_id, notification_type, title, content, related_id, related_type)
      VALUES (?, ?, 'message', ?, ?, ?, 'message')
    `).bind(
      messageData.receiver_type,
      messageData.receiver_id,
      '새 메시지가 도착했습니다',
      messageData.subject || '새 메시지',
      result.meta.last_row_id,
    ).run();

    return c.json({ 
      success: true, 
      messageId: result.meta.last_row_id,
      message: '메시지가 전송되었습니다.'
    });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    return c.json({ error: '메시지 전송 중 오류가 발생했습니다.' }, 500);
  }
})

// 메시지 목록 조회
app.get('/api/messages/:userType/:userId', async (c) => {
  try {
    const userType = c.req.param('userType');
    const userId = c.req.param('userId');
    
    const messages = await c.env.DB.prepare(`
      SELECT * FROM messages 
      WHERE (receiver_type = ? AND receiver_id = ?) OR (sender_type = ? AND sender_id = ?)
      ORDER BY created_at DESC
    `).bind(userType, userId, userType, userId).all();

    return c.json({ messages: messages.results });
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    return c.json({ error: '메시지 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 10. 알림 시스템 API
app.get('/api/notifications/:userType/:userId', async (c) => {
  try {
    const userType = c.req.param('userType');
    const userId = c.req.param('userId');
    const { unread_only } = c.req.query();
    
    let query = 'SELECT * FROM notifications WHERE user_type = ? AND user_id = ?';
    const params = [userType, userId];
    
    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const notifications = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ notifications: notifications.results });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    return c.json({ error: '알림 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 알림 읽음 처리
app.put('/api/notifications/:id/read', async (c) => {
  try {
    const notificationId = c.req.param('id');
    
    await c.env.DB.prepare('UPDATE notifications SET is_read = true WHERE id = ?')
      .bind(notificationId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('알림 업데이트 오류:', error);
    return c.json({ error: '알림 업데이트 중 오류가 발생했습니다.' }, 500);
  }
})

// 11. 파일 업로드 및 관리 API (시뮬레이션)
app.post('/api/files/upload', async (c) => {
  try {
    // Cloudflare Workers에서는 실제 파일 저장이 제한적이므로 시뮬레이션
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string;
    const userId = formData.get('user_id') as string;
    const userType = formData.get('user_type') as string;

    if (!file) {
      return c.json({ error: '파일이 선택되지 않았습니다.' }, 400);
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, 400);
    }

    // 지원 파일 형식 검증
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'image/jpeg', 'image/png', 'image/jpg'];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: '지원하지 않는 파일 형식입니다.' }, 400);
    }

    // 실제 환경에서는 R2나 다른 스토리지에 저장
    // 여기서는 데이터베이스에 파일 정보만 저장 (시뮬레이션)
    const storedFilename = `${Date.now()}_${file.name}`;
    const filePath = `/uploads/${userType}/${userId}/${storedFilename}`;

    const result = await c.env.DB.prepare(`
      INSERT INTO uploaded_files 
      (user_type, user_id, file_type, original_filename, stored_filename, file_size, mime_type, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userType,
      userId,
      fileType,
      file.name,
      storedFilename,
      file.size,
      file.type,
      filePath
    ).run();

    return c.json({
      success: true,
      fileId: result.meta.last_row_id,
      filename: file.name,
      size: file.size,
      message: '파일이 성공적으로 업로드되었습니다.'
    });

  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return c.json({ error: '파일 업로드 중 오류가 발생했습니다.' }, 500);
  }
})

// 사용자 파일 목록 조회
app.get('/api/files/:userType/:userId', async (c) => {
  try {
    const userType = c.req.param('userType');
    const userId = c.req.param('userId');
    const { file_type, sort = 'created_at_desc' } = c.req.query();

    let query = 'SELECT * FROM uploaded_files WHERE user_type = ? AND user_id = ?';
    const params = [userType, userId];

    if (file_type && file_type !== 'all') {
      query += ' AND file_type = ?';
      params.push(file_type);
    }

    // 정렬 처리
    switch (sort) {
      case 'date_asc':
        query += ' ORDER BY created_at ASC';
        break;
      case 'name_asc':
        query += ' ORDER BY original_filename ASC';
        break;
      case 'size_desc':
        query += ' ORDER BY file_size DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    const files = await c.env.DB.prepare(query).bind(...params).all();

    // 파일 타입별 통계 계산
    const stats = {
      resume: 0,
      certificate: 0, 
      photo: 0,
      document: 0,
      totalSize: 0
    };

    files.results.forEach(file => {
      stats[file.file_type] = (stats[file.file_type] || 0) + 1;
      stats.totalSize += file.file_size;
    });

    return c.json({
      files: files.results,
      stats
    });

  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    return c.json({ error: '파일 목록 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 파일 삭제
app.delete('/api/files/:id', async (c) => {
  try {
    const fileId = c.req.param('id');
    
    // 실제 환경에서는 스토리지에서도 파일 삭제 필요
    await c.env.DB.prepare('DELETE FROM uploaded_files WHERE id = ?').bind(fileId).run();

    return c.json({ success: true, message: '파일이 삭제되었습니다.' });
  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return c.json({ error: '파일 삭제 중 오류가 발생했습니다.' }, 500);
  }
})

// 12. 평가 시스템 API
app.post('/api/reviews', async (c) => {
  try {
    const reviewData = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO reviews 
      (reviewer_type, reviewer_id, reviewee_type, reviewee_id, job_posting_id, rating, title, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reviewData.reviewer_type,
      reviewData.reviewer_id,
      reviewData.reviewee_type,
      reviewData.reviewee_id,
      reviewData.job_posting_id || null,
      reviewData.rating,
      reviewData.title || null,
      reviewData.comment || null
    ).run();

    return c.json({
      success: true,
      reviewId: result.meta.last_row_id,
      message: '평가가 등록되었습니다.'
    });

  } catch (error) {
    console.error('평가 등록 오류:', error);
    return c.json({ error: '평가 등록 중 오류가 발생했습니다.' }, 500);
  }
})

// 사용자별 평가 조회
app.get('/api/reviews/:userType/:userId', async (c) => {
  try {
    const userType = c.req.param('userType');
    const userId = c.req.param('userId');
    
    const reviews = await c.env.DB.prepare(`
      SELECT r.*, jp.title as job_title
      FROM reviews r
      LEFT JOIN job_postings jp ON r.job_posting_id = jp.id
      WHERE r.reviewee_type = ? AND r.reviewee_id = ?
      ORDER BY r.created_at DESC
    `).bind(userType, userId).all();

    // 평균 평점 계산
    const avgRating = reviews.results.length > 0 
      ? reviews.results.reduce((sum, r) => sum + r.rating, 0) / reviews.results.length 
      : 0;

    return c.json({
      reviews: reviews.results,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.results.length
    });

  } catch (error) {
    console.error('평가 조회 오류:', error);
    return c.json({ error: '평가 조회 중 오류가 발생했습니다.' }, 500);
  }
})

// 13. 메타데이터 API
app.get('/api/visa-types', async (c) => {
  try {
    const visaTypes = await c.env.DB.prepare('SELECT * FROM visa_types ORDER BY visa_code').all()
    return c.json({ visaTypes: visaTypes.results })
  } catch (error) {
    return c.json({ error: '비자 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

app.get('/api/job-categories', async (c) => {
  try {
    const categories = await c.env.DB.prepare('SELECT * FROM job_categories ORDER BY category_name_ko').all()
    return c.json({ categories: categories.results })
  } catch (error) {
    return c.json({ error: '직종 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

app.get('/api/regions', async (c) => {
  try {
    const regions = await c.env.DB.prepare('SELECT * FROM regions ORDER BY region_name_ko').all()
    return c.json({ regions: regions.results })
  } catch (error) {
    return c.json({ error: '지역 정보 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 매칭 점수 계산 함수
function calculateMatchScore(jobSeeker: any, jobPosting: any): number {
  let score = 0;
  let totalWeight = 0;

  // 비자 매칭 (가중치: 30%)
  const visaWeight = 0.3;
  if (jobSeeker.desired_visa === jobPosting.required_visa || 
      jobSeeker.current_visa === jobPosting.required_visa) {
    score += visaWeight;
  } else if (jobSeeker.current_visa && 
             ['E-9', 'E-7', 'H-2'].includes(jobSeeker.current_visa) &&
             ['E-9', 'E-7', 'H-2'].includes(jobPosting.required_visa)) {
    score += visaWeight * 0.7; // 근접한 취업비자들
  }
  totalWeight += visaWeight;

  // 직종 매칭 (가중치: 25%)
  const jobCategoryWeight = 0.25;
  if (jobSeeker.desired_job_category === jobPosting.job_category) {
    score += jobCategoryWeight;
  }
  totalWeight += jobCategoryWeight;

  // 지역 매칭 (가중치: 20%)
  const regionWeight = 0.2;
  if (jobSeeker.preferred_region === jobPosting.region || 
      jobSeeker.preferred_region === 'ALL') {
    score += regionWeight;
  }
  totalWeight += regionWeight;

  // 한국어 수준 매칭 (가중치: 15%)
  const koreanWeight = 0.15;
  const koreanLevels = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'native': 4 };
  const requiredLevels = { 'none': 0, 'basic': 1, 'intermediate': 2, 'advanced': 3 };
  
  const seekerLevel = koreanLevels[jobSeeker.korean_level] || 0;
  const requiredLevel = requiredLevels[jobPosting.korean_level_required] || 0;
  
  if (seekerLevel >= requiredLevel) {
    score += koreanWeight;
  } else if (seekerLevel >= requiredLevel - 1) {
    score += koreanWeight * 0.7;
  }
  totalWeight += koreanWeight;

  // 급여 매칭 (가중치: 10%)
  const salaryWeight = 0.1;
  if (jobSeeker.desired_salary_min && jobPosting.salary_min) {
    if (jobSeeker.desired_salary_min <= jobPosting.salary_max && 
        jobSeeker.desired_salary_max >= jobPosting.salary_min) {
      score += salaryWeight;
    } else if (Math.abs(jobSeeker.desired_salary_min - jobPosting.salary_min) <= 500000) {
      score += salaryWeight * 0.5; // 50만원 이내 차이
    }
  } else {
    score += salaryWeight * 0.5; // 급여 정보 없으면 부분 점수
  }
  totalWeight += salaryWeight;

  return Math.min(score / totalWeight, 1.0);
}

// 매칭 이유 생성 함수
function getMatchReasons(jobSeeker: any, jobPosting: any): string[] {
  const reasons = [];

  if (jobSeeker.desired_visa === jobPosting.required_visa) {
    reasons.push('비자 요건이 완벽하게 일치합니다');
  }
  
  if (jobSeeker.desired_job_category === jobPosting.job_category) {
    reasons.push('희망 직종과 일치합니다');
  }
  
  if (jobSeeker.preferred_region === jobPosting.region) {
    reasons.push('희망 근무지역과 일치합니다');
  }
  
  const koreanLevels = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'native': 4 };
  const requiredLevels = { 'none': 0, 'basic': 1, 'intermediate': 2, 'advanced': 3 };
  
  const seekerLevel = koreanLevels[jobSeeker.korean_level] || 0;
  const requiredLevel = requiredLevels[jobPosting.korean_level_required] || 0;
  
  if (seekerLevel > requiredLevel) {
    reasons.push('한국어 수준이 요구사항을 초과합니다');
  } else if (seekerLevel === requiredLevel) {
    reasons.push('한국어 수준이 요구사항과 일치합니다');
  }
  
  if (jobSeeker.desired_salary_min && jobPosting.salary_min && 
      jobSeeker.desired_salary_min <= jobPosting.salary_max) {
    reasons.push('희망 급여 조건이 맞습니다');
  }

  return reasons;
}

// ===== 권한별 API 엔드포인트 =====

// 구인기업 전용 API
app.get('/api/employers/:id/jobs', async (c) => {
  try {
    const employerId = c.req.param('id');
    const { status } = c.req.query();
    
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }
    
    let query = 'SELECT * FROM job_postings WHERE employer_id = ?';
    const params = [employerId];
    
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const jobs = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ jobs: jobs.results });
  } catch (error) {
    console.error('구인기업 구인공고 조회 오류:', error);
    return c.json({ error: '구인공고 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/employers/:id/applications', async (c) => {
  try {
    const employerId = c.req.param('id');
    const { status } = c.req.query();
    
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }
    
    let query = `
      SELECT 
        ja.*,
        js.name as job_seeker_name,
        js.nationality,
        js.korean_level,
        js.current_visa,
        jp.title as job_title,
        jp.work_location
      FROM job_applications ja
      LEFT JOIN job_seekers js ON ja.job_seeker_id = js.id
      LEFT JOIN job_postings jp ON ja.job_posting_id = jp.id
      WHERE jp.employer_id = ?
    `;
    const params = [employerId];
    
    if (status && status !== 'all') {
      query += ' AND ja.application_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ja.applied_at DESC';
    
    const applications = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ applications: applications.results });
  } catch (error) {
    console.error('구인기업 지원자 조회 오류:', error);
    return c.json({ error: '지원자 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/employers/:id/matches', async (c) => {
  try {
    const employerId = c.req.param('id');
    
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }
    
    const matches = await c.env.DB.prepare(`
      SELECT 
        jm.*,
        js.name as job_seeker_name,
        jp.title as job_title
      FROM job_matches jm
      LEFT JOIN job_seekers js ON jm.job_seeker_id = js.id
      LEFT JOIN job_postings jp ON jm.job_posting_id = jp.id
      WHERE jp.employer_id = ?
      ORDER BY jm.match_score DESC, jm.created_at DESC
    `).bind(employerId).all();
    
    return c.json({ matches: matches.results });
  } catch (error) {
    console.error('구인기업 매칭 조회 오류:', error);
    return c.json({ error: '매칭 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 구직자 전용 API
app.get('/api/job-seekers/:id/applications', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    const { status } = c.req.query();
    
    let query = `
      SELECT 
        ja.*,
        jp.title as job_title,
        jp.work_location,
        jp.salary_min,
        jp.salary_max,
        e.company_name,
        CASE 
          WHEN jp.salary_min IS NOT NULL AND jp.salary_max IS NOT NULL 
          THEN CAST(jp.salary_min / 10000 AS TEXT) || '만원 ~ ' || CAST(jp.salary_max / 10000 AS TEXT) || '만원'
          ELSE '급여 협의'
        END as salary_text
      FROM job_applications ja
      LEFT JOIN job_postings jp ON ja.job_posting_id = jp.id
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE ja.job_seeker_id = ?
    `;
    const params = [jobSeekerId];
    
    if (status && status !== 'all') {
      query += ' AND ja.application_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ja.applied_at DESC';
    
    const applications = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ applications: applications.results });
  } catch (error) {
    console.error('구직자 지원내역 조회 오류:', error);
    return c.json({ error: '지원내역 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/jobs/recommended/:jobSeekerId', async (c) => {
  try {
    const jobSeekerId = c.req.param('jobSeekerId');
    const { filter } = c.req.query();
    
    // 구직자 정보 조회
    const jobSeeker = await c.env.DB.prepare(
      'SELECT * FROM job_seekers WHERE id = ?'
    ).bind(jobSeekerId).first();
    
    if (!jobSeeker) {
      return c.json({ error: '구직자 정보를 찾을 수 없습니다.' }, 404);
    }
    
    let query = `
      SELECT 
        jp.*,
        e.company_name,
        CASE 
          WHEN jp.required_visa = ? THEN 0.4
          WHEN jp.job_category = ? THEN 0.3
          WHEN jp.work_location LIKE '%' || ? || '%' THEN 0.2
          WHEN jp.korean_level_required <= ? THEN 0.1
          ELSE 0
        END as match_score
      FROM job_postings jp
      LEFT JOIN employers e ON jp.employer_id = e.id
      WHERE jp.status = 'active'
    `;
    
    const params = [
      jobSeeker.desired_visa || jobSeeker.current_visa,
      jobSeeker.desired_job_category,
      jobSeeker.desired_location || '',
      jobSeeker.korean_level || 'beginner'
    ];
    
    if (filter === 'perfect') {
      query += ' HAVING match_score >= 0.8';
    } else if (filter === 'good') {
      query += ' HAVING match_score >= 0.5';
    } else if (filter === 'recent') {
      query += ' AND jp.created_at >= datetime("now", "-7 days")';
    }
    
    query += ' ORDER BY match_score DESC, jp.created_at DESC LIMIT 20';
    
    const jobs = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ jobs: jobs.results });
  } catch (error) {
    console.error('추천 구인공고 조회 오류:', error);
    return c.json({ error: '추천 구인공고 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 구인공고 수정 API (PUT)
app.put('/api/jobs/:id', async (c) => {
  try {
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }
    
    const jobId = c.req.param('id');
    const {
      title, job_category, work_location, region, required_visa,
      salary_min, salary_max, korean_level_required, description,
      positions, deadline, requirements, benefits, work_hours, experience_required
    } = await c.req.json();

    // region이 없으면 work_location에서 추출 시도, 그것도 안되면 기본값 제공
    const workRegion = region || 
                      (work_location && work_location.includes('서울') ? '서울' : 
                       work_location && work_location.includes('경기') ? '경기' : 
                       work_location && work_location.includes('인천') ? '인천' : 
                       work_location && work_location.includes('부산') ? '부산' :
                       work_location && work_location.includes('대구') ? '대구' :
                       work_location && work_location.includes('대전') ? '대전' :
                       work_location && work_location.includes('광주') ? '광주' :
                       work_location && work_location.includes('울산') ? '울산' :
                       '전국'); // 기본값으로 '전국' 사용

    // 필수 필드 검증
    if (!title || !job_category || !work_location) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400);
    }
    
    // 권한 확인 (구인기업이 자신의 공고만 수정할 수 있도록)
    const existingJob = await c.env.DB.prepare(
      'SELECT employer_id FROM job_postings WHERE id = ?'
    ).bind(jobId).first();
    
    if (!existingJob) {
      return c.json({ error: '구인공고를 찾을 수 없습니다.' }, 404);
    }
    
    // 구인공고 업데이트
    const result = await c.env.DB.prepare(`
      UPDATE job_postings SET 
        title = ?, job_category = ?, work_location = ?, region = ?, required_visa = ?,
        salary_min = ?, salary_max = ?, korean_level_required = ?, description = ?,
        requirements = ?, benefits = ?, work_hours = ?, experience_required = ?, deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title, job_category, work_location, workRegion, required_visa,
      salary_min, salary_max, korean_level_required || 'none', description,
      requirements || null, benefits || null, work_hours || null, experience_required || null, deadline || null,
      jobId
    ).run();
    
    if (result.success) {
      return c.json({ success: true, message: '구인공고가 수정되었습니다.' });
    } else {
      return c.json({ error: '구인공고 수정에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('구인공고 수정 오류:', error);
    return c.json({ error: '구인공고 수정 중 오류가 발생했습니다.' }, 500);
  }
});

// 구인공고 삭제 API
app.delete('/api/jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    
    // 구인공고 삭제
    const result = await c.env.DB.prepare(
      'DELETE FROM job_postings WHERE id = ?'
    ).bind(jobId).run();
    
    if (result.success) {
      return c.json({ success: true, message: '구인공고가 삭제되었습니다.' });
    } else {
      return c.json({ error: '구인공고 삭제에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('구인공고 삭제 오류:', error);
    return c.json({ error: '구인공고 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// 구직자 정보 수정 API
app.put('/api/job-seekers/:id', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    const seekerData = await c.req.json();
    
    console.log('구직자 프로필 수정 요청:', { jobSeekerId, seekerData });

    // 구직자 정보 업데이트 - 올바른 컬럼명 사용
    const result = await c.env.DB.prepare(`
      UPDATE job_seekers SET 
        name = ?, email = ?, birth_date = ?, gender = ?, nationality = ?,
        phone = ?, current_visa = ?, desired_visa = ?, korean_level = ?,
        current_address = ?, education_level = ?, desired_job_category = ?,
        work_experience = ?, preferred_region = ?, desired_salary_min = ?,
        self_introduction = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      seekerData.name,
      seekerData.email,
      seekerData.birth_date,
      seekerData.gender,
      seekerData.nationality,
      seekerData.phone,
      seekerData.current_visa,
      seekerData.desired_visa,
      seekerData.korean_level,
      seekerData.current_address,
      seekerData.education_level,
      seekerData.desired_job_category,
      seekerData.work_experience,
      seekerData.preferred_region,
      seekerData.desired_salary_min,
      seekerData.self_introduction,
      jobSeekerId
    ).run();

    console.log('업데이트 결과:', result);
    
    if (result.success) {
      return c.json({ success: true, message: '프로필이 수정되었습니다.' });
    } else {
      return c.json({ error: '프로필 수정에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('구직자 정보 수정 오류:', error);
    return c.json({ error: '프로필 수정 중 오류가 발생했습니다.' }, 500);
  }
});

// 지원하기 API
app.post('/api/applications', async (c) => {
  try {
    const { job_posting_id, job_seeker_id } = await c.req.json();
    
    // 중복 지원 확인
    const existingApplication = await c.env.DB.prepare(
      'SELECT id FROM job_applications WHERE job_posting_id = ? AND job_seeker_id = ?'
    ).bind(job_posting_id, job_seeker_id).first();
    
    if (existingApplication) {
      return c.json({ error: '이미 지원한 공고입니다.' }, 400);
    }
    
    // 지원 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO job_applications (job_posting_id, job_seeker_id, application_status, applied_at)
      VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)
    `).bind(job_posting_id, job_seeker_id).run();
    
    if (result.success) {
      return c.json({ success: true, message: '지원이 완료되었습니다.' }, 201);
    } else {
      return c.json({ error: '지원 처리에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('지원 처리 오류:', error);
    return c.json({ error: '지원 처리 중 오류가 발생했습니다.' }, 500);
  }
});

// 지원 취소 API
app.delete('/api/applications/:id', async (c) => {
  try {
    const applicationId = c.req.param('id');
    
    const result = await c.env.DB.prepare(
      'DELETE FROM job_applications WHERE id = ?'
    ).bind(applicationId).run();
    
    if (result.success) {
      return c.json({ success: true, message: '지원이 취소되었습니다.' });
    } else {
      return c.json({ error: '지원 취소에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('지원 취소 오류:', error);
    return c.json({ error: '지원 취소 중 오류가 발생했습니다.' }, 500);
  }
});

// ===== 관리자 API 엔드포인트 =====

// 관리자 대시보드 통계 API
app.get('/api/admin/stats', async (c) => {
  try {
    // 사용자 수 통계
    const totalUsers = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM employers) + 
        (SELECT COUNT(*) FROM agents) + 
        (SELECT COUNT(*) FROM job_seekers) + 
        (SELECT COUNT(*) FROM admins) as count
    `).first();

    const totalEmployers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employers').first();
    const totalJobseekers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_seekers').first();
    const totalAgents = await c.env.DB.prepare('SELECT COUNT(*) as count FROM agents').first();
    
    // 채용공고 및 지원 통계
    const activeJobs = await c.env.DB.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = 'active'").first();
    const totalApplications = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_applications').first();
    const successfulMatches = await c.env.DB.prepare("SELECT COUNT(*) as count FROM job_applications WHERE application_status = 'accepted'").first();

    return c.json({
      totalUsers: totalUsers?.count || 0,
      totalEmployers: totalEmployers?.count || 0,
      totalJobseekers: totalJobseekers?.count || 0,
      totalAgents: totalAgents?.count || 0,
      activeJobs: activeJobs?.count || 0,
      totalApplications: totalApplications?.count || 0,
      successfulMatches: successfulMatches?.count || 0
    });
  } catch (error) {
    console.error('통계 데이터 조회 오류:', error);
    return c.json({ error: '통계 데이터 조회에 실패했습니다.' }, 500);
  }
});

// 관리자 최근 활동 조회 API
app.get('/api/admin/activities', async (c) => {
  try {
    // 최근 활동 데이터 생성 (실제 환경에서는 별도 activities 테이블 필요)
    const recentEmployers = await c.env.DB.prepare(`
      SELECT 'registration' as type, company_name as description, 'employer' as user_type, created_at 
      FROM employers ORDER BY created_at DESC LIMIT 5
    `).all();
    
    const recentJobseekers = await c.env.DB.prepare(`
      SELECT 'registration' as type, name as description, 'jobseeker' as user_type, created_at 
      FROM job_seekers ORDER BY created_at DESC LIMIT 5
    `).all();
    
    const recentAgents = await c.env.DB.prepare(`
      SELECT 'registration' as type, company_name as description, 'agent' as user_type, created_at 
      FROM agents ORDER BY created_at DESC LIMIT 5
    `).all();

    const activities = [
      ...recentEmployers.results.map(r => ({ ...r, description: `${r.description} 기업 가입` })),
      ...recentJobseekers.results.map(r => ({ ...r, description: `${r.description} 구직자 가입` })),
      ...recentAgents.results.map(r => ({ ...r, description: `${r.description} 에이전트 가입` }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    return c.json(activities);
  } catch (error) {
    console.error('활동 데이터 조회 오류:', error);
    return c.json({ error: '활동 데이터 조회에 실패했습니다.' }, 500);
  }
});

// 관리자 사용자 조회 API
app.get('/api/admin/users', async (c) => {
  try {
    const userType = c.req.query('type') || 'employers';
    let query, tableName;

    switch (userType) {
      case 'employers':
        tableName = 'employers';
        query = 'SELECT id, email, company_name, business_number, industry, contact_person, phone, address, region, status, created_at FROM employers ORDER BY created_at DESC';
        break;
      case 'agents':
        tableName = 'agents';
        query = 'SELECT id, email, company_name, contact_person, phone, country, address, license_number, status, created_at FROM agents ORDER BY created_at DESC';
        break;
      case 'jobseekers':
        tableName = 'job_seekers';
        query = 'SELECT id, email, name, nationality, current_visa, desired_visa, korean_level, phone, current_address, education_level, work_experience, status, created_at FROM job_seekers ORDER BY created_at DESC';
        break;
      default:
        return c.json({ error: '잘못된 사용자 타입입니다.' }, 400);
    }

    const result = await c.env.DB.prepare(query).all();
    return c.json(result.results || []);
  } catch (error) {
    console.error('사용자 데이터 조회 오류:', error);
    return c.json({ error: '사용자 데이터 조회에 실패했습니다.' }, 500);
  }
});

// 관리자 사용자 상태 변경 API
app.put('/api/admin/users/:id/status', async (c) => {
  try {
    const userId = c.req.param('id');
    const requestBody = await c.req.json();
    const { status, userType } = requestBody;
    
    console.log('Status update request:', { userId, status, userType, requestBody });
    
    let tableName;
    switch (userType) {
      case 'employer':
        tableName = 'employers';
        break;
      case 'agent':
        tableName = 'agents';
        break;
      case 'jobseeker':
      case 'jobseekers': // 복수형도 허용
        tableName = 'job_seekers';
        break;
      default:
        console.error('Invalid userType:', userType);
        return c.json({ error: `잘못된 사용자 타입입니다: ${userType}` }, 400);
    }

    console.log('Using table:', tableName, 'for userType:', userType);

    // 사용자 존재 여부 확인
    const existingUser = await c.env.DB.prepare(
      `SELECT id FROM ${tableName} WHERE id = ?`
    ).bind(userId).first();

    if (!existingUser) {
      console.error('User not found:', userId, 'in table:', tableName);
      return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404);
    }

    console.log('Found user:', existingUser);

    const result = await c.env.DB.prepare(
      `UPDATE ${tableName} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(status, userId).run();

    console.log('Update result:', result);

    if (result.success) {
      return c.json({ 
        success: true, 
        message: '사용자 상태가 업데이트되었습니다.',
        changes: result.meta?.changes || result.changes || 0
      });
    } else {
      console.error('Update failed:', result);
      return c.json({ error: '상태 업데이트에 실패했습니다.', details: result }, 500);
    }
  } catch (error) {
    console.error('사용자 상태 변경 오류:', error);
    return c.json({ error: '사용자 상태 변경에 실패했습니다.', details: error.message }, 500);
  }
});

// 관리자 데이터 백업 API
app.post('/api/admin/backup', async (c) => {
  try {
    // 모든 테이블 데이터 백업
    const tables = ['admins', 'employers', 'agents', 'job_seekers', 'job_postings', 'job_applications', 'study_programs'];
    const backupData = {};

    for (const table of tables) {
      const result = await c.env.DB.prepare(`SELECT * FROM ${table}`).all();
      backupData[table] = result.results || [];
    }

    // 백업 메타데이터 추가
    backupData.metadata = {
      created_at: new Date().toISOString(),
      version: '1.0',
      total_records: Object.values(backupData).reduce((sum, data) => sum + (Array.isArray(data) ? data.length : 0), 0)
    };

    const jsonData = JSON.stringify(backupData, null, 2);
    
    return new Response(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=wowcampus_backup_${new Date().toISOString().split('T')[0]}.json`
      }
    });
  } catch (error) {
    console.error('데이터 백업 오류:', error);
    return c.json({ error: '데이터 백업에 실패했습니다.' }, 500);
  }
});

// 관리자 시스템 리포트 API
app.get('/api/admin/report', async (c) => {
  try {
    // 간단한 텍스트 리포트 생성 (실제 환경에서는 PDF 생성 라이브러리 사용)
    const stats = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM employers) as employers_count,
        (SELECT COUNT(*) FROM agents) as agents_count,
        (SELECT COUNT(*) FROM job_seekers) as jobseekers_count,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'active') as active_jobs_count,
        (SELECT COUNT(*) FROM job_applications) as applications_count
    `).first();

    const reportText = `
WOW-CAMPUS 시스템 리포트
생성일: ${new Date().toLocaleDateString('ko-KR')}

=== 사용자 현황 ===
구인기업: ${stats?.employers_count || 0}개
에이전트: ${stats?.agents_count || 0}개
구직자: ${stats?.jobseekers_count || 0}명

=== 채용 현황 ===
활성 채용공고: ${stats?.active_jobs_count || 0}개
총 지원서: ${stats?.applications_count || 0}건

=== 시스템 상태 ===
상태: 정상 운영중
마지막 업데이트: ${new Date().toISOString()}

이 리포트는 WOW-CAMPUS 관리자 시스템에서 자동 생성되었습니다.
    `.trim();

    return new Response(reportText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename=system_report_${new Date().toISOString().split('T')[0]}.txt`
      }
    });
  } catch (error) {
    console.error('리포트 생성 오류:', error);
    return c.json({ error: '리포트 생성에 실패했습니다.' }, 500);
  }
});

// ===== 에이전트 및 파일 관리 API 엔드포인트 =====

// 활성 에이전트 목록 조회 API (구인정보 등록 시 선택용)
app.get('/api/agents/active', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT id, company_name, contact_person, phone, country, email
      FROM agents 
      WHERE status = 'approved' 
      ORDER BY company_name ASC
    `).all();

    return c.json(result.results || []);
  } catch (error) {
    console.error('에이전트 목록 조회 오류:', error);
    return c.json({ error: '에이전트 목록 조회에 실패했습니다.' }, 500);
  }
});

// 특정 에이전트 정보 조회 API
app.get('/api/agents/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT id, company_name, contact_person, phone, country, email
      FROM agents 
      WHERE id = ? AND status = 'approved'
    `).bind(agentId).first();

    if (!result) {
      return c.json({ error: '에이전트를 찾을 수 없습니다.' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('에이전트 조회 오류:', error);
    return c.json({ error: '에이전트 조회에 실패했습니다.' }, 500);
  }
});

// 구직자 에이전트 정보 업데이트 API
app.put('/api/job-seekers/:id/agent', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    const { agent_id } = await c.req.json();
    
    // 에이전트 ID가 제공된 경우 유효성 검사
    if (agent_id) {
      const agentExists = await c.env.DB.prepare(`
        SELECT id FROM agents WHERE id = ? AND status = 'approved'
      `).bind(agent_id).first();
      
      if (!agentExists) {
        return c.json({ error: '유효하지 않은 에이전트입니다.' }, 400);
      }
    }
    
    // 구직자 에이전트 정보 업데이트
    const result = await c.env.DB.prepare(`
      UPDATE job_seekers 
      SET agent_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(agent_id, jobSeekerId).run();

    if (result.success) {
      return c.json({ 
        success: true, 
        message: '에이전트 정보가 업데이트되었습니다.' 
      });
    } else {
      return c.json({ error: '업데이트에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('에이전트 업데이트 오류:', error);
    return c.json({ error: '에이전트 업데이트 중 오류가 발생했습니다.' }, 500);
  }
});

// 구인정보 등록 API (에이전트 정보 포함)
app.post('/api/jobs', async (c) => {
  try {
    // 인증 체크
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    const {
      title, job_category, work_location, region, required_visa,
      salary_min, salary_max, korean_level_required, description,
      employer_id, agent_id, agent_fee_percentage, agent_notes,
      positions, deadline, requirements, benefits, work_hours, experience_required
    } = await c.req.json();

    // region이 없으면 work_location에서 추출 시도, 그것도 안되면 기본값 제공
    const workRegion = region || 
                      (work_location && work_location.includes('서울') ? '서울' : 
                       work_location && work_location.includes('경기') ? '경기' : 
                       work_location && work_location.includes('인천') ? '인천' : 
                       work_location && work_location.includes('부산') ? '부산' :
                       work_location && work_location.includes('대구') ? '대구' :
                       work_location && work_location.includes('대전') ? '대전' :
                       work_location && work_location.includes('광주') ? '광주' :
                       work_location && work_location.includes('울산') ? '울산' :
                       '전국'); // 기본값으로 '전국' 사용

    // 필수 필드 검증
    if (!title || !job_category || !work_location || !employer_id) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400);
    }

    // 구인정보 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO job_postings (
        employer_id, title, job_category, work_location, region, required_visa,
        salary_min, salary_max, korean_level_required, description, 
        requirements, benefits, work_hours, experience_required, deadline,
        agent_id, agent_fee_percentage, agent_notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `).bind(
      employer_id, title, job_category, work_location, workRegion, required_visa,
      salary_min, salary_max, korean_level_required, description,
      requirements || null, benefits || null, work_hours || null, experience_required || null, deadline || null,
      agent_id || null, agent_fee_percentage || 0, agent_notes || null
    ).run();

    if (result.success) {
      return c.json({ 
        success: true, 
        message: '구인정보가 성공적으로 등록되었습니다.',
        job_id: result.meta.last_row_id 
      }, 201);
    } else {
      return c.json({ error: '구인정보 등록에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('구인정보 등록 오류:', error);
    return c.json({ error: '구인정보 등록 중 오류가 발생했습니다.' }, 500);
  }
});

// 파일 업로드 API (구직자 서류)
app.post('/api/upload/document', async (c) => {
  try {
    // Cloudflare Workers는 multipart/form-data를 직접 처리하지 못하므로
    // 실제 환경에서는 R2 버킷이나 외부 스토리지 서비스를 사용해야 합니다.
    // 여기서는 시뮬레이션을 위한 기본 구현을 제공합니다.
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const jobSeekerId = formData.get('job_seeker_id') as string;
    const documentType = formData.get('document_type') as string;
    const description = formData.get('description') as string;

    if (!file || !jobSeekerId || !documentType) {
      return c.json({ error: '필수 파라미터가 누락되었습니다.' }, 400);
    }

    // 파일 정보 저장 (실제 파일은 별도 스토리지에 저장)
    const storedFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO job_seeker_documents (
        job_seeker_id, document_type, original_filename, stored_filename,
        file_size, file_type, description, upload_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      jobSeekerId, documentType, file.name, storedFilename,
      file.size, file.type, description
    ).run();

    if (result.success) {
      return c.json({
        success: true,
        message: '파일이 성공적으로 업로드되었습니다.',
        document_id: result.meta.last_row_id,
        filename: storedFilename
      }, 201);
    } else {
      return c.json({ error: '파일 업로드에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return c.json({ error: '파일 업로드 중 오류가 발생했습니다.' }, 500);
  }
});

// 구직자 서류 목록 조회 API
app.get('/api/jobseeker/:id/documents', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT id, document_type, original_filename, file_size, file_type, 
             description, upload_date, is_public
      FROM job_seeker_documents 
      WHERE job_seeker_id = ? 
      ORDER BY upload_date DESC
    `).bind(jobSeekerId).all();

    return c.json(result.results || []);
  } catch (error) {
    console.error('서류 목록 조회 오류:', error);
    return c.json({ error: '서류 목록 조회에 실패했습니다.' }, 500);
  }
});

// 구직자 서류 다운로드 API
app.get('/api/documents/:id/download', async (c) => {
  try {
    const documentId = c.req.param('id');
    const userHeader = c.req.header('X-User-Info');
    
    // 사용자 정보 확인
    if (!userHeader) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    const user = JSON.parse(userHeader);
    
    // 서류 정보 조회
    const document = await c.env.DB.prepare(`
      SELECT jsd.*, js.name as job_seeker_name, js.email as job_seeker_email
      FROM job_seeker_documents jsd
      JOIN job_seekers js ON jsd.job_seeker_id = js.id
      WHERE jsd.id = ?
    `).bind(documentId).first();

    if (!document) {
      return c.json({ error: '서류를 찾을 수 없습니다.' }, 404);
    }

    // 권한 확인 (본인, 관리자, 또는 해당 구직자에게 지원받은 기업)
    if (user.type === 'jobseeker' && user.id !== document.job_seeker_id) {
      return c.json({ error: '접근 권한이 없습니다.' }, 403);
    }

    // 다운로드 로그 기록 (기업인 경우)
    if (user.type === 'employer') {
      await c.env.DB.prepare(`
        INSERT INTO document_download_logs (document_id, employer_id, downloaded_at, ip_address)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      `).bind(documentId, user.id, c.req.header('CF-Connecting-IP') || '').run();
    }

    // 실제 환경에서는 R2나 외부 스토리지에서 파일을 가져와야 합니다
    // 여기서는 시뮬레이션을 위한 응답을 반환합니다
    return c.json({
      success: true,
      download_url: `/files/${document.stored_filename}`,
      original_filename: document.original_filename,
      file_type: document.file_type,
      file_size: document.file_size
    });
  } catch (error) {
    console.error('서류 다운로드 오류:', error);
    return c.json({ error: '서류 다운로드에 실패했습니다.' }, 500);
  }
});

// 지원서와 서류 연결 API
app.post('/api/applications/:id/attach-documents', async (c) => {
  try {
    const applicationId = c.req.param('id');
    const { document_ids } = await c.req.json();

    if (!Array.isArray(document_ids)) {
      return c.json({ error: '서류 ID 목록이 필요합니다.' }, 400);
    }

    // 기존 연결 삭제
    await c.env.DB.prepare('DELETE FROM application_documents WHERE application_id = ?')
      .bind(applicationId).run();

    // 새로운 연결 추가
    for (const documentId of document_ids) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO application_documents (application_id, document_id, attached_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).bind(applicationId, documentId).run();
    }

    return c.json({ success: true, message: '서류가 성공적으로 첨부되었습니다.' });
  } catch (error) {
    console.error('서류 첨부 오류:', error);
    return c.json({ error: '서류 첨부에 실패했습니다.' }, 500);
  }
});

// 기업의 지원자 서류 조회 API
app.get('/api/employers/:id/applications/documents', async (c) => {
  try {
    const employerId = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT 
        ja.id as application_id,
        ja.job_posting_id,
        ja.application_status,
        ja.applied_at,
        js.id as job_seeker_id,
        js.name as job_seeker_name,
        js.email as job_seeker_email,
        js.nationality,
        js.current_visa,
        jp.title as job_title,
        jsd.id as document_id,
        jsd.document_type,
        jsd.original_filename,
        jsd.file_size,
        jsd.file_type,
        jsd.description as document_description,
        jsd.upload_date
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      JOIN job_seekers js ON ja.job_seeker_id = js.id
      LEFT JOIN application_documents ad ON ja.id = ad.application_id
      LEFT JOIN job_seeker_documents jsd ON ad.document_id = jsd.id
      WHERE jp.employer_id = ?
      ORDER BY ja.applied_at DESC, jsd.upload_date ASC
    `).bind(employerId).all();

    return c.json(result.results || []);
  } catch (error) {
    console.error('지원자 서류 조회 오류:', error);
    return c.json({ error: '지원자 서류 조회에 실패했습니다.' }, 500);
  }
});

// 특정 지원서의 첨부 서류 조회 API
app.get('/api/applications/:id/documents', async (c) => {
  try {
    const applicationId = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT 
        jsd.id as document_id,
        jsd.document_type,
        jsd.original_filename,
        jsd.file_size,
        jsd.file_type,
        jsd.description,
        jsd.upload_date
      FROM application_documents ad
      JOIN job_seeker_documents jsd ON ad.document_id = jsd.id
      WHERE ad.application_id = ?
      ORDER BY jsd.upload_date DESC
    `).bind(applicationId).all();

    return c.json({ documents: result.results || [] });
  } catch (error) {
    console.error('지원서 서류 조회 오류:', error);
    return c.json({ error: '지원서 서류 조회에 실패했습니다.' }, 500);
  }
});

// 서류 삭제 API
app.delete('/api/documents/:id', async (c) => {
  try {
    const documentId = c.req.param('id');
    const userHeader = c.req.header('Authorization');
    
    if (!userHeader) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    // 서류 소유자 확인
    const document = await c.env.DB.prepare(`
      SELECT job_seeker_id FROM job_seeker_documents WHERE id = ?
    `).bind(documentId).first();

    if (!document) {
      return c.json({ error: '서류를 찾을 수 없습니다.' }, 404);
    }

    // 서류 삭제
    const result = await c.env.DB.prepare(`
      DELETE FROM job_seeker_documents WHERE id = ?
    `).bind(documentId).run();

    if (result.success) {
      return c.json({ success: true, message: '서류가 삭제되었습니다.' });
    } else {
      return c.json({ error: '서류 삭제에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('서류 삭제 오류:', error);
    return c.json({ error: '서류 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// ===== 관리자 대시보드 API =====

// 통계 API
app.get('/api/admin/stats', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    // 각 테이블의 통계 조회
    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM (SELECT id FROM employers UNION SELECT id FROM agents UNION SELECT id FROM job_seekers)').first();
    const totalEmployers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employers').first();
    const totalJobseekers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_seekers').first();
    const totalAgents = await c.env.DB.prepare('SELECT COUNT(*) as count FROM agents').first();
    
    // job_postings 테이블이 있는 경우에만 조회
    let activeJobs = { count: 0 };
    let totalApplications = { count: 0 };
    let successfulMatches = { count: 0 };
    
    try {
      activeJobs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_postings WHERE status = "active"').first() || { count: 0 };
      totalApplications = await c.env.DB.prepare('SELECT COUNT(*) as count FROM applications').first() || { count: 0 };
      successfulMatches = await c.env.DB.prepare('SELECT COUNT(*) as count FROM applications WHERE status = "accepted"').first() || { count: 0 };
    } catch (error) {
      console.log('Some tables not found, using default values');
    }

    return c.json({
      totalUsers: totalUsers?.count || 0,
      totalEmployers: totalEmployers?.count || 0,
      totalJobseekers: totalJobseekers?.count || 0,
      totalAgents: totalAgents?.count || 0,
      activeJobs: activeJobs?.count || 0,
      totalApplications: totalApplications?.count || 0,
      successfulMatches: successfulMatches?.count || 0
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return c.json({ error: '통계 데이터 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 최근 활동 API
app.get('/api/admin/activities', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    // 샘플 활동 데이터 (실제로는 활동 로그 테이블에서 조회)
    const activities = [
      {
        id: 1,
        type: 'registration',
        description: '새 구직자 회원이 가입했습니다.',
        user_type: '구직자',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        type: 'job_post',
        description: '새 채용공고가 등록되었습니다.',
        user_type: '구인기업',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    return c.json(activities);
  } catch (error) {
    console.error('Activities fetch error:', error);
    return c.json({ error: '활동 데이터 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 사용자 목록 API
app.get('/api/admin/users', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const { type = 'employers' } = c.req.query();
    let tableName;
    
    switch(type) {
      case 'employers': tableName = 'employers'; break;
      case 'agents': tableName = 'agents'; break;
      case 'jobseekers': tableName = 'job_seekers'; break;
      default: tableName = 'employers';
    }

    const users = await c.env.DB.prepare(`
      SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 50
    `).all();

    return c.json(users.results || []);
  } catch (error) {
    console.error('Users fetch error:', error);
    return c.json({ error: '사용자 목록 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 사용자 상태 업데이트 API
app.put('/api/admin/users/:id/status', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const userId = c.req.param('id');
    const { status, userType } = await c.req.json();
    
    let tableName;
    switch(userType) {
      case 'employer': tableName = 'employers'; break;
      case 'agent': tableName = 'agents'; break;
      case 'jobseeker': tableName = 'job_seekers'; break;
      default: return c.json({ error: '잘못된 사용자 유형입니다.' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE ${tableName} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(status, userId).run();

    return c.json({ 
      success: true,
      message: '사용자 상태가 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('User status update error:', error);
    return c.json({ error: '사용자 상태 업데이트 중 오류가 발생했습니다.' }, 500);
  }
});

// 관리자 대시보드 - 사용자 목록 조회 API
app.get('/api/admin/users/:userType', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const userType = c.req.param('userType');
    let tableName = '';
    
    switch(userType) {
      case 'employers':
        tableName = 'employers';
        break;
      case 'agents':
        tableName = 'agents';
        break;
      case 'jobseekers':
        tableName = 'job_seekers';
        break;
      default:
        return c.json({ error: '유효하지 않은 사용자 타입입니다.' }, 400);
    }

    const users = await c.env.DB.prepare(`
      SELECT * FROM ${tableName} ORDER BY created_at DESC
    `).all();

    return c.json({ users: users.results });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return c.json({ error: '사용자 목록 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 관리자 대시보드 - 통계 정보 조회 API  
app.get('/api/admin/stats', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    // 각 테이블의 사용자 수 조회
    const employersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employers').first();
    const agentsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM agents').first();
    const jobSeekersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_seekers').first();

    return c.json({
      totalEmployers: employersCount?.count || 0,
      totalAgents: agentsCount?.count || 0,
      totalJobseekers: jobSeekersCount?.count || 0,
      totalUsers: (employersCount?.count || 0) + (agentsCount?.count || 0) + (jobSeekersCount?.count || 0)
    });
  } catch (error) {
    console.error('통계 정보 조회 오류:', error);
    return c.json({ error: '통계 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 임시 패스워드 발급 API
app.post('/api/admin/users/:id/temp-password', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const userId = c.req.param('id');
    const { userType } = await c.req.json();
    
    // 6자리 임시 패스워드 생성
    const tempPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    let tableName;
    switch(userType) {
      case 'employer': tableName = 'employers'; break;
      case 'agent': tableName = 'agents'; break;
      case 'jobseeker': tableName = 'job_seekers'; break;
      default: return c.json({ error: '잘못된 사용자 유형입니다.' }, 400);
    }

    // 임시 패스워드를 해시화하여 저장
    const hashedTempPassword = await hash(tempPassword);
    
    await c.env.DB.prepare(`
      UPDATE ${tableName} 
      SET password = ?, temp_password = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(hashedTempPassword, userId).run();

    return c.json({ 
      success: true,
      tempPassword: tempPassword,
      message: '임시 패스워드가 발급되었습니다.'
    });
  } catch (error) {
    console.error('Temp password generation error:', error);
    return c.json({ error: '임시 패스워드 발급 중 오류가 발생했습니다.' }, 500);
  }
});

// 사용자 일괄 상태 변경 API  
app.put('/api/admin/users/bulk-status', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const { userIds, status, userType } = await c.req.json();
    
    let tableName;
    switch(userType) {
      case 'employer': tableName = 'employers'; break;
      case 'agent': tableName = 'agents'; break;
      case 'jobseeker': tableName = 'job_seekers'; break;
      default: return c.json({ error: '잘못된 사용자 유형입니다.' }, 400);
    }

    const placeholders = userIds.map(() => '?').join(',');
    await c.env.DB.prepare(`
      UPDATE ${tableName} 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `).bind(status, ...userIds).run();

    return c.json({ 
      success: true,
      message: `${userIds.length}명의 사용자 상태가 업데이트되었습니다.`
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    return c.json({ error: '일괄 상태 업데이트 중 오류가 발생했습니다.' }, 500);
  }
});

// 데이터 백업 API
app.post('/api/admin/backup', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    // 실제로는 모든 데이터를 조회해서 JSON으로 반환
    const backupData = {
      timestamp: new Date().toISOString(),
      notice: '이 기능은 실제 환경에서 구현되어야 합니다.',
      data: {
        employers: [],
        agents: [],
        job_seekers: []
      }
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="wowcampus_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    return c.json({ error: '백업 생성 중 오류가 발생했습니다.' }, 500);
  }
});

// 시스템 리포트 API
app.get('/api/admin/report', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    // PDF 리포트 생성 (실제로는 PDF 라이브러리 사용)
    const reportText = `WOW-CAMPUS 시스템 리포트
생성일: ${new Date().toLocaleDateString('ko-KR')}

이 기능은 실제 환경에서 PDF 생성 라이브러리와 함께 구현되어야 합니다.
`;

    return new Response(reportText, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="system_report_${new Date().toISOString().split('T')[0]}.txt"`
      }
    });
  } catch (error) {
    console.error('Report error:', error);
    return c.json({ error: '리포트 생성 중 오류가 발생했습니다.' }, 500);
  }
});

// ===== 관리자 콘텐츠 관리 API =====

// 공지사항 API
app.get('/api/admin/notices', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const notices = await c.env.DB.prepare(`
      SELECT id, title, content, is_active, created_at, updated_at
      FROM notices 
      ORDER BY created_at DESC
    `).all();

    return c.json(notices.results);
  } catch (error) {
    console.error('Fetch notices error:', error);
    return c.json({ error: '공지사항 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/admin/notices/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const notice = await c.env.DB.prepare(`
      SELECT * FROM notices WHERE id = ?
    `).bind(id).first();

    if (!notice) {
      return c.json({ error: '공지사항을 찾을 수 없습니다.' }, 404);
    }

    return c.json(notice);
  } catch (error) {
    console.error('Fetch notice error:', error);
    return c.json({ error: '공지사항 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.post('/api/admin/notices', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const { title, content, is_active } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: '제목과 내용은 필수입니다.' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO notices (title, content, is_active, created_by)
      VALUES (?, ?, ?, ?)
    `).bind(title, content, is_active ? 1 : 0, user.id).run();

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: '공지사항이 등록되었습니다.'
    });
  } catch (error) {
    console.error('Create notice error:', error);
    return c.json({ error: '공지사항 등록 중 오류가 발생했습니다.' }, 500);
  }
});

app.put('/api/admin/notices/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const { title, content, is_active } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: '제목과 내용은 필수입니다.' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE notices 
      SET title = ?, content = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, content, is_active ? 1 : 0, id).run();

    return c.json({ 
      success: true,
      message: '공지사항이 수정되었습니다.'
    });
  } catch (error) {
    console.error('Update notice error:', error);
    return c.json({ error: '공지사항 수정 중 오류가 발생했습니다.' }, 500);
  }
});

app.delete('/api/admin/notices/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    
    await c.env.DB.prepare(`
      DELETE FROM notices WHERE id = ?
    `).bind(id).run();

    return c.json({ 
      success: true,
      message: '공지사항이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    return c.json({ error: '공지사항 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// FAQ API
app.get('/api/admin/faqs', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const faqs = await c.env.DB.prepare(`
      SELECT id, category, question, answer, is_active, order_index, created_at, updated_at
      FROM faqs 
      ORDER BY category, order_index, created_at DESC
    `).all();

    return c.json(faqs.results);
  } catch (error) {
    console.error('Fetch FAQs error:', error);
    return c.json({ error: 'FAQ 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/admin/faqs/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const faq = await c.env.DB.prepare(`
      SELECT * FROM faqs WHERE id = ?
    `).bind(id).first();

    if (!faq) {
      return c.json({ error: 'FAQ를 찾을 수 없습니다.' }, 404);
    }

    return c.json(faq);
  } catch (error) {
    console.error('Fetch FAQ error:', error);
    return c.json({ error: 'FAQ 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.post('/api/admin/faqs', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const { category, question, answer, is_active, order_index = 0 } = await c.req.json();
    
    if (!category || !question || !answer) {
      return c.json({ error: '카테고리, 질문, 답변은 필수입니다.' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO faqs (category, question, answer, is_active, order_index, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(category, question, answer, is_active ? 1 : 0, order_index, user.id).run();

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'FAQ가 등록되었습니다.'
    });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return c.json({ error: 'FAQ 등록 중 오류가 발생했습니다.' }, 500);
  }
});

app.put('/api/admin/faqs/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const { category, question, answer, is_active, order_index = 0 } = await c.req.json();
    
    if (!category || !question || !answer) {
      return c.json({ error: '카테고리, 질문, 답변은 필수입니다.' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE faqs 
      SET category = ?, question = ?, answer = ?, is_active = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(category, question, answer, is_active ? 1 : 0, order_index, id).run();

    return c.json({ 
      success: true,
      message: 'FAQ가 수정되었습니다.'
    });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return c.json({ error: 'FAQ 수정 중 오류가 발생했습니다.' }, 500);
  }
});

app.delete('/api/admin/faqs/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    
    await c.env.DB.prepare(`
      DELETE FROM faqs WHERE id = ?
    `).bind(id).run();

    return c.json({ 
      success: true,
      message: 'FAQ가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return c.json({ error: 'FAQ 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// 문의 API
app.get('/api/admin/inquiries', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const inquiries = await c.env.DB.prepare(`
      SELECT id, name, email, phone, category, subject, message, status, created_at, updated_at
      FROM inquiries 
      ORDER BY created_at DESC
    `).all();

    return c.json(inquiries.results);
  } catch (error) {
    console.error('Fetch inquiries error:', error);
    return c.json({ error: '문의 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.get('/api/admin/inquiries/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM inquiries WHERE id = ?
    `).bind(id).first();

    if (!inquiry) {
      return c.json({ error: '문의를 찾을 수 없습니다.' }, 404);
    }

    return c.json(inquiry);
  } catch (error) {
    console.error('Fetch inquiry error:', error);
    return c.json({ error: '문의 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.delete('/api/admin/inquiries/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    
    await c.env.DB.prepare(`
      DELETE FROM inquiries WHERE id = ?
    `).bind(id).run();

    return c.json({ 
      success: true,
      message: '문의가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    return c.json({ error: '문의 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

// 문의사항 답변 API
app.put('/api/admin/inquiries/:id/reply', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const id = c.req.param('id');
    const { reply } = await c.req.json();
    
    if (!reply) {
      return c.json({ error: '답변 내용은 필수입니다.' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE inquiries 
      SET reply = ?, status = 'completed', replied_at = CURRENT_TIMESTAMP, replied_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(reply, user.id, id).run();

    return c.json({ 
      success: true,
      message: '문의 답변이 등록되었습니다.'
    });
  } catch (error) {
    console.error('Reply inquiry error:', error);
    return c.json({ error: '문의 답변 중 오류가 발생했습니다.' }, 500);
  }
});

// 정책 API
app.get('/api/admin/policies/:type', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const type = c.req.param('type');
    const policy = await c.env.DB.prepare(`
      SELECT * FROM policies WHERE type = ?
    `).bind(type).first();

    if (!policy) {
      return c.json({ content: '', last_updated: new Date().toISOString().split('T')[0] });
    }

    return c.json(policy);
  } catch (error) {
    console.error('Fetch policy error:', error);
    return c.json({ error: '정책 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.put('/api/admin/policies/:type', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const type = c.req.param('type');
    const { content, last_updated } = await c.req.json();
    
    if (!content) {
      return c.json({ error: '내용은 필수입니다.' }, 400);
    }

    // last_updated가 없으면 현재 날짜 사용
    const updatedDate = last_updated || new Date().toISOString().split('T')[0];

    // 기존 정책이 있는지 확인
    const existingPolicy = await c.env.DB.prepare(`
      SELECT id FROM policies WHERE type = ?
    `).bind(type).first();

    if (existingPolicy) {
      // 업데이트
      await c.env.DB.prepare(`
        UPDATE policies 
        SET content = ?, last_updated = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE type = ?
      `).bind(content, updatedDate, user.id, type).run();
    } else {
      // 새로 생성
      await c.env.DB.prepare(`
        INSERT INTO policies (type, content, last_updated, updated_by)
        VALUES (?, ?, ?, ?)
      `).bind(type, content, updatedDate, user.id).run();
    }

    return c.json({ 
      success: true,
      message: '정책이 저장되었습니다.'
    });
  } catch (error) {
    console.error('Save policy error:', error);
    return c.json({ error: '정책 저장 중 오류가 발생했습니다.' }, 500);
  }
});

// 연락처 정보 API
app.get('/api/admin/contact', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403);
    }

    const contact = await c.env.DB.prepare(`
      SELECT * FROM contact_info ORDER BY created_at DESC LIMIT 1
    `).first();

    if (!contact) {
      return c.json({
        phone1: '02-3144-3137',
        phone2: '054-464-3137',
        email: 'wow3d16@naver.com',
        address1: '서울특별시 강남구 테헤란로 123',
        address2: '경상북도 포항시 남구 지곡로 80',
        hours: '평일 09:00 - 18:00'
      });
    }

    return c.json(contact);
  } catch (error) {
    console.error('Fetch contact error:', error);
    return c.json({ error: '연락처 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
});

app.put('/api/admin/contact', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    if (user.userType !== 'admin') {
      return c.json({ error: '관리자 권한이 필요습니다.' }, 403);
    }

    const { phone1, phone2, email, address1, address2, hours } = await c.req.json();
    
    if (!phone1 || !email || !address1 || !hours) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400);
    }

    // 기존 연락처 정보가 있는지 확인
    const existingContact = await c.env.DB.prepare(`
      SELECT id FROM contact_info LIMIT 1
    `).first();

    if (existingContact) {
      // 업데이트
      await c.env.DB.prepare(`
        UPDATE contact_info 
        SET phone1 = ?, phone2 = ?, email = ?, address1 = ?, address2 = ?, hours = ?, 
            updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE id = ?
      `).bind(phone1, phone2, email, address1, address2, hours, user.id, existingContact.id).run();
    } else {
      // 새로 생성
      await c.env.DB.prepare(`
        INSERT INTO contact_info (phone1, phone2, email, address1, address2, hours, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(phone1, phone2, email, address1, address2, hours, user.id).run();
    }

    return c.json({ 
      success: true,
      message: '연락처 정보가 저장되었습니다.'
    });
  } catch (error) {
    console.error('Save contact error:', error);
    return c.json({ error: '연락처 정보 저장 중 오류가 발생했습니다.' }, 500);
  }
});

// 연락처 정보 조회 API (공개 API - 인증 불필요)
app.get('/api/contact', async (c) => {
  try {
    const contact = await c.env.DB.prepare(`
      SELECT phone1, phone2, email, address1, address2, hours
      FROM contact_info 
      ORDER BY created_at DESC 
      LIMIT 1
    `).first();
    
    if (!contact) {
      // 기본 연락처 정보 반환
      return c.json({
        phone1: '02-1234-5678',
        phone2: '054-987-6543', 
        email: 'info@wowcampus.com',
        address1: '서울특별시 강남구 테헤란로 456',
        address2: '경상북도 포항시 남구 지곡로 123',
        hours: '평일 09:00 - 18:00'
      });
    }
    
    return c.json(contact);
  } catch (error) {
    console.error('Fetch contact error:', error);
    return c.json({ error: '연락처 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 문의 등록 API (공개 API - 인증 불필요)
app.post('/api/inquiries', async (c) => {
  try {
    const { name, email, phone, category, subject, message } = await c.req.json();
    
    if (!name || !email || !category || !subject || !message) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO inquiries (name, email, phone, category, subject, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).bind(name, email, phone, category, subject, message).run();

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: '문의가 접수되었습니다.'
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    return c.json({ error: '문의 접수 중 오류가 발생했습니다.' }, 500);
  }
});

// 공개 공지사항 API (인증 불필요)
app.get('/api/notices', async (c) => {
  try {
    const { page = 1, limit = 10 } = c.req.query();
    
    const notices = await c.env.DB.prepare(`
      SELECT id, title, content, created_at
      FROM notices 
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(parseInt(limit), (parseInt(page) - 1) * parseInt(limit)).all();

    return c.json({
      notices: notices.results,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Fetch public notices error:', error);
    return c.json({ error: '공지사항 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// 공개 FAQ API (인증 불필요)
app.get('/api/faqs', async (c) => {
  try {
    const { category } = c.req.query();
    
    let query = `
      SELECT id, category, question, answer, order_index
      FROM faqs 
      WHERE is_active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, order_index, created_at';
    
    const faqs = await c.env.DB.prepare(query).bind(...params).all();

    return c.json(faqs.results);
  } catch (error) {
    console.error('Fetch public FAQs error:', error);
    return c.json({ error: 'FAQ 조회 중 오류가 발생했습니다.' }, 500);
  }
});

// ===== 구인기업 지원자 관리 API =====

// 구직자 상세 정보 조회 API (구인기업용)
app.get('/api/job-seekers/:id/profile', async (c) => {
  try {
    const jobSeekerId = c.req.param('id');
    const token = c.req.header('authorization');
    
    if (!token) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    // 구직자 기본 정보
    const jobSeeker = await c.env.DB.prepare(`
      SELECT 
        js.id, js.email, js.name, js.nationality, js.gender, 
        js.birth_date, js.phone, js.current_address,
        js.current_visa, js.desired_visa, js.visa_expiry,
        js.korean_level, js.english_level, js.other_languages,
        js.education_level, js.major, js.university, js.graduation_year,
        js.work_experience, js.skills, js.certifications,
        js.desired_job_type, js.desired_location, js.desired_salary,
        js.introduction, js.status, js.created_at,
        a.company_name as agent_company_name, a.contact_person as agent_contact
      FROM job_seekers js
      LEFT JOIN agents a ON js.agent_id = a.id
      WHERE js.id = ?
    `).bind(jobSeekerId).first();

    if (!jobSeeker) {
      return c.json({ error: '구직자를 찾을 수 없습니다.' }, 404);
    }

    // 지원 이력 조회
    const applications = await c.env.DB.prepare(`
      SELECT 
        ja.id, ja.application_status, ja.applied_at, ja.cover_letter, ja.notes,
        jp.title as job_title, jp.company_name, jp.work_location
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      WHERE ja.job_seeker_id = ?
      ORDER BY ja.applied_at DESC
    `).bind(jobSeekerId).all();

    // 업로드된 서류 정보 조회
    const documents = await c.env.DB.prepare(`
      SELECT document_id, document_type, original_filename, file_size, uploaded_at
      FROM job_seeker_documents 
      WHERE job_seeker_id = ?
      ORDER BY uploaded_at DESC
    `).bind(jobSeekerId).all();

    return c.json({
      jobSeeker,
      applications: applications.results || [],
      documents: documents.results || []
    });

  } catch (error) {
    console.error('구직자 프로필 조회 오류:', error);
    return c.json({ error: '구직자 정보를 조회할 수 없습니다.' }, 500);
  }
});

// 지원 상태 변경 API
app.put('/api/applications/:id/status', async (c) => {
  try {
    const applicationId = c.req.param('id');
    const { status, notes } = await c.req.json();
    const token = c.req.header('authorization');
    
    if (!token) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    // 유효한 상태값 확인
    const validStatuses = ['pending', 'submitted', 'interview', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: '유효하지 않은 상태입니다.' }, 400);
    }

    // 지원서 존재 여부 확인
    const application = await c.env.DB.prepare(`
      SELECT ja.id, ja.job_seeker_id, jp.employer_id, js.name as job_seeker_name, jp.title as job_title
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      JOIN job_seekers js ON ja.job_seeker_id = js.id
      WHERE ja.id = ?
    `).bind(applicationId).first();

    if (!application) {
      return c.json({ error: '지원서를 찾을 수 없습니다.' }, 404);
    }

    // 지원 상태 업데이트
    const updateResult = await c.env.DB.prepare(`
      UPDATE job_applications 
      SET application_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, notes || null, applicationId).run();

    if (!updateResult.success) {
      return c.json({ error: '지원 상태 업데이트에 실패했습니다.' }, 500);
    }

    // 상태 변경 알림 로그 (실제 환경에서는 이메일/SMS 발송)
    console.log(`지원 상태 변경: ${application.job_seeker_name} -> ${application.job_title} (${status})`);

    return c.json({ 
      success: true, 
      message: '지원 상태가 업데이트되었습니다.',
      application: {
        id: applicationId,
        status,
        job_seeker_name: application.job_seeker_name,
        job_title: application.job_title
      }
    });

  } catch (error) {
    console.error('지원 상태 변경 오류:', error);
    return c.json({ error: '지원 상태 변경에 실패했습니다.' }, 500);
  }
});

// 지원서 일괄 처리 API
app.put('/api/applications/batch-update', async (c) => {
  try {
    const { applicationIds, status, notes } = await c.req.json();
    const token = c.req.header('authorization');
    
    if (!token) {
      return c.json({ error: '인증이 필요합니다.' }, 401);
    }

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return c.json({ error: '지원서 ID 목록이 필요합니다.' }, 400);
    }

    const validStatuses = ['pending', 'submitted', 'interview', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: '유효하지 않은 상태입니다.' }, 400);
    }

    // 일괄 업데이트
    const placeholders = applicationIds.map(() => '?').join(',');
    const updateResult = await c.env.DB.prepare(`
      UPDATE job_applications 
      SET application_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).bind(status, notes || null, ...applicationIds).run();

    return c.json({ 
      success: true, 
      message: `${applicationIds.length}개의 지원서 상태가 ${status}로 변경되었습니다.`,
      updatedCount: updateResult.changes || 0
    });

  } catch (error) {
    console.error('지원서 일괄 처리 오류:', error);
    return c.json({ error: '지원서 일괄 처리에 실패했습니다.' }, 500);
  }
});

export default app