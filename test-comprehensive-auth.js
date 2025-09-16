console.log('🔥 Starting comprehensive authentication tests');

const BASE_URL = 'https://3000-ikl0hc06wc2o7swv0klq3-6532622b.e2b.dev';

// Test user creation for each type
const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Password123!',
    userType: 'admin',
    name: 'Admin User',
    role: 'admin'
  },
  agent: {
    email: 'agent@test.com', 
    password: 'Password123!',
    userType: 'agent',
    company_name: 'Test Agency',
    country: 'Korea',
    contact_person: 'Agent Smith',
    phone: '010-1234-5678'
  },
  employer: {
    email: 'employer@test.com',
    password: 'Password123!',
    userType: 'employer',
    company_name: 'Test Company',
    business_number: '123-45-67890',
    industry: 'IT',
    contact_person: 'HR Manager',
    phone: '02-1234-5678',
    address: 'Seoul, Korea',
    region: 'Seoul'
  },
  jobseeker: {
    email: 'jobseeker@test.com',
    password: 'Password123!',
    userType: 'jobseeker',
    name: 'Job Seeker',
    nationality: 'Philippines',
    korean_level: 'intermediate',
    education_level: 'university',
    current_visa: 'E-9',
    desired_visa: 'E-7'
  }
};

async function testRegistrationAndLogin(userType, userData) {
  try {
    console.log(`\n📝 Testing ${userType} registration...`);
    
    // Test registration
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    let registerData;
    try {
      registerData = await registerResponse.json();
    } catch (e) {
      console.log(`❌ ${userType} registration failed - invalid JSON response`);
      return false;
    }
    
    if (!registerResponse.ok || !registerData.success) {
      console.log(`❌ ${userType} registration failed:`, registerData.error || 'Unknown error');
      // Continue to login test even if registration fails (user might already exist)
    } else {
      console.log(`✅ ${userType} registration successful`);
    }
    
    // Test login
    console.log(`🔑 Testing ${userType} login...`);
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        userType: userData.userType
      })
    });
    
    let loginData;
    try {
      loginData = await loginResponse.json();
    } catch (e) {
      console.log(`❌ ${userType} login failed - invalid JSON response`);
      return false;
    }
    
    if (!loginResponse.ok || !loginData.success) {
      console.log(`❌ ${userType} login failed:`, loginData.error || 'Unknown error');
      return false;
    }
    
    console.log(`✅ ${userType} login successful, token:`, loginData.token ? 'Generated' : 'Missing');
    console.log(`👤 User info:`, {
      id: loginData.user?.id,
      email: loginData.user?.email,
      userType: loginData.user?.userType,
      name: loginData.user?.name
    });
    
    return { token: loginData.token, user: loginData.user };
    
  } catch (error) {
    console.log(`🚨 ${userType} test error:`, error.message);
    return false;
  }
}

async function testProtectedEndpoints(token, userType) {
  try {
    console.log(`\n🔒 Testing ${userType} protected endpoints...`);
    
    // Test profile endpoint
    const profileResponse = await fetch(`${BASE_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (profileResponse.ok) {
      console.log(`✅ ${userType} profile access successful`);
    } else {
      console.log(`❌ ${userType} profile access failed:`, profileResponse.status);
    }
    
    // Test stats endpoint (should work for all authenticated users)
    const statsResponse = await fetch(`${BASE_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`✅ ${userType} stats access successful:`, statsData.success ? 'Data loaded' : 'No data');
    } else {
      console.log(`❌ ${userType} stats access failed:`, statsResponse.status);
    }
    
  } catch (error) {
    console.log(`🚨 ${userType} protected endpoint test error:`, error.message);
  }
}

async function runAllTests() {
  console.log('🎯 Starting comprehensive W-CAMPUS authentication testing\n');
  
  const results = {};
  
  // Test each user type
  for (const [userType, userData] of Object.entries(testUsers)) {
    const result = await testRegistrationAndLogin(userType, userData);
    results[userType] = result;
    
    if (result && result.token) {
      await testProtectedEndpoints(result.token, userType);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  for (const [userType, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${userType.toUpperCase()}: ${status}`);
  }
  
  console.log('\n🏁 Authentication testing complete!');
}

// Run the tests
runAllTests().catch(console.error);
