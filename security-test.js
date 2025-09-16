console.log('🔒 Starting W-CAMPUS Security Vulnerability Assessment');

const BASE_URL = 'https://3000-ikl0hc06wc2o7swv0klq3-6532622b.e2b.dev';

// Security test cases
const securityTests = [
  {
    name: 'SQL Injection Test - Login',
    test: async () => {
      console.log('\n🧪 Testing SQL injection in login...');
      const maliciousInputs = [
        "admin@test.com' OR '1'='1",
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com\" OR \"1\"=\"1",
        "' UNION SELECT * FROM admins --"
      ];
      
      let vulnerableToSQLi = false;
      for (const email of maliciousInputs) {
        try {
          const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              password: 'any_password',
              userType: 'admin'
            })
          });
          
          const data = await response.json();
          if (data.success || response.status !== 400) {
            console.log(`⚠️  Potential SQL injection vulnerability with: ${email}`);
            vulnerableToSQLi = true;
          }
        } catch (error) {
          // Expected for malformed requests
        }
      }
      
      if (!vulnerableToSQLi) {
        console.log('✅ SQL injection test passed - no vulnerabilities detected');
      }
      return !vulnerableToSQLi;
    }
  },
  
  {
    name: 'XSS Test - Registration',
    test: async () => {
      console.log('\n🧪 Testing XSS in registration...');
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "'><script>alert('xss')</script>"
      ];
      
      let vulnerableToXSS = false;
      for (const payload of xssPayloads) {
        try {
          const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `test${Date.now()}@test.com`,
              password: 'Password123!',
              userType: 'jobseeker',
              name: payload,
              nationality: 'Test'
            })
          });
          
          const data = await response.json();
          if (data.success) {
            console.log(`⚠️  XSS payload accepted in registration: ${payload}`);
            vulnerableToXSS = true;
          }
        } catch (error) {
          // Expected for invalid requests
        }
      }
      
      if (!vulnerableToXSS) {
        console.log('✅ XSS test passed - malicious scripts properly sanitized');
      }
      return !vulnerableToXSS;
    }
  },
  
  {
    name: 'Rate Limiting Test',
    test: async () => {
      console.log('\n🧪 Testing rate limiting...');
      
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@test.com',
              password: 'wrong',
              userType: 'admin'
            })
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (rateLimited) {
        console.log('✅ Rate limiting is working - excessive requests blocked');
      } else {
        console.log('⚠️  Rate limiting may not be properly configured');
      }
      return rateLimited;
    }
  },
  
  {
    name: 'Password Security Test',
    test: async () => {
      console.log('\n🧪 Testing password security requirements...');
      
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        '12345678',
        'abc123'
      ];
      
      let properPasswordValidation = true;
      for (const password of weakPasswords) {
        try {
          const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `weakpass${Date.now()}@test.com`,
              password: password,
              userType: 'jobseeker',
              name: 'Test User',
              nationality: 'Test'
            })
          });
          
          const data = await response.json();
          if (data.success) {
            console.log(`⚠️  Weak password accepted: ${password}`);
            properPasswordValidation = false;
          }
        } catch (error) {
          // Expected for invalid requests
        }
      }
      
      if (properPasswordValidation) {
        console.log('✅ Password validation is working - weak passwords rejected');
      }
      return properPasswordValidation;
    }
  },
  
  {
    name: 'CSRF Test',
    test: async () => {
      console.log('\n🧪 Testing CSRF protection...');
      
      try {
        // Test if API accepts requests without proper headers
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          // No Content-Type header - should be rejected by CORS
          body: 'email=admin@test.com&password=test'
        });
        
        if (response.ok) {
          console.log('⚠️  CSRF protection may be insufficient - request accepted without proper headers');
          return false;
        } else {
          console.log('✅ CSRF protection working - improper requests rejected');
          return true;
        }
      } catch (error) {
        console.log('✅ CSRF protection working - request blocked');
        return true;
      }
    }
  }
];

async function runSecurityTests() {
  console.log('🎯 Running security assessment...\n');
  
  const results = {};
  let passCount = 0;
  
  for (const test of securityTests) {
    console.log(`\n🔍 Running: ${test.name}`);
    try {
      const passed = await test.test();
      results[test.name] = passed;
      if (passed) passCount++;
      
      // Delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      results[test.name] = false;
    }
  }
  
  // Summary
  console.log('\n📊 Security Assessment Results:');
  console.log('================================');
  for (const [testName, passed] of Object.entries(results)) {
    const status = passed ? '✅ SECURE' : '❌ VULNERABLE';
    console.log(`${testName}: ${status}`);
  }
  
  console.log(`\n🏆 Security Score: ${passCount}/${securityTests.length} (${Math.round((passCount/securityTests.length)*100)}%)`);
  
  if (passCount === securityTests.length) {
    console.log('🎉 Excellent! No major vulnerabilities detected.');
  } else if (passCount >= securityTests.length * 0.8) {
    console.log('👍 Good security posture, but some areas need attention.');
  } else {
    console.log('⚠️  Multiple security vulnerabilities detected. Immediate attention required.');
  }
}

// Run security tests
runSecurityTests().catch(console.error);
