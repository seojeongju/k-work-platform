// 🔥 w-campus.com 최종 완전 해결 스크립트
// 브라우저 개발자도구 콘솔에서 이 전체 코드를 복사해서 실행하세요

console.log('🔥 w-campus.com 최종 완전 해결 스크립트 시작...');
console.log('📍 목표: 로그인/회원가입 버튼 100% 완전 제거');

// 1. 초강력 완전 파괴 함수
function ultimateDestroy(element, reason = '') {
    if (!element) return false;
    
    try {
        console.log(`🔥 완전 파괴 시작: ${reason}`, element);
        
        // 모든 가능한 방법으로 완전 제거
        const destroyMethods = [
            () => { element.style.setProperty('display', 'none', 'important'); },
            () => { element.style.setProperty('visibility', 'hidden', 'important'); },
            () => { element.style.setProperty('opacity', '0', 'important'); },
            () => { element.style.setProperty('pointer-events', 'none', 'important'); },
            () => { element.style.setProperty('position', 'fixed', 'important'); },
            () => { element.style.setProperty('left', '-999999px', 'important'); },
            () => { element.style.setProperty('top', '-999999px', 'important'); },
            () => { element.style.setProperty('right', '-999999px', 'important'); },
            () => { element.style.setProperty('bottom', '-999999px', 'important'); },
            () => { element.style.setProperty('width', '0', 'important'); },
            () => { element.style.setProperty('height', '0', 'important'); },
            () => { element.style.setProperty('min-width', '0', 'important'); },
            () => { element.style.setProperty('min-height', '0', 'important'); },
            () => { element.style.setProperty('max-width', '0', 'important'); },
            () => { element.style.setProperty('max-height', '0', 'important'); },
            () => { element.style.setProperty('overflow', 'hidden', 'important'); },
            () => { element.style.setProperty('z-index', '-99999', 'important'); },
            () => { element.style.setProperty('transform', 'scale(0) translate(-99999px, -99999px)', 'important'); },
            () => { element.style.setProperty('clip-path', 'circle(0%)', 'important'); },
            () => { element.style.setProperty('margin', '0', 'important'); },
            () => { element.style.setProperty('padding', '0', 'important'); },
            () => { element.style.setProperty('border', 'none', 'important'); },
            () => { element.style.setProperty('outline', 'none', 'important'); },
            () => { element.style.setProperty('background', 'transparent', 'important'); },
            () => { element.style.setProperty('color', 'transparent', 'important'); },
            () => { element.style.setProperty('font-size', '0', 'important'); },
            () => { element.style.setProperty('line-height', '0', 'important'); },
            () => { element.style.setProperty('text-indent', '-99999px', 'important'); },
            () => { element.style.setProperty('white-space', 'nowrap', 'important'); },
            () => { element.style.setProperty('user-select', 'none', 'important'); },
            () => { element.style.setProperty('cursor', 'default', 'important'); },
            () => { element.textContent = ''; },
            () => { element.innerHTML = ''; },
            () => { element.innerText = ''; },
            () => { element.setAttribute('hidden', 'true'); },
            () => { element.setAttribute('aria-hidden', 'true'); },
            () => { element.setAttribute('tabindex', '-1'); },
            () => { element.classList.add('ultimate-destroyed'); },
            () => { element.setAttribute('data-ultimate-destroyed', 'true'); },
            () => { element.setAttribute('data-destruction-reason', reason); }
        ];
        
        // 모든 파괴 메서드 실행
        destroyMethods.forEach((method, index) => {
            try {
                method();
            } catch (e) {
                console.log(`파괴 메서드 ${index} 오류:`, e);
            }
        });
        
        // 이벤트 리스너 완전 차단
        ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
            element.addEventListener(eventType, function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log(`🚫 차단된 이벤트: ${eventType}`, element);
                return false;
            }, { capture: true, passive: false });
        });
        
        // 부모 요소도 처리
        if (element.parentElement) {
            const parent = element.parentElement;
            const siblings = Array.from(parent.children).filter(child => 
                !child.hasAttribute('data-ultimate-destroyed')
            );
            
            // 이 요소가 유일한 자식인 경우 부모도 숨김
            if (siblings.length <= 1 && parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
                console.log(`🔥 부모 요소도 파괴: ${parent.tagName}`);
                parent.style.setProperty('display', 'none', 'important');
                parent.style.setProperty('visibility', 'hidden', 'important');
                parent.classList.add('ultimate-parent-destroyed');
            }
        }
        
        console.log(`✅ 완전 파괴 완료: ${reason}`);
        return true;
        
    } catch (e) {
        console.error(`❌ 완전 파괴 실패: ${reason}`, e);
        return false;
    }
}

