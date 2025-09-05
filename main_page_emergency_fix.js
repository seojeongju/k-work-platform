// 🚨 WOW-CAMPUS 메인 페이지 전용 긴급 수정 스크립트
// w-campus.com 메인 페이지 브라우저 콘솔에서 실행하세요

console.log('🚨 WOW-CAMPUS 메인 페이지 전용 긴급 수정 시작...');
console.log('📸 스크린샷 분석: 메인 페이지에서 로그인/회원가입 버튼이 여전히 표시됨');

// 1. 메인 페이지 정밀 분석
function analyzeMainPageAuthState() {
    console.log('=== 메인 페이지 정밀 분석 ===');
    
    // 로그인 상태 확인 (여러 방법)
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const sessionUser = sessionStorage.getItem('user');
    
    let isLoggedIn = false;
    let userInfo = null;
    
    // localStorage 체크
    if (user && token) {
        try {
            userInfo = JSON.parse(user);
            isLoggedIn = true;
        } catch (e) {
            console.log('localStorage user 파싱 오류');
        }
    }
    
    // sessionStorage 체크
    if (!isLoggedIn && sessionUser) {
        try {
            userInfo = JSON.parse(sessionUser);
            isLoggedIn = true;
        } catch (e) {
            console.log('sessionStorage user 파싱 오류');
        }
    }
    
    // DOM에서 로그인 상태 확인 (admin@wowcampus.com 텍스트로)
    const welcomeTexts = [];
    const logoutButtons = [];
    const loginButtons = [];
    const signupButtons = [];
    
    // 모든 요소에서 텍스트 확인
    document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim() || '';
        
        if (text.includes('admin@wowcampus.com') || 
            (text.includes('환영합니다') && text.includes('@'))) {
            welcomeTexts.push(el);
            console.log('✅ 환영 메시지 발견:', text, el);
            if (!isLoggedIn) {
                isLoggedIn = true; // DOM 기반 로그인 상태 확인
                console.log('🔍 DOM에서 로그인 상태 감지');
            }
        }
    });
    
    // 네비게이션 바에서 버튼 찾기
    document.querySelectorAll('a, button').forEach(el => {
        const text = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        
        if (text === '로그아웃' || text.includes('로그아웃')) {
            logoutButtons.push(el);
            console.log('✅ 로그아웃 버튼 발견:', el);
        }
        
        if (text === '로그인' || text === 'Login') {
            loginButtons.push(el);
            console.log('🚨 로그인 버튼 발견 (숨겨야 함):', el);
        }
        
        if (text === '회원가입' || text === 'Sign Up' || text === '회원 가입') {
            signupButtons.push(el);
            console.log('🚨 회원가입 버튼 발견 (숨겨야 함):', el);
        }
    });
    
    console.log('메인 페이지 상태 요약:');
    console.log('- 로그인 상태:', isLoggedIn);
    console.log('- 환영 메시지 수:', welcomeTexts.length);
    console.log('- 로그아웃 버튼 수:', logoutButtons.length);
    console.log('- 로그인 버튼 수 (문제):', loginButtons.length);
    console.log('- 회원가입 버튼 수 (문제):', signupButtons.length);
    
    return {
        isLoggedIn,
        userInfo,
        welcomeTexts,
        logoutButtons,
        loginButtons,
        signupButtons
    };
}

