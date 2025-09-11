// 메인페이지 인증 UI 디버깅 스크립트
// 사용자가 로그인했음에도 불구하고 로그인/회원가입 버튼이 여전히 보이는 문제를 해결

function debugAuthState() {
    console.log('=== 인증 상태 디버깅 시작 ===');
    
    // 로컬스토리지 확인
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('LocalStorage user:', user);
    console.log('LocalStorage token:', token);
    
    if (user) {
        const userObj = JSON.parse(user);
        console.log('Parsed user object:', userObj);
    }
    
    // DOM 요소들 확인
    const authButtons = document.getElementById('auth-buttons');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const userMenu = document.getElementById('user-menu');
    
    console.log('=== DOM 요소 상태 ===');
    console.log('authButtons:', {
        element: !!authButtons,
        display: authButtons?.style.display,
        visibility: authButtons?.style.visibility,
        classList: authButtons?.classList.toString(),
        computed: authButtons ? window.getComputedStyle(authButtons).display : 'N/A'
    });
    
    console.log('loginBtn:', {
        element: !!loginBtn,
        display: loginBtn?.style.display,
        visibility: loginBtn?.style.visibility,
        classList: loginBtn?.classList.toString(),
        computed: loginBtn ? window.getComputedStyle(loginBtn).display : 'N/A'
    });
    
    console.log('registerBtn:', {
        element: !!registerBtn,
        display: registerBtn?.style.display,
        visibility: registerBtn?.style.visibility,
        classList: registerBtn?.classList.toString(),
        computed: registerBtn ? window.getComputedStyle(registerBtn).display : 'N/A'
    });
    
    console.log('userMenu:', {
        element: !!userMenu,
        display: userMenu?.style.display,
        visibility: userMenu?.style.visibility,
        classList: userMenu?.classList.toString(),
        computed: userMenu ? window.getComputedStyle(userMenu).display : 'N/A'
    });
    
    // body 클래스 확인
    console.log('Body classes:', document.body.classList.toString());
    console.log('Body has auth-logged-in:', document.body.classList.contains('auth-logged-in'));
    
    // CSS 규칙 확인
    console.log('=== CSS 규칙 효과 확인 ===');
    if (authButtons) {
        const styles = window.getComputedStyle(authButtons);
        console.log('authButtons computed styles:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            width: styles.width,
            height: styles.height
        });
    }
}

