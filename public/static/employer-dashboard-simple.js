// 구인기업 대시보드 JavaScript - 간소화 버전

class EmployerDashboard {
    constructor() {
        this.currentTab = 'jobs';
        this.employerId = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        // 로그인 상태 및 권한 확인
        this.checkAuthAndPermissions();
        
        // 로그인한 사용자의 ID를 employerId로 사용
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.employerId = user.id;
        
        console.log('DEBUG - localStorage user:', user);
        console.log('DEBUG - employerId:', this.employerId);
        
        if (!this.employerId) {
            alert('사용자 정보를 찾을 수 없습니다.');
            window.location.href = '/static/login.html';
            return;
        }

        // 이벤트 바인딩
        this.bindEvents();
        
        // 초기 데이터 로드
        this.loadInitialData();
    }

    checkAuthAndPermissions() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) {
            alert('로그인이 필요합니다.');
            window.location.href = '/static/login.html';
            return;
        }

        if (user.type !== 'employer') {
            alert('구인기업만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        this.currentUser = user;
    }

    bindEvents() {
        // 폼 제출 이벤트
        const jobForm = document.getElementById('job-form');
        if (jobForm) {
            jobForm.addEventListener('submit', (e) => this.handleJobSubmit(e));
        }

        // 필터 이벤트
        const jobsFilter = document.getElementById('jobs-filter');
        if (jobsFilter) {
            jobsFilter.addEventListener('change', () => this.loadMyJobs());
        }

        const applicationsFilter = document.getElementById('applications-filter');
        if (applicationsFilter) {
            applicationsFilter.addEventListener('change', () => this.loadApplications());
        }
    }

    async loadInitialData() {
        try {
            // 사용자 정보 업데이트
            this.updateUserInfo();
            
            await Promise.all([
                this.loadStats(),
                this.loadMyJobs()
            ]);
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }

    updateUserInfo() {
        const user = this.currentUser;
        
        // 회사명 표시
        const companyNameEl = document.getElementById('company-name');
        if (companyNameEl && user.company_name) {
            companyNameEl.textContent = user.company_name;
        }
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/employers/${this.employerId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const stats = response.data;
            document.getElementById('stat-jobs').textContent = stats.total_jobs || 0;
            document.getElementById('stat-applications').textContent = stats.total_applications || 0;
            document.getElementById('stat-pending').textContent = stats.pending_applications || 0;
            document.getElementById('stat-matches').textContent = stats.total_matches || 0;

        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    async loadMyJobs() {
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('jobs-filter')?.value || 'all';
            
            let url = `/api/employers/${this.employerId}/jobs`;
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const jobs = response.data.jobs || [];
            this.renderJobsList(jobs);

        } catch (error) {
            console.error('구인공고 로드 실패:', error);
            this.renderJobsList([]);
        }
    }

    renderJobsList(jobs) {
        const container = document.getElementById('jobs-list');
        container.innerHTML = '';

        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-briefcase text-4xl mb-4 text-gray-300"></i>
                    <p>등록된 구인공고가 없습니다.</p>
                    <button onclick="showJobRegisterModal()" class="mt-4 bg-wowcampus-blue text-white px-6 py-2 rounded-lg hover:bg-wowcampus-dark">
                        첫 번째 구인공고 등록하기
                    </button>
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
        
        const statusColors = {
            'active': 'bg-green-100 text-green-800',
            'closed': 'bg-red-100 text-red-800',
            'draft': 'bg-yellow-100 text-yellow-800'
        };

        const statusText = {
            'active': '모집중',
            'closed': '마감',
            'draft': '임시저장'
        };

        const salaryText = job.salary_min && job.salary_max ? 
            `${job.salary_min/10000}만원 ~ ${job.salary_max/10000}만원` : 
            '급여 협의';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">${job.title}</h4>
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
                            <i class="fas fa-users w-4 mr-1"></i>
                            ${job.positions || 1}명 모집
                        </span>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${statusColors[job.status] || statusColors.active}">
                    ${statusText[job.status] || '모집중'}
                </span>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t">
                <div class="text-sm text-gray-500">
                    <span>등록: ${new Date(job.created_at).toLocaleDateString('ko-KR')}</span>
                    <span class="ml-4">마감: ${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="dashboard.editJob(${job.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i class="fas fa-edit mr-1"></i>수정
                    </button>
                    <button onclick="dashboard.viewJobApplications(${job.id})" class="text-green-600 hover:text-green-800 text-sm font-medium">
                        <i class="fas fa-users mr-1"></i>지원자 보기
                    </button>
                    <button onclick="dashboard.deleteJob(${job.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">
                        <i class="fas fa-trash mr-1"></i>삭제
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    async loadApplications() {
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('applications-filter')?.value || 'all';
            
            let url = `/api/employers/${this.employerId}/applications`;
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const applications = response.data.applications || [];
            this.renderApplicationsList(applications);

        } catch (error) {
            console.error('지원자 로드 실패:', error);
            this.renderApplicationsList([]);
        }
    }

    renderApplicationsList(applications) {
        const container = document.getElementById('applications-list');
        container.innerHTML = '';

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-4 text-gray-300"></i>
                    <p>지원자가 없습니다.</p>
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
            'submitted': 'bg-blue-100 text-blue-800',
            'interview': 'bg-purple-100 text-purple-800',
            'accepted': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'pending': '검토 대기',
            'submitted': '검토 중',
            'interview': '면접 대상',
            'accepted': '승인됨',
            'rejected': '거절됨'
        };

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800">${application.job_seeker_name}</h4>
                    <p class="text-sm text-gray-600 mb-2">
                        <i class="fas fa-briefcase mr-1"></i>지원공고: ${application.job_title}
                    </p>
                    <div class="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                        <span class="flex items-center">
                            <i class="fas fa-flag w-4 mr-1 text-gray-400"></i>
                            ${application.nationality}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-language w-4 mr-1 text-gray-400"></i>
                            한국어 ${application.korean_level}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-id-card w-4 mr-1 text-gray-400"></i>
                            ${application.current_visa}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-envelope w-4 mr-1 text-gray-400"></i>
                            ${application.job_seeker_email}
                        </span>
                    </div>
                </div>
                <div class="flex flex-col items-end space-y-2">
                    <span class="px-3 py-1 text-xs rounded-full font-medium ${statusColors[application.application_status] || statusColors.pending}">
                        ${statusText[application.application_status] || '검토 대기'}
                    </span>
                </div>
            </div>
            
            <div class="flex justify-between items-center mt-4 pt-4 border-t">
                <div class="text-sm text-gray-500">
                    <i class="fas fa-clock mr-1"></i>지원일: ${new Date(application.applied_at || application.created_at).toLocaleDateString('ko-KR')}
                </div>
                <div class="flex space-x-2">
                    <button onclick="dashboard.viewApplicantDetail(${application.job_seeker_id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i class="fas fa-user mr-1"></i>상세보기
                    </button>
                    <button onclick="dashboard.updateApplicationStatus(${application.application_id}, 'accepted')" class="text-green-600 hover:text-green-800 text-sm font-medium">
                        <i class="fas fa-check mr-1"></i>승인
                    </button>
                    <button onclick="dashboard.updateApplicationStatus(${application.application_id}, 'rejected')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                        <i class="fas fa-times mr-1"></i>거절
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // 탭 전환 기능
    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // 탭 버튼 상태 변경
        document.querySelectorAll('[id^="tab-"]').forEach(tab => {
            tab.classList.remove('border-wowcampus-blue', 'text-wowcampus-blue');
            tab.classList.add('border-transparent', 'text-gray-600');
        });

        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) {
            activeTab.classList.remove('border-transparent', 'text-gray-600');
            activeTab.classList.add('border-wowcampus-blue', 'text-wowcampus-blue');
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
            case 'jobs':
                this.loadMyJobs();
                break;
            case 'applications':
                this.loadApplications();
                break;
            case 'matches':
                this.loadMatches();
                break;
        }
    }

    async loadMatches() {
        const container = document.getElementById('matches-list');
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-handshake text-4xl mb-4 text-gray-300"></i>
                <p>AI 매칭 결과가 없습니다.</p>
                <button onclick="dashboard.generateMatches()" class="mt-4 bg-accent text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    새 매칭 생성하기
                </button>
            </div>
        `;
    }

    async generateMatches() {
        alert('매칭 생성 기능은 추후 구현될 예정입니다.');
    }

    showJobRegisterModal() {
        alert('구인공고 등록 기능은 추후 구현될 예정입니다.');
    }

    async editJob(jobId) {
        alert('구인공고 수정 기능은 추후 구현될 예정입니다.');
    }

    async deleteJob(jobId) {
        if (!confirm('정말로 이 구인공고를 삭제하시겠습니까?')) {
            return;
        }
        alert('삭제 기능은 추후 구현될 예정입니다.');
    }

    viewJobApplications(jobId) {
        this.switchTab('applications');
    }

    async viewApplicantDetail(jobSeekerId) {
        alert('지원자 상세보기 기능은 추후 구현될 예정입니다.');
    }

    async updateApplicationStatus(applicationId, status) {
        alert('지원 상태 변경 기능은 추후 구현될 예정입니다.');
    }

    async refreshData() {
        await this.loadInitialData();
        alert('데이터가 새로고침되었습니다.');
    }
}

// 전역 함수들
function switchTab(tabName) {
    if (dashboard) {
        dashboard.switchTab(tabName);
    }
}

function showJobRegisterModal() {
    if (dashboard) {
        dashboard.showJobRegisterModal();
    }
}

function refreshData() {
    if (dashboard) {
        dashboard.refreshData();
    }
}

function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// 대시보드 초기화
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing dashboard');
    dashboard = new EmployerDashboard();
    console.log('Dashboard initialized:', dashboard);
});