const fs = require('fs');

// 9월 7일 버전 파일 읽기
const sept7Content = fs.readFileSync('sept7_version.tsx', 'utf-8');

// 메인 페이지 HTML 부분 찾기 (마지막 return c.html 부분)
const htmlStartMarker = 'return c.html(`';
const htmlEndMarker = '`)\n})';

// 마지막 HTML 반환 부분 찾기
const lastHtmlStart = sept7Content.lastIndexOf(htmlStartMarker);
if (lastHtmlStart === -1) {
    console.error('메인 페이지 HTML을 찾을 수 없습니다');
    process.exit(1);
}

const htmlContentStart = lastHtmlStart + htmlStartMarker.length;
const htmlEndIndex = sept7Content.indexOf(htmlEndMarker, htmlContentStart);
if (htmlEndIndex === -1) {
    console.error('HTML 끝을 찾을 수 없습니다');
    process.exit(1);
}

// HTML 내용 추출
const htmlContent = sept7Content.substring(htmlContentStart, htmlEndIndex);

// HTML 파일로 저장
fs.writeFileSync('sept7_main_page.html', htmlContent, 'utf-8');

console.log('✅ 9월 7일 버전 메인 페이지 HTML이 추출되었습니다!');
console.log('📄 파일 크기:', htmlContent.length, '문자');
console.log('📁 저장된 파일: sept7_main_page.html');

// 간단한 내용 미리보기
console.log('\n📝 HTML 내용 미리보기:');
console.log(htmlContent.substring(0, 200) + '...');