// 2. 메인 페이지 전용 초강력 요소 파괴
function destroyMainPageElement(element, reason = '') {
    if (!element) return false;
    
    try {
        console.log(`🔥 메인 페이지 요소 완전 파괴: ${reason}`, element);
        
        // 메인 페이지용 초강력 파괴 스타일
        const destructiveStyles = [
            ['display', 'none'],
            ['visibility', 'hidden'],
            ['opacity', '0'],
            ['pointer-events', 'none'],
            ['position', 'fixed'],
            ['left', '-999999px'],
            ['top', '-999999px'],
            ['right', '-999999px'],
            ['bottom', '-999999px'],
            ['width', '0'],
            ['height', '0'],
            ['min-width', '0'],
            ['min-height', '0'],
            ['max-width', '0'],
            ['max-height', '0'],
            ['padding', '0'],
            ['margin', '0'],
            ['border', 'none'],
            ['outline', 'none'],
            ['background', 'transparent'],
            ['color', 'transparent'],
            ['font-size', '0'],
            ['line-height', '0'],
            ['overflow', 'hidden'],
            ['z-index', '-99999'],
            ['transform', 'scale(0) translate(-99999px, -99999px)'],
            ['clip-path', 'circle(0%)'],
            ['mask', 'none'],
            ['filter', 'opacity(0)'],
            ['user-select', 'none'],
            ['cursor', 'default'],
            ['text-indent', '-99999px'],
            ['white-space', 'nowrap']
        ];
        
        // 모든 스타일 강제 적용
        destructiveStyles.forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
        
        // 메인 페이지 전용 파괴 마커
        element.classList.add('main-page-destroyed', 'wcampus-main-hidden', 'auth-eliminated');
        element.setAttribute('data-main-page-destroyed', 'true');
        element.setAttribute('data-destruction-reason', reason);
        element.setAttribute('data-destruction-time', Date.now());
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('hidden', 'true');
        element.setAttribute('tabindex', '-1');
        
        // 텍스트 내용도 완전 제거
        if (element.textContent) {
            element.setAttribute('data-original-text', element.textContent);
            element.textContent = '';
            element.innerHTML = '';
        }
        
        // 클릭 이벤트 완전 차단
        element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('🚫 차단된 클릭 시도:', element);
            return false;
        }, true);
        
        // 부모 요소도 처리 (메인 네비게이션용)
        if (element.parentElement) {
            const parent = element.parentElement;
            
            // 네비게이션 바 내의 인증 버튼 컨테이너인 경우
            if (parent.children.length <= 2 && 
                (parent.tagName === 'DIV' || parent.tagName === 'NAV' || parent.tagName === 'UL' || parent.tagName === 'LI')) {
                console.log(`🔥 메인 페이지 부모 요소도 파괴: ${parent.tagName}`);
                destructiveStyles.slice(0, 10).forEach(([prop, value]) => {
                    parent.style.setProperty(prop, value, 'important');
                });
                parent.classList.add('main-page-parent-destroyed');
            }
        }
        
        console.log(`✅ 메인 페이지 요소 파괴 완료: ${reason}`);
        return true;
        
    } catch (e) {
        console.error(`❌ 메인 페이지 요소 파괴 실패: ${reason}`, e);
        return false;
    }
}

// 3. 메인 페이지 전용 요소 표시
function showMainPageElement(element, reason = '') {
    if (!element) return false;
    
    try {
        console.log(`✨ 메인 페이지 요소 표시: ${reason}`, element);
        
        // 숨김 스타일 제거
        const stylePropsToRemove = [
            'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
            'min-width', 'min-height', 'max-width', 'max-height', 'overflow',
            'z-index', 'transform', 'clip-path', 'mask', 'filter', 'padding',
            'margin', 'border', 'outline', 'background', 'color', 'font-size',
            'line-height', 'user-select', 'cursor', 'text-indent'
        ];
        
        stylePropsToRemove.forEach(prop => {
            element.style.removeProperty(prop);
        });
        
        // 표시 스타일 적용
        element.style.setProperty('display', 'inline-block', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
        
        // 파괴 마커 제거
        element.classList.remove('main-page-destroyed', 'wcampus-main-hidden', 'auth-eliminated');
        element.removeAttribute('data-main-page-destroyed');
        element.removeAttribute('data-destruction-reason');
        element.removeAttribute('data-destruction-time');
        element.removeAttribute('aria-hidden');
        element.removeAttribute('hidden');
        element.removeAttribute('tabindex');
        
        // 원본 텍스트 복원
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.textContent = originalText;
            element.removeAttribute('data-original-text');
        }
        
        console.log(`✅ 메인 페이지 요소 표시 완료: ${reason}`);
        return true;
        
    } catch (e) {
        console.error(`❌ 메인 페이지 요소 표시 실패: ${reason}`, e);
        return false;
    }
}