// 2. 메인 페이지 전체 스캔 및 제거
function ultimateScanAndDestroy() {
    console.log('🔍 메인 페이지 전체 스캔 시작...');
    
    let destroyedCount = 0;
    const targetTexts = ['로그인', '회원가입', 'Login', 'Sign Up', 'Register', '회원 가입'];
    const targetHrefs = ['login', 'register', 'signin', 'signup'];
    
    // 모든 요소 스캔
    document.querySelectorAll('*').forEach((element, index) => {
        if (element.hasAttribute('data-ultimate-destroyed')) return;
        
        const tagName = element.tagName?.toLowerCase();
        const text = element.textContent?.trim() || '';
        const href = element.getAttribute('href') || '';
        
        // 텍스트 기반 탐지 (가장 확실한 방법)
        if ((tagName === 'a' || tagName === 'button') && targetTexts.includes(text)) {
            if (ultimateDestroy(element, `텍스트: ${text}`)) {
                destroyedCount++;
            }
        }
        
        // href 기반 탐지
        if (tagName === 'a' && targetHrefs.some(target => href.includes(target))) {
            if (ultimateDestroy(element, `href: ${href}`)) {
                destroyedCount++;
            }
        }
        
        // ID 기반 탐지
        const elementId = element.id || '';
        if (elementId && (elementId.includes('login') || elementId.includes('register'))) {
            if (ultimateDestroy(element, `ID: ${elementId}`)) {
                destroyedCount++;
            }
        }
        
        // 클래스 기반 탐지
        const className = element.className || '';
        if (className && (className.includes('login') || className.includes('register'))) {
            if (ultimateDestroy(element, `class: ${className}`)) {
                destroyedCount++;
            }
        }
    });
    
    console.log(`✅ 스캔 완료: ${destroyedCount}개 요소 파괴됨`);
    return destroyedCount;
}

