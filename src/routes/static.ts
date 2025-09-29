// 📄 정적 페이지 라우트 핸들러 (템플릿 기반)
// 외부 HTML 템플릿을 사용하여 페이지들을 처리합니다

import { Hono } from 'hono';
import type { Bindings } from '../types';
import { TemplateRenderer } from '../utils/template';

const staticPages = new Hono<{ Bindings: Bindings }>();

/**
 * 🔑 로그인 페이지
 */
staticPages.get('/login.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('login.html', {
    title: '로그인',
    bodyClass: 'bg-gradient-to-br from-blue-50 to-white min-h-screen',
    customCSS: `
      .login-container {
        animation: fadeInUp 0.6s ease-out;
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
    customJS: `
      // 로그인 폼 처리
      document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        const loginText = document.getElementById('login-text');
        const loginSpinner = document.getElementById('login-spinner');
        
        if (loginForm) {
          loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!WOW.validateForm(this)) {
              WOW.showNotification('모든 필드를 올바르게 입력해주세요.', 'error');
              return;
            }
            
            // 로딩 상태
            loginBtn.disabled = true;
            loginText.textContent = '로그인 중...';
            loginSpinner.classList.remove('hidden');
            
            try {
              const formData = new FormData(this);
              const loginData = {
                email: formData.get('email'),
                password: formData.get('password'),
                userType: formData.get('userType')
              };
              
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
              });
              
              const result = await response.json();
              
              if (result.success) {
                WOW.showNotification('로그인 성공!', 'success');
                localStorage.setItem('token', result.token);
                
                // 사용자 타입에 따라 리다이렉트
                setTimeout(() => {
                  switch(result.user.userType) {
                    case 'admin':
                      window.location.href = '/admin';
                      break;
                    case 'employer':
                      window.location.href = '/employer/dashboard';
                      break;
                    case 'agent':
                      window.location.href = '/agent/dashboard';
                      break;
                    default:
                      window.location.href = '/dashboard';
                  }
                }, 1000);
              } else {
                throw new Error(result.message || '로그인에 실패했습니다.');
              }
            } catch (error) {
              console.error('Login error:', error);
              WOW.showNotification(error.message || '로그인 중 오류가 발생했습니다.', 'error');
            } finally {
              // 로딩 상태 해제
              loginBtn.disabled = false;
              loginText.textContent = '로그인';
              loginSpinner.classList.add('hidden');
            }
          });
        }
        
        // URL 파라미터에서 사용자 타입 설정
        const urlParams = new URLSearchParams(window.location.search);
        const userType = urlParams.get('type');
        if (userType) {
          const userTypeSelect = document.getElementById('userType');
          if (userTypeSelect) {
            userTypeSelect.value = userType;
          }
        }
      });
    `
  });
});

/**
 * 📝 회원가입 페이지
 */
staticPages.get('/register.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('register.html', {
    title: '회원가입',
    bodyClass: 'bg-gradient-to-br from-green-50 to-white min-h-screen',
    customCSS: `
      .user-type-btn.selected {
        border-color: #10b981;
        background-color: #f0fdf4;
      }
      .register-container {
        animation: slideInRight 0.6s ease-out;
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `,
    customJS: `
      document.addEventListener('DOMContentLoaded', function() {
        const userTypeButtons = document.querySelectorAll('.user-type-btn');
        const registerForm = document.getElementById('register-form');
        const userTypeSelection = document.getElementById('user-type-selection');
        const selectedUserTypeInput = document.getElementById('selectedUserType');
        const dynamicFields = document.getElementById('dynamic-fields');
        
        // 사용자 타입 선택 처리
        userTypeButtons.forEach(btn => {
          btn.addEventListener('click', function() {
            // 기존 선택 해제
            userTypeButtons.forEach(b => b.classList.remove('selected'));
            
            // 새 선택 적용
            this.classList.add('selected');
            const userType = this.dataset.type;
            selectedUserTypeInput.value = userType;
            
            // 동적 필드 업데이트
            updateDynamicFields(userType);
            
            // 폼 표시
            userTypeSelection.classList.add('hidden');
            registerForm.classList.remove('hidden');
          });
        });
        
        // 동적 필드 생성 함수
        function updateDynamicFields(userType) {
          let fieldsHTML = '';
          
          switch(userType) {
            case 'employer':
              fieldsHTML = \`
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">회사명</label>
                  <input type="text" name="companyName" required 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                         placeholder="회사명을 입력하세요">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">사업자등록번호</label>
                  <input type="text" name="businessNumber" 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                         placeholder="000-00-00000">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">업종</label>
                  <select name="industry" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">선택해주세요</option>
                    <option value="manufacturing">제조업</option>
                    <option value="construction">건설업</option>
                    <option value="service">서비스업</option>
                    <option value="retail">도소매업</option>
                    <option value="food">음식업</option>
                    <option value="tech">IT/기술</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              \`;
              break;
              
            case 'agent':
              fieldsHTML = \`
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">에이전시명</label>
                  <input type="text" name="agencyName" required 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                         placeholder="에이전시명을 입력하세요">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">라이센스 번호</label>
                  <input type="text" name="licenseNumber" 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                         placeholder="라이센스 번호 (선택사항)">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">서비스 지역</label>
                  <select name="country" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">선택해주세요</option>
                    <option value="korea">한국</option>
                    <option value="china">중국</option>
                    <option value="vietnam">베트남</option>
                    <option value="philippines">필리핀</option>
                    <option value="thailand">태국</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              \`;
              break;
              
            case 'jobseeker':
            case 'student':
              fieldsHTML = \`
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">국적</label>
                  <select name="nationality" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">선택해주세요</option>
                    <option value="china">중국</option>
                    <option value="vietnam">베트남</option>
                    <option value="philippines">필리핀</option>
                    <option value="thailand">태국</option>
                    <option value="nepal">네팔</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">비자 유형</label>
                  <select name="visaType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">선택해주세요</option>
                    <option value="e7">E-7 (특정활동)</option>
                    <option value="e9">E-9 (비전문취업)</option>
                    <option value="h2">H-2 (방문취업)</option>
                    <option value="f4">F-4 (재외동포)</option>
                    <option value="f2">F-2 (거주)</option>
                    <option value="f5">F-5 (영주)</option>
                    <option value="d2">D-2 (유학)</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              \`;
              break;
          }
          
          dynamicFields.innerHTML = fieldsHTML;
        }
        
        // 회원가입 폼 제출 처리
        if (registerForm) {
          registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 비밀번호 확인
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
              WOW.showNotification('비밀번호가 일치하지 않습니다.', 'error');
              return;
            }
            
            if (!WOW.validateForm(this)) {
              WOW.showNotification('모든 필수 필드를 입력해주세요.', 'error');
              return;
            }
            
            const registerBtn = document.getElementById('register-btn');
            const registerText = document.getElementById('register-text');
            const registerSpinner = document.getElementById('register-spinner');
            
            // 로딩 상태
            registerBtn.disabled = true;
            registerText.textContent = '가입 중...';
            registerSpinner.classList.remove('hidden');
            
            try {
              const formData = new FormData(this);
              const registerData = Object.fromEntries(formData.entries());
              
              const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
              });
              
              const result = await response.json();
              
              if (result.success) {
                WOW.showNotification('회원가입이 완료되었습니다!', 'success');
                setTimeout(() => {
                  window.location.href = '/static/login.html?type=' + registerData.userType;
                }, 1500);
              } else {
                throw new Error(result.message || '회원가입에 실패했습니다.');
              }
            } catch (error) {
              console.error('Registration error:', error);
              WOW.showNotification(error.message || '회원가입 중 오류가 발생했습니다.', 'error');
            } finally {
              // 로딩 상태 해제
              registerBtn.disabled = false;
              registerText.textContent = '회원가입';
              registerSpinner.classList.add('hidden');
            }
          });
        }
        
        // URL 파라미터에서 사용자 타입 미리 선택
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedType = urlParams.get('type');
        if (preselectedType) {
          const targetBtn = document.querySelector(\`[data-type="\${preselectedType}"]\`);
          if (targetBtn) {
            targetBtn.click();
          }
        }
      });
    `
  });
});

/**
 * 🤝 매칭 서비스 페이지
 */
staticPages.get('/matching-service.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('matching-service.html', {
    title: '매칭 서비스',
    bodyClass: 'min-h-screen',
    customJS: `
      document.addEventListener('DOMContentLoaded', async function() {
        // 통계 데이터 로드
        try {
          const response = await fetch('/api/statistics');
          if (response.ok) {
            const stats = await response.json();
            
            // 애니메이션과 함께 통계 업데이트
            const updateCounter = (elementId, targetValue) => {
              const element = document.getElementById(elementId);
              if (element) {
                let current = 0;
                const increment = targetValue / 50;
                const timer = setInterval(() => {
                  current += increment;
                  if (current >= targetValue) {
                    current = targetValue;
                    clearInterval(timer);
                  }
                  element.textContent = Math.floor(current).toLocaleString();
                }, 30);
              }
            };
            
            updateCounter('total-users', stats.totalUsers || 0);
            updateCounter('total-jobs', stats.totalJobs || 0);
            updateCounter('successful-matches', stats.successfulMatches || 0);
            updateCounter('active-companies', stats.activeCompanies || 0);
          }
        } catch (error) {
          console.error('Failed to load statistics:', error);
        }
      });
    `
  });
});

