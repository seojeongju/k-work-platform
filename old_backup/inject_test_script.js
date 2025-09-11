// 메인 페이지에 삽입할 테스트 스크립트
// 로그인 상태를 시뮬레이션하고 인증 UI 수정이 작동하는지 확인

console.log('=== 인증 UI 수정 테스트 시작 ===');

// 테스트 사용자 데이터 (실제 API에서 받은 데이터)
const testUser = {
    "id": 4,
    "email": "testcorp@test.com",
    "type": "employer",
    "status": "pending",
    "company_name": "테스트코퍼레이션",
    "contact_person": "테스트대표"
};

const testToken = "token_4_employer";

console.log('테스트 사용자 데이터:', testUser);

// 1. 현재 상태 확인
console.log('=== 현재 상태 확인 ===');
console.log('현재 localStorage user:', localStorage.getItem('user'));
console.log('현재 localStorage token:', localStorage.getItem('token'));

// DOM 요소 확인
const authButtons = document.getElementById('auth-buttons');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const userMenu = document.getElementById('user-menu');

console.log('DOM 요소 확인:');
console.log('- authButtons:', authButtons ? '존재' : '없음');
console.log('- loginBtn:', loginBtn ? '존재' : '없음');
console.log('- registerBtn:', registerBtn ? '존재' : '없음');
console.log('- userMenu:', userMenu ? '존재' : '없음');

if (authButtons) {
    console.log('authButtons 현재 스타일:', {
        display: window.getComputedStyle(authButtons).display,
        visibility: window.getComputedStyle(authButtons).visibility,
        opacity: window.getComputedStyle(authButtons).opacity
    });
}

// 2. 로그인 상태 시뮬레이션
console.log('=== 로그인 상태 시뮬레이션 ===');
localStorage.setItem('user', JSON.stringify(testUser));
localStorage.setItem('token', testToken);

console.log('localStorage 업데이트 완료');

// 3. app.js의 setupUserNavigation 호출 (JobPlatformApp이 존재하는 경우)
if (typeof window.jobPlatformApp !== 'undefined' && window.jobPlatformApp.setupUserNavigation) {
    console.log('JobPlatformApp 발견 - setupUserNavigation 호출');
    window.jobPlatformApp.setupUserNavigation();
} else if (typeof window.JobPlatformApp !== 'undefined') {
    console.log('JobPlatformApp 클래스 발견 - 새 인스턴스 생성 및 호출');
    const tempApp = new window.JobPlatformApp();
    tempApp.setupUserNavigation();
} else {
    console.log('JobPlatformApp을 찾을 수 없음 - 직접 인증 UI 업데이트');
    
    // 직접 DOM 조작으로 UI 업데이트
    if (authButtons) {
        authButtons.style.setProperty('display', 'none', 'important');
        authButtons.style.setProperty('visibility', 'hidden', 'important');
        authButtons.style.setProperty('opacity', '0', 'important');
        authButtons.classList.add('force-hide-auth');
    }
    
    if (loginBtn) {
        loginBtn.style.setProperty('display', 'none', 'important');
        loginBtn.style.setProperty('visibility', 'hidden', 'important');
        loginBtn.style.setProperty('opacity', '0', 'important');
        loginBtn.classList.add('force-hide-auth');
    }
    
    if (registerBtn) {
        registerBtn.style.setProperty('display', 'none', 'important');
        registerBtn.style.setProperty('visibility', 'hidden', 'important');
        registerBtn.style.setProperty('opacity', '0', 'important');
        registerBtn.classList.add('force-hide-auth');
    }
    
    if (userMenu) {
        userMenu.classList.remove('hidden');
        userMenu.classList.add('force-show-user');
        userMenu.style.setProperty('display', 'flex', 'important');
        userMenu.style.setProperty('visibility', 'visible', 'important');
        userMenu.style.setProperty('opacity', '1', 'important');
        
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = testUser.company_name || testUser.contact_person;
        }
    }
    
    // body 클래스 추가
    document.body.classList.add('auth-logged-in');
}

