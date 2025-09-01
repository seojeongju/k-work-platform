// 구인기업 대시보드 JavaScript

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
        
        // URL에서 employerId 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        this.employerId = urlParams.get('employerId');
        
        if (!this.employerId) {
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
        
        // 회사명 표시
        const companyNameEl = document.getElementById('company-name');
        if (companyNameEl) {
            companyNameEl.textContent = user.company_name || user.name || '기업명';
        }
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
            await Promise.all([
                this.loadStats(),
                this.loadMyJobs()
            ]);
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            const [jobsResponse, applicationsResponse, matchesResponse] = await Promise.all([
                axios.get(`/api/employers/${this.employerId}/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get(`/api/employers/${this.employerId}/applications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get(`/api/employers/${this.employerId}/matches`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const jobs = jobsResponse.data.jobs || [];
            const applications = applicationsResponse.data.applications || [];
            const matches = matchesResponse.data.matches || [];

            // 통계 업데이트
            document.getElementById('stat-jobs').textContent = jobs.length;
            document.getElementById('stat-applications').textContent = applications.length;
            document.getElementById('stat-pending').textContent = applications.filter(app => app.status === 'pending').length;
            document.getElementById('stat-matches').textContent = matches.filter(match => match.status === 'accepted').length;

        } catch (error) {
            console.error('통계 로드 실패:', error);
            // 기본값으로 설정
            document.getElementById('stat-jobs').textContent = '0';
            document.getElementById('stat-applications').textContent = '0';
            document.getElementById('stat-pending').textContent = '0';
            document.getElementById('stat-matches').textContent = '0';
        }
    }

    async loadMyJobs() {
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('jobs-filter').value;
            
            let url = `/api/jobs?employer_id=${this.employerId}`;
            if (filter !== 'all') {
                url += `&status=${filter}`;
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
                    <button onclick="dashboard.showJobRegisterModal()" class="mt-4 bg-wowcampus-blue text-white px-6 py-2 rounded-lg hover:bg-wowcampus-dark">
                        첫 구인공고 등록하기
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
            const filter = document.getElementById('applications-filter').value;
            
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
            'reviewed': 'bg-blue-100 text-blue-800',
            'interviewed': 'bg-purple-100 text-purple-800',
            'hired': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'pending': '검토 대기',
            'reviewed': '검토 완료',
            'interviewed': '면접 완료',
            'hired': '채용 확정',
            'rejected': '불합격'
        };

        // 첨부 서류 정보 가져오기
        this.loadApplicationDocuments(application.application_id).then(documents => {
            const documentsSection = card.querySelector('.documents-section');
            if (documentsSection && documents.length > 0) {
                documentsSection.innerHTML = `
                    <div class="mt-4 pt-4 border-t">
                        <h5 class="text-sm font-medium text-gray-800 mb-2">
                            <i class="fas fa-paperclip mr-1"></i>첨부 서류 (${documents.length}개)
                        </h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${documents.map(doc => `
                                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div class="flex items-center space-x-2 flex-1">
                                        <i class="fas ${this.getDocumentIcon(doc.document_type)} text-gray-500"></i>
                                        <span class="text-sm text-gray-700 truncate">${doc.original_filename}</span>
                                        <span class="text-xs text-gray-500">(${this.formatFileSize(doc.file_size)})</span>
                                    </div>
                                    <button onclick="downloadDocument(${doc.document_id})" 
                                            class="text-wowcampus-blue hover:text-wowcampus-dark text-sm p-1"
                                            title="다운로드">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (documentsSection) {
                documentsSection.innerHTML = `
                    <div class="mt-4 pt-4 border-t">
                        <p class="text-sm text-gray-500">
                            <i class="fas fa-exclamation-circle mr-1"></i>첨부된 서류가 없습니다
                        </p>
                    </div>
                `;
            }
        });

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
                    <div class="flex space-x-1">
                        <button onclick="viewApplicantProfile(${application.job_seeker_id})" 
                                class="text-wowcampus-blue hover:text-wowcampus-dark text-sm p-2"
                                title="프로필 보기">
                            <i class="fas fa-user"></i>
                        </button>
                        <button onclick="sendMessage(${application.job_seeker_id})" 
                                class="text-green-600 hover:text-green-700 text-sm p-2"
                                title="메시지 보내기">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button onclick="updateApplicationStatus(${application.application_id})" 
                                class="text-purple-600 hover:text-purple-700 text-sm p-2"
                                title="상태 변경">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 서류 섹션 (동적으로 로드됨) -->
            <div class="documents-section">
                <div class="flex justify-center py-2">
                    <i class="fas fa-spinner fa-spin text-gray-400"></i>
                    <span class="text-sm text-gray-500 ml-2">서류 정보 로드 중...</span>
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
                    <button onclick="dashboard.updateApplicationStatus(${application.id}, 'reviewed')" class="text-green-600 hover:text-green-800 text-sm font-medium">
                        <i class="fas fa-check mr-1"></i>승인
                    </button>
                    <button onclick="dashboard.updateApplicationStatus(${application.id}, 'rejected')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                        <i class="fas fa-times mr-1"></i>거절
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    showJobRegisterModal() {
        document.getElementById('modal-title').textContent = '새 구인공고 등록';
        document.getElementById('job-id').value = '';
        document.getElementById('job-form').reset();
        document.getElementById('job-modal').classList.remove('hidden');
    }

    async editJob(jobId) {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const job = response.data.job;
            
            // 폼에 데이터 채우기
            document.getElementById('modal-title').textContent = '구인공고 수정';
            document.getElementById('job-id').value = job.id;
            document.getElementById('job-title').value = job.title || '';
            document.getElementById('job-category').value = job.job_category || '';
            document.getElementById('work-location').value = job.work_location || '';
            document.getElementById('required-visa').value = job.required_visa || '';
            document.getElementById('salary-min').value = job.salary_min ? job.salary_min / 10000 : '';
            document.getElementById('salary-max').value = job.salary_max ? job.salary_max / 10000 : '';
            document.getElementById('positions').value = job.positions || 1;
            document.getElementById('korean-level').value = job.korean_level_required || '';
            document.getElementById('deadline').value = job.deadline ? job.deadline.split('T')[0] : '';
            document.getElementById('job-description').value = job.description || '';

            document.getElementById('job-modal').classList.remove('hidden');

        } catch (error) {
            console.error('구인공고 조회 실패:', error);
            alert('구인공고 정보를 불러올 수 없습니다.');
        }
    }

    async handleJobSubmit(event) {
        event.preventDefault();
        
        const jobId = document.getElementById('job-id').value;
        const isEdit = !!jobId;
        
        const formData = {
            title: document.getElementById('job-title').value,
            job_category: document.getElementById('job-category').value,
            work_location: document.getElementById('work-location').value,
            required_visa: document.getElementById('required-visa').value,
            salary_min: document.getElementById('salary-min').value ? parseInt(document.getElementById('salary-min').value) * 10000 : null,
            salary_max: document.getElementById('salary-max').value ? parseInt(document.getElementById('salary-max').value) * 10000 : null,
            positions: parseInt(document.getElementById('positions').value) || 1,
            korean_level_required: document.getElementById('korean-level').value,
            deadline: document.getElementById('deadline').value || null,
            description: document.getElementById('job-description').value,
            employer_id: parseInt(this.employerId)
        };

        try {
            const token = localStorage.getItem('token');
            let response;

            if (isEdit) {
                response = await axios.put(`/api/jobs/${jobId}`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else {
                response = await axios.post('/api/jobs', formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            if (response.status === 200 || response.status === 201) {
                alert(isEdit ? '구인공고가 수정되었습니다.' : '구인공고가 등록되었습니다.');
                this.closeJobModal();
                await this.loadMyJobs();
                await this.loadStats();
            }

        } catch (error) {
            console.error('구인공고 저장 실패:', error);
            alert('구인공고 저장에 실패했습니다. 다시 시도해주세요.');
        }
    }

    closeJobModal() {
        document.getElementById('job-modal').classList.add('hidden');
    }

    async deleteJob(jobId) {
        if (!confirm('정말로 이 구인공고를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            alert('구인공고가 삭제되었습니다.');
            await this.loadMyJobs();
            await this.loadStats();

        } catch (error) {
            console.error('구인공고 삭제 실패:', error);
            alert('구인공고 삭제에 실패했습니다.');
        }
    }

    viewJobApplications(jobId) {
        this.switchTab('applications');
        // TODO: 특정 구인공고의 지원자만 필터링
    }

    async refreshData() {
        await this.loadInitialData();
        alert('데이터가 새로고침되었습니다.');
    }

    switchTab(tabName) {
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
        // TODO: 매칭 결과 로드 구현
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
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/matching/generate', {
                employer_id: this.employerId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('새로운 매칭이 생성되었습니다!');
                this.loadMatches();
            }

        } catch (error) {
            console.error('매칭 생성 실패:', error);
            alert('매칭 생성에 실패했습니다.');
        }
    }

    // 서류 관련 메서드들
    async loadApplicationDocuments(applicationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/applications/${applicationId}/documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data.documents || [];
        } catch (error) {
            console.error('지원자 서류 로드 실패:', error);
            return [];
        }
    }

    getDocumentIcon(documentType) {
        const icons = {
            'resume': 'fa-file-alt',
            'certificate': 'fa-certificate',
            'diploma': 'fa-graduation-cap',
            'portfolio': 'fa-briefcase',
            'visa_copy': 'fa-passport',
            'other': 'fa-file'
        };
        return icons[documentType] || icons.other;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async downloadDocument(documentId) {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            const response = await axios.get(`/api/documents/${documentId}/download`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'X-User-Info': JSON.stringify(user)
                }
            });

            if (response.data.success) {
                // 실제 환경에서는 파일 다운로드 처리
                alert(`파일 다운로드: ${response.data.original_filename}`);
                // window.open(response.data.download_url, '_blank');
            } else {
                throw new Error('다운로드 URL을 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('서류 다운로드 실패:', error);
            alert('서류 다운로드에 실패했습니다.');
        }
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

function closeJobModal() {
    if (dashboard) {
        dashboard.closeJobModal();
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

// 서류 관련 전역 함수들
function downloadDocument(documentId) {
    if (dashboard) {
        dashboard.downloadDocument(documentId);
    }
}

function viewApplicantProfile(jobSeekerId) {
    // 구직자 프로필 상세보기 (추후 구현)
    alert('구직자 프로필 상세보기 기능은 추후 구현될 예정입니다.');
}

function sendMessage(jobSeekerId) {
    // 메시지 보내기 기능 (추후 구현)
    alert('메시지 보내기 기능은 추후 구현될 예정입니다.');
}

function updateApplicationStatus(applicationId) {
    // 지원 상태 변경 기능 (추후 구현)
    const newStatus = prompt('새로운 상태를 입력하세요 (pending, reviewed, interviewed, hired, rejected):');
    if (newStatus && ['pending', 'reviewed', 'interviewed', 'hired', 'rejected'].includes(newStatus)) {
        alert(`상태가 ${newStatus}로 변경됩니다. (실제 구현은 추후 예정)`);
    } else if (newStatus) {
        alert('유효하지 않은 상태입니다.');
    }
}

// 대시보드 초기화
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new EmployerDashboard();
});