class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.currentTab = 'employers';
        this.selectedUser = null;
        
        this.init();
    }

    init() {
        // 인증 확인 - 개발용 임시 우회
        if (!this.token || this.user.type !== 'admin') {
            // 개발용 임시 토큰 설정
            if (!this.token) {
                localStorage.setItem('token', 'token_1_admin');
                localStorage.setItem('user', JSON.stringify({id: 1, email: 'admin@wowcampus.com', type: 'admin', status: 'active'}));
                this.token = 'token_1_admin';
                this.user = {id: 1, email: 'admin@wowcampus.com', type: 'admin', status: 'active'};
            } else if (this.user.type !== 'admin') {
                window.location.href = '/static/login.html';
                return;
            }
        }

        this.setupEventListeners();
        this.loadDashboardData();
        this.loadUserManagement();
    }

    setupEventListeners() {
        // 로그아웃
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });

        // 탭 전환
        document.querySelectorAll('.user-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 새로고침
        document.getElementById('refresh-users')?.addEventListener('click', () => {
            this.loadUserManagement();
        });

        // 모달 닫기
        document.getElementById('close-user-modal')?.addEventListener('click', () => {
            this.closeUserModal();
        });

        // 사용자 승인/차단
        document.getElementById('approve-user')?.addEventListener('click', () => {
            this.updateUserStatus('approved');
        });

        document.getElementById('suspend-user')?.addEventListener('click', () => {
            this.updateUserStatus('suspended');
        });

        // 임시 패스워드 발급
        document.getElementById('temp-password-user')?.addEventListener('click', () => {
            this.generateTempPassword();
        });

        // 백업 및 리포트
        document.getElementById('backup-data')?.addEventListener('click', () => {
            this.backupData();
        });

        document.getElementById('system-report')?.addEventListener('click', () => {
            this.generateSystemReport();
        });

        // 콘텐츠 관리 이벤트 리스너
        this.setupContentManagementListeners();
    }

    async loadDashboardData() {
        try {
            // 통계 데이터 로드
            const stats = await this.fetchStats();
            this.updateStatsDisplay(stats);

            // 최근 활동 로드
            const activities = await this.fetchRecentActivities();
            this.updateActivitiesDisplay(activities);
        } catch (error) {
            console.error('대시보드 데이터 로드 실패:', error);
            this.showError('데이터를 불러오는데 실패했습니다.');
        }
    }

    async fetchStats() {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('통계 데이터 로드 실패');
        }

        return await response.json();
    }

    updateStatsDisplay(stats) {
        document.getElementById('total-users').textContent = stats.totalUsers || 0;
        document.getElementById('total-employers').textContent = stats.totalEmployers || 0;
        document.getElementById('total-jobseekers').textContent = stats.totalJobseekers || 0;
        document.getElementById('total-agents').textContent = stats.totalAgents || 0;
        document.getElementById('active-jobs').textContent = stats.activeJobs || 0;
        document.getElementById('total-applications').textContent = stats.totalApplications || 0;
        document.getElementById('successful-matches').textContent = stats.successfulMatches || 0;
    }

    async fetchRecentActivities() {
        const response = await fetch('/api/admin/activities', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('활동 데이터 로드 실패');
        }

        return await response.json();
    }

    updateActivitiesDisplay(activities) {
        const container = document.getElementById('recent-activities');
        
        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-inbox text-2xl mb-2"></i>
                    <p>최근 활동이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-wowcampus-blue rounded-full flex items-center justify-center">
                        <i class="fas ${this.getActivityIcon(activity.type)} text-white text-xs"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${activity.description}</p>
                        <p class="text-xs text-gray-500">${this.formatDate(activity.created_at)}</p>
                    </div>
                </div>
                <span class="text-xs text-gray-400">${activity.user_type}</span>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // 탭 UI 업데이트
        document.querySelectorAll('.user-tab').forEach(tab => {
            tab.classList.remove('active', 'bg-wowcampus-blue', 'text-white');
            tab.classList.add('text-gray-600');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        activeTab?.classList.add('active', 'bg-wowcampus-blue', 'text-white');
        activeTab?.classList.remove('text-gray-600');

        this.currentTab = tabName;
        this.loadUserManagement();
    }

    async loadUserManagement() {
        try {
            const users = await this.fetchUsers(this.currentTab);
            this.displayUsers(users);
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            this.showError('사용자 데이터를 불러오는데 실패했습니다.');
        }
    }

    async fetchUsers(userType) {
        const response = await fetch(`/api/admin/users?type=${userType}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('사용자 데이터 로드 실패');
        }

        return await response.json();
    }

    displayUsers(users) {
        const container = document.getElementById('user-lists');
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-users text-2xl mb-2"></i>
                    <p>등록된 ${this.getTabDisplayName(this.currentTab)}가 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer user-item" data-user='${JSON.stringify(user)}'>
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-wowcampus-blue to-accent rounded-lg flex items-center justify-center">
                        <i class="fas ${this.getUserIcon(this.currentTab)} text-white"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${user.name || user.company_name}</p>
                        <p class="text-sm text-gray-500">${user.email}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(user.status)}">
                        ${this.getStatusText(user.status)}
                    </span>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
            </div>
        `).join('');

        // 사용자 아이템 클릭 이벤트
        document.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const userData = JSON.parse(e.currentTarget.dataset.user);
                this.showUserDetail(userData);
            });
        });
    }

    showUserDetail(user) {
        this.selectedUser = user;
        const modal = document.getElementById('user-detail-modal');
        const content = document.getElementById('user-detail-content');
        
        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 bg-gradient-to-br from-wowcampus-blue to-accent rounded-xl flex items-center justify-center">
                        <i class="fas ${this.getUserIcon(this.currentTab)} text-white text-xl"></i>
                    </div>
                    <div>
                        <h4 class="text-lg font-bold text-gray-900">${user.name || user.company_name}</h4>
                        <p class="text-sm text-gray-500">${user.email}</p>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(user.status)}">
                            ${this.getStatusText(user.status)}
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                    ${this.getUserDetailFields(user)}
                </div>
                
                <div class="pt-4 border-t">
                    <p class="text-xs text-gray-500">가입일: ${this.formatDate(user.created_at)}</p>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeUserModal() {
        const modal = document.getElementById('user-detail-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.selectedUser = null;
    }

    async updateUserStatus(status) {
        if (!this.selectedUser) return;

        try {
            const response = await fetch(`/api/admin/users/${this.selectedUser.id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    status, 
                    userType: this.currentTab.slice(0, -1) // Remove 's' from end
                })
            });

            if (!response.ok) {
                throw new Error('상태 업데이트 실패');
            }

            this.closeUserModal();
            this.loadUserManagement();
            this.showSuccess(`사용자 상태가 ${this.getStatusText(status)}(으)로 변경되었습니다.`);
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            this.showError('상태 업데이트에 실패했습니다.');
        }
    }

    async generateTempPassword() {
        if (!this.selectedUser) return;

        try {
            const response = await fetch(`/api/admin/users/${this.selectedUser.id}/temp-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    userType: this.currentTab.slice(0, -1) // Remove 's' from end
                })
            });

            if (!response.ok) {
                throw new Error('임시 패스워드 발급 실패');
            }

            const result = await response.json();
            
            // 임시 패스워드를 모달로 표시
            this.showTempPasswordModal(result.tempPassword);
            
            this.closeUserModal();
            this.loadUserManagement();
            this.showSuccess('임시 패스워드가 발급되었습니다.');
        } catch (error) {
            console.error('임시 패스워드 발급 실패:', error);
            this.showError('임시 패스워드 발급에 실패했습니다.');
        }
    }

    showTempPasswordModal(tempPassword) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <i class="fas fa-key text-green-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">임시 패스워드 발급완료</h3>
                    <div class="bg-gray-100 rounded p-4 mb-4">
                        <p class="text-sm text-gray-600 mb-2">발급된 임시 패스워드:</p>
                        <p class="text-2xl font-mono font-bold text-blue-600" id="temp-password-display">${tempPassword}</p>
                    </div>
                    <p class="text-sm text-gray-500 mb-6">
                        사용자에게 이 임시 패스워드를 전달하세요.<br>
                        로그인 후 반드시 패스워드를 변경하도록 안내하세요.
                    </p>
                    <div class="flex justify-center space-x-3">
                        <button onclick="copyTempPassword()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            <i class="fas fa-copy mr-2"></i>복사
                        </button>
                        <button onclick="closeTempPasswordModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                            확인
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 전역 함수로 설정
        window.copyTempPassword = () => {
            navigator.clipboard.writeText(tempPassword).then(() => {
                this.showSuccess('임시 패스워드가 클립보드에 복사되었습니다.');
            });
        };
        
        window.closeTempPasswordModal = () => {
            document.body.removeChild(modal);
            delete window.copyTempPassword;
            delete window.closeTempPasswordModal;
        };
    }

    async backupData() {
        try {
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('백업 생성 실패');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wowcampus_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            this.showSuccess('데이터 백업이 완료되었습니다.');
        } catch (error) {
            console.error('백업 실패:', error);
            this.showError('백업 생성에 실패했습니다.');
        }
    }

    async generateSystemReport() {
        try {
            const response = await fetch('/api/admin/report', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('리포트 생성 실패');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system_report_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            
            this.showSuccess('시스템 리포트가 생성되었습니다.');
        } catch (error) {
            console.error('리포트 생성 실패:', error);
            this.showError('리포트 생성에 실패했습니다.');
        }
    }

    // Utility Methods
    getTabDisplayName(tab) {
        const names = {
            employers: '구인기업',
            agents: '에이전트',
            jobseekers: '구직자'
        };
        return names[tab] || tab;
    }

    getUserIcon(userType) {
        const icons = {
            employers: 'fa-building',
            agents: 'fa-handshake',
            jobseekers: 'fa-user-tie'
        };
        return icons[userType] || 'fa-user';
    }

    getStatusColor(status) {
        const colors = {
            active: 'bg-green-100 text-green-800',
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            suspended: 'bg-red-100 text-red-800',
            inactive: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusText(status) {
        const texts = {
            active: '활성',
            approved: '승인됨',
            pending: '대기중',
            suspended: '차단됨',
            inactive: '비활성'
        };
        return texts[status] || status;
    }

    getActivityIcon(type) {
        const icons = {
            login: 'fa-sign-in-alt',
            registration: 'fa-user-plus',
            job_post: 'fa-briefcase',
            application: 'fa-file-alt'
        };
        return icons[type] || 'fa-info';
    }

    getUserDetailFields(user) {
        if (this.currentTab === 'employers') {
            return `
                <div>
                    <p class="text-gray-600">사업자번호</p>
                    <p class="font-medium">${user.business_number || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">업종</p>
                    <p class="font-medium">${user.industry || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">연락처</p>
                    <p class="font-medium">${user.phone || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">지역</p>
                    <p class="font-medium">${user.region || 'N/A'}</p>
                </div>
            `;
        } else if (this.currentTab === 'agents') {
            return `
                <div>
                    <p class="text-gray-600">담당자</p>
                    <p class="font-medium">${user.contact_person || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">국가</p>
                    <p class="font-medium">${user.country || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">연락처</p>
                    <p class="font-medium">${user.phone || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">라이센스</p>
                    <p class="font-medium">${user.license_number || 'N/A'}</p>
                </div>
            `;
        } else if (this.currentTab === 'jobseekers') {
            return `
                <div>
                    <p class="text-gray-600">국적</p>
                    <p class="font-medium">${user.nationality || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">비자</p>
                    <p class="font-medium">${user.current_visa || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">한국어 수준</p>
                    <p class="font-medium">${user.korean_level || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-600">연락처</p>
                    <p class="font-medium">${user.phone || 'N/A'}</p>
                </div>
            `;
        }
        return '';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 콘텐츠 관리 관련 메서드
    setupContentManagementListeners() {
        // 모달 닫기 이벤트
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // 모달 배경 클릭 시 닫기
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // 폼 제출 이벤트
        document.getElementById('notice-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotice();
        });

        document.getElementById('faq-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFAQ();
        });

        document.getElementById('policy-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePolicy();
        });

        document.getElementById('contact-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContactInfo();
        });
    }

    // 공지사항 관리
    async manageNotices() {
        try {
            const notices = await this.fetchNotices();
            this.displayNoticesInModal(notices);
            this.showModal('notice-modal');
        } catch (error) {
            console.error('공지사항 로드 실패:', error);
            this.showError('공지사항을 불러오는데 실패했습니다.');
        }
    }

    async fetchNotices() {
        const response = await fetch('/api/admin/notices', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('공지사항 로드 실패');
        }

        return await response.json();
    }

    displayNoticesInModal(notices) {
        const container = document.getElementById('notices-list');
        
        if (!notices || notices.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-bullhorn text-2xl mb-2"></i>
                    <p>등록된 공지사항이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notices.map(notice => `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${notice.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.truncateText(notice.content.replace(/<[^>]*>/g, ''), 100)}</p>
                        <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(notice.created_at)}</span>
                            <span class="px-2 py-1 rounded-full ${notice.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                ${notice.is_active ? '활성' : '비활성'}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="adminDashboard.editNotice(${notice.id})" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="adminDashboard.deleteNotice(${notice.id})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    addNotice() {
        resetNoticeForm();
        this.showModal('notice-edit-modal');
    }

    async editNotice(id) {
        try {
            const notice = await this.fetchNotice(id);
            document.getElementById('notice-id').value = notice.id;
            document.getElementById('notice-title').value = notice.title;
            setEditorContent('notice-content', notice.content);
            document.getElementById('notice-active').checked = notice.is_active;
            
            // 폼을 편집 모드로 변경
            document.getElementById('notice-form-title').textContent = '공지사항 수정';
            
            this.showModal('notice-edit-modal');
        } catch (error) {
            console.error('공지사항 로드 실패:', error);
            this.showError('공지사항을 불러오는데 실패했습니다.');
        }
    }

    async fetchNotice(id) {
        const response = await fetch(`/api/admin/notices/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('공지사항 로드 실패');
        }

        return await response.json();
    }

    async saveNotice() {
        const formData = {
            id: document.getElementById('notice-id').value,
            title: document.getElementById('notice-title').value,
            content: getEditorContent('notice-content'),
            is_active: document.getElementById('notice-active').checked
        };

        if (!formData.title || !formData.content) {
            this.showError('제목과 내용을 입력해주세요.');
            return;
        }

        try {
            const isEdit = formData.id !== '';
            const response = await fetch(`/api/admin/notices${isEdit ? `/${formData.id}` : ''}`, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('공지사항 저장 실패');
            }

            this.showSuccess(`공지사항이 ${isEdit ? '수정' : '등록'}되었습니다.`);
            this.closeModal('notice-edit-modal');
            resetNoticeForm();
            this.manageNotices(); // 목록 새로고침
        } catch (error) {
            console.error('공지사항 저장 실패:', error);
            this.showError('공지사항 저장에 실패했습니다.');
        }
    }

    async deleteNotice(id) {
        if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/notices/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('공지사항 삭제 실패');
            }

            this.showSuccess('공지사항이 삭제되었습니다.');
            this.manageNotices(); // 목록 새로고침
        } catch (error) {
            console.error('공지사항 삭제 실패:', error);
            this.showError('공지사항 삭제에 실패했습니다.');
        }
    }

    resetNoticeForm() {
        document.getElementById('notice-form').reset();
        document.getElementById('notice-id').value = '';
        document.getElementById('notice-form-title').textContent = '새 공지사항 등록';
        document.querySelector('#notice-form button[type="submit"]').textContent = '등록';
    }

    // FAQ 관리
    async manageFAQ() {
        try {
            const faqs = await this.fetchFAQs();
            this.displayFAQsInModal(faqs);
            this.showModal('faq-modal');
        } catch (error) {
            console.error('FAQ 로드 실패:', error);
            this.showError('FAQ를 불러오는데 실패했습니다.');
        }
    }

    async fetchFAQs() {
        const response = await fetch('/api/admin/faqs', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('FAQ 로드 실패');
        }

        return await response.json();
    }

    displayFAQsInModal(faqs) {
        const container = document.getElementById('faqs-list');
        
        if (!faqs || faqs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-question-circle text-2xl mb-2"></i>
                    <p>등록된 FAQ가 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = faqs.map(faq => `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                ${faq.category}
                            </span>
                        </div>
                        <h4 class="font-medium text-gray-900">${faq.question}</h4>
                        <p class="text-sm text-gray-600 mt-1">${this.truncateText(faq.answer.replace(/<[^>]*>/g, ''), 100)}</p>
                        <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(faq.created_at)}</span>
                            <span class="px-2 py-1 rounded-full ${faq.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                ${faq.is_active ? '활성' : '비활성'}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="adminDashboard.editFAQ(${faq.id})" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="adminDashboard.deleteFAQ(${faq.id})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    addFAQ() {
        resetFAQForm();
        this.showModal('faq-edit-modal');
    }

    async editFAQ(id) {
        try {
            const faq = await this.fetchFAQ(id);
            document.getElementById('faq-id').value = faq.id;
            document.getElementById('faq-category').value = faq.category;
            document.getElementById('faq-question').value = faq.question;
            setEditorContent('faq-answer', faq.answer);
            document.getElementById('faq-active').checked = faq.is_active;
            
            document.getElementById('faq-form-title').textContent = 'FAQ 수정';
            
            this.showModal('faq-edit-modal');
        } catch (error) {
            console.error('FAQ 로드 실패:', error);
            this.showError('FAQ를 불러오는데 실패했습니다.');
        }
    }

    async fetchFAQ(id) {
        const response = await fetch(`/api/admin/faqs/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('FAQ 로드 실패');
        }

        return await response.json();
    }

    async saveFAQ() {
        const formData = {
            id: document.getElementById('faq-id').value,
            category: document.getElementById('faq-category').value,
            question: document.getElementById('faq-question').value,
            answer: getEditorContent('faq-answer'),
            is_active: document.getElementById('faq-active').checked
        };

        if (!formData.category || !formData.question || !formData.answer) {
            this.showError('모든 필드를 입력해주세요.');
            return;
        }

        try {
            const isEdit = formData.id !== '';
            const response = await fetch(`/api/admin/faqs${isEdit ? `/${formData.id}` : ''}`, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('FAQ 저장 실패');
            }

            this.showSuccess(`FAQ가 ${isEdit ? '수정' : '등록'}되었습니다.`);
            this.closeModal('faq-edit-modal');
            resetFAQForm();
            this.manageFAQ(); // 목록 새로고침
        } catch (error) {
            console.error('FAQ 저장 실패:', error);
            this.showError('FAQ 저장에 실패했습니다.');
        }
    }

    async deleteFAQ(id) {
        if (!confirm('정말로 이 FAQ를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/faqs/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('FAQ 삭제 실패');
            }

            this.showSuccess('FAQ가 삭제되었습니다.');
            this.manageFAQ(); // 목록 새로고침
        } catch (error) {
            console.error('FAQ 삭제 실패:', error);
            this.showError('FAQ 삭제에 실패했습니다.');
        }
    }

    resetFAQForm() {
        document.getElementById('faq-form').reset();
        document.getElementById('faq-id').value = '';
        document.getElementById('faq-form-title').textContent = '새 FAQ 등록';
        document.querySelector('#faq-form button[type="submit"]').textContent = '등록';
    }

    // 문의 관리
    async manageInquiries() {
        try {
            const inquiries = await this.fetchInquiries();
            this.displayInquiriesInModal(inquiries);
            this.showModal('inquiry-modal');
        } catch (error) {
            console.error('문의 로드 실패:', error);
            this.showError('문의를 불러오는데 실패했습니다.');
        }
    }

    async fetchInquiries() {
        const response = await fetch('/api/admin/inquiries', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('문의 로드 실패');
        }

        return await response.json();
    }

    displayInquiriesInModal(inquiries) {
        const container = document.getElementById('inquiries-list');
        
        if (!inquiries || inquiries.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-envelope text-2xl mb-2"></i>
                    <p>등록된 문의가 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = inquiries.map(inquiry => `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                ${inquiry.category}
                            </span>
                            <span class="px-2 py-1 text-xs rounded-full ${inquiry.status === 'answered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${inquiry.status === 'answered' ? '답변완료' : '답변대기'}
                            </span>
                        </div>
                        <h4 class="font-medium text-gray-900">${inquiry.subject}</h4>
                        <p class="text-sm text-gray-600 mt-1">${inquiry.name} (${inquiry.email})</p>
                        <p class="text-sm text-gray-600">${this.truncateText(inquiry.message, 100)}</p>
                        <div class="text-xs text-gray-500 mt-2">
                            <i class="fas fa-calendar mr-1"></i>${this.formatDate(inquiry.created_at)}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="adminDashboard.viewInquiry(${inquiry.id})" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="adminDashboard.deleteInquiry(${inquiry.id})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async viewInquiry(id) {
        try {
            const inquiry = await this.fetchInquiry(id);
            // 문의 상세보기 모달 표시
            alert(`제목: ${inquiry.subject}\n보낸이: ${inquiry.name} (${inquiry.email})\n내용: ${inquiry.message}`);
        } catch (error) {
            console.error('문의 로드 실패:', error);
            this.showError('문의를 불러오는데 실패했습니다.');
        }
    }

    async fetchInquiry(id) {
        const response = await fetch(`/api/admin/inquiries/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('문의 로드 실패');
        }

        return await response.json();
    }

    async deleteInquiry(id) {
        if (!confirm('정말로 이 문의를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/inquiries/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('문의 삭제 실패');
            }

            this.showSuccess('문의가 삭제되었습니다.');
            this.manageInquiries(); // 목록 새로고침
        } catch (error) {
            console.error('문의 삭제 실패:', error);
            this.showError('문의 삭제에 실패했습니다.');
        }
    }

    // 정책 관리
    async manageTerms() {
        await this.managePolicyContent('terms', '이용약관');
    }

    async managePrivacy() {
        await this.managePolicyContent('privacy', '개인정보처리방침');
    }

    async manageCookies() {
        await this.managePolicyContent('cookies', '쿠키정책');
    }

    async managePolicyContent(type, title) {
        try {
            const policy = await this.fetchPolicy(type);
            document.getElementById('policy-type').value = type;
            document.getElementById('policy-title-display').textContent = title + ' 편집';
            setEditorContent('policy-content', policy.content || '');
            document.getElementById('policy-last-updated').value = policy.last_updated || new Date().toISOString().split('T')[0];
            
            this.showModal('policy-edit-modal');
        } catch (error) {
            console.error('정책 로드 실패:', error);
            this.showError('정책을 불러오는데 실패했습니다.');
        }
    }

    async fetchPolicy(type) {
        const response = await fetch(`/api/admin/policies/${type}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            // 새 정책인 경우 빈 객체 반환
            return { content: '', last_updated: new Date().toISOString().split('T')[0] };
        }

        return await response.json();
    }

    async savePolicy() {
        const formData = {
            type: document.getElementById('policy-type').value,
            content: getEditorContent('policy-content'),
            last_updated: document.getElementById('policy-last-updated').value
        };

        if (!formData.content) {
            this.showError('내용을 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`/api/admin/policies/${formData.type}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('정책 저장 실패');
            }

            this.showSuccess('정책이 저장되었습니다.');
            this.closeModal('policy-edit-modal');
        } catch (error) {
            console.error('정책 저장 실패:', error);
            this.showError('정책 저장에 실패했습니다.');
        }
    }

    // 연락처 정보 관리
    async manageContact() {
        try {
            const contact = await this.fetchContactInfo();
            document.getElementById('contact-phone1').value = contact.phone1 || '02-3144-3137';
            document.getElementById('contact-phone2').value = contact.phone2 || '054-464-3137';
            document.getElementById('contact-email').value = contact.email || 'wow3d16@naver.com';
            document.getElementById('contact-address1').value = contact.address1 || '서울특별시 강남구 테헤란로 123';
            document.getElementById('contact-address2').value = contact.address2 || '경상북도 포항시 남구 지곡로 80';
            document.getElementById('contact-hours').value = contact.hours || '평일 09:00 - 18:00';
            
            this.showModal('contact-modal');
        } catch (error) {
            console.error('연락처 정보 로드 실패:', error);
            this.showError('연락처 정보를 불러오는데 실패했습니다.');
        }
    }

    async fetchContactInfo() {
        const response = await fetch('/api/admin/contact', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            // 기본값 반환
            return {
                phone1: '02-3144-3137',
                phone2: '054-464-3137',
                email: 'wow3d16@naver.com',
                address1: '서울특별시 강남구 테헤란로 123',
                address2: '경상북도 포항시 남구 지곡로 80',
                hours: '평일 09:00 - 18:00'
            };
        }

        return await response.json();
    }

    async saveContactInfo() {
        const formData = {
            phone1: document.getElementById('contact-phone1').value,
            phone2: document.getElementById('contact-phone2').value,
            email: document.getElementById('contact-email').value,
            address1: document.getElementById('contact-address1').value,
            address2: document.getElementById('contact-address2').value,
            hours: document.getElementById('contact-hours').value
        };

        try {
            const response = await fetch('/api/admin/contact', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('연락처 정보 저장 실패');
            }

            this.showSuccess('연락처 정보가 저장되었습니다.');
            this.closeModal(document.getElementById('contact-modal'));
        } catch (error) {
            console.error('연락처 정보 저장 실패:', error);
            this.showError('연락처 정보 저장에 실패했습니다.');
        }
    }

    // 유틸리티 메서드
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getStatusText(status) {
        switch(status) {
            case 'pending': return '승인대기';
            case 'approved': return '승인';
            case 'active': return '활성';
            case 'suspended': return '정지';
            case 'blocked': return '차단';
            default: return status;
        }
    }

    getStatusColor(status) {
        switch(status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': 
            case 'active': return 'bg-green-100 text-green-800';
            case 'suspended': return 'bg-orange-100 text-orange-800';
            case 'blocked': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getUserIcon(userType) {
        switch(userType) {
            case 'employers': return 'fa-building';
            case 'agents': return 'fa-handshake';
            case 'jobseekers': return 'fa-user-tie';
            default: return 'fa-user';
        }
    }

    getUserDetailFields(user) {
        if (this.currentTab === 'employers') {
            return `
                <div><span class="text-gray-600">회사명:</span> ${user.company_name || '-'}</div>
                <div><span class="text-gray-600">사업자등록번호:</span> ${user.business_number || '-'}</div>
                <div><span class="text-gray-600">업종:</span> ${user.industry || '-'}</div>
                <div><span class="text-gray-600">담당자:</span> ${user.contact_person || '-'}</div>
                <div><span class="text-gray-600">전화번호:</span> ${user.phone || '-'}</div>
                <div><span class="text-gray-600">지역:</span> ${user.region || '-'}</div>
            `;
        } else if (this.currentTab === 'agents') {
            return `
                <div><span class="text-gray-600">회사명:</span> ${user.company_name || '-'}</div>
                <div><span class="text-gray-600">국가:</span> ${user.country || '-'}</div>
                <div><span class="text-gray-600">담당자:</span> ${user.contact_person || '-'}</div>
                <div><span class="text-gray-600">전화번호:</span> ${user.phone || '-'}</div>
                <div><span class="text-gray-600">라이센스번호:</span> ${user.license_number || '-'}</div>
                <div><span class="text-gray-600">주소:</span> ${user.address || '-'}</div>
            `;
        } else { // jobseekers
            return `
                <div><span class="text-gray-600">이름:</span> ${user.name || '-'}</div>
                <div><span class="text-gray-600">국적:</span> ${user.nationality || '-'}</div>
                <div><span class="text-gray-600">성별:</span> ${user.gender || '-'}</div>
                <div><span class="text-gray-600">전화번호:</span> ${user.phone || '-'}</div>
                <div><span class="text-gray-600">한국어수준:</span> ${user.korean_level || '-'}</div>
                <div><span class="text-gray-600">학력:</span> ${user.education_level || '-'}</div>
            `;
        }
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 애니메이션으로 나타내기
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // 3초 후 자동으로 사라지기
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// 전역 변수로 adminDashboard 인스턴스 저장
let adminDashboard;

// 페이지 로드 시 관리자 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// HTML에서 직접 호출할 수 있는 글로벌 함수들
window.manageNotices = () => adminDashboard?.manageNotices();
window.manageFAQ = () => adminDashboard?.manageFAQ();
window.manageInquiries = () => adminDashboard?.manageInquiries();
window.manageTerms = () => adminDashboard?.manageTerms();
window.managePrivacy = () => adminDashboard?.managePrivacy();
window.manageCookies = () => adminDashboard?.manageCookies();
window.manageContact = () => adminDashboard?.manageContact();

// 추가 글로벌 함수들
window.closeModal = (modalId) => adminDashboard?.closeModal(modalId);
window.addNotice = () => adminDashboard?.addNotice();
window.addFAQ = () => adminDashboard?.addFAQ();
window.saveContactInfo = () => adminDashboard?.saveContactInfo();