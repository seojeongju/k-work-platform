// 🎨 번들된 HTML 템플릿 모음
// Cloudflare Workers 환경에서 사용할 수 있도록 템플릿을 직접 임베드합니다

/**
 * 기본 레이아웃 템플릿
 */
export const BASE_LAYOUT = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - WOW-CAMPUS</title>
    
    <!-- External CSS & JS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Custom Tailwind Config -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'wow-blue': '#667eea',
                        'wow-purple': '#764ba2'
                    }
                }
            }
        }
    </script>
    
    <!-- Custom Styles -->
    <style>
        {{customCSS}}
    </style>
</head>
<body class="{{bodyClass}}">
    <!-- Main Content -->
    {{content}}
    
    <!-- Custom Scripts -->
    <script>
        // Global WOW-CAMPUS utilities
        window.WOW = {
            showNotification: function(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = \`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 \${
                    type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 
                    type === 'warning' ? 'bg-yellow-500' : 
                    'bg-blue-500'
                } text-white\`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            },
            
            validateForm: function(formElement) {
                const inputs = formElement.querySelectorAll('input[required]');
                let isValid = true;
                
                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        input.classList.add('border-red-500');
                        isValid = false;
                    } else {
                        input.classList.remove('border-red-500');
                    }
                });
                
                return isValid;
            }
        };
        
        {{customJS}}
    </script>
</body>
</html>`;

/**
 * 로그인 페이지 템플릿
 */
export const LOGIN_PAGE = `<div class="flex items-center justify-center min-h-screen">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto w-16 h-16 bg-gradient-to-r from-wow-blue to-wow-purple rounded-full flex items-center justify-center mb-4">
                <i class="fas fa-user-circle text-white text-2xl"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">로그인</h1>
            <p class="text-gray-600">WOW-CAMPUS에 오신 것을 환영합니다</p>
        </div>
        
        <!-- 로그인 폼 -->
        <form id="login-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">사용자 유형</label>
                <select id="userType" name="userType" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wow-blue">
                    <option value="">선택해주세요</option>
                    <option value="jobseeker">구직자</option>
                    <option value="employer">기업</option>
                    <option value="agent">에이전트</option>
                    <option value="admin">관리자</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                <input type="email" id="email" name="email" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wow-blue"
                       placeholder="이메일을 입력하세요">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input type="password" id="password" name="password" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wow-blue"
                       placeholder="비밀번호를 입력하세요">
            </div>
            
            <button type="submit" id="login-btn" 
                    class="w-full bg-gradient-to-r from-wow-blue to-wow-purple text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                <span id="login-text">로그인</span>
            </button>
        </form>
        
        <div class="text-center mt-6">
            <p class="text-gray-600">계정이 없으신가요? 
                <a href="/static/register.html" class="text-wow-blue hover:text-wow-purple font-medium">회원가입</a>
            </p>
        </div>
    </div>
</div>`;

/**
 * 회원가입 페이지 템플릿
 */
export const REGISTER_PAGE = `<div class="flex items-center justify-center min-h-screen py-12">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <i class="fas fa-user-plus text-white text-2xl"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">회원가입</h1>
            <p class="text-gray-600">계정을 생성하여 서비스를 이용해보세요</p>
        </div>
        
        <!-- 사용자 유형 선택 -->
        <div id="user-type-selection" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">가입할 계정 유형을 선택하세요</label>
            <div class="grid grid-cols-2 gap-3">
                <button type="button" class="user-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 transition-colors" data-type="jobseeker">
                    <i class="fas fa-user text-2xl text-green-500 mb-2"></i>
                    <div class="font-medium">구직자</div>
                    <div class="text-xs text-gray-500">일자리를 찾는 분</div>
                </button>
                <button type="button" class="user-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors" data-type="employer">
                    <i class="fas fa-building text-2xl text-blue-500 mb-2"></i>
                    <div class="font-medium">기업</div>
                    <div class="text-xs text-gray-500">인재를 채용하는 기업</div>
                </button>
                <button type="button" class="user-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 transition-colors" data-type="agent">
                    <i class="fas fa-handshake text-2xl text-purple-500 mb-2"></i>
                    <div class="font-medium">에이전트</div>
                    <div class="text-xs text-gray-500">중개 서비스 제공자</div>
                </button>
                <button type="button" class="user-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 transition-colors" data-type="student">
                    <i class="fas fa-graduation-cap text-2xl text-indigo-500 mb-2"></i>
                    <div class="font-medium">학생</div>
                    <div class="text-xs text-gray-500">교육 과정 참여자</div>
                </button>
            </div>
        </div>
        
        <div class="text-center mt-6">
            <p class="text-gray-600">이미 계정이 있으신가요? 
                <a href="/static/login.html" class="text-green-500 hover:text-green-600 font-medium">로그인</a>
            </p>
        </div>
    </div>
</div>`;

/**
 * 헬스체크 페이지 템플릿
 */
export const HEALTH_PAGE = `<div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
    <div class="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <i class="fas fa-heartbeat text-white text-2xl"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">시스템 상태</h1>
            <p class="text-gray-600">WOW-CAMPUS 서비스 상태를 확인하세요</p>
        </div>

        <div class="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <span class="text-lg font-semibold text-green-800">모든 시스템 정상 운영 중</span>
                </div>
                <div class="text-sm text-green-600">{{timestamp}}</div>
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">99.9%</div>
                <div class="text-sm text-gray-600">가동률</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">< 100ms</div>
                <div class="text-sm text-gray-600">응답 시간</div>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">{{activeUsers}}</div>
                <div class="text-sm text-gray-600">활성 사용자</div>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-lg">
                <div class="text-2xl font-bold text-orange-600">v2.0.0</div>
                <div class="text-sm text-gray-600">버전</div>
            </div>
        </div>

        <div class="flex justify-center space-x-4">
            <button onclick="window.location.reload()" 
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <i class="fas fa-sync-alt mr-2"></i>새로고침
            </button>
            <a href="/" 
               class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <i class="fas fa-home mr-2"></i>메인으로
            </a>
        </div>
    </div>
</div>`;

/**
 * 404 에러 페이지 템플릿
 */
export const NOT_FOUND_PAGE = `<div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
    <div class="max-w-lg w-full text-center px-4">
        <div class="mb-8">
            <div class="mx-auto w-32 h-32 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
                <i class="fas fa-exclamation-triangle text-white text-5xl"></i>
            </div>
            <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">페이지를 찾을 수 없습니다</h2>
            <p class="text-gray-600 mb-8">요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.</p>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">다음 페이지들을 확인해보세요</h3>
            <div class="grid grid-cols-1 gap-3">
                <a href="/" class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <i class="fas fa-home text-blue-500 w-6"></i>
                    <span class="ml-3 text-left">
                        <div class="font-medium text-gray-800">메인 페이지</div>
                        <div class="text-sm text-gray-500">WOW-CAMPUS 홈으로 이동</div>
                    </span>
                </a>
                
                <a href="/static/login.html" class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <i class="fas fa-sign-in-alt text-green-500 w-6"></i>
                    <span class="ml-3 text-left">
                        <div class="font-medium text-gray-800">로그인</div>
                        <div class="text-sm text-gray-500">계정에 로그인하기</div>
                    </span>
                </a>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button onclick="history.back()" 
                    class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <i class="fas fa-arrow-left mr-2"></i>이전 페이지로
            </button>
            <a href="/" 
               class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <i class="fas fa-home mr-2"></i>메인 페이지로
            </a>
        </div>

        <div class="mt-8 text-xs text-gray-400">
            Error Code: 404 | Path: {{path}} | Time: {{timestamp}}
        </div>
    </div>
</div>`;

/**
 * 템플릿 맵핑
 */
export const TEMPLATES = {
  'layouts/base.html': BASE_LAYOUT,
  'pages/login.html': LOGIN_PAGE,
  'pages/register.html': REGISTER_PAGE,
  'pages/health.html': HEALTH_PAGE,
  'pages/404.html': NOT_FOUND_PAGE,
} as const;

/**
 * 템플릿 타입
 */
export type TemplateName = keyof typeof TEMPLATES;