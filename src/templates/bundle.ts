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
 * 유학 정보 페이지 템플릿
 */
export const STUDY_PAGE = `<div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
    <!-- 헤더 -->
    <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-4">🎓 한국 유학 정보</h1>
            <p class="text-xl opacity-90">꿈을 현실로 만드는 한국 교육의 기회</p>
        </div>
    </div>

    <div class="container mx-auto px-4 py-12">
        <!-- 주요 카테고리 -->
        <div class="grid md:grid-cols-3 gap-8 mb-16">
            <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-university text-purple-600 text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-4">대학교 정보</h2>
                <p class="text-gray-600 mb-6">한국 주요 대학교들의 상세 정보를 확인하세요.</p>
                <button onclick="showCategory('universities')" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
                    자세히 보기
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-award text-green-600 text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-4">장학금 프로그램</h2>
                <p class="text-gray-600 mb-6">다양한 장학금 혜택으로 경제적 부담을 줄이세요.</p>
                <button onclick="showCategory('scholarships')" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                    자세히 보기
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-graduation-cap text-blue-600 text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-4">어학연수</h2>
                <p class="text-gray-600 mb-6">한국어 실력 향상을 위한 어학 프로그램.</p>
                <button onclick="showCategory('language')" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:blue-700 transition-colors">
                    자세히 보기
                </button>
            </div>
        </div>

        <!-- 동적 콘텐츠 영역 -->
        <div id="dynamic-content" class="bg-white rounded-xl shadow-lg p-8">
            <!-- 기본 콘텐츠 -->
            <div id="default-content">
                <h2 class="text-3xl font-bold text-center text-gray-800 mb-8">한국 교육의 우수성</h2>
                <div class="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">🏆 세계적 수준의 교육</h3>
                        <ul class="space-y-2 text-gray-600">
                            <li>• OECD 교육 지표 상위권</li>
                            <li>• 혁신적인 교육 시스템</li>
                            <li>• 우수한 연구 환경</li>
                            <li>• 국제적으로 인정받는 학위</li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">💼 취업 기회</h3>
                        <ul class="space-y-2 text-gray-600">
                            <li>• 글로벌 기업 진출 기회</li>
                            <li>• K-문화 산업 성장</li>
                            <li>• IT·반도체 선진국</li>
                            <li>• 외국인 친화적 정책</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 대학교 정보 -->
            <div id="universities-content" class="hidden">
                <h2 class="text-3xl font-bold text-center text-gray-800 mb-8">🏛️ 주요 대학교</h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 class="text-xl font-bold text-purple-600 mb-2">서울대학교</h3>
                        <p class="text-gray-600 mb-4">한국 최고의 국립대학</p>
                        <ul class="text-sm text-gray-500 space-y-1">
                            <li>• 입학: 3월, 9월</li>
                            <li>• 학비: 약 400-600만원/년</li>
                            <li>• TOPIK 4급 이상</li>
                        </ul>
                    </div>
                    <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 class="text-xl font-bold text-purple-600 mb-2">연세대학교</h3>
                        <p class="text-gray-600 mb-4">역사와 전통의 사립대학</p>
                        <ul class="text-sm text-gray-500 space-y-1">
                            <li>• 입학: 3월, 9월</li>
                            <li>• 학비: 약 800-1200만원/년</li>
                            <li>• TOPIK 4급 이상</li>
                        </ul>
                    </div>
                    <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <h3 class="text-xl font-bold text-purple-600 mb-2">고려대학교</h3>
                        <p class="text-gray-600 mb-4">실용 중심의 명문 사립대</p>
                        <ul class="text-sm text-gray-500 space-y-1">
                            <li>• 입학: 3월, 9월</li>
                            <li>• 학비: 약 800-1200만원/년</li>
                            <li>• TOPIK 4급 이상</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 장학금 정보 -->
            <div id="scholarships-content" class="hidden">
                <h2 class="text-3xl font-bold text-center text-gray-800 mb-8">💰 장학금 프로그램</h2>
                <div class="space-y-6">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 class="text-xl font-bold text-green-800 mb-3">정부초청장학금 (GKS)</h3>
                        <p class="text-gray-700 mb-4">한국 정부에서 제공하는 최고의 장학금 프로그램</p>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold text-gray-800 mb-2">혜택</h4>
                                <ul class="text-sm text-gray-600 space-y-1">
                                    <li>• 등록금 전액 지원</li>
                                    <li>• 생활비 월 90만원</li>
                                    <li>• 한국어 연수 지원</li>
                                    <li>• 항공료 지원</li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800 mb-2">자격요건</h4>
                                <ul class="text-sm text-gray-600 space-y-1">
                                    <li>• 학부: 고등학교 졸업</li>
                                    <li>• 석사: 학사 학위 소지</li>
                                    <li>• 박사: 석사 학위 소지</li>
                                    <li>• 성적: GPA 80% 이상</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 class="text-xl font-bold text-blue-800 mb-3">대학별 장학금</h3>
                        <p class="text-gray-700 mb-4">각 대학교에서 제공하는 다양한 장학금 제도</p>
                        <div class="grid md:grid-cols-3 gap-4">
                            <div class="text-center">
                                <h4 class="font-semibold text-gray-800 mb-2">성적 우수 장학금</h4>
                                <p class="text-sm text-gray-600">학업 성적에 따른 차등 지급</p>
                            </div>
                            <div class="text-center">
                                <h4 class="font-semibold text-gray-800 mb-2">외국인 특별 장학금</h4>
                                <p class="text-sm text-gray-600">외국인 학생 전용 장학금</p>
                            </div>
                            <div class="text-center">
                                <h4 class="font-semibold text-gray-800 mb-2">연구 보조 장학금</h4>
                                <p class="text-sm text-gray-600">연구실 근무를 통한 장학금</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 어학연수 정보 -->
            <div id="language-content" class="hidden">
                <h2 class="text-3xl font-bold text-center text-gray-800 mb-8">🗣️ 한국어 어학연수</h2>
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-blue-50 rounded-lg p-6">
                        <h3 class="text-xl font-bold text-blue-800 mb-4">대학 부설 어학원</h3>
                        <ul class="space-y-3 text-gray-700">
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-blue-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>체계적인 커리큘럼</strong>
                                    <p class="text-sm text-gray-600">1급부터 6급까지 단계별 학습</p>
                                </div>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-blue-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>우수한 강사진</strong>
                                    <p class="text-sm text-gray-600">한국어 교육 전문가들이 직접 수업</p>
                                </div>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-blue-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>대학 진학 연계</strong>
                                    <p class="text-sm text-gray-600">어학원 수료 후 본과 진학 우대</p>
                                </div>
                            </li>
                        </ul>
                        
                        <div class="mt-6 p-4 bg-white rounded border">
                            <h4 class="font-semibold mb-2">수업 정보</h4>
                            <p class="text-sm text-gray-600">• 기간: 10주 과정 (1학기)</p>
                            <p class="text-sm text-gray-600">• 시간: 주 20시간 (오전/오후반)</p>
                            <p class="text-sm text-gray-600">• 학비: 약 150-200만원/학기</p>
                        </div>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-6">
                        <h3 class="text-xl font-bold text-green-800 mb-4">사설 어학원</h3>
                        <ul class="space-y-3 text-gray-700">
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-green-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>유연한 수업 시간</strong>
                                    <p class="text-sm text-gray-600">주말반, 야간반 등 다양한 시간대</p>
                                </div>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-green-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>맞춤형 과정</strong>
                                    <p class="text-sm text-gray-600">회화, 비즈니스 등 목적별 특화 과정</p>
                                </div>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-green-600 mt-1 mr-3"></i>
                                <div>
                                    <strong>소규모 클래스</strong>
                                    <p class="text-sm text-gray-600">개별 맞춤 지도 가능</p>
                                </div>
                            </li>
                        </ul>
                        
                        <div class="mt-6 p-4 bg-white rounded border">
                            <h4 class="font-semibold mb-2">수업 정보</h4>
                            <p class="text-sm text-gray-600">• 기간: 4-12주 과정 (선택 가능)</p>
                            <p class="text-sm text-gray-600">• 시간: 주 10-15시간</p>
                            <p class="text-sm text-gray-600">• 학비: 약 80-120만원/월</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 문의 및 상담 -->
        <div class="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white p-8 text-center">
            <h2 class="text-3xl font-bold mb-4">🤝 전문 상담 서비스</h2>
            <p class="text-lg mb-6 opacity-90">유학 전문가가 개인별 맞춤 상담을 제공합니다</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="bg-white text-purple-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors">
                    <i class="fas fa-phone mr-2"></i>전화 상담 신청
                </button>
                <button class="border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-purple-600 transition-colors">
                    <i class="fas fa-calendar mr-2"></i>대면 상담 예약
                </button>
            </div>
        </div>
    </div>
</div>`;

