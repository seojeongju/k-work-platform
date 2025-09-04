// 외국인 구인구직 플랫폼 Frontend JavaScript

class JobPlatformApp {
    constructor() {
        this.currentTab = 'jobs';
        this.isLoggedIn = false;
        this.currentUser = {};
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupJobSubTabs();
        this.setupJobSeekerSubTabs();
        this.setupStudySubTabs();
        this.setupJobRegistration();
        this.setupJobSeekerRegistration();
        this.loadInitialData();
        this.bindEvents();
        
        // DOM이 완전히 로드된 후 사용자 네비게이션 설정
        setTimeout(() => {
            this.setupUserNavigation();
        }, 200);
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.id.replace('tab-', '');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white', 'border-primary');
            btn.classList.add('text-gray-600', 'hover:bg-gray-50');
        });
        
        const activeButton = document.getElementById(`tab-${tabId}`);
        activeButton.classList.remove('text-gray-600', 'hover:bg-gray-50');
        activeButton.classList.add('bg-primary', 'text-white', 'border-b-2', 'border-primary');

        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        document.getElementById(`content-${tabId}`).classList.remove('hidden');
        
        this.currentTab = tabId;
        this.loadTabData(tabId).then(() => {
            // 탭 로드 후 UI 업데이트
            this.updateAuthUI();
        });
    }

    async loadInitialData() {
        // 로그인 상태 확인
        this.checkAuthStatus();
        
        await this.loadJobListings();
        await this.loadStatistics();
        
        // 로그인 상태에 따른 UI 업데이트 (약간 지연)
        setTimeout(() => {
            this.updateAuthUI();
        }, 100);
    }

    async loadTabData(tabId) {
        switch(tabId) {
            case 'jobs':
                await this.loadJobListings();
                break;
            case 'jobseekers':
                await this.loadJobSeekers();
                break;
            case 'matching':
                await this.loadMatchingData();
                break;
            case 'study':
                await this.loadStudyPrograms();
                break;
            case 'stats':
                await this.loadStatistics();
                break;
        }
    }

    async loadJobListings() {
        try {
            const response = await axios.get('/api/jobs?limit=5');
            const jobs = response.data.jobs;
            
            const jobsContainer = document.getElementById('jobs-list');
            jobsContainer.innerHTML = '';

            if (jobs && jobs.length > 0) {
                jobs.forEach(job => {
                    jobsContainer.appendChild(this.createJobCard(job));
                });
            } else {
                jobsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 구인 정보가 없습니다.</p>';
            }
        } catch (error) {
            console.error('구인 정보 로드 실패:', error);
            document.getElementById('jobs-list').innerHTML = '<p class="text-red-500 text-center py-8">구인 정보를 불러오는데 실패했습니다.</p>';
        }
    }

    async loadStudyPrograms() {
        try {
            const response = await axios.get('/api/study-programs?limit=5');
            const programs = response.data.programs;
            
            const studyContainer = document.getElementById('study-list');
            studyContainer.innerHTML = '';

            if (programs && programs.length > 0) {
                programs.forEach(program => {
                    studyContainer.appendChild(this.createStudyCard(program));
                });
            } else {
                studyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 유학 프로그램이 없습니다.</p>';
            }
        } catch (error) {
            console.error('유학 프로그램 로드 실패:', error);
            document.getElementById('study-list').innerHTML = '<p class="text-red-500 text-center py-8">유학 프로그램을 불러오는데 실패했습니다.</p>';
        }
    }

    async loadStatistics() {
        try {
            const response = await axios.get('/api/stats');
            const stats = response.data;

            document.getElementById('stat-jobseekers').textContent = this.formatNumber(stats.jobSeekers);
            document.getElementById('stat-employers').textContent = this.formatNumber(stats.employers);
            document.getElementById('stat-jobs').textContent = this.formatNumber(stats.jobPostings);
            document.getElementById('stat-matches').textContent = this.formatNumber(stats.successfulMatches);
        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer';
        
        const salaryRange = job.salary_min && job.salary_max ? 
            `${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}` : 
            '급여 협의';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-semibold text-gray-800 flex-1">${job.title}</h4>
                <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-2">${job.required_visa}</span>
            </div>
            <div class="space-y-2 text-sm text-gray-600">
                <div class="flex items-center">
                    <i class="fas fa-building w-4 mr-2"></i>
                    <span>${job.company_name}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                    <span>${job.work_location}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-won-sign w-4 mr-2"></i>
                    <span>${salaryRange}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-tag w-4 mr-2"></i>
                    <span>${job.job_category}</span>
                </div>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-xs text-gray-500">
                    마감: ${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}
                </span>
                <button class="text-primary hover:text-secondary font-medium text-sm" 
                        onclick="app.showJobDetail(${job.id})" 
                        id="job-detail-btn-${job.id}">
                    <span class="job-detail-text">자세히 보기</span> <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;

        return card;
    }

    createStudyCard(program) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer';
        
        const tuitionFee = program.tuition_fee ? 
            `${this.formatNumber(program.tuition_fee)}원` : 
            '학비 문의';

        const programTypeMap = {
            'language': '어학과정',
            'undergraduate': '학부과정',
            'graduate': '대학원과정',
            'doctoral': '박사과정'
        };

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-semibold text-gray-800 flex-1">${program.program_name}</h4>
                <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                    ${programTypeMap[program.program_type] || program.program_type}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-600">
                <div class="flex items-center">
                    <i class="fas fa-university w-4 mr-2"></i>
                    <span>${program.institution_name}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                    <span>${program.location}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-clock w-4 mr-2"></i>
                    <span>${program.duration || '기간 문의'}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-won-sign w-4 mr-2"></i>
                    <span>${tuitionFee}</span>
                </div>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-xs text-gray-500">
                    지원마감: ${program.application_deadline ? new Date(program.application_deadline).toLocaleDateString('ko-KR') : '상시접수'}
                </span>
                <button class="text-primary hover:text-secondary font-medium text-sm" 
                        onclick="app.showProgramDetail(${program.id})">
                    자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;

        return card;
    }

    async showJobDetail(jobId) {
        try {
            // 로그인 상태 확인 및 토큰 가져오기
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequiredAlert('구인정보');
                return;
            }

            const response = await axios.get(`/api/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const job = response.data.job;
            
            if (!job) {
                alert('구인 공고를 찾을 수 없습니다.');
                return;
            }
            
            // 모달 또는 상세 페이지 표시
            this.displayJobDetailModal(job);
        } catch (error) {
            console.error('구인 공고 상세 조회 실패:', error);
            
            if (error.response && error.response.status === 401) {
                // 인증 오류 - 로그인 필요
                this.showLoginRequiredAlert('구인정보');
            } else if (error.response && error.response.status === 404) {
                alert('구인 공고를 찾을 수 없습니다.');
            } else {
                alert('구인 공고 정보를 불러오는데 실패했습니다.');
            }
        }
    }
    
    displayJobDetailModal(job) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
        
        const salaryRange = job.salary_min && job.salary_max ? 
            `${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}` : 
            '급여 협의';
            
        const modalContent = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">${job.title}</h2>
                        <button onclick="document.body.removeChild(this.closest('.fixed'))" 
                                class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-blue-800 mb-2">기업 정보</h3>
                            <div class="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-600">회사명:</span>
                                    <span class="font-medium ml-2">${job.company_name || '정보없음'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">담당자:</span>
                                    <span class="font-medium ml-2">${job.contact_person || '정보없음'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">연락처:</span>
                                    <span class="font-medium ml-2">${job.phone || '정보없음'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">웹사이트:</span>
                                    <span class="font-medium ml-2">${job.website || '정보없음'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-green-800 mb-2">구인 조건</h3>
                            <div class="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-600">직종:</span>
                                    <span class="font-medium ml-2">${job.job_category}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">근무지역:</span>
                                    <span class="font-medium ml-2">${job.work_location}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">비자 유형:</span>
                                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">${job.required_visa}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">급여:</span>
                                    <span class="font-medium ml-2 text-green-600">${salaryRange}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">한국어 수준:</span>
                                    <span class="font-medium ml-2">${job.korean_level_required || '무관'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-600">모집 마감:</span>
                                    <span class="font-medium ml-2">${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${job.description ? `
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-gray-800 mb-2">상세 설명</h3>
                            <p class="text-gray-700 leading-relaxed">${job.description}</p>
                        </div>
                        ` : ''}
                        
                        ${job.benefits ? `
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-yellow-800 mb-2">복리혜택</h3>
                            <p class="text-gray-700">${job.benefits}</p>
                        </div>
                        ` : ''}
                        
                        ${job.requirements ? `
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-purple-800 mb-2">자격 요건</h3>
                            <p class="text-gray-700">${job.requirements}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="mt-6 flex justify-end space-x-4">
                        <button onclick="document.body.removeChild(this.closest('.fixed'))" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            닫기
                        </button>
                        <button onclick="alert('지원 기능은 추후 구현 예정입니다.')" 
                                class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary">
                            지원하기
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }

    showProgramDetail(programId) {
        // 유학 프로그램 상세 페이지로 이동하거나 모달 표시
        console.log('유학 프로그램 상세:', programId);
        alert(`유학 프로그램 ID: ${programId}\\n상세 페이지 기능은 추후 구현됩니다.`);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('ko-KR').format(num);
    }

    formatSalary(amount) {
        if (amount >= 10000) {
            return `${Math.floor(amount / 10000)}만원`;
        }
        return `${this.formatNumber(amount)}원`;
    }

    async loadJobSeekers() {
        try {
            const response = await axios.get('/api/job-seekers?limit=5');
            const jobSeekers = response.data.jobSeekers;
            
            const jobSeekersContainer = document.getElementById('jobseekers-list');
            jobSeekersContainer.innerHTML = '';

            if (jobSeekers && jobSeekers.length > 0) {
                jobSeekers.forEach(jobSeeker => {
                    jobSeekersContainer.appendChild(this.createJobSeekerCard(jobSeeker));
                });
            } else {
                jobSeekersContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 구직자가 없습니다.</p>';
            }
        } catch (error) {
            console.error('구직자 정보 로드 실패:', error);
            document.getElementById('jobseekers-list').innerHTML = '<p class="text-red-500 text-center py-8">구직자 정보를 불러오는데 실패했습니다.</p>';
        }
    }

    async loadMatchingData() {
        try {
            // 매칭 통계 로드
            const statsResponse = await axios.get('/api/matching/stats');
            const stats = statsResponse.data;

            document.getElementById('perfect-matches').textContent = this.formatNumber(stats.perfectMatches);
            document.getElementById('good-matches').textContent = this.formatNumber(stats.goodMatches);
            document.getElementById('pending-matches').textContent = this.formatNumber(stats.pendingMatches);

            // 최신 매칭 결과 로드
            const matchesResponse = await axios.get('/api/matching/results?limit=5');
            const matches = matchesResponse.data.matches;
            
            const matchingContainer = document.getElementById('matching-results');
            matchingContainer.innerHTML = '';

            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    matchingContainer.appendChild(this.createMatchingCard(match));
                });
            } else {
                matchingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">매칭 결과가 없습니다. <button onclick="app.generateMatching()" class="text-primary hover:underline">매칭 생성하기</button></p>';
            }
        } catch (error) {
            console.error('매칭 데이터 로드 실패:', error);
            document.getElementById('matching-results').innerHTML = '<p class="text-red-500 text-center py-4">매칭 데이터를 불러오는데 실패했습니다.</p>';
        }
    }

    createJobSeekerCard(jobSeeker) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer';
        
        const koreanLevelMap = {
            'beginner': '초급',
            'intermediate': '중급',
            'advanced': '고급',
            'native': '원어민급'
        };

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800">${jobSeeker.name}</h4>
                    <p class="text-sm text-gray-600">${jobSeeker.nationality}</p>
                </div>
                <div class="flex flex-col space-y-1">
                    ${jobSeeker.current_visa ? `<span class="badge badge-blue text-xs">${jobSeeker.current_visa}</span>` : ''}
                    ${jobSeeker.korean_level ? `<span class="badge badge-green text-xs">${koreanLevelMap[jobSeeker.korean_level]}</span>` : ''}
                </div>
            </div>
            
            <div class="space-y-1 text-sm text-gray-600 mb-3">
                ${jobSeeker.desired_job_category ? `<div><i class="fas fa-briefcase w-4 mr-2"></i>희망: ${jobSeeker.desired_job_category}</div>` : ''}
                ${jobSeeker.education_level ? `<div><i class="fas fa-graduation-cap w-4 mr-2"></i>학력: ${jobSeeker.education_level}</div>` : ''}
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t">
                <span class="text-xs text-gray-500">
                    등록: ${new Date(jobSeeker.created_at).toLocaleDateString('ko-KR')}
                </span>
                <button class="text-primary hover:text-secondary font-medium text-sm" 
                        onclick="app.viewJobSeekerProfile(${jobSeeker.id})"
                        id="jobseeker-detail-btn-${jobSeeker.id}">
                    <span class="jobseeker-detail-text">프로필 보기</span> <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;

        return card;
    }

    createMatchingCard(match) {
        const card = document.createElement('div');
        card.className = 'bg-gray-50 border rounded-lg p-4 hover:shadow-md transition-shadow';
        
        const matchTypeColors = {
            'perfect': 'text-green-600 bg-green-100',
            'good': 'text-yellow-600 bg-yellow-100', 
            'fair': 'text-blue-600 bg-blue-100'
        };

        const matchTypeText = {
            'perfect': '완벽 매칭',
            'good': '좋은 매칭',
            'fair': '보통 매칭'
        };

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h5 class="font-medium text-gray-800">${match.job_seeker_name} ↔ ${match.job_title}</h5>
                    <p class="text-sm text-gray-600">${match.company_name}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${matchTypeColors[match.match_type]}">
                    ${matchTypeText[match.match_type]}
                </span>
            </div>
            
            <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600">
                    <span>매칭률: ${(match.match_score * 100).toFixed(0)}%</span>
                    <span class="ml-3">${match.nationality}</span>
                </div>
                <button class="text-primary hover:text-secondary text-sm font-medium"
                        onclick="app.viewMatchDetail(${match.id})">
                    상세보기
                </button>
            </div>
        `;

        return card;
    }

    async generateMatching() {
        try {
            const response = await axios.post('/api/matching/generate');
            if (response.data.success) {
                alert(`✅ ${response.data.message}`);
                await this.loadMatchingData(); // 새로운 매칭 결과 로드
            }
        } catch (error) {
            console.error('매칭 생성 실패:', error);
            alert('❌ 매칭 생성 중 오류가 발생했습니다.');
        }
    }

    viewJobSeekerProfile(jobSeekerId) {
        // 로그인 상태 확인
        const token = localStorage.getItem('token');
        if (!token) {
            this.showLoginRequiredAlert('구직정보');
            return;
        }
        
        window.open(`/static/job-seeker-list.html#jobseeker-${jobSeekerId}`, '_blank');
    }

    viewMatchDetail(matchId) {
        alert(`매칭 상세정보 (ID: ${matchId})\\n상세 매칭 페이지는 추후 구현됩니다.`);
    }

    setupJobSubTabs() {
        const jobViewBtn = document.getElementById('job-view-btn');
        const jobRegisterBtn = document.getElementById('job-register-btn');
        
        if (jobViewBtn && jobRegisterBtn) {
            jobViewBtn.addEventListener('click', () => this.showJobView());
            jobRegisterBtn.addEventListener('click', () => this.showJobRegister());
        }
    }
    
    showJobView() {
        // 버튼 상태 변경
        document.querySelectorAll('.job-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const viewBtn = document.getElementById('job-view-btn');
        viewBtn.classList.remove('bg-gray-300', 'text-gray-700');
        viewBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('job-view-section').classList.remove('hidden');
        document.getElementById('job-register-section').classList.add('hidden');
        
        // 구인 정보 새로고침
        this.loadJobListings();
    }
    
    showJobRegister() {
        // 버튼 상태 변경
        document.querySelectorAll('.job-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const registerBtn = document.getElementById('job-register-btn');
        registerBtn.classList.remove('bg-gray-300', 'text-gray-700');
        registerBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('job-view-section').classList.add('hidden');
        document.getElementById('job-register-section').classList.remove('hidden');
        
        // 에이전트 목록 로드
        this.loadAgentsForSelection();
        this.setupAgentSelection();
    }
    
    setupJobRegistration() {
        const form = document.getElementById('job-register-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleJobRegistration(e));
        }
    }
    
    async handleJobRegistration(event) {
        event.preventDefault();
        
        const formData = {
            company_name: document.getElementById('company-name').value,
            contact_person: document.getElementById('contact-person').value,
            contact_email: document.getElementById('contact-email').value,
            contact_phone: document.getElementById('contact-phone').value,
            title: document.getElementById('job-title').value,
            work_location: document.getElementById('work-location').value,
            required_visa: document.getElementById('visa-type').value,
            salary_min: parseInt(document.getElementById('salary').value) * 10000 || null,
            salary_max: parseInt(document.getElementById('salary').value) * 10000 || null,
            positions: parseInt(document.getElementById('positions').value) || 1,
            korean_level: document.getElementById('korean-level').value,
            description: document.getElementById('job-description').value,
            job_category: this.getJobCategoryFromTitle(document.getElementById('job-title').value),
            // 에이전트 관련 정보
            agent_id: document.getElementById('agent-select').value || null,
            agent_fee_percentage: document.getElementById('agent-fee').value ? parseFloat(document.getElementById('agent-fee').value) : null,
            agent_notes: document.getElementById('agent-notes').value || null
        };
        
        try {
            const response = await axios.post('/api/jobs', formData);
            
            if (response.status === 201) {
                // 성공 메시지 표시
                document.getElementById('job-register-success').classList.remove('hidden');
                
                // 폼 초기화
                this.resetJobForm();
                
                // 3초 후 성공 메시지 숨김
                setTimeout(() => {
                    document.getElementById('job-register-success').classList.add('hidden');
                }, 3000);
                
                // 구인정보 목록 새로고침
                if (this.currentTab === 'jobs') {
                    this.loadJobListings();
                }
            }
        } catch (error) {
            console.error('구인정보 등록 실패:', error);
            alert('구인정보 등록에 실패했습니다. 다시 시도해주세요.');
        }
    }
    
    resetJobForm() {
        const form = document.getElementById('job-register-form');
        if (form) {
            form.reset();
        }
    }
    
    getJobCategoryFromTitle(title) {
        const categories = {
            '제조': '제조업',
            '생산': '제조업',
            '공장': '제조업',
            'IT': 'IT/소프트웨어',
            '개발': 'IT/소프트웨어',
            '프로그래밍': 'IT/소프트웨어',
            '서비스': '서비스업',
            '영업': '영업/마케팅',
            '마케팅': '영업/마케팅',
            '건설': '건설업',
            '토목': '건설업',
            '농업': '농업/어업',
            '어업': '농업/어업'
        };
        
        for (const keyword in categories) {
            if (title.includes(keyword)) {
                return categories[keyword];
            }
        }
        
        return '기타';
    }
    
    setupJobSeekerSubTabs() {
        const jobSeekerViewBtn = document.getElementById('jobseeker-view-btn');
        const jobSeekerRegisterBtn = document.getElementById('jobseeker-register-btn');
        
        if (jobSeekerViewBtn && jobSeekerRegisterBtn) {
            jobSeekerViewBtn.addEventListener('click', () => this.showJobSeekerView());
            jobSeekerRegisterBtn.addEventListener('click', () => this.showJobSeekerRegister());
        }
    }
    
    showJobSeekerView() {
        // 버튼 상태 변경
        document.querySelectorAll('.jobseeker-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const viewBtn = document.getElementById('jobseeker-view-btn');
        viewBtn.classList.remove('bg-gray-300', 'text-gray-700');
        viewBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('jobseeker-view-section').classList.remove('hidden');
        document.getElementById('jobseeker-register-section').classList.add('hidden');
        
        // 구직자 정보 새로고침
        this.loadJobSeekers();
    }
    
    showJobSeekerRegister() {
        // 버튼 상태 변경
        document.querySelectorAll('.jobseeker-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const registerBtn = document.getElementById('jobseeker-register-btn');
        registerBtn.classList.remove('bg-gray-300', 'text-gray-700');
        registerBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('jobseeker-view-section').classList.add('hidden');
        document.getElementById('jobseeker-register-section').classList.remove('hidden');
    }
    
    setupJobSeekerRegistration() {
        const form = document.getElementById('jobseeker-register-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleJobSeekerRegistration(e));
        }
    }
    
    async handleJobSeekerRegistration(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('jobseeker-name').value,
            email: document.getElementById('jobseeker-email').value,
            password: 'temp_password_' + Date.now(), // 임시 비밀번호
            birth_date: document.getElementById('jobseeker-birth-date').value,
            gender: document.getElementById('jobseeker-gender').value,
            nationality: document.getElementById('jobseeker-nationality').value,
            phone: document.getElementById('jobseeker-phone').value,
            current_visa: document.getElementById('jobseeker-current-visa').value,
            desired_visa: document.getElementById('jobseeker-desired-visa').value,
            current_address: document.getElementById('jobseeker-address').value,
            korean_level: document.getElementById('jobseeker-korean-level').value,
            education_level: document.getElementById('jobseeker-education').value,
            work_experience: document.getElementById('jobseeker-experience').value || null,
            agent_id: parseInt(document.getElementById('jobseeker-agent-id').value) || 1
        };
        
        try {
            const response = await axios.post('/api/job-seekers', formData);
            
            if (response.status === 201) {
                // 성공 메시지 표시
                document.getElementById('jobseeker-register-success').classList.remove('hidden');
                
                // 폼 초기화
                this.resetJobSeekerForm();
                
                // 3초 후 성공 메시지 숨김
                setTimeout(() => {
                    document.getElementById('jobseeker-register-success').classList.add('hidden');
                }, 3000);
                
                // 구직자 목록 새로고침
                if (this.currentTab === 'jobseekers') {
                    this.loadJobSeekers();
                }
            }
        } catch (error) {
            console.error('구직정보 등록 실패:', error);
            if (error.response && error.response.data && error.response.data.error) {
                alert('구직정보 등록 실패: ' + error.response.data.error);
            } else {
                alert('구직정보 등록에 실패했습니다. 다시 시도해주세요.');
            }
        }
    }
    
    resetJobSeekerForm() {
        const form = document.getElementById('jobseeker-register-form');
        if (form) {
            form.reset();
        }
    }
    
    setupStudySubTabs() {
        const studyLanguageBtn = document.getElementById('study-language-btn');
        const studyUndergraduateBtn = document.getElementById('study-undergraduate-btn');
        const studyGraduateBtn = document.getElementById('study-graduate-btn');
        
        if (studyLanguageBtn && studyUndergraduateBtn && studyGraduateBtn) {
            studyLanguageBtn.addEventListener('click', () => this.showStudyLanguage());
            studyUndergraduateBtn.addEventListener('click', () => this.showStudyUndergraduate());
            studyGraduateBtn.addEventListener('click', () => this.showStudyGraduate());
        }
    }
    
    showStudyLanguage() {
        // 버튼 상태 변경
        document.querySelectorAll('.study-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const languageBtn = document.getElementById('study-language-btn');
        languageBtn.classList.remove('bg-gray-300', 'text-gray-700');
        languageBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('study-language-section').classList.remove('hidden');
        document.getElementById('study-undergraduate-section').classList.add('hidden');
        document.getElementById('study-graduate-section').classList.add('hidden');
    }
    
    showStudyUndergraduate() {
        // 버튼 상태 변경
        document.querySelectorAll('.study-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const undergraduateBtn = document.getElementById('study-undergraduate-btn');
        undergraduateBtn.classList.remove('bg-gray-300', 'text-gray-700');
        undergraduateBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('study-language-section').classList.add('hidden');
        document.getElementById('study-undergraduate-section').classList.remove('hidden');
        document.getElementById('study-graduate-section').classList.add('hidden');
    }
    
    showStudyGraduate() {
        // 버튼 상태 변경
        document.querySelectorAll('.study-sub-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-300', 'text-gray-700');
        });
        
        const graduateBtn = document.getElementById('study-graduate-btn');
        graduateBtn.classList.remove('bg-gray-300', 'text-gray-700');
        graduateBtn.classList.add('bg-primary', 'text-white');
        
        // 컨텐츠 표시/숨김
        document.getElementById('study-language-section').classList.add('hidden');
        document.getElementById('study-undergraduate-section').classList.add('hidden');
        document.getElementById('study-graduate-section').classList.remove('hidden');
    }

    setupUserNavigation() {
        // 로컬 스토리지에서 사용자 정보 확인
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const token = localStorage.getItem('token');

        const authButtons = document.getElementById('auth-buttons');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const agentMenu = document.getElementById('agent-menu');
        const mobileAgentMenu = document.getElementById('mobile-agent-menu');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const logoutBtn = document.getElementById('logout-btn');

        console.log('setupUserNavigation called:', { user, token, authButtons });

        if (user && token) {
            // 로그인 상태 - 인라인 스타일 직접 조작으로 숨김
            if (authButtons) {
                authButtons.style.display = 'none';
                authButtons.classList.add('hidden');
            }
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            if (registerBtn) {
                registerBtn.style.display = 'none';
            }
            if (userMenu) {
                userMenu.classList.remove('hidden');
                userMenu.style.display = 'flex';
            }
            if (userName) userName.textContent = user.name || user.company_name || user.email || '사용자님';

            // 권한별 메뉴 업데이트
            this.updateMenusByUserType(user.type, user.id);

            // 로그아웃 버튼 이벤트 (중복 이벤트 방지)
            if (logoutBtn && !logoutBtn.hasAttribute('data-event-bound')) {
                logoutBtn.addEventListener('click', () => {
                    this.logout();
                });
                logoutBtn.setAttribute('data-event-bound', 'true');
            }
        } else {
            // 로그아웃 상태 - 인라인 스타일 직접 조작으로 표시
            if (authButtons) {
                authButtons.style.display = 'flex';
                authButtons.classList.remove('hidden');
            }
            if (loginBtn) {
                loginBtn.style.display = 'inline-block';
            }
            if (registerBtn) {
                registerBtn.style.display = 'inline-block';
            }
            if (userMenu) {
                userMenu.classList.add('hidden');
                userMenu.style.display = 'none';
            }
            if (agentMenu) agentMenu.classList.add('hidden');
            if (mobileAgentMenu) mobileAgentMenu.classList.add('hidden');
            
            // 기본 메뉴로 복원
            this.updateMenusByUserType('guest');
        }
    }

    updateMenusByUserType(userType, userId = null) {
        const agentMenu = document.getElementById('agent-menu');
        const mobileAgentMenu = document.getElementById('mobile-agent-menu');
        
        // 기본 메뉴 텍스트 업데이트
        this.updateMenuLabels(userType);
        
        // 권한별 메뉴 표시/숨김
        switch(userType) {
            case 'admin':
                // 관리자 메뉴 표시
                if (agentMenu) {
                    agentMenu.classList.remove('hidden');
                    agentMenu.textContent = '관리자';
                    agentMenu.href = `/static/admin-dashboard.html`;
                }
                if (mobileAgentMenu) {
                    mobileAgentMenu.classList.remove('hidden');
                    const mobileAgentLink = mobileAgentMenu.querySelector('a');
                    if (mobileAgentLink) {
                        mobileAgentLink.textContent = '관리자 대시보드';
                        mobileAgentLink.href = `/static/admin-dashboard.html`;
                    }
                }
                break;
            case 'agent':
                // 에이전트 메뉴 표시
                if (agentMenu) {
                    agentMenu.classList.remove('hidden');
                    agentMenu.textContent = '에이전트';
                    agentMenu.href = `/static/agent-dashboard?agentId=${userId}`;
                }
                if (mobileAgentMenu) {
                    mobileAgentMenu.classList.remove('hidden');
                    const mobileAgentLink = mobileAgentMenu.querySelector('a');
                    if (mobileAgentLink) {
                        mobileAgentLink.textContent = '에이전트 대시보드';
                        mobileAgentLink.href = `/static/agent-dashboard?agentId=${userId}`;
                    }
                }
                break;
            case 'employer':
                // 구인기업 전용 메뉴
                if (agentMenu) agentMenu.classList.add('hidden');
                if (mobileAgentMenu) mobileAgentMenu.classList.add('hidden');
                break;
            case 'jobseeker':
                // 구직자 전용 메뉴
                if (agentMenu) agentMenu.classList.add('hidden');
                if (mobileAgentMenu) mobileAgentMenu.classList.add('hidden');
                break;
            case 'guest':
            default:
                // 비로그인 상태
                if (agentMenu) agentMenu.classList.add('hidden');
                if (mobileAgentMenu) mobileAgentMenu.classList.add('hidden');
                break;
        }
    }

    updateMenuLabels(userType) {
        // 구인정보 메뉴 텍스트 업데이트
        const jobViewLinks = document.querySelectorAll('[onclick*="showJobListView"]');
        const jobRegisterLinks = document.querySelectorAll('[onclick*="showJobRegisterForm"]');
        
        // 구직정보 메뉴 텍스트 업데이트
        const jobSeekerViewLinks = document.querySelectorAll('[onclick*="showJobSeekerListView"]');
        const jobSeekerRegisterLinks = document.querySelectorAll('[onclick*="showJobSeekerRegisterForm"]');

        switch(userType) {
            case 'employer':
                // 구인기업용 메뉴
                jobViewLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-edit';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>내 구인정보 관리`;
                });
                jobRegisterLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-plus';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>구인정보 등록`;
                });
                break;
                
            case 'jobseeker':
                // 구직자용 메뉴
                jobSeekerViewLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-user';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>내 프로필 관리`;
                });
                jobSeekerRegisterLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-file-alt';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>지원 이력`;
                });
                break;
                
            case 'admin':
                // 관리자용 메뉴 (기본값 유지)
                break;
                
            case 'agent':
                // 에이전트용 메뉴 (기본값 유지)
                break;
                
            case 'guest':
            default:
                // 비로그인용 메뉴 (기본값 유지)
                jobViewLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-list';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>구인정보 보기`;
                });
                jobRegisterLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-plus';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>구인정보 등록`;
                });
                jobSeekerViewLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-users';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>구직자 보기`;
                });
                jobSeekerRegisterLinks.forEach(link => {
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : 'fas fa-user-plus';
                    link.innerHTML = `<i class="${iconClass} mr-2"></i>구직정보 등록`;
                });
                break;
        }
    }

    logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.reload();
        }
    }

    bindEvents() {
        // 모바일 메뉴 토글
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                const icon = mobileMenuBtn.querySelector('i');
                if (mobileMenu.classList.contains('hidden')) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                } else {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                }
            });
        }

        // 데스크톱 드롭다운 메뉴 개선
        this.setupDropdownMenus();
        
        // 추가 이벤트 바인딩
        window.addEventListener('resize', () => {
            // 반응형 처리 - 데스크톱에서는 모바일 메뉴 숨김
            if (window.innerWidth >= 768) {
                if (mobileMenu) {
                    mobileMenu.classList.add('hidden');
                }
                if (mobileMenuBtn) {
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // 문서 클릭시 드롭다운 메뉴 닫기
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('.nav-dropdown');
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
        });
    }

    setupDropdownMenus() {
        const dropdowns = document.querySelectorAll('.nav-dropdown');
        
        dropdowns.forEach(dropdown => {
            const button = dropdown.querySelector('.nav-dropdown-btn');
            const menu = dropdown.querySelector('.nav-dropdown-menu');
            const icon = button?.querySelector('i.fa-chevron-down');
            
            if (button && menu) {
                // 호버 이벤트
                dropdown.addEventListener('mouseenter', () => {
                    dropdown.classList.add('active');
                    if (icon) {
                        icon.style.transform = 'rotate(180deg)';
                    }
                });
                
                dropdown.addEventListener('mouseleave', () => {
                    dropdown.classList.remove('active');
                    if (icon) {
                        icon.style.transform = 'rotate(0deg)';
                    }
                });

                // 클릭 이벤트 (터치 기기용)
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                    if (icon) {
                        const isActive = dropdown.classList.contains('active');
                        icon.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                });
            }
        });
    }

    // 로그인 상태 확인
    checkAuthStatus() {
        this.isLoggedIn = !!localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    }

    // 로그인 상태에 따른 UI 업데이트
    updateAuthUI() {
        // 로그인 상태 재확인
        this.checkAuthStatus();
        
        setTimeout(() => {
            // 사용자 네비게이션 업데이트
            this.setupUserNavigation();
            
            // 구인정보 자세히 보기 버튼 업데이트
            document.querySelectorAll('.job-detail-text').forEach(btn => {
                if (!this.isLoggedIn) {
                    btn.innerHTML = '<i class="fas fa-lock mr-1"></i>로그인 필요';
                    btn.parentElement.classList.add('opacity-75');
                } else {
                    btn.innerHTML = '자세히 보기';
                    btn.parentElement.classList.remove('opacity-75');
                }
            });

            // 구직자 프로필 보기 버튼 업데이트
            document.querySelectorAll('.jobseeker-detail-text').forEach(btn => {
                if (!this.isLoggedIn) {
                    btn.innerHTML = '<i class="fas fa-lock mr-1"></i>로그인 필요';
                    btn.parentElement.classList.add('opacity-75');
                } else {
                    btn.innerHTML = '프로필 보기';
                    btn.parentElement.classList.remove('opacity-75');
                }
            });
        }, 500); // DOM 렌더링 후 실행
    }

    // 로그인 필요 알림 표시
    showLoginRequiredAlert(contentType) {
        const message = `🔐 로그인이 필요합니다

${contentType}의 상세 내용을 보시려면 먼저 로그인해주세요.

✅ 로그인 후 이용 가능한 기능:
• ${contentType} 상세 정보 열람
• 연락처 및 담당자 정보
• 지원서 작성 및 제출
• 매칭 서비스 이용

지금 로그인하시겠습니까?`;

        if (confirm(message)) {
            window.location.href = '/static/login.html';
        }
    }

    // 에이전트 목록 로드
    async loadAgentsForSelection() {
        try {
            const response = await fetch('/api/agents/active');
            if (response.ok) {
                const agents = await response.json();
                const agentSelect = document.getElementById('agent-select');
                
                if (agentSelect) {
                    // 기존 옵션 제거 (첫 번째 옵션 제외)
                    while (agentSelect.children.length > 1) {
                        agentSelect.removeChild(agentSelect.lastChild);
                    }
                    
                    // 에이전트 옵션 추가
                    agents.forEach(agent => {
                        const option = document.createElement('option');
                        option.value = agent.id;
                        option.textContent = `${agent.company_name} (${agent.contact_person}) - ${agent.country}`;
                        agentSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('에이전트 목록 로드 실패:', error);
        }
    }

    // 에이전트 선택 시 UI 업데이트 설정
    setupAgentSelection() {
        const agentSelect = document.getElementById('agent-select');
        const agentFeeInput = document.getElementById('agent-fee');
        const agentNotesTextarea = document.getElementById('agent-notes');
        
        if (agentSelect && agentFeeInput && agentNotesTextarea) {
            agentSelect.addEventListener('change', (e) => {
                const isAgentSelected = e.target.value !== '';
                
                // 에이전트가 선택된 경우 수수료 및 노트 필드 활성화
                agentFeeInput.disabled = !isAgentSelected;
                agentNotesTextarea.disabled = !isAgentSelected;
                
                if (!isAgentSelected) {
                    agentFeeInput.value = '';
                    agentNotesTextarea.value = '';
                } else {
                    // 기본 수수료율 설정 (필요에 따라 조정)
                    if (!agentFeeInput.value) {
                        agentFeeInput.value = '5.0';
                    }
                }
            });
        }
    }
}

// 네비게이션 드롭다운 함수들 - 권한별 라우팅
function showJobListView() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // 비로그인 상태 - 일반 구인정보 보기
        if (app) {
            app.switchTab('jobs');
            app.showJobView();
            setTimeout(() => {
                document.getElementById('content-jobs')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else if (user.type === 'employer') {
        // 구인기업 - 내 구인정보 관리 페이지로 이동
        window.location.href = `/static/employer-dashboard.html?employerId=${user.id}`;
    } else {
        // 기타 로그인 사용자 - 일반 구인정보 보기
        if (app) {
            app.switchTab('jobs');
            app.showJobView();
            setTimeout(() => {
                document.getElementById('content-jobs')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    }
}

function showJobRegisterForm() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // 비로그인 상태 - 로그인 요구
        if (confirm('구인정보 등록은 로그인이 필요합니다.\n로그인하시겠습니까?')) {
            window.location.href = '/static/login.html';
        }
        return;
    }
    
    if (user.type === 'employer') {
        // 구인기업 - 구인정보 등록 페이지로 이동
        window.location.href = `/static/job-register.html?employerId=${user.id}`;
    } else if (user.type === 'agent' || user.type === 'admin') {
        // 에이전트/관리자 - 기본 등록 폼
        if (app) {
            app.switchTab('jobs');
            app.showJobRegister();
            setTimeout(() => {
                document.getElementById('content-jobs')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else {
        // 구직자 등 - 권한 없음 알림
        alert('구인정보 등록은 기업 회원만 가능합니다.\n기업 회원으로 회원가입하시겠습니까?');
        if (confirm('기업 회원가입 페이지로 이동하시겠습니까?')) {
            window.location.href = '/static/register.html?type=employer';
        }
    }
}

function resetJobForm() {
    if (app) {
        app.resetJobForm();
    }
}

function showJobSeekerListView() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // 비로그인 상태 - 일반 구직자 보기 (제한적)
        if (app) {
            app.switchTab('jobseekers');
            app.showJobSeekerView();
            setTimeout(() => {
                document.getElementById('content-jobseekers')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else if (user.type === 'jobseeker') {
        // 구직자 - 내 프로필 관리 페이지로 이동
        window.location.href = `/static/jobseeker-profile.html?jobSeekerId=${user.id}`;
    } else {
        // 기타 로그인 사용자 - 일반 구직자 보기
        if (app) {
            app.switchTab('jobseekers');
            app.showJobSeekerView();
            setTimeout(() => {
                document.getElementById('content-jobseekers')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    }
}

function showJobSeekerRegisterForm() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // 비로그인 상태 - 구직자 회원가입으로 이동
        if (confirm('구직정보 등록은 회원가입이 필요합니다.\n구직자로 회원가입하시겠습니까?')) {
            window.location.href = '/static/register.html?type=jobseeker';
        }
        return;
    }
    
    if (user.type === 'jobseeker') {
        // 구직자 - 지원 이력 관리 페이지로 이동
        window.location.href = `/static/application-history.html?jobSeekerId=${user.id}`;
    } else if (user.type === 'agent' || user.type === 'admin') {
        // 에이전트/관리자 - 구직자 등록 폼
        if (app) {
            app.switchTab('jobseekers');
            app.showJobSeekerRegister();
            setTimeout(() => {
                document.getElementById('content-jobseekers')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else {
        // 기업 등 - 권한 없음 알림
        alert('구직정보는 구직자 본인 또는 에이전트만 등록할 수 있습니다.');
    }
}

function resetJobSeekerForm() {
    if (app) {
        app.resetJobSeekerForm();
    }
}

function showLanguageStudyView() {
    if (app) {
        app.switchTab('study');
        app.showStudyLanguage();
        // 페이지 부드럽게 스크롤
        setTimeout(() => {
            document.getElementById('content-study')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

function showUndergraduateView() {
    if (app) {
        app.switchTab('study');
        app.showStudyUndergraduate();
        // 페이지 부드럽게 스크롤
        setTimeout(() => {
            document.getElementById('content-study')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

function showGraduateView() {
    if (app) {
        app.switchTab('study');
        app.showStudyGraduate();
        // 페이지 부드럽게 스크롤
        setTimeout(() => {
            document.getElementById('content-study')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

// 모바일 메뉴 닫기 함수
function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    if (mobileMenu && mobileMenuBtn) {
        mobileMenu.classList.add('hidden');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

// 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new JobPlatformApp();
});