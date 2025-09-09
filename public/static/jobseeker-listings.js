// 구직정보 목록 페이지 JavaScript
let currentPage = 1;
let totalJobSeekers = 0;
let jobSeekersPerPage = 12;
let allJobSeekers = [];
let filteredJobSeekers = [];
let isLoading = false;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('구직정보 페이지 로드 시작');
    
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
                searchJobSeekers();
            }
        });
    }

    // 초기 데이터 로드
    loadInitialData();
});

// 초기 데이터 로드
async function loadInitialData() {
    try {
        console.log('구직자 데이터 로드 시작');
        
        // 먼저 테스트 데이터로 시작
        loadTestJobSeekers();
        
        // API에서 실제 데이터 시도
        try {
            const response = await fetch('/api/jobseekers/public');
            if (response.ok) {
                const apiJobSeekers = await response.json();
                if (apiJobSeekers && apiJobSeekers.length > 0) {
                    allJobSeekers = apiJobSeekers;
                    console.log('API에서 구직자 데이터 로드 성공:', apiJobSeekers.length + '명');
                }
            }
        } catch (apiError) {
            console.log('API 호출 실패, 테스트 데이터 사용:', apiError.message);
        }
        
        filteredJobSeekers = [...allJobSeekers];
        updateStats();
        displayJobSeekers();
        
    } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
        showError('구직자 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 테스트 구직자 데이터
function loadTestJobSeekers() {
    allJobSeekers = [
        {
            id: 1,
            name: "응우엔 반 아",
            nameKorean: "김반아",
            email: "nguyenvan@example.com",
            nationality: "베트남",
            age: 28,
            gender: "남성",
            currentVisa: "D-2",
            desiredVisa: "E-7",
            koreanLevel: "intermediate",
            englishLevel: "advanced",
            desiredJobCategory: "IT001",
            desiredPosition: "웹 개발자",
            experience: "3년",
            education: "학사",
            university: "서울대학교 컴퓨터공학과",
            skills: ["JavaScript", "React", "Node.js", "Python", "MySQL"],
            certifications: ["정보처리기사", "TOEIC 850"],
            desiredSalary: "3500만원",
            desiredLocation: "서울특별시",
            availableStartDate: "2024-03-01",
            profileImage: "https://via.placeholder.com/150/4F46E5/FFFFFF?text=VA",
            introduction: "안녕하세요! 베트남에서 온 웹 개발자 응우엔 반 아입니다. 한국에서 컴퓨터공학을 공부하며 다양한 프로젝트 경험을 쌓았습니다. 풀스택 개발이 가능하며, 한국 IT 기업에서 성장하고 싶습니다.",
            workExperience: [
                {
                    company: "스타트업 A",
                    position: "프론트엔드 개발자",
                    period: "2022-2023",
                    description: "React를 이용한 웹 애플리케이션 개발"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-15",
            lastLoginDate: "2024-01-20"
        },
        {
            id: 2,
            name: "왕 리",
            nameKorean: "왕리",
            email: "wangli@example.com",
            nationality: "중국",
            age: 25,
            gender: "여성",
            currentVisa: "D-4",
            desiredVisa: "E-9",
            koreanLevel: "advanced",
            englishLevel: "intermediate",
            desiredJobCategory: "MFG002",
            desiredPosition: "품질관리원",
            experience: "2년",
            education: "전문학사",
            university: "인천기능대학 전자과",
            skills: ["품질검사", "전자회로", "PCB 설계", "품질관리"],
            certifications: ["전자기기기능사", "품질관리기사"],
            desiredSalary: "2800만원",
            desiredLocation: "경기도",
            availableStartDate: "2024-02-15",
            profileImage: "https://via.placeholder.com/150/EC4899/FFFFFF?text=WL",
            introduction: "중국에서 온 전자공학 전공자 왕리입니다. 한국에서 전문 기술을 배우며 품질관리 분야의 전문성을 키웠습니다. 꼼꼼하고 책임감 있는 성격으로 품질 향상에 기여하고 싶습니다.",
            workExperience: [
                {
                    company: "전자부품 회사",
                    position: "품질검사원",
                    period: "2023-현재",
                    description: "스마트폰 부품 품질검사 및 불량품 분석"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-14",
            lastLoginDate: "2024-01-19"
        },
        {
            id: 3,
            name: "호세 마르티네스",
            nameKorean: "조세민",
            email: "jose@example.com",
            nationality: "필리핀",
            age: 32,
            gender: "남성",
            currentVisa: "H-2",
            desiredVisa: "F-4",
            koreanLevel: "intermediate",
            englishLevel: "native",
            desiredJobCategory: "SVC001",
            desiredPosition: "호텔 매니저",
            experience: "8년",
            education: "학사",
            university: "필리핀대학교 호텔경영학과",
            skills: ["호텔경영", "고객서비스", "영어통역", "팀관리"],
            certifications: ["호텔관리사", "TOEFL 100"],
            desiredSalary: "4000만원",
            desiredLocation: "서울특별시",
            availableStartDate: "2024-02-01",
            profileImage: "https://via.placeholder.com/150/10B981/FFFFFF?text=JM",
            introduction: "필리핀에서 8년간 호텔 업무를 경험한 호세입니다. 다국적 고객 서비스에 능숙하며, 한국 호텔 업계에서 저의 경험을 활용하여 성장하고 싶습니다.",
            workExperience: [
                {
                    company: "마닐라 그랜드 호텔",
                    position: "프론트 매니저",
                    period: "2020-2023",
                    description: "프론트 데스크 운영 관리 및 고객 서비스"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-13",
            lastLoginDate: "2024-01-18"
        },
        {
            id: 4,
            name: "수파찬 차이야폰",
            nameKorean: "차수찬",
            email: "supachan@example.com",
            nationality: "태국",
            age: 29,
            gender: "남성",
            currentVisa: "E-9",
            desiredVisa: "E-9",
            koreanLevel: "beginner",
            englishLevel: "intermediate",
            desiredJobCategory: "AGR001",
            desiredPosition: "농장관리자",
            experience: "5년",
            education: "고등학교",
            university: "태국 농업고등학교",
            skills: ["농작물재배", "농기계운전", "축산관리", "유기농"],
            certifications: ["농기계운전면허", "유기농인증"],
            desiredSalary: "2500만원",
            desiredLocation: "전라남도",
            availableStartDate: "2024-01-25",
            profileImage: "https://via.placeholder.com/150/F59E0B/FFFFFF?text=SC",
            introduction: "태국에서 5년간 농업에 종사한 수파찬입니다. 다양한 작물 재배 경험이 있으며, 한국의 첨단 농업 기술을 배우며 성장하고 싶습니다.",
            workExperience: [
                {
                    company: "태국 농장",
                    position: "농장 관리자",
                    period: "2019-2023",
                    description: "쌀 및 과일 재배 관리"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-12",
            lastLoginDate: "2024-01-17"
        },
        {
            id: 5,
            name: "사라 안데르손",
            nameKorean: "안사라",
            email: "sarah@example.com",
            nationality: "미국",
            age: 27,
            gender: "여성",
            currentVisa: "F-2",
            desiredVisa: "F-5",
            koreanLevel: "advanced",
            englishLevel: "native",
            desiredJobCategory: "IT001",
            desiredPosition: "영어강사 겸 개발자",
            experience: "4년",
            education: "석사",
            university: "연세대학교 컴퓨터과학과",
            skills: ["Python", "Django", "영어교육", "번역", "UI/UX"],
            certifications: ["TESOL", "AWS 자격증"],
            desiredSalary: "4500만원",
            desiredLocation: "서울특별시",
            availableStartDate: "2024-03-01",
            profileImage: "https://via.placeholder.com/150/8B5CF6/FFFFFF?text=SA",
            introduction: "미국에서 온 개발자 겸 영어강사 사라입니다. 한국에서 석사 과정을 마쳤으며, 기술과 교육을 결합한 혁신적인 프로젝트에 참여하고 싶습니다.",
            workExperience: [
                {
                    company: "에듀테크 스타트업",
                    position: "풀스택 개발자",
                    period: "2022-2024",
                    description: "온라인 교육 플랫폼 개발 및 운영"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-11",
            lastLoginDate: "2024-01-16"
        },
        {
            id: 6,
            name: "라자 파텔",
            nameKorean: "박라자",
            email: "raja@example.com",
            nationality: "인도",
            age: 31,
            gender: "남성",
            currentVisa: "D-2",
            desiredVisa: "E-7",
            koreanLevel: "intermediate",
            englishLevel: "native",
            desiredJobCategory: "IT001",
            desiredPosition: "백엔드 개발자",
            experience: "6년",
            education: "석사",
            university: "KAIST 전산학과",
            skills: ["Java", "Spring", "Microservices", "AWS", "Docker"],
            certifications: ["AWS Solutions Architect", "Oracle 자격증"],
            desiredSalary: "5000만원",
            desiredLocation: "대전광역시",
            availableStartDate: "2024-02-10",
            profileImage: "https://via.placeholder.com/150/06B6D4/FFFFFF?text=RP",
            introduction: "인도에서 온 시니어 백엔드 개발자 라자입니다. KAIST에서 석사과정을 마쳤으며, 대규모 시스템 설계 경험이 풍부합니다. 한국 IT 기업에서 기술 리더로 성장하고 싶습니다.",
            workExperience: [
                {
                    company: "인도 IT기업",
                    position: "시니어 개발자",
                    period: "2018-2023",
                    description: "마이크로서비스 아키텍처 설계 및 개발"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-10",
            lastLoginDate: "2024-01-15"
        },
        {
            id: 7,
            name: "아니타 사리",
            nameKorean: "사아니",
            email: "anita@example.com",
            nationality: "인도네시아",
            age: 24,
            gender: "여성",
            currentVisa: "D-4",
            desiredVisa: "E-9",
            koreanLevel: "intermediate",
            englishLevel: "intermediate",
            desiredJobCategory: "SVC002",
            desiredPosition: "마케팅 어시스턴트",
            experience: "1년",
            education: "학사",
            university: "서울여자대학교 경영학과",
            skills: ["디지털마케팅", "SNS운영", "그래픽디자인", "한국어"],
            certifications: ["GTQ", "컴활1급"],
            desiredSalary: "2800만원",
            desiredLocation: "서울특별시",
            availableStartDate: "2024-02-20",
            profileImage: "https://via.placeholder.com/150/EF4444/FFFFFF?text=AS",
            introduction: "인도네시아에서 온 마케팅 전공자 아니타입니다. 한국 문화에 대한 이해가 깊어 K-브랜드 마케팅에 특화된 역량을 보유하고 있습니다.",
            workExperience: [
                {
                    company: "마케팅 에이전시",
                    position: "마케팅 인턴",
                    period: "2023-2024",
                    description: "SNS 마케팅 및 콘텐츠 제작"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-09",
            lastLoginDate: "2024-01-14"
        },
        {
            id: 8,
            name: "알리 하산",
            nameKorean: "한알리",
            email: "ali@example.com",
            nationality: "우즈베키스탄",
            age: 26,
            gender: "남성",
            currentVisa: "E-9",
            desiredVisa: "H-2",
            koreanLevel: "intermediate",
            englishLevel: "intermediate",
            desiredJobCategory: "CON001",
            desiredPosition: "건설기사",
            experience: "4년",
            education: "전문학사",
            university: "우즈베키스탄 건설대학",
            skills: ["건설기술", "용접", "기계조작", "안전관리"],
            certifications: ["용접기능사", "건설안전기사"],
            desiredSalary: "3200만원",
            desiredLocation: "부산광역시",
            availableStartDate: "2024-01-30",
            profileImage: "https://via.placeholder.com/150/84CC16/FFFFFF?text=AH",
            introduction: "우즈베키스탄에서 온 건설 전문가 알리입니다. 4년간 다양한 건설 프로젝트에 참여했으며, 한국의 첨단 건설 기술을 배우며 전문성을 높이고 싶습니다.",
            workExperience: [
                {
                    company: "우즈베키스탄 건설회사",
                    position: "건설기사",
                    period: "2020-2023",
                    description: "아파트 및 상업시설 건설"
                }
            ],
            isActive: true,
            registeredDate: "2024-01-08",
            lastLoginDate: "2024-01-13"
        }
    ];
    
    console.log('테스트 구직자 데이터 로드 완료:', allJobSeekers.length + '명');
}

// 통계 정보 업데이트
function updateStats() {
    const totalJobSeekersEl = document.getElementById('total-jobseekers');
    const activeJobSeekersEl = document.getElementById('active-jobseekers');
    const newJobSeekersEl = document.getElementById('new-jobseekers');
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newJobSeekers = allJobSeekers.filter(js => new Date(js.registeredDate) >= weekAgo).length;
    const activeJobSeekers = allJobSeekers.filter(js => js.isActive).length;
    
    if (totalJobSeekersEl) totalJobSeekersEl.textContent = allJobSeekers.length;
    if (activeJobSeekersEl) activeJobSeekersEl.textContent = activeJobSeekers;
    if (newJobSeekersEl) newJobSeekersEl.textContent = newJobSeekers;
}

// 구직자 검색
function searchJobSeekers() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredJobSeekers = [...allJobSeekers];
    } else {
        filteredJobSeekers = allJobSeekers.filter(js => 
            js.name.toLowerCase().includes(searchTerm) ||
            js.nameKorean.toLowerCase().includes(searchTerm) ||
            js.nationality.toLowerCase().includes(searchTerm) ||
            js.desiredPosition.toLowerCase().includes(searchTerm) ||
            js.skills.some(skill => skill.toLowerCase().includes(searchTerm)) ||
            js.introduction.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    displayJobSeekers();
    console.log('검색 결과:', filteredJobSeekers.length + '명');
}

// 필터 적용
function applyFilters() {
    const visaFilter = document.getElementById('visa-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const koreanFilter = document.getElementById('korean-filter').value;
    const nationalityFilter = document.getElementById('nationality-filter').value;
    
    filteredJobSeekers = allJobSeekers.filter(js => {
        let matches = true;
        
        if (visaFilter && js.currentVisa !== visaFilter) matches = false;
        if (categoryFilter && js.desiredJobCategory !== categoryFilter) matches = false;
        if (koreanFilter && js.koreanLevel !== koreanFilter) matches = false;
        if (nationalityFilter && js.nationality !== nationalityFilter) matches = false;
        
        return matches;
    });
    
    currentPage = 1;
    displayJobSeekers();
    console.log('필터 적용 결과:', filteredJobSeekers.length + '명');
}

// 필터 초기화
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('visa-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('korean-filter').value = '';
    document.getElementById('nationality-filter').value = '';
    
    filteredJobSeekers = [...allJobSeekers];
    currentPage = 1;
    displayJobSeekers();
    console.log('필터 초기화 완료');
}

// 정렬
function sortJobSeekers() {
    const sortOption = document.getElementById('sort-options').value;
    
    switch (sortOption) {
        case 'newest':
            filteredJobSeekers.sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate));
            break;
        case 'experience':
            filteredJobSeekers.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
            break;
        case 'korean-level':
            const levelOrder = { 'native': 4, 'advanced': 3, 'intermediate': 2, 'beginner': 1 };
            filteredJobSeekers.sort((a, b) => (levelOrder[b.koreanLevel] || 0) - (levelOrder[a.koreanLevel] || 0));
            break;
        case 'name':
            filteredJobSeekers.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    displayJobSeekers();
    console.log('정렬 완료:', sortOption);
}

// 구직자 목록 표시
function displayJobSeekers() {
    const container = document.getElementById('jobseekers-container');
    const loadingEl = document.getElementById('loading');
    const resultsCount = document.getElementById('results-count');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (resultsCount) {
        resultsCount.textContent = filteredJobSeekers.length;
    }
    
    if (!container) return;
    
    if (filteredJobSeekers.length === 0) {
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
    const endIndex = Math.min(currentPage * jobSeekersPerPage, filteredJobSeekers.length);
    const jobSeekersToShow = filteredJobSeekers.slice(startIndex, endIndex);
    
    container.innerHTML = jobSeekersToShow.map(js => createJobSeekerCard(js)).join('');
    
    // 더보기 버튼 표시/숨김
    if (loadMoreContainer) {
        if (endIndex < filteredJobSeekers.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
}

// 구직자 카드 생성
function createJobSeekerCard(jobSeeker) {
    const visaTypeNames = {
        'D-2': 'D-2 유학',
        'D-4': 'D-4 연수',
        'H-2': 'H-2 방문취업',
        'F-4': 'F-4 재외동포',
        'F-2': 'F-2 거주',
        'F-5': 'F-5 영주',
        'E-7': 'E-7 특정기능',
        'E-9': 'E-9 비전문취업'
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
    
    const koreanLevelNames = {
        'beginner': '초급',
        'intermediate': '중급',
        'advanced': '고급',
        'native': '모국어 수준'
    };
    
    const registeredDaysAgo = Math.floor((new Date() - new Date(jobSeeker.registeredDate)) / (1000 * 60 * 60 * 24));
    const daysAgoText = registeredDaysAgo === 0 ? '오늘' : `${registeredDaysAgo}일 전`;
    
    return `
        <div class="jobseeker-card bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 animate-fade-in" onclick="showJobSeekerDetail(${jobSeeker.id})">
            <div class="flex items-start mb-4">
                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mr-4 flex-shrink-0">
                    ${jobSeeker.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-bold text-gray-900 mb-1 hover:text-wow-green transition-colors cursor-pointer">
                        ${jobSeeker.name}
                    </h3>
                    <div class="text-sm text-gray-600 mb-1">
                        <i class="fas fa-flag mr-1"></i>${jobSeeker.nationality} • ${jobSeeker.age}세 • ${jobSeeker.gender}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-graduation-cap mr-1"></i>${jobSeeker.education} • ${jobSeeker.experience} 경력
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-block px-2 py-1 rounded-full text-xs font-medium ${jobSeeker.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                        ${jobSeeker.isActive ? '구직중' : '비활성'}
                    </span>
                </div>
            </div>
            
            <div class="mb-4">
                <div class="flex flex-wrap gap-2 mb-3">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                        <i class="fas fa-passport mr-1"></i>${visaTypeNames[jobSeeker.currentVisa] || jobSeeker.currentVisa}
                    </span>
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                        <i class="fas fa-briefcase mr-1"></i>${categoryNames[jobSeeker.desiredJobCategory] || jobSeeker.desiredJobCategory}
                    </span>
                    <span class="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                        <i class="fas fa-language mr-1"></i>한국어 ${koreanLevelNames[jobSeeker.koreanLevel] || jobSeeker.koreanLevel}
                    </span>
                </div>
                
                <div class="mb-3">
                    <h4 class="font-medium text-gray-900 mb-2">희망 직무</h4>
                    <p class="text-wow-green font-medium">${jobSeeker.desiredPosition}</p>
                </div>
                
                <div class="mb-3">
                    <h4 class="font-medium text-gray-900 mb-2">보유 기술</h4>
                    <div class="flex flex-wrap gap-1">
                        ${jobSeeker.skills.slice(0, 4).map(skill => `
                            <span class="skill-tag px-2 py-1 rounded text-xs font-medium">${skill}</span>
                        `).join('')}
                        ${jobSeeker.skills.length > 4 ? `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">+${jobSeeker.skills.length - 4}</span>` : ''}
                    </div>
                </div>
                
                <p class="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    ${jobSeeker.introduction}
                </p>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                <div class="text-sm text-gray-500">
                    <i class="fas fa-calendar mr-1"></i>
                    ${daysAgoText} 등록
                </div>
                <div class="text-sm">
                    <span class="text-gray-500 mr-2">희망 연봉:</span>
                    <span class="font-medium text-wow-green">${jobSeeker.desiredSalary}</span>
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100">
                <button onclick="showJobSeekerDetail(${jobSeeker.id})" class="w-full text-wow-green hover:text-green-700 font-medium text-sm py-2 hover:bg-green-50 rounded transition-colors">
                    프로필 자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        </div>
    `;
}

// 더 많은 구직자 로드
function loadMoreJobSeekers() {
    if (isLoading) return;
    
    isLoading = true;
    currentPage++;
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...';
        loadMoreBtn.disabled = true;
    }
    
    setTimeout(() => {
        displayJobSeekers();
        isLoading = false;
        
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>더 많은 구직자 보기';
            loadMoreBtn.disabled = false;
        }
    }, 1000);
}

// 구직자 상세보기 (로그인 검증 포함) - v2.0
function showJobSeekerDetail(jobSeekerId) {
    console.log('=== 구직자 상세보기 시작 ===', jobSeekerId);
    console.log('AuthUtils 존재 여부:', typeof AuthUtils !== 'undefined');
    
    // AuthUtils가 로드되지 않았을 경우 안전 장치
    if (typeof AuthUtils === 'undefined') {
        console.error('AuthUtils가 로드되지 않았습니다!');
        alert('로그인이 필요한 서비스입니다.');
        return false;
    }
    
    try {
        // 로그인 상태 확인
        const permission = AuthUtils.checkDetailViewPermission('jobseeker');
        console.log('권한 검사 결과:', permission);
        
        if (permission.hasPermission) {
            // 로그인됨 - 상세 정보 표시
            console.log('✅ 인증 성공! 상세 정보 표시:', permission.user);
            openJobSeekerModal(jobSeekerId);
            return true;
        } else {
            // 미로그인 - 로그인 모달이 이미 표시됨
            console.log('❌ 로그인 필요! 상세보기 차단');
            console.log('openJobSeekerModal 호출하지 않음');
            return false;
        }
    } catch (error) {
        console.error('인증 처리 중 오류:', error);
        alert('로그인이 필요한 서비스입니다.');
        return false;
    }
}

// 구직자 상세 모달 열기 (실제 모달 표시) - v2.0
function openJobSeekerModal(jobSeekerId) {
    console.log('=== openJobSeekerModal 호출됨 ===', jobSeekerId);
    console.trace('openJobSeekerModal 호출 스택 트레이스:');
    const jobSeeker = allJobSeekers.find(js => js.id === jobSeekerId);
    if (!jobSeeker) return;
    
    const modal = document.getElementById('jobseeker-modal');
    const modalTitle = document.getElementById('modal-jobseeker-name');
    const modalContent = document.getElementById('modal-jobseeker-content');
    
    if (modalTitle) modalTitle.textContent = `${jobSeeker.name} (${jobSeeker.nameKorean})`;
    
    if (modalContent) {
        modalContent.innerHTML = createJobSeekerDetailContent(jobSeeker);
    }
    
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// 구직자 상세 내용 생성
function createJobSeekerDetailContent(jobSeeker) {
    const visaTypeNames = {
        'D-2': 'D-2 유학',
        'D-4': 'D-4 연수',
        'H-2': 'H-2 방문취업',
        'F-4': 'F-4 재외동포',
        'F-2': 'F-2 거주',
        'F-5': 'F-5 영주',
        'E-7': 'E-7 특정기능',
        'E-9': 'E-9 비전문취업'
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
    
    const koreanLevelNames = {
        'beginner': '초급',
        'intermediate': '중급',
        'advanced': '고급',
        'native': '모국어 수준'
    };
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 기본 정보 -->
            <div class="lg:col-span-2 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-4">자기소개</h3>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-gray-700 leading-relaxed">${jobSeeker.introduction}</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-4">보유 기술</h3>
                    <div class="flex flex-wrap gap-2">
                        ${jobSeeker.skills.map(skill => `
                            <span class="skill-tag px-3 py-2 rounded-lg text-sm font-medium">${skill}</span>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-4">경력사항</h3>
                    <div class="space-y-3">
                        ${jobSeeker.workExperience.map(exp => `
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-medium text-gray-900">${exp.company}</h4>
                                    <span class="text-sm text-gray-500">${exp.period}</span>
                                </div>
                                <div class="text-sm text-wow-green font-medium mb-1">${exp.position}</div>
                                <p class="text-gray-600 text-sm">${exp.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-4">자격증</h3>
                    <div class="grid grid-cols-2 gap-2">
                        ${jobSeeker.certifications.map(cert => `
                            <div class="flex items-center p-2 bg-blue-50 rounded">
                                <i class="fas fa-certificate text-blue-500 mr-2"></i>
                                <span class="text-sm">${cert}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 사이드바 정보 -->
            <div class="space-y-6">
                <div class="bg-wow-green text-white rounded-lg p-6">
                    <div class="text-center mb-4">
                        <div class="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                            ${jobSeeker.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 class="text-lg font-bold">${jobSeeker.name}</h3>
                        <p class="text-green-200">${jobSeeker.nameKorean}</p>
                    </div>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between">
                            <span class="text-green-200">국적:</span>
                            <span>${jobSeeker.nationality}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-200">나이:</span>
                            <span>${jobSeeker.age}세</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-200">성별:</span>
                            <span>${jobSeeker.gender}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-200">현재 비자:</span>
                            <span>${visaTypeNames[jobSeeker.currentVisa] || jobSeeker.currentVisa}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-green-200">희망 비자:</span>
                            <span>${visaTypeNames[jobSeeker.desiredVisa] || jobSeeker.desiredVisa}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-bold text-gray-900 mb-3">언어 능력</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">한국어:</span>
                            <span class="font-medium">${koreanLevelNames[jobSeeker.koreanLevel] || jobSeeker.koreanLevel}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">영어:</span>
                            <span class="font-medium">${koreanLevelNames[jobSeeker.englishLevel] || jobSeeker.englishLevel}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-bold text-gray-900 mb-3">희망 조건</h3>
                    <div class="space-y-2 text-sm">
                        <div>
                            <span class="text-gray-600">직종:</span>
                            <div class="font-medium">${categoryNames[jobSeeker.desiredJobCategory] || jobSeeker.desiredJobCategory}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">직무:</span>
                            <div class="font-medium">${jobSeeker.desiredPosition}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">희망 연봉:</span>
                            <div class="font-medium text-wow-green">${jobSeeker.desiredSalary}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">희망 지역:</span>
                            <div class="font-medium">${jobSeeker.desiredLocation}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">입사 가능일:</span>
                            <div class="font-medium">${new Date(jobSeeker.availableStartDate).toLocaleDateString('ko-KR')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button class="w-full bg-wow-green text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                        <i class="fas fa-envelope mr-2"></i>연락하기
                    </button>
                    <button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        <i class="fas fa-star mr-2"></i>관심 인재 등록
                    </button>
                    <button class="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        <i class="fas fa-download mr-2"></i>이력서 다운로드
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 구직자 상세 모달 닫기
function closeJobSeekerModal() {
    const modal = document.getElementById('jobseeker-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// 에러 메시지 표시
function showError(message) {
    const container = document.getElementById('jobseekers-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl text-gray-600 mb-2">오류가 발생했습니다</h3>
                <p class="text-gray-500">${message}</p>
                <button onclick="loadInitialData()" class="mt-4 px-6 py-2 bg-wow-green text-white rounded-lg hover:bg-green-700 transition-colors">
                    다시 시도
                </button>
            </div>
        `;
    }
}

// 모달 외부 클릭시 닫기
document.addEventListener('click', function(e) {
    const modal = document.getElementById('jobseeker-modal');
    if (e.target === modal) {
        closeJobSeekerModal();
    }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeJobSeekerModal();
    }
});