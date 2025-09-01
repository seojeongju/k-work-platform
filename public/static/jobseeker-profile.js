// 구직자 프로필 관리 JavaScript

class JobSeekerProfile {
    constructor() {
        this.currentTab = 'profile';
        this.jobSeekerId = null;
        this.currentUser = null;
        this.profileData = null;
        this.init();
    }

    init() {
        // 로그인 상태 및 권한 확인
        this.checkAuthAndPermissions();
        
        // URL에서 jobSeekerId 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        this.jobSeekerId = urlParams.get('jobSeekerId') || this.currentUser.id;
        
        if (!this.jobSeekerId) {
            alert('잘못된 접근입니다.');
            window.location.href = '/';
            return;
        }

        // 이벤트 바인딩
        this.bindEvents();
        
        // 초기 데이터 로드
        this.loadInitialData();
    }

    checkAuthAndPermissions() {
        // 테스트 모드 확인 (URL에 test=true가 있으면 더미 데이터 사용)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'true') {
            localStorage.setItem('token', 'test_token');
            localStorage.setItem('user', JSON.stringify({
                id: 1,
                email: 'test@example.com',
                type: 'jobseeker',
                name: '테스트 사용자',
                status: 'active'
            }));
        }

        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) {
            alert('로그인이 필요합니다.');
            window.location.href = '/static/login.html';
            return;
        }

        if (user.type !== 'jobseeker' && user.type !== 'agent' && user.type !== 'admin') {
            alert('구직자, 에이전트 또는 관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        this.currentUser = user;
        this.token = token; // 토큰 설정 추가
        
        // 사용자명 표시
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = user.name || '구직자님';
        }
    }

    bindEvents() {
        // 탭 버튼 이벤트 바인딩
        document.querySelectorAll('[id^="tab-"]').forEach(tabButton => {
            tabButton.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tabButton.id.replace('tab-', '');
                console.log('탭 클릭됨:', tabName);
                this.switchTab(tabName);
            });
        });

        // 폼 제출 이벤트
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        }

        // 필터 이벤트
        const applicationsFilter = document.getElementById('applications-filter');
        if (applicationsFilter) {
            applicationsFilter.addEventListener('change', () => this.loadApplications());
        }

        const jobsFilter = document.getElementById('jobs-filter');
        if (jobsFilter) {
            jobsFilter.addEventListener('change', () => this.loadRecommendedJobs());
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadProfile(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }

    async loadProfile() {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/job-seekers/${this.jobSeekerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.profileData = response.data.jobSeeker;
            this.renderProfile();
            this.updateCompletionStatus();

        } catch (error) {
            console.error('프로필 로드 실패:', error);
            alert('프로필 정보를 불러올 수 없습니다.');
        }
    }

    renderProfile() {
        if (!this.profileData) return;

        const profile = this.profileData;

        // 기본 정보 렌더링
        const basicInfo = document.getElementById('basic-info');
        basicInfo.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">이름:</span>
                <span class="font-medium">${profile.name || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">이메일:</span>
                <span class="font-medium">${profile.email || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">생년월일:</span>
                <span class="font-medium">${profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('ko-KR') : '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">성별:</span>
                <span class="font-medium">${this.getGenderText(profile.gender)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">국적:</span>
                <span class="font-medium">${profile.nationality || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">연락처:</span>
                <span class="font-medium">${profile.phone || '미입력'}</span>
            </div>
        `;

        // 비자 정보 렌더링
        const visaInfo = document.getElementById('visa-info');
        visaInfo.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">현재 비자:</span>
                <span class="font-medium ${profile.current_visa ? 'text-green-600' : 'text-red-500'}">${profile.current_visa || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">희망 비자:</span>
                <span class="font-medium">${profile.desired_visa || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">한국어 수준:</span>
                <span class="font-medium ${profile.korean_level ? 'text-blue-600' : ''}">${this.getKoreanLevelText(profile.korean_level)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">주소:</span>
                <span class="font-medium">${profile.current_address || '미입력'}</span>
            </div>
        `;

        // 학력 정보 렌더링
        const educationInfo = document.getElementById('education-info');
        educationInfo.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">최종 학력:</span>
                <span class="font-medium">${profile.education_level || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">희망 직종:</span>
                <span class="font-medium">${profile.desired_job_category || '미입력'}</span>
            </div>
            <div class="mt-3">
                <span class="text-gray-600">경력 사항:</span>
                <p class="mt-1 text-sm ${profile.work_experience ? 'text-gray-800' : 'text-gray-400'}">
                    ${profile.work_experience || '경력 사항이 없습니다.'}
                </p>
            </div>
        `;

        // 희망 조건 렌더링
        const preferenceInfo = document.getElementById('preference-info');
        preferenceInfo.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">희망 지역:</span>
                <span class="font-medium">${profile.preferred_region || '미입력'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">희망 급여:</span>
                <span class="font-medium">${profile.desired_salary_min ? this.formatSalary(profile.desired_salary_min) : '미입력'}</span>
            </div>
            <div class="mt-3">
                <span class="text-gray-600">자기소개:</span>
                <p class="mt-1 text-sm ${profile.self_introduction ? 'text-gray-800' : 'text-gray-400'}">
                    ${profile.self_introduction || '자기소개가 없습니다.'}
                </p>
            </div>
        `;

        // 에이전트 정보 렌더링 (조건부)
        if (document.getElementById('agent-info')) {
            this.renderAgentInfo();
        }
    }

    updateCompletionStatus() {
        if (!this.profileData) return;

        const profile = this.profileData;
        const requiredFields = [
            'name', 'email', 'nationality', 'current_visa', 'korean_level',
            'education_level', 'desired_job_category'
        ];

        const optionalFields = [
            'birth_date', 'gender', 'phone', 'desired_visa', 'current_address',
            'work_experience', 'preferred_region', 'desired_salary_min', 'self_introduction'
        ];

        let filledRequired = 0;
        let filledOptional = 0;

        requiredFields.forEach(field => {
            if (profile[field] && profile[field].trim()) {
                filledRequired++;
            }
        });

        optionalFields.forEach(field => {
            if (profile[field] && profile[field].toString().trim()) {
                filledOptional++;
            }
        });

        // 필수 필드 70% + 선택 필드 30% 가중치
        const requiredWeight = 70;
        const optionalWeight = 30;
        
        const requiredPercentage = (filledRequired / requiredFields.length) * requiredWeight;
        const optionalPercentage = (filledOptional / optionalFields.length) * optionalWeight;
        
        const totalPercentage = Math.round(requiredPercentage + optionalPercentage);

        // UI 업데이트
        document.getElementById('completion-percentage').textContent = `${totalPercentage}%`;
        document.getElementById('completion-bar').style.width = `${totalPercentage}%`;
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            
            // 통계 데이터 로드
            const [applicationsResponse, matchesResponse] = await Promise.all([
                axios.get(`/api/job-seekers/${this.jobSeekerId}/applications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ data: { applications: [] } })),
                
                axios.get(`/api/job-seekers/${this.jobSeekerId}/matches`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ data: { matches: [] } }))
            ]);

            const applications = applicationsResponse.data.applications || [];
            const matches = matchesResponse.data.matches || [];

            // 통계 업데이트
            document.getElementById('stat-applications').textContent = applications.length;
            document.getElementById('stat-matches').textContent = matches.length;
            document.getElementById('stat-views').textContent = Math.floor(Math.random() * 50) + 10; // 임시
            
            // 평균 매칭 점수 계산
            if (matches.length > 0) {
                const avgScore = matches.reduce((sum, match) => sum + (match.match_score || 0), 0) / matches.length;
                document.getElementById('stat-score').textContent = `${Math.round(avgScore * 100)}점`;
            } else {
                document.getElementById('stat-score').textContent = '-';
            }

        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    async loadApplications() {
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('applications-filter').value;
            
            let url = `/api/job-seekers/${this.jobSeekerId}/applications`;
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const applications = response.data.applications || [];
            this.renderApplicationsList(applications);

        } catch (error) {
            console.error('지원 내역 로드 실패:', error);
            this.renderApplicationsList([]);
        }
    }

    renderApplicationsList(applications) {
        const container = document.getElementById('applications-list');
        container.innerHTML = '';

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-paper-plane text-4xl mb-4 text-gray-300"></i>
                    <p>지원한 공고가 없습니다.</p>
                    <button onclick="profile.switchTab('jobs')" class="mt-4 bg-wowcampus-blue text-white px-6 py-2 rounded-lg hover:bg-wowcampus-dark">
                        추천 공고 보기
                    </button>
                </div>
            `;
            return;
        }

        applications.forEach(application => {
            const appCard = this.createApplicationCard(application);
            container.appendChild(appCard);
        });
    }

    createApplicationCard(application) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow';
        
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'reviewed': 'bg-blue-100 text-blue-800',
            'accepted': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'pending': '검토 중',
            'reviewed': '검토 완료',
            'accepted': '합격',
            'rejected': '불합격'
        };

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800">${application.job_title}</h4>
                    <p class="text-sm text-gray-600 mb-2">${application.company_name}</p>
                    <div class="flex flex-wrap gap-2 text-sm text-gray-600">
                        <span class="flex items-center">
                            <i class="fas fa-map-marker-alt w-4 mr-1"></i>
                            ${application.work_location}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-won-sign w-4 mr-1"></i>
                            ${application.salary_text || '급여 협의'}
                        </span>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${statusColors[application.status] || statusColors.pending}">
                    ${statusText[application.status] || '검토 중'}
                </span>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t">
                <div class="text-sm text-gray-500">
                    지원일: ${new Date(application.created_at).toLocaleDateString('ko-KR')}
                </div>
                <div class="flex space-x-2">
                    <button onclick="profile.viewJobDetail(${application.job_posting_id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i class="fas fa-eye mr-1"></i>공고 보기
                    </button>
                    ${application.status === 'pending' ? `
                        <button onclick="profile.cancelApplication(${application.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">
                            <i class="fas fa-times mr-1"></i>지원 취소
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    async loadMatches() {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/job-seekers/${this.jobSeekerId}/matches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const matches = response.data.matches || [];
            this.renderMatchesList(matches);

        } catch (error) {
            console.error('매칭 결과 로드 실패:', error);
            this.renderMatchesList([]);
        }
    }

    renderMatchesList(matches) {
        const container = document.getElementById('matches-list');
        container.innerHTML = '';

        if (matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-handshake text-4xl mb-4 text-gray-300"></i>
                    <p>매칭 결과가 없습니다.</p>
                    <button onclick="profile.generateNewMatches()" class="mt-4 bg-accent text-white px-6 py-2 rounded-lg hover:bg-green-700">
                        새 매칭 생성하기
                    </button>
                </div>
            `;
            return;
        }

        matches.forEach(match => {
            const matchCard = this.createMatchCard(match);
            container.appendChild(matchCard);
        });
    }

    createMatchCard(match) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow';
        
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

        const matchScore = Math.round((match.match_score || 0) * 100);

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800">${match.job_title}</h4>
                    <p class="text-sm text-gray-600 mb-2">${match.company_name}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span class="flex items-center">
                            <i class="fas fa-percentage w-4 mr-1"></i>
                            매칭률: ${matchScore}%
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-clock w-4 mr-1"></i>
                            ${new Date(match.created_at).toLocaleDateString('ko-KR')}
                        </span>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${matchTypeColors[match.match_type] || matchTypeColors.fair}">
                    ${matchTypeText[match.match_type] || '보통 매칭'}
                </span>
            </div>
            
            ${match.match_reason ? `
            <div class="bg-gray-50 p-3 rounded-lg mb-4">
                <p class="text-sm text-gray-700">
                    <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                    ${match.match_reason}
                </p>
            </div>
            ` : ''}
            
            <div class="flex justify-between items-center pt-4 border-t">
                <div class="text-sm text-gray-500">
                    상태: ${this.getMatchStatusText(match.status)}
                </div>
                <div class="flex space-x-2">
                    <button onclick="profile.viewJobDetail(${match.job_posting_id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i class="fas fa-eye mr-1"></i>공고 보기
                    </button>
                    <button onclick="profile.applyToJob(${match.job_posting_id})" class="text-green-600 hover:text-green-800 text-sm font-medium">
                        <i class="fas fa-paper-plane mr-1"></i>지원하기
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    async loadRecommendedJobs() {
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('jobs-filter').value;
            
            let url = `/api/jobs/recommended/${this.jobSeekerId}`;
            if (filter !== 'all') {
                url += `?filter=${filter}`;
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const jobs = response.data.jobs || [];
            this.renderRecommendedJobs(jobs);

        } catch (error) {
            console.error('추천 구인공고 로드 실패:', error);
            this.renderRecommendedJobs([]);
        }
    }

    renderRecommendedJobs(jobs) {
        const container = document.getElementById('recommended-jobs');
        container.innerHTML = '';

        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-briefcase text-4xl mb-4 text-gray-300"></i>
                    <p>추천 구인공고가 없습니다.</p>
                    <p class="text-sm mt-2">프로필을 더 자세히 작성하시면 더 나은 추천을 받을 수 있습니다.</p>
                </div>
            `;
            return;
        }

        jobs.forEach(job => {
            const jobCard = this.createJobCard(job);
            container.appendChild(jobCard);
        });
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow';
        
        const salaryText = job.salary_min && job.salary_max ? 
            `${this.formatSalary(job.salary_min)} ~ ${this.formatSalary(job.salary_max)}` : 
            '급여 협의';

        const matchScore = job.match_score ? Math.round(job.match_score * 100) : null;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800">${job.title}</h4>
                    <p class="text-sm text-gray-600 mb-2">${job.company_name}</p>
                    <div class="flex flex-wrap gap-2 text-sm text-gray-600">
                        <span class="flex items-center">
                            <i class="fas fa-map-marker-alt w-4 mr-1"></i>
                            ${job.work_location}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-won-sign w-4 mr-1"></i>
                            ${salaryText}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-id-card w-4 mr-1"></i>
                            ${job.required_visa}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    ${matchScore ? `
                        <div class="text-lg font-bold text-wowcampus-blue">${matchScore}%</div>
                        <div class="text-xs text-gray-500">매칭률</div>
                    ` : ''}
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t">
                <div class="text-sm text-gray-500">
                    마감: ${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}
                </div>
                <div class="flex space-x-2">
                    <button onclick="profile.viewJobDetail(${job.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i class="fas fa-eye mr-1"></i>상세보기
                    </button>
                    <button onclick="profile.applyToJob(${job.id})" class="bg-wowcampus-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-wowcampus-dark">
                        <i class="fas fa-paper-plane mr-1"></i>지원하기
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    showProfileEditModal() {
        if (!this.profileData) {
            alert('프로필 정보를 먼저 로드해주세요.');
            return;
        }

        const profile = this.profileData;
        
        // 폼에 현재 데이터 채우기
        document.getElementById('edit-name').value = profile.name || '';
        document.getElementById('edit-email').value = profile.email || '';
        document.getElementById('edit-birth-date').value = profile.birth_date ? profile.birth_date.split('T')[0] : '';
        document.getElementById('edit-gender').value = profile.gender || '';
        document.getElementById('edit-nationality').value = profile.nationality || '';
        document.getElementById('edit-phone').value = profile.phone || '';
        document.getElementById('edit-current-visa').value = profile.current_visa || '';
        document.getElementById('edit-desired-visa').value = profile.desired_visa || '';
        document.getElementById('edit-korean-level').value = profile.korean_level || '';
        document.getElementById('edit-address').value = profile.current_address || '';
        document.getElementById('edit-education').value = profile.education_level || '';
        document.getElementById('edit-desired-category').value = profile.desired_job_category || '';
        document.getElementById('edit-experience').value = profile.work_experience || '';
        document.getElementById('edit-desired-location').value = profile.preferred_region || '';
        document.getElementById('edit-desired-salary').value = profile.desired_salary_min ? profile.desired_salary_min / 10000 : '';
        document.getElementById('edit-introduction').value = profile.self_introduction || '';

        document.getElementById('profile-modal').classList.remove('hidden');
    }

    async handleProfileSubmit(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('edit-name').value,
            email: document.getElementById('edit-email').value,
            birth_date: document.getElementById('edit-birth-date').value || null,
            gender: document.getElementById('edit-gender').value || null,
            nationality: document.getElementById('edit-nationality').value,
            phone: document.getElementById('edit-phone').value || null,
            current_visa: document.getElementById('edit-current-visa').value || null,
            desired_visa: document.getElementById('edit-desired-visa').value || null,
            korean_level: document.getElementById('edit-korean-level').value || null,
            current_address: document.getElementById('edit-address').value || null,
            education_level: document.getElementById('edit-education').value || null,
            desired_job_category: document.getElementById('edit-desired-category').value || null,
            work_experience: document.getElementById('edit-experience').value || null,
            preferred_region: document.getElementById('edit-desired-location').value || null,
            desired_salary_min: document.getElementById('edit-desired-salary').value ? parseInt(document.getElementById('edit-desired-salary').value) * 10000 : null,
            self_introduction: document.getElementById('edit-introduction').value || null
        };

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`/api/job-seekers/${this.jobSeekerId}`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 200) {
                alert('프로필이 성공적으로 수정되었습니다.');
                this.closeProfileModal();
                await this.loadProfile();
            }

        } catch (error) {
            console.error('프로필 수정 실패:', error);
            alert('프로필 수정에 실패했습니다. 다시 시도해주세요.');
        }
    }

    closeProfileModal() {
        document.getElementById('profile-modal').classList.add('hidden');
    }

    async refreshData() {
        await this.loadInitialData();
        if (this.currentTab === 'applications') {
            await this.loadApplications();
        } else if (this.currentTab === 'matches') {
            await this.loadMatches();
        } else if (this.currentTab === 'jobs') {
            await this.loadRecommendedJobs();
        }
        alert('데이터가 새로고침되었습니다.');
    }

    switchTab(tabName) {
        console.log('JobSeekerProfile.switchTab 호출됨:', tabName);
        
        // 탭 버튼 상태 변경
        document.querySelectorAll('[id^="tab-"]').forEach(tab => {
            tab.classList.remove('border-wowcampus-blue', 'text-wowcampus-blue');
            tab.classList.add('border-transparent', 'text-gray-600');
        });

        const activeTab = document.getElementById(`tab-${tabName}`);
        console.log('활성 탭 요소:', activeTab);
        if (activeTab) {
            activeTab.classList.remove('border-transparent', 'text-gray-600');
            activeTab.classList.add('border-wowcampus-blue', 'text-wowcampus-blue');
        } else {
            console.error('탭 요소를 찾을 수 없습니다:', `tab-${tabName}`);
        }

        // 탭 컨텐츠 표시/숨김
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        const activeContent = document.getElementById(`content-${tabName}`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }

        this.currentTab = tabName;

        // 탭별 데이터 로드
        switch(tabName) {
            case 'applications':
                this.loadApplications();
                break;
            case 'matches':
                this.loadMatches();
                break;
            case 'jobs':
                this.loadRecommendedJobs();
                break;
            case 'documents':
                this.loadDocuments();
                break;
        }
    }

    // 유틸리티 함수들
    getGenderText(gender) {
        const genderMap = {
            'male': '남성',
            'female': '여성'
        };
        return genderMap[gender] || '미입력';
    }

    getKoreanLevelText(level) {
        const levelMap = {
            'beginner': '초급',
            'intermediate': '중급',
            'advanced': '고급',
            'native': '원어민급'
        };
        return levelMap[level] || '미입력';
    }

    getMatchStatusText(status) {
        const statusMap = {
            'pending': '대기 중',
            'viewed': '확인됨',
            'contacted': '연락받음',
            'applied': '지원함',
            'rejected': '거절됨'
        };
        return statusMap[status] || '대기 중';
    }

    formatSalary(amount) {
        if (amount >= 10000) {
            return `${Math.floor(amount / 10000)}만원`;
        }
        return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
    }

    async findMatches() {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/matching/generate', {
                job_seeker_id: this.jobSeekerId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('새로운 매칭을 생성했습니다!');
                this.switchTab('matches');
            }

        } catch (error) {
            console.error('매칭 생성 실패:', error);
            alert('매칭 생성에 실패했습니다.');
        }
    }

    async generateNewMatches() {
        await this.findMatches();
    }

    async viewJobDetail(jobId) {
        // 모달 열기
        const modal = document.getElementById('job-detail-modal');
        const loading = document.getElementById('job-detail-loading');
        const content = document.getElementById('job-detail-content');
        const error = document.getElementById('job-detail-error');

        modal.classList.remove('hidden');
        loading.classList.remove('hidden');
        content.classList.add('hidden');
        error.classList.add('hidden');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 200) {
                const job = response.data.job || response.data;
                this.populateJobDetailModal(job);
                
                loading.classList.add('hidden');
                content.classList.remove('hidden');
            }
        } catch (error) {
            console.error('구인공고 상세 정보 로드 실패:', error);
            loading.classList.add('hidden');
            error.classList.remove('hidden');

            // 로그인이 필요한 경우 처리
            if (error.response && error.response.status === 401) {
                const errorData = error.response.data;
                if (errorData.requireAuth) {
                    alert(errorData.message || '로그인이 필요합니다.');
                    this.closeJobDetailModal();
                    // 로그인 페이지로 리디렉션할 수도 있음
                    // window.location.href = '/static/login.html';
                }
            }
        }
    }

    populateJobDetailModal(job) {
        // 기본 정보
        document.getElementById('job-title').textContent = job.title || '제목 없음';
        document.getElementById('job-company').textContent = job.company_name || '회사명 없음';
        document.getElementById('job-location').textContent = job.work_location || '위치 정보 없음';
        document.getElementById('job-status').textContent = this.getJobStatusText(job.status);
        document.getElementById('job-deadline').textContent = job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집';

        // 급여 정보
        const salaryText = this.formatSalaryRange(job.salary_min, job.salary_max);
        document.getElementById('job-salary').textContent = salaryText;

        // 기타 정보
        document.getElementById('job-visa').textContent = job.required_visa || '비자 정보 없음';
        document.getElementById('job-category').textContent = job.job_category || '직종 정보 없음';
        document.getElementById('job-description').textContent = job.description || '업무 내용이 없습니다.';
        document.getElementById('job-requirements').textContent = job.requirements || '자격 요건이 없습니다.';
        document.getElementById('job-hours').textContent = job.work_hours || '근무 시간 정보 없음';
        document.getElementById('job-benefits').textContent = job.benefits || '복리후생 정보 없음';
        document.getElementById('job-korean-level').textContent = this.getKoreanLevelText(job.korean_level_required) || '수준 정보 없음';
        document.getElementById('job-experience').textContent = job.experience_required || '경력 요건 없음';

        // 지원하기 버튼에 jobId 설정
        const applyBtn = document.getElementById('job-apply-btn');
        applyBtn.onclick = () => this.applyToJob(job.id);
    }

    getJobStatusText(status) {
        const statusMap = {
            'active': '모집중',
            'pending': '검토중',
            'closed': '마감',
            'suspended': '일시정지'
        };
        return statusMap[status] || status;
    }

    formatSalaryRange(min, max) {
        if (!min && !max) return '급여 정보 없음';
        if (!max || min === max) return this.formatSalary(min);
        return `${this.formatSalary(min)} ~ ${this.formatSalary(max)}`;
    }

    closeJobDetailModal() {
        document.getElementById('job-detail-modal').classList.add('hidden');
    }

    async applyToJob(jobId) {
        if (!confirm('이 구인공고에 지원하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/applications', {
                job_posting_id: jobId,
                job_seeker_id: this.jobSeekerId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 201) {
                alert('지원이 완료되었습니다!');
                this.switchTab('applications');
            }

        } catch (error) {
            console.error('지원 실패:', error);
            if (error.response && error.response.data && error.response.data.error) {
                alert('지원 실패: ' + error.response.data.error);
            } else {
                alert('지원에 실패했습니다. 다시 시도해주세요.');
            }
        }
    }

    async cancelApplication(applicationId) {
        if (!confirm('지원을 취소하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/applications/${applicationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            alert('지원이 취소되었습니다.');
            this.loadApplications();

        } catch (error) {
            console.error('지원 취소 실패:', error);
            alert('지원 취소에 실패했습니다.');
        }
    }

    // 서류 관리 메서드들
    async loadDocuments() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/jobseeker/${this.currentUser.id}/documents`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const documents = await response.json();
                this.displayDocuments(documents);
                this.updateDocumentStats(documents);
            } else {
                console.error('서류 목록 조회 실패:', response.status);
            }
        } catch (error) {
            console.error('서류 목록 로드 오류:', error);
        }
    }

    displayDocuments(documents) {
        const container = document.getElementById('documents-list');
        const noDocuments = document.getElementById('no-documents');

        if (!documents || documents.length === 0) {
            container.innerHTML = '';
            noDocuments.classList.remove('hidden');
            return;
        }

        noDocuments.classList.add('hidden');
        
        container.innerHTML = documents.map(doc => `
            <div class="document-item bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-type="${doc.document_type}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-br ${this.getDocumentTypeColor(doc.document_type)} rounded-lg flex items-center justify-center">
                            <i class="fas ${this.getDocumentTypeIcon(doc.document_type)} text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${doc.original_filename}</h4>
                            <div class="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span><i class="fas fa-tag mr-1"></i>${this.getDocumentTypeLabel(doc.document_type)}</span>
                                <span><i class="fas fa-calendar mr-1"></i>${new Date(doc.upload_date).toLocaleDateString('ko-KR')}</span>
                                <span><i class="fas fa-hdd mr-1"></i>${this.formatFileSize(doc.file_size)}</span>
                            </div>
                            ${doc.description ? `<p class="text-sm text-gray-600 mt-1">${doc.description}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full ${doc.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                            ${doc.is_public ? '공개' : '비공개'}
                        </span>
                        <div class="flex space-x-1">
                            <button onclick="downloadDocument(${doc.id})" class="p-2 text-gray-400 hover:text-wowcampus-blue" title="다운로드">
                                <i class="fas fa-download"></i>
                            </button>
                            <button onclick="deleteDocument(${doc.id})" class="p-2 text-gray-400 hover:text-red-500" title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateDocumentStats(documents) {
        const resumeCount = documents.filter(doc => doc.document_type === 'resume').length;
        const certificateCount = documents.filter(doc => doc.document_type === 'certificate').length;
        const totalCount = documents.length;

        document.getElementById('resume-count').textContent = resumeCount;
        document.getElementById('certificate-count').textContent = certificateCount;
        document.getElementById('total-documents-count').textContent = totalCount;
    }

    getDocumentTypeColor(type) {
        const colors = {
            'resume': 'from-blue-500 to-blue-600',
            'certificate': 'from-green-500 to-green-600', 
            'diploma': 'from-purple-500 to-purple-600',
            'portfolio': 'from-orange-500 to-orange-600',
            'visa_copy': 'from-red-500 to-red-600',
            'other': 'from-gray-500 to-gray-600'
        };
        return colors[type] || colors.other;
    }

    getDocumentTypeIcon(type) {
        const icons = {
            'resume': 'fa-file-alt',
            'certificate': 'fa-certificate',
            'diploma': 'fa-graduation-cap', 
            'portfolio': 'fa-briefcase',
            'visa_copy': 'fa-passport',
            'other': 'fa-file'
        };
        return icons[type] || icons.other;
    }

    getDocumentTypeLabel(type) {
        const labels = {
            'resume': '이력서',
            'certificate': '자격증',
            'diploma': '학위증명서',
            'portfolio': '포트폴리오', 
            'visa_copy': '비자 사본',
            'other': '기타'
        };
        return labels[type] || '기타';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async uploadDocument(formData) {
        try {
            const response = await fetch('/api/upload/document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert('서류가 성공적으로 업로드되었습니다!');
                this.loadDocuments(); // 목록 새로고침
                return result;
            } else {
                const error = await response.json();
                throw new Error(error.message || '업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('서류 업로드 오류:', error);
            alert('서류 업로드에 실패했습니다: ' + error.message);
        }
    }

    async deleteDocument(documentId) {
        if (!confirm('정말로 이 서류를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                alert('서류가 삭제되었습니다.');
                this.loadDocuments(); // 목록 새로고침
            } else {
                throw new Error('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('서류 삭제 오류:', error);
            alert('서류 삭제에 실패했습니다.');
        }
    }

    filterDocuments(type) {
        const items = document.querySelectorAll('.document-item');
        const buttons = document.querySelectorAll('.document-filter-btn');

        // 버튼 스타일 업데이트
        buttons.forEach(btn => {
            btn.classList.remove('active', 'bg-wowcampus-blue', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });

        event.target.classList.add('active', 'bg-wowcampus-blue', 'text-white');
        event.target.classList.remove('bg-gray-200', 'text-gray-700');

        // 서류 필터링
        items.forEach(item => {
            if (type === 'all' || item.dataset.type === type) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 에이전트 정보 렌더링
    async renderAgentInfo() {
        const agentInfo = document.getElementById('agent-info');
        
        if (!this.profileData || !this.profileData.agent_id) {
            agentInfo.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-user-tie text-4xl mb-3"></i>
                    <p>연계된 에이전트가 없습니다</p>
                    <p class="text-sm mt-1">에이전트와 연결하면 더 나은 취업 지원을 받을 수 있습니다.</p>
                </div>
            `;
            return;
        }

        try {
            // 에이전트 상세 정보 가져오기
            const response = await axios.get(`/api/agents/${this.profileData.agent_id}`);
            const agent = response.data;

            agentInfo.innerHTML = `
                <div class="bg-white rounded-lg p-4 border border-gray-200">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-wowcampus-blue to-accent rounded-full flex items-center justify-center">
                                <i class="fas fa-handshake text-white text-xl"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800">${agent.company_name}</h4>
                                <p class="text-sm text-gray-600">${agent.contact_person}</p>
                                <p class="text-xs text-gray-500">${agent.country} 전문</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                <i class="fas fa-check-circle mr-1"></i>연결됨
                            </span>
                        </div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">연락처:</span>
                                <span class="font-medium ml-1">${agent.phone}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">이메일:</span>
                                <span class="font-medium ml-1">${agent.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('에이전트 정보 로드 실패:', error);
            agentInfo.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    에이전트 정보를 불러올 수 없습니다.
                </div>
            `;
        }
    }

    // 에이전트 변경 모달 열기
    async showAgentEditModal() {
        const modal = document.getElementById('agentEditModal');
        const agentSelect = document.getElementById('editAgentSelect');
        
        // 기존 옵션들 제거 (첫 번째 기본 옵션 제외)
        while (agentSelect.children.length > 1) {
            agentSelect.removeChild(agentSelect.lastChild);
        }
        
        try {
            // 에이전트 목록 로드
            const response = await axios.get('/api/agents/active');
            const agents = response.data;
            
            // 에이전트 목록 추가
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = `${agent.company_name} (${agent.country}) - ${agent.contact_person}`;
                agentSelect.appendChild(option);
            });
            
            // 현재 에이전트 선택
            if (this.profileData.agent_id) {
                agentSelect.value = this.profileData.agent_id;
            }
            
            modal.classList.remove('hidden');
        } catch (error) {
            console.error('에이전트 목록 로드 실패:', error);
            alert('에이전트 목록을 불러올 수 없습니다.');
        }
    }

    // 에이전트 변경 저장
    async saveAgentChange(agentId) {
        try {
            const response = await axios.put(`/api/job-seekers/${this.jobSeekerId}/agent`, {
                agent_id: agentId || null
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                alert('에이전트 정보가 성공적으로 업데이트되었습니다.');
                this.profileData.agent_id = agentId || null;
                this.renderAgentInfo();
                this.closeAgentModal();
            } else {
                throw new Error(response.data.error || '업데이트에 실패했습니다.');
            }
        } catch (error) {
            console.error('에이전트 변경 실패:', error);
            alert(error.response?.data?.error || '에이전트 변경 중 오류가 발생했습니다.');
        }
    }

    // 에이전트 모달 닫기
    closeAgentModal() {
        const modal = document.getElementById('agentEditModal');
        modal.classList.add('hidden');
    }
}

// 전역 함수들
function switchTab(tabName) {
    console.log('switchTab 호출됨:', tabName, 'profile 객체:', profile);
    if (profile) {
        profile.switchTab(tabName);
    } else {
        console.error('profile 객체가 정의되지 않았습니다.');
        alert('프로필이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }
}

function showProfileEditModal() {
    if (profile) {
        profile.showProfileEditModal();
    }
}

function closeProfileModal() {
    if (profile) {
        profile.closeProfileModal();
    }
}

function refreshData() {
    if (profile) {
        profile.refreshData();
    }
}

function findMatches() {
    if (profile) {
        profile.findMatches();
    }
}

function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// 서류 관리 관련 전역 함수들
function openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
    document.getElementById('upload-modal').classList.add('flex');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    document.getElementById('upload-modal').classList.remove('flex');
    // 폼 초기화
    document.getElementById('document-upload-form').reset();
}

function filterDocuments(type) {
    if (profile) {
        profile.filterDocuments(type);
    }
}

// 에이전트 관련 전역 함수들
function showAgentEditModal() {
    if (profile) {
        profile.showAgentEditModal();
    }
}

function closeAgentModal() {
    if (profile) {
        profile.closeAgentModal();
    }
}

function downloadDocument(documentId) {
    if (profile) {
        // 다운로드 구현 (실제 환경에서는 서버에서 파일을 제공해야 함)
        alert('다운로드 기능은 추후 구현될 예정입니다.');
    }
}

function deleteDocument(documentId) {
    if (profile) {
        profile.deleteDocument(documentId);
    }
}

// 서류 업로드 폼 처리 함수
function initializeUploadForm() {
    const uploadForm = document.getElementById('document-upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('document-file');
            const typeSelect = document.getElementById('document-type');
            const descriptionTextarea = document.getElementById('document-description');
            const isPublicCheckbox = document.getElementById('is-public');
            
            if (!fileInput.files[0] || !typeSelect.value) {
                alert('파일과 서류 유형을 선택해주세요.');
                return;
            }

            const file = fileInput.files[0];
            
            // 파일 크기 검사 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', typeSelect.value);
            formData.append('description', descriptionTextarea.value);
            formData.append('is_public', isPublicCheckbox.checked ? '1' : '0');
            formData.append('job_seeker_id', JSON.parse(localStorage.getItem('user')).id);

            if (profile) {
                const result = await profile.uploadDocument(formData);
                if (result) {
                    closeUploadModal();
                }
            }
        });
    }
}

// 에이전트 변경 폼 초기화 함수
function initializeAgentForm() {
    const agentEditForm = document.getElementById('agentEditForm');
    if (agentEditForm) {
        agentEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const agentSelect = document.getElementById('editAgentSelect');
            const agentId = agentSelect.value;
            
            if (profile) {
                await profile.saveAgentChange(agentId);
            }
        });
    }
}

// 프로필 관리 초기화
let profile;
document.addEventListener('DOMContentLoaded', () => {
    profile = new JobSeekerProfile();
    
    // 폼 초기화
    initializeUploadForm();
    initializeAgentForm();
});

// 전역 함수들 (HTML onclick에서 사용)
function closeJobDetailModal() {
    if (profile) {
        profile.closeJobDetailModal();
    }
}