// 매칭 서비스 JavaScript
let matchingData = {
    jobSeekers: [],
    jobs: [],
    currentTab: 'jobs'
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('매칭 서비스 페이지 로드 시작');
    
    // 모바일 메뉴 토글
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // URL 파라미터에서 탭 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    let initialTab = urlParams.get('tab');
    
    // URL 파라미터 탭 매핑
    const tabMapping = {
        'matching': 'jobs',        // 구직자 매칭 -> 매칭 서비스 탭
        'programs': 'talents',     // 구인정보 보기 -> 우수 프로그램 탭
        'statistics': 'education'  // 통계 대시보드 탭
    };
    
    // 매핑된 탭이 있으면 사용, 없으면 기본값 'jobs'
    const targetTab = tabMapping[initialTab] || initialTab || 'jobs';
    console.log('URL에서 감지된 탭:', initialTab, '-> 매핑된 탭:', targetTab);
    
    // 초기 탭 설정
    switchTab(targetTab);
    
    // 초기 데이터 로드
    loadInitialData();
    
    // 통계 애니메이션
    animateStats();
});

// 탭 전환 함수
function switchTab(tabName) {
    console.log('탭 전환:', tabName);
    
    // 모든 탭 비활성화
    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 모든 컨텐츠 숨김
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 선택된 탭 활성화
    const activeTab = document.getElementById(`tab-${tabName}`);
    const activeContent = document.getElementById(`content-${tabName}`);
    
    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.remove('hidden');
    }
    
    matchingData.currentTab = tabName;
    
    // 탭별 초기화
    if (tabName === 'talents') {
        loadExcellentTalents();
    }
}

// 초기 데이터 로드
async function loadInitialData() {
    try {
        console.log('매칭 서비스 데이터 로드 시작');
        
        // 테스트 데이터 로드
        loadTestData();
        
        // API에서 실제 데이터 시도
        try {
            await Promise.all([
                loadJobSeekers(),
                loadJobs()
            ]);
        } catch (apiError) {
            console.log('API 호출 실패, 테스트 데이터 사용:', apiError.message);
        }
        
        console.log('매칭 서비스 데이터 로드 완료');
        
    } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
    }
}

// 테스트 데이터 로드
function loadTestData() {
    // 테스트 구직자 데이터
    matchingData.jobSeekers = [
        {
            id: 1,
            name: "응우엔 반 아",
            nationality: "베트남",
            currentVisa: "D-2",
            desiredVisa: "E-7",
            koreanLevel: "intermediate",
            desiredJobCategory: "IT001",
            desiredSalaryMin: 3000000,
            desiredSalaryMax: 4500000,
            workLocation: "서울",
            experience: "2년",
            skills: ["React", "Node.js", "JavaScript"],
            rating: 4.8,
            completionRate: 95
        },
        {
            id: 2,
            name: "리 웨이 민",
            nationality: "중국",
            currentVisa: "D-4",
            desiredVisa: "E-7",
            koreanLevel: "advanced",
            desiredJobCategory: "MFG001",
            desiredSalaryMin: 2800000,
            desiredSalaryMax: 3500000,
            workLocation: "인천",
            experience: "3년",
            skills: ["제조", "품질관리", "한국어"],
            rating: 4.6,
            completionRate: 88
        },
        {
            id: 3,
            name: "마리아 산토스",
            nationality: "필리핀",
            currentVisa: "H-2",
            desiredVisa: "E-9",
            koreanLevel: "beginner",
            desiredJobCategory: "SVC001",
            desiredSalaryMin: 2200000,
            desiredSalaryMax: 2800000,
            workLocation: "부산",
            experience: "1년",
            skills: ["서비스", "영어", "고객응대"],
            rating: 4.3,
            completionRate: 82
        }
    ];
    
    // 테스트 구인공고 데이터
    matchingData.jobs = [
        {
            id: 1,
            title: "프론트엔드 개발자",
            company: "테크이노베이션",
            requiredVisa: "E-7",
            jobCategory: "IT001",
            salaryMin: 3500000,
            salaryMax: 5000000,
            workLocation: "서울 강남구",
            requiredSkills: ["React", "TypeScript", "JavaScript"],
            koreanLevel: "intermediate",
            experience: "2-5년"
        },
        {
            id: 2,
            title: "생산관리 담당자",
            company: "글로벌제조",
            requiredVisa: "E-7",
            jobCategory: "MFG001",
            salaryMin: 3000000,
            salaryMax: 4000000,
            workLocation: "인천 남동구",
            requiredSkills: ["제조", "품질관리", "생산관리"],
            koreanLevel: "intermediate",
            experience: "2-4년"
        }
    ];
}

