// 에이전트 대시보드 JavaScript - 안정화 버전

class AgentDashboard {
    constructor() {
        this.currentTab = 'jobseekers';
        this.currentPage = 1;
        this.agentId = this.getAgentId();
        this.isInitialized = false;
        this.initTimeoutId = null;
        this.init();
    }

    init() {
        // 중복 초기화 방지
        if (this.isInitialized) {
            console.warn('Dashboard already initialized');
            return;
        }

        // 이전 타임아웃 클리어
        if (this.initTimeoutId) {
            clearTimeout(this.initTimeoutId);
        }

        try {
            this.setupTabs();
            this.setupModal();
            this.setupEventListeners();
            this.loadInitialData();
            this.isInitialized = true;
            console.log('Agent dashboard initialized successfully');
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('대시보드 초기화 실패: ' + error.message);
        }
    }

    getAgentId() {
        // 실제 환경에서는 JWT 토큰에서 추출하거나 세션에서 가져옴
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('agentId') || '1'; // 기본값으로 1 사용
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.id.replace('tab-', '');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // 버튼 상태 업데이트
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white', 'border-primary');
            btn.classList.add('text-gray-600', 'hover:bg-gray-50');
        });
        
        const activeButton = document.getElementById(`tab-${tabId}`);
        activeButton.classList.remove('text-gray-600', 'hover:bg-gray-50');
        activeButton.classList.add('bg-primary', 'text-white', 'border-b-2', 'border-primary');

        // 컨텐츠 표시/숨기기
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        document.getElementById(`content-${tabId}`).classList.remove('hidden');
        
        this.currentTab = tabId;
        this.loadTabData(tabId);
    }

    setupModal() {
        const modal = document.getElementById('jobseeker-modal');
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-btn');
        const addBtn = document.getElementById('add-jobseeker-btn');

        addBtn.addEventListener('click', () => this.openModal());
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());

        // 모달 외부 클릭시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // 폼 제출
        document.getElementById('jobseeker-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveJobseeker();
        });

        // 유학생 모달 설정
        const studentModal = document.getElementById('student-modal');
        const closeStudentBtn = document.getElementById('close-student-modal');
        const cancelStudentBtn = document.getElementById('cancel-student-btn');

        closeStudentBtn.addEventListener('click', () => this.closeStudentModal());
        cancelStudentBtn.addEventListener('click', () => this.closeStudentModal());

        // 유학생 모달 외부 클릭시 닫기
        studentModal.addEventListener('click', (e) => {
            if (e.target === studentModal) {
                this.closeStudentModal();
            }
        });

        // 유학생 폼 제출
        document.getElementById('student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStudent();
        });
    }

    setupEventListeners() {
        // 검색 기능
        document.getElementById('search-btn').addEventListener('click', () => {
            this.searchJobseekers();
        });

        // 엔터키로 검색
        document.getElementById('search-jobseekers').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchJobseekers();
            }
        });

        // 구인정보 필터
        document.getElementById('jobs-visa-filter').addEventListener('change', () => {
            this.loadJobPostings();
        });

        document.getElementById('jobs-region-filter').addEventListener('change', () => {
            this.loadJobPostings();
        });

        // 유학생 등록 버튼
        document.getElementById('add-student-btn').addEventListener('click', () => {
            this.showStudentModal();
        });

        // 로그아웃
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    async loadInitialData() {
        try {
            // 비동기 로딩을 순차적으로 처리하여 충돌 방지
            await this.loadAgentStats();
            
            // 작은 지연을 두어 DOM 안정화
            setTimeout(async () => {
                try {
                    await this.loadJobseekers();
                } catch (error) {
                    console.error('구직자 데이터 로드 실패:', error);
                    this.showError('구직자 데이터 로드에 실패했습니다.');
                }
            }, 100);
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            this.showError('초기 데이터 로드에 실패했습니다.');
        }
    }

    showError(message) {
        console.error(message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg z-50';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            try {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            } catch (e) {
                console.error('Error removing error message:', e);
            }
        }, 5000);
    }

    async loadTabData(tabId) {
        try {
            // 탭 데이터 로딩 중복 방지
            if (this.loadingTabs && this.loadingTabs[tabId]) {
                console.warn(`Tab ${tabId} is already loading`);
                return;
            }
            
            if (!this.loadingTabs) {
                this.loadingTabs = {};
            }
            this.loadingTabs[tabId] = true;

            switch(tabId) {
                case 'jobseekers':
                    await this.loadJobseekers();
                    break;
                case 'jobs':
                    await this.loadJobPostings();
                    break;
                case 'applications':
                    await this.loadApplications();
                    break;
                case 'study':
                    await this.loadStudyPrograms();
                    await this.loadStudents();
                    break;
                default:
                    console.warn('Unknown tab:', tabId);
            }
        } catch (error) {
            console.error(`Tab ${tabId} data loading failed:`, error);
            this.showError(`${tabId} 탭 데이터 로드에 실패했습니다.`);
        } finally {
            if (this.loadingTabs) {
                this.loadingTabs[tabId] = false;
            }
        }
    }

    async loadAgentStats() {
        try {
            const [jobseekers, applications, studyApps] = await Promise.all([
                axios.get(`/api/agent/${this.agentId}/job-seekers`),
                axios.get(`/api/agent/${this.agentId}/job-applications`),
                axios.get(`/api/agent/${this.agentId}/study-applications`)
            ]);

            const totalJobseekers = jobseekers.data.jobSeekers.length;
            const activeApps = applications.data?.applications?.filter(app => 
                ['pending', 'submitted', 'interview'].includes(app.application_status)
            ).length || 0;
            const studyAppsCount = studyApps.data?.applications?.length || 0;
            const successfulMatches = applications.data?.applications?.filter(app => 
                app.application_status === 'accepted'
            ).length || 0;

            document.getElementById('total-jobseekers').textContent = totalJobseekers;
            document.getElementById('active-applications').textContent = activeApps;
            document.getElementById('study-applications').textContent = studyAppsCount;
            document.getElementById('successful-matches').textContent = successfulMatches;

        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    async loadJobseekers() {
        try {
            const response = await axios.get(`/api/agent/${this.agentId}/job-seekers`);
            const jobseekers = response.data.jobSeekers;
            
            this.renderJobseekersTable(jobseekers);
        } catch (error) {
            console.error('구직자 목록 로드 실패:', error);
            this.showError('구직자 목록을 불러오는데 실패했습니다.');
        }
    }

    renderJobseekersTable(jobseekers) {
        const tbody = document.getElementById('jobseekers-table-body');
        tbody.innerHTML = '';

        if (jobseekers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        등록된 구직자가 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        jobseekers.forEach(jobseeker => {
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            
            const koreanLevelMap = {
                'beginner': '초급',
                'intermediate': '중급', 
                'advanced': '고급',
                'native': '원어민급'
            };

            const statusMap = {
                'active': { text: '활성', class: 'badge-green' },
                'inactive': { text: '비활성', class: 'badge-red' },
                'matched': { text: '매칭완료', class: 'badge-blue' }
            };

            const status = statusMap[jobseeker.status] || { text: jobseeker.status, class: 'badge-yellow' };

            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${jobseeker.name}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${jobseeker.nationality}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${jobseeker.current_visa || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${jobseeker.desired_visa || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${koreanLevelMap[jobseeker.korean_level] || '-'}</td>
                <td class="px-4 py-3 text-sm">
                    <span class="badge ${status.class}">${status.text}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center space-x-2">
                        <button onclick="dashboard.editJobseeker(${jobseeker.id})" 
                                class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="dashboard.viewJobseekerDetail(${jobseeker.id})" 
                                class="text-green-500 hover:text-green-700">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="dashboard.deleteJobseeker(${jobseeker.id})" 
                                class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    async loadJobPostings() {
        try {
            const visaFilter = document.getElementById('jobs-visa-filter').value;
            const regionFilter = document.getElementById('jobs-region-filter').value;
            
            let url = '/api/jobs?';
            if (visaFilter) url += `visa=${visaFilter}&`;
            if (regionFilter) url += `region=${regionFilter}&`;
            
            const response = await axios.get(url);
            const jobs = response.data.jobs;
            
            this.renderJobsList(jobs);
        } catch (error) {
            console.error('구인 정보 로드 실패:', error);
        }
    }

    renderJobsList(jobs) {
        const container = document.getElementById('jobs-list');
        container.innerHTML = '';

        if (jobs.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">조건에 맞는 구인 정보가 없습니다.</p>';
            return;
        }

        jobs.forEach(job => {
            const card = this.createJobCard(job);
            container.appendChild(card);
        });
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-md transition-shadow';
        
        const salaryRange = job.salary_min && job.salary_max ? 
            `${this.formatSalary(job.salary_min)} - ${this.formatSalary(job.salary_max)}` : 
            '급여 협의';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">${job.title}</h4>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span><i class="fas fa-building mr-1"></i>${job.company_name}</span>
                        <span><i class="fas fa-map-marker-alt mr-1"></i>${job.work_location}</span>
                        <span><i class="fas fa-won-sign mr-1"></i>${salaryRange}</span>
                    </div>
                </div>
                <div class="flex flex-col space-y-2">
                    <span class="badge badge-blue">${job.required_visa}</span>
                    <span class="badge badge-green">${job.job_category}</span>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-sm text-gray-600 mb-2">${job.description || ''}</p>
                <div class="text-xs text-gray-500">
                    <span>마감: ${job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : '상시모집'}</span>
                    <span class="ml-4">한국어: ${job.korean_level_required || '-'}</span>
                    <span class="ml-4">경력: ${job.experience_required || '-'}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center">
                <button onclick="dashboard.viewJobDetail(${job.id})" 
                        class="text-primary hover:text-secondary font-medium text-sm">
                    상세보기 <i class="fas fa-arrow-right ml-1"></i>
                </button>
                <button onclick="dashboard.matchJobseekers(${job.id})" 
                        class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-secondary">
                    <i class="fas fa-users mr-1"></i>매칭하기
                </button>
            </div>
        `;

        return card;
    }

    async loadApplications() {
        // 지원 현황 로드
        const container = document.getElementById('applications-list');
        container.innerHTML = '<p class="text-gray-500">지원 현황 기능은 개발 중입니다.</p>';
    }

    async loadStudyPrograms() {
        // 유학 프로그램 로드
        const container = document.getElementById('study-programs-list');
        container.innerHTML = '<p class="text-gray-500">유학 지원 기능은 개발 중입니다.</p>';
    }

    openModal(jobseekerId = null) {
        const modal = document.getElementById('jobseeker-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('jobseeker-form');
        
        if (jobseekerId) {
            title.textContent = '구직자 정보 수정';
            // 기존 데이터 로드하여 폼에 채우기
            this.loadJobseekerForEdit(jobseekerId);
        } else {
            title.textContent = '구직자 등록';
            form.reset();
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('jobseeker-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    async saveJobseeker() {
        try {
            const formData = {
                email: document.getElementById('jobseeker-email').value,
                password: document.getElementById('jobseeker-password').value,
                name: document.getElementById('jobseeker-name').value,
                birth_date: document.getElementById('jobseeker-birthdate').value,
                gender: document.getElementById('jobseeker-gender').value,
                nationality: document.getElementById('jobseeker-nationality').value,
                current_visa: document.getElementById('jobseeker-current-visa').value,
                desired_visa: document.getElementById('jobseeker-desired-visa').value,
                phone: document.getElementById('jobseeker-phone').value,
                current_address: document.getElementById('jobseeker-address').value,
                korean_level: document.getElementById('jobseeker-korean-level').value,
                education_level: document.getElementById('jobseeker-education').value,
                work_experience: document.getElementById('jobseeker-experience').value,
                agent_id: this.agentId
            };

            await axios.post('/api/agent/job-seekers', formData);
            
            this.showSuccess('구직자가 성공적으로 등록되었습니다.');
            this.closeModal();
            await this.loadJobseekers();
            await this.loadAgentStats();
            
        } catch (error) {
            console.error('구직자 저장 실패:', error);
            this.showError('구직자 등록 중 오류가 발생했습니다.');
        }
    }

    searchJobseekers() {
        const searchTerm = document.getElementById('search-jobseekers').value;
        const visaFilter = document.getElementById('filter-visa').value;
        const koreanFilter = document.getElementById('filter-korean').value;
        
        // 검색 로직 구현
        console.log('검색:', { searchTerm, visaFilter, koreanFilter });
        this.loadJobseekers();
    }

    editJobseeker(id) {
        this.openModal(id);
    }

    viewJobseekerDetail(id) {
        alert(`구직자 상세 정보 (ID: ${id})\\n상세 페이지 기능은 추후 구현됩니다.`);
    }

    async deleteJobseeker(id) {
        if (!confirm('정말로 이 구직자를 삭제하시겠습니까?')) {
            return;
        }

        try {
            await axios.delete(`/api/agent/job-seekers/${id}`);
            this.showSuccess('구직자가 삭제되었습니다.');
            await this.loadJobseekers();
            await this.loadAgentStats();
        } catch (error) {
            console.error('구직자 삭제 실패:', error);
            this.showError('구직자 삭제 중 오류가 발생했습니다.');
        }
    }

    viewJobDetail(jobId) {
        alert(`구인 공고 상세 (ID: ${jobId})\\n상세 페이지 기능은 추후 구현됩니다.`);
    }

    matchJobseekers(jobId) {
        alert(`구직자 매칭 (Job ID: ${jobId})\\n매칭 기능은 추후 구현됩니다.`);
    }

    formatSalary(amount) {
        if (amount >= 10000) {
            return `${Math.floor(amount / 10000)}만원`;
        }
        return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
    }

    showSuccess(message) {
        // 성공 메시지 표시 (toast 등)
        alert('✅ ' + message);
    }

    showError(message) {
        // 에러 메시지 표시 (toast 등)
        alert('❌ ' + message);
    }

    // 유학생 관련 메서드들
    showStudentModal() {
        document.getElementById('student-modal').classList.remove('hidden');
        document.getElementById('student-form').reset();
    }

    closeStudentModal() {
        document.getElementById('student-modal').classList.add('hidden');
    }

    async saveStudent() {
        try {
            const formData = new FormData(document.getElementById('student-form'));
            const studentData = {
                email: document.getElementById('student-email').value,
                password: document.getElementById('student-password').value,
                name: document.getElementById('student-name').value,
                birth_date: document.getElementById('student-birthdate').value,
                gender: document.getElementById('student-gender').value,
                nationality: document.getElementById('student-nationality').value,
                current_visa: document.getElementById('student-current-visa').value,
                desired_visa: document.getElementById('student-desired-visa').value,
                phone: document.getElementById('student-phone').value,
                current_address: document.getElementById('student-address').value,
                korean_level: document.getElementById('student-korean-level').value,
                education_level: document.getElementById('student-education').value,
                agent_id: this.agentId
            };

            const response = await axios.post('/api/auth/register/jobseeker', studentData);

            if (response.data.success) {
                alert('유학생이 성공적으로 등록되었습니다!');
                this.closeStudentModal();
                this.loadStudents(); // 유학생 목록 새로고침
            }
        } catch (error) {
            console.error('유학생 등록 실패:', error);
            alert('유학생 등록에 실패했습니다: ' + (error.response?.data?.error || '알 수 없는 오류'));
        }
    }

    async loadStudents() {
        try {
            const response = await axios.get(`/api/agents/${this.agentId}/students`);
            const students = response.data.students || [];
            this.renderStudents(students);
        } catch (error) {
            console.error('유학생 목록 로드 실패:', error);
            document.getElementById('students-list').innerHTML = '<p class="text-gray-500">유학생 목록을 불러올 수 없습니다.</p>';
        }
    }

    renderStudents(students) {
        const container = document.getElementById('students-list');
        
        if (students.length === 0) {
            container.innerHTML = '<p class="text-gray-500">등록된 유학생이 없습니다.</p>';
            return;
        }

        const studentsHtml = students.map(student => `
            <div class="bg-white p-4 rounded-lg border">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium text-gray-800">${student.name}</h4>
                        <p class="text-sm text-gray-600">${student.email}</p>
                        <p class="text-sm text-gray-600">국적: ${student.nationality}</p>
                        <p class="text-sm text-gray-600">한국어: ${student.korean_level || '미설정'}</p>
                        <p class="text-sm text-gray-600">희망비자: ${student.desired_visa || '미설정'}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="dashboard.editStudent(${student.id})" class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="dashboard.deleteStudent(${student.id})" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = studentsHtml;
    }

    async editStudent(studentId) {
        // 유학생 수정 기능 구현
        alert('유학생 수정 기능은 추후 구현 예정입니다.');
    }

    async deleteStudent(studentId) {
        if (confirm('이 유학생을 삭제하시겠습니까?')) {
            try {
                await axios.delete(`/api/job-seekers/${studentId}`);
                alert('유학생이 삭제되었습니다.');
                this.loadStudents();
            } catch (error) {
                console.error('유학생 삭제 실패:', error);
                alert('유학생 삭제에 실패했습니다.');
            }
        }
    }

    logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            // 토큰 삭제 등
            localStorage.removeItem('authToken');
            window.location.href = '/';
        }
    }
}

// 대시보드 초기화 - 안전 가드 추가
let dashboard;
let isInitializing = false;

function initializeDashboard() {
    if (isInitializing || dashboard) {
        console.warn('Dashboard initialization already in progress or completed');
        return;
    }
    
    isInitializing = true;
    
    try {
        dashboard = new AgentDashboard();
        console.log('Dashboard initialization completed');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        // 사용자에게 오류 표시
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg z-50';
        errorDiv.textContent = '대시보드 초기화에 실패했습니다. 페이지를 새로고침해주세요.';
        document.body.appendChild(errorDiv);
    } finally {
        isInitializing = false;
    }
}

// DOM 로드 완료 시 대시보드 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM이 이미 로드된 경우 즉시 실행
    initializeDashboard();
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (dashboard && dashboard.initTimeoutId) {
        clearTimeout(dashboard.initTimeoutId);
    }
});