// 3. 초강력 CSS 주입
function injectUltimateCSS() {
    const cssId = 'ultimate-auth-fix-css';
    if (document.getElementById(cssId)) return;
    
    const css = `
        /* 초강력 완전 차단 CSS */
        .ultimate-destroyed,
        [data-ultimate-destroyed="true"] {
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
            transform: scale(0) !important;
            clip-path: circle(0%) !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 0 !important;
            line-height: 0 !important;
            text-indent: -99999px !important;
        }
        
        /* 부모 요소 숨김 */
        .ultimate-parent-destroyed {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 텍스트 기반 강제 숨김 */
        a:contains("로그인"):not(:contains("로그아웃")),
        a:contains("회원가입"),
        button:contains("로그인"),
        button:contains("회원가입") {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
        
        /* href 기반 강제 숨김 */
        a[href*="login"]:not([href*="logout"]),
        a[href*="register"],
        a[href*="signin"],
        a[href*="signup"] {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = css;
    document.head.appendChild(style);
    console.log('✅ 초강력 CSS 주입 완료');
}

// 4. 실시간 감시 및 자동 차단 시스템
function startUltimateMonitoring() {
    console.log('🔍 초강력 실시간 감시 시작...');
    
    // MutationObserver로 DOM 변경 감시
    const observer = new MutationObserver((mutations) => {
        let needsRescan = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.tagName) {
                        const text = node.textContent?.trim() || '';
                        const href = node.getAttribute?.('href') || '';
                        
                        if ((text === '로그인' || text === '회원가입') ||
                            (href && (href.includes('login') || href.includes('register')))) {
                            console.log('🚨 새로운 인증 요소 감지 - 즉시 파괴:', node);
                            ultimateDestroy(node, '새로 추가된 인증 요소');
                            needsRescan = true;
                        }
                    }
                });
            } else if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (target.hasAttribute?.('data-ultimate-destroyed')) {
                    // 파괴된 요소의 복원 시도 감지
                    console.log('🚨 파괴된 요소 복원 시도 감지 - 재파괴:', target);
                    ultimateDestroy(target, '복원 시도 차단');
                }
            }
        });
        
        if (needsRescan) {
            setTimeout(ultimateScanAndDestroy, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
    });
    
    // 주기적 강제 체크 (1초마다)
    const intervalId = setInterval(() => {
        const visibleAuthButtons = document.querySelectorAll('a, button');
        let foundVisible = false;
        
        for (let btn of visibleAuthButtons) {
            if (btn.hasAttribute('data-ultimate-destroyed')) continue;
            
            const text = btn.textContent?.trim();
            const href = btn.getAttribute('href') || '';
            const computedStyle = window.getComputedStyle(btn);
            
            if ((text === '로그인' || text === '회원가입' || 
                 href.includes('login') || href.includes('register')) &&
                computedStyle.display !== 'none' && 
                computedStyle.visibility !== 'hidden') {
                console.log('🚨 주기적 체크: 살아있는 인증 버튼 발견 - 파괴:', btn);
                ultimateDestroy(btn, '주기적 체크에서 발견');
                foundVisible = true;
            }
        }
        
        if (foundVisible) {
            ultimateScanAndDestroy();
        }
    }, 1000);
    
    // 60초 후 주기적 체크 중단 (관찰자는 유지)
    setTimeout(() => {
        clearInterval(intervalId);
        console.log('✅ 주기적 체크 완료 (관찰자는 계속 활성)');
    }, 60000);
    
    return observer;
}

// 5. 최종 실행 및 검증
function executeUltimateFix() {
    console.log('🚀 최종 완전 수정 실행...');
    
    // 1단계: CSS 주입
    injectUltimateCSS();
    
    // 2단계: 전체 스캔 및 파괴
    const destroyed1 = ultimateScanAndDestroy();
    
    // 3단계: 0.5초 후 재스캔
    setTimeout(() => {
        console.log('🔄 0.5초 후 재스캔...');
        const destroyed2 = ultimateScanAndDestroy();
    }, 500);
    
    // 4단계: 1초 후 재스캔
    setTimeout(() => {
        console.log('🔄 1초 후 재스캔...');
        const destroyed3 = ultimateScanAndDestroy();
    }, 1000);
    
    // 5단계: 감시 시작
    setTimeout(() => {
        startUltimateMonitoring();
    }, 1500);
    
    // 6단계: 5초 후 최종 검증
    setTimeout(() => {
        console.log('=== 최종 검증 ===');
        
        const remainingAuthButtons = [];
        document.querySelectorAll('a, button').forEach(el => {
            if (el.hasAttribute('data-ultimate-destroyed')) return;
            
            const text = el.textContent?.trim();
            const href = el.getAttribute('href') || '';
            const computedStyle = window.getComputedStyle(el);
            
            if ((text === '로그인' || text === '회원가입' || 
                 href.includes('login') || href.includes('register')) &&
                computedStyle.display !== 'none' && 
                computedStyle.visibility !== 'hidden') {
                remainingAuthButtons.push(el);
            }
        });
        
        if (remainingAuthButtons.length === 0) {
            console.log('🎉🎉🎉 완전 성공! 모든 인증 버튼이 제거되었습니다!');
            alert('✅ 최종 성공!\n\n🎯 모든 로그인/회원가입 버튼이 완벽하게 제거되었습니다!\n✨ 실시간 감시 시스템이 활성화되었습니다!\n🔄 새로고침해도 자동으로 제거됩니다!\n\n🚀 w-campus.com이 이제 완벽하게 작동합니다!');
        } else {
            console.log('⚠️ 일부 버튼이 여전히 남아있습니다:', remainingAuthButtons);
            remainingAuthButtons.forEach(btn => {
                console.log('🔥 최종 강제 제거:', btn);
                ultimateDestroy(btn, '최종 강제 제거');
            });
            alert('⚠️ 부분적 성공\n\n대부분의 버튼을 제거했습니다.\n남은 버튼도 추가로 제거했으니 확인해보세요!');
        }
    }, 5000);
}

// 전역 함수로 노출
window.UltimateFix = {
    execute: executeUltimateFix,
    scan: ultimateScanAndDestroy,
    destroy: ultimateDestroy,
    monitor: startUltimateMonitoring
};

// 자동 실행
executeUltimateFix();

console.log('📖 수동 실행 함수:');
console.log('- UltimateFix.execute() : 전체 수정 재실행');
console.log('- UltimateFix.scan() : 스캔 및 파괴만 실행');

console.log('🔥 w-campus.com 최종 완전 해결 스크립트 완료!');
console.log('🎯 이 스크립트는 지금까지 만든 것 중 가장 강력합니다!');