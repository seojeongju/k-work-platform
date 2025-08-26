// 구직자 목록 JavaScript

class JobSeekerList {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentFilters = {};
        this.jobSeekers = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadJobSeekers();
    }

    setupEventListeners() {
        // 검색 버튼
        document.getElementById('search-btn').addEventListener('click', () => {
            this.currentPage = 1;
            this.applyFilters();
        });

        // 정렬 변경
        document.getElementById('sort-by').addEventListener('change', () => {
            this.currentPage = 1;
            this.applyFilters();
        });

        // 필터 변경 시 자동 검색
        ['filter-nationality', 'filter-visa', 'filter-korean', 'filter-job-category'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
            });
        });

        // 모달 관련
        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideModal();
        });
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            this.hideModal();
        });

        // 모달 외부 클릭 시 닫기
        document.getElementById('job-seeker-modal').addEventListener('click', (e) => {
            if (e.target.id === 'job-seeker-modal') {
                this.hideModal();
            }
        });
    }

    applyFilters() {
        const filters = {
            nationality: document.getElementById('filter-nationality').value,
            visa: document.getElementById('filter-visa').value,
            korean_level: document.getElementById('filter-korean').value,
            job_category: document.getElementById('filter-job-category').value,
            sort: document.getElementById('sort-by').value
        };

        // 빈 값 제거
        this.currentFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v)
        );

        this.loadJobSeekers();
    }

    async loadJobSeekers() {
        try {
            this.showLoading();

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 9,
                ...this.currentFilters
            });

            const response = await axios.get(`/api/job-seekers?${params}`);
            
            this.jobSeekers = response.data.jobSeekers;
            this.totalPages = response.data.pagination.totalPages;
            
            this.renderJobSeekers();
            this.renderPagination();
            this.updateStats(response.data.pagination.total);
            
        } catch (error) {
            console.error('구직자 목록 로드 실패:', error);
            this.showError('구직자 목록을 불러오는데 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('job-seekers-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('job-seekers-grid').classList.remove('hidden');
    }

    renderJobSeekers() {
        const grid = document.getElementById('job-seekers-grid');
        const resultCount = document.getElementById('result-count');
        
        resultCount.textContent = this.jobSeekers.length;

        if (this.jobSeekers.length === 0) {
            grid.classList.add('hidden');
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');
        grid.innerHTML = '';

        this.jobSeekers.forEach(jobSeeker => {
            const card = this.createJobSeekerCard(jobSeeker);
            grid.appendChild(card);
        });
    }

    createJobSeekerCard(jobSeeker) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer hover-card';
        
        const koreanLevelMap = {
            'beginner': '초급',
            'intermediate': '중급',
            'advanced': '고급',
            'native': '원어민급'
        };

        const jobCategoryMap = {
            'MFG': '제조업',
            'CON': '건설업',
            'AGR': '농업',
            'SVC': '서비스업',
            'IT': 'IT/소프트웨어',
            'EDU': '교육',
            'HSP': '의료/보건',
            'TRD': '무역/물류',
            'OTHER': '기타'
        };

        const regionMap = {
            'SEL': '서울',
            'BSN': '부산',
            'DGU': '대구',
            'ICN': '인천',
            'GWJ': '광주',
            'DJN': '대전',
            'USN': '울산',
            'GGD': '경기도',
            'GWD': '강원도',
            'ALL': '전국'
        };

        const salaryText = this.getSalaryText(jobSeeker.desired_salary_min, jobSeeker.desired_salary_max);

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-primary text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800">${jobSeeker.name}</h4>
                        <p class="text-sm text-gray-600">${jobSeeker.nationality}</p>
                    </div>
                </div>
                <div class="flex flex-col items-end space-y-1">
                    ${jobSeeker.current_visa ? `<span class="badge badge-blue text-xs">${jobSeeker.current_visa}</span>` : ''}
                    ${jobSeeker.korean_level ? `<span class="badge badge-green text-xs">${koreanLevelMap[jobSeeker.korean_level] || jobSeeker.korean_level}</span>` : ''}
                </div>
            </div>

            <div class="space-y-2 text-sm text-gray-600 mb-4">
                ${jobSeeker.desired_job_category ? `
                <div class="flex items-center">
                    <i class="fas fa-briefcase w-4 mr-2 text-gray-400"></i>
                    <span>희망직종: ${jobCategoryMap[jobSeeker.desired_job_category] || jobSeeker.desired_job_category}</span>
                </div>` : ''}
                
                ${jobSeeker.preferred_region ? `
                <div class="flex items-center">
                    <i class="fas fa-map-marker-alt w-4 mr-2 text-gray-400"></i>
                    <span>희망지역: ${regionMap[jobSeeker.preferred_region] || jobSeeker.preferred_region}</span>
                </div>` : ''}
                
                ${salaryText ? `
                <div class="flex items-center">
                    <i class="fas fa-won-sign w-4 mr-2 text-gray-400"></i>
                    <span>희망급여: ${salaryText}</span>
                </div>` : ''}
                
                ${jobSeeker.education_level ? `
                <div class="flex items-center">
                    <i class="fas fa-graduation-cap w-4 mr-2 text-gray-400"></i>
                    <span>학력: ${jobSeeker.education_level}</span>
                </div>` : ''}
            </div>

            <div class="flex justify-between items-center pt-4 border-t">
                <span class="text-xs text-gray-500">
                    등록일: ${new Date(jobSeeker.created_at).toLocaleDateString('ko-KR')}
                </span>
                <button class="text-primary hover:text-secondary font-medium text-sm view-detail-btn" 
                        data-id="${jobSeeker.id}">
                    상세보기 <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;

        // 상세보기 버튼 이벤트
        card.querySelector('.view-detail-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showJobSeekerDetail(jobSeeker.id);
        });

        // 카드 클릭 시 상세보기
        card.addEventListener('click', () => {
            this.showJobSeekerDetail(jobSeeker.id);
        });

        return card;
    }

    getSalaryText(min, max) {
        if (!min && !max) return null;
        
        const formatSalary = (amount) => {
            if (amount >= 10000) {
                return `${Math.floor(amount / 10000)}만원`;
            }
            return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
        };

        if (min && max) {
            return `${formatSalary(min)} - ${formatSalary(max)}`;
        } else if (min) {
            return `${formatSalary(min)} 이상`;
        } else if (max) {
            return `${formatSalary(max)} 이하`;
        }
        return null;
    }

    async showJobSeekerDetail(jobSeekerId) {
        try {
            // 로그인 상태 확인 및 토큰 가져오기
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequiredAlert('구직정보');
                return;
            }

            const response = await axios.get(`/api/job-seekers/${jobSeekerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const jobSeeker = response.data.jobSeeker;
            
            this.renderJobSeekerDetail(jobSeeker);
            this.showModal();
            
        } catch (error) {
            console.error('구직자 상세 정보 로드 실패:', error);
            
            if (error.response && error.response.status === 401) {
                // 인증 오류 - 로그인 필요
                this.showLoginRequiredAlert('구직정보');
            } else {
                alert('구직자 상세 정보를 불러오는데 실패했습니다.');
            }
        }
    }

    renderJobSeekerDetail(jobSeeker) {
        const detailContainer = document.getElementById('job-seeker-detail');
        
        const koreanLevelMap = {
            'beginner': '초급 (기초 인사, 숫자)',
            'intermediate': '중급 (일상 대화 가능)',
            'advanced': '고급 (업무 대화 가능)',
            'native': '원어민급'
        };

        const jobCategoryMap = {
            'MFG': '제조업 (공장, 조립, 생산직)',
            'CON': '건설업 (건설 현장, 토목)',
            'AGR': '농업 (농장, 축산, 수산업)',
            'SVC': '서비스업 (음식점, 편의점, 마트)',
            'IT': 'IT/소프트웨어 (개발자, 프로그래머)',
            'EDU': '교육 (어학강사, 튜터)',
            'HSP': '의료/보건 (간병, 의료보조)',
            'TRD': '무역/물류 (수출입, 통역)',
            'OTHER': '기타'
        };

        const salaryText = this.getSalaryText(jobSeeker.desired_salary_min, jobSeeker.desired_salary_max);

        detailContainer.innerHTML = `
            <div class="space-y-6">
                <!-- 기본 정보 -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-user mr-2 text-primary"></i>기본 정보
                    </h4>
                    <div class="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div><strong>이름:</strong> ${jobSeeker.name}</div>
                        <div><strong>국적:</strong> ${jobSeeker.nationality}</div>
                        <div><strong>성별:</strong> ${jobSeeker.gender === 'male' ? '남성' : jobSeeker.gender === 'female' ? '여성' : '-'}</div>
                        <div><strong>생년월일:</strong> ${jobSeeker.birth_date ? new Date(jobSeeker.birth_date).toLocaleDateString('ko-KR') : '-'}</div>
                        <div><strong>연락처:</strong> ${jobSeeker.phone || '-'}</div>
                        <div><strong>현재 거주지:</strong> ${jobSeeker.current_address || '-'}</div>
                    </div>
                </div>

                <!-- 비자 및 언어 정보 -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-passport mr-2 text-primary"></i>비자 및 언어 정보
                    </h4>
                    <div class="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div><strong>현재 비자:</strong> ${jobSeeker.current_visa || '-'}</div>
                        <div><strong>희망 비자:</strong> ${jobSeeker.desired_visa || '-'}</div>
                        <div><strong>한국어 수준:</strong> ${koreanLevelMap[jobSeeker.korean_level] || '-'}</div>
                        <div><strong>최종 학력:</strong> ${jobSeeker.education_level || '-'}</div>
                    </div>
                </div>

                <!-- 희망 근무 조건 -->
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-briefcase mr-2 text-primary"></i>희망 근무 조건
                    </h4>
                    <div class="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div><strong>희망 직종:</strong> ${jobCategoryMap[jobSeeker.desired_job_category] || '-'}</div>
                        <div><strong>희망 지역:</strong> ${jobSeeker.preferred_region || '-'}</div>
                        <div><strong>희망 급여:</strong> ${salaryText || '협의'}</div>
                        <div><strong>등록일:</strong> ${new Date(jobSeeker.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                </div>

                <!-- 경력 및 소개 -->
                ${jobSeeker.work_experience || jobSeeker.self_introduction ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-file-alt mr-2 text-primary"></i>경력 및 소개
                    </h4>
                    <div class="space-y-4">
                        ${jobSeeker.work_experience ? `
                        <div>
                            <strong class="block mb-2">업무 경험:</strong>
                            <p class="bg-gray-50 p-3 rounded text-gray-700">${jobSeeker.work_experience}</p>
                        </div>` : ''}
                        
                        ${jobSeeker.self_introduction ? `
                        <div>
                            <strong class="block mb-2">자기소개:</strong>
                            <p class="bg-gray-50 p-3 rounded text-gray-700">${jobSeeker.self_introduction}</p>
                        </div>` : ''}
                    </div>
                </div>` : ''}
            </div>
        `;

        // 연락하기 버튼 이벤트 설정
        document.getElementById('contact-btn').onclick = () => {
            this.contactJobSeeker(jobSeeker);
        };
    }

    contactJobSeeker(jobSeeker) {
        const message = `구직자 ${jobSeeker.name}님에게 연락하기\\n\\n연락처: ${jobSeeker.phone || '정보없음'}\\n이메일: ${jobSeeker.email}\\n\\n실제 환경에서는 메시지 전송이나 연락처 표시 기능이 구현됩니다.`;
        alert(message);
    }

    showModal() {
        const modal = document.getElementById('job-seeker-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        const modal = document.getElementById('job-seeker-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = '';

        if (this.totalPages <= 1) return;

        // 이전 버튼
        if (this.currentPage > 1) {
            const prevBtn = this.createPaginationButton('이전', this.currentPage - 1);
            paginationContainer.appendChild(prevBtn);
        }

        // 페이지 번호들
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPaginationButton(i, i, i === this.currentPage);
            paginationContainer.appendChild(pageBtn);
        }

        // 다음 버튼
        if (this.currentPage < this.totalPages) {
            const nextBtn = this.createPaginationButton('다음', this.currentPage + 1);
            paginationContainer.appendChild(nextBtn);
        }
    }

    createPaginationButton(text, page, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = isActive 
            ? 'px-3 py-2 bg-primary text-white rounded-md'
            : 'px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50';
        
        if (!isActive) {
            button.addEventListener('click', () => {
                this.currentPage = page;
                this.loadJobSeekers();
            });
        }

        return button;
    }

    updateStats(totalCount) {
        document.getElementById('total-count').textContent = totalCount;
        
        // 간단한 통계 업데이트 (실제로는 별도 API 호출이 필요할 수 있음)
        const nationalities = [...new Set(this.jobSeekers.map(js => js.nationality))];
        document.getElementById('nationality-count').textContent = nationalities.length;
        
        const advancedKorean = this.jobSeekers.filter(js => 
            js.korean_level === 'advanced' || js.korean_level === 'native'
        ).length;
        document.getElementById('korean-advanced').textContent = advancedKorean;
        
        const readyToWork = this.jobSeekers.filter(js => 
            js.current_visa && !js.current_visa.includes('Tourist')
        ).length;
        document.getElementById('ready-to-work').textContent = readyToWork;
    }

    showError(message) {
        alert('❌ ' + message);
    }

    // 로그인 필요 알림 표시
    showLoginRequiredAlert(contentType) {
        const message = `🔐 로그인이 필요합니다

${contentType}의 상세 내용을 보시려면 먼저 로그인해주세요.

✅ 로그인 후 이용 가능한 기능:
• ${contentType} 상세 정보 열람
• 연락처 및 개인정보
• 매칭 및 연결 서비스
• 메시지 발송

지금 로그인하시겠습니까?`;

        if (confirm(message)) {
            window.location.href = '/static/login.html';
        }
    }
}

// 페이지 로드시 초기화
let jobSeekerList;
document.addEventListener('DOMContentLoaded', () => {
    jobSeekerList = new JobSeekerList();
});