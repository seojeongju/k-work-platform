// 외국인 구인구직 플랫폼 Frontend JavaScript

class JobPlatformApp {
    constructor() {
        this.currentTab = 'jobs';
        this.isLoggedIn = false;
        this.currentUser = {};
        
        // 무한 스크롤을 위한 데이터 관리
        this.jobsData = {
            items: [],
            page: 1,
            hasMore: true,
            loading: false,
            total: 0
        };
        
        this.jobSeekersData = {
            items: [],
            page: 1,
            hasMore: true,
            loading: false,
            total: 0
        };
        
        // 필터링 상태
        this.currentFilters = {
            jobs: {},
            jobseekers: {}
        };
        
        this.init();
    }

    init() {
        console.log('JobPlatformApp initializing...');
        this.setupTabs();
        this.setupJobSubTabs();
        this.setupJobSeekerSubTabs();
        this.setupStudySubTabs();
        this.setupJobRegistration();
        this.loadInitialData();
        this.bindEvents();
        
        // 기본 탭을 jobs로 설정하고 구인정보 보기 활성화
        setTimeout(() => {
            this.switchTab('jobs');
            this.showJobView();
        }, 100);
        
        // 즉시 한 번 실행
        this.setupUserNavigation();
        
        // DOM 변경 감시 시작
        this.startAuthObserver();
        
        // DOM이 완전히 로드된 후 사용자 네비게이션 설정
        setTimeout(() => {
            console.log('Running delayed setupUserNavigation...');
            this.setupUserNavigation();
        }, 200);
        
        // 추가로 더 지연 후에도 실행
        setTimeout(() => {
            console.log('Running final setupUserNavigation...');
            this.setupUserNavigation();
        }, 1000);
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
            btn.classList.remove('active');
        });
        
        const activeButton = document.getElementById(`tab-${tabId}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeContent = document.getElementById(`content-${tabId}`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }
        
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
        await this.loadJobSeekers();
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

    async loadJobListings(reset = false) {
        if (this.jobsData.loading || (!reset && !this.jobsData.hasMore)) return;
        
        this.jobsData.loading = true;
        
        try {
            console.log(`Loading job listings... Page: ${reset ? 1 : this.jobsData.page}`);
            
            if (reset) {
                this.jobsData.page = 1;
                this.jobsData.items = [];
                this.jobsData.hasMore = true;
            }
            
            // 필터 파라미터 구성
            const filterParams = new URLSearchParams();
            filterParams.append('page', this.jobsData.page);
            filterParams.append('limit', '10'); // 더 많은 데이터 로딩
            
            // 필터링 적용 - 백엔드 API 파라미터 이름에 맞춤
            Object.entries(this.currentFilters.jobs).forEach(([key, value]) => {
                if (value && value !== '' && value !== 'all' && value !== null && value !== undefined) {
                    console.log(`구인정보 필터 파라미터 추가: ${key} = ${value}`);
                    filterParams.append(key, value);
                }
            });
            
            const apiUrl = `/api/jobs?${filterParams.toString()}`;
            console.log('구인정보 API 호출:', apiUrl);
            
            const response = await axios.get(apiUrl);
            const jobs = response.data.jobs || [];
            
            console.log(`Jobs data received: ${jobs.length} items, Page: ${this.jobsData.page}`);
            console.log('받은 구인정보 데이터:', jobs.slice(0, 2)); // 처음 2개만 로그
            
            // 데이터 추가
            if (reset) {
                this.jobsData.items = jobs;
            } else {
                this.jobsData.items = [...this.jobsData.items, ...jobs];
            }
            
            // 더 이상 로드할 데이터가 있는지 확인
            if (jobs.length < 10) {
                this.jobsData.hasMore = false;
            } else {
                this.jobsData.page++;
            }
            
            // UI 업데이트
            this.renderJobListings();
            
        } catch (error) {
            console.error('구인 정보 로드 실패:', error);
            this.showJobListingsError();
        } finally {
            this.jobsData.loading = false;
        }
    }
    
    renderJobListings() {
        const jobs = this.jobsData.items;
        
        // Update main dashboard jobs list
        const jobsContainer = document.getElementById('jobs-list');
        if (jobsContainer) {
            jobsContainer.innerHTML = '';
            if (jobs && jobs.length > 0) {
                jobs.forEach(job => {
                    jobsContainer.appendChild(this.createJobCard(job));
                });
            } else {
                jobsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 구인 정보가 없습니다.</p>';
            }
        }
        
        // Update main page preview (처음 5개만)
        const previewContainer = document.getElementById('job-list-preview');
        if (previewContainer) {
            console.log('Updating job preview container...');
            const previewJobs = jobs.slice(0, 5);
            
            if (previewJobs.length > 0) {
                previewContainer.innerHTML = previewJobs.map(job => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onclick="showJobDetail(${job.id})">
                        <div class="flex justify-between items-start mb-2">
                            <h5 class="font-bold text-gray-900 truncate flex-1">${job.title}</h5>
                            <span class="text-xs bg-blue-600 text-white px-2 py-1 rounded ml-2">${this.getVisaDisplayName(job.required_visa)}</span>
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-building mr-1"></i>${job.company_name || '회사명 미제공'}
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-map-marker-alt mr-1"></i>${job.work_location || '위치 미제공'}
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-medium text-green-600">
                                월 ${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}
                            </span>
                            <span class="text-xs text-gray-500">
                                ${this.formatDate(job.created_at)}
                            </span>
                        </div>
                    </div>
                `).join('');
                
                // 무한 스크롤 더보기 버튼 추가
                if (this.jobsData.hasMore) {
                    previewContainer.innerHTML += `
                        <div class="text-center pt-4">
                            <button onclick="app.loadMoreJobs()" 
                                    class="text-blue-600 hover:text-blue-800 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors ${this.jobsData.loading ? 'opacity-50 cursor-not-allowed' : ''}">
                                ${this.jobsData.loading ? '로딩 중...' : '더 많은 구인정보 보기 →'}
                            </button>
                        </div>
                    `;
                }
            } else {
                previewContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 구인 정보가 없습니다.</p>';
            }
        }
        
        // Update full list containers with infinite scroll
        this.renderFullJobList();
    }
    
    renderFullJobList() {
        const fullListContainer = document.getElementById('jobs-full-list');
        if (!fullListContainer) return;
        
        const jobs = this.jobsData.items;
        
        fullListContainer.innerHTML = jobs.map(job => `
            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer mb-4"
                 onclick="showJobDetail(${job.id})">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-bold text-gray-900 flex-1">${job.title}</h3>
                    <div class="flex gap-2 ml-4">
                        <span class="text-xs bg-blue-600 text-white px-3 py-1 rounded-full">${this.getVisaDisplayName(job.required_visa)}</span>
                        <span class="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full">${this.getJobCategoryDisplay(job.job_category)}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-building mr-2"></i><strong>회사:</strong> ${job.company_name || '회사명 미제공'}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-map-marker-alt mr-2"></i><strong>위치:</strong> ${job.work_location || '위치 미제공'}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-clock mr-2"></i><strong>근무시간:</strong> ${job.work_hours || '협의'}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-2"></i><strong>마감일:</strong> ${job.deadline || '상시모집'}
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-lg font-semibold text-green-600">
                        월 ${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}
                    </div>
                    <div class="text-sm text-gray-500">
                        등록일: ${this.formatDate(job.created_at)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 로딩 스피너 또는 더보기 버튼 추가
        if (this.jobsData.loading) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-gray-600 mt-2">로딩 중...</p>
                </div>
            `;
        } else if (this.jobsData.hasMore) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <button onclick="app.loadMoreJobs()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        더 많은 구인정보 보기
                    </button>
                </div>
            `;
        } else if (jobs.length > 0) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <p class="text-gray-500">모든 구인정보를 확인했습니다.</p>
                </div>
            `;
        }
    }
    
    async loadMoreJobs() {
        await this.loadJobListings(false);
    }
    
    showJobListingsError() {
        const containers = ['jobs-list', 'job-list-preview', 'jobs-full-list'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<p class="text-red-500 text-center py-8">구인 정보를 불러오는데 실패했습니다.</p>';
            }
        });
    }

    async loadJobSeekers(reset = false) {
        if (this.jobSeekersData.loading || (!reset && !this.jobSeekersData.hasMore)) return;
        
        this.jobSeekersData.loading = true;
        
        try {
            console.log(`Loading job seekers... Page: ${reset ? 1 : this.jobSeekersData.page}`);
            
            if (reset) {
                this.jobSeekersData.page = 1;
                this.jobSeekersData.items = [];
                this.jobSeekersData.hasMore = true;
            }
            
            // 필터 파라미터 구성
            const filterParams = new URLSearchParams();
            filterParams.append('page', this.jobSeekersData.page);
            filterParams.append('limit', '10'); // 더 많은 데이터 로딩
            
            // 필터링 적용 - 백엔드 API 파라미터 이름에 맞춤
            Object.entries(this.currentFilters.jobseekers).forEach(([key, value]) => {
                if (value && value !== '' && value !== 'all' && value !== null && value !== undefined) {
                    console.log(`구직자 필터 파라미터 추가: ${key} = ${value}`);
                    filterParams.append(key, value);
                }
            });
            
            const apiUrl = `/api/jobseekers?${filterParams.toString()}`;
            console.log('구직자 API 호출:', apiUrl);
            
            const response = await axios.get(apiUrl);
            const jobseekers = response.data.jobseekers || [];
            
            console.log(`JobSeekers data received: ${jobseekers.length} items, Page: ${this.jobSeekersData.page}`);
            console.log('받은 구직자 데이터:', jobseekers.slice(0, 2)); // 처음 2개만 로그
            
            // 데이터 추가
            if (reset) {
                this.jobSeekersData.items = jobseekers;
            } else {
                this.jobSeekersData.items = [...this.jobSeekersData.items, ...jobseekers];
            }
            
            // 더 이상 로드할 데이터가 있는지 확인
            if (jobseekers.length < 10) {
                this.jobSeekersData.hasMore = false;
            } else {
                this.jobSeekersData.page++;
            }
            
            // UI 업데이트
            this.renderJobSeekerListings();
            
        } catch (error) {
            console.error('구직자 정보 로드 실패:', error);
            this.showJobSeekersError();
        } finally {
            this.jobSeekersData.loading = false;
        }
    }
    
    renderJobSeekerListings() {
        const jobseekers = this.jobSeekersData.items;
        
        // Update main page preview (처음 5개만)
        const previewContainer = document.getElementById('jobseeker-list-preview');
        if (previewContainer) {
            console.log('Updating jobseeker preview container...');
            const previewJobSeekers = jobseekers.slice(0, 5);
            
            if (previewJobSeekers.length > 0) {
                previewContainer.innerHTML = previewJobSeekers.map(jobseeker => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onclick="showJobSeekerDetail(${jobseeker.id})">
                        <div class="flex justify-between items-start mb-2">
                            <h5 class="font-bold text-gray-900 truncate flex-1">${jobseeker.name}</h5>
                            <span class="text-xs bg-green-600 text-white px-2 py-1 rounded ml-2">${this.getVisaDisplayName(jobseeker.desired_visa)}</span>
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-flag mr-1"></i>${jobseeker.nationality || '국적 미제공'}
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-briefcase mr-1"></i>${this.getJobCategoryDisplay(jobseeker.desired_job_category)}
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-medium text-blue-600">
                                희망 급여: 월 ${this.formatSalary(jobseeker.desired_salary_min)} - ${this.formatSalary(jobseeker.desired_salary_max)}
                            </span>
                            <span class="text-xs text-gray-500">
                                ${this.formatDate(jobseeker.created_at)}
                            </span>
                        </div>
                    </div>
                `).join('');
                
                // 무한 스크롤 더보기 버튼 추가
                if (this.jobSeekersData.hasMore) {
                    previewContainer.innerHTML += `
                        <div class="text-center pt-4">
                            <button onclick="app.loadMoreJobSeekers()" 
                                    class="text-green-600 hover:text-green-800 font-medium text-sm bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors ${this.jobSeekersData.loading ? 'opacity-50 cursor-not-allowed' : ''}">
                                ${this.jobSeekersData.loading ? '로딩 중...' : '더 많은 구직자 보기 →'}
                            </button>
                        </div>
                    `;
                }
            } else {
                previewContainer.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 구직자 정보가 없습니다.</p>';
            }
        }
        
        // Update full list containers
        this.renderFullJobSeekerList();
    }
    
    renderFullJobSeekerList() {
        const fullListContainer = document.getElementById('jobseekers-full-list');
        if (!fullListContainer) return;
        
        const jobseekers = this.jobSeekersData.items;
        
        fullListContainer.innerHTML = jobseekers.map(jobseeker => `
            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer mb-4"
                 onclick="showJobSeekerDetail(${jobseeker.id})">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-bold text-gray-900 flex-1">${jobseeker.name}</h3>
                    <div class="flex gap-2 ml-4">
                        <span class="text-xs bg-green-600 text-white px-3 py-1 rounded-full">${this.getVisaDisplayName(jobseeker.desired_visa)}</span>
                        <span class="text-xs bg-blue-200 text-blue-700 px-3 py-1 rounded-full">${jobseeker.nationality || '미제공'}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-briefcase mr-2"></i><strong>희망 직종:</strong> ${this.getJobCategoryDisplay(jobseeker.desired_job_category)}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-graduation-cap mr-2"></i><strong>학력:</strong> ${jobseeker.education_level || '미제공'}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-language mr-2"></i><strong>한국어 수준:</strong> ${jobseeker.korean_level || '미제공'}
                    </div>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-birthday-cake mr-2"></i><strong>나이:</strong> ${jobseeker.age ? `${jobseeker.age}세` : '미제공'}
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-lg font-semibold text-green-600">
                        희망 급여: 월 ${this.formatSalary(jobseeker.desired_salary_min)} - ${this.formatSalary(jobseeker.desired_salary_max)}
                    </div>
                    <div class="text-sm text-gray-500">
                        등록일: ${this.formatDate(jobseeker.created_at)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 로딩 스피너 또는 더보기 버튼 추가
        if (this.jobSeekersData.loading) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p class="text-gray-600 mt-2">로딩 중...</p>
                </div>
            `;
        } else if (this.jobSeekersData.hasMore) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <button onclick="app.loadMoreJobSeekers()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        더 많은 구직자 보기
                    </button>
                </div>
            `;
        } else if (jobseekers.length > 0) {
            fullListContainer.innerHTML += `
                <div class="text-center py-8">
                    <p class="text-gray-500">모든 구직자 정보를 확인했습니다.</p>
                </div>
            `;
        }
    }
    
    async loadMoreJobSeekers() {
        await this.loadJobSeekers(false);
    }
    
    showJobSeekersError() {
        const containers = ['jobseekers-list', 'jobseeker-list-preview', 'jobseekers-full-list'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<p class="text-red-500 text-center py-8">구직자 정보를 불러오는데 실패했습니다.</p>';
            }
        });
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

    // 상세 조회 메서드는 아래에 어향상된 버전으로 대체됨
    // 기존 displayJobDetailModal은 displayEnhancedJobDetailModal로 대체됨

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
                    <h4 class="text-lg font-semibold text-gray-800">${jobSeeker.name || 'Unknown'}</h4>
                    <p class="text-sm text-gray-600">${jobSeeker.nationality || 'N/A'}</p>
                </div>
                <div class="flex flex-col space-y-1">
                    ${jobSeeker.current_visa ? `<span class="badge badge-blue text-xs">${jobSeeker.current_visa}</span>` : ''}
                    ${jobSeeker.korean_level ? `<span class="badge badge-green text-xs">${koreanLevelMap[jobSeeker.korean_level] || jobSeeker.korean_level}</span>` : ''}
                </div>
            </div>
            
            <div class="space-y-1 text-sm text-gray-600 mb-3">
                ${jobSeeker.desired_job_category ? `<div><i class="fas fa-briefcase w-4 mr-2"></i>희망: ${jobSeeker.desired_job_category}</div>` : ''}
                ${jobSeeker.education_level ? `<div><i class="fas fa-graduation-cap w-4 mr-2"></i>학력: ${jobSeeker.education_level}</div>` : ''}
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t">
                <span class="text-xs text-gray-500">
                    등록: ${jobSeeker.created_at ? new Date(jobSeeker.created_at).toLocaleDateString('ko-KR') : 'N/A'}
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
        
        if (jobViewBtn) {
            jobViewBtn.addEventListener('click', () => this.showJobView());
        }
        // 구인정보 등록 버튼 제거 - 더 이상 사용하지 않음
    }
    
    showJobView() {
        // 버튼 상태 변경
        document.querySelectorAll('.job-sub-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        
        const viewBtn = document.getElementById('job-view-btn');
        if (viewBtn) {
            viewBtn.classList.remove('btn-secondary');
            viewBtn.classList.add('btn-primary');
        }
        
        // 컨텐츠 표시/숨김
        const viewSection = document.getElementById('job-view-section');
        const registerSection = document.getElementById('job-register-section');
        
        if (viewSection) viewSection.classList.remove('hidden');
        if (registerSection) registerSection.classList.add('hidden');
        
        // 구인 정보 새로고침
        this.loadJobListings();
    }

    viewJobSeekerProfile(jobSeekerId) {
        alert(`구직자 프로필 보기 (ID: ${jobSeekerId})\n상세 프로필 페이지는 추후 구현됩니다.`);
    }
    
    // showJobRegister() 메소드 제거 - 구인정보 등록 기능 비활성화
    
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
        
        if (jobSeekerViewBtn) {
            jobSeekerViewBtn.addEventListener('click', () => this.showJobSeekerView());
        }
    }
    
    showJobSeekerView() {
        // 버튼 상태 변경
        document.querySelectorAll('.jobseeker-sub-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        
        const viewBtn = document.getElementById('jobseeker-view-btn');
        if (viewBtn) {
            viewBtn.classList.remove('btn-secondary');
            viewBtn.classList.add('btn-primary');
        }
        
        // 컨텐츠 표시/숨김
        const viewSection = document.getElementById('jobseeker-view-section');
        if (viewSection) {
            viewSection.classList.remove('hidden');
        }
        
        // 구직자 정보 새로고침
        this.loadJobSeekers();
    }
    
    // showJobSeekerRegister() {
    //     // 버튼 상태 변경
    //     document.querySelectorAll('.jobseeker-sub-btn').forEach(btn => {
    //         btn.classList.remove('bg-primary', 'text-white');
    //         btn.classList.add('bg-gray-300', 'text-gray-700');
    //     });
    //     
    //     const registerBtn = document.getElementById('jobseeker-register-btn');
    //     registerBtn.classList.remove('bg-gray-300', 'text-gray-700');
    //     registerBtn.classList.add('bg-primary', 'text-white');
    //     
    //     // 컨텐츠 표시/숨김
    //     document.getElementById('jobseeker-view-section').classList.add('hidden');
    //     document.getElementById('jobseeker-register-section').classList.remove('hidden');
    // }
    
    // setupJobSeekerRegistration() {
    //     const form = document.getElementById('jobseeker-register-form');
    //     if (form) {
    //         form.addEventListener('submit', (e) => this.handleJobSeekerRegistration(e));
    //     }
    // }
    
    // async handleJobSeekerRegistration(event) {
    //     event.preventDefault();
    //     
    //     const formData = {
    //         name: document.getElementById('jobseeker-name').value,
    //         email: document.getElementById('jobseeker-email').value,
    //         password: 'temp_password_' + Date.now(), // 임시 비밀번호
    //         birth_date: document.getElementById('jobseeker-birth-date').value,
    //         gender: document.getElementById('jobseeker-gender').value,
    //         nationality: document.getElementById('jobseeker-nationality').value,
    //         phone: document.getElementById('jobseeker-phone').value,
    //         current_visa: document.getElementById('jobseeker-current-visa').value,
    //         desired_visa: document.getElementById('jobseeker-desired-visa').value,
    //         current_address: document.getElementById('jobseeker-address').value,
    //         korean_level: document.getElementById('jobseeker-korean-level').value,
    //         education_level: document.getElementById('jobseeker-education').value,
    //         work_experience: document.getElementById('jobseeker-experience').value || null,
    //         agent_id: parseInt(document.getElementById('jobseeker-agent-id').value) || 1
    //     };
    //     
    //     try {
    //         const response = await axios.post('/api/job-seekers', formData);
    //         
    //         if (response.status === 201) {
    //             // 성공 메시지 표시
    //             document.getElementById('jobseeker-register-success').classList.remove('hidden');
    //             
    //             // 폼 초기화
    //             this.resetJobSeekerForm();
    //             
    //             // 3초 후 성공 메시지 숨김
    //             setTimeout(() => {
    //                 document.getElementById('jobseeker-register-success').classList.add('hidden');
    //             }, 3000);
    //             
    //             // 구직자 목록 새로고침
    //             if (this.currentTab === 'jobseekers') {
    //                 this.loadJobSeekers();
    //             }
    //         }
    //     } catch (error) {
    //         console.error('구직정보 등록 실패:', error);
    //         if (error.response && error.response.data && error.response.data.error) {
    //             alert('구직정보 등록 실패: ' + error.response.data.error);
    //         } else {
    //             alert('구직정보 등록에 실패했습니다. 다시 시도해주세요.');
    //         }
    //     }
    // }
    
    // resetJobSeekerForm() {
    //     const form = document.getElementById('jobseeker-register-form');
    //     if (form) {
    //         form.reset();
    //     }
    // }
    
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

        console.log('setupUserNavigation called:', { user, token, authButtons, loginBtn, registerBtn, userMenu });
        console.log('Current authButtons style:', authButtons ? authButtons.style.display : 'not found');
        console.log('Current loginBtn style:', loginBtn ? loginBtn.style.display : 'not found');
        console.log('Current registerBtn style:', registerBtn ? registerBtn.style.display : 'not found');

        if (user && token) {
            // 로그인 상태 - CSS 클래스와 인라인 스타일 모두 사용
            document.body.classList.add('auth-logged-in');
            
            // 🔥 CRITICAL FIX: 모든 로그인/회원가입 관련 요소를 강력하게 숨김
            this.forceHideAuthElements();
            
            if (userMenu) {
                userMenu.classList.remove('hidden');
                userMenu.classList.add('force-show-user');
                userMenu.style.setProperty('display', 'flex', 'important');
                userMenu.style.setProperty('visibility', 'visible', 'important');
                userMenu.style.setProperty('opacity', '1', 'important');
                userMenu.style.setProperty('pointer-events', 'auto', 'important');
            }
            if (userName) userName.textContent = user.name || user.company_name || user.email || '사용자님';

            console.log('After hiding auth buttons - authButtons style:', authButtons ? authButtons.style.display : 'not found');
            console.log('After hiding auth buttons - loginBtn style:', loginBtn ? loginBtn.style.display : 'not found');
            console.log('After hiding auth buttons - registerBtn style:', registerBtn ? registerBtn.style.display : 'not found');

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
            // 로그아웃 상태 - CSS 클래스와 인라인 스타일 모두 사용
            document.body.classList.remove('auth-logged-in');
            
            // 🔥 CRITICAL FIX: 모든 인증 요소 복원
            this.forceShowAuthElements();
            
            if (userMenu) {
                userMenu.classList.add('hidden');
                userMenu.classList.remove('force-show-user');
                userMenu.style.setProperty('display', 'none', 'important');
                userMenu.style.setProperty('visibility', 'hidden', 'important');
                userMenu.style.setProperty('opacity', '0', 'important');
                userMenu.style.setProperty('pointer-events', 'none', 'important');
            }
            if (agentMenu) agentMenu.classList.add('hidden');
            if (mobileAgentMenu) mobileAgentMenu.classList.add('hidden');
            
            // 기본 메뉴로 복원
            this.updateMenusByUserType('guest');
        }
    }

    // 🔥 CRITICAL FIX: 모든 인증 관련 요소를 강력하게 숨기는 함수
    forceHideAuthElements() {
        console.log('🔥 강력한 인증 요소 숨김 실행');
        
        // 주요 ID로 찾기
        const primaryAuthElements = [
            'auth-buttons', 'login-btn', 'register-btn'
        ];
        
        primaryAuthElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`숨김 처리: ${id}`);
                this.applyForceHideStyles(element);
            }
        });
        
        // 클래스명으로 찾기 (추가 안전장치)
        const authClassSelectors = [
            '.auth-buttons', '.login-btn', '.register-btn',
            '[class*="login"]', '[class*="register"]', '[class*="sign-in"]', '[class*="sign-up"]'
        ];
        
        authClassSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // 사용자 메뉴나 로그아웃 버튼은 제외
                if (!element.id.includes('user-menu') && 
                    !element.id.includes('logout') && 
                    !element.classList.contains('force-show-user')) {
                    console.log(`클래스 선택자로 숨김 처리: ${selector}`, element);
                    this.applyForceHideStyles(element);
                }
            });
        });
        
        // 텍스트 내용으로 찾기 (최후 수단)
        const allLinks = document.querySelectorAll('a, button');
        allLinks.forEach(element => {
            const text = element.textContent.trim();
            if ((text.includes('로그인') || text.includes('회원가입') || text.includes('sign in') || text.includes('sign up')) &&
                !text.includes('로그아웃') && !element.classList.contains('force-show-user')) {
                console.log(`텍스트 내용으로 숨김 처리: "${text}"`, element);
                this.applyForceHideStyles(element);
            }
        });
    }
    
    // 요소에 강력한 숨김 스타일 적용
    applyForceHideStyles(element) {
        if (!element) return;
        
        // 모든 가능한 방법으로 완전히 숨김
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('opacity', '0', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('width', '0', 'important');
        element.style.setProperty('height', '0', 'important');
        element.style.setProperty('overflow', 'hidden', 'important');
        element.style.setProperty('position', 'absolute', 'important');
        element.style.setProperty('left', '-9999px', 'important');
        element.style.setProperty('top', '-9999px', 'important');
        element.style.setProperty('z-index', '-1', 'important');
        
        // CSS 클래스 추가
        element.classList.add('force-hide-auth', 'hidden');
        element.setAttribute('data-force-hidden', 'true');
        
        // 부모 요소가 flex인 경우 flex-basis도 0으로
        element.style.setProperty('flex-basis', '0', 'important');
        element.style.setProperty('flex-grow', '0', 'important');
        element.style.setProperty('flex-shrink', '0', 'important');
    }
    
    // 🔥 CRITICAL FIX: 모든 인증 관련 요소를 강력하게 복원하는 함수
    forceShowAuthElements() {
        console.log('🔥 강력한 인증 요소 복원 실행');
        
        // data-force-hidden 속성이 있는 모든 요소 찾기
        const hiddenElements = document.querySelectorAll('[data-force-hidden="true"]');
        hiddenElements.forEach(element => {
            console.log('복원 처리:', element);
            this.removeForceHideStyles(element);
        });
        
        // 주요 ID 요소들 복원
        const primaryAuthElements = [
            'auth-buttons', 'login-btn', 'register-btn'
        ];
        
        primaryAuthElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`복원 처리: ${id}`);
                this.removeForceHideStyles(element);
            }
        });
    }
    
    // 요소에서 강제 숨김 스타일 제거
    removeForceHideStyles(element) {
        if (!element) return;
        
        // 모든 강제 스타일 제거
        const stylesToRemove = [
            'display', 'visibility', 'opacity', 'pointer-events', 
            'width', 'height', 'overflow', 'position', 'left', 'top', 'z-index',
            'flex-basis', 'flex-grow', 'flex-shrink'
        ];
        
        stylesToRemove.forEach(style => {
            element.style.removeProperty(style);
        });
        
        // CSS 클래스 제거
        element.classList.remove('force-hide-auth', 'hidden');
        element.removeAttribute('data-force-hidden');
        
        // 기본 스타일 복원 (필요한 경우)
        if (element.id === 'auth-buttons') {
            element.style.setProperty('display', 'flex', 'important');
        } else if (element.id === 'login-btn' || element.id === 'register-btn') {
            element.style.setProperty('display', 'inline-block', 'important');
        }
        
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
    }
    
    // 🔥 CRITICAL FIX: DOM 변경 감시로 인증 UI 상태 자동 수정
    startAuthObserver() {
        console.log('DOM 인증 상태 감시 시작');
        
        if (this.authObserver) {
            this.authObserver.disconnect();
        }
        
        this.authObserver = new MutationObserver((mutations) => {
            let shouldRecheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    const target = mutation.target;
                    
                    // 인증 관련 요소 변경 감지
                    if (target.id === 'auth-buttons' || 
                        target.id === 'login-btn' || 
                        target.id === 'register-btn' ||
                        target.id === 'user-menu' ||
                        target.classList?.contains('auth-related') ||
                        (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
                        shouldRecheck = true;
                    }
                    
                    // 새로 추가된 노드 중 인증 관련 요소 확인
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) { // Element node
                                const text = node.textContent?.toLowerCase() || '';
                                if (text.includes('로그인') || text.includes('회원가입') || 
                                    text.includes('sign in') || text.includes('sign up')) {
                                    shouldRecheck = true;
                                }
                            }
                        });
                    }
                }
            });
            
            if (shouldRecheck) {
                console.log('🔄 DOM 변경 감지 - 인증 UI 재확인');
                setTimeout(() => {
                    const user = localStorage.getItem('user');
                    const token = localStorage.getItem('token');
                    if (user && token) {
                        this.forceHideAuthElements();
                    } else {
                        this.forceShowAuthElements();
                    }
                }, 100);
            }
        });
        
        if (document.body) {
            this.authObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'id']
            });
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
        // jobRegisterLinks 제거 - 구인정보 등록 기능 완전 비활성화
        
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
                // 구인정보 등록 버튼 동적 생성 제거됨
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
                // 구인정보 등록 버튼 동적 생성 제거됨
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
        // MutationObserver로 DOM 변경 감지 및 강제 숨기기
        this.setupAuthButtonObserver();
        
        // 검색 및 필터링 이벤트 설정 (지연 실행)
        setTimeout(() => {
            this.setupSearchAndFilters();
        }, 1000);
        
        // localStorage 변경 감지
        window.addEventListener('storage', (e) => {
            console.log('localStorage changed:', e.key, e.newValue);
            if (e.key === 'user' || e.key === 'token') {
                console.log('Auth related localStorage changed, updating UI...');
                this.checkAuthStatus();
                this.setupUserNavigation();
            }
        });
        
        // 페이지 focus 시 상태 재확인
        window.addEventListener('focus', () => {
            console.log('Window focused, rechecking auth status...');
            this.checkAuthStatus();
            this.setupUserNavigation();
        });
        
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
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('checkAuthStatus called:', { token, userStr });
        
        this.isLoggedIn = !!token;
        
        try {
            this.currentUser = userStr ? JSON.parse(userStr) : {};
        } catch (e) {
            console.error('Error parsing user data:', e);
            this.currentUser = {};
            this.isLoggedIn = false;
        }
        
        console.log('Auth status updated:', { isLoggedIn: this.isLoggedIn, currentUser: this.currentUser });
    }

    // 로그인 상태에 따른 UI 업데이트
    updateAuthUI() {
        // 로그인 상태 재확인
        this.checkAuthStatus();
        
        // 즉시 실행
        this.setupUserNavigation();
        
        setTimeout(() => {
            // 사용자 네비게이션 업데이트 (추가 보장)
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

    getVisaDisplayName(visa) {
        const visaMap = {
            'H-2': 'H-2 (방문취업)',
            'E-9': 'E-9 (비전문취업)', 
            'F-4': 'F-4 (재외동포)',
            'D-4': 'D-4 (일반연수)',
            'D-2': 'D-2 (유학)',
            'F-2': 'F-2 (거주)',
            'F-5': 'F-5 (영주)',
            'E-7': 'E-7 (특정기능)'
        };
        return visaMap[visa] || visa || '미분류';
    }

    getJobCategoryDisplay(category) {
        const categoryMap = {
            'MFG001': '제조업',
            'MFG002': '전자제품 조립',
            'IT001': 'IT 소프트웨어',
            'SVC001': '서비스업',
            'SVC002': '매장 판매직',
            'CON001': '건설업',
            'AGR001': '농업',
            'FSH001': '어업'
        };
        return categoryMap[category] || category || '일반';
    }

    formatDate(dateString) {
        if (!dateString) return '날짜 없음';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return '오늘';
        if (days === 1) return '어제';
        if (days < 7) return `${days}일 전`;
        if (days < 30) return `${Math.floor(days/7)}주 전`;
        
        return date.toLocaleDateString('ko-KR');
    }
    
    // 검색 및 필터 기능 설정
    setupSearchAndFilters() {
        console.log('필터 이벤트 설정 시작');
        
        // === 구인정보 필터 이벤트 ===
        // 구인정보 검색 입력
        const jobSearchInput = document.getElementById('job-search-input');
        if (jobSearchInput) {
            console.log('구인정보 검색 입력 이벤트 설정');
            let jobSearchTimeout;
            jobSearchInput.addEventListener('input', (e) => {
                console.log('구인정보 검색 입력 변경:', e.target.value);
                clearTimeout(jobSearchTimeout);
                jobSearchTimeout = setTimeout(() => {
                    this.currentFilters.jobs.search = e.target.value.trim();
                    console.log('구인정보 검색 필터 적용:', this.currentFilters.jobs);
                    this.loadJobListings(true);
                }, 300);
            });
        } else {
            console.warn('구인정보 검색 입력 요소를 찾을 수 없습니다');
        }
        
        // 구인정보 비자 필터
        const jobVisaFilter = document.getElementById('job-visa-filter');
        if (jobVisaFilter) {
            console.log('구인정보 비자 필터 이벤트 설정');
            jobVisaFilter.addEventListener('change', (e) => {
                console.log('구인정보 비자 필터 변경:', e.target.value);
                this.currentFilters.jobs.visa = e.target.value;
                console.log('구인정보 비자 필터 적용:', this.currentFilters.jobs);
                this.loadJobListings(true);
            });
        } else {
            console.warn('구인정보 비자 필터 요소를 찾을 수 없습니다');
        }
        
        // 구인정보 카테고리 필터
        const jobCategoryFilter = document.getElementById('job-category-filter');
        if (jobCategoryFilter) {
            console.log('구인정보 카테고리 필터 이벤트 설정');
            jobCategoryFilter.addEventListener('change', (e) => {
                console.log('구인정보 카테고리 필터 변경:', e.target.value);
                this.currentFilters.jobs.category = e.target.value;
                console.log('구인정보 카테고리 필터 적용:', this.currentFilters.jobs);
                this.loadJobListings(true);
            });
        } else {
            console.warn('구인정보 카테고리 필터 요소를 찾을 수 없습니다');
        }
        
        // === 구직자정보 필터 이벤트 ===
        // 구직자 검색 입력
        const jobseekerSearchInput = document.getElementById('jobseeker-search-input');
        if (jobseekerSearchInput) {
            console.log('구직자 검색 입력 이벤트 설정');
            let jobseekerSearchTimeout;
            jobseekerSearchInput.addEventListener('input', (e) => {
                console.log('구직자 검색 입력 변경:', e.target.value);
                clearTimeout(jobseekerSearchTimeout);
                jobseekerSearchTimeout = setTimeout(() => {
                    this.currentFilters.jobseekers.search = e.target.value.trim();
                    console.log('구직자 검색 필터 적용:', this.currentFilters.jobseekers);
                    this.loadJobSeekers(true);
                }, 300);
            });
        } else {
            console.warn('구직자 검색 입력 요소를 찾을 수 없습니다');
        }
        
        // 구직자 비자 필터
        const jobseekerVisaFilter = document.getElementById('jobseeker-visa-filter');
        if (jobseekerVisaFilter) {
            console.log('구직자 비자 필터 이벤트 설정');
            jobseekerVisaFilter.addEventListener('change', (e) => {
                console.log('구직자 비자 필터 변경:', e.target.value);
                this.currentFilters.jobseekers.visa = e.target.value;
                console.log('구직자 비자 필터 적용:', this.currentFilters.jobseekers);
                this.loadJobSeekers(true);
            });
        } else {
            console.warn('구직자 비자 필터 요소를 찾을 수 없습니다');
        }
        
        // 구직자 카테고리 필터
        const jobseekerCategoryFilter = document.getElementById('jobseeker-category-filter');
        if (jobseekerCategoryFilter) {
            console.log('구직자 카테고리 필터 이벤트 설정');
            jobseekerCategoryFilter.addEventListener('change', (e) => {
                console.log('구직자 카테고리 필터 변경:', e.target.value);
                this.currentFilters.jobseekers.category = e.target.value;
                console.log('구직자 카테고리 필터 적용:', this.currentFilters.jobseekers);
                this.loadJobSeekers(true);
            });
        } else {
            console.warn('구직자 카테고리 필터 요소를 찾을 수 없습니다');
        }
        
        console.log('필터 이벤트 설정 완료');
    }
    
    // 구인정보 필터 적용
    applyJobFilters() {
        console.log('구인정보 필터 적용 시작');
        
        // UI 입력값에서 필터 상태 업데이트
        const jobSearchInput = document.getElementById('job-search-input');
        const jobVisaFilter = document.getElementById('job-visa-filter');
        const jobCategoryFilter = document.getElementById('job-category-filter');
        
        // 필터 값 동기화 - 백엔드 API 파라미터 이름에 맞춤
        if (jobSearchInput) {
            this.currentFilters.jobs.search = jobSearchInput.value.trim();
            console.log('검색어 업데이트:', this.currentFilters.jobs.search);
        }
        if (jobVisaFilter) {
            this.currentFilters.jobs.visa = jobVisaFilter.value;
            console.log('비자 필터 업데이트:', this.currentFilters.jobs.visa);
        }
        if (jobCategoryFilter) {
            this.currentFilters.jobs.category = jobCategoryFilter.value;
            console.log('카테고리 필터 업데이트:', this.currentFilters.jobs.category);
        }
        
        console.log('최종 구인정보 필터:', this.currentFilters.jobs);
        this.loadJobListings(true);
    }
    
    // 구직자정보 필터 적용
    applyJobSeekerFilters() {
        console.log('구직자정보 필터 적용 시작');
        
        // UI 입력값에서 필터 상태 업데이트
        const jobseekerSearchInput = document.getElementById('jobseeker-search-input');
        const jobseekerVisaFilter = document.getElementById('jobseeker-visa-filter');
        const jobseekerCategoryFilter = document.getElementById('jobseeker-category-filter');
        
        // 필터 값 동기화 - 백엔드 API 파라미터 이름에 맞춤
        if (jobseekerSearchInput) {
            this.currentFilters.jobseekers.search = jobseekerSearchInput.value.trim();
            console.log('구직자 검색어 업데이트:', this.currentFilters.jobseekers.search);
        }
        if (jobseekerVisaFilter) {
            this.currentFilters.jobseekers.visa = jobseekerVisaFilter.value;
            console.log('구직자 비자 필터 업데이트:', this.currentFilters.jobseekers.visa);
        }
        if (jobseekerCategoryFilter) {
            this.currentFilters.jobseekers.category = jobseekerCategoryFilter.value;
            console.log('구직자 카테고리 필터 업데이트:', this.currentFilters.jobseekers.category);
        }
        
        console.log('최종 구직자 필터:', this.currentFilters.jobseekers);
        this.loadJobSeekers(true);
    }
    
    // 구인정보 필터 초기화
    clearJobFilters() {
        console.log('구인정보 필터 초기화');
        
        // 구인정보 입력 필드 초기화
        const jobSearchInput = document.getElementById('job-search-input');
        const jobVisaFilter = document.getElementById('job-visa-filter');
        const jobCategoryFilter = document.getElementById('job-category-filter');
        
        if (jobSearchInput) jobSearchInput.value = '';
        if (jobVisaFilter) jobVisaFilter.value = '';
        if (jobCategoryFilter) jobCategoryFilter.value = '';
        
        // 구인정보 필터 상태 초기화
        this.currentFilters.jobs = {};
        
        // 데이터 재로드
        this.loadJobListings(true);
    }
    
    // 구직자정보 필터 초기화
    clearJobSeekerFilters() {
        console.log('구직자정보 필터 초기화');
        
        // 구직자정보 입력 필드 초기화
        const jobseekerSearchInput = document.getElementById('jobseeker-search-input');
        const jobseekerVisaFilter = document.getElementById('jobseeker-visa-filter');
        const jobseekerCategoryFilter = document.getElementById('jobseeker-category-filter');
        
        if (jobseekerSearchInput) jobseekerSearchInput.value = '';
        if (jobseekerVisaFilter) jobseekerVisaFilter.value = '';
        if (jobseekerCategoryFilter) jobseekerCategoryFilter.value = '';
        
        // 구직자정보 필터 상태 초기화
        this.currentFilters.jobseekers = {};
        
        // 데이터 재로드
        this.loadJobSeekers(true);
    }
    
    // 전체 필터 적용 (레거시 지원)
    applyFilters() {
        this.applyJobFilters();
        this.applyJobSeekerFilters();
    }
    
    // 전체 필터 초기화 (레거시 지원)
    clearFilters() {
        this.clearJobFilters();
        this.clearJobSeekerFilters();
    }
    
    // 향상된 구인 상세 모달
    async showJobDetail(jobId) {
        try {
            // 로그인 상태 확인 및 토큰 가져오기
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequiredAlert('구인정보');
                return;
            }

            // 로딩 스피너 표시
            this.showLoadingModal();

            const response = await axios.get(`/api/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const job = response.data.job;
            
            // 로딩 모달 닫기
            this.hideLoadingModal();
            
            if (!job) {
                alert('구인 공고를 찾을 수 없습니다.');
                return;
            }
            
            // 모달 또는 상세 페이지 표시
            this.displayEnhancedJobDetailModal(job);
        } catch (error) {
            console.error('구인 공고 상세 조회 실패:', error);
            
            // 로딩 모달 닫기
            this.hideLoadingModal();
            
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
    
    // 향상된 구직자 상세 모달 표시
    async showJobSeekerDetail(jobSeekerId) {
        try {
            // 로그인 상태 확인
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequiredAlert('구직정보');
                return;
            }

            // 로딩 스피너 표시
            this.showLoadingModal();

            const response = await axios.get(`/api/jobseekers/${jobSeekerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const jobseeker = response.data.jobseeker;
            
            // 로딩 모달 닫기
            this.hideLoadingModal();
            
            if (!jobseeker) {
                alert('구직자 정보를 찾을 수 없습니다.');
                return;
            }
            
            // 모달 표시
            this.displayEnhancedJobSeekerDetailModal(jobseeker);
        } catch (error) {
            console.error('구직자 상세 조회 실패:', error);
            
            // 로딩 모달 닫기
            this.hideLoadingModal();
            
            if (error.response && error.response.status === 401) {
                this.showLoginRequiredAlert('구직정보');
            } else if (error.response && error.response.status === 404) {
                alert('구직자 정보를 찾을 수 없습니다.');
            } else {
                alert('구직자 정보를 불러오는데 실패했습니다.');
            }
        }
    }
    
    // 로딩 모달 표시
    showLoadingModal() {
        const existingModal = document.querySelector('.loading-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'loading-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">데이터를 불러오고 있습니다...</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // 로딩 모달 숨기기
    hideLoadingModal() {
        const modal = document.querySelector('.loading-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // 향상된 구인 상세 모달 표시
    displayEnhancedJobDetailModal(job) {
        const existingModal = document.querySelector('.job-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'job-detail-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        const salaryRange = job.salary_min && job.salary_max ? 
            `${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}` : 
            '급여 협의';
            
        const modalContent = `
            <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <!-- 노방리 헤더 -->
                <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 border-b z-10">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-briefcase text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold">${job.title}</h2>
                                <p class="text-blue-100">${job.company_name || '정보없음'}</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.job-detail-modal').remove()" 
                                class="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 스크롤 가능한 콘텐츠 -->
                <div class="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                    <!-- 기본 정보 카드 -->
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-blue-800 mb-3 flex items-center">
                                <i class="fas fa-info-circle mr-2"></i>기본 정보
                            </h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">비자 유형:</span>
                                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">${this.getVisaDisplayName(job.required_visa)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">근무지역:</span>
                                    <span class="font-medium">${job.work_location}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">직종:</span>
                                    <span class="font-medium">${this.getJobCategoryDisplay(job.job_category)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">근무시간:</span>
                                    <span class="font-medium">${job.work_hours || '협의'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-green-800 mb-3 flex items-center">
                                <i class="fas fa-won-sign mr-2"></i>급여 및 조건
                            </h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">월 급여:</span>
                                    <span class="font-bold text-green-600 text-lg">${salaryRange}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">모집인원:</span>
                                    <span class="font-medium">${job.positions || 1}명</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">한국어 수준:</span>
                                    <span class="font-medium">${job.korean_level_required || '무관'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">마감일:</span>
                                    <span class="font-medium">${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 회사 정보 -->
                    <div class="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-building mr-2"></i>회사 정보
                        </h3>
                        <div class="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">담당자:</span>
                                <span class="font-medium ml-2">${job.contact_person || '정보없음'}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">연락처:</span>
                                <span class="font-medium ml-2">${job.phone || '정보없음'}</span>
                            </div>
                            <div class="md:col-span-2">
                                <span class="text-gray-600">웹사이트:</span>
                                <span class="font-medium ml-2">${job.website ? `<a href="${job.website}" target="_blank" class="text-blue-600 hover:underline">${job.website}</a>` : '정보없음'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 상세 설명 -->
                    ${job.description ? `
                    <div class="bg-yellow-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-yellow-800 mb-3 flex items-center">
                            <i class="fas fa-file-alt mr-2"></i>상세 설명
                        </h3>
                        <div class="text-gray-700 leading-relaxed whitespace-pre-wrap">${job.description}</div>
                    </div>
                    ` : ''}
                    
                    <!-- 복리혜택 -->
                    ${job.benefits ? `
                    <div class="bg-purple-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-purple-800 mb-3 flex items-center">
                            <i class="fas fa-gift mr-2"></i>복리혜택
                        </h3>
                        <div class="text-gray-700 whitespace-pre-wrap">${job.benefits}</div>
                    </div>
                    ` : ''}
                    
                    <!-- 자격 요건 -->
                    ${job.requirements ? `
                    <div class="bg-red-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-red-800 mb-3 flex items-center">
                            <i class="fas fa-list-check mr-2"></i>자격 요건
                        </h3>
                        <div class="text-gray-700 whitespace-pre-wrap">${job.requirements}</div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- 노방리 하단 버튼 -->
                <div class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        등록일: ${this.formatDate(job.created_at)}
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="this.closest('.job-detail-modal').remove()" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <i class="fas fa-times mr-2"></i>닫기
                        </button>
                        <button onclick="app.handleJobApplication(${job.id})" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-paper-plane mr-2"></i>지원하기
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }
    
    // 향상된 구직자 상세 모달 표시
    displayEnhancedJobSeekerDetailModal(jobseeker) {
        const existingModal = document.querySelector('.jobseeker-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'jobseeker-detail-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        const salaryRange = jobseeker.desired_salary_min && jobseeker.desired_salary_max ? 
            `${this.formatSalary(jobseeker.desired_salary_min)} - ${this.formatSalary(jobseeker.desired_salary_max)}` : 
            '협의';
            
        const modalContent = `
            <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <!-- 노방리 헤더 -->
                <div class="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 border-b z-10">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-user-graduate text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold">${jobseeker.name}</h2>
                                <p class="text-green-100">${jobseeker.nationality || '정보없음'}</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.jobseeker-detail-modal').remove()" 
                                class="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 스크롤 가능한 콘텐츠 -->
                <div class="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                    <!-- 기본 정보 카드 -->
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-green-800 mb-3 flex items-center">
                                <i class="fas fa-id-card mr-2"></i>개인 정보
                            </h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">나이:</span>
                                    <span class="font-medium">${jobseeker.age ? `${jobseeker.age}세` : '미제공'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">성별:</span>
                                    <span class="font-medium">${jobseeker.gender || '미제공'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">현재 비자:</span>
                                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">${this.getVisaDisplayName(jobseeker.current_visa)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">희망 비자:</span>
                                    <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">${this.getVisaDisplayName(jobseeker.desired_visa)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-blue-800 mb-3 flex items-center">
                                <i class="fas fa-graduation-cap mr-2"></i>학력 및 능력
                            </h3>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">학력:</span>
                                    <span class="font-medium">${jobseeker.education_level || '미제공'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">한국어 수준:</span>
                                    <span class="font-medium">${jobseeker.korean_level || '미제공'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">경력:</span>
                                    <span class="font-medium">${jobseeker.work_experience || '미제공'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 희망 직종 및 조건 -->
                    <div class="bg-yellow-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-yellow-800 mb-3 flex items-center">
                            <i class="fas fa-briefcase mr-2"></i>희망 직종 및 조건
                        </h3>
                        <div class="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">희망 직종:</span>
                                <span class="font-medium ml-2">${this.getJobCategoryDisplay(jobseeker.desired_job_category)}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">희망 급여:</span>
                                <span class="font-bold text-green-600 ml-2">월 ${salaryRange}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">희망 근무지:</span>
                                <span class="font-medium ml-2">${jobseeker.desired_work_location || '전국'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 연락처 -->
                    <div class="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-phone mr-2"></i>연락처
                        </h3>
                        <div class="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">전화번호:</span>
                                <span class="font-medium ml-2">${jobseeker.phone || '비공개'}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">이메일:</span>
                                <span class="font-medium ml-2">${jobseeker.email || '비공개'}</span>
                            </div>
                            <div class="md:col-span-2">
                                <span class="text-gray-600">주소:</span>
                                <span class="font-medium ml-2">${jobseeker.current_address || '비공개'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 자기소개 -->
                    ${jobseeker.bio ? `
                    <div class="bg-purple-50 p-4 rounded-lg mb-6">
                        <h3 class="font-semibold text-purple-800 mb-3 flex items-center">
                            <i class="fas fa-user-edit mr-2"></i>자기소개
                        </h3>
                        <div class="text-gray-700 leading-relaxed whitespace-pre-wrap">${jobseeker.bio}</div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- 노방리 하단 버튼 -->
                <div class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        등록일: ${this.formatDate(jobseeker.created_at)}
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="this.closest('.jobseeker-detail-modal').remove()" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <i class="fas fa-times mr-2"></i>닫기
                        </button>
                        <button onclick="app.handleJobSeekerContact(${jobseeker.id})" 
                                class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <i class="fas fa-envelope mr-2"></i>연락하기
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }
    
    // 구인 지원 처리
    handleJobApplication(jobId) {
        alert(`구인 지원 기능 (ID: ${jobId})\n지원서 작성 및 제출 기능은 추후 구현 예정입니다.`);
        // 지원 로직 구현 예정
    }
    
    // 구직자 연락 처리
    handleJobSeekerContact(jobSeekerId) {
        alert(`구직자 연락 기능 (ID: ${jobSeekerId})\n메시지 전송 및 연락처 공유 기능은 추후 구현 예정입니다.`);
        // 연락 로직 구현 예정
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
            // 더 확실한 스크롤 이동
            setTimeout(() => {
                const targetElement = document.getElementById('content-jobs');
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    // 추가: 브라우저 URL 업데이트 (선택사항)
                    window.history.pushState(null, '', '#jobs-view');
                }
            }, 200);
        }
    } else if (user.type === 'employer') {
        // 구인기업 - 내 구인정보 관리 페이지로 이동
        window.location.href = `/static/employer-dashboard.html?employerId=${user.id}`;
    } else {
        // 기타 로그인 사용자 - 일반 구인정보 보기
        if (app) {
            app.switchTab('jobs');
            app.showJobView();
            // 더 확실한 스크롤 이동
            setTimeout(() => {
                const targetElement = document.getElementById('content-jobs');
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    // 추가: 브라우저 URL 업데이트 (선택사항)
                    window.history.pushState(null, '', '#jobs-view');
                }
            }, 200);
        }
    }
}

function showJobSeekersView() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // 비로그인 상태 - 일반 구직정보 보기
        if (app) {
            app.switchTab('jobseekers');
            app.showJobSeekerView();
            // 더 확실한 스크롤 이동
            setTimeout(() => {
                const targetElement = document.getElementById('content-jobseekers');
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    // 추가: 브라우저 URL 업데이트 (선택사항)
                    window.history.pushState(null, '', '#jobseekers-view');
                }
            }, 200);
        }
    } else {
        // 로그인 상태 - 일반 구직정보 보기
        if (app) {
            app.switchTab('jobseekers');
            app.showJobSeekerView();
            // 더 확실한 스크롤 이동
            setTimeout(() => {
                const targetElement = document.getElementById('content-jobseekers');
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    // 추가: 브라우저 URL 업데이트 (선택사항)
                    window.history.pushState(null, '', '#jobseekers-view');
                }
            }, 200);
        }
    }
}

function showJobRegisterForm() {
    // 구인정보 등록 기능 비활성화
    alert('구인정보 등록 기능은 현재 비활성화되어 있습니다.');
    return;
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

// function resetJobSeekerForm() {
//     if (app) {
//         app.resetJobSeekerForm();
//     }
// }

// 구인 상세 정보 표시 (전역 함수)
function showJobDetail(jobId) {
    if (app) {
        app.showJobDetail(jobId);
    }
}

// 구직자 상세 정보 표시 (전역 함수)
function showJobSeekerDetail(jobSeekerId) {
    if (app) {
        app.showJobSeekerDetail(jobSeekerId);
    }
}

// 구인정보 필터 적용 (전역 함수)
function applyJobFilters() {
    if (app) {
        app.applyJobFilters();
    }
}

// 구직자정보 필터 적용 (전역 함수)
function applyJobSeekerFilters() {
    if (app) {
        app.applyJobSeekerFilters();
    }
}

// 구인정보 필터 초기화 (전역 함수)
function clearJobFilters() {
    if (app) {
        app.clearJobFilters();
    }
}

// 구직자정보 필터 초기화 (전역 함수)
function clearJobSeekerFilters() {
    if (app) {
        app.clearJobSeekerFilters();
    }
}

// 레거시 전체 필터 적용 (전역 함수)
function applyFilters() {
    if (app) {
        app.applyFilters();
    }
}

// 레거시 전체 필터 초기화 (전역 함수)
function clearFilters() {
    if (app) {
        app.clearFilters();
    }
}

// 구인정보 보기 토글 (전역 함수)
function toggleJobsExpanded() {
    if (app) {
        // 전체 목록 보기 또는 요약 보기 전환
        const isExpanded = app.jobsData.expanded || false;
        app.jobsData.expanded = !isExpanded;
        
        if (app.jobsData.expanded) {
            // 전체 목록 보기 모드
            app.renderFullJobList();
        } else {
            // 요약 보기 모드
            app.renderJobListings();
        }
    }
}

// 구직자정보 보기 토글 (전역 함수)
function toggleJobSeekersExpanded() {
    if (app) {
        // 전체 목록 보기 또는 요약 보기 전환
        const isExpanded = app.jobSeekersData.expanded || false;
        app.jobSeekersData.expanded = !isExpanded;
        
        if (app.jobSeekersData.expanded) {
            // 전체 목록 보기 모드
            app.renderFullJobSeekerList();
        } else {
            // 요약 보기 모드
            app.renderJobSeekerListings();
        }
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

// 개선된 네비게이션 스크롤 함수
function smoothScrollToSection(sectionId, hashName) {
    setTimeout(() => {
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
            // 섹션으로 부드럽게 스크롤
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // URL 해시 업데이트 (선택사항)
            window.history.pushState(null, '', `#${hashName}`);
            
            // 탭이 활성화되었는지 확인하고 추가 처리
            setTimeout(() => {
                const tabButton = document.querySelector(`[id*="${sectionId.replace('content-', '')}"]`);
                if (tabButton && !tabButton.classList.contains('active')) {
                    tabButton.click();
                }
            }, 100);
        }
    }, 250);
}

// 안전한 로그인/회원가입 네비게이션 함수들
function goToLogin() {
    console.log('로그인 페이지로 이동 시도');
    
    // 가능한 로그인 경로들을 순서대로 시도
    const loginPaths = [
        '/static/login.html',
        '/login.html',
        '/login'
    ];
    
    // 첫 번째 경로로 이동
    try {
        window.location.href = loginPaths[0];
    } catch (error) {
        console.error('로그인 페이지 이동 오류:', error);
        // 대체 경로 시도
        window.location.href = loginPaths[1];
    }
}

function goToRegister() {
    console.log('회원가입 페이지로 이동 시도');
    
    // 가능한 회원가입 경로들을 순서대로 시도  
    const registerPaths = [
        '/static/register.html',
        '/register.html',
        '/register'
    ];
    
    // 첫 번째 경로로 이동
    try {
        window.location.href = registerPaths[0];
    } catch (error) {
        console.error('회원가입 페이지 이동 오류:', error);
        // 대체 경로 시도
        window.location.href = registerPaths[1];
    }
}

// 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - Initializing app');
    app = new JobPlatformApp();
    
    // 추가 지연 후 네비게이션 강제 업데이트
    setTimeout(() => {
        console.log('Force updating user navigation after app init');
        if (app && app.setupUserNavigation) {
            app.setupUserNavigation();
        }
    }, 1000);
});

// 페이지 완전 로드 후 추가 실행
window.addEventListener('load', () => {
    console.log('Window loaded - Final navigation setup');
    
    setTimeout(() => {
        console.log('Final force update of user navigation');
        if (app && app.setupUserNavigation) {
            app.setupUserNavigation();
        }
    }, 1500);
});

// 정기적으로 로그인 상태 확인 (5초마다)
setInterval(() => {
    if (app && app.checkAuthStatus && app.setupUserNavigation) {
        const wasLoggedIn = app.isLoggedIn;
        app.checkAuthStatus();
        
        // 로그인 상태가 변경된 경우에만 UI 업데이트
        if (wasLoggedIn !== app.isLoggedIn) {
            console.log('Login status changed, updating UI...');
            app.setupUserNavigation();
        }
    }
}, 5000);

// 글로벌 테스트 함수들
window.testLogin = function(userType = 'employer') {
    const testUsers = {
        employer: {
            id: 1,
            type: 'employer',
            name: '테크코퍼레이션',
            company_name: '테크코퍼레이션',
            email: 'hr@techcorp.com'
        },
        jobseeker: {
            id: 2,
            type: 'jobseeker',
            name: '응우엔 반',
            email: 'nguyenvan@example.com'
        },
        agent: {
            id: 3,
            type: 'agent',
            name: '글로벌인재에이전시',
            company_name: '글로벌인재에이전시',
            email: 'agent1@wowcampus.com'
        },
        admin: {
            id: 4,
            type: 'admin',
            name: '관리자',
            email: 'admin@wowcampus.com'
        }
    };
    
    const user = testUsers[userType];
    const testToken = `test-token-${userType}-${Date.now()}`;
    
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', testToken);
    
    console.log('Test login set:', user);
    
    // 강제로 UI 업데이트
    if (app) {
        app.checkAuthStatus();
        app.setupUserNavigation();
    }
    
    return 'Login set! Check the header.';
};

window.testLogout = function() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    console.log('Test logout completed');
    
    // 강제로 UI 업데이트
    if (app) {
        app.checkAuthStatus();
        app.setupUserNavigation();
    }
    
    return 'Logout completed! Check the header.';
};

window.checkAuthStatus = function() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('Current localStorage:', { user, token });
    console.log('Current app state:', { 
        isLoggedIn: app ? app.isLoggedIn : 'app not ready',
        currentUser: app ? app.currentUser : 'app not ready'
    });
    
    return { user, token, app: app ? { isLoggedIn: app.isLoggedIn, currentUser: app.currentUser } : null };
};

