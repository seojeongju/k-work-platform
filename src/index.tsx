// 🚀 WOW-CAMPUS 메인 애플리케이션 (리팩토링된 버전)
// 모듈화된 컴포넌트들을 통합하는 엔트리포인트입니다

import { Hono } from 'hono';
// import { serveStatic } from 'hono/cloudflare-workers';

// 타입 정의
import type { Bindings } from './types';

// 미들웨어들
import {
  securityHeaders,
  rateLimiter,
  apiRateLimiter,
  corsMiddleware,
  logger,
  errorHandler,
  healthCheckCache,
  safeJsonParser,
  suspiciousRequestDetector,
  requestSizeLimit
} from './middleware/security';

// 라우트 핸들러들
import api from './routes/api';
import auth from './routes/auth';
import staticPages from './routes/static';

// 메인 애플리케이션 인스턴스
const app = new Hono<{ Bindings: Bindings }>();

// 🔧 글로벌 미들웨어 설정 (프로덕션 강화)
// app.use('*', suspiciousRequestDetector); // 의심스러운 요청 사전 차단 (일시 비활성화)
// app.use('*', requestSizeLimit(5 * 1024 * 1024)); // 5MB 제한 (일시 비활성화)
app.use('*', logger);
app.use('*', corsMiddleware);
app.use('*', securityHeaders);
app.use('*', safeJsonParser);
app.use('*', errorHandler);

// 🚦 Rate limiting (프로덕션 환경)
app.use('/api/*', apiRateLimiter);
app.use('/*', rateLimiter);

// 📋 헬스체크 엔드포인트 (캐싱 포함)
app.use('/health', healthCheckCache);
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-refactored'
  });
});

// 📡 라우트 그룹 등록
app.route('/api', api);
app.route('/api/auth', auth);
app.route('/static', staticPages);

// 정적 파일 서빙 (개발 환경에서는 비활성화)
// Cloudflare Workers 환경에서만 활성화됩니다
// app.use("/*", serveStatic({ root: "./" } as any));

// 메인 홈페이지 라우트 (완전한 기능 포함)
app.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS - 외국인을 위한 종합 플랫폼 | 취업·유학·정착</title>
    <meta name="description" content="외국인을 위한 한국 취업, 유학, 정착 정보를 제공하는 종합 플랫폼입니다.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'wow-blue': '#667eea',
                        'wow-purple': '#764ba2',
                        'wow-green': '#10b981',
                        'wow-orange': '#f59e0b'
                    },
                    animation: {
                        'fade-in-up': 'fadeInUp 0.6s ease-out',
                        'fade-in': 'fadeIn 0.8s ease-out',
                        'bounce-slow': 'bounce 3s infinite'
                    }
                }
            }
        }
    </script>
    
    <style>
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        }
        .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .nav-link {
            transition: all 0.3s ease;
            position: relative;
        }
        .nav-link:hover::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: #fff;
        }
    </style>
