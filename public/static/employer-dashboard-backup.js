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
        
        // 로그인한 사용자의 ID를 employerId로 사용
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.employerId = user.id;
        
        console.log('DEBUG - localStorage user:', user);
        console.log('DEBUG - employerId:', this.employerId);
        
        if (!this.employerId) {
            alert('사용자 정보를 찾을 수 없습니다. User: ' + JSON.stringify(user));
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
            // 사용자 정보 업데이트 (로그인 정보에서 회사명 가져오기)
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
        console.log('updateUserInfo - currentUser:', user);
        console.log('updateUserInfo - employerId:', this.employerId);
        
        // 회사명 표시
        const companyNameEl = document.getElementById('company-name');
        if (companyNameEl && user.company_name) {
            companyNameEl.textContent = user.company_name;
        }

        // 담당자명 표시 (있는 경우)
        const contactPersonEl = document.getElementById('contact-person');
        if (contactPersonEl && user.contact_person) {
            contactPersonEl.textContent = user.contact_person;
        }

        // 사용자 이메일 표시
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            console.log('loadStats - employerId:', this.employerId);
            console.log('loadStats - token:', token);
            
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

            console.log('loadStats - jobs response:', jobsResponse.data);
            console.log('loadStats - jobs count:', jobs.length);
            console.log('loadStats - applications count:', applications.length);

            // 통계 업데이트
            document.getElementById('stat-jobs').textContent = jobs.length;
            document.getElementById('stat-applications').textContent = applications.length;
            document.getElementById('stat-pending').textContent = applications.filter(app => app.application_status === 'pending').length;
            document.getElementById('stat-matches').textContent = matches.filter(match => match.status === 'accepted').length;

        } catch (error) {
            console.error('통계 로드 실패:', error);
            alert('통계 로드 실패: ' + error.message);
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
            const filter = document.getElementById('jobs-filter') ? document.getElementById('jobs-filter').value : 'all';
            
            let url = `/api/employers/${this.employerId}/jobs`;
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }

            console.log('loadMyJobs - URL:', url);
            console.log('loadMyJobs - employerId:', this.employerId);

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const jobs = response.data.jobs || [];
            console.log('loadMyJobs - jobs response:', response.data);
            console.log('loadMyJobs - jobs count:', jobs.length);
            this.renderJobsList(jobs);

        } catch (error) {
            console.error('구인공고 로드 실패:', error);
            alert('구인공고 로드 실패: ' + error.message);
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
            title: document.getElementById('job-title').value.trim(),
            job_category: document.getElementById('job-category').value,
            work_location: document.getElementById('work-location').value.trim(),
            required_visa: document.getElementById('required-visa').value,
            salary_min: document.getElementById('salary-min').value ? parseInt(document.getElementById('salary-min').value) * 10000 : null,
            salary_max: document.getElementById('salary-max').value ? parseInt(document.getElementById('salary-max').value) * 10000 : null,
            positions: parseInt(document.getElementById('positions').value) || 1,
            korean_level_required: document.getElementById('korean-level').value || 'none',
            deadline: document.getElementById('deadline').value || null,
            description: document.getElementById('job-description').value.trim(),
            employer_id: parseInt(this.employerId)
        };

        // 디버깅: 전송할 데이터 확인
        console.log('전송할 구인공고 데이터:', formData);
        console.log('korean_level_required 값:', formData.korean_level_required);

        // 필수 필드 검증
        if (!formData.title) {
            alert('구인공고 제목을 입력해주세요.');
            document.getElementById('job-title').focus();
            return;
        }
        
        if (!formData.job_category) {
            alert('직종을 선택해주세요.');
            document.getElementById('job-category').focus();
            return;
        }
        
        if (!formData.work_location) {
            alert('근무지역을 입력해주세요.');
            document.getElementById('work-location').focus();
            return;
        }
        
        if (!formData.required_visa) {
            alert('비자 유형을 선택해주세요.');
            document.getElementById('required-visa').focus();
            return;
        }

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
            
            // API 응답에서 구체적인 오류 메시지 추출
            let errorMessage = '구인공고 저장에 실패했습니다.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage + ' 다시 시도해주세요.');
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

    // 지원자 상세 정보 조회 및 모달 표시
    async viewApplicantDetail(jobSeekerId) {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/job-seekers/${jobSeekerId}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const { jobSeeker, applications, documents } = response.data;
            this.showApplicantDetailModal(jobSeeker, applications, documents);

        } catch (error) {
            console.error('지원자 정보 조회 실패:', error);
            alert('지원자 정보를 불러올 수 없습니다.');
        }
    }

    // 지원자 상세 정보 모달 표시
    showApplicantDetailModal(jobSeeker, applications, documents) {
        // 모달이 없으면 생성
        let modal = document.getElementById('applicant-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'applicant-detail-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
            document.body.appendChild(modal);
        }

        // 비자 상태 표시
        const visaStatus = jobSeeker.current_visa === jobSeeker.desired_visa ? 
            `${jobSeeker.current_visa}` : 
            `${jobSeeker.current_visa} → ${jobSeeker.desired_visa}`;

        // 지원 이력 HTML
        const applicationsHtml = applications.length > 0 ? applications.map(app => `
            <div class="bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-medium text-gray-800">${app.job_title}</h5>
                        <p class="text-sm text-gray-600">${app.company_name} | ${app.work_location}</p>
                        <p class="text-xs text-gray-500 mt-1">지원일: ${new Date(app.applied_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full font-medium ${this.getStatusColor(app.application_status)}">
                        ${this.getStatusText(app.application_status)}
                    </span>
                </div>
                ${app.cover_letter ? `<p class="text-sm text-gray-700 mt-2">${app.cover_letter}</p>` : ''}
            </div>
        `).join('') : '<p class="text-gray-500 text-center py-4">지원 이력이 없습니다.</p>';

        // 서류 목록 HTML
        const documentsHtml = documents.length > 0 ? documents.map(doc => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div class="flex items-center space-x-2">
                    <i class="fas ${this.getDocumentIcon(doc.document_type)} text-gray-500"></i>
                    <span class="text-sm text-gray-700">${doc.original_filename}</span>
                    <span class="text-xs text-gray-500">(${this.formatFileSize(doc.file_size)})</span>
                </div>
                <button onclick="dashboard.downloadDocument(${doc.document_id})" 
                        class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `).join('') : '<p class="text-gray-500 text-center py-4">업로드된 서류가 없습니다.</p>';

        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 class="text-xl font-semibold text-gray-800">
                        <i class="fas fa-user-circle mr-2 text-blue-600"></i>${jobSeeker.name} 님의 프로필
                    </h3>
                    <button onclick="dashboard.closeApplicantDetailModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="p-6">
                    <!-- 기본 정보 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-id-card mr-2 text-blue-600"></i>기본 정보
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div><strong>이름:</strong> ${jobSeeker.name}</div>
                                <div><strong>국적:</strong> <i class="fas fa-flag mr-1"></i>${jobSeeker.nationality}</div>
                                <div><strong>성별:</strong> ${jobSeeker.gender || '미입력'}</div>
                                <div><strong>생년월일:</strong> ${jobSeeker.birth_date || '미입력'}</div>
                                <div><strong>연락처:</strong> <i class="fas fa-phone mr-1"></i>${jobSeeker.phone}</div>
                                <div><strong>이메일:</strong> <i class="fas fa-envelope mr-1"></i>${jobSeeker.email}</div>
                                <div><strong>현재 주소:</strong> <i class="fas fa-map-marker-alt mr-1"></i>${jobSeeker.current_address || '미입력'}</div>
                            </div>
                        </div>
                        
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-passport mr-2 text-green-600"></i>비자 정보
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div><strong>현재 비자:</strong> ${jobSeeker.current_visa}</div>
                                <div><strong>희망 비자:</strong> ${jobSeeker.desired_visa}</div>
                                <div><strong>비자 상태:</strong> ${visaStatus}</div>
                                <div><strong>비자 만료일:</strong> ${jobSeeker.visa_expiry || '미입력'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 언어 및 학력 정보 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-language mr-2 text-purple-600"></i>언어 능력
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div><strong>한국어:</strong> ${jobSeeker.korean_level}</div>
                                <div><strong>영어:</strong> ${jobSeeker.english_level || '미입력'}</div>
                                <div><strong>기타 언어:</strong> ${jobSeeker.other_languages || '없음'}</div>
                            </div>
                        </div>
                        
                        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-graduation-cap mr-2 text-yellow-600"></i>학력 정보
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div><strong>학력:</strong> ${jobSeeker.education_level || '미입력'}</div>
                                <div><strong>전공:</strong> ${jobSeeker.major || '미입력'}</div>
                                <div><strong>학교명:</strong> ${jobSeeker.university || '미입력'}</div>
                                <div><strong>졸업년도:</strong> ${jobSeeker.graduation_year || '미입력'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 경력 및 희망 조건 -->
                    <div class="mb-8">
                        <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-briefcase mr-2 text-indigo-600"></i>경력 및 희망 조건
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-3">
                                <div class="bg-gray-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">경력사항:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.work_experience || '경력 없음'}</p>
                                </div>
                                <div class="bg-gray-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">보유 기술:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.skills || '없음'}</p>
                                </div>
                                <div class="bg-gray-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">자격증:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.certifications || '없음'}</p>
                                </div>
                            </div>
                            <div class="space-y-3">
                                <div class="bg-blue-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">희망 직종:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.desired_job_type || '미입력'}</p>
                                </div>
                                <div class="bg-blue-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">희망 근무지:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.desired_location || '미입력'}</p>
                                </div>
                                <div class="bg-blue-50 p-3 rounded">
                                    <strong class="text-sm text-gray-600">희망 급여:</strong>
                                    <p class="text-sm mt-1">${jobSeeker.desired_salary ? (jobSeeker.desired_salary/10000 + '만원') : '협의'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 자기소개 -->
                    ${jobSeeker.introduction ? `
                        <div class="mb-8">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-comment mr-2 text-teal-600"></i>자기소개
                            </h4>
                            <div class="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
                                <p class="text-sm leading-relaxed">${jobSeeker.introduction}</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 담당 에이전트 -->
                    ${jobSeeker.agent_company_name ? `
                        <div class="mb-8">
                            <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-handshake mr-2 text-green-600"></i>담당 에이전트
                            </h4>
                            <div class="bg-green-50 p-3 rounded">
                                <p class="text-sm"><strong>에이전트:</strong> ${jobSeeker.agent_company_name}</p>
                                <p class="text-sm"><strong>담당자:</strong> ${jobSeeker.agent_contact || '미입력'}</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 지원 이력 -->
                    <div class="mb-8">
                        <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-history mr-2 text-orange-600"></i>지원 이력 (${applications.length}건)
                        </h4>
                        <div class="space-y-3 max-h-60 overflow-y-auto">
                            ${applicationsHtml}
                        </div>
                    </div>

                    <!-- 첨부 서류 -->
                    <div class="mb-6">
                        <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-paperclip mr-2 text-red-600"></i>첨부 서류 (${documents.length}개)
                        </h4>
                        <div class="space-y-2 max-h-40 overflow-y-auto">
                            ${documentsHtml}
                        </div>
                    </div>

                    <!-- 액션 버튼 -->
                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button onclick="dashboard.closeApplicantDetailModal()" 
                                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                            닫기
                        </button>
                        <button onclick="sendMessage(${jobSeeker.id})" 
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-envelope mr-1"></i>메시지 보내기
                        </button>
                        <button onclick="dashboard.scheduleInterview(${jobSeeker.id})" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-calendar mr-1"></i>면접 일정 잡기
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    // 지원자 상세 정보 모달 닫기
    closeApplicantDetailModal() {
        const modal = document.getElementById('applicant-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // 지원 상태 업데이트
    async updateApplicationStatus(applicationId, newStatus) {
        const statusNames = {
            'pending': '검토 대기',
            'submitted': '검토 중',
            'interview': '면접 대상',
            'accepted': '승인',
            'rejected': '거절'
        };

        const statusName = statusNames[newStatus] || newStatus;
        
        if (!confirm(`이 지원서를 "${statusName}" 상태로 변경하시겠습니까?`)) {
            return;
        }

        const notes = prompt(`상태 변경 사유나 메모를 입력하세요 (선택사항):`);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`/api/applications/${applicationId}/status`, {
                status: newStatus,
                notes: notes
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('지원 상태가 업데이트되었습니다!');
                await this.loadApplications(); // 지원자 목록 새로고침
            }

        } catch (error) {
            console.error('지원 상태 변경 실패:', error);
            alert('지원 상태 변경에 실패했습니다: ' + (error.response?.data?.error || error.message));
        }
    }

    // 상태별 색상 클래스 반환
    getStatusColor(status) {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'submitted': 'bg-blue-100 text-blue-800',
            'interview': 'bg-purple-100 text-purple-800',
            'accepted': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        };
        return colors[status] || colors.pending;
    }

    // 상태별 텍스트 반환
    getStatusText(status) {
        const texts = {
            'pending': '검토 대기',
            'submitted': '검토 중',
            'interview': '면접 대상',
            'accepted': '승인됨',
            'rejected': '거절됨'
        };
        return texts[status] || '검토 대기';
    }

    // 면접 일정 잡기 (추후 구현)
    async scheduleInterview(jobSeekerId) {
        alert('면접 일정 잡기 기능은 추후 구현될 예정입니다.');
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
    if (dashboard) {
        dashboard.viewApplicantDetail(jobSeekerId);
    }
}

function sendMessage(jobSeekerId) {
    // 메시지 보내기 기능 (추후 구현)
    alert('메시지 보내기 기능은 추후 구현될 예정입니다.');
}

function updateApplicationStatus(applicationId, status) {
    if (dashboard) {
        dashboard.updateApplicationStatus(applicationId, status);
    }
}

// 대시보드 초기화
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new EmployerDashboard();
});