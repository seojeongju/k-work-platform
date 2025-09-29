// 🚀 WOW-CAMPUS 메인 애플리케이션 (리팩토링된 버전)
// 모듈화된 컴포넌트들을 통합하는 엔트리포인트입니다

import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

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
  safeJsonParser
} from './middleware/security';

// 라우트 핸들러들
import api from './routes/api';
import auth from './routes/auth';
import staticPages from './routes/static';

// 메인 애플리케이션 인스턴스
const app = new Hono<{ Bindings: Bindings }>();

// 🔧 글로벌 미들웨어 설정
app.use('*', logger);
app.use('*', corsMiddleware);
app.use('*', securityHeaders);
app.use('*', safeJsonParser);
app.use('*', errorHandler);

// 🚦 Rate limiting
app.use('/api/*', apiRateLimiter);
app.use('/*', rateLimiter);

// 📋 헬스체크 엔드포인트 (간소화)
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

// 메인 홈페이지 라우트 (간소화된 버전)
app.get('/', async (c) => {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WOW-CAMPUS - 외국인을 위한 취업 플랫폼</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .hero {
            text-align: center;
            color: white;
            margin: 4rem 0;
        }
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        .hero p {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin: 3rem 0;
        }
        .card {
            background: rgba(255, 255, 255, 0.95);
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h3 {
            color: #5a67d8;
            margin-bottom: 1rem;
            font-size: 1.4rem;
        }
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: #5a67d8;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 0.5rem;
        }
        .btn:hover {
            background: #4c51bf;
            transform: translateY(-2px);
        }
        .btn-outline {
            background: transparent;
            border: 2px solid #5a67d8;
            color: #5a67d8;
        }
        .btn-outline:hover {
            background: #5a67d8;
            color: white;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 3rem 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 10px;
            color: white;
        }
        .feature h4 {
            margin-bottom: 0.5rem;
            font-size: 1.2rem;
        }
        @media (max-width: 768px) {
            .hero h1 { font-size: 2.5rem; }
            .container { padding: 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>🌟 WOW-CAMPUS</h1>
            <p>외국인을 위한 전문 취업 플랫폼</p>
            <div>
                <a href="/static/register.html" class="btn">회원가입</a>
                <a href="/static/login.html" class="btn btn-outline">로그인</a>
            </div>
        </div>

        <div class="cards">
            <div class="card">
                <h3>🎯 구직자</h3>
                <p>한국에서의 취업 기회를 찾고 있나요? 다양한 업종의 일자리를 확인하고 지원해보세요.</p>
                <a href="/static/register.html?type=jobseeker" class="btn">구직 등록</a>
            </div>
            <div class="card">
                <h3>🏢 기업</h3>
                <p>외국인 인재를 채용하고 싶으신가요? 우수한 외국인 구직자들과 연결해드립니다.</p>
                <a href="/static/register.html?type=employer" class="btn">구인 등록</a>
            </div>
            <div class="card">
                <h3>🤝 에이전트</h3>
                <p>취업 중개 서비스를 제공하시나요? 전문 에이전트로 등록하여 서비스를 확장하세요.</p>
                <a href="/static/register.html?type=agent" class="btn">에이전트 등록</a>
            </div>
        </div>

        <div class="features">
            <div class="feature">
                <h4>🔒 안전한 플랫폼</h4>
                <p>검증된 기업과 구직자만 등록</p>
            </div>
            <div class="feature">
                <h4>🌐 다국어 지원</h4>
                <p>한국어, 영어, 중국어 지원</p>
            </div>
            <div class="feature">
                <h4>📱 모바일 최적화</h4>
                <p>언제 어디서나 편리하게</p>
            </div>
            <div class="feature">
                <h4>⚡ 빠른 매칭</h4>
                <p>AI 기반 스마트 매칭 시스템</p>
            </div>
        </div>
    </div>

    <script>
        // 간단한 상호작용 효과
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.02)';
                });
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });
        });
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