/**
 * ⚕️ 헬스체크 페이지 (시스템 상태)
 */
staticPages.get('/health', (c) => {
  const renderer = new TemplateRenderer(c);
  
  const systemInfo = {
    status: 'healthy',
    version: '2.0.0-refactored',
    uptime: '99.9%',
    responseTime: '< 100ms'
  };
  
  return renderer.renderPage('health.html', {
    title: '시스템 상태',
    bodyClass: 'min-h-screen bg-gradient-to-br from-blue-50 to-green-50',
  }, systemInfo);
});

/**
 * 🎓 유학 정보 페이지
 */
staticPages.get('/study.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('study.html', {
    title: '한국 유학 정보',
    bodyClass: 'min-h-screen',
    customJS: `
      // 카테고리 전환 함수
      function showCategory(category) {
        // 모든 콘텐츠 숨기기
        document.getElementById('default-content').classList.add('hidden');
        document.getElementById('universities-content').classList.add('hidden');
        document.getElementById('scholarships-content').classList.add('hidden');
        document.getElementById('language-content').classList.add('hidden');
        
        // 선택된 카테고리만 표시
        const targetContent = document.getElementById(category + '-content');
        if (targetContent) {
          targetContent.classList.remove('hidden');
        }
      }
      
      // 뒤로가기 기능
      function showDefault() {
        document.getElementById('universities-content').classList.add('hidden');
        document.getElementById('scholarships-content').classList.add('hidden');
        document.getElementById('language-content').classList.add('hidden');
        document.getElementById('default-content').classList.remove('hidden');
      }
      
      // 글로벌 함수로 등록
      window.showCategory = showCategory;
      window.showDefault = showDefault;
    `
  });
});

