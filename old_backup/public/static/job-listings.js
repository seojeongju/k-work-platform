// 구인정보 목록 페이지 JavaScript
let currentPage = 1;
let totalJobs = 0;
let jobsPerPage = 10;
let allJobs = [];
let filteredJobs = [];
let isLoading = false;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('구인정보 페이지 로드 시작');
    
    // 모바일 메뉴 토글
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // 필터 패널 토글
    const filterToggle = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    
    if (filterToggle && filterPanel) {
        filterToggle.addEventListener('click', function() {
            filterPanel.classList.toggle('open');
            const icon = filterToggle.querySelector('i');
            if (filterPanel.classList.contains('open')) {
                icon.className = 'fas fa-filter-circle-xmark mr-2';
            } else {
                icon.className = 'fas fa-filter mr-2';
            }
        });
    }

    // 검색 입력 엔터키 처리
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchJobs();
            }
        });
    }

    // 초기 데이터 로드
    loadInitialData();
});

// 초기 데이터 로드
async function loadInitialData() {
    try {
        console.log('구인공고 데이터 로드 시작');
        
        // 먼저 테스트 데이터로 시작
        loadTestJobs();
        
        // API에서 실제 데이터 시도
        try {
            const response = await fetch('/api/jobs/public');
            if (response.ok) {
                const apiJobs = await response.json();
                if (apiJobs && apiJobs.length > 0) {
                    allJobs = apiJobs;
                    console.log('API에서 구인공고 데이터 로드 성공:', apiJobs.length + '개');
                }
            }
        } catch (apiError) {
            console.log('API 호출 실패, 테스트 데이터 사용:', apiError.message);
        }
        
        filteredJobs = [...allJobs];
        updateStats();
        displayJobs();
        
    } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
        showError('구인공고를 불러오는 중 오류가 발생했습니다.');
    }
}

