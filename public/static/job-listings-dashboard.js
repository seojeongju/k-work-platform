// Job Listings Dashboard JavaScript
class JobListingsDashboard {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 1;
        this.jobsPerPage = 10;
        this.currentFilters = {};
        this.currentSort = 'latest';
        
        this.initializeEventListeners();
        this.loadJobListings();
    }

    initializeEventListeners() {
        // Mobile menu toggle
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
        
        // Enter key for search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });

        // Sort functionality
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortAndDisplayJobs();
        });

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMoreJobs());

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('applyJobBtn').addEventListener('click', () => this.applyForJob());

        // Close modal on outside click
        document.getElementById('jobDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'jobDetailModal') this.closeModal();
        });
    }

    async loadJobListings() {
        try {
            // Show loading state
            document.getElementById('loadingState').classList.remove('hidden');

            // Try to fetch from API first
            try {
                const response = await fetch('/api/jobs/public');
                if (response.ok) {
                    this.jobs = await response.json();
                }
            } catch (error) {
                console.log('API not available, using sample data');
            }

            // If no data from API, use sample data
            if (!this.jobs.length) {
                this.jobs = this.generateSampleJobs();
            }

            this.filteredJobs = [...this.jobs];
            this.displayJobs();
            this.updateJobCount();

        } catch (error) {
            console.error('Error loading job listings:', error);
            this.showError('구인정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    generateSampleJobs() {
        const companies = [
            '삼성전자', 'LG전자', '현대자동차', '네이버', '카카오', 
            'SK하이닉스', 'POSCO', '한국전력공사', 'KB국민은행', '신한은행',
            '롯데그룹', '두산그룹', 'GS칼텍스', 'KT', 'LGU+',
            '현대건설', '대림산업', '삼성물산', '한화그룹', 'CJ그룹'
        ];

        const positions = [
            '소프트웨어 개발자', '데이터 분석가', '마케팅 매니저', '영업 담당자', 
            '회계 담당자', '인사 담당자', '품질관리 담당자', '생산관리 담당자',
            'UI/UX 디자이너', '프로젝트 매니저', '고객서비스 담당자', '연구개발자',
            '영업기획자', '재무분석가', '운영관리자', '기술지원 엔지니어'
        ];

        const locations = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산'];
        const jobTypes = ['정규직', '계약직', '인턴', '파트타임'];
        const experiences = ['신입', '1-3년', '3-5년', '5년+'];
        const industries = ['IT', '제조', '서비스', '금융', '교육', '의료'];

        return Array.from({ length: 50 }, (_, index) => ({
            id: index + 1,
            title: positions[Math.floor(Math.random() * positions.length)],
            company: companies[Math.floor(Math.random() * companies.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            jobType: jobTypes[Math.floor(Math.random() * jobTypes.length)],
            salary: `${Math.floor(Math.random() * 3000) + 2500}만원`,
            experience: experiences[Math.floor(Math.random() * experiences.length)],
            industry: industries[Math.floor(Math.random() * industries.length)],
            description: '우수한 인재를 모집합니다. 성장 가능성이 높은 포지션이며, 다양한 복리후생과 교육 기회를 제공합니다.',
            requirements: [
                '관련 분야 경험 및 지식',
                '원활한 의사소통 능력',
                '팀워크 및 협업 능력',
                '책임감 있는 업무 수행'
            ],
            benefits: [
                '4대보험 완비',
                '퇴직연금',
                '연차/경조휴가',
                '교육비 지원',
                '건강검진',
                '직원 할인'
            ],
            deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            postedDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            views: Math.floor(Math.random() * 500) + 50,
            applications: Math.floor(Math.random() * 50) + 5
        }));
    }

    applyFilters() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const location = document.getElementById('locationFilter').value;
        const jobType = document.getElementById('jobTypeFilter').value;
        const salary = document.getElementById('salaryFilter').value;
        const experience = document.getElementById('experienceFilter').value;
        const industry = document.getElementById('industryFilter').value;

        this.currentFilters = { search, location, jobType, salary, experience, industry };

        this.filteredJobs = this.jobs.filter(job => {
            if (search && !job.title.toLowerCase().includes(search) && 
                !job.company.toLowerCase().includes(search) &&
                !job.description.toLowerCase().includes(search)) {
                return false;
            }
            if (location && job.location !== location) return false;
            if (jobType && job.jobType !== jobType) return false;
            if (experience && job.experience !== experience) return false;
            if (industry && job.industry !== industry) return false;
            if (salary) {
                const [min, max] = salary.split('-').map(s => parseInt(s) || Infinity);
                const jobSalary = parseInt(job.salary.replace(/[^0-9]/g, ''));
                if (salary === '5000+') {
                    if (jobSalary < 5000) return false;
                } else {
                    if (jobSalary < min || jobSalary > max) return false;
                }
            }
            return true;
        });

        this.currentPage = 1;
        this.sortAndDisplayJobs();
        this.updateJobCount();
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('locationFilter').value = '';
        document.getElementById('jobTypeFilter').value = '';
        document.getElementById('salaryFilter').value = '';
        document.getElementById('experienceFilter').value = '';
        document.getElementById('industryFilter').value = '';
        document.getElementById('sortBy').value = 'latest';

        this.currentFilters = {};
        this.currentSort = 'latest';
        this.filteredJobs = [...this.jobs];
        this.currentPage = 1;
        this.sortAndDisplayJobs();
        this.updateJobCount();
    }

    sortAndDisplayJobs() {
        switch (this.currentSort) {
            case 'latest':
                this.filteredJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
                break;
            case 'salary':
                this.filteredJobs.sort((a, b) => {
                    const salaryA = parseInt(a.salary.replace(/[^0-9]/g, ''));
                    const salaryB = parseInt(b.salary.replace(/[^0-9]/g, ''));
                    return salaryB - salaryA;
                });
                break;
            case 'company':
                this.filteredJobs.sort((a, b) => a.company.localeCompare(b.company, 'ko'));
                break;
            case 'deadline':
                this.filteredJobs.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
                break;
        }
        this.displayJobs();
    }

    displayJobs() {
        const container = document.getElementById('jobListings');
        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(0, endIndex);

        if (jobsToShow.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-medium text-gray-600 mb-2">검색 결과가 없습니다</h3>
                    <p class="text-gray-500">다른 검색 조건으로 다시 시도해보세요.</p>
                </div>
            `;
            document.getElementById('loadMoreBtn').classList.add('hidden');
            return;
        }

        container.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');

        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (endIndex < this.filteredJobs.length) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }

        // Add click events to job cards
        container.querySelectorAll('.job-card').forEach(card => {
            card.addEventListener('click', () => {
                const jobId = parseInt(card.dataset.jobId);
                this.showJobDetail(jobId);
            });
        });
    }

    createJobCard(job) {
        const daysAgo = Math.floor((Date.now() - new Date(job.postedDate)) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.floor((new Date(job.deadline) - Date.now()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="job-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" data-job-id="${job.id}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <h3 class="text-lg font-semibold text-gray-900">${job.title}</h3>
                            <span class="px-2 py-1 text-xs font-medium bg-wow-blue text-white rounded">${job.jobType}</span>
                        </div>
                        <p class="text-wow-blue font-medium mb-1">${job.company}</p>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span><i class="fas fa-map-marker-alt mr-1"></i>${job.location}</span>
                            <span><i class="fas fa-won-sign mr-1"></i>${job.salary}</span>
                            <span><i class="fas fa-briefcase mr-1"></i>${job.experience}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500 mb-1">${daysAgo}일 전</div>
                        <div class="text-xs text-red-500">D-${daysLeft}</div>
                    </div>
                </div>

                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${job.description}</p>

                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <span><i class="fas fa-eye mr-1"></i>조회 ${job.views}</span>
                        <span><i class="fas fa-users mr-1"></i>지원 ${job.applications}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">${job.industry}</span>
                        <button class="text-wow-orange hover:text-wow-orange-dark transition-colors">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showJobDetail(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        // Update views
        job.views += 1;

        document.getElementById('modalJobTitle').textContent = job.title;
        document.getElementById('modalCompanyName').textContent = job.company;

        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">근무 조건</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">위치:</span>
                                <span>${job.location}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">고용형태:</span>
                                <span>${job.jobType}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">급여:</span>
                                <span>${job.salary}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">경력:</span>
                                <span>${job.experience}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">업종:</span>
                                <span>${job.industry}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">모집 정보</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">마감일:</span>
                                <span>${job.deadline}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">조회수:</span>
                                <span>${job.views}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">지원자:</span>
                                <span>${job.applications}명</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">자격 요건</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            ${job.requirements.map(req => `<li class="flex items-start"><i class="fas fa-check text-green-500 mr-2 mt-0.5 text-xs"></i>${req}</li>`).join('')}
                        </ul>
                    </div>

                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">복리후생</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            ${job.benefits.map(benefit => `<li class="flex items-start"><i class="fas fa-gift text-wow-orange mr-2 mt-0.5 text-xs"></i>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="mt-6">
                <h4 class="font-medium text-gray-900 mb-2">상세 설명</h4>
                <p class="text-gray-600 text-sm leading-relaxed">${job.description}</p>
            </div>
        `;

        // Store current job for apply function
        this.currentJobForApplication = job;

        document.getElementById('jobDetailModal').classList.remove('hidden');
        document.getElementById('jobDetailModal').classList.add('flex');
    }

    closeModal() {
        document.getElementById('jobDetailModal').classList.add('hidden');
        document.getElementById('jobDetailModal').classList.remove('flex');
    }

    applyForJob() {
        if (!this.currentJobForApplication) return;

        // Check if user is logged in (you can implement proper auth check)
        const isLoggedIn = localStorage.getItem('userToken') || false;
        
        if (!isLoggedIn) {
            alert('지원하려면 먼저 로그인해주세요.');
            window.location.href = '/static/login.html';
            return;
        }

        // Simulate application process
        this.currentJobForApplication.applications += 1;
        alert(`${this.currentJobForApplication.company}의 ${this.currentJobForApplication.title} 포지션에 성공적으로 지원하였습니다!`);
        this.closeModal();
        
        // Update the display
        this.displayJobs();
    }

    loadMoreJobs() {
        this.currentPage += 1;
        this.displayJobs();
    }

    updateJobCount() {
        document.getElementById('totalJobs').textContent = this.filteredJobs.length;
    }

    showError(message) {
        const container = document.getElementById('jobListings');
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl font-medium text-red-600 mb-2">오류가 발생했습니다</h3>
                <p class="text-gray-600">${message}</p>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobListingsDashboard();
});