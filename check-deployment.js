#!/usr/bin/env node

/**
 * Cloudflare Pages 배포 상태 확인 스크립트
 * 배포가 성공적으로 완료되었는지 자동으로 확인합니다.
 */

const https = require('https');

const TARGET_URL = 'https://w-campus.com';
const CHECK_PHRASE = '구인정보.*등록';
const EXPECTED_COUNT = 0; // 구인정보 등록이 제거되면 0이어야 함

function checkDeployment() {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Checking deployment at ${TARGET_URL}...`);
        
        https.get(TARGET_URL, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const matches = data.match(new RegExp(CHECK_PHRASE, 'gi'));
                const count = matches ? matches.length : 0;
                
                console.log(`📊 Found ${count} occurrences of "${CHECK_PHRASE}"`);
                console.log(`🎯 Expected: ${EXPECTED_COUNT}, Actual: ${count}`);
                
                if (count === EXPECTED_COUNT) {
                    console.log('✅ Deployment successful! Job registration features removed.');
                    resolve({ success: true, count, matches });
                } else {
                    console.log('❌ Deployment not yet complete or failed.');
                    console.log('🔄 Old version still active or deployment pending.');
                    if (matches) {
                        console.log('📝 Found elements:', matches.slice(0, 3));
                    }
                    resolve({ success: false, count, matches });
                }
            });
        }).on('error', (err) => {
            console.error('🚨 Network error:', err.message);
            reject(err);
        });
    });
}

async function main() {
    try {
        const result = await checkDeployment();
        
        if (result.success) {
            console.log('\n🎉 SUCCESS: Auto-deployment working correctly!');
            process.exit(0);
        } else {
            console.log('\n⏳ PENDING: Deployment still in progress or failed.');
            console.log('💡 Try running this script again in 5-10 minutes.');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n🚨 ERROR:', error.message);
        process.exit(1);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = { checkDeployment };