// 테스트 구인공고 데이터
function loadTestJobs() {
    allJobs = [
        {
            id: 1,
            title: "웹 개발자 (외국인 환영)",
            company: "테크이노베이션",
            location: "서울특별시 강남구",
            salary: "연봉 4,000~5,000만원",
            visaType: "E-7",
            jobCategory: "IT001",
            experience: "경력 2-5년",
            employmentType: "정규직",
            description: "React, Node.js 개발 경험이 있는 외국인 개발자를 모집합니다. 한국어 중급 이상 가능자 우대합니다.",
            requirements: ["React/Vue.js 경험", "Node.js 백엔드 개발", "한국어 중급 이상"],
            benefits: ["4대보험", "연차 15일", "교육비 지원", "야근수당"],
            postedDate: "2024-01-15",
            deadline: "2024-02-15",
            contactEmail: "hr@techinnovation.co.kr",
            contactPhone: "02-1234-5678",
            companySize: "중소기업 (50-100명)",
            isActive: true
        },
        {
            id: 2,
            title: "전자제품 조립 기술자",
            company: "글로벌일렉트로닉스",
            location: "경기도 수원시",
            salary: "월급 250~300만원",
            visaType: "E-9",
            jobCategory: "MFG002",
            experience: "신입~경력 2년",
            employmentType: "정규직",
            description: "스마트폰, 태블릿 조립 및 품질검사 업무를 담당하실 분을 모집합니다.",
            requirements: ["기술 학교 졸업 이상", "정밀 작업 가능자", "한국어 기초 이상"],
            benefits: ["기숙사 제공", "식사 제공", "교통비 지원", "성과급"],
            postedDate: "2024-01-14",
            deadline: "2024-02-28",
            contactEmail: "recruit@globalelec.co.kr",
            contactPhone: "031-987-6543",
            companySize: "대기업 (500명 이상)",
            isActive: true
        },
        {
            id: 3,
            title: "호텔 서비스 직원",
            company: "서울그랜드호텔",
            location: "서울특별시 중구",
            salary: "월급 280~350만원",
            visaType: "H-2",
            jobCategory: "SVC001",
            experience: "신입 가능",
            employmentType: "정규직",
            description: "5성급 호텔에서 프론트 데스크 및 고객 서비스 업무를 담당하실 분을 모집합니다.",
            requirements: ["호텔경영학과 졸업 우대", "영어/중국어 가능자", "서비스 마인드"],
            benefits: ["호텔 할인", "교육 프로그램", "승진 기회", "해외연수"],
            postedDate: "2024-01-13",
            deadline: "2024-03-01",
            contactEmail: "jobs@seoulgrandhotel.com",
            contactPhone: "02-2345-6789",
            companySize: "대기업 (300명 이상)",
            isActive: true
        },
        {
            id: 4,
            title: "건설현장 기술자",
            company: "한국건설",
            location: "부산광역시 해운대구",
            salary: "월급 320~400만원",
            visaType: "E-9",
            jobCategory: "CON001",
            experience: "경력 1년 이상",
            employmentType: "계약직",
            description: "아파트 건설현장에서 철근, 콘크리트 작업을 담당하실 기술자를 모집합니다.",
            requirements: ["건설 관련 자격증", "현장 경험", "안전 수칙 준수"],
            benefits: ["위험수당", "야근수당", "기숙사 제공", "4대보험"],
            postedDate: "2024-01-12",
            deadline: "2024-02-20",
            contactEmail: "hr@koreacons.co.kr",
            contactPhone: "051-456-7890",
            companySize: "대기업 (1000명 이상)",
            isActive: true
        },
        {
            id: 5,
            title: "농장 관리자",
            company: "청정농장",
            location: "전라남도 나주시",
            salary: "월급 250만원",
            visaType: "H-2",
            jobCategory: "AGR001",
            experience: "경력 무관",
            employmentType: "정규직",
            description: "유기농 채소 농장에서 작물 재배 및 관리 업무를 담당하실 분을 모집합니다.",
            requirements: ["농업 관련 경험 우대", "체력 좋으신 분", "새벽 근무 가능"],
            benefits: ["기숙사 제공", "농산물 지급", "건강보험", "연차"],
            postedDate: "2024-01-11",
            deadline: "2024-02-10",
            contactEmail: "farm@cleanfarm.co.kr",
            contactPhone: "061-333-4444",
            companySize: "소기업 (10-30명)",
            isActive: true
        },
        {
            id: 6,
            title: "식품 가공 기술자",
            company: "한국식품",
            location: "충청북도 청주시",
            salary: "월급 270~320만원",
            visaType: "E-9",
            jobCategory: "MFG001",
            experience: "신입~경력 3년",
            employmentType: "정규직",
            description: "김치, 반찬류 제조 공정 관리 및 품질 검사 업무를 담당하실 분을 모집합니다.",
            requirements: ["식품 관련 자격증 우대", "위생 관리 철저", "교대근무 가능"],
            benefits: ["식사 제공", "교통비", "명절 보너스", "4대보험"],
            postedDate: "2024-01-10",
            deadline: "2024-02-25",
            contactEmail: "recruit@koreafood.co.kr",
            contactPhone: "043-123-4567",
            companySize: "중견기업 (100-300명)",
            isActive: true
        },
        {
            id: 7,
            title: "편의점 매니저",
            company: "24시편의점",
            location: "대구광역시 달서구",
            salary: "월급 280만원",
            visaType: "F-4",
            jobCategory: "SVC002",
            experience: "경력 1년 이상",
            employmentType: "정규직",
            description: "편의점 운영 관리 및 직원 교육을 담당하실 매니저를 모집합니다.",
            requirements: ["매장 관리 경험", "한국어 고급", "컴퓨터 활용 가능"],
            benefits: ["인센티브", "교육비 지원", "승진 기회", "4대보험"],
            postedDate: "2024-01-09",
            deadline: "2024-02-08",
            contactEmail: "manager@24convenience.co.kr",
            contactPhone: "053-789-0123",
            companySize: "중소기업 (30-50명)",
            isActive: true
        },
        {
            id: 8,
            title: "어선 선원",
            company: "부산수산",
            location: "부산광역시 영도구",
            salary: "월급 350~450만원",
            visaType: "E-9",
            jobCategory: "FSH001",
            experience: "경력 무관",
            employmentType: "계약직",
            description: "원양어선에서 어업 활동을 담당하실 선원을 모집합니다. 숙식 제공됩니다.",
            requirements: ["수영 가능자", "체력 우수자", "장기간 승선 가능"],
            benefits: ["숙식 제공", "위험수당", "어획 보너스", "귀향비 지원"],
            postedDate: "2024-01-08",
            deadline: "2024-03-31",
            contactEmail: "crew@busanfish.co.kr",
            contactPhone: "051-555-7777",
            companySize: "중소기업 (20-50명)",
            isActive: true
        }
    ];
    
    console.log('테스트 구인공고 데이터 로드 완료:', allJobs.length + '개');
}