// 구직자 데이터 로드 (API)
async function loadJobSeekers() {
    try {
        const response = await fetch('/api/jobseekers/public');
        if (response.ok) {
            const apiJobSeekers = await response.json();
            if (apiJobSeekers && apiJobSeekers.length > 0) {
                matchingData.jobSeekers = [...matchingData.jobSeekers, ...apiJobSeekers];
                console.log('API에서 구직자 데이터 로드 성공:', apiJobSeekers.length + '명');
            }
        }
    } catch (error) {
        console.log('구직자 API 호출 실패:', error.message);
    }
}

// 구인공고 데이터 로드 (API)
async function loadJobs() {
    try {
        const response = await fetch('/api/jobs/public');
        if (response.ok) {
            const apiJobs = await response.json();
            if (apiJobs && apiJobs.length > 0) {
                matchingData.jobs = [...matchingData.jobs, ...apiJobs];
                console.log('API에서 구인공고 데이터 로드 성공:', apiJobs.length + '개');
            }
        }
    } catch (error) {
        console.log('구인공고 API 호출 실패:', error.message);
    }
}

// 구직자 매칭 시작
function startJobSeekerMatching() {
    console.log('구직자 매칭 시작');
    
    // 로그인 상태 확인
    const permission = AuthUtils.checkDetailViewPermission('matching');
    
    if (!permission.hasPermission) {
        console.log('로그인이 필요한 서비스입니다');
        return;
    }
    
    // 매칭 알고리즘 실행
    const matchingResults = performJobSeekerMatching();
    
    // 결과 표시
    displayMatchingResults(matchingResults, 'jobseeker');
}

// 구인정보 보기
function viewJobListings() {
    console.log('구인정보 보기');
    
    // 로그인 상태 확인
    const permission = AuthUtils.checkDetailViewPermission('jobs');
    
    if (!permission.hasPermission) {
        console.log('로그인이 필요한 서비스입니다');
        return;
    }
    
    // 구인공고 목록으로 이동
    window.location.href = '/static/job-listings.html';
}

// 구직자 매칭 알고리즘
function performJobSeekerMatching() {
    console.log('구직자 매칭 알고리즘 실행');
    
    const results = [];
    
    matchingData.jobSeekers.forEach(jobSeeker => {
        const matches = [];
        
        matchingData.jobs.forEach(job => {
            const matchScore = calculateMatchScore(jobSeeker, job);
            
            if (matchScore >= 50) {
                matches.push({
                    job: job,
                    score: matchScore,
                    reasons: getMatchReasons(jobSeeker, job, matchScore)
                });
            }
        });
        
        // 점수순으로 정렬
        matches.sort((a, b) => b.score - a.score);
        
        if (matches.length > 0) {
            results.push({
                jobSeeker: jobSeeker,
                matches: matches.slice(0, 3) // 상위 3개만
            });
        }
    });
    
    return results;
}

// 매칭 점수 계산
function calculateMatchScore(jobSeeker, job) {
    let score = 0;
    
    // 비자 유형 매칭 (30점)
    if (jobSeeker.desiredVisa === job.requiredVisa) {
        score += 30;
    } else if (isCompatibleVisa(jobSeeker.desiredVisa, job.requiredVisa)) {
        score += 15;
    }
    
    // 직종 매칭 (25점)
    if (jobSeeker.desiredJobCategory === job.jobCategory) {
        score += 25;
    }
    
    // 급여 조건 (20점)
    const salaryMatch = calculateSalaryMatch(jobSeeker, job);
    score += salaryMatch * 20;
    
    // 지역 매칭 (15점)
    if (jobSeeker.workLocation && job.workLocation) {
        if (jobSeeker.workLocation.includes(job.workLocation.split(' ')[0]) || 
            job.workLocation.includes(jobSeeker.workLocation.split(' ')[0])) {
            score += 15;
        }
    }
    
    // 한국어 수준 (10점)
    const koreanMatch = calculateKoreanLevelMatch(jobSeeker.koreanLevel, job.koreanLevel);
    score += koreanMatch * 10;
    
    return Math.round(score);
}