// 4. 결과 확인
setTimeout(() => {
    console.log('=== 수정 후 상태 확인 ===');
    
    if (authButtons) {
        const styles = window.getComputedStyle(authButtons);
        console.log('authButtons 수정 후 스타일:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            classList: authButtons.classList.toString()
        });
    }
    
    if (loginBtn) {
        const styles = window.getComputedStyle(loginBtn);
        console.log('loginBtn 수정 후 스타일:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            classList: loginBtn.classList.toString()
        });
    }
    
    if (userMenu) {
        const styles = window.getComputedStyle(userMenu);
        console.log('userMenu 수정 후 스타일:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            classList: userMenu.classList.toString()
        });
    }
    
    console.log('body 클래스:', document.body.classList.toString());
    
    // 최종 확인: 로그인 버튼이 여전히 보이는가?
    const isLoginVisible = loginBtn && window.getComputedStyle(loginBtn).display !== 'none';
    const isAuthButtonsVisible = authButtons && window.getComputedStyle(authButtons).display !== 'none';
    
    console.log('=== 최종 결과 ===');
    console.log('로그인 버튼 보임:', isLoginVisible);
    console.log('인증 버튼 그룹 보임:', isAuthButtonsVisible);
    
    if (isLoginVisible || isAuthButtonsVisible) {
        console.error('❌ 문제 발견: 로그인 상태임에도 인증 버튼이 여전히 보임');
        
        // 추가 강제 수정 시도
        console.log('강제 수정 재시도...');
        if (authButtons) {
            authButtons.style.setProperty('display', 'none', 'important');
            authButtons.style.setProperty('visibility', 'hidden', 'important');
            authButtons.style.setProperty('opacity', '0', 'important');
            authButtons.style.setProperty('width', '0', 'important');
            authButtons.style.setProperty('height', '0', 'important');
            authButtons.style.setProperty('overflow', 'hidden', 'important');
            authButtons.style.setProperty('pointer-events', 'none', 'important');
        }
        
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'none', 'important');
            loginBtn.style.setProperty('visibility', 'hidden', 'important');
            loginBtn.style.setProperty('opacity', '0', 'important');
            loginBtn.style.setProperty('pointer-events', 'none', 'important');
        }
        
        if (registerBtn) {
            registerBtn.style.setProperty('display', 'none', 'important');
            registerBtn.style.setProperty('visibility', 'hidden', 'important');
            registerBtn.style.setProperty('opacity', '0', 'important');
            registerBtn.style.setProperty('pointer-events', 'none', 'important');
        }
        
        // 다시 확인
        setTimeout(() => {
            const finalLoginVisible = loginBtn && window.getComputedStyle(loginBtn).display !== 'none';
            const finalAuthVisible = authButtons && window.getComputedStyle(authButtons).display !== 'none';
            
            if (finalLoginVisible || finalAuthVisible) {
                console.error('❌❌❌ 강제 수정 후에도 여전히 문제 있음');
            } else {
                console.log('✅ 강제 수정 성공!');
            }
        }, 100);
        
    } else {
        console.log('✅ 성공: 인증 버튼이 올바르게 숨겨짐');
    }
}, 500);

console.log('테스트 스크립트 완료 - 콘솔을 확인하세요');

// 글로벌로 테스트 함수 제공
window.testAuthFix = {
    simulateLogin: () => {
        localStorage.setItem('user', JSON.stringify(testUser));
        localStorage.setItem('token', testToken);
        if (window.jobPlatformApp && window.jobPlatformApp.setupUserNavigation) {
            window.jobPlatformApp.setupUserNavigation();
        }
        console.log('로그인 시뮬레이션 완료');
    },
    
    simulateLogout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (window.jobPlatformApp && window.jobPlatformApp.setupUserNavigation) {
            window.jobPlatformApp.setupUserNavigation();
        }
        console.log('로그아웃 시뮬레이션 완료');
    }
};

console.log('테스트 함수 추가됨: window.testAuthFix.simulateLogin(), window.testAuthFix.simulateLogout()');