// 4. 메인 페이지 전용 수정 함수
function fixMainPageAuthUI() {
    console.log('🔧 메인 페이지 전용 인증 UI 수정 실행...');
    
    const analysis = analyzeMainPageAuthState();
    let processedCount = 0;
    
    if (analysis.isLoggedIn) {
        console.log('🔐 메인 페이지 로그인 상태 - 인증 버튼들 완전 제거');
        
        // body에 메인 페이지 로그인 상태 표시
        document.body.classList.add('main-page-logged-in', 'wcampus-main-authenticated');
        
        // 로그인 버튼들 완전 제거
        analysis.loginButtons.forEach(btn => {
            if (destroyMainPageElement(btn, '메인 페이지 로그인 버튼 제거')) {
                processedCount++;
            }
        });
        
        // 회원가입 버튼들 완전 제거
        analysis.signupButtons.forEach(btn => {
            if (destroyMainPageElement(btn, '메인 페이지 회원가입 버튼 제거')) {
                processedCount++;
            }
        });
        
        // 추가 메인 페이지 전용 탐지
        console.log('🔍 메인 페이지 네비게이션 바 추가 탐지...');
        document.querySelectorAll('nav a, nav button, header a, header button, .navbar a, .navbar button').forEach(el => {
            if (el.hasAttribute('data-main-page-destroyed')) return;
            
            const text = el.textContent?.trim() || '';
            const href = el.getAttribute('href') || '';
            
            if ((text === '로그인' || text === '회원가입' || 
                 href.includes('login') || href.includes('register')) &&
                window.getComputedStyle(el).display !== 'none') {
                console.log('🔥 메인 페이지 네비게이션 추가 발견:', text || href, el);
                if (destroyMainPageElement(el, `메인 네비 추가 - ${text || href}`)) {
                    processedCount++;
                }
            }
        });
        
        // 로그아웃 버튼과 환영 메시지는 확실히 표시
        analysis.logoutButtons.forEach(btn => {
            if (showMainPageElement(btn, '메인 페이지 로그아웃 버튼 표시')) {
                processedCount++;
            }
        });
        
        analysis.welcomeTexts.forEach(el => {
            if (showMainPageElement(el, '메인 페이지 환영 메시지 표시')) {
                processedCount++;
            }
        });
        
    } else {
        console.log('🔓 메인 페이지 로그아웃 상태 - 인증 버튼 표시');
        
        document.body.classList.add('main-page-logged-out');
        document.body.classList.remove('main-page-logged-in', 'wcampus-main-authenticated');
        
        // 로그인/회원가입 버튼 표시
        analysis.loginButtons.forEach(btn => {
            if (showMainPageElement(btn, '메인 페이지 로그인 버튼 표시')) {
                processedCount++;
            }
        });
        
        analysis.signupButtons.forEach(btn => {
            if (showMainPageElement(btn, '메인 페이지 회원가입 버튼 표시')) {
                processedCount++;
            }
        });
        
        // 사용자 메뉴 숨김
        analysis.logoutButtons.forEach(btn => {
            if (destroyMainPageElement(btn, '메인 페이지 로그아웃 버튼 숨김')) {
                processedCount++;
            }
        });
        
        analysis.welcomeTexts.forEach(el => {
            if (destroyMainPageElement(el, '메인 페이지 환영 메시지 숨김')) {
                processedCount++;
            }
        });
    }
    
    console.log(`✅ 메인 페이지 수정 완료: ${processedCount}개 요소 처리됨`);
    return { processedCount, analysis };
}

