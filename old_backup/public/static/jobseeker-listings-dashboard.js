// Jobseeker Listings Dashboard JavaScript
class JobseekerListingsDashboard {
    constructor() {
        this.jobseekers = [];
        this.filteredJobseekers = [];
        this.currentPage = 1;
        this.jobseekersPerPage = 12;
        this.currentFilters = {};
        this.currentSort = 'latest';
        
        this.initializeEventListeners();
        this.loadJobseekerListings();
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
            this.sortAndDisplayJobseekers();
        });

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMoreJobseekers());

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('contactJobseekerBtn').addEventListener('click', () => this.contactJobseeker());

        // Close modal on outside click
        document.getElementById('jobseekerDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'jobseekerDetailModal') this.closeModal();
        });
    }

    async loadJobseekerListings() {
        try {
            // Show loading state
            document.getElementById('loadingState').classList.remove('hidden');

            // Try to fetch from API first
            try {
                const response = await fetch('/api/jobseekers/public');
                if (response.ok) {
                    this.jobseekers = await response.json();
                }
            } catch (error) {
                console.log('API not available, using sample data');
            }

            // If no data from API, use sample data
            if (!this.jobseekers.length) {
                this.jobseekers = this.generateSampleJobseekers();
            }

            this.filteredJobseekers = [...this.jobseekers];
            this.displayJobseekers();
            this.updateJobseekerCount();

        } catch (error) {
            console.error('Error loading jobseeker listings:', error);
            this.showError('구직자 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    generateSampleJobseekers() {
        const names = [
            { first: '응우엔', last: '반', nationality: '베트남' },
            { first: '왕', last: '리', nationality: '중국' },
            { first: '마리아', last: '산토스', nationality: '필리핀' },
            { first: '소피아', last: '김', nationality: '태국' },
            { first: '바트', last: '몽', nationality: '몽골' },
            { first: '인드라', last: '사리', nationality: '인도네시아' },
            { first: '라빈', last: '셰르파', nationality: '네팔' },
            { first: '타나카', last: '히로시', nationality: '일본' },
            { first: '데이비드', last: '존슨', nationality: '미국' },
            { first: '안나', last: '뮐러', nationality: '독일' }
        ];

        const positions = [
            '소프트웨어 개발자', '데이터 분석가', '마케팅 전문가', '영업 담당자', 
            '회계 담당자', '디자이너', '번역가', '교사', '엔지니어', '간호사',
            '요리사', '서비스 직원', '물류 담당자', '품질관리자', '연구원'
        ];

        const skills = [
            ['JavaScript', 'React', 'Node.js'],
            ['Python', 'SQL', 'Excel'],
            ['Photoshop', 'Illustrator', 'UI/UX'],
            ['영어', '중국어', '일본어'],
            ['Excel', 'PowerPoint', '프레젠테이션'],
            ['Java', 'Spring', 'MySQL'],
            ['HTML', 'CSS', 'Bootstrap'],
            ['Korean', 'English', 'Communication']
        ];

        const locations = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산'];
        const jobTypes = ['정규직', '계약직', '인턴', '파트타임'];
        const experiences = ['신입', '1-3년', '3-5년', '5년+'];
        const koreanLevels = ['초급', '중급', '고급', '원어민'];
        const visaTypes = ['D-2', 'D-4', 'E-7', 'F-2', 'F-5'];
        const genders = ['남성', '여성'];

        return Array.from({ length: 60 }, (_, index) => {
            const nameData = names[index % names.length];
            const firstName = nameData.first;
            const lastName = nameData.last || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const nationality = nameData.nationality;
            const age = Math.floor(Math.random() * 15) + 22; // 22-37세
            
            return {
                id: index + 1,
                name: fullName,
                firstName,
                lastName,
                nationality,
                age,
                gender: genders[Math.floor(Math.random() * genders.length)],
                position: positions[Math.floor(Math.random() * positions.length)],
                location: locations[Math.floor(Math.random() * locations.length)],
                preferredJobType: jobTypes[Math.floor(Math.random() * jobTypes.length)],
                experience: experiences[Math.floor(Math.random() * experiences.length)],
                koreanLevel: koreanLevels[Math.floor(Math.random() * koreanLevels.length)],
                visaStatus: visaTypes[Math.floor(Math.random() * visaTypes.length)],
                skills: skills[Math.floor(Math.random() * skills.length)],
                bio: '성실하고 책임감 있는 인재입니다. 한국에서 경험을 쌓고 성장하고 싶습니다.',
                education: '대학교 졸업',
                languages: ['한국어', '영어', nationality === '중국' ? '중국어' : nationality === '베트남' ? '베트남어' : '현지어'],
                email: `${firstName.toLowerCase()}${lastName.toLowerCase()}@example.com`,
                phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
                availableFrom: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                joinDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                profileViews: Math.floor(Math.random() * 200) + 20,
                contactRequests: Math.floor(Math.random() * 15) + 1,
                rating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
                isAvailable: Math.random() > 0.3, // 70% available
                expectedSalary: `${Math.floor(Math.random() * 2000) + 2000}만원`
            };
        });
    }

    applyFilters() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const location = document.getElementById('locationFilter').value;
        const jobType = document.getElementById('jobTypeFilter').value;
        const experience = document.getElementById('experienceFilter').value;
        const nationality = document.getElementById('nationalityFilter').value;
        const korean = document.getElementById('koreanFilter').value;
        const visa = document.getElementById('visaFilter').value;

        this.currentFilters = { search, location, jobType, experience, nationality, korean, visa };

        this.filteredJobseekers = this.jobseekers.filter(jobseeker => {
            if (search && !jobseeker.name.toLowerCase().includes(search) && 
                !jobseeker.position.toLowerCase().includes(search) &&
                !jobseeker.skills.some(skill => skill.toLowerCase().includes(search))) {
                return false;
            }
            if (location && jobseeker.location !== location) return false;
            if (jobType && jobseeker.preferredJobType !== jobType) return false;
            if (experience && jobseeker.experience !== experience) return false;
            if (nationality && jobseeker.nationality !== nationality) return false;
            if (korean && jobseeker.koreanLevel !== korean) return false;
            if (visa && jobseeker.visaStatus !== visa) return false;
            return true;
        });

        this.currentPage = 1;
        this.sortAndDisplayJobseekers();
        this.updateJobseekerCount();
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('locationFilter').value = '';
        document.getElementById('jobTypeFilter').value = '';
        document.getElementById('experienceFilter').value = '';
        document.getElementById('nationalityFilter').value = '';
        document.getElementById('koreanFilter').value = '';
        document.getElementById('visaFilter').value = '';
        document.getElementById('sortBy').value = 'latest';

        this.currentFilters = {};
        this.currentSort = 'latest';
        this.filteredJobseekers = [...this.jobseekers];
        this.currentPage = 1;
        this.sortAndDisplayJobseekers();
        this.updateJobseekerCount();
    }

    sortAndDisplayJobseekers() {
        switch (this.currentSort) {
            case 'latest':
                this.filteredJobseekers.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
                break;
            case 'experience':
                const expOrder = { '신입': 0, '1-3년': 1, '3-5년': 2, '5년+': 3 };
                this.filteredJobseekers.sort((a, b) => expOrder[b.experience] - expOrder[a.experience]);
                break;
            case 'korean':
                const koreanOrder = { '원어민': 3, '고급': 2, '중급': 1, '초급': 0 };
                this.filteredJobseekers.sort((a, b) => koreanOrder[b.koreanLevel] - koreanOrder[a.koreanLevel]);
                break;
            case 'name':
                this.filteredJobseekers.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
                break;
        }
        this.displayJobseekers();
    }

    displayJobseekers() {
        const container = document.getElementById('jobseekerListings');
        const startIndex = (this.currentPage - 1) * this.jobseekersPerPage;
        const endIndex = startIndex + this.jobseekersPerPage;
        const jobseekersToShow = this.filteredJobseekers.slice(0, endIndex);

        if (jobseekersToShow.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-medium text-gray-600 mb-2">검색 결과가 없습니다</h3>
                    <p class="text-gray-500">다른 검색 조건으로 다시 시도해보세요.</p>
                </div>
            `;
            document.getElementById('loadMoreBtn').classList.add('hidden');
            return;
        }

        container.innerHTML = jobseekersToShow.map(jobseeker => this.createJobseekerCard(jobseeker)).join('');

        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (endIndex < this.filteredJobseekers.length) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }

        // Add click events to jobseeker cards
        container.querySelectorAll('.jobseeker-card').forEach(card => {
            card.addEventListener('click', () => {
                const jobseekerId = parseInt(card.dataset.jobseekerId);
                this.showJobseekerDetail(jobseekerId);
            });
        });
    }

    createJobseekerCard(jobseeker) {
        const initials = jobseeker.firstName.charAt(0) + (jobseeker.lastName ? jobseeker.lastName.charAt(0) : '');
        const availabilityClass = jobseeker.isAvailable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const availabilityText = jobseeker.isAvailable ? '구직중' : '협의 가능';
        const daysAgo = Math.floor((Date.now() - new Date(jobseeker.joinDate)) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="jobseeker-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" data-jobseeker-id="${jobseeker.id}">
                <!-- Header -->
                <div class="flex items-start space-x-4 mb-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-wow-blue to-wow-blue-dark rounded-full flex items-center justify-center text-white font-bold">
                        ${initials}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-900 truncate">${jobseeker.name}</h3>
                        <p class="text-wow-blue font-medium text-sm">${jobseeker.position}</p>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="text-xs ${availabilityClass} px-2 py-1 rounded-full">${availabilityText}</span>
                            <span class="text-xs text-gray-500">${daysAgo}일 전 가입</span>
                        </div>
                    </div>
                </div>

                <!-- Info -->
                <div class="space-y-2 mb-4">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">국적:</span>
                        <span class="font-medium">${jobseeker.nationality}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">나이:</span>
                        <span class="font-medium">${jobseeker.age}세</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">경력:</span>
                        <span class="font-medium">${jobseeker.experience}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">한국어:</span>
                        <span class="font-medium">${jobseeker.koreanLevel}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">비자:</span>
                        <span class="font-medium">${jobseeker.visaStatus}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">희망지역:</span>
                        <span class="font-medium">${jobseeker.location}</span>
                    </div>
                </div>

                <!-- Skills -->
                <div class="mb-4">
                    <div class="flex flex-wrap gap-1">
                        ${jobseeker.skills.slice(0, 3).map(skill => `
                            <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">${skill}</span>
                        `).join('')}
                        ${jobseeker.skills.length > 3 ? `<span class="px-2 py-1 text-xs text-gray-500">+${jobseeker.skills.length - 3}</span>` : ''}
                    </div>
                </div>

                <!-- Stats -->
                <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span><i class="fas fa-eye mr-1"></i>${jobseeker.profileViews}</span>
                        <span><i class="fas fa-envelope mr-1"></i>${jobseeker.contactRequests}</span>
                        <span><i class="fas fa-star mr-1 text-yellow-400"></i>${jobseeker.rating}</span>
                    </div>
                    <button class="text-wow-orange hover:text-wow-orange-dark transition-colors">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    showJobseekerDetail(jobseekerId) {
        const jobseeker = this.jobseekers.find(j => j.id === jobseekerId);
        if (!jobseeker) return;

        // Update views
        jobseeker.profileViews += 1;

        const initials = jobseeker.firstName.charAt(0) + (jobseeker.lastName ? jobseeker.lastName.charAt(0) : '');
        
        document.getElementById('modalAvatar').textContent = initials;
        document.getElementById('modalJobseekerName').textContent = jobseeker.name;
        document.getElementById('modalJobseekerTitle').textContent = jobseeker.position;
        document.getElementById('modalNationality').textContent = jobseeker.nationality;
        document.getElementById('modalAge').textContent = `${jobseeker.age}세`;
        document.getElementById('modalGender').textContent = jobseeker.gender;

        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Left Column -->
                <div class="space-y-6">
                    <!-- Basic Info -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">기본 정보</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">나이:</span>
                                <span>${jobseeker.age}세 (${jobseeker.gender})</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">국적:</span>
                                <span>${jobseeker.nationality}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">비자 상태:</span>
                                <span>${jobseeker.visaStatus}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">한국어 수준:</span>
                                <span>${jobseeker.koreanLevel}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">학력:</span>
                                <span>${jobseeker.education}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Info -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">연락처 정보</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">이메일:</span>
                                <span class="text-wow-blue">${jobseeker.email}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">연락처:</span>
                                <span>${jobseeker.phone}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Availability -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">근무 조건</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">희망 지역:</span>
                                <span>${jobseeker.location}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">희망 고용형태:</span>
                                <span>${jobseeker.preferredJobType}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">희망 급여:</span>
                                <span>${jobseeker.expectedSalary}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">근무 가능일:</span>
                                <span>${jobseeker.availableFrom}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">상태:</span>
                                <span class="${jobseeker.isAvailable ? 'text-green-600' : 'text-yellow-600'}">${jobseeker.isAvailable ? '구직중' : '협의 가능'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-6">
                    <!-- Skills -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">보유 기술</h4>
                        <div class="flex flex-wrap gap-2">
                            ${jobseeker.skills.map(skill => `
                                <span class="px-3 py-1 text-sm bg-wow-blue text-white rounded-full">${skill}</span>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Languages -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">언어 능력</h4>
                        <div class="space-y-2">
                            ${jobseeker.languages.map(lang => `
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-language text-wow-orange"></i>
                                    <span class="text-sm">${lang}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Experience -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">경력 정보</h4>
                        <div class="text-sm text-gray-600">
                            <div class="flex justify-between mb-2">
                                <span>경력 수준:</span>
                                <span class="font-medium">${jobseeker.experience}</span>
                            </div>
                            <div class="flex justify-between mb-2">
                                <span>평점:</span>
                                <span class="flex items-center">
                                    <i class="fas fa-star text-yellow-400 mr-1"></i>
                                    ${jobseeker.rating}/5.0
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics -->
                    <div>
                        <h4 class="font-medium text-gray-900 mb-3">통계</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">프로필 조회:</span>
                                <span>${jobseeker.profileViews}회</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">연락 요청:</span>
                                <span>${jobseeker.contactRequests}회</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">가입일:</span>
                                <span>${jobseeker.joinDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bio -->
            <div class="mt-6 pt-6 border-t border-gray-200">
                <h4 class="font-medium text-gray-900 mb-2">자기소개</h4>
                <p class="text-gray-600 text-sm leading-relaxed">${jobseeker.bio}</p>
            </div>
        `;

        // Store current jobseeker for contact function
        this.currentJobseekerForContact = jobseeker;

        document.getElementById('jobseekerDetailModal').classList.remove('hidden');
        document.getElementById('jobseekerDetailModal').classList.add('flex');
    }

    closeModal() {
        document.getElementById('jobseekerDetailModal').classList.add('hidden');
        document.getElementById('jobseekerDetailModal').classList.remove('flex');
    }

    contactJobseeker() {
        if (!this.currentJobseekerForContact) return;

        // Check if user is logged in (you can implement proper auth check)
        const isLoggedIn = localStorage.getItem('userToken') || false;
        
        if (!isLoggedIn) {
            alert('연락하려면 먼저 로그인해주세요.');
            window.location.href = '/static/login.html';
            return;
        }

        // Simulate contact process
        this.currentJobseekerForContact.contactRequests += 1;
        alert(`${this.currentJobseekerForContact.name}님에게 연락 요청을 보냈습니다!`);
        this.closeModal();
        
        // Update the display
        this.displayJobseekers();
    }

    loadMoreJobseekers() {
        this.currentPage += 1;
        this.displayJobseekers();
    }

    updateJobseekerCount() {
        document.getElementById('totalJobseekers').textContent = this.filteredJobseekers.length;
    }

    showError(message) {
        const container = document.getElementById('jobseekerListings');
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl font-medium text-red-600 mb-2">오류가 발생했습니다</h3>
                <p class="text-gray-600">${message}</p>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobseekerListingsDashboard();
});