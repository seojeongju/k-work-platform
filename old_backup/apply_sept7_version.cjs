const fs = require('fs');
const path = require('path');

// 9월 7일 버전 HTML 읽기
const sept7HtmlPath = path.join(__dirname, 'sept7_main_page.html');
const sept7Content = fs.readFileSync(sept7HtmlPath, 'utf-8');

// src/index.tsx 파일 읽기
const srcIndexPath = path.join(__dirname, 'src/index.tsx');
let srcContent = fs.readFileSync(srcIndexPath, 'utf-8');

// 메인 페이지 라우트 부분을 찾아서 교체
const startMarker = "// 메인 페이지 라우트";
const endMarker = "return c.html(indexContent)\n})";

const startIndex = srcContent.indexOf(startMarker);
if (startIndex === -1) {
    console.error('시작 마커를 찾을 수 없습니다');
    process.exit(1);
}

const endIndex = srcContent.indexOf(endMarker, startIndex);
if (endIndex === -1) {
    console.error('끝 마커를 찾을 수 없습니다');
    process.exit(1);
}

// 9월 7일 HTML 내용을 JavaScript 문자열로 변환 (이스케이핑)
const escapedContent = sept7Content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');

// 새로운 라우트 코드 생성
const newRouteCode = `// 메인 페이지 라우트 - 2025년 9월 7일 버전으로 복원
app.get('/', async (c) => {
  // 2025년 9월 7일 메인 페이지 단순화 버전 (fdcd260 커밋)
  // 실시간 구인정보 섹션이 제거된 깔끔한 버전
  const indexContent = \`${escapedContent}\`;
  
  return c.html(indexContent)
})`;

// 기존 라우트를 새로운 내용으로 교체
const beforeRoute = srcContent.substring(0, startIndex);
const afterRoute = srcContent.substring(endIndex + endMarker.length);

const newSrcContent = beforeRoute + newRouteCode + afterRoute;

// 파일 저장
fs.writeFileSync(srcIndexPath, newSrcContent, 'utf-8');

console.log('✅ 2025년 9월 7일 버전이 성공적으로 복원되었습니다!');
console.log('📄 9월 7일 버전 파일 크기:', sept7Content.length, '문자');
console.log('🔧 src/index.tsx 파일이 업데이트되었습니다.');
console.log('📅 복원된 버전: 메인 페이지 단순화 버전 (fdcd260 커밋)');