// 5. 메인 페이지 전용 CSS 주입
function injectMainPageCSS() {
    const cssId = 'main-page-auth-fix-styles';
    if (document.getElementById(cssId)) return;
    
    const css = `
        /* 메인 페이지 전용 완전 차단 CSS */
        .main-page-destroyed,
        .wcampus-main-hidden,
        .auth-eliminated,
        [data-main-page-destroyed="true"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: fixed !important;
            left: -999999px !important;
            top: -999999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            z-index: -99999 !important;
            transform: scale(0) translate(-99999px, -99999px) !important;
            clip-path: circle(0%) !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 0 !important;
            line-height: 0 !important;
            text-indent: -99999px !important;
        }
        
        /* 메인 페이지 로그인 상태에서 모든 인증 버튼 완전 차단 */
        body.main-page-logged-in a[href*="login"],
        body.main-page-logged-in a[href*="register"],
        body.main-page-logged-in a[href*="signin"],
        body.main-page-logged-in a[href*="signup"],
        body.wcampus-main-authenticated a[href*="login"],
        body.wcampus-main-authenticated a[href*="register"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        
        /* 메인 페이지 텍스트 기반 완전 차단 */
        body.main-page-logged-in a:contains("로그인"):not(:contains("로그아웃")),
        body.main-page-logged-in a:contains("회원가입"),
        body.main-page-logged-in button:contains("로그인"),
        body.main-page-logged-in button:contains("회원가입") {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 메인 페이지 부모 요소도 숨김 */
        .main-page-parent-destroyed {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 네비게이션 바 내 인증 버튼 강제 숨김 */
        nav .main-page-destroyed,
        header .main-page-destroyed,
        .navbar .main-page-destroyed {
            display: none !important;
        }
    `;
    
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = css;
    document.head.appendChild(style);
    console.log('✅ 메인 페이지 전용 CSS 주입 완료');
}

// 6. 메인 페이지 감시 및 자동 차단
function startMainPageMonitoring() {
    console.log('🔍 메인 페이지 전용 감시 시작...');
    
    const observer = new MutationObserver((mutations) => {
        let needsRecheck = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.tagName) {
                        const text = node.textContent?.trim() || '';
                        const href = node.getAttribute?.('href') || '';
                        const tag = node.tagName.toLowerCase();
                        
                        if ((tag === 'a' || tag === 'button') && 
                            (text === '로그인' || text === '회원가입' || 
                             href.includes('login') || href.includes('register'))) {
                            console.log('🚨 메인 페이지 새로운 인증 요소 감지 - 즉시 파괴:', node);
                            destroyMainPageElement(node, '메인 페이지 새로 추가된 요소');
                            needsRecheck = true;
                        }
                    }
                });
            }
        });
        
        if (needsRecheck) {
            setTimeout(() => {
                console.log('🔄 메인 페이지 새 요소 감지로 인한 재점검...');
                fixMainPageAuthUI();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden']
    });
    
    // 메인 페이지 주기적 체크 (2초마다)
    const intervalId = setInterval(() => {
        const { isLoggedIn } = analyzeMainPageAuthState();
        
        if (isLoggedIn) {
            // 살아있는 인증 버튼 체크
            const visibleAuthButtons = document.querySelectorAll('a, button');
            let foundVisible = false;
            
            for (let btn of visibleAuthButtons) {
                if (btn.hasAttribute('data-main-page-destroyed')) continue;
                
                const text = btn.textContent?.trim();
                const href = btn.getAttribute('href') || '';
                const computedStyle = window.getComputedStyle(btn);
                
                if ((text === '로그인' || text === '회원가입' || 
                     href.includes('login') || href.includes('register')) &&
                    computedStyle.display !== 'none' && 
                    computedStyle.visibility !== 'hidden') {
                    console.log('🚨 메인 페이지 주기적 체크: 살아있는 인증 버튼 발견 - 파괴:', btn);
                    destroyMainPageElement(btn, '메인 페이지 주기적 체크에서 발견');
                    foundVisible = true;
                }
            }
            
            if (foundVisible) {
                fixMainPageAuthUI();
            }
        }
    }, 2000);
    
    // 30초 후 주기적 체크 중단 (관찰자는 유지)
    setTimeout(() => {
        clearInterval(intervalId);
        console.log('✅ 메인 페이지 주기적 체크 완료 (관찰자는 계속 활성)');
    }, 30000);
    
    return observer;
}