// MutationObserver 설정 함수를 JobPlatformApp 클래스에 추가
JobPlatformApp.prototype.setupAuthButtonObserver = function() {
    const observer = new MutationObserver((mutations) => {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (user && token) {
            // 로그인 상태에서 auth 버튼들이 다시 나타나면 강제로 숨김
            const authButtons = document.getElementById('auth-buttons');
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            
            if (authButtons && authButtons.style.display !== 'none') {
                console.log('MutationObserver: Force hiding auth buttons');
                authButtons.style.display = 'none';
                authButtons.style.visibility = 'hidden';
            }
            if (loginBtn && loginBtn.style.display !== 'none') {
                loginBtn.style.display = 'none';
                loginBtn.style.visibility = 'hidden';
            }
            if (registerBtn && registerBtn.style.display !== 'none') {
                registerBtn.style.display = 'none';
                registerBtn.style.visibility = 'hidden';
            }
            
            // user-menu가 숨겨져 있으면 강제로 표시
            const userMenu = document.getElementById('user-menu');
            if (userMenu && userMenu.classList.contains('hidden')) {
                userMenu.classList.remove('hidden');
                userMenu.style.display = 'flex';
                userMenu.style.visibility = 'visible';
            }
        }
    });
    
    // 전체 body를 관찰
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
};

