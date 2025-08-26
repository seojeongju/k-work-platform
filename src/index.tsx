import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { sign, verify } from 'hono/jwt'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'https://job-platform.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// 렌더러 설정
app.use(renderer)

// JWT 토큰 검증 미들웨어
const JWT_SECRET = 'job-platform-secret-key-2024';

async function verifyToken(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증이 필요합니다.' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = await jwt.verify(token, JWT_SECRET);
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
    '1급': 'beginner',
    '2급': 'beginner',
    '3급': 'intermediate', 
    '4급': 'intermediate',
    '5급': 'advanced',
    '6급': 'advanced',
    '기타': 'beginner'
  }
  
  return levelMap[level] || 'beginner'
}

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>wow3D 외국인 구인구직 및 유학생 지원플랫폼</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3B82F6',
                  secondary: '#1E40AF'
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
            transition: all 0.2s ease;
          }
          .group:hover .nav-dropdown-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
          .nav-dropdown-btn:hover {
            color: #3B82F6;
          }
        </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="flex items-center space-x-4 hover:opacity-80 transition-opacity cursor-pointer">
                        <i class="fas fa-globe text-primary text-3xl"></i>
                        <h1 class="text-2xl font-bold text-gray-800">wow3D 외국인 구인구직 및 유학생 지원플랫폼</h1>
                    </a>
                    <nav class="hidden md:flex space-x-6">
                        <div class="relative group">
                            <button class="nav-dropdown-btn text-gray-600 hover:text-primary flex items-center">
                                구인 <i class="fas fa-chevron-down ml-1"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-48 bg-white shadow-lg rounded-lg border py-2 hidden group-hover:block z-50">
                                <a href="#" onclick="showJobListView()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">구인정보 보기</a>
                                <a href="#" onclick="showJobRegisterForm()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">구인정보 등록</a>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="nav-dropdown-btn text-gray-600 hover:text-primary flex items-center">
                                구직 <i class="fas fa-chevron-down ml-1"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-48 bg-white shadow-lg rounded-lg border py-2 hidden group-hover:block z-50">
                                <a href="#" onclick="showJobSeekerListView()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">구직자 보기</a>
                                <a href="#" onclick="showJobSeekerRegisterForm()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">구직정보 등록</a>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="nav-dropdown-btn text-gray-600 hover:text-primary flex items-center">
                                유학 <i class="fas fa-chevron-down ml-1"></i>
                            </button>
                            <div class="nav-dropdown-menu absolute left-0 top-full mt-1 w-48 bg-white shadow-lg rounded-lg border py-2 hidden group-hover:block z-50">
                                <a href="#" onclick="showLanguageStudyView()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">어학연수</a>
                                <a href="#" onclick="showUndergraduateView()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">학부(학위)과정</a>
                                <a href="#" onclick="showGraduateView()" class="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary">석·박사과정</a>
                            </div>
                        </div>
                        <a href="/static/agent-dashboard?agentId=1" id="agent-menu" class="text-gray-600 hover:text-primary hidden">에이전트</a>
                        <a href="/static/login.html" id="login-menu" class="text-gray-600 hover:text-primary">로그인</a>
                        <div id="user-menu" class="hidden flex items-center space-x-4">
                            <span class="text-sm text-gray-600">환영합니다, <span id="user-name">사용자님</span></span>
                            <button id="logout-btn" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                                로그아웃
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="container mx-auto px-4 py-8">
            <!-- Hero Section -->
            <section class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">
                    외국인을 위한 한국 취업 & 유학 플랫폼
                </h2>
                <p class="text-xl text-gray-600 mb-8">
                    해외 에이전트와 국내 기업을 연결하여 외국인 인재의 한국 진출을 지원합니다
                </p>
                <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <i class="fas fa-briefcase text-primary text-3xl mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">구인구직 매칭</h3>
                        <p class="text-gray-600">비자별, 직종별, 지역별 맞춤 매칭</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <i class="fas fa-graduation-cap text-primary text-3xl mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">유학 지원</h3>
                        <p class="text-gray-600">한국어 연수부터 학위과정까지</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow" onclick="handleAgentManagementClick()">
                        <i class="fas fa-users text-primary text-3xl mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">에이전트 관리</h3>
                        <p class="text-gray-600">해외 에이전트별 구직자 관리</p>
                    </div>
                </div>
            </section>

            <!-- Dashboard Tabs -->
            <section class="mb-12">
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="border-b">
                        <div class="flex">
                            <button id="tab-jobs" class="tab-button px-6 py-4 bg-primary text-white border-b-2 border-primary">
                                <i class="fas fa-briefcase mr-2"></i>구인 정보
                            </button>
                            <button id="tab-jobseekers" class="tab-button px-6 py-4 text-gray-600 hover:bg-gray-50">
                                <i class="fas fa-users mr-2"></i>구직정보
                            </button>
                            <button id="tab-matching" class="tab-button px-6 py-4 text-gray-600 hover:bg-gray-50">
                                <i class="fas fa-handshake mr-2"></i>매칭
                            </button>
                            <button id="tab-study" class="tab-button px-6 py-4 text-gray-600 hover:bg-gray-50">
                                <i class="fas fa-graduation-cap mr-2"></i>유학 프로그램
                            </button>
                            <button id="tab-stats" class="tab-button px-6 py-4 text-gray-600 hover:bg-gray-50">
                                <i class="fas fa-chart-bar mr-2"></i>통계
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
        </main>

        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-8">
            <div class="container mx-auto px-4 text-center">
                <p>&copy; 2025 wow3D 외국인 구인구직 및 유학생 지원플랫폼. All rights reserved.</p>
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

    const user = await c.env.DB.prepare(
      `SELECT id, email, status FROM ${tableName} WHERE email = ? AND password = ?`
    ).bind(email, password).first()

    if (!user) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // 상태 검증 (에이전트와 기업은 pending도 허용)
    const allowedStatuses = userType === 'jobseeker' 
      ? ['active'] 
      : ['approved', 'active', 'pending'];
    
    if (!allowedStatuses.includes(user.status)) {
      return c.json({ error: '승인되지 않은 계정입니다.' }, 401)
    }

    // 토큰 생성 (간단한 형식 유지)
    const token = `token_${user.id}_${userType}`

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        type: userType,
        status: user.status
      }
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

    const result = await c.env.DB.prepare(`
      INSERT INTO employers (
        email, password, company_name, business_number, industry, 
        contact_person, phone, address, region, website, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email,
      password, // 실제 환경에서는 해시화 필요
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
      korean_level, education_level, work_experience 
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

    const result = await c.env.DB.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        current_visa, desired_visa, phone, current_address, 
        korean_level, education_level, work_experience, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      email,
      password, // 실제 환경에서는 해시화 필요
      name,
      birth_date || null,
      gender || null,
      nationality,
      current_visa || null,
      desired_visa || null,
      phone,
      current_address || null,
      convertedKoreanLevel,
      education_level || null,
      work_experience || null
    ).run()

    // 토큰 생성
    const token = `token_${result.meta.last_row_id}_jobseeker`

    return c.json({
      message: '구직자 회원가입이 완료되었습니다.',
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        type: 'jobseeker',
        name,
        status: 'active'
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

    const result = await c.env.DB.prepare(`
      INSERT INTO agents (
        email, password, company_name, country, contact_person, 
        phone, address, license_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email,
      password, // 실제 환경에서는 해시화 필요
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

// 구인정보 등록 API
app.post('/api/jobs', async (c) => {
  try {
    const jobData = await c.req.json()
    
    // 필수 필드 검증
    const requiredFields = ['company_name', 'contact_person', 'contact_email', 'title', 'work_location', 'required_visa']
    for (const field of requiredFields) {
      if (!jobData[field]) {
        return c.json({ error: `${field} 필드는 필수입니다.` }, 400)
      }
    }
    
    // 기업 정보 먼저 확인하거나 생성
    let employer = await c.env.DB.prepare(`
      SELECT * FROM employers WHERE email = ?
    `).bind(jobData.contact_email).first()
    
    let employerId
    if (!employer) {
      // 새 기업 등록 - employers 테이블 구조에 맞게 수정
      const employerResult = await c.env.DB.prepare(`
        INSERT INTO employers (
          email, password, company_name, business_number, industry, 
          contact_person, phone, address, region, website, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `).bind(
        jobData.contact_email,
        'temp_password', // 임시 비밀번호
        jobData.company_name,
        'temp_business_number_' + Date.now(), // 임시 사업자번호
        jobData.job_category || '기타',
        jobData.contact_person,
        jobData.contact_phone || '000-0000-0000',
        '주소 미입력', // 필수 필드이므로 임시값
        jobData.work_location, // region
        null, // website
      ).run()
      
      employerId = employerResult.meta.last_row_id
    } else {
      employerId = employer.id
    }
    
    // 구인공고 등록 - 실제 테이블 구조에 맞게 수정
    const result = await c.env.DB.prepare(`
      INSERT INTO job_postings (
        employer_id, title, job_category, required_visa, salary_min, salary_max,
        work_location, region, work_hours, benefits, requirements, description,
        korean_level_required, experience_required, deadline, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      employerId,
      jobData.title,
      jobData.job_category || '기타',
      jobData.required_visa,
      jobData.salary_min || null,
      jobData.salary_max || null,
      jobData.work_location,
      jobData.work_location, // region 같은 값 사용
      null, // work_hours
      null, // benefits
      null, // requirements
      jobData.description || null,
      convertKoreanLevel(jobData.korean_level), // korean_level_required
      null, // experience_required
      null, // deadline
    ).run()
    
    return c.json({ 
      success: true,
      jobId: result.meta.last_row_id,
      message: '구인정보가 성공적으로 등록되었습니다.'
    }, 201)
  } catch (error) {
    console.error('Job registration error:', error)
    return c.json({ error: '구인정보 등록 중 오류가 발생했습니다.' }, 500)
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

export default app