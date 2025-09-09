const fs = require('fs');
const path = require('path');

// 원본 index.html 읽기
const originalIndexPath = path.join(__dirname, 'dist/index.html');
const originalContent = fs.readFileSync(originalIndexPath, 'utf-8');

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

// 원본 HTML 내용을 JavaScript 문자열로 변환 (이스케이핑)
const escapedContent = originalContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');

// 새로운 라우트 코드 생성
const newRouteCode = `// 메인 페이지 라우트 - 완전한 원본 버전 복원
app.get('/', async (c) => {
  // 원본 dist/index.html의 전체 내용을 반환
  // 유학 프로그램, 우수 프로그램, 통계 대시보드 등 모든 원본 콘텐츠 포함
  const indexContent = \`${escapedContent}\`;
  
  return c.html(indexContent)
})`;

// 기존 라우트를 새로운 내용으로 교체
const beforeRoute = srcContent.substring(0, startIndex);
const afterRoute = srcContent.substring(endIndex + endMarker.length);

const newSrcContent = beforeRoute + newRouteCode + afterRoute;

// 파일 저장
fs.writeFileSync(srcIndexPath, newSrcContent, 'utf-8');

console.log('✅ 원본 index.html 내용이 성공적으로 복원되었습니다!');
console.log('📄 원본 파일 크기:', originalContent.length, '문자');
console.log('🔧 src/index.tsx 파일이 업데이트되었습니다.');