/**
 * 💼 채용 정보 페이지
 */
staticPages.get('/jobs.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('jobs.html', {
    title: '채용 정보',
    bodyClass: 'min-h-screen bg-gray-50',
    customJS: `
      document.addEventListener('DOMContentLoaded', async function() {
        await loadJobsList();
      });
      
      async function loadJobsList() {
        try {
          const response = await fetch('/api/jobs');
          if (response.ok) {
            const data = await response.json();
            const jobsList = document.getElementById('jobs-list');
            
            if (data.jobs && data.jobs.length > 0) {
              jobsList.innerHTML = data.jobs.map(job => \`
                <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-xl font-bold text-gray-800 mb-2">\${job.title}</h3>
                      <p class="text-gray-600"><i class="fas fa-building mr-2"></i>\${job.company}</p>
                    </div>
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      \${job.visa_type || 'E-7'}
                    </span>
                  </div>
                  
                  <div class="space-y-2 mb-4">
                    <p class="text-gray-600"><i class="fas fa-map-marker-alt mr-2"></i>\${job.location}</p>
                    <p class="text-gray-600"><i class="fas fa-won-sign mr-2"></i>\${job.salary || '협의'}</p>
                    <p class="text-gray-600"><i class="fas fa-clock mr-2"></i>\${new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div class="border-t pt-4">
                    <p class="text-gray-700 mb-4">\${job.description || '상세 내용을 확인해보세요.'}</p>
                    <div class="flex justify-between items-center">
                      <div class="flex space-x-2">
                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">정규직</span>
                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">경력무관</span>
                      </div>
                      <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        지원하기
                      </button>
                    </div>
                  </div>
                </div>
              \`).join('');
            } else {
              jobsList.innerHTML = '<div class="text-center text-gray-500 py-12"><i class="fas fa-briefcase text-4xl mb-4"></i><p>등록된 채용공고가 없습니다.</p></div>';
            }
          }
        } catch (error) {
          console.error('Failed to load jobs:', error);
          document.getElementById('jobs-list').innerHTML = '<div class="text-center text-red-500 py-12">채용정보를 불러오는데 실패했습니다.</div>';
        }
      }
    `
  });
});