function forceFixAuthUI() {
    console.log('=== 강제 인증 UI 수정 시작 ===');
    
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (user && token) {
        console.log('로그인 상태 감지 - 인증 버튼 숨기기 시작');
        
        // body 클래스 추가
        document.body.classList.add('auth-logged-in');
        
        // 인증 버튼들 강제 숨김
        const authButtons = document.getElementById('auth-buttons');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        
        console.log('DOM 요소들 찾기 완료:', {
            authButtons: !!authButtons,
            loginBtn: !!loginBtn, 
            registerBtn: !!registerBtn,
            userMenu: !!userMenu,
            userName: !!userName
        });
        
        // 매우 강력한 스타일 적용으로 인증 버튼 숨기기
        if (authButtons) {
            authButtons.style.setProperty('display', 'none', 'important');
            authButtons.style.setProperty('visibility', 'hidden', 'important');
            authButtons.style.setProperty('opacity', '0', 'important');
            authButtons.style.setProperty('pointer-events', 'none', 'important');
            authButtons.style.setProperty('width', '0', 'important');
            authButtons.style.setProperty('height', '0', 'important');
            authButtons.style.setProperty('overflow', 'hidden', 'important');
            authButtons.classList.add('force-hide-auth');
            console.log('authButtons 숨김 처리 완료');
        }
        
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'none', 'important');
            loginBtn.style.setProperty('visibility', 'hidden', 'important');
            loginBtn.style.setProperty('opacity', '0', 'important');
            loginBtn.style.setProperty('pointer-events', 'none', 'important');
            loginBtn.classList.add('force-hide-auth');
            console.log('loginBtn 숨김 처리 완료');
        }
        
        if (registerBtn) {
            registerBtn.style.setProperty('display', 'none', 'important');
            registerBtn.style.setProperty('visibility', 'hidden', 'important');
            registerBtn.style.setProperty('opacity', '0', 'important');
            registerBtn.style.setProperty('pointer-events', 'none', 'important');
            registerBtn.classList.add('force-hide-auth');
            console.log('registerBtn 숨김 처리 완료');
        }
        
        // 사용자 메뉴 표시
        if (userMenu) {
            userMenu.style.setProperty('display', 'flex', 'important');
            userMenu.style.setProperty('visibility', 'visible', 'important');
            userMenu.style.setProperty('opacity', '1', 'important');
            userMenu.style.setProperty('pointer-events', 'auto', 'important');
            userMenu.classList.remove('hidden');
            userMenu.classList.add('force-show-user');
            console.log('userMenu 표시 처리 완료');
        }
        
        // 사용자 이름 업데이트
        if (userName) {
            try {
                const userObj = JSON.parse(user);
                const displayName = userObj.company_name || userObj.name || userObj.email || '사용자';
                userName.textContent = displayName;
                console.log('사용자 이름 업데이트 완료:', displayName);
            } catch (e) {
                console.error('사용자 정보 파싱 오류:', e);
                userName.textContent = '사용자';
            }
        }
        
        console.log('=== 강제 인증 UI 수정 완료 ===');
        
        // 수정 후 상태 다시 확인
        setTimeout(() => {
            debugAuthState();
        }, 100);
    } else {
        console.log('로그아웃 상태 - 인증 버튼 표시');
        
        // body 클래스 제거
        document.body.classList.remove('auth-logged-in');
        
        // 인증 버튼들 표시
        const authButtons = document.getElementById('auth-buttons');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userMenu = document.getElementById('user-menu');
        
        if (authButtons) {
            authButtons.style.setProperty('display', 'flex', 'important');
            authButtons.style.setProperty('visibility', 'visible', 'important');
            authButtons.style.setProperty('opacity', '1', 'important');
            authButtons.classList.remove('force-hide-auth');
        }
        
        if (loginBtn) {
            loginBtn.style.setProperty('display', 'inline-block', 'important');
            loginBtn.style.setProperty('visibility', 'visible', 'important');
            loginBtn.style.setProperty('opacity', '1', 'important');
            loginBtn.classList.remove('force-hide-auth');
        }
        
        if (registerBtn) {
            registerBtn.style.setProperty('display', 'inline-block', 'important');
            registerBtn.style.setProperty('visibility', 'visible', 'important');
            registerBtn.style.setProperty('opacity', '1', 'important');
            registerBtn.classList.remove('force-hide-auth');
        }
        
        if (userMenu) {
            userMenu.style.setProperty('display', 'none', 'important');
            userMenu.style.setProperty('visibility', 'hidden', 'important');
            userMenu.classList.add('hidden');
            userMenu.classList.remove('force-show-user');
        }
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('페이지 로드됨 - 인증 상태 확인 및 수정');
    
    // 즉시 디버깅 실행
    setTimeout(debugAuthState, 100);
    
    // 즉시 수정 실행
    setTimeout(forceFixAuthUI, 200);
    
    // 추가 안전장치 - 주기적 체크
    const authCheckInterval = setInterval(() => {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (user && token) {
            const authButtons = document.getElementById('auth-buttons');
            const loginBtn = document.getElementById('login-btn');
            
            // 로그인 버튼이 여전히 보이는 경우 강제 수정
            if (authButtons && window.getComputedStyle(authButtons).display !== 'none') {
                console.warn('인증 버튼이 여전히 보임 - 다시 숨기기 실행');
                forceFixAuthUI();
            }
            if (loginBtn && window.getComputedStyle(loginBtn).display !== 'none') {
                console.warn('로그인 버튼이 여전히 보임 - 다시 숨기기 실행');
                forceFixAuthUI();
            }
        }
    }, 1000);
    
    // 10초 후 주기적 체크 중단
    setTimeout(() => {
        clearInterval(authCheckInterval);
        console.log('주기적 인증 상태 체크 종료');
    }, 10000);
});

// MutationObserver로 DOM 변경 감지
const authObserver = new MutationObserver(function(mutations) {
    let shouldRecheck = false;
    
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            if (mutation.target.id === 'auth-buttons' || 
                mutation.target.id === 'login-btn' || 
                mutation.target.id === 'register-btn' ||
                mutation.target.id === 'user-menu') {
                shouldRecheck = true;
            }
        }
    });
    
    if (shouldRecheck) {
        console.log('DOM 변경 감지 - 인증 UI 재확인');
        setTimeout(forceFixAuthUI, 50);
    }
});

// Observer 시작
if (document.body) {
    authObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
}

// 로그아웃 함수 정의
function handleLogout() {
    console.log('로그아웃 처리 시작');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // UI 즉시 업데이트
    forceFixAuthUI();
    
    // 메인페이지로 이동
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// 로그아웃 버튼 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('로그아웃 버튼 이벤트 리스너 추가 완료');
    }
});

// 전역 함수로 노출
window.debugAuthState = debugAuthState;
window.forceFixAuthUI = forceFixAuthUI;
window.handleLogout = handleLogout;

console.log('인증 디버깅 스크립트 로드 완료');