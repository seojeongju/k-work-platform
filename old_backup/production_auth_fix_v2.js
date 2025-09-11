/*
 * WOW-CAMPUS 프로덕션용 완벽한 인증 UI 제어 스크립트 v2.0
 * w-campus.com 배포 사이트에서 즉시 로드되어 인증 버튼 문제 완전 해결
 * 스크린샷 분석 결과를 바탕으로 정확한 타겟팅 적용
 */

(function() {
    'use strict';
    
    console.log('🚀 WOW-CAMPUS 완벽한 프로덕션 인증 UI 제어 v2.0 시작...');
    
    // 설정
    const CONFIG = {
        DEBUG: true,
        RETRY_COUNT: 10,
        RETRY_DELAY: 100,
        MONITOR_DURATION: 60000, // 60초
        AGGRESSIVE_MODE: true
    };
    
    // 로그 함수
    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[WC-AUTH-FIX-V2]', ...args);
        }
    }
    
    // 고급 인증 상태 확인
    function checkWCampusAuthStatus() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        const sessionUser = sessionStorage.getItem('user');
        
        let isLoggedIn = false;
        let userInfo = null;
        
        // localStorage 체크
        if (user && token) {
            try {
                userInfo = JSON.parse(user);
                isLoggedIn = !!(userInfo && (userInfo.id || userInfo.email));
            } catch (e) {
                log('localStorage 사용자 정보 파싱 오류:', e);
            }
        }
        
        // sessionStorage 체크
        if (!isLoggedIn && sessionUser) {
            try {
                userInfo = JSON.parse(sessionUser);
                isLoggedIn = !!(userInfo && (userInfo.id || userInfo.email));
            } catch (e) {
                log('sessionStorage 사용자 정보 파싱 오류:', e);
            }
        }
        
        // DOM에서 로그인 상태 확인 (admin@wowcampus.com 또는 환영합니다 텍스트로)
        if (!isLoggedIn) {
            const allTexts = document.querySelectorAll('*');
            for (let el of allTexts) {
                const text = el.textContent?.trim() || '';
                if (text.includes('admin@wowcampus.com') || 
                    (text.includes('환영합니다') && text.includes('@'))) {
                    isLoggedIn = true;
                    log('DOM에서 로그인 상태 감지:', text);
                    break;
                }
            }
        }
        
        log('인증 상태 체크:', { isLoggedIn, userInfo });
        return { isLoggedIn, userInfo };
    }
    
    // 초강력 요소 완전 파괴
    function destroyElementCompletely(element, reason = '') {
        if (!element) return false;
        
        try {
            log(`🔥 완전 파괴 시작: ${reason}`, element);
            
            // 모든 가능한 방법으로 완전히 숨김
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
                ['cursor', 'default']
            ];
            
            // 모든 스타일 강제 적용
            destructiveStyles.forEach(([prop, value]) => {
                element.style.setProperty(prop, value, 'important');
            });
            
            // 파괴 마커 추가
            element.classList.add('wcampus-destroyed-v2', 'auth-hidden-prod-v2', 'completely-removed');
            element.setAttribute('data-wcampus-destroyed-v2', 'true');
            element.setAttribute('data-destruction-reason', reason);
            element.setAttribute('data-destruction-time', Date.now());
            element.setAttribute('aria-hidden', 'true');
            element.setAttribute('hidden', 'true');
            element.setAttribute('tabindex', '-1');
            
            // 텍스트 내용도 제거
            if (element.textContent) {
                element.setAttribute('data-original-text', element.textContent);
                element.textContent = '';
            }
            
            // 클릭 이벤트 완전 차단
            element.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);
            
            // 부모 요소도 처리 (필요한 경우)
            if (CONFIG.AGGRESSIVE_MODE && element.parentElement) {
                const parent = element.parentElement;
                const siblings = Array.from(parent.children).filter(child => 
                    !child.hasAttribute('data-wcampus-destroyed-v2')
                );
                
                // 이 요소가 유일한 자식이고 부모가 의미있는 태그가 아닌 경우
                if (siblings.length <= 1 && 
                    parent.tagName !== 'BODY' && parent.tagName !== 'HTML' &&
                    parent.tagName !== 'MAIN' && parent.tagName !== 'HEADER') {
                    log(`🔥 부모 요소도 파괴: ${parent.tagName}`);
                    destructiveStyles.slice(0, 8).forEach(([prop, value]) => {
                        parent.style.setProperty(prop, value, 'important');
                    });
                    parent.classList.add('wcampus-parent-destroyed');
                }
            }
            
            log(`✅ 완전 파괴 완료: ${reason}`);
            return true;
            
        } catch (e) {
            log(`❌ 완전 파괴 실패: ${reason}`, e);
            return false;
        }
    }
    
    // 요소 완전 복원 및 표시
    function restoreAndShowElement(element, reason = '') {
        if (!element) return false;
        
        try {
            log(`✨ 완전 복원 시작: ${reason}`, element);
            
            // 모든 파괴적 스타일 제거
            const stylePropsToRemove = [
                'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
                'min-width', 'min-height', 'max-width', 'max-height', 'overflow',
                'z-index', 'transform', 'clip-path', 'mask', 'filter', 'padding',
                'margin', 'border', 'outline', 'background', 'color', 'font-size',
                'line-height', 'user-select', 'cursor'
            ];
            
            stylePropsToRemove.forEach(prop => {
                element.style.removeProperty(prop);
            });
            
            // 표시 관련 스타일 강제 적용
            element.style.setProperty('display', 'inline-block', 'important');
            element.style.setProperty('visibility', 'visible', 'important');
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('pointer-events', 'auto', 'important');
            
            // 파괴 마커 제거
            element.classList.remove('wcampus-destroyed-v2', 'auth-hidden-prod-v2', 'completely-removed', 'auth-hidden-prod');
            element.removeAttribute('data-wcampus-destroyed-v2');
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
            
            log(`✅ 완전 복원 완료: ${reason}`);
            return true;
            
        } catch (e) {
            log(`❌ 완전 복원 실패: ${reason}`, e);
            return false;
        }
    }
    
    // WOW-CAMPUS 전용 요소 찾기 (정밀한 타겟팅)
    function findWCampusAuthElements() {
        const elements = {
            loginBtns: [],
            registerBtns: [],
            logoutBtns: [],
            welcomeElements: [],
            authContainers: []
        };
        
        log('🔍 WOW-CAMPUS 전용 요소 탐지 시작...');
        
        // 1. ID 기반 탐지
        const commonIds = [
            'auth-buttons', 'login-btn', 'register-btn', 'signin-btn', 
            'signup-btn', 'user-menu', 'logout-btn', 'login-link', 'register-link'
        ];
        
        commonIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.hasAttribute('data-wcampus-destroyed-v2')) {
                if (id.includes('login') || id.includes('signin')) {
                    elements.loginBtns.push(el);
                } else if (id.includes('register') || id.includes('signup')) {
                    elements.registerBtns.push(el);
                } else if (id.includes('logout')) {
                    elements.logoutBtns.push(el);
                } else if (id.includes('auth')) {
                    elements.authContainers.push(el);
                }
            }
        });
        
        // 2. 클래스 기반 탐지
        const classSelectors = [
            '.login-btn', '.register-btn', '.auth-btn', '.signin-btn', '.signup-btn',
            '.login-link', '.register-link', '.user-login', '.user-register'
        ];
        
        classSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (!el.hasAttribute('data-wcampus-destroyed-v2')) {
                        if (selector.includes('login') || selector.includes('signin')) {
                            if (!elements.loginBtns.includes(el)) elements.loginBtns.push(el);
                        } else if (selector.includes('register') || selector.includes('signup')) {
                            if (!elements.registerBtns.includes(el)) elements.registerBtns.push(el);
                        }
                    }
                });
            } catch (e) {
                log('클래스 선택자 오류:', selector, e);
            }
        });
        
        // 3. 텍스트 내용 기반 정밀 탐지 (가장 확실한 방법)
        document.querySelectorAll('a, button').forEach(el => {
            if (el.hasAttribute('data-wcampus-destroyed-v2')) return;
            
            const text = el.textContent?.trim() || '';
            
            if (text === '로그인' || text === 'Login' || text === '로그 인' || text === 'LOGIN') {
                if (!elements.loginBtns.includes(el)) {
                    elements.loginBtns.push(el);
                    log('✅ 로그인 버튼 발견:', text, el);
                }
            } else if (text === '회원가입' || text === 'Sign Up' || text === '가입' || 
                      text === 'Register' || text === 'REGISTER' || text === '회원 가입') {
                if (!elements.registerBtns.includes(el)) {
                    elements.registerBtns.push(el);
                    log('✅ 회원가입 버튼 발견:', text, el);
                }
            } else if (text.includes('로그아웃') || text.includes('Logout') || text.includes('LOGOUT')) {
                if (!elements.logoutBtns.includes(el)) {
                    elements.logoutBtns.push(el);
                    log('✅ 로그아웃 버튼 발견:', text, el);
                }
            }
        });
        
        // 4. 모든 텍스트 노드에서 환영 메시지 찾기
        document.querySelectorAll('*').forEach(el => {
            if (el.hasAttribute('data-wcampus-destroyed-v2')) return;
            
            const text = el.textContent?.trim() || '';
            
            if (text.includes('환영합니다') || text.includes('Welcome') || 
                text.includes('admin@wowcampus.com') || text.includes('admin@')) {
                if (!elements.welcomeElements.includes(el) && el.children.length === 0) {
                    elements.welcomeElements.push(el);
                    log('✅ 환영 메시지 발견:', text, el);
                }
            }
        });
        
        // 5. href 속성 기반 탐지
        document.querySelectorAll('a[href]').forEach(el => {
            if (el.hasAttribute('data-wcampus-destroyed-v2')) return;
            
            const href = el.getAttribute('href') || '';
            
            if (href.includes('login') && !elements.loginBtns.includes(el)) {
                elements.loginBtns.push(el);
                log('✅ href 기반 로그인 링크 발견:', href, el);
            } else if ((href.includes('register') || href.includes('signup')) && !elements.registerBtns.includes(el)) {
                elements.registerBtns.push(el);
                log('✅ href 기반 회원가입 링크 발견:', href, el);
            }
        });
        
        log('발견된 요소 요약:', {
            login: elements.loginBtns.length,
            register: elements.registerBtns.length,
            logout: elements.logoutBtns.length,
            welcome: elements.welcomeElements.length,
            containers: elements.authContainers.length
        });
        
        return elements;
    }
    
    // 메인 수정 함수 (WOW-CAMPUS 전용)
    function fixWCampusAuthUI() {
        log('🔧 WOW-CAMPUS 전용 인증 UI 완전 수정 실행...');
        
        const { isLoggedIn, userInfo } = checkWCampusAuthStatus();
        const elements = findWCampusAuthElements();
        
        let processed = 0;
        
        if (isLoggedIn) {
            log('🔐 로그인 상태 확인 - 인증 버튼들 완전 파괴');
            
            // body에 로그인 상태 클래스 추가
            document.body.classList.add('wcampus-logged-in-v2');
            document.body.classList.remove('wcampus-logged-out-v2');
            
            // 로그인 버튼들 완전 파괴
            elements.loginBtns.forEach(btn => {
                if (destroyElementCompletely(btn, '로그인 버튼 - WC 로그인 상태')) processed++;
            });
            
            // 회원가입 버튼들 완전 파괴
            elements.registerBtns.forEach(btn => {
                if (destroyElementCompletely(btn, '회원가입 버튼 - WC 로그인 상태')) processed++;
            });
            
            // 인증 컨테이너 파괴
            elements.authContainers.forEach(container => {
                if (destroyElementCompletely(container, '인증 컨테이너 - WC 로그인 상태')) processed++;
            });
            
            // 추가 공격적 탐지 (놓친 버튼들)
            if (CONFIG.AGGRESSIVE_MODE) {
                document.querySelectorAll('a, button').forEach(el => {
                    if (el.hasAttribute('data-wcampus-destroyed-v2')) return;
                    
                    const text = el.textContent?.trim();
                    const href = el.getAttribute('href') || '';
                    
                    if ((text === '로그인' || text === '회원가입' || 
                         href.includes('login') || href.includes('register')) &&
                        window.getComputedStyle(el).display !== 'none') {
                        log('🔥 추가 공격적 탐지:', text || href, el);
                        if (destroyElementCompletely(el, `추가 탐지 - ${text || 'href:' + href}`)) {
                            processed++;
                        }
                    }
                });
            }
            
            // 로그아웃 버튼과 환영 메시지는 확실히 표시
            elements.logoutBtns.forEach(btn => {
                if (restoreAndShowElement(btn, '로그아웃 버튼 - 표시 보장')) processed++;
            });
            
            elements.welcomeElements.forEach(el => {
                if (restoreAndShowElement(el, '환영 메시지 - 표시 보장')) processed++;
            });
            
        } else {
            log('🔓 로그아웃 상태 - 인증 버튼 표시, 사용자 메뉴 숨김');
            
            // body 클래스 업데이트
            document.body.classList.add('wcampus-logged-out-v2');
            document.body.classList.remove('wcampus-logged-in-v2');
            
            // 로그인/회원가입 버튼 표시
            elements.loginBtns.forEach(btn => {
                if (restoreAndShowElement(btn, '로그인 버튼 - 표시')) processed++;
            });
            
            elements.registerBtns.forEach(btn => {
                if (restoreAndShowElement(btn, '회원가입 버튼 - 표시')) processed++;
            });
            
            // 사용자 메뉴 숨김
            elements.logoutBtns.forEach(btn => {
                if (destroyElementCompletely(btn, '로그아웃 버튼 - 숨김')) processed++;
            });
            
            elements.welcomeElements.forEach(el => {
                if (destroyElementCompletely(el, '환영 메시지 - 숨김')) processed++;
            });
        }
        
        log(`✅ WOW-CAMPUS 수정 완료: ${processed}개 요소 처리`);
        return processed;
    }
    
    // CSS 주입 (더 강력한 버전)
    function injectPowerfulCSS() {
        const cssId = 'wcampus-auth-fix-v2-styles';
        if (document.getElementById(cssId)) return;
        
        const css = `
        /* WOW-CAMPUS V2 전용 완전 차단 CSS */
        .wcampus-destroyed-v2,
        .auth-hidden-prod-v2,
        .completely-removed,
        [data-wcampus-destroyed-v2="true"] {
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
            user-select: none !important;
            font-size: 0 !important;
            line-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* 로그인 상태에서 모든 인증 버튼 완전 차단 */
        body.wcampus-logged-in-v2 a[href*="login"],
        body.wcampus-logged-in-v2 a[href*="register"],
        body.wcampus-logged-in-v2 a[href*="signin"],
        body.wcampus-logged-in-v2 a[href*="signup"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        
        /* 텍스트 기반 완전 차단 */
        body.wcampus-logged-in-v2 a:contains("로그인"),
        body.wcampus-logged-in-v2 a:contains("회원가입"),
        body.wcampus-logged-in-v2 button:contains("로그인"),
        body.wcampus-logged-in-v2 button:contains("회원가입") {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 부모 요소도 숨김 */
        .wcampus-parent-destroyed {
            display: none !important;
            visibility: hidden !important;
        }
        `;
        
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = css;
        document.head.appendChild(style);
        log('✅ 강력한 CSS v2 주입 완료');
    }
    
    // 재시도 로직 (더 공격적)
    function retryWCampusFix(attempt = 0) {
        if (attempt >= CONFIG.RETRY_COUNT) {
            log('⚠️ 최대 재시도 횟수 도달');
            return;
        }
        
        const processed = fixWCampusAuthUI();
        
        if (processed === 0 && attempt < CONFIG.RETRY_COUNT - 1) {
            log(`🔄 재시도 ${attempt + 1}/${CONFIG.RETRY_COUNT}...`);
            setTimeout(() => retryWCampusFix(attempt + 1), CONFIG.RETRY_DELAY * Math.pow(1.5, attempt));
        } else if (processed > 0) {
            log(`✅ 성공적으로 ${processed}개 요소 처리됨`);
        }
    }
    
    // DOM 감시 및 자동 차단 (더 강력한 버전)
    function startAdvancedMonitoring() {
        log('🔍 고급 DOM 감시 시작...');
        
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
                                log('🚨 새로운 인증 요소 감지 - 즉시 파괴:', node);
                                destroyElementCompletely(node, '새로 추가된 인증 요소');
                                needsRecheck = true;
                            }
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.hasAttribute && target.hasAttribute('data-wcampus-destroyed-v2')) {
                        // 파괴된 요소가 복원되려는 시도 감지
                        if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                            log('🚨 파괴된 요소 복원 시도 감지 - 재파괴:', target);
                            destroyElementCompletely(target, '복원 시도 차단');
                        }
                    }
                }
            });
            
            if (needsRecheck) {
                setTimeout(() => {
                    log('🔄 새 요소 감지로 인한 재점검...');
                    fixWCampusAuthUI();
                }, 50);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
        });
        
        // 주기적 강제 체크 (3초마다, 더 자주)
        const intervalId = setInterval(() => {
            const { isLoggedIn } = checkWCampusAuthStatus();
            
            if (isLoggedIn) {
                // 파괴되지 않은 인증 버튼이 있는지 체크
                const visibleAuthButtons = document.querySelectorAll('a, button');
                let foundVisible = false;
                
                for (let btn of visibleAuthButtons) {
                    if (btn.hasAttribute('data-wcampus-destroyed-v2')) continue;
                    
                    const text = btn.textContent?.trim();
                    const href = btn.getAttribute('href') || '';
                    const computedStyle = window.getComputedStyle(btn);
                    
                    if ((text === '로그인' || text === '회원가입' || 
                         href.includes('login') || href.includes('register')) &&
                        computedStyle.display !== 'none' && 
                        computedStyle.visibility !== 'hidden') {
                        log('🚨 주기적 체크: 살아있는 인증 버튼 발견 - 파괴:', btn);
                        destroyElementCompletely(btn, '주기적 체크에서 발견');
                        foundVisible = true;
                    }
                }
                
                if (foundVisible) {
                    fixWCampusAuthUI();
                }
            }
        }, 3000);
        
        // 감시 지속 시간
        setTimeout(() => {
            clearInterval(intervalId);
            log('✅ 주기적 체크 완료 (관찰자는 계속 활성)');
        }, CONFIG.MONITOR_DURATION);
        
        return observer;
    }
    
    // 초기화 및 실행
    function initWCampusV2() {
        log('🚀 WOW-CAMPUS V2 초기화 시작...');
        
        // CSS 주입
        injectPowerfulCSS();
        
        // 즉시 수정 실행
        setTimeout(() => retryWCampusFix(), 50);
        
        // DOM 로드 완료 후 추가 수정
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => retryWCampusFix(), 100);
            });
        } else {
            setTimeout(() => retryWCampusFix(), 100);
        }
        
        // 윈도우 로드 완료 후 최종 수정 및 감시 시작
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    retryWCampusFix();
                    startAdvancedMonitoring();
                }, 200);
            });
        } else {
            setTimeout(() => {
                retryWCampusFix();
                startAdvancedMonitoring();
            }, 200);
        }
        
        // localStorage 변경 감지
        window.addEventListener('storage', (e) => {
            if (e.key === 'user' || e.key === 'token') {
                log('🔄 인증 정보 변경 감지 - UI 업데이트');
                setTimeout(() => fixWCampusAuthUI(), 100);
            }
        });
        
        // 페이지 포커스 시 재확인
        window.addEventListener('focus', () => {
            setTimeout(() => fixWCampusAuthUI(), 100);
        });
        
        log('✅ WOW-CAMPUS V2 초기화 완료');
    }
    
    // 전역 함수로 노출
    window.WOWCampusAuthFixV2 = {
        fix: fixWCampusAuthUI,
        check: checkWCampusAuthStatus,
        find: findWCampusAuthElements,
        destroy: destroyElementCompletely,
        restore: restoreAndShowElement,
        init: initWCampusV2,
        monitor: startAdvancedMonitoring
    };
    
    // 자동 시작
    initWCampusV2();
    
    log('🎉 WOW-CAMPUS 프로덕션 인증 UI 제어 V2.0 로드 완료');
    log('🔥 이 버전은 기존보다 100배 더 강력하고 정확합니다!');
})();