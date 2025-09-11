// 🚨 긴급 수정 스크립트 - w-campus.com에서 바로 사용 가능
// 브라우저 개발자도구 콘솔에서 이 코드를 복사해서 실행하세요

console.log('🚨 WOW-CAMPUS 인증 UI 긴급 수정 시작...');

// 1. 현재 상태 분석
function analyzeCurrentIssue() {
    console.log('=== 현재 문제 상황 분석 ===');
    
    // 모든 로그인/회원가입 관련 요소 찾기
    const loginElements = document.querySelectorAll('a[href*="login"], button:contains("로그인"), *:contains("로그인")');
    const registerElements = document.querySelectorAll('a[href*="register"], button:contains("회원가입"), *:contains("회원가입")');
    const logoutElements = document.querySelectorAll('button:contains("로그아웃"), *:contains("로그아웃")');
    const welcomeElements = document.querySelectorAll('*:contains("환영합니다"), *:contains("admin@wowcampus.com")');
    
    console.log('발견된 요소들:');
    console.log('- 로그인 관련 요소:', loginElements.length);
    console.log('- 회원가입 관련 요소:', registerElements.length);
    console.log('- 로그아웃 관련 요소:', logoutElements.length);
    console.log('- 환영 메시지 요소:', welcomeElements.length);
    
    // 텍스트 기반으로 더 정확하게 찾기
    const allElements = document.querySelectorAll('*');
    const foundLoginBtns = [];
    const foundRegisterBtns = [];
    const foundLogoutBtns = [];
    const foundWelcome = [];
    
    allElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        const tagName = el.tagName?.toLowerCase() || '';
        
        if ((tagName === 'a' || tagName === 'button') && text === '로그인') {
            foundLoginBtns.push(el);
        }
        if ((tagName === 'a' || tagName === 'button') && text === '회원가입') {
            foundRegisterBtns.push(el);
        }
        if ((tagName === 'a' || tagName === 'button') && text.includes('로그아웃')) {
            foundLogoutBtns.push(el);
        }
        if (text.includes('환영합니다') || text.includes('admin@wowcampus.com')) {
            foundWelcome.push(el);
        }
    });
    
    console.log('정확한 요소 카운트:');
    console.log('- 로그인 버튼:', foundLoginBtns.length, foundLoginBtns);
    console.log('- 회원가입 버튼:', foundRegisterBtns.length, foundRegisterBtns);
    console.log('- 로그아웃 버튼:', foundLogoutBtns.length, foundLogoutBtns);
    console.log('- 환영 메시지:', foundWelcome.length, foundWelcome);
    
    return {
        loginBtns: foundLoginBtns,
        registerBtns: foundRegisterBtns,
        logoutBtns: foundLogoutBtns,
        welcomeElements: foundWelcome
    };
}

// 2. 강력한 요소 숨김 함수
function forceHideElement(element, reason = '') {
    if (!element) return false;
    
    try {
        // 모든 가능한 방법으로 숨김
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('opacity', '0', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('position', 'absolute', 'important');
        element.style.setProperty('left', '-99999px', 'important');
        element.style.setProperty('top', '-99999px', 'important');
        element.style.setProperty('width', '0', 'important');
        element.style.setProperty('height', '0', 'important');
        element.style.setProperty('overflow', 'hidden', 'important');
        element.style.setProperty('z-index', '-9999', 'important');
        element.style.setProperty('transform', 'scale(0)', 'important');
        
        // 클래스와 속성 추가
        element.classList.add('emergency-hidden');
        element.setAttribute('data-emergency-hidden', 'true');
        element.setAttribute('data-reason', reason);
        
        // 부모 요소도 처리 (필요한 경우)
        if (element.parentElement && element.parentElement.children.length === 1) {
            element.parentElement.style.setProperty('display', 'none', 'important');
        }
        
        console.log(`✅ ${reason} 숨김 완료:`, element);
        return true;
    } catch (e) {
        console.error(`❌ ${reason} 숨김 실패:`, e, element);
        return false;
    }
}

// 3. 강력한 요소 표시 함수
function forceShowElement(element, reason = '') {
    if (!element) return false;
    
    try {
        element.style.setProperty('display', 'inline-block', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
        element.style.removeProperty('position');
        element.style.removeProperty('left');
        element.style.removeProperty('top');
        element.style.removeProperty('width');
        element.style.removeProperty('height');
        element.style.removeProperty('overflow');
        element.style.removeProperty('z-index');
        element.style.removeProperty('transform');
        
        element.classList.remove('emergency-hidden');
        element.removeAttribute('data-emergency-hidden');
        
        console.log(`✅ ${reason} 표시 완료:`, element);
        return true;
    } catch (e) {
        console.error(`❌ ${reason} 표시 실패:`, e, element);
        return false;
    }
}

// 4. 메인 수정 함수
function emergencyFixAuthUI() {
    console.log('🔧 긴급 인증 UI 수정 실행...');
    
    const elements = analyzeCurrentIssue();
    
    // 로그인된 상태로 가정하고 처리
    console.log('로그인 상태로 인식 - 인증 버튼 숨김 처리');
    
    let hiddenCount = 0;
    let shownCount = 0;
    
    // 로그인 버튼 모두 숨김
    elements.loginBtns.forEach(btn => {
        if (forceHideElement(btn, '로그인 버튼')) hiddenCount++;
    });
    
    // 회원가입 버튼 모두 숨김
    elements.registerBtns.forEach(btn => {
        if (forceHideElement(btn, '회원가입 버튼')) hiddenCount++;
    });
    
    // 로그아웃 버튼과 환영 메시지는 표시
    elements.logoutBtns.forEach(btn => {
        if (forceShowElement(btn, '로그아웃 버튼')) shownCount++;
    });
    
    elements.welcomeElements.forEach(el => {
        if (forceShowElement(el, '환영 메시지')) shownCount++;
    });
    
    console.log(`✅ 처리 완료: ${hiddenCount}개 숨김, ${shownCount}개 표시`);
    
    // 추가 안전장치: ID 기반 처리
    const commonIds = ['auth-buttons', 'login-btn', 'register-btn', 'signin-btn', 'signup-btn'];
    commonIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            forceHideElement(element, `ID: ${id}`);
            hiddenCount++;
        }
    });
    
    return { hiddenCount, shownCount };
}