// 비자 호환성 확인
function isCompatibleVisa(desired, required) {
    const compatiblePairs = {
        'D-2': ['D-4', 'E-7'],
        'D-4': ['D-2', 'E-7'],
        'F-4': ['E-7', 'E-9'],
        'H-2': ['E-9']
    };
    
    return compatiblePairs[desired]?.includes(required) || false;
}

// 급여 매칭 계산
function calculateSalaryMatch(jobSeeker, job) {
    const jsMin = jobSeeker.desiredSalaryMin;
    const jsMax = jobSeeker.desiredSalaryMax;
    const jobMin = job.salaryMin;
    const jobMax = job.salaryMax;
    
    // 겹치는 구간이 있는지 확인
    const overlapMin = Math.max(jsMin, jobMin);
    const overlapMax = Math.min(jsMax, jobMax);
    
    if (overlapMax >= overlapMin) {
        const overlapSize = overlapMax - overlapMin;
        const totalRange = Math.max(jsMax, jobMax) - Math.min(jsMin, jobMin);
        return overlapSize / totalRange;
    }
    
    return 0;
}

// 한국어 수준 매칭 계산
function calculateKoreanLevelMatch(jobSeekerLevel, jobRequiredLevel) {
    const levels = {
        'beginner': 1,
        'intermediate': 2,
        'advanced': 3,
        'native': 4
    };
    
    const jsLevel = levels[jobSeekerLevel] || 1;
    const reqLevel = levels[jobRequiredLevel] || 1;
    
    if (jsLevel >= reqLevel) {
        return 1;
    } else {
        return jsLevel / reqLevel;
    }
}

// 매칭 이유 생성
function getMatchReasons(jobSeeker, job, score) {
    const reasons = [];
    
    if (jobSeeker.desiredVisa === job.requiredVisa) {
        reasons.push('비자 유형이 완전히 일치합니다');
    }
    
    if (jobSeeker.desiredJobCategory === job.jobCategory) {
        reasons.push('희망 직종과 정확히 맞습니다');
    }
    
    const salaryMatch = calculateSalaryMatch(jobSeeker, job);
    if (salaryMatch > 0.8) {
        reasons.push('급여 조건이 매우 적합합니다');
    } else if (salaryMatch > 0.5) {
        reasons.push('급여 조건이 어느 정도 맞습니다');
    }
    
    if (jobSeeker.workLocation && job.workLocation) {
        if (jobSeeker.workLocation.includes(job.workLocation.split(' ')[0])) {
            reasons.push('희망 근무지역과 일치합니다');
        }
    }
    
    return reasons;
}

