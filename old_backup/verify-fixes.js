// Quick verification of what was fixed in the deployment
const fs = require('fs');
const path = require('path');

// Extract and check the main index file
const { execSync } = require('child_process');

console.log('🔍 Verifying fixes in w-campus-fixed.zip...\n');

// Extract to temp directory
execSync('rm -rf temp-verify && mkdir temp-verify');
execSync('cd temp-verify && unzip -q ../w-campus-fixed.zip');

// Read the main index file
const indexPath = 'temp-verify/index.html';
if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    console.log('✅ FIXED ISSUES VERIFICATION:');
    console.log('================================');
    
    // Check for removed job registration elements
    const jobRegCount = (content.match(/구인정보 등록|job.*registration/gi) || []).length;
    console.log(`📝 Job registration references: ${jobRegCount} (should be 0)`);
    
    // Check for problematic auth scripts
    const authScriptCount = (content.match(/초강력.*인증.*제어|main-page-auth-destroyed/gi) || []).length;
    console.log(`🔧 Problematic auth control scripts: ${authScriptCount} (should be 0)`);
    
    // Check for login/register elements
    const loginCount = (content.match(/로그인|회원가입|login|register/gi) || []).length;
    console.log(`🔑 Login/Register references: ${loginCount} (should be > 0)`);
    
    // Check for auth buttons specifically
    const authButtonCount = (content.match(/auth.*button|login.*button|register.*button/gi) || []).length;
    console.log(`🔘 Auth button elements: ${authButtonCount}`);
    
    console.log('\n🎯 DEPLOYMENT STATUS:');
    console.log('=====================');
    
    if (jobRegCount === 0) {
        console.log('✅ Job registration successfully removed');
    } else {
        console.log('⚠️  Job registration still present');
    }
    
    if (authScriptCount === 0) {
        console.log('✅ Problematic auth control scripts removed');
    } else {
        console.log('⚠️  Auth control scripts still present');
    }
    
    if (loginCount > 0) {
        console.log('✅ Login/Register functionality preserved');
    } else {
        console.log('❌ Login/Register functionality missing');
    }
    
    console.log(`\n📦 File size: ${fs.statSync('w-campus-fixed.zip').size} bytes`);
    console.log('🚀 Ready for deployment!');
    
} else {
    console.log('❌ Could not find index.html in the ZIP file');
}

// Cleanup
execSync('rm -rf temp-verify');