/**
 * 구인/구직 정보 페이지 템플릿
 */
export const JOBS_PAGE = `<div class="min-h-screen bg-gray-50">
    <!-- 헤더 -->
    <div class="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-4">💼 채용 정보</h1>
            <p class="text-xl opacity-90">외국인을 환영하는 기업들의 최신 채용 공고</p>
        </div>
    </div>

    <div class="container mx-auto px-4 py-12">
        <!-- 검색 및 필터 -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="grid md:grid-cols-4 gap-4">
                <input type="text" placeholder="직무, 회사명 검색" class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <select class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">지역 선택</option>
                    <option value="서울">서울</option>
                    <option value="경기">경기</option>
                    <option value="부산">부산</option>
                </select>
                <select class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">비자 유형</option>
                    <option value="E-7">E-7 (특정활동)</option>
                    <option value="E-9">E-9 (비전문취업)</option>
                    <option value="H-2">H-2 (방문취업)</option>
                </select>
                <button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    <i class="fas fa-search mr-2"></i>검색
                </button>
            </div>
        </div>

        <!-- 채용공고 목록 -->
        <div id="jobs-list" class="space-y-6">
            <!-- 동적으로 로드됨 -->
        </div>

        <!-- 페이지네이션 -->
        <div class="flex justify-center mt-8">
            <nav class="flex space-x-2">
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">이전</button>
                <button class="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">2</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">3</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">다음</button>
            </nav>
        </div>
    </div>
</div>`;

