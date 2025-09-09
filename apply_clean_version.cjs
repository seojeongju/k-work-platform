const fs = require('fs');
const path = require('path');

// 깔끔한 버전 HTML 읽기
const cleanVersionPath = path.join(__dirname, 'clean_version.html');
const cleanContent = fs.readFileSync(cleanVersionPath, 'utf-8');

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

// 깔끔한 HTML 내용을 JavaScript 문자열로 변환 (이스케이핑)
const escapedContent = cleanContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');

// 새로운 라우트 코드 생성
const newRouteCode = `// 메인 페이지 라우트 - 스크린샷 버전으로 깔끔하게 복원
app.get('/', async (c) => {
  // 스크린샷에 표시된 깔끔한 디자인으로 복원
  // 상단 네비게이션, 히어로 섹션, 우리의 서비스, 이용 절차, 푸터 포함
  const indexContent = \`${escapedContent}\`;
  
  return c.html(indexContent)
})`;

// 기존 라우트를 새로운 내용으로 교체
const beforeRoute = srcContent.substring(0, startIndex);
const afterRoute = srcContent.substring(endIndex + endMarker.length);

const newSrcContent = beforeRoute + newRouteCode + afterRoute;

// 파일 저장
fs.writeFileSync(srcIndexPath, newSrcContent, 'utf-8');

console.log('✅ 깔끔한 버전이 성공적으로 적용되었습니다!');
console.log('📄 깔끔한 버전 파일 크기:', cleanContent.length, '문자');
console.log('🔧 src/index.tsx 파일이 업데이트되었습니다.');