/**
 * 👥 구직자 정보 페이지
 */
staticPages.get('/jobseekers.html', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('jobseekers.html', {
    title: '구직자 정보',
    bodyClass: 'min-h-screen bg-gray-50',
    customJS: `
      document.addEventListener('DOMContentLoaded', async function() {
        await loadJobSeekersList();
      });
      
      async function loadJobSeekersList() {
        try {
          const response = await fetch('/api/jobseekers');
          if (response.ok) {
            const data = await response.json();
            const jobseekersList = document.getElementById('jobseekers-list');
            
            if (data.jobseekers && data.jobseekers.length > 0) {
              jobseekersList.innerHTML = data.jobseekers.map(jobseeker => \`
                <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div class="text-center mb-4">
                    <div class="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i class="fas fa-user text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">\${jobseeker.name}</h3>
                  </div>
                  
                  <div class="space-y-2 mb-4">
                    <p class="text-gray-600 text-center"><i class="fas fa-globe mr-2"></i>\${jobseeker.nationality}</p>
                    <p class="text-gray-600 text-center"><i class="fas fa-language mr-2"></i>한국어 \${jobseeker.korean_level}</p>
                    <p class="text-gray-600 text-center"><i class="fas fa-graduation-cap mr-2"></i>\${jobseeker.education_level}</p>
                    <p class="text-gray-600 text-center"><i class="fas fa-id-card mr-2"></i>\${jobseeker.visa_status}</p>
                  </div>
                  
                  <div class="border-t pt-4 text-center">
                    <button class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors w-full">
                      <i class="fas fa-envelope mr-2"></i>연락하기
                    </button>
                  </div>
                </div>
              \`).join('');
            } else {
              jobseekersList.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12"><i class="fas fa-users text-4xl mb-4"></i><p>등록된 구직자가 없습니다.</p></div>';
            }
          }
        } catch (error) {
          console.error('Failed to load jobseekers:', error);
          document.getElementById('jobseekers-list').innerHTML = '<div class="col-span-full text-center text-red-500 py-12">구직자 정보를 불러오는데 실패했습니다.</div>';
        }
      }
    `
  });
});

/**
 * 🚫 404 에러 페이지 핸들러
 */
staticPages.get('/*', (c) => {
  const renderer = new TemplateRenderer(c);
  
  return renderer.renderPage('404.html', {
    title: '페이지를 찾을 수 없음',
    bodyClass: 'min-h-screen bg-gradient-to-br from-red-50 to-orange-50',
  }, {
    path: c.req.path
  });
});

export default staticPages;