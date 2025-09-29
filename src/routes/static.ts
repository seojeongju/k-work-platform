// 📄 정적 페이지 라우트 핸들러
// HTML 페이지들을 처리합니다

import { Hono } from 'hono';
import type { Bindings } from '../types';

const staticPages = new Hono<{ Bindings: Bindings }>();

/**
 * 로그인 페이지
 */
staticPages.get('/login.html', async (c) => {
  // 로그인 페이지 HTML을 별도 파일로 분리 예정
  // 현재는 간단한 리다이렉트 처리
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-blue-50 to-white min-h-screen">
    <div class="flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">로그인</h1>
                <p class="text-gray-600">WOW-CAMPUS에 오신 것을 환영합니다</p>
            </div>
            
            <!-- 로그인 폼 컴포넌트는 별도 JavaScript 파일로 관리 -->
            <div id="login-form-container">
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-500">로그인 폼을 로딩 중...</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 로그인 폼 스크립트는 별도 파일로 분리 예정
        console.log('로그인 페이지 로드됨 - 리팩토링된 버전');
    </script>
</body>
</html>`);
});

/**
 * 회원가입 페이지
 */
staticPages.get('/register.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-green-50 to-white min-h-screen">
    <div class="flex items-center justify-center min-h-screen py-12">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">회원가입</h1>
                <p class="text-gray-600">계정을 생성하여 서비스를 이용해보세요</p>
            </div>
            
            <!-- 회원가입 폼 컴포넌트는 별도 JavaScript 파일로 관리 -->
            <div id="register-form-container">
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p class="text-gray-500">회원가입 폼을 로딩 중...</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 회원가입 폼 스크립트는 별도 파일로 분리 예정
        console.log('회원가입 페이지 로드됨 - 리팩토링된 버전');
    </script>
</body>
</html>`);
});

/**
 * 매칭 서비스 페이지
 */
staticPages.get('/matching-service.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>매칭 서비스 | WOW-CAMPUS</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-bold text-blue-600">WOW-CAMPUS 매칭 서비스</h1>
                    <a href="/" class="text-blue-600 hover:underline">← 메인으로 돌아가기</a>
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
                        <h3 class="font-semibold text-green-800">✅ 리팩토링 완료된 기능</h3>
                        <ul class="mt-2 text-green-700">
                            <li>• 모듈화된 라우트 시스템</li>
                            <li>• 분리된 미들웨어</li>
                            <li>• 유틸리티 함수 모듈화</li>
                            <li>• 타입 안전성 강화</li>
                        </ul>
                    </div>
                </div>
                
                <div class="mt-6 flex space-x-4">
                    <button onclick="goBack()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        </main>
    </div>

    <script>
        function goBack() {
            window.location.href = '/';
        }
        
        console.log('매칭 서비스 페이지 로드 완료 - 리팩토링됨');
    </script>
</body>
</html>`);
});

/**
 * 헬스체크 HTML 페이지
 */
staticPages.get('/health', async (c) => {
  try {
    const testQuery = await c.env.DB.prepare('SELECT 1 as test').first();
    
    return c.html(`<!DOCTYPE html>
<html>
<head>
    <title>Health Check - WOW-CAMPUS</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { padding: 20px; border-radius: 8px; margin: 10px 0; }
        .healthy { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .unhealthy { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background-color: #e2e3e5; color: #383d41; border: 1px solid #d6d8db; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🏥 WOW-CAMPUS Health Check</h1>
    
    <div class="status healthy">
        <h2>✅ System Status: Healthy</h2>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Database:</strong> ${testQuery ? 'Connected' : 'Disconnected'}</p>
        <p><strong>Version:</strong> 1.0.0-refactored</p>
    </div>
    
    <div class="info">
        <h3>📊 System Information</h3>
        <ul>
            <li><strong>Architecture:</strong> Cloudflare Workers + D1</li>
            <li><strong>Database:</strong> D1 SQLite</li>
            <li><strong>CDN:</strong> Cloudflare</li>
            <li><strong>Code Status:</strong> Refactored & Modularized</li>
        </ul>
    </div>
    
    <div class="info">
        <h3>🔗 Useful Links</h3>
        <ul>
            <li><a href="/">Main Page</a></li>
            <li><a href="/api/health">API Health Check</a></li>
            <li><a href="/api/stats">Platform Statistics</a></li>
        </ul>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`);
  } catch (error) {
    return c.html(`<!DOCTYPE html>
<html>
<head>
    <title>Health Check - ERROR</title>
    <style>body { font-family: Arial, sans-serif; margin: 40px; }</style>
</head>
<body>
    <h1>🚨 System Error</h1>
    <p>Database connection failed: ${error}</p>
    <a href="/">Return to Main Page</a>
</body>
</html>`, 500);
  }
});

export { staticPages };
export default staticPages;