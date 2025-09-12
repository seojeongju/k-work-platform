// 인증 관련 공통 유틸리티 함수들
class AuthUtils {
    
    /**
     * 로그인 상태 확인
     * @returns {Object} { isLoggedIn: boolean, user: object|null, token: string|null }
     */
    static checkLoginStatus() {
        try {
            // 로컬 스토리지에서 토큰 확인
            const token = localStorage.getItem('authToken');
            const userData = localStorage.getItem('userData');
            
            if (!token || !userData) {
                return { isLoggedIn: false, user: null, token: null };
            }
            
            // 토큰 만료 확인
            const user = JSON.parse(userData);
            const tokenExp = localStorage.getItem('tokenExp');
            
            if (tokenExp && Date.now() > parseInt(tokenExp)) {
                // 토큰 만료됨
                this.clearAuthData();
                return { isLoggedIn: false, user: null, token: null };
            }
            
            return { 
                isLoggedIn: true, 
                user: user, 
                token: token 
            };
            
        } catch (error) {
            console.error('로그인 상태 확인 중 오류:', error);
            this.clearAuthData();
            return { isLoggedIn: false, user: null, token: null };
        }
    }
    
    /**
     * 인증 데이터 지우기
     */
    static clearAuthData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('tokenExp');
        localStorage.removeItem('userType');
    }
    
    /**
     * 로그인 필요시 로그인 페이지로 리다이렉트
     * @param {string} returnUrl - 로그인 후 돌아올 URL
     * @param {string} message - 사용자에게 보여줄 메시지
     */
    static requireLogin(returnUrl = null, message = "로그인이 필요한 서비스입니다.") {
        // 현재 URL을 returnUrl로 설정 (제공되지 않은 경우)
        if (!returnUrl) {
            returnUrl = window.location.href;
        }
        
        // 로그인 페이지로 리다이렉트할 URL 생성
        const loginUrl = new URL('/static/login.html', window.location.origin);
        loginUrl.searchParams.set('returnUrl', returnUrl);
        loginUrl.searchParams.set('message', message);
        
        // 리다이렉트 실행
        window.location.href = loginUrl.toString();
    }
    
    /**
     * 로그인 모달 표시 (리다이렉트 대신 모달 사용시)
     * @param {Function} onLoginSuccess - 로그인 성공 시 콜백
     */
    static showLoginModal(onLoginSuccess = null) {
        console.log('=== showLoginModal 호출 ===');
        
        // 이미 모달이 있는지 확인 (중복 생성 방지)
        const existingModal = document.getElementById('login-required-modal');
        if (existingModal) {
            console.log('로그인 모달이 이미 표시되어 있습니다. 중복 생성 방지');
            return; // 중복 생성하지 않음
        }
        
        console.log('새 로그인 모달 생성 중...');
        
        // DOM에 있는 모든 모달 카운트 (디버깅용)
        const allModals = document.querySelectorAll('[id*="modal"]');
        console.log('현재 DOM에 있는 모닠 모달 수:', allModals.length);
        allModals.forEach((modal, index) => {
            console.log(`모달 ${index + 1}: ${modal.id}`);
        });
        
        // 로그인 모달 HTML 생성
        const modalHtml = `
            <div id="login-required-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="AuthUtils.closeLoginModal()">
                <div class="bg-white rounded-lg max-w-md w-full p-6" onclick="event.stopPropagation()">
                    <div class="text-center mb-6">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                            <i class="fas fa-lock text-yellow-600 text-xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">로그인이 필요합니다</h3>
                        <p class="text-sm text-gray-600">
                            상세 정보를 보시려면 먼저 로그인해주세요.
                        </p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button onclick="AuthUtils.redirectToLogin()" 
                                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            <i class="fas fa-sign-in-alt mr-2"></i>로그인 하기
                        </button>
                        <button onclick="AuthUtils.closeLoginModal()" 
                                class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                            취소
                        </button>
                    </div>
                    <div class="mt-4 text-center">
                        <a href="/static/register.html" class="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                            계정이 없으신가요? 회원가입
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        console.log('새 로그인 모달 생성 중...');
        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 성공 콜백 저장 (필요시)
        if (onLoginSuccess) {
            window._loginSuccessCallback = onLoginSuccess;
        }
        
        console.log('로그인 모달 생성 완료');
    }
    
    /**
     * 로그인 모달 닫기
     */
    static closeLoginModal() {
        console.log('=== closeLoginModal 호출 ===');
        
        const modal = document.getElementById('login-required-modal');
        if (modal) {
            console.log('로그인 모달 발견, 제거 중...');
            modal.remove();
            console.log('로그인 모달 제거 완료');
        } else {
            console.log('제거할 로그인 모달이 없습니다.');
        }
        
        // 혹시 남아있을 수 있는 모든 로그인 모달 제거 (안전 장치)
        const allModals = document.querySelectorAll('[id^="login-required-modal"], .login-modal');
        allModals.forEach((modal, index) => {
            console.log(`추가 로그인 모달 제거: ${index + 1}`);
            modal.remove();
        });
        
        console.log('로그인 모달 제거 작업 완료');
    }
    
    /**
     * 로그인 페이지로 리다이렉트
     */
    static redirectToLogin() {
        this.requireLogin();
    }
    
    /**
     * 상세보기 권한 확인 (개선된 버전)
     * @param {string} type - 'job' 또는 'jobseeker'
     * @returns {Object} { hasPermission: boolean, user: object|null }
     */
    static checkDetailViewPermission(type) {
        const authStatus = this.checkLoginStatus();
        
        if (authStatus.isLoggedIn) {
            // 로그인되어 있음 - 상세보기 허용
            return {
                hasPermission: true,
                user: authStatus.user
            };
        } else {
            // 로그인되어 있지 않음 - 로그인 모달 표시
            const message = type === 'job' 
                ? "구인공고 상세 정보를 보시려면 로그인이 필요합니다."
                : "구직자 상세 정보를 보시려면 로그인이 필요합니다.";
            
            this.showLoginModal();
            
            return {
                hasPermission: false,
                user: null
            };
        }
    }
    
    /**
     * API 요청시 인증 헤더 추가
     * @param {Object} options - fetch options
     * @returns {Object} 인증 헤더가 추가된 options
     */
    static addAuthHeaders(options = {}) {
        const authStatus = this.checkLoginStatus();
        
        if (!options.headers) {
            options.headers = {};
        }
        
        if (authStatus.isLoggedIn && authStatus.token) {
            options.headers['Authorization'] = `Bearer ${authStatus.token}`;
        }
        
        return options;
    }
    
    /**
     * 사용자 타입별 권한 확인
     * @param {Array} allowedTypes - 허용된 사용자 타입 배열
     * @returns {boolean} 권한 여부
     */
    static checkUserTypePermission(allowedTypes) {
        const authStatus = this.checkLoginStatus();
        
        if (!authStatus.isLoggedIn) {
            return false;
        }
        
        const userType = authStatus.user?.type || localStorage.getItem('userType');
        return allowedTypes.includes(userType);
    }
    
    /**
     * 로그인 상태를 UI에 반영
     */
    static updateLoginUI() {
        const authStatus = this.checkLoginStatus();
        
        // 네비게이션의 로그인 링크 업데이트
        const loginLinks = document.querySelectorAll('a[href="/static/login.html"], a[href="login.html"]');
        
        loginLinks.forEach(link => {
            if (authStatus.isLoggedIn) {
                // 로그인된 상태 - 대시보드 링크로 변경
                const userType = authStatus.user?.type || localStorage.getItem('userType');
                let dashboardUrl = '/static/';
                
                switch (userType) {
                    case 'employer':
                        dashboardUrl += 'employer-dashboard.html';
                        break;
                    case 'jobseeker':
                        dashboardUrl += 'jobseeker-profile.html';
                        break;
                    case 'agent':
                        dashboardUrl += 'agent-dashboard.html';
                        break;
                    case 'admin':
                        dashboardUrl += 'admin-dashboard.html';
                        break;
                    default:
                        dashboardUrl += 'login.html';
                }
                
                link.href = dashboardUrl;
                link.innerHTML = `<i class="fas fa-user-circle mr-1"></i>${authStatus.user?.name || '대시보드'}`;
            } else {
                // 미로그인 상태 - 로그인 링크 유지
                link.href = '/static/login.html';
                link.innerHTML = '로그인';
            }
        });
    }
    
    /**
     * 로그아웃 처리
     */
    static logout() {
        this.clearAuthData();
        
        // 로그아웃 후 메인 페이지로 이동
        window.location.href = '/';
    }
    
    /**
     * 토큰 만료 시간 설정 (로그인시 사용)
     * @param {number} expiresInSeconds - 만료까지 남은 시간(초)
     */
    static setTokenExpiration(expiresInSeconds) {
        const expirationTime = Date.now() + (expiresInSeconds * 1000);
        localStorage.setItem('tokenExp', expirationTime.toString());
    }
}

// 전역에서 사용할 수 있도록 window 객체에 추가
window.AuthUtils = AuthUtils;

// 페이지 로드시 로그인 UI 업데이트
document.addEventListener('DOMContentLoaded', function() {
    AuthUtils.updateLoginUI();
});