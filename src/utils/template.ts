// 🎨 템플릿 렌더링 유틸리티
// HTML 템플릿을 로드하고 동적 데이터를 삽입합니다

import type { Context } from 'hono';
import type { Bindings } from '../types';

/**
 * 템플릿 변수 타입 정의
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * 페이지 레이아웃 옵션
 */
export interface PageLayoutOptions {
  title: string;
  bodyClass?: string;
  customCSS?: string;
  customJS?: string;
}

/**
 * 템플릿 파일을 읽어오는 함수
 * 프로덕션에서는 번들된 템플릿을 사용하고, 개발에서는 파일에서 읽어옵니다
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  try {
    // Cloudflare Workers 환경에서는 fetch로 템플릿을 가져옵니다
    const response = await fetch(`/src/templates/${templatePath}`);
    if (!response.ok) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to load template: ${templatePath}`, error);
    // 폴백 템플릿 반환
    return getFallbackTemplate(templatePath);
  }
}

/**
 * 템플릿에서 변수를 치환하는 함수
 */
export function renderTemplate(template: string, variables: TemplateVariables = {}): string {
  let rendered = template;
  
  // {{variable}} 형태의 변수를 실제 값으로 치환
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value ?? ''));
  }
  
  // 남아있는 빈 변수들 제거 (기본값 처리)
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
  
  return rendered;
}

/**
 * 기본 레이아웃과 페이지 내용을 결합하는 함수
 */
export async function renderPageWithLayout(
  pageTemplate: string, 
  layoutOptions: PageLayoutOptions,
  variables: TemplateVariables = {}
): Promise<string> {
  try {
    // 기본 레이아웃 로드
    const baseLayout = await loadTemplate('layouts/base.html');
    
    // 페이지 콘텐츠 로드
    const pageContent = await loadTemplate(`pages/${pageTemplate}`);
    
    // 페이지 콘텐츠에 변수 적용
    const renderedPageContent = renderTemplate(pageContent, variables);
    
    // 레이아웃 변수 준비
    const layoutVariables: TemplateVariables = {
      title: layoutOptions.title,
      bodyClass: layoutOptions.bodyClass || 'bg-gradient-to-br from-blue-50 to-white min-h-screen',
      customCSS: layoutOptions.customCSS || '',
      customJS: layoutOptions.customJS || '',
      content: renderedPageContent,
      ...variables // 추가 변수들
    };
    
    // 최종 HTML 렌더링
    return renderTemplate(baseLayout, layoutVariables);
  } catch (error) {
    console.error('Failed to render page with layout:', error);
    return getErrorPageTemplate(layoutOptions.title, String(error));
  }
}

/**
 * 간단한 페이지 렌더링 (레이아웃 없이)
 */
export async function renderSimplePage(
  pageTemplate: string,
  variables: TemplateVariables = {}
): Promise<string> {
  try {
    const template = await loadTemplate(`pages/${pageTemplate}`);
    return renderTemplate(template, variables);
  } catch (error) {
    console.error('Failed to render simple page:', error);
    return getErrorPageTemplate('Error', String(error));
  }
}

/**
 * 폴백 템플릿 반환 (템플릿 로드 실패 시)
 */
function getFallbackTemplate(templatePath: string): string {
  const templates: { [key: string]: string } = {
    'pages/login.html': `
      <div class="text-center p-8">
        <h1 class="text-2xl font-bold mb-4">로그인</h1>
        <p class="mb-4">템플릿을 로드하는 중 오류가 발생했습니다.</p>
        <a href="/" class="text-blue-600 hover:underline">메인 페이지로 돌아가기</a>
      </div>
    `,
    'pages/register.html': `
      <div class="text-center p-8">
        <h1 class="text-2xl font-bold mb-4">회원가입</h1>
        <p class="mb-4">템플릿을 로드하는 중 오류가 발생했습니다.</p>
        <a href="/" class="text-blue-600 hover:underline">메인 페이지로 돌아가기</a>
      </div>
    `,
    'pages/health.html': `
      <div class="text-center p-8">
        <h1 class="text-2xl font-bold text-green-600 mb-4">✅ 시스템 정상</h1>
        <p>서버가 정상적으로 작동 중입니다.</p>
      </div>
    `,
    'pages/404.html': `
      <div class="text-center p-8">
        <h1 class="text-4xl font-bold text-red-600 mb-4">404</h1>
        <p class="mb-4">페이지를 찾을 수 없습니다.</p>
        <a href="/" class="text-blue-600 hover:underline">메인 페이지로 돌아가기</a>
      </div>
    `
  };
  
  return templates[templatePath] || `
    <div class="text-center p-8">
      <h1 class="text-2xl font-bold text-red-600 mb-4">템플릿 오류</h1>
      <p class="mb-4">요청한 템플릿을 찾을 수 없습니다: ${templatePath}</p>
      <a href="/" class="text-blue-600 hover:underline">메인 페이지로 돌아가기</a>
    </div>
  `;
}

/**
 * 에러 페이지 템플릿 생성
 */
function getErrorPageTemplate(title: string, error: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - WOW-CAMPUS</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="text-center p-8 bg-white rounded-lg shadow-lg">
            <h1 class="text-2xl font-bold text-red-600 mb-4">오류 발생</h1>
            <p class="text-gray-600 mb-4">${error}</p>
            <a href="/" class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                메인 페이지로 돌아가기
            </a>
        </div>
    </body>
    </html>
  `;
}

/**
 * 컨텍스트 정보에서 공통 변수 추출
 */
export function getCommonTemplateVariables(c: Context<{ Bindings: Bindings }>): TemplateVariables {
  return {
    timestamp: new Date().toISOString(),
    currentPath: c.req.path,
    userAgent: c.req.header('user-agent') || 'Unknown',
    activeUsers: Math.floor(Math.random() * 1000), // 실제로는 DB에서 가져와야 함
  };
}

/**
 * Hono Context를 위한 템플릿 렌더링 헬퍼
 */
export class TemplateRenderer {
  constructor(private context: Context<{ Bindings: Bindings }>) {}
  
  async renderPage(
    pageTemplate: string, 
    layoutOptions: PageLayoutOptions,
    variables: TemplateVariables = {}
  ) {
    const commonVars = getCommonTemplateVariables(this.context);
    const allVariables = { ...commonVars, ...variables };
    
    const html = await renderPageWithLayout(pageTemplate, layoutOptions, allVariables);
    return this.context.html(html);
  }
  
  async renderSimple(pageTemplate: string, variables: TemplateVariables = {}) {
    const commonVars = getCommonTemplateVariables(this.context);
    const allVariables = { ...commonVars, ...variables };
    
    const html = await renderSimplePage(pageTemplate, allVariables);
    return this.context.html(html);
  }
}