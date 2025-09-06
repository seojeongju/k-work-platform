// 유학 프로그램 페이지 JavaScript

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('유학 프로그램 페이지 로드 시작');
    
    // 모바일 메뉴 토글
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // 프로그램 탭 버튼들
    const languageBtn = document.getElementById('study-language-btn');
    const undergraduateBtn = document.getElementById('study-undergraduate-btn');
    const graduateBtn = document.getElementById('study-graduate-btn');

    // 프로그램 섹션들
    const languageSection = document.getElementById('study-language-section');
    const undergraduateSection = document.getElementById('study-undergraduate-section');
    const graduateSection = document.getElementById('study-graduate-section');

    // 탭 버튼 이벤트 리스너 추가
    if (languageBtn) {
        languageBtn.addEventListener('click', function() {
            showLanguageProgram();
        });
    }

    if (undergraduateBtn) {
        undergraduateBtn.addEventListener('click', function() {
            showUndergraduateProgram();
        });
    }

    if (graduateBtn) {
        graduateBtn.addEventListener('click', function() {
            showGraduateProgram();
        });
    }

    // URL 파라미터 확인하여 초기 탭 설정
    const urlParams = new URLSearchParams(window.location.search);
    const program = urlParams.get('program');
    
    switch(program) {
        case 'undergraduate':
            showUndergraduateProgram();
            break;
        case 'graduate':
            showGraduateProgram();
            break;
        default:
            showLanguageProgram();
            break;
    }

    // 스크롤 애니메이션 설정
    setupScrollAnimations();
    
    // 부드러운 스크롤링 설정
    setupSmoothScrolling();
});

// 어학연수 프로그램 표시
function showLanguageProgram() {
    console.log('어학연수 프로그램 표시');
    
    // 모든 버튼 스타일 초기화
    resetButtonStyles();
    
    // 어학연수 버튼 활성화
    const languageBtn = document.getElementById('study-language-btn');
    if (languageBtn) {
        languageBtn.classList.remove('bg-gray-300', 'text-gray-700');
        languageBtn.classList.add('bg-primary', 'text-white');
    }
    
    // 모든 섹션 숨기기
    hideAllSections();
    
    // 어학연수 섹션 표시
    const languageSection = document.getElementById('study-language-section');
    if (languageSection) {
        languageSection.classList.remove('hidden');
        languageSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    // URL 업데이트
    updateURL('language');
}

// 학부 프로그램 표시
function showUndergraduateProgram() {
    console.log('학부 프로그램 표시');
    
    // 모든 버튼 스타일 초기화
    resetButtonStyles();
    
    // 학부 버튼 활성화
    const undergraduateBtn = document.getElementById('study-undergraduate-btn');
    if (undergraduateBtn) {
        undergraduateBtn.classList.remove('bg-gray-300', 'text-gray-700');
        undergraduateBtn.classList.add('bg-primary', 'text-white');
    }
    
    // 모든 섹션 숨기기
    hideAllSections();
    
    // 학부 섹션 표시
    const undergraduateSection = document.getElementById('study-undergraduate-section');
    if (undergraduateSection) {
        undergraduateSection.classList.remove('hidden');
        undergraduateSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    // URL 업데이트
    updateURL('undergraduate');
}

// 대학원 프로그램 표시
function showGraduateProgram() {
    console.log('대학원 프로그램 표시');
    
    // 모든 버튼 스타일 초기화
    resetButtonStyles();
    
    // 대학원 버튼 활성화
    const graduateBtn = document.getElementById('study-graduate-btn');
    if (graduateBtn) {
        graduateBtn.classList.remove('bg-gray-300', 'text-gray-700');
        graduateBtn.classList.add('bg-primary', 'text-white');
    }
    
    // 모든 섹션 숨기기
    hideAllSections();
    
    // 대학원 섹션 표시
    const graduateSection = document.getElementById('study-graduate-section');
    if (graduateSection) {
        graduateSection.classList.remove('hidden');
        graduateSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    // URL 업데이트
    updateURL('graduate');
}

// 모든 버튼 스타일 초기화
function resetButtonStyles() {
    const buttons = document.querySelectorAll('.study-sub-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-gray-300', 'text-gray-700');
    });
}

// 모든 섹션 숨기기
function hideAllSections() {
    const sections = [
        'study-language-section',
        'study-undergraduate-section', 
        'study-graduate-section'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('hidden');
        }
    });
}

// URL 업데이트
function updateURL(program) {
    const url = new URL(window.location);
    url.searchParams.set('program', program);
    window.history.pushState({}, '', url);
}

// 스크롤 애니메이션 설정
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);

    // 애니메이션할 요소들 선택
    const animateElements = document.querySelectorAll(
        '.program-card, .timeline-item, .bg-gradient-to-r'
    );

    animateElements.forEach(element => {
        observer.observe(element);
    });
}

// 부드러운 스크롤링 설정
function setupSmoothScrolling() {
    // 내부 링크들에 부드러운 스크롤 적용
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// 전역 함수들 (기존 app.js와의 호환성을 위해)
window.showLanguageStudyView = showLanguageProgram;
window.showUndergraduateView = showUndergraduateProgram;
window.showGraduateView = showGraduateProgram;

// 프로그램별 상세 정보 모달 (추후 확장 가능)
function showProgramDetail(programType, detailType) {
    console.log(`프로그램 상세 정보 표시: ${programType} - ${detailType}`);
    // 추후 모달이나 상세 페이지 구현 가능
}

// 상담 신청 (추후 구현)
function requestConsultation() {
    console.log('상담 신청 요청');
    alert('상담 신청 기능은 곧 제공될 예정입니다.\n전화: 02-1234-5678로 연락 주세요.');
}

// 안내서 다운로드 (추후 구현)
function downloadGuide() {
    console.log('안내서 다운로드 요청');
    alert('안내서 다운로드 기능은 곧 제공될 예정입니다.\n이메일: study@wowcampus.com으로 요청해 주세요.');
}

// 대학 정보 상세보기 (추후 구현)
function showUniversityDetail(universityName) {
    console.log(`대학 상세 정보: ${universityName}`);
    // 추후 대학별 상세 정보 모달 구현
}

// 입학 절차 안내 (추후 구현)
function showAdmissionGuide(programType) {
    console.log(`입학 절차 안내: ${programType}`);
    // 추후 입학 절차 상세 가이드 구현
}

// 장학금 정보 (추후 구현)
function showScholarshipInfo(programType) {
    console.log(`장학금 정보: ${programType}`);
    // 추후 장학금 정보 상세 모달 구현
}

// 연구 분야 상세 (추후 구현)
function showResearchDetail(fieldName) {
    console.log(`연구 분야 상세: ${fieldName}`);
    // 추후 연구 분야별 상세 정보 구현
}

// 비용 계산기 (추후 구현)
function openCostCalculator(programType) {
    console.log(`비용 계산기: ${programType}`);
    // 추후 유학 비용 계산기 구현
}

// 온라인 지원 (추후 구현)
function startOnlineApplication(programType) {
    console.log(`온라인 지원: ${programType}`);
    alert('온라인 지원 시스템은 곧 오픈될 예정입니다.\n현재는 이메일이나 전화로 상담 받으실 수 있습니다.');
}

// 가상 캠퍼스 투어 (추후 구현)
function startVirtualTour(universityName) {
    console.log(`가상 캠퍼스 투어: ${universityName}`);
    // 추후 360도 캠퍼스 투어 구현
}

console.log('유학 프로그램 JavaScript 로드 완료');