// 통계 정보 업데이트
function updateStats() {
    const totalJobsEl = document.getElementById('total-jobs');
    const activeJobsEl = document.getElementById('active-jobs');
    const todayJobsEl = document.getElementById('today-jobs');
    
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = allJobs.filter(job => job.postedDate === today).length;
    const activeJobs = allJobs.filter(job => job.isActive).length;
    
    if (totalJobsEl) totalJobsEl.textContent = allJobs.length;
    if (activeJobsEl) activeJobsEl.textContent = activeJobs;
    if (todayJobsEl) todayJobsEl.textContent = todayJobs;
}

// 구인공고 검색
function searchJobs() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredJobs = [...allJobs];
    } else {
        filteredJobs = allJobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.location.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    displayJobs();
    console.log('검색 결과:', filteredJobs.length + '개');
}

// 필터 적용
function applyFilters() {
    const visaFilter = document.getElementById('visa-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const salaryFilter = document.getElementById('salary-filter').value;
    const locationFilter = document.getElementById('location-filter').value;
    
    filteredJobs = allJobs.filter(job => {
        let matches = true;
        
        if (visaFilter && job.visaType !== visaFilter) matches = false;
        if (categoryFilter && job.jobCategory !== categoryFilter) matches = false;
        if (locationFilter && !job.location.includes(locationFilter)) matches = false;
        
        if (salaryFilter) {
            const [minSalary, maxSalary] = salaryFilter.split('-').map(Number);
            const jobSalaryNum = extractSalaryNumber(job.salary);
            if (jobSalaryNum < minSalary || jobSalaryNum > maxSalary) matches = false;
        }
        
        return matches;
    });
    
    currentPage = 1;
    displayJobs();
    console.log('필터 적용 결과:', filteredJobs.length + '개');
}

// 급여에서 숫자 추출
function extractSalaryNumber(salaryText) {
    const match = salaryText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
    return match ? parseInt(match[0].replace(/,/g, '')) * 10000 : 0; // 만원 단위를 원 단위로 변환
}

// 필터 초기화
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('visa-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('salary-filter').value = '';
    document.getElementById('location-filter').value = '';
    
    filteredJobs = [...allJobs];
    currentPage = 1;
    displayJobs();
    console.log('필터 초기화 완료');
}

// 정렬
function sortJobs() {
    const sortOption = document.getElementById('sort-options').value;
    
    switch (sortOption) {
        case 'newest':
            filteredJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
            break;
        case 'salary-high':
            filteredJobs.sort((a, b) => extractSalaryNumber(b.salary) - extractSalaryNumber(a.salary));
            break;
        case 'salary-low':
            filteredJobs.sort((a, b) => extractSalaryNumber(a.salary) - extractSalaryNumber(b.salary));
            break;
        case 'company':
            filteredJobs.sort((a, b) => a.company.localeCompare(b.company));
            break;
    }
    
    displayJobs();
    console.log('정렬 완료:', sortOption);
}

// 구인공고 목록 표시
function displayJobs() {
    const container = document.getElementById('jobs-container');
    const loadingEl = document.getElementById('loading');
    const resultsCount = document.getElementById('results-count');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (resultsCount) {
        resultsCount.textContent = filteredJobs.length;
    }
    
    if (!container) return;
    
    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-xl text-gray-600 mb-2">검색 결과가 없습니다</h3>
                <p class="text-gray-500">다른 검색어나 필터 조건을 시도해보세요.</p>
            </div>
        `;
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        return;
    }
    
    const startIndex = 0;
    const endIndex = Math.min(currentPage * jobsPerPage, filteredJobs.length);
    const jobsToShow = filteredJobs.slice(startIndex, endIndex);
    
    container.innerHTML = jobsToShow.map(job => createJobCard(job)).join('');
    
    // 더보기 버튼 표시/숨김
    if (loadMoreContainer) {
        if (endIndex < filteredJobs.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
}

// 구인공고 카드 생성
function createJobCard(job) {
    const visaTypeNames = {
        'E-7': 'E-7 특정기능',
        'E-9': 'E-9 비전문취업',
        'H-2': 'H-2 방문취업',
        'F-4': 'F-4 재외동포',
        'D-4': 'D-4 일반연수',
        'D-2': 'D-2 유학',
        'F-2': 'F-2 거주',
        'F-5': 'F-5 영주'
    };
    
    const categoryNames = {
        'IT001': 'IT 소프트웨어',
        'MFG001': '제조업',
        'MFG002': '전자제품 조립',
        'SVC001': '서비스업',
        'SVC002': '매장 판매직',
        'CON001': '건설업',
        'AGR001': '농업',
        'FSH001': '어업'
    };
    
    const postedDaysAgo = Math.floor((new Date() - new Date(job.postedDate)) / (1000 * 60 * 60 * 24));
    const daysAgoText = postedDaysAgo === 0 ? '오늘' : `${postedDaysAgo}일 전`;
    
    return `
        <div class="job-card bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 animate-fade-in" onclick="showJobDetail(${job.id})">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-900 mb-2 hover:text-wow-blue transition-colors cursor-pointer">
                        ${job.title}
                    </h3>
                    <div class="flex items-center text-gray-600 mb-2">
                        <i class="fas fa-building mr-2"></i>
                        <span class="font-medium">${job.company}</span>
                    </div>
                    <div class="flex items-center text-gray-600 mb-2">
                        <i class="fas fa-map-marker-alt mr-2"></i>
                        <span>${job.location}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${job.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                        ${job.isActive ? '채용중' : '마감'}
                    </span>
                </div>
            </div>
            
            <div class="mb-4">
                <div class="flex flex-wrap gap-2 mb-3">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                        <i class="fas fa-passport mr-1"></i>${visaTypeNames[job.visaType] || job.visaType}
                    </span>
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                        <i class="fas fa-briefcase mr-1"></i>${categoryNames[job.jobCategory] || job.jobCategory}
                    </span>
                    <span class="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs font-medium">
                        <i class="fas fa-clock mr-1"></i>${job.employmentType}
                    </span>
                </div>
                
                <div class="text-lg font-bold text-wow-blue mb-2">
                    <i class="fas fa-won mr-1"></i>${job.salary}
                </div>
                
                <p class="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    ${job.description}
                </p>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                <div class="text-sm text-gray-500">
                    <i class="fas fa-calendar mr-1"></i>
                    ${daysAgoText} 등록
                </div>
                <button onclick="showJobDetail(${job.id})" class="text-wow-blue hover:text-blue-700 font-medium text-sm transition-colors">
                    자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        </div>
    `;
}

// 더 많은 구인공고 로드
function loadMoreJobs() {
    if (isLoading) return;
    
    isLoading = true;
    currentPage++;
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...';
        loadMoreBtn.disabled = true;
    }
    
    setTimeout(() => {
        displayJobs();
        isLoading = false;
        
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>더 많은 구인공고 보기';
            loadMoreBtn.disabled = false;
        }
    }, 1000);
}

// 구인공고 상세보기 (로그인 검증 포함) - v2.0
function showJobDetail(jobId) {
    console.log('=== 구인공고 상세보기 시작 ===', jobId);
    console.log('AuthUtils 존재 여부:', typeof AuthUtils !== 'undefined');
    
    // AuthUtils가 로드되지 않았을 경우 안전 장치
    if (typeof AuthUtils === 'undefined') {
        console.error('AuthUtils가 로드되지 않았습니다!');
        alert('로그인이 필요한 서비스입니다.');
        return false;
    }
    
    try {
        // 로그인 상태 확인
        const permission = AuthUtils.checkDetailViewPermission('job');
        console.log('권한 검사 결과:', permission);
        
        if (permission.hasPermission) {
            // 로그인됨 - 상세 정보 표시
            console.log('✅ 인증 성공! 상세 정보 표시:', permission.user);
            openJobModal(jobId);
            return true;
        } else {
            // 미로그인 - 로그인 모달이 이미 표시됨
            console.log('❌ 로그인 필요! 상세보기 차단');
            console.log('openJobModal 호출하지 않음');
            return false;
        }
    } catch (error) {
        console.error('인증 처리 중 오류:', error);
        alert('로그인이 필요한 서비스입니다.');
        return false;
    }
}

// 구인공고 상세 모달 열기 (실제 모달 표시) - v2.0
function openJobModal(jobId) {
    console.log('=== openJobModal 호출됨 ===', jobId);
    console.trace('openJobModal 호출 스택 트레이스:');
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    
    const modal = document.getElementById('job-modal');
    const modalTitle = document.getElementById('modal-job-title');
    const modalContent = document.getElementById('modal-job-content');
    
    if (modalTitle) modalTitle.textContent = job.title;
    
    if (modalContent) {
        modalContent.innerHTML = createJobDetailContent(job);
    }
    
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// 구인공고 상세 내용 생성
function createJobDetailContent(job) {
    const visaTypeNames = {
        'E-7': 'E-7 특정기능',
        'E-9': 'E-9 비전문취업',
        'H-2': 'H-2 방문취업',
        'F-4': 'F-4 재외동포',
        'D-4': 'D-4 일반연수',
        'D-2': 'D-2 유학',
        'F-2': 'F-2 거주',
        'F-5': 'F-5 영주'
    };
    
    const categoryNames = {
        'IT001': 'IT 소프트웨어',
        'MFG001': '제조업',
        'MFG002': '전자제품 조립',
        'SVC001': '서비스업',
        'SVC002': '매장 판매직',
        'CON001': '건설업',
        'AGR001': '농업',
        'FSH001': '어업'
    };
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 기본 정보 -->
            <div class="lg:col-span-2">
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">회사 정보</h3>
                    <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div class="flex items-center">
                            <i class="fas fa-building w-5 text-gray-600 mr-3"></i>
                            <div>
                                <span class="font-medium">${job.company}</span>
                                <span class="text-sm text-gray-500 ml-2">(${job.companySize})</span>
                            </div>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt w-5 text-gray-600 mr-3"></i>
                            <span>${job.location}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-envelope w-5 text-gray-600 mr-3"></i>
                            <span>${job.contactEmail}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-phone w-5 text-gray-600 mr-3"></i>
                            <span>${job.contactPhone}</span>
                        </div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">업무 내용</h3>
                    <div class="prose max-w-none">
                        <p class="text-gray-700 leading-relaxed">${job.description}</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">지원 자격</h3>
                    <ul class="space-y-2">
                        ${job.requirements.map(req => `
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
                                <span>${req}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">복리후생</h3>
                    <div class="grid grid-cols-2 gap-2">
                        ${job.benefits.map(benefit => `
                            <div class="flex items-center p-2 bg-blue-50 rounded">
                                <i class="fas fa-gift text-blue-500 mr-2"></i>
                                <span class="text-sm">${benefit}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 사이드바 정보 -->
            <div class="space-y-6">
                <div class="bg-wow-blue text-white rounded-lg p-6">
                    <h3 class="text-lg font-bold mb-4">모집 정보</h3>
                    <div class="space-y-4">
                        <div>
                            <div class="text-blue-200 text-sm">급여</div>
                            <div class="text-xl font-bold">${job.salary}</div>
                        </div>
                        <div>
                            <div class="text-blue-200 text-sm">필요 비자</div>
                            <div class="font-medium">${visaTypeNames[job.visaType] || job.visaType}</div>
                        </div>
                        <div>
                            <div class="text-blue-200 text-sm">직종</div>
                            <div class="font-medium">${categoryNames[job.jobCategory] || job.jobCategory}</div>
                        </div>
                        <div>
                            <div class="text-blue-200 text-sm">경력</div>
                            <div class="font-medium">${job.experience}</div>
                        </div>
                        <div>
                            <div class="text-blue-200 text-sm">고용형태</div>
                            <div class="font-medium">${job.employmentType}</div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-bold text-gray-900 mb-3">모집 일정</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">등록일:</span>
                            <span>${new Date(job.postedDate).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">마감일:</span>
                            <span class="font-medium">${new Date(job.deadline).toLocaleDateString('ko-KR')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button class="w-full bg-wow-blue text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        <i class="fas fa-paper-plane mr-2"></i>지원하기
                    </button>
                    <button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        <i class="fas fa-heart mr-2"></i>관심공고 등록
                    </button>
                    <button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        <i class="fas fa-share mr-2"></i>공유하기
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 구인공고 상세 모달 닫기
function closeJobModal() {
    const modal = document.getElementById('job-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// 에러 메시지 표시
function showError(message) {
    const container = document.getElementById('jobs-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl text-gray-600 mb-2">오류가 발생했습니다</h3>
                <p class="text-gray-500">${message}</p>
                <button onclick="loadInitialData()" class="mt-4 px-6 py-2 bg-wow-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                    다시 시도
                </button>
            </div>
        `;
    }
}

// 모달 외부 클릭시 닫기
document.addEventListener('click', function(e) {
    const modal = document.getElementById('job-modal');
    if (e.target === modal) {
        closeJobModal();
    }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeJobModal();
    }
});