</head>
<body class="font-sans">
    <!-- 네비게이션 -->
    <nav class="fixed top-0 w-full z-50 glass-effect">
        <div class="container mx-auto px-4 py-3">
            <div class="flex items-center justify-between">
                <!-- 로고 -->
                <div class="flex items-center space-x-2">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <span class="text-wow-blue font-bold text-xl">W</span>
                    </div>
                    <span class="text-white font-bold text-xl">WOW-CAMPUS</span>
                </div>
                
                <!-- 데스크톱 메뉴 -->
                <div class="hidden md:flex items-center space-x-8">
                    <a href="#jobs" class="nav-link text-white hover:text-wow-green">구인정보</a>
                    <a href="#jobseekers" class="nav-link text-white hover:text-wow-green">구직정보</a>
                    <a href="#study" class="nav-link text-white hover:text-wow-green">유학정보</a>
                    <a href="/static/login.html" class="nav-link text-white hover:text-wow-green">로그인</a>
                    <a href="/static/register.html" class="bg-white text-wow-blue px-6 py-2 rounded-full font-semibold hover:bg-wow-green hover:text-white transition-all">회원가입</a>
                </div>
                
                <!-- 모바일 메뉴 버튼 -->
                <button id="mobile-menu-btn" class="md:hidden text-white text-2xl">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            
            <!-- 모바일 메뉴 -->
            <div id="mobile-menu" class="md:hidden hidden mt-4 pb-4">
                <a href="#jobs" class="block py-2 text-white hover:text-wow-green">구인정보</a>
                <a href="#jobseekers" class="block py-2 text-white hover:text-wow-green">구직정보</a>
                <a href="#study" class="block py-2 text-white hover:text-wow-green">유학정보</a>
                <a href="/static/login.html" class="block py-2 text-white hover:text-wow-green">로그인</a>
                <a href="/static/register.html" class="block py-2 mt-2 bg-white text-wow-blue px-4 py-2 rounded-full text-center font-semibold">회원가입</a>
            </div>
        </div>
    </nav>

    <!-- 메인 히어로 섹션 -->
    <section class="gradient-bg min-h-screen flex items-center justify-center pt-20">
        <div class="container mx-auto px-4 text-center text-white">
            <div class="animate-fade-in-up">
                <h1 class="text-5xl md:text-7xl font-bold mb-6">
                    🌟 WOW-CAMPUS
                </h1>
                <p class="text-xl md:text-2xl mb-4 opacity-90">
                    외국인을 위한 종합 플랫폼
                </p>
                <p class="text-lg mb-8 opacity-75">
                    취업 · 유학 · 정착을 위한 모든 정보를 한 곳에서
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/static/register.html" class="bg-white text-wow-blue px-8 py-4 rounded-full font-bold text-lg hover:bg-wow-green hover:text-white transition-all transform hover:scale-105">
                        무료 회원가입
                    </a>
                    <a href="#services" class="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-wow-blue transition-all">
                        서비스 둘러보기
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- 서비스 소개 -->
    <section id="services" class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">우리가 제공하는 서비스</h2>
                <p class="text-xl text-gray-600">외국인의 한국 생활을 위한 모든 것</p>
            </div>
            
            <div class="grid md:grid-cols-4 gap-8">
                <!-- 구인정보 -->
                <div class="text-center group hover:transform hover:scale-105 transition-all duration-300">
                    <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-2xl">
                        <i class="fas fa-briefcase text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">구인정보</h3>
                    <p class="text-gray-600 mb-6">외국인 채용을 원하는 기업들의 최신 채용 공고를 확인하세요.</p>
                    <a href="#jobs" class="inline-block bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors">
                        채용정보 보기
                    </a>
                </div>
                
                <!-- 구직정보 -->
                <div class="text-center group hover:transform hover:scale-105 transition-all duration-300">
                    <div class="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-2xl">
                        <i class="fas fa-user-tie text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">구직정보</h3>
                    <p class="text-gray-600 mb-6">취업을 희망하는 외국인들의 프로필을 확인하고 연결하세요.</p>
                    <a href="#jobseekers" class="inline-block bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition-colors">
                        인재정보 보기
                    </a>
                </div>
                
                <!-- 유학정보 -->
                <div class="text-center group hover:transform hover:scale-105 transition-all duration-300">
                    <div class="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-2xl">
                        <i class="fas fa-graduation-cap text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">유학정보</h3>
                    <p class="text-gray-600 mb-6">한국 대학교 및 교육기관 정보, 장학금, 입학 가이드를 제공합니다.</p>
                    <a href="#study" class="inline-block bg-purple-500 text-white px-6 py-3 rounded-full hover:bg-purple-600 transition-colors">
                        유학정보 보기
                    </a>
                </div>
                
                <!-- 정착지원 -->
                <div class="text-center group hover:transform hover:scale-105 transition-all duration-300">
                    <div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:shadow-2xl">
                        <i class="fas fa-home text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">정착지원</h3>
                    <p class="text-gray-600 mb-6">비자, 주거, 생활정보 등 한국 정착을 위한 종합 가이드를 제공합니다.</p>
                    <a href="#settlement" class="inline-block bg-orange-500 text-white px-6 py-3 rounded-full hover:bg-orange-600 transition-colors">
                        정착가이드 보기
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- 구인정보 섹션 -->
    <section id="jobs" class="py-20 bg-gray-50">
        <div class="container mx-auto px-4">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">🏢 최신 구인정보</h2>
                <p class="text-xl text-gray-600">외국인 채용을 원하는 기업들의 채용 공고</p>
            </div>
            
            <div id="jobs-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <!-- 동적으로 로드됨 -->
            </div>
            
            <div class="text-center">
                <a href="/jobs" class="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
                    더 많은 채용정보 보기
                </a>
            </div>
        </div>
    </section>

    <!-- 구직정보 섹션 -->
    <section id="jobseekers" class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">🎯 구직자 정보</h2>
                <p class="text-xl text-gray-600">취업을 희망하는 우수한 외국인 인재들</p>
            </div>
            
            <div id="jobseekers-list" class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- 동적으로 로드됨 -->
            </div>
            
            <div class="text-center">
                <a href="/jobseekers" class="inline-block bg-green-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-700 transition-colors">
                    더 많은 인재정보 보기
                </a>
            </div>
        </div>
    </section>

    <!-- 유학정보 섹션 -->
    <section id="study" class="py-20 bg-purple-50">
        <div class="container mx-auto px-4">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">🎓 한국 유학정보</h2>
                <p class="text-xl text-gray-600">한국 교육의 모든 것을 알아보세요</p>
            </div>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <!-- 대학교 정보 -->
                <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
                    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-university text-purple-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-3">대학교 정보</h3>
                    <p class="text-gray-600 mb-4">한국 주요 대학교들의 입학요건, 학비, 전공정보를 확인하세요.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• SKY 대학교 (서울대, 고려대, 연세대)</li>
                        <li>• 주요 국립대학교</li>
                        <li>• 특성화 대학교</li>
                    </ul>
                </div>
                
                <!-- 장학금 정보 -->
                <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-award text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-3">장학금 정보</h3>
                    <p class="text-gray-600 mb-4">외국인 학생을 위한 다양한 장학금 프로그램을 소개합니다.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• 정부초청장학금 (GKS)</li>
                        <li>• 대학별 장학금</li>
                        <li>• 사설 장학금</li>
                    </ul>
                </div>
                
                <!-- 어학연수 -->
                <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-comments text-blue-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-3">어학연수</h3>
                    <p class="text-gray-600 mb-4">한국어 능력 향상을 위한 어학원 및 프로그램 정보입니다.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• 대학 부설 어학원</li>
                        <li>• 사설 어학원</li>
                        <li>• 온라인 한국어 과정</li>
                    </ul>
                </div>
            </div>
            
            <div class="text-center">
                <a href="/study" class="inline-block bg-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-purple-700 transition-colors">
                    유학정보 자세히 보기
                </a>
            </div>
        </div>
    </section>

    <!-- 통계 섹션 -->
    <section class="py-20 gradient-bg">
        <div class="container mx-auto px-4 text-center text-white">
            <h2 class="text-4xl font-bold mb-12">📊 WOW-CAMPUS 현황</h2>
            
            <div class="grid md:grid-cols-4 gap-8">
                <div class="animate-fade-in">
                    <div class="text-4xl font-bold mb-2" id="total-users">0</div>
                    <div class="text-lg opacity-90">총 회원수</div>
                </div>
                <div class="animate-fade-in">
                    <div class="text-4xl font-bold mb-2" id="total-jobs">0</div>
                    <div class="text-lg opacity-90">채용공고</div>
                </div>
                <div class="animate-fade-in">
                    <div class="text-4xl font-bold mb-2" id="successful-matches">0</div>
                    <div class="text-lg opacity-90">성공한 매칭</div>
                </div>
                <div class="animate-fade-in">
                    <div class="text-4xl font-bold mb-2" id="active-companies">0</div>
                    <div class="text-lg opacity-90">등록 기업</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-12">
        <div class="container mx-auto px-4">
            <div class="grid md:grid-cols-4 gap-8">
                <div>
                    <div class="flex items-center space-x-2 mb-4">
                        <div class="w-8 h-8 bg-wow-blue rounded-full flex items-center justify-center">
                            <span class="text-white font-bold">W</span>
                        </div>
                        <span class="font-bold text-xl">WOW-CAMPUS</span>
                    </div>
                    <p class="text-gray-400">외국인을 위한 한국 취업, 유학, 정착 종합 플랫폼</p>
                </div>
                
                <div>
                    <h4 class="font-bold mb-4">서비스</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#jobs" class="hover:text-white">구인정보</a></li>
                        <li><a href="#jobseekers" class="hover:text-white">구직정보</a></li>
                        <li><a href="#study" class="hover:text-white">유학정보</a></li>
                        <li><a href="#settlement" class="hover:text-white">정착지원</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-bold mb-4">고객지원</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="/support" class="hover:text-white">고객센터</a></li>
                        <li><a href="/faq" class="hover:text-white">자주묻는질문</a></li>
                        <li><a href="/guide" class="hover:text-white">이용가이드</a></li>
                        <li><a href="/contact" class="hover:text-white">문의하기</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-bold mb-4">연락처</h4>
                    <div class="space-y-2 text-gray-400">
                        <p><i class="fas fa-phone mr-2"></i> 1588-0000</p>
                        <p><i class="fas fa-envelope mr-2"></i> contact@w-campus.com</p>
                        <p><i class="fas fa-map-marker-alt mr-2"></i> 서울특별시 강남구</p>
                    </div>
                </div>
            </div>
            
            <div class="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2025 WOW-CAMPUS. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script>
        // 모바일 메뉴 토글
        document.getElementById('mobile-menu-btn').addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // 스무스 스크롤
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // 통계 애니메이션 & 데이터 로드
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // 통계 데이터 로드
                const response = await fetch('/api/stats');
                if (response.ok) {
                    const stats = await response.json();
                    
                    // 애니메이션과 함께 통계 업데이트
                    const updateCounter = (elementId, targetValue) => {
                        const element = document.getElementById(elementId);
                        if (element) {
                            let current = 0;
                            const increment = targetValue / 50;
                            const timer = setInterval(() => {
                                current += increment;
                                if (current >= targetValue) {
                                    current = targetValue;
                                    clearInterval(timer);
                                }
                                element.textContent = Math.floor(current).toLocaleString();
                            }, 50);
                        }
                    };
                    
                    updateCounter('total-users', stats.totalJobSeekers + stats.totalEmployers + stats.activeAgents || 1234);
                    updateCounter('total-jobs', stats.activeJobs || 456);
                    updateCounter('successful-matches', stats.successfulMatches || 789);
                    updateCounter('active-companies', stats.totalEmployers || 234);
                } else {
                    // 기본값 표시
                    document.getElementById('total-users').textContent = '1,234';
                    document.getElementById('total-jobs').textContent = '456';
                    document.getElementById('successful-matches').textContent = '789';
                    document.getElementById('active-companies').textContent = '234';
                }
                
                // 구인정보 로드
                loadJobs();
                
                // 구직자 정보 로드
                loadJobSeekers();
                
            } catch (error) {
                console.error('Failed to load statistics:', error);
                // 에러 시 기본값 표시
                document.getElementById('total-users').textContent = '1,234';
                document.getElementById('total-jobs').textContent = '456';
                document.getElementById('successful-matches').textContent = '789';
                document.getElementById('active-companies').textContent = '234';
            }
        });

        // 구인정보 로드
        async function loadJobs() {
            try {
                const response = await fetch('/api/jobs?limit=6');
                if (response.ok) {
                    const data = await response.json();
                    const jobsList = document.getElementById('jobs-list');
                    
                    if (data.jobs && data.jobs.length > 0) {
                        jobsList.innerHTML = data.jobs.map(job => \`
                            <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <h3 class="text-lg font-bold text-gray-800">\${job.title}</h3>
                                    <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">\${job.visa_type || 'E-7'}</span>
                                </div>
                                <p class="text-gray-600 mb-2"><i class="fas fa-building mr-2"></i>\${job.company}</p>
                                <p class="text-gray-600 mb-2"><i class="fas fa-map-marker-alt mr-2"></i>\${job.location}</p>
                                <p class="text-gray-600 mb-4"><i class="fas fa-won-sign mr-2"></i>\${job.salary || '협의'}</p>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-500">\${new Date(job.created_at).toLocaleDateString()}</span>
                                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">지원하기</button>
                                </div>
                            </div>
                        \`).join('');
                    } else {
                        jobsList.innerHTML = '<div class="col-span-full text-center text-gray-500">등록된 채용공고가 없습니다.</div>';
                    }
                }
            } catch (error) {
                console.error('Failed to load jobs:', error);
            }
        }

        // 구직자 정보 로드
        async function loadJobSeekers() {
            try {
                const response = await fetch('/api/jobseekers?limit=8');
                if (response.ok) {
                    const data = await response.json();
                    const jobseekersList = document.getElementById('jobseekers-list');
                    
                    if (data.jobseekers && data.jobseekers.length > 0) {
                        jobseekersList.innerHTML = data.jobseekers.map(jobseeker => \`
                            <div class="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                                <div class="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <i class="fas fa-user text-white text-xl"></i>
                                </div>
                                <h3 class="font-bold text-gray-800 mb-2">\${jobseeker.name}</h3>
                                <p class="text-sm text-gray-600 mb-1">\${jobseeker.nationality}</p>
                                <p class="text-sm text-gray-600 mb-2">\${jobseeker.korean_level} 한국어</p>
                                <p class="text-xs text-gray-500 mb-3">\${jobseeker.visa_status}</p>
                                <button class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">연락하기</button>
                            </div>
                        \`).join('');
                    } else {
                        jobseekersList.innerHTML = '<div class="col-span-full text-center text-gray-500">등록된 구직자가 없습니다.</div>';
                    }
                }
            } catch (error) {
                console.error('Failed to load jobseekers:', error);
            }
        }
    </script>
</body>
</html>`;
  
  return c.html(html);
});

// 404 핸들러
app.notFound((c) => {
  return c.json({ 
    error: 'Not Found', 
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: c.req.path 
  }, 404);
});

// 🚀 애플리케이션 익스포트
export default app;