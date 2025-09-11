// 테스트 계정 생성 스크립트
// 각 사용자 유형별로 로컬 스토리지에 저장할 수 있는 테스트 계정을 생성

const testAccounts = {
    jobseeker: {
        id: 1,
        type: 'jobseeker',
        name: '김구직',
        email: 'jobseeker@test.com',
        password: 'test123',
        token: 'jobseeker-token-123',
        profile: {
            skills: ['JavaScript', 'React', 'Node.js'],
            experience: '2년',
            education: '대학교 졸업',
            location: '서울시 강남구',
            visa_status: 'E-7',
            phone: '010-1234-5678'
        }
    },
    employer: {
        id: 1,
        type: 'employer',
        name: '박기업',
        email: 'employer@test.com',
        password: 'test123',
        token: 'employer-token-123',
        company: {
            name: '테스트 기업',
            industry: 'IT/소프트웨어',
            size: '중소기업',
            location: '서울시 강남구',
            description: '혁신적인 IT 솔루션을 제공하는 기업입니다.'
        }
    },
    agent: {
        id: 1,
        type: 'agent',
        name: '이에이전트',
        email: 'agent@test.com',
        password: 'test123',
        token: 'agent-token-123',
        agency: {
            name: '글로벌 인재 에이전시',
            license: 'AG-2024-001',
            specialization: ['IT', '엔지니어링', '의료'],
            region: '서울/경기',
            success_rate: '85%'
        }
    },
    admin: {
        id: 1,
        type: 'admin',
        name: '최관리자',
        email: 'admin@test.com',
        password: 'admin123',
        token: 'admin-token-123',
        permissions: [
            'user_management',
            'job_management',
            'agent_management', 
            'system_settings',
            'statistics_view'
        ]
    }
};

// 브라우저에서 사용할 수 있는 함수들
window.loginAsTestUser = function(userType) {
    if (!testAccounts[userType]) {
        alert('유효하지 않은 사용자 유형입니다.');
        return;
    }
    
    const user = testAccounts[userType];
    
    // localStorage에 사용자 정보 저장
    localStorage.setItem('authToken', user.token);
    localStorage.setItem('userRole', user.type);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('user', JSON.stringify(user));
    
    alert(`${user.name} (${user.type})로 로그인되었습니다.`);
    
    // 해당 사용자 유형의 대시보드로 이동
    switch(userType) {
        case 'jobseeker':
            window.location.href = '/static/jobseeker-dashboard.html';
            break;
        case 'employer':
            window.location.href = '/static/employer-dashboard.html';
            break;
        case 'agent':
            window.location.href = '/static/agent-dashboard.html';
            break;
        case 'admin':
            window.location.href = '/static/admin-dashboard.html';
            break;
    }
};

// 로그아웃 함수
window.logoutTestUser = function() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('user');
    
    alert('로그아웃되었습니다.');
    window.location.href = '/';
};

// 현재 로그인 상태 확인
window.getCurrentUser = function() {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    
    if (token && userRole && userName) {
        return {
            token,
            role: userRole,
            name: userName,
            isLoggedIn: true
        };
    }
    
    return {
        isLoggedIn: false
    };
};

// 테스트 계정 정보 표시
window.showTestAccounts = function() {
    console.log('🧪 테스트 계정 정보:');
    console.log('================================');
    Object.keys(testAccounts).forEach(type => {
        const account = testAccounts[type];
        console.log(`${type.toUpperCase()}:`);
        console.log(`  이름: ${account.name}`);
        console.log(`  이메일: ${account.email}`);
        console.log(`  비밀번호: ${account.password}`);
        console.log(`  로그인: loginAsTestUser('${type}')`);
        console.log('');
    });
    console.log('현재 로그인 상태:', getCurrentUser());
};

console.log('🧪 테스트 계정 시스템이 로드되었습니다.');
console.log('사용법: showTestAccounts() - 계정 정보 보기');
console.log('사용법: loginAsTestUser("유형") - 테스트 로그인');
console.log('사용법: logoutTestUser() - 로그아웃');