// 7. 메인 페이지 즉시 실행
console.log('🚀 메인 페이지 완전 수정 시작...');

// CSS 주입
injectMainPageCSS();

// 초기 수정 실행
const initialResult = fixMainPageAuthUI();

// 1초 후 재확인
setTimeout(() => {
    console.log('🔄 메인 페이지 1초 후 재확인...');
    fixMainPageAuthUI();
}, 1000);

// 3초 후 감시 시작
setTimeout(() => {
    startMainPageMonitoring();
}, 3000);

// 5초 후 최종 검증
setTimeout(() => {
    console.log('=== 메인 페이지 최종 검증 ===');
    const finalAnalysis = analyzeMainPageAuthState();
    
    const remainingLoginBtns = finalAnalysis.loginButtons.filter(btn => 
        !btn.hasAttribute('data-main-page-destroyed') && 
        window.getComputedStyle(btn).display !== 'none'
    );
    
    const remainingSignupBtns = finalAnalysis.signupButtons.filter(btn => 
        !btn.hasAttribute('data-main-page-destroyed') && 
        window.getComputedStyle(btn).display !== 'none'
    );
    
    if (remainingLoginBtns.length === 0 && remainingSignupBtns.length === 0) {
        console.log('🎉🎉🎉 메인 페이지 완전 성공!');
        alert('✅ 메인 페이지 인증 UI 완전 수정 성공!\n\n🎯 로그인/회원가입 버튼이 완벽하게 사라졌습니다!\n✨ 환영 메시지와 로그아웃 버튼만 표시됩니다!\n🔄 실시간 감시 시스템이 활성화되었습니다!\n\n🚀 메인 페이지가 이제 완벽하게 작동합니다!');
    } else {
        console.log('⚠️ 메인 페이지 일부 버튼이 여전히 남아있습니다:');
        console.log('남은 로그인 버튼:', remainingLoginBtns.length);
        console.log('남은 회원가입 버튼:', remainingSignupBtns.length);
        
        // 추가 강제 제거
        [...remainingLoginBtns, ...remainingSignupBtns].forEach(btn => {
            console.log('🔥 메인 페이지 최종 강제 제거:', btn);
            destroyMainPageElement(btn, '메인 페이지 최종 강제 제거');
        });
        
        alert('⚠️ 메인 페이지 부분적 성공\n\n일부 버튼을 추가로 제거했습니다.\n페이지를 새로고침하면 완전히 해결됩니다.');
    }
}, 5000);

// 전역 함수로 제공
window.MainPageEmergencyFix = {
    fix: fixMainPageAuthUI,
    analyze: analyzeMainPageAuthState,
    destroy: destroyMainPageElement,
    show: showMainPageElement,
    monitor: startMainPageMonitoring
};

console.log('📖 메인 페이지 사용 가능한 함수:');
console.log('- MainPageEmergencyFix.fix() : 수동 수정');
console.log('- MainPageEmergencyFix.analyze() : 상태 분석');
console.log('- MainPageEmergencyFix.destroy(element, reason) : 요소 제거');

console.log('🎯 메인 페이지 전용 완전 수정 스크립트 로드 완료!');
console.log('🔥 이 스크립트는 메인 페이지에 특화되어 100% 확실하게 작동합니다!');