/**
 * 구직자 정보 페이지 템플릿
 */
export const JOBSEEKERS_PAGE = `<div class="min-h-screen bg-gray-50">
    <!-- 헤더 -->
    <div class="bg-gradient-to-r from-green-600 to-teal-600 text-white py-16">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-4">👥 인재 정보</h1>
            <p class="text-xl opacity-90">한국에서 일하고 싶은 우수한 외국인 인재들</p>
        </div>
    </div>

    <div class="container mx-auto px-4 py-12">
        <!-- 검색 및 필터 -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div class="grid md:grid-cols-4 gap-4">
                <input type="text" placeholder="이름, 전공 검색" class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500">
                <select class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">국적 선택</option>
                    <option value="중국">중국</option>
                    <option value="베트남">베트남</option>
                    <option value="필리핀">필리핀</option>
                </select>
                <select class="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">한국어 수준</option>
                    <option value="초급">초급</option>
                    <option value="중급">중급</option>
                    <option value="고급">고급</option>
                </select>
                <button class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                    <i class="fas fa-search mr-2"></i>검색
                </button>
            </div>
        </div>

        <!-- 구직자 목록 -->
        <div id="jobseekers-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- 동적으로 로드됨 -->
        </div>

        <!-- 페이지네이션 -->
        <div class="flex justify-center mt-8">
            <nav class="flex space-x-2">
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">이전</button>
                <button class="px-4 py-2 bg-green-600 text-white rounded-lg">1</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">2</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">3</button>
                <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">다음</button>
            </nav>
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
  'pages/study.html': STUDY_PAGE,
  'pages/jobs.html': JOBS_PAGE,
  'pages/jobseekers.html': JOBSEEKERS_PAGE,
} as const;

/**
 * 템플릿 타입
 */
export type TemplateName = keyof typeof TEMPLATES;