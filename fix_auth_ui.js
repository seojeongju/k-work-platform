// 강력한 인증 UI 수정 스크립트
console.log('🔧 Auth UI Fix Script Loading...');

// 메인 수정 함수
function forceFixAuthUI() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const isLoggedIn = !!(user && token);
    
    console.log('🔍 Current auth state:', { isLoggedIn, hasUser: !!user, hasToken: !!token });
    
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    
    if (isLoggedIn) {
        console.log('🔒 User is logged in - hiding auth buttons and showing user menu');
        
        // body 클래스 추가
        document.body.classList.add('auth-logged-in');
        
        // 인증 버튼 완전히 숨기기
        if (authButtons) {
            authButtons.style.setProperty('display', 'none', 'important');
            authButtons.style.setProperty('visibility', 'hidden', 'important');
            authButtons.style.setProperty('opacity', '0', 'important');
            authButtons.style.setProperty('pointer-events', 'none', 'important');
            authButtons.classList.add('hidden');
        }
        
        // 사용자 메뉴 완전히 보이기
        if (userMenu) {
            userMenu.style.setProperty('display', 'flex', 'important');
            userMenu.style.setProperty('visibility', 'visible', 'important');
            userMenu.style.setProperty('opacity', '1', 'important');
            userMenu.style.setProperty('pointer-events', 'auto', 'important');
            userMenu.classList.remove('hidden');
        }
        
        // 사용자 이름 업데이트
        if (userName && user) {
            try {
                const userObj = JSON.parse(user);
                userName.textContent = userObj.name || userObj.company_name || userObj.contact_person || userObj.email || '사용자님';
            } catch (e) {
                userName.textContent = '사용자님';
            }
        }
        
        // 로그아웃 버튼 이벤트 설정
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.dataset.fixedListener) {
            logoutBtn.addEventListener('click', function() {
                console.log('🔓 Logging out...');
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.reload();
            });
            logoutBtn.dataset.fixedListener = 'true';
        }
        
        console.log('✅ Logged in state applied');
    } else {
        console.log('🔓 User is not logged in - showing auth buttons and hiding user menu');
        
        // body 클래스 제거
        document.body.classList.remove('auth-logged-in');
        
        // 인증 버튼 완전히 보이기
        if (authButtons) {
            authButtons.style.setProperty('display', 'flex', 'important');
            authButtons.style.setProperty('visibility', 'visible', 'important');
            authButtons.style.setProperty('opacity', '1', 'important');
            authButtons.style.setProperty('pointer-events', 'auto', 'important');
            authButtons.classList.remove('hidden');
        }
        
        // 사용자 메뉴 완전히 숨기기
        if (userMenu) {
            userMenu.style.setProperty('display', 'none', 'important');
            userMenu.style.setProperty('visibility', 'hidden', 'important');
            userMenu.style.setProperty('opacity', '0', 'important');
            userMenu.style.setProperty('pointer-events', 'none', 'important');
            userMenu.classList.add('hidden');
        }
        
        console.log('✅ Logged out state applied');
    }
    
    // 현재 상태 로깅
    setTimeout(() => {
        console.log('📊 Final state check:', {
            bodyClass: document.body.className,
            authButtonsDisplay: authButtons ? window.getComputedStyle(authButtons).display : 'not found',
            userMenuDisplay: userMenu ? window.getComputedStyle(userMenu).display : 'not found'
        });
    }, 100);
}

// 즉시 실행
forceFixAuthUI();

// DOM 변화 감지
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.target.id === 'auth-buttons' || mutation.target.id === 'user-menu')) {
            shouldUpdate = true;
        }
        if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            const removedNodes = Array.from(mutation.removedNodes);
            
            if (addedNodes.some(node => node.id === 'auth-buttons' || node.id === 'user-menu') ||
                removedNodes.some(node => node.id === 'auth-buttons' || node.id === 'user-menu')) {
                shouldUpdate = true;
            }
        }
    });
    
    if (shouldUpdate) {
        console.log('🔄 DOM changed, re-applying auth UI fix...');
        setTimeout(forceFixAuthUI, 50);
    }
});

// Observer 시작
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
});

// 정기적 체크
setInterval(forceFixAuthUI, 3000);

// localStorage 변경 감지
window.addEventListener('storage', forceFixAuthUI);

// 페이지 포커스 시 체크
window.addEventListener('focus', forceFixAuthUI);

// 글로벌 함수로 노출
window.forceFixAuthUI = forceFixAuthUI;

console.log('✅ Auth UI Fix Script Loaded - Use forceFixAuthUI() to manually trigger');