function toggleJobsDropdown() {
    const dropdown = document.getElementById('jobs-dropdown-menu');
    const icon = document.getElementById('jobs-dropdown-icon');
    
    if (dropdown && icon) {
        if (dropdown.classList.contains('hidden')) {
            // 다른 모든 드롭다운 닫기
            closeAllDropdowns();
            
            // 현재 드롭다운 열기
            dropdown.classList.remove('hidden');
            dropdown.style.opacity = '1';
            dropdown.style.visibility = 'visible';
            dropdown.style.transform = 'translateY(0)';
            dropdown.style.pointerEvents = 'auto';
            
            // 아이콘 회전
            icon.style.transform = 'rotate(180deg)';
        } else {
            // 드롭다운 닫기
            dropdown.classList.add('hidden');
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            dropdown.style.transform = 'translateY(-10px)';
            dropdown.style.pointerEvents = 'none';
            
            // 아이콘 원래대로
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown-menu');
    const icons = document.querySelectorAll('.nav-dropdown .fa-chevron-down');
    
    dropdowns.forEach(dropdown => {
        dropdown.classList.add('hidden');
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    });
    
    icons.forEach(icon => {
        icon.style.transform = 'rotate(0deg)';
    });
}

// 문서 클릭 시 드롭다운 닫기
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(event) {
        const jobsDropdown = document.getElementById('jobs-dropdown-btn');
        const jobsMenu = document.getElementById('jobs-dropdown-menu');
        
        if (jobsDropdown && jobsMenu && 
            !jobsDropdown.contains(event.target) && 
            !jobsMenu.contains(event.target)) {
            closeAllDropdowns();
        }
    });
});

// Global functions for job listing functionality
function showAllJobs() {
    alert('전체 구인정보 페이지로 이동합니다.');
    // TODO: 추후 별도 페이지나 확장된 리스트 구현
}

function showAllJobSeekers() {
    alert('전체 구직자 정보 페이지로 이동합니다.');
    // TODO: 추후 별도 페이지나 확장된 리스트 구현
}

function showJobDetail(jobId) {
    // Simple alert for now - TODO: implement modal with detailed job info
    alert(`구인공고 ID ${jobId}의 상세 정보를 표시합니다.`);
    // TODO: API call to /api/jobs/${jobId} and show modal
}

function showJobSeekerDetail(jobSeekerId) {
    // Simple alert for now - TODO: implement modal with detailed jobseeker info
    alert(`구직자 ID ${jobSeekerId}의 상세 정보를 표시합니다.`);
    // TODO: API call to /api/jobseekers/${jobSeekerId} and show modal
}

function closeJobDetailModal() {
    const modal = document.getElementById('job-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function closeJobSeekerDetailModal() {
    const modal = document.getElementById('jobseeker-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}