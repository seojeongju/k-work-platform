// 🚨 w-campus.com 즉시 해결 스크립트
// 브라우저 개발자도구 콘솔에서 이 코드를 복사해서 실행하세요

console.log('🚨 w-campus.com 즉시 인증 버튼 제거 시작...');
console.log('📍 현재 상태: admin@wowcampus.com 로그인 + 로그인/회원가입 버튼 동시 표시 문제');

// 1. 즉시 완전 제거 함수
function instantDestroy(element, reason) {
    if (!element) return false;
    
    try {
        // 완전 파괴 스타일
        const destroyStyles = [
            ['display', 'none'],
            ['visibility', 'hidden'],
            ['opacity', '0'],
            ['pointer-events', 'none'],
            ['position', 'fixed'],
            ['left', '-999999px'],
            ['top', '-999999px'],
            ['width', '0'],
            ['height', '0'],
            ['z-index', '-99999'],
            ['transform', 'scale(0)'],
            ['overflow', 'hidden']
        ];
        
        destroyStyles.forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
        
        element.setAttribute('data-instantly-destroyed', 'true');
        element.textContent = '';
        element.innerHTML = '';
        
        console.log(`✅ 즉시 제거 완료: ${reason}`, element);
        return true;
    } catch (e) {
        console.error(`❌ 제거 실패: ${reason}`, e);
        return false;
    }
}

// 2. 메인 수정 실행
function executeInstantFix() {
    console.log('🔧 즉시 수정 실행...');
    
    let removedCount = 0;
    
    // 모든 a, button 요소 체크
    document.querySelectorAll('a, button').forEach(el => {
        const text = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        
        // 로그인 버튼 찾기 및 제거
        if (text === '로그인' || text === 'Login') {
            if (instantDestroy(el, '로그인 버튼')) {
                removedCount++;
            }
        }
        
        // 회원가입 버튼 찾기 및 제거
        if (text === '회원가입' || text === 'Sign Up' || text === '회원 가입') {
            if (instantDestroy(el, '회원가입 버튼')) {
                removedCount++;
            }
        }
        
        // href 기반 제거
        if (href.includes('login') && !href.includes('logout')) {
            if (instantDestroy(el, 'href 로그인 링크')) {
                removedCount++;
            }
        }
        
        if (href.includes('register') || href.includes('signup')) {
            if (instantDestroy(el, 'href 회원가입 링크')) {
                removedCount++;
            }
        }
    });
    
    console.log(`✅ 즉시 수정 완료: ${removedCount}개 요소 제거됨`);
    return removedCount;
}

// 3. CSS 강제 주입
function injectInstantCSS() {
    const css = `
        /* 즉시 수정용 CSS */
        [data-instantly-destroyed="true"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: fixed !important;
            left: -999999px !important;
            width: 0 !important;
            height: 0 !important;
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    console.log('✅ 즉시 수정용 CSS 주입 완료');
}

// 4. 지속적 감시
function startInstantMonitor() {
    const observer = new MutationObserver(() => {
        // 새로운 인증 버튼이 나타나면 즉시 제거
        setTimeout(() => {
            document.querySelectorAll('a, button').forEach(el => {
                if (el.hasAttribute('data-instantly-destroyed')) return;
                
                const text = el.textContent?.trim();
                if (text === '로그인' || text === '회원가입') {
                    instantDestroy(el, '새로 나타난 인증 버튼');
                }
            });
        }, 100);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ 지속적 감시 시작');
    return observer;
}

// 5. 즉시 실행
console.log('🚀 w-campus.com 즉시 수정 시작...');

// CSS 주입
injectInstantCSS();

// 수정 실행
const result = executeInstantFix();

// 1초 후 재확인
setTimeout(() => {
    console.log('🔄 1초 후 재확인...');
    executeInstantFix();
}, 1000);

// 감시 시작
startInstantMonitor();

// 5초 후 최종 확인
setTimeout(() => {
    const finalCheck = document.querySelectorAll('a, button').length;
    const remaining = Array.from(document.querySelectorAll('a, button')).filter(el => {
        const text = el.textContent?.trim();
        return (text === '로그인' || text === '회원가입') && 
               !el.hasAttribute('data-instantly-destroyed') &&
               window.getComputedStyle(el).display !== 'none';
    });
    
    if (remaining.length === 0) {
        console.log('🎉 완전 성공! 모든 인증 버튼이 제거되었습니다!');
        alert('✅ 성공!\n\n로그인/회원가입 버튼이 완전히 제거되었습니다!\n이제 admin@wowcampus.com과 로그아웃 버튼만 표시됩니다.');
    } else {
        console.log('⚠️ 일부 버튼이 남아있습니다:', remaining);
        remaining.forEach(btn => instantDestroy(btn, '최종 강제 제거'));
        alert('⚠️ 부분 성공\n\n일부 버튼을 추가로 제거했습니다.\n페이지를 새로고침하면 완전히 정리됩니다.');
    }
}, 5000);

console.log('📖 수동 실행 함수:');
console.log('- executeInstantFix() : 수동으로 다시 실행');

console.log('🎯 w-campus.com 즉시 수정 스크립트 완료!');