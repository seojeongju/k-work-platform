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
    <!-- Tailwind CSS with fallback -->
    <script src="https://cdn.tailwindcss.com" onerror="this.remove()"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Fallback CSS if Tailwind fails to load -->
    <style id="fallback-css">
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .space-x-2 > * + * { margin-left: 0.5rem; }
        .space-x-8 > * + * { margin-left: 2rem; }
        .hidden { display: none; }
        .fixed { position: fixed; }
        .top-0 { top: 0; }
        .w-full { width: 100%; }
        .z-50 { z-index: 50; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .bg-white { background-color: #ffffff; }
        .text-white { color: #ffffff; }
        .rounded-full { border-radius: 9999px; }
        .font-bold { font-weight: 700; }
        .text-xl { font-size: 1.25rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .mt-16 { margin-top: 4rem; }
        .text-center { text-align: center; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-8 { margin-bottom: 2rem; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
        .gap-8 { gap: 2rem; }
        .p-6 { padding: 1.5rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        @media (min-width: 768px) {
            .md\\:flex { display: flex; }
            .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
            .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        }
    </style>
    
    <script>
        // Tailwind config (will only work if Tailwind loads)
        if (window.tailwind) {
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            'wow-blue': '#667eea',
                            'wow-purple': '#764ba2',
                            'wow-green': '#10b981',
                            'wow-orange': '#f59e0b'
                        }
                    }
                }
            };
        }
    </script>
    
    <style>
        /* 현대적이고 깔끔한 스타일 */
        .glass-effect {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(229, 231, 235, 0.3);
        }
        .nav-link {
            text-decoration: none;
            color: #374151;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        .nav-link:hover {
            color: #3b82f6;
            background-color: #eff6ff;
        }
        .btn-primary {
            background-color: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            font-weight: 600;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .btn-primary:hover {
            background-color: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        /* 모바일 메뉴 스타일 개선 */
        .mobile-menu {
            display: none;
            background: white;
            padding: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 0 0 1rem 1rem;
        }
        .mobile-menu a {
            display: block;
            color: #374151;
            padding: 0.75rem 0;
            text-decoration: none;
            border-bottom: 1px solid #f3f4f6;
            font-weight: 500;
        }
        .mobile-menu a:hover {
            color: #3b82f6;
        }
        /* 반응형 디자인 */
        @media (max-width: 768px) {
            .desktop-menu { display: none; }
            .mobile-toggle { display: block; }
            .hero-section { 
                grid-template-columns: 1fr; 
                gap: 2rem; 
                text-align: center; 
            }
            .hero-title { font-size: 2.5rem; }
            .steps-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            .services-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
            .hero-title { font-size: 3rem; }
        }
        /* 호버 효과 개선 */
        .service-card {
            transition: all 0.3s ease;
        }
        .service-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        /* 로딩 애니메이션 */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
            animation: fadeInUp 0.6s ease-out;
        }
    </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; line-height: 1.6;">
    <!-- 깔끔한 네비게이션 -->
    <nav class="fixed top-0 w-full z-50 glass-effect" style="position: fixed; top: 0; width: 100%; z-index: 50;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <!-- 로고 -->
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 2.5rem; height: 2.5rem; background: #3b82f6; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-weight: bold; font-size: 1.125rem;">W</span>
                    </div>
                    <span style="color: #1e293b; font-weight: 800; font-size: 1.25rem;">WOW-CAMPUS</span>
                </div>
                
                <!-- 데스크톱 메뉴 -->
                <div class="desktop-menu" style="display: flex; align-items: center; gap: 1rem;">
                    <a href="#jobs" class="nav-link">구인정보</a>
                    <a href="#jobseekers" class="nav-link">구직정보</a>
                    <a href="#study" class="nav-link">유학정보</a>
                    <a href="/static/login.html" class="nav-link">로그인</a>
                    <a href="/static/register.html" class="btn-primary" style="margin-left: 0.5rem;">회원가입</a>
                </div>
                
                <!-- 모바일 메뉴 버튼 -->
                <button id="mobile-menu-btn" class="mobile-toggle" style="display: none; color: #374151; background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0.5rem;">
                    ☰
                </button>
            </div>
            
            <!-- 모바일 메뉴 -->
            <div id="mobile-menu" class="mobile-menu">
                <a href="#jobs">구인정보</a>
                <a href="#jobseekers">구직정보</a>
                <a href="#study">유학정보</a>
                <a href="/static/login.html">로그인</a>
                <a href="/static/register.html" class="btn-primary" style="margin-top: 0.5rem; text-align: center;">회원가입</a>
            </div>
        </div>
    </nav>

    <!-- 깔끔한 히어로 섹션 -->
    <section style="background: #f8fafc; padding: 6rem 0 4rem; min-height: 80vh; display: flex; align-items: center;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div class="hero-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;">
                <!-- 왼쪽: 메인 메시지 -->
                <div class="fade-in">
                    <div style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 2rem; display: inline-block; font-size: 0.875rem; margin-bottom: 1.5rem; font-weight: 600;">
                        🌟 외국인 전용 플랫폼
                    </div>
                    <h1 class="hero-title" style="font-size: 3.5rem; font-weight: 800; color: #1e293b; margin-bottom: 1.5rem; line-height: 1.1;">
                        한국에서의<br>
                        <span style="color: #3b82f6;">새로운 시작</span>
                    </h1>
                    <p style="font-size: 1.25rem; color: #64748b; margin-bottom: 2rem; line-height: 1.6;">
                        취업부터 유학까지, 외국인의 한국 정착을 위한<br>
                        모든 정보와 기회를 한 곳에서 만나보세요.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
                        <a href="/static/register.html" class="btn-primary" style="background: #3b82f6; color: white; padding: 1rem 2rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                            무료로 시작하기 →
                        </a>
                        <a href="#how-it-works" style="background: transparent; color: #3b82f6; padding: 1rem 2rem; border: 2px solid #3b82f6; border-radius: 0.75rem; text-decoration: none; font-weight: 600; font-size: 1rem; transition: all 0.3s ease;">
                            이용 방법 보기
                        </a>
                    </div>
                    <!-- 신뢰도 지표 -->
                    <div style="display: flex; flex-wrap: wrap; gap: 2rem; font-size: 0.875rem; color: #64748b;">
                        <div><strong style="color: #1e293b; font-size: 1.25rem;">1,200+</strong><br>활성 사용자</div>
                        <div><strong style="color: #1e293b; font-size: 1.25rem;">500+</strong><br>채용 공고</div>
                        <div><strong style="color: #1e293b; font-size: 1.25rem;">98%</strong><br>만족도</div>
                    </div>
                </div>
                
                <!-- 오른쪽: 비주얼 -->
                <div style="text-align: center; position: relative;">
                    <div style="background: white; padding: 3rem 2rem; border-radius: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); margin: 2rem 0; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
                        <!-- 배경 장식 -->
                        <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, #eff6ff 0%, #f8fafc 50%, #faf5ff 100%); opacity: 0.5; border-radius: 50%;"></div>
                        
                        <div style="position: relative; z-index: 1;">
                            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🌍</div>
                            <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem;">글로벌 커뮤니티</h3>
                            <p style="color: #64748b; font-size: 1rem;">전 세계 외국인들과 함께하는 새로운 경험</p>
                            
                            <!-- 미니 스탯 -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">
                                <div style="text-align: center; padding: 1rem; background: #eff6ff; border-radius: 0.75rem;">
                                    <div style="font-weight: 700; font-size: 1.25rem; color: #3b82f6;">25+</div>
                                    <div style="font-size: 0.8rem; color: #64748b;">국가</div>
                                </div>
                                <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 0.75rem;">
                                    <div style="font-weight: 700; font-size: 1.25rem; color: #22c55e;">100+</div>
                                    <div style="font-size: 0.8rem; color: #64748b;">대학</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 이용 방법 섹션 -->
    <section id="how-it-works" style="padding: 5rem 0; background: white;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <h2 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem;">
                    어떻게 이용하나요?
                </h2>
                <p style="font-size: 1.125rem; color: #64748b; max-width: 600px; margin: 0 auto;">
                    간단한 3단계로 원하는 정보와 기회를 찾아보세요
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 4rem;">
                <div style="text-align: center; padding: 2rem;">
                    <div style="width: 4rem; height: 4rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <span style="font-size: 1.5rem; color: #3b82f6;">1</span>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">회원가입</h3>
                    <p style="color: #64748b; font-size: 0.9rem;">간단한 정보로 무료 가입</p>
                </div>
                
                <div style="text-align: center; padding: 2rem;">
                    <div style="width: 4rem; height: 4rem; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <span style="font-size: 1.5rem; color: #22c55e;">2</span>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">정보 탐색</h3>
                    <p style="color: #64748b; font-size: 0.9rem;">원하는 카테고리 선택</p>
                </div>
                
                <div style="text-align: center; padding: 2rem;">
                    <div style="width: 4rem; height: 4rem; background: #fef3f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <span style="font-size: 1.5rem; color: #ef4444;">3</span>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">기회 연결</h3>
                    <p style="color: #64748b; font-size: 0.9rem;">적합한 기회 발견하기</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 주요 서비스 -->
    <section id="services" style="padding: 5rem 0; background: #f8fafc;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <h2 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem;">
                    주요 서비스
                </h2>
                <p style="font-size: 1.125rem; color: #64748b;">
                    외국인을 위한 맞춤형 서비스를 제공합니다
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <!-- 구인정보 -->
                <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                    <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                        <div style="width: 3rem; height: 3rem; background: #eff6ff; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                            <span style="font-size: 1.25rem;">💼</span>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">구인정보</h3>
                    </div>
                    <p style="color: #64748b; margin-bottom: 1.5rem; line-height: 1.6;">
                        외국인 채용을 원하는 기업들의 최신 채용 공고를 확인하고 지원하세요.
                    </p>
                    <a href="#jobs" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block; transition: all 0.3s ease;">
                        채용공고 보기 →
                    </a>
                </div>
                
                <!-- 구직정보 -->
                <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                    <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                        <div style="width: 3rem; height: 3rem; background: #f0fdf4; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                            <span style="font-size: 1.25rem;">👔</span>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">구직정보</h3>
                    </div>
                    <p style="color: #64748b; margin-bottom: 1.5rem; line-height: 1.6;">
                        취업을 희망하는 우수한 외국인 인재들의 프로필을 확인하고 연결하세요.
                    </p>
                    <a href="#jobseekers" style="background: #22c55e; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block; transition: all 0.3s ease;">
                        인재정보 보기 →
                    </a>
                </div>
                
                <!-- 유학정보 -->
                <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                    <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                        <div style="width: 3rem; height: 3rem; background: #faf5ff; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                            <span style="font-size: 1.25rem;">🎓</span>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">유학정보</h3>
                    </div>
                    <p style="color: #64748b; margin-bottom: 1.5rem; line-height: 1.6;">
                        한국 대학교 정보, 장학금 안내, 입학 가이드 등 유학 관련 모든 정보를 제공합니다.
                    </p>
                    <a href="#study" style="background: #8b5cf6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: inline-block; transition: all 0.3s ease;">
                        유학정보 보기 →
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
        // DOM 로드 후 실행
        document.addEventListener('DOMContentLoaded', function() {
            // 모바일 메뉴 토글 (안전한 방식)
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', function() {
                    if (mobileMenu.style.display === 'none' || mobileMenu.style.display === '') {
                        mobileMenu.style.display = 'block';
                    } else {
                        mobileMenu.style.display = 'none';
                    }
                });
            }

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
                        // 모바일 메뉴 닫기
                        if (mobileMenu) {
                            mobileMenu.style.display = 'none';
                        }
                    }
                });
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