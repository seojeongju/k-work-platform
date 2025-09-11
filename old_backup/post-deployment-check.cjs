// Post-deployment verification script
const https = require('https');
const http = require('http');

const SITE_URL = 'https://w-campus.pages.dev';

console.log('🔍 Post-Deployment Verification Starting...\n');
console.log(`🌐 Testing: ${SITE_URL}\n`);

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function runTests() {
    try {
        console.log('📥 Fetching homepage...');
        const content = await fetchPage(SITE_URL);
        
        console.log('✅ DEPLOYMENT VERIFICATION RESULTS:');
        console.log('==================================\n');
        
        // Test 1: Job registration removal
        const jobRegMatches = content.match(/구인정보\s*등록/g) || [];
        console.log(`📝 Job registration elements found: ${jobRegMatches.length}`);
        if (jobRegMatches.length === 0) {
            console.log('   ✅ Job registration successfully removed');
        } else {
            console.log('   ⚠️  Job registration still present:');
            jobRegMatches.forEach((match, i) => console.log(`      ${i+1}. "${match}"`));
        }
        
        // Test 2: Auth control script removal
        const authControlMatches = content.match(/초강력.*인증.*제어|main-page-auth-destroyed/g) || [];
        console.log(`\n🔧 Problematic auth scripts found: ${authControlMatches.length}`);
        if (authControlMatches.length === 0) {
            console.log('   ✅ Auth control scripts successfully removed');
        } else {
            console.log('   ⚠️  Auth control scripts still present');
        }
        
        // Test 3: Login/Register preservation
        const loginMatches = content.match(/로그인|회원가입/g) || [];
        console.log(`\n🔑 Login/Register elements found: ${loginMatches.length}`);
        if (loginMatches.length > 0) {
            console.log('   ✅ Login/Register functionality preserved');
        } else {
            console.log('   ❌ Login/Register functionality missing');
        }
        
        // Test 4: Basic structure
        const hasNavigation = content.includes('nav') || content.includes('메뉴');
        const hasButtons = content.includes('button') || content.includes('btn');
        
        console.log(`\n🏗️  Page structure:`);
        console.log(`   Navigation: ${hasNavigation ? '✅' : '❌'}`);
        console.log(`   Buttons: ${hasButtons ? '✅' : '❌'}`);
        
        // Summary
        console.log('\n🎯 DEPLOYMENT SUMMARY:');
        console.log('======================');
        
        const allTestsPassed = (
            jobRegMatches.length === 0 &&
            authControlMatches.length === 0 &&
            loginMatches.length > 0 &&
            hasNavigation &&
            hasButtons
        );
        
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! Deployment successful.');
            console.log('   ✅ Job registration removed');
            console.log('   ✅ Auth buttons restored');
            console.log('   ✅ Site structure intact');
        } else {
            console.log('⚠️  Some tests failed. Please check the results above.');
        }
        
        console.log(`\n📊 Page size: ${(content.length / 1024).toFixed(1)} KB`);
        console.log(`🔗 Site URL: ${SITE_URL}`);
        
    } catch (error) {
        console.error('❌ Error during verification:', error.message);
        console.log('\n💡 Possible causes:');
        console.log('   - Deployment still in progress');
        console.log('   - Site not accessible');
        console.log('   - Network connectivity issue');
        console.log('\n🔄 Try running this script again in a few minutes.');
    }
}

runTests();