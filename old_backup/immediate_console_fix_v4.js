// 🚀 w-campus.com 즉시 콘솔 수정 스크립트 V4 (간단하고 강력함)
// 브라우저 개발자도구 콘솔에서 실행하세요!

console.log('🚀 w-campus.com 즉시 인증 버튼 제거 시작...');

// 1. 즉시 실행 함수
(function() {
    // 모든 링크와 버튼 찾기
    const authButtons = [];
    
    // 텍스트로 찾기
    document.querySelectorAll('a, button').forEach(el => {
        const text = el.textContent?.trim();
        if (text === '로그인' || text === '회원가입' || text === 'Login' || text === 'Sign Up') {
            authButtons.push({element: el, reason: `텍스트: ${text}`});
        }
    });
    
    // href로 찾기  
    document.querySelectorAll('a[href*="login"], a[href*="register"], a[href*="signin"], a[href*="signup"]').forEach(el => {
        const href = el.getAttribute('href');
        if (!authButtons.some(item => item.element === el)) {
            authButtons.push({element: el, reason: `href: ${href}`});
        }
    });
    
    // ID/Class로 찾기
    document.querySelectorAll('#login-btn, #register-btn, #auth-buttons, .login-btn, .register-btn, .auth-btn').forEach(el => {
        if (!authButtons.some(item => item.element === el)) {
            authButtons.push({element: el, reason: `선택자: ${el.id || el.className}`});
        }
    });
    
    console.log(`🎯 발견된 인증 버튼: ${authButtons.length}개`);
    
    // 2. 완전 제거 실행
    let destroyedCount = 0;
    authButtons.forEach(({element, reason}, index) => {
        try {
            // 초강력 스타일 적용
            const styles = [
                ['display', 'none'],
                ['visibility', 'hidden'],
                ['opacity', '0'],
                ['pointer-events', 'none'],
                ['position', 'fixed'],
                ['left', '-99999px'],
                ['width', '0'],
                ['height', '0'],
                ['overflow', 'hidden'],
                ['z-index', '-99999'],
                ['transform', 'scale(0)'],
                ['clip-path', 'circle(0%)']
            ];
            
            styles.forEach(([prop, value]) => {
                element.style.setProperty(prop, value, 'important');
            });
            
            // 텍스트 완전 제거
            element.textContent = '';
            element.innerHTML = '';
            
            // 마킹
            element.setAttribute('data-wcampus-destroyed', 'true');
            element.classList.add('wcampus-destroyed');
            
            // 클릭 차단
            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 차단된 클릭:', element);
                return false;
            }, true);
            
            console.log(`✅ ${index + 1}. ${reason} - 완전 제거됨`, element);
            destroyedCount++;
            
        } catch (e) {
            console.log(`❌ ${index + 1}. ${reason} - 제거 실패:`, e);
        }
    });
    
    // 3. 부모 요소 정리
    document.querySelectorAll('[data-wcampus-destroyed]').forEach(destroyed => {
        const parent = destroyed.parentElement;
        if (parent && parent.children.length === 1 && parent.tagName !== 'BODY') {
            parent.style.setProperty('display', 'none', 'important');
            console.log('🗑️ 부모 요소도 숨김:', parent);
        }
    });
    
    // 4. 결과 출력
    console.log(`🎉 완료! ${destroyedCount}개 버튼이 완전히 제거되었습니다!`);
    
    if (destroyedCount > 0) {
        alert(`✅ 성공!\n\n${destroyedCount}개의 로그인/회원가입 버튼이\n완전히 제거되었습니다!\n\n화면을 확인해보세요! 🎯`);
    } else {
        alert('⚠️ 인증 버튼을 찾을 수 없습니다.\n\n이미 제거되었거나 다른 구조일 수 있습니다.\n새로고침 후 다시 시도해보세요.');
    }
})();

// 5. 실시간 감시 시작 (30초간)
console.log('🔍 실시간 감시 시작... (30초간 새로운 버튼 자동 차단)');

let monitoringCount = 0;
const monitoringInterval = setInterval(() => {
    let foundNew = false;
    
    document.querySelectorAll('a, button').forEach(el => {
        if (el.hasAttribute('data-wcampus-destroyed')) return;
        
        const text = el.textContent?.trim();
        const href = el.getAttribute('href') || '';
        
        if ((text === '로그인' || text === '회원가입') || 
            (href.includes('login') || href.includes('register'))) {
            
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-wcampus-destroyed', 'true');
            console.log('🚨 새로운 인증 버튼 감지 및 즉시 제거:', text || href);
            foundNew = true;
        }
    });
    
    if (foundNew) {
        monitoringCount++;
    }
    
}, 500);

// 30초 후 감시 종료
setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log(`✅ 실시간 감시 완료! 추가로 ${monitoringCount}번 차단했습니다.`);
}, 30000);

console.log('🔥 w-campus.com 즉시 수정 완료!');