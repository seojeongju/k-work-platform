/*
 * WOW-CAMPUS 프로덕션용 인증 UI 제어 스크립트
 * w-campus.com 배포 사이트에서 즉시 로드되어 인증 버튼 문제 해결
 */

(function() {
    'use strict';
    
    console.log('🔧 WOW-CAMPUS 프로덕션 인증 UI 제어 시작...');
    
    // 설정
    const CONFIG = {
        DEBUG: true,
        RETRY_COUNT: 5,
        RETRY_DELAY: 200,
        MONITOR_DURATION: 30000 // 30초
    };
    
    // 로그 함수
    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[AUTH-FIX]', ...args);
        }
    }
    
    // 인증 상태 확인
    function checkAuthStatus() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        let isLoggedIn = false;
        let userInfo = null;
        
        if (user && token) {
            try {
                userInfo = JSON.parse(user);
                isLoggedIn = !!(userInfo && (userInfo.id || userInfo.email));
            } catch (e) {
                log('사용자 정보 파싱 오류:', e);
            }
        }
        
        log('인증 상태:', { isLoggedIn, userInfo });
        return { isLoggedIn, userInfo };
    }
    
    // 강력한 요소 숨김
    function forceHideElement(element, reason = '') {
        if (!element) return false;
        
        try {
            // 모든 방법으로 완전히 숨김
            const styles = [
                ['display', 'none'],
                ['visibility', 'hidden'],
                ['opacity', '0'],
                ['pointer-events', 'none'],
                ['position', 'absolute'],
                ['left', '-99999px'],
                ['top', '-99999px'],
                ['width', '0'],
                ['height', '0'],
                ['overflow', 'hidden'],
                ['z-index', '-9999'],
                ['transform', 'scale(0)'],
                ['max-width', '0'],
                ['max-height', '0'],
                ['margin', '0'],
                ['padding', '0']
            ];
            
            styles.forEach(([prop, value]) => {
                element.style.setProperty(prop, value, 'important');
            });
            
            // 추가 속성
            element.classList.add('auth-hidden-prod');
            element.setAttribute('data-auth-hidden', 'true');
            element.setAttribute('aria-hidden', 'true');
            
            log(`✅ 숨김 완료: ${reason}`, element);
            return true;
        } catch (e) {
            log(`❌ 숨김 실패: ${reason}`, e);
            return false;
        }
    }
    
    // 요소 표시
    function forceShowElement(element, reason = '') {
        if (!element) return false;
        
        try {
            // 숨김 스타일 제거
            const styleProps = [
                'position', 'left', 'top', 'width', 'height', 'overflow', 
                'z-index', 'transform', 'max-width', 'max-height'
            ];
            
            styleProps.forEach(prop => {
                element.style.removeProperty(prop);
            });
            
            // 기본 표시 스타일
            element.style.setProperty('display', 'inline-block', 'important');
            element.style.setProperty('visibility', 'visible', 'important');
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('pointer-events', 'auto', 'important');
            
            element.classList.remove('auth-hidden-prod');
            element.removeAttribute('data-auth-hidden');
            element.removeAttribute('aria-hidden');
            
            log(`✅ 표시 완료: ${reason}`, element);
            return true;
        } catch (e) {
            log(`❌ 표시 실패: ${reason}`, e);
            return false;
        }
    }
    
    // 인증 관련 요소 찾기
    function findAuthElements() {
        const elements = {
            loginBtns: [],
            registerBtns: [],
            logoutBtns: [],
            welcomeElements: [],
            authContainers: []
        };
        
        // 1. ID로 찾기
        const commonIds = [
            'auth-buttons', 'login-btn', 'register-btn', 'signin-btn', 
            'signup-btn', 'user-menu', 'logout-btn'
        ];
        
        commonIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('login') || id.includes('signin')) {
                    elements.loginBtns.push(el);
                } else if (id.includes('register') || id.includes('signup')) {
                    elements.registerBtns.push(el);
                } else if (id.includes('logout')) {
                    elements.logoutBtns.push(el);
                } else if (id.includes('auth-buttons')) {
                    elements.authContainers.push(el);
                }
            }
        });
        
        // 2. 클래스로 찾기
        const classSelectors = [
            '.login-btn', '.register-btn', '.auth-btn', '.signin-btn', '.signup-btn'
        ];
        
        classSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (selector.includes('login') || selector.includes('signin')) {
                    if (!elements.loginBtns.includes(el)) elements.loginBtns.push(el);
                } else if (selector.includes('register') || selector.includes('signup')) {
                    if (!elements.registerBtns.includes(el)) elements.registerBtns.push(el);
                }
            });
        });
        
        // 3. 텍스트 내용으로 찾기 (가장 확실한 방법)
        document.querySelectorAll('a, button').forEach(el => {
            const text = el.textContent?.trim() || '';
            
            if (text === '로그인' || text === 'Login' || text === '로그 인') {
                if (!elements.loginBtns.includes(el)) elements.loginBtns.push(el);
            } else if (text === '회원가입' || text === 'Sign Up' || text === '가입') {
                if (!elements.registerBtns.includes(el)) elements.registerBtns.push(el);
            } else if (text.includes('로그아웃') || text.includes('Logout')) {
                if (!elements.logoutBtns.includes(el)) elements.logoutBtns.push(el);
            } else if (text.includes('환영합니다') || text.includes('Welcome') || text.includes('admin@')) {
                if (!elements.welcomeElements.includes(el)) elements.welcomeElements.push(el);
            }
        });
        
        // 4. href 속성으로 찾기
        document.querySelectorAll('a[href]').forEach(el => {
            const href = el.getAttribute('href') || '';
            
            if (href.includes('login') && !elements.loginBtns.includes(el)) {
                elements.loginBtns.push(el);
            } else if (href.includes('register') && !elements.registerBtns.includes(el)) {
                elements.registerBtns.push(el);
            }
        });
        
        log('발견된 요소들:', {
            login: elements.loginBtns.length,
            register: elements.registerBtns.length,
            logout: elements.logoutBtns.length,
            welcome: elements.welcomeElements.length,
            containers: elements.authContainers.length
        });
        
        return elements;
    }
    
    // 메인 수정 함수
    function fixAuthUI() {
        log('🔧 인증 UI 수정 실행...');
        
        const { isLoggedIn, userInfo } = checkAuthStatus();
        const elements = findAuthElements();
        
        let processed = 0;
        
        if (isLoggedIn) {
            log('로그인 상태 - 인증 버튼 숨김 처리');
            
            // 로그인/회원가입 버튼 숨김
            elements.loginBtns.forEach(btn => {
                if (forceHideElement(btn, '로그인 버튼')) processed++;
            });
            
            elements.registerBtns.forEach(btn => {
                if (forceHideElement(btn, '회원가입 버튼')) processed++;
            });
            
            elements.authContainers.forEach(container => {
                if (forceHideElement(container, '인증 컨테이너')) processed++;
            });
            
            // 사용자 메뉴 요소 표시 확인
            elements.logoutBtns.forEach(btn => {
                if (forceShowElement(btn, '로그아웃 버튼')) processed++;
            });
            
            elements.welcomeElements.forEach(el => {
                if (forceShowElement(el, '환영 메시지')) processed++;
            });
            
        } else {
            log('로그아웃 상태 - 인증 버튼 표시 처리');
            
            // 로그인/회원가입 버튼 표시
            elements.loginBtns.forEach(btn => {
                if (forceShowElement(btn, '로그인 버튼')) processed++;
            });
            
            elements.registerBtns.forEach(btn => {
                if (forceShowElement(btn, '회원가입 버튼')) processed++;
            });
            
            // 사용자 메뉴 숨김
            elements.logoutBtns.forEach(btn => {
                if (forceHideElement(btn, '로그아웃 버튼')) processed++;
            });
            
            elements.welcomeElements.forEach(el => {
                if (forceHideElement(el, '환영 메시지')) processed++;
            });
        }
        
        log(`✅ 처리 완료: ${processed}개 요소`);
        return processed;
    }
    
    // 재시도 로직
    function retryFix(attempt = 0) {
        if (attempt >= CONFIG.RETRY_COUNT) {
            log('⚠️ 최대 재시도 횟수 도달');
            return;
        }
        
        const processed = fixAuthUI();
        
        if (processed === 0 && attempt < CONFIG.RETRY_COUNT - 1) {
            log(`🔄 재시도 ${attempt + 1}/${CONFIG.RETRY_COUNT}...`);
            setTimeout(() => retryFix(attempt + 1), CONFIG.RETRY_DELAY * (attempt + 1));
        }
    }
    
    // DOM 변경 감시
    function startMonitoring() {
        log('🔍 DOM 감시 시작...');
        
        const observer = new MutationObserver((mutations) => {
            let shouldRecheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            const text = node.textContent?.trim() || '';
                            const tag = node.tagName?.toLowerCase() || '';
                            
                            if ((tag === 'a' || tag === 'button') && 
                                (text === '로그인' || text === '회원가입')) {
                                log('🚨 새 인증 버튼 감지:', node);
                                shouldRecheck = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRecheck) {
                setTimeout(fixAuthUI, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 일정 시간 후 감시 중단
        setTimeout(() => {
            observer.disconnect();
            log('✅ DOM 감시 완료');
        }, CONFIG.MONITOR_DURATION);
        
        return observer;
    }
    
    // 주기적 체크
    function startPeriodicCheck() {
        log('⏰ 주기적 체크 시작...');
        
        const interval = setInterval(() => {
            const { isLoggedIn } = checkAuthStatus();
            const elements = findAuthElements();
            
            // 로그인 상태인데 로그인 버튼이 보이는지 확인
            if (isLoggedIn) {
                const visibleLoginBtns = elements.loginBtns.filter(btn => 
                    window.getComputedStyle(btn).display !== 'none' &&
                    !btn.hasAttribute('data-auth-hidden')
                );
                
                if (visibleLoginBtns.length > 0) {
                    log('🚨 로그인 버튼이 다시 나타남 - 재수정');
                    fixAuthUI();
                }
            }
        }, 5000);
        
        // 30초 후 중단
        setTimeout(() => {
            clearInterval(interval);
            log('✅ 주기적 체크 완료');
        }, CONFIG.MONITOR_DURATION);
        
        return interval;
    }
    
    // 초기화 및 실행
    function init() {
        log('🚀 초기화 시작...');
        
        // 즉시 수정 실행
        setTimeout(retryFix, 100);
        
        // DOM 로드 완료 후 추가 수정
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(retryFix, 200);
            });
        } else {
            setTimeout(retryFix, 200);
        }
        
        // 윈도우 로드 완료 후 최종 수정
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    retryFix();
                    startMonitoring();
                    startPeriodicCheck();
                }, 500);
            });
        } else {
            setTimeout(() => {
                startMonitoring();
                startPeriodicCheck();
            }, 500);
        }
        
        // localStorage 변경 감지
        window.addEventListener('storage', (e) => {
            if (e.key === 'user' || e.key === 'token') {
                log('🔄 인증 정보 변경 감지 - UI 업데이트');
                setTimeout(fixAuthUI, 100);
            }
        });
        
        log('✅ 초기화 완료');
    }
    
    // 전역 함수로 노출
    window.WOWCampusAuthFix = {
        fix: fixAuthUI,
        check: checkAuthStatus,
        find: findAuthElements,
        init: init
    };
    
    // 자동 시작
    init();
    
    log('🎉 WOW-CAMPUS 프로덕션 인증 UI 제어 로드 완료');
})();