// 매칭 결과 표시
function displayMatchingResults(results, type) {
    const modal = document.getElementById('matching-modal');
    const container = document.getElementById('matching-results');
    
    if (!modal || !container) return;
    
    let html = '';
    
    if (results.length === 0) {
        html = `
            <div class="text-center py-12">
                <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-600 mb-2">매칭 결과가 없습니다</h3>
                <p class="text-gray-500">조건에 맞는 ${type === 'jobseeker' ? '구인공고' : '구직자'}가 없습니다.</p>
            </div>
        `;
    } else {
        html = `
            <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-900 mb-2">
                    <i class="fas fa-chart-line mr-2 text-wow-green"></i>
                    총 ${results.length}명의 구직자에 대한 매칭 결과
                </h3>
                <p class="text-gray-600">AI 분석을 통해 최적의 매칭을 찾았습니다.</p>
            </div>
            
            <div class="space-y-6">
        `;
        
        results.forEach((result, index) => {
            const jobSeeker = result.jobSeeker;
            const topMatch = result.matches[0];
            
            html += `
                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-xl font-bold text-gray-900 mb-2">
                                <i class="fas fa-user-circle mr-2 text-wow-blue"></i>
                                ${jobSeeker.name}
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">국적:</span>
                                    <span class="font-medium">${jobSeeker.nationality}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">비자:</span>
                                    <span class="font-medium">${jobSeeker.desiredVisa}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">한국어:</span>
                                    <span class="font-medium">${getKoreanLevelDisplay(jobSeeker.koreanLevel)}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">경력:</span>
                                    <span class="font-medium">${jobSeeker.experience}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            <div class="text-2xl font-bold ${getScoreColor(topMatch.score)}">${topMatch.score}%</div>
                            <div class="text-sm text-gray-500">매칭 점수</div>
                        </div>
                    </div>
                    
                    <div class="border-t pt-4">
                        <h5 class="font-bold text-gray-900 mb-3">
                            <i class="fas fa-star mr-2 text-yellow-500"></i>
                            추천 구인공고 (상위 ${result.matches.length}개)
                        </h5>
                        
                        <div class="space-y-3">
            `;
            
            result.matches.forEach(match => {
                html += `
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h6 class="font-bold text-gray-900">${match.job.title}</h6>
                            <span class="text-lg font-bold ${getScoreColor(match.score)}">${match.score}%</span>
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-building mr-1"></i>${match.job.company}
                            <span class="mx-2">•</span>
                            <i class="fas fa-map-marker-alt mr-1"></i>${match.job.workLocation}
                        </div>
                        <div class="text-sm text-gray-600 mb-3">
                            <span class="font-medium text-wow-green">
                                월 ${formatSalary(match.job.salaryMin)} - ${formatSalary(match.job.salaryMax)}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${match.reasons.map(reason => `
                                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    <i class="fas fa-check mr-1"></i>${reason}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    container.innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 매칭 점수에 따른 색상 클래스
function getScoreColor(score) {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
}

// 한국어 수준 표시
function getKoreanLevelDisplay(level) {
    const levels = {
        'beginner': '초급',
        'intermediate': '중급', 
        'advanced': '고급',
        'native': '모국어수준'
    };
    return levels[level] || '알 수 없음';
}

// 급여 포맷
function formatSalary(amount) {
    if (!amount) return '협의';
    return (amount / 10000).toFixed(0) + '만원';
}

// 매칭 모달 닫기
function closeMatchingModal() {
    const modal = document.getElementById('matching-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// 우수 구직자 로드
function loadExcellentTalents() {
    const container = document.getElementById('excellent-talents');
    if (!container) return;
    
    // 평점이 4.5 이상인 구직자들 필터링
    const excellentTalents = matchingData.jobSeekers
        .filter(js => js.rating >= 4.5)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);
    
    if (excellentTalents.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-star text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">우수 구직자 정보를 로드 중입니다...</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = excellentTalents.map(talent => `
        <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-wow-blue to-wow-light-blue flex items-center justify-center text-white font-bold text-lg">
                    ${talent.name.charAt(0).toUpperCase()}
                </div>
                <div class="ml-4 flex-1">
                    <h4 class="font-bold text-gray-900">${talent.name}</h4>
                    <div class="flex items-center">
                        <div class="flex text-yellow-400">
                            ${Array(5).fill().map((_, i) => 
                                i < Math.floor(talent.rating) ? 
                                '<i class="fas fa-star text-xs"></i>' : 
                                '<i class="far fa-star text-xs"></i>'
                            ).join('')}
                        </div>
                        <span class="ml-2 text-sm text-gray-500">${talent.rating}</span>
                    </div>
                </div>
            </div>
            
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-500">국적:</span>
                    <span class="font-medium">${talent.nationality}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">비자:</span>
                    <span class="font-medium">${talent.desiredVisa}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">경력:</span>
                    <span class="font-medium">${talent.experience}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">완성도:</span>
                    <span class="font-medium text-green-600">${talent.completionRate}%</span>
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t">
                <div class="flex flex-wrap gap-1">
                    ${talent.skills.map(skill => `
                        <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">${skill}</span>
                    `).join('')}
                </div>
            </div>
            
            <button onclick="viewTalentDetail(${talent.id})" class="w-full mt-4 bg-wow-blue text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <i class="fas fa-user mr-2"></i>상세 프로필 보기
            </button>
        </div>
    `).join('');
}

// 구직자 상세 보기
function viewTalentDetail(talentId) {
    console.log('구직자 상세 보기:', talentId);
    
    // 로그인 상태 확인
    const permission = AuthUtils.checkDetailViewPermission('talent');
    
    if (!permission.hasPermission) {
        console.log('로그인이 필요한 서비스입니다');
        return;
    }
    
    // 구직자 상세 페이지로 이동
    window.location.href = `/static/jobseeker-listings.html#talent-${talentId}`;
}

// 통계 애니메이션
function animateStats() {
    const statElements = [
        { id: 'stat-success', target: 127 },
        { id: 'stat-excellent', target: 284 },
        { id: 'stat-pending', target: 56 }
    ];
    
    statElements.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            animateNumber(element, 0, stat.target, 2000);
        }
    });
}

// 숫자 애니메이션
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const currentValue = Math.floor(start + (end - start) * progress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// 에러 표시
function showError(message) {
    console.error(message);
    // 에러 토스트나 알림을 여기에 구현할 수 있습니다
}