// 5. 주기적 감시 및 자동 수정
function startEmergencyMonitoring() {
    console.log('🔄 긴급 감시 시작 - 새로운 인증 버튼 자동 차단');
    
    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
        let needsFix = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element
                        const text = node.textContent?.trim() || '';
                        if (text === '로그인' || text === '회원가입') {
                            console.log('🚨 새로운 인증 버튼 감지:', node);
                            forceHideElement(node, '새로 추가된 인증 버튼');
                            needsFix = true;
                        }
                    }
                });
            }
        });
        
        if (needsFix) {
            setTimeout(emergencyFixAuthUI, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 주기적 체크 (10초마다)
    const intervalId = setInterval(() => {
        console.log('🔍 주기적 인증 상태 체크...');
        const loginVisible = document.querySelector('[data-emergency-hidden!="true"]:contains("로그인")');
        const registerVisible = document.querySelector('[data-emergency-hidden!="true"]:contains("회원가입")');
        
        if (loginVisible || registerVisible) {
            console.log('🚨 인증 버튼이 다시 나타남 - 재수정');
            emergencyFixAuthUI();
        }
    }, 10000);
    
    // 30초 후 주기적 체크 중단
    setTimeout(() => {
        clearInterval(intervalId);
        console.log('✅ 주기적 체크 완료');
    }, 30000);
    
    return observer;
}

// 6. 즉시 실행
console.log('🚀 긴급 수정 시작...');

// 초기 수정 실행
const result = emergencyFixAuthUI();

// 1초 후 재확인 및 추가 수정
setTimeout(() => {
    console.log('🔄 1초 후 재확인...');
    emergencyFixAuthUI();
}, 1000);

// 3초 후 감시 시작
setTimeout(() => {
    startEmergencyMonitoring();
}, 3000);

// 최종 결과 확인 (5초 후)
setTimeout(() => {
    console.log('=== 최종 결과 확인 ===');
    const finalCheck = analyzeCurrentIssue();
    
    const visibleLoginBtns = finalCheck.loginBtns.filter(btn => 
        window.getComputedStyle(btn).display !== 'none' && 
        !btn.hasAttribute('data-emergency-hidden')
    );
    
    const visibleRegisterBtns = finalCheck.registerBtns.filter(btn => 
        window.getComputedStyle(btn).display !== 'none' && 
        !btn.hasAttribute('data-emergency-hidden')
    );
    
    if (visibleLoginBtns.length === 0 && visibleRegisterBtns.length === 0) {
        console.log('🎉 성공! 모든 인증 버튼이 숨겨졌습니다.');
        alert('✅ 긴급 수정 완료!\n\n로그인/회원가입 버튼이 성공적으로 숨겨졌습니다.\n환영 메시지와 로그아웃 버튼만 표시됩니다.');
    } else {
        console.log('⚠️ 일부 버튼이 여전히 보입니다:', {
            visibleLogin: visibleLoginBtns.length,
            visibleRegister: visibleRegisterBtns.length
        });
        alert('⚠️ 부분적 성공\n\n일부 인증 버튼이 여전히 보일 수 있습니다.\n페이지를 새로고침한 후 다시 시도하세요.');
    }
}, 5000);

// 전역 함수로 제공
window.emergencyAuthFix = {
    fix: emergencyFixAuthUI,
    analyze: analyzeCurrentIssue,
    monitor: startEmergencyMonitoring
};

console.log('📖 사용 가능한 함수:');
console.log('- window.emergencyAuthFix.fix() : 수동 수정');
console.log('- window.emergencyAuthFix.analyze() : 상태 분석');
console.log('- window.emergencyAuthFix.monitor() : 감시 시작');

console.log('🎯 긴급 수정 스크립트 로드 완료!');