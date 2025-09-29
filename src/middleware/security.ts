// 🛡️ 보안 미들웨어
// 보안 헤더, Rate limiting, CORS 등을 담당합니다

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { Bindings, RateLimitInfo } from '../types';
import { getClientIP } from '../utils/auth';

// Rate limiting을 위한 메모리 저장소 (프로덕션에서는 Redis 권장)
const requestCounts = new Map<string, RateLimitInfo>();

/**
 * 보안 헤더 설정 미들웨어
 */
export const securityHeaders = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const environment = c.env?.ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  
  // 기본 보안 헤더
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 프로덕션 환경에서 더 엄격한 CSP
  const cspDirectives = [
    "default-src 'self'",
    // 개발 환경에서는 inline scripts 허용, 프로덕션에서는 nonce 기반
    isProduction 
      ? "script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
    "font-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProduction ? "upgrade-insecure-requests" : "",
    isProduction 
      ? "connect-src 'self' https://w-campus.jayseo36.workers.dev https://w-campus.com https://www.w-campus.com https://cloudflareinsights.com"
      : "connect-src 'self' https://w-campus.jayseo36.workers.dev https://w-campus.com https://www.w-campus.com https://cloudflareinsights.com ws: wss:"
  ].filter(directive => directive !== ""); // 빈 문자열 제거
  
  c.header('Content-Security-Policy', cspDirectives.join('; '));
  
  // Strict Transport Security (HTTPS 강제)
  if (isProduction) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // 확장된 Permissions Policy (호환되는 기능만)
  c.header('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'autoplay=()',
    'encrypted-media=()'
  ].join(', '));
  
  // 추가 보안 헤더 (개발 환경에서 완화)
  c.header('X-Permitted-Cross-Domain-Policies', 'none');
  // 개발 환경에서는 COEP/COOP 헤더 비활성화 (Vite 호환성)
  if (isProduction) {
    c.header('Cross-Origin-Embedder-Policy', 'require-corp');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
  } else {
    // 개발 환경에서는 더 관대한 설정
    c.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  }
  
  // Cross-Origin-Resource-Policy도 개발 환경에서 완화
  if (isProduction) {
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
  } else {
    c.header('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  
  // 서버 정보 숨기기
  c.header('Server', 'Cloudflare-Workers');
  c.header('X-Powered-By', ''); // 빈 값으로 설정하여 숨김
  
  await next();
});

/**
 * 프로덕션 Rate Limiting 미들웨어 (적응형)
 */
export const rateLimiter = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const clientIP = getClientIP(c.req.raw);
  const environment = c.env?.ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  const now = Date.now();
  
  // 환경별 다른 제한 설정
  const windowMs = 15 * 60 * 1000; // 15분
  const maxRequests = isProduction ? 200 : 500; // 프로덕션: 15분당 200요청, 개발: 500요청
  
  const key = `rate_limit_${clientIP}`;
  const current = requestCounts.get(key);
  
  // 메모리 정리 (오래된 엔트리 제거)
  if (requestCounts.size > 10000) {
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
  }
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
  } else {
    current.count++;
    if (current.count > maxRequests) {
      // Rate limit 초과 시 상세 로깅
      const userAgent = c.req.header('User-Agent') || 'Unknown';
      const method = c.req.method;
      const path = c.req.path;
      
      console.warn(`🚫 Rate limit exceeded:`, {
        ip: clientIP,
        userAgent,
        method,
        path,
        count: current.count,
        limit: maxRequests,
        environment
      });
      
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
      c.header('Retry-After', Math.ceil((current.resetTime - now) / 1000).toString());
      
      return c.json({ 
        error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        message: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
        limit: maxRequests,
        window: '15 minutes'
      }, 429);
    }
  }
  
  // Rate limit 정보를 헤더에 포함
  const remaining = Math.max(0, maxRequests - (current?.count || 0));
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', current ? Math.ceil(current.resetTime / 1000).toString() : '0');
  c.header('X-RateLimit-Policy', `${maxRequests};w=900`); // 15분 = 900초
  
  await next();
});

/**
 * API 전용 Rate Limiting (적응형 & 엔드포인트별 차등 제한)
 */
export const apiRateLimiter = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const clientIP = getClientIP(c.req.raw);
  const environment = c.env?.ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  const now = Date.now();
  const path = c.req.path;
  
  // 엔드포인트별 차등 제한 설정
  const getLimits = (endpoint: string) => {
    const baseLimits = {
      // 인증 관련 엔드포인트 (더 엄격함)
      auth: { windowMs: 15 * 60 * 1000, maxRequests: isProduction ? 10 : 30 }, // 15분당 10/30요청
      
      // 일반 API 엔드포인트
      api: { windowMs: 5 * 60 * 1000, maxRequests: isProduction ? 30 : 100 }, // 5분당 30/100요청
      
      // 읽기 전용 엔드포인트 (더 관대함)
      read: { windowMs: 1 * 60 * 1000, maxRequests: isProduction ? 60 : 200 }, // 1분당 60/200요청
      
      // 통계/헬스체크 (가장 관대함)
      health: { windowMs: 1 * 60 * 1000, maxRequests: 300 }
    };
    
    if (endpoint.includes('/auth/')) return baseLimits.auth;
    if (endpoint.includes('/health') || endpoint.includes('/stats')) return baseLimits.health;
    if (endpoint.match(/\/api\/(jobs|jobseekers)\/search/) || endpoint.match(/GET.*\/api\//)) return baseLimits.read;
    return baseLimits.api;
  };
  
  const limits = getLimits(path);
  const key = `api_rate_limit_${path.split('/')[2] || 'general'}_${clientIP}`;
  const current = requestCounts.get(key);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + limits.windowMs });
  } else {
    current.count++;
    if (current.count > limits.maxRequests) {
      // API Rate limit 초과 시 상세 로깅
      console.warn(`🚫 API Rate limit exceeded:`, {
        ip: clientIP,
        endpoint: path,
        method: c.req.method,
        count: current.count,
        limit: limits.maxRequests,
        windowMinutes: limits.windowMs / 60000,
        userAgent: c.req.header('User-Agent'),
        environment
      });
      
      c.header('X-RateLimit-Limit', limits.maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
      c.header('Retry-After', Math.ceil((current.resetTime - now) / 1000).toString());
      
      return c.json({ 
        error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        message: 'API rate limit exceeded',
        endpoint: path,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
        limit: limits.maxRequests,
        window: `${limits.windowMs / 60000} minutes`
      }, 429);
    }
  }
  
  // API Rate limit 정보를 헤더에 포함
  const remaining = Math.max(0, limits.maxRequests - (current?.count || 0));
  c.header('X-RateLimit-Limit', limits.maxRequests.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', current ? Math.ceil(current.resetTime / 1000).toString() : '0');
  c.header('X-RateLimit-Type', 'api');
  c.header('X-RateLimit-Policy', `${limits.maxRequests};w=${limits.windowMs / 1000}`);
  
  await next();
});

/**
 * 프로덕션 CORS 설정 (세밀화된 정책)
 */
export const corsMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const origin = c.req.header('Origin');
  const environment = c.env?.ENVIRONMENT || 'development';
  
  // 환경별 허용된 Origin 설정
  const allowedOrigins = environment === 'production' ? [
    'https://w-campus.com',
    'https://www.w-campus.com',
    'https://w-campus.jayseo36.workers.dev',
    'https://w-campus-com.pages.dev'
  ] : [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://w-campus.com',
    'https://www.w-campus.com',
    'https://w-campus.jayseo36.workers.dev'
  ];
  
  // Origin 검증
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
    } else if (environment === 'development' && origin.includes('localhost')) {
      // 개발 환경에서 localhost 허용
      c.header('Access-Control-Allow-Origin', origin);
    } else {
      // 허용되지 않은 Origin에 대한 로깅
      console.warn(`🚫 CORS: Blocked origin ${origin}`);
    }
  }
  
  // 보안 강화된 CORS 헤더
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
  );
  c.header('Access-Control-Expose-Headers', 
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Total-Count, X-Pagination-Pages'
  );
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '7200'); // 2시간으로 축소 (보안 강화)
  
  // Preflight 요청 최적 처리
  if (c.req.method === 'OPTIONS') {
    c.header('Content-Length', '0');
    return c.text('', 204);
  }
  
  await next();
});

/**
 * 로깅 미들웨어
 */
export const logger = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header('User-Agent');
  const clientIP = getClientIP(c.req.raw);
  
  console.log(`📨 ${method} ${url} - IP: ${clientIP}`);
  
  await next();
  
  const end = Date.now();
  const status = c.res.status;
  const duration = end - start;
  
  // 에러나 느린 요청 로깅
  if (status >= 400 || duration > 1000) {
    console.log(`⚠️ ${method} ${url} - ${status} - ${duration}ms - IP: ${clientIP}`);
    
    if (status >= 500) {
      console.error(`🚨 Server Error: ${method} ${url} - ${status} - ${duration}ms`);
    }
  }
});

/**
 * 인증 필요 미들웨어
 */
export const requireAuth = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증이 필요합니다.' }, 401);
  }
  
  // JWT 검증은 라우트에서 처리하도록 위임
  // 여기서는 헤더 형식만 확인
  await next();
});

/**
 * JSON 파싱 미들웨어 (에러 처리 포함)
 */
export const safeJsonParser = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'PATCH') {
    const contentType = c.req.header('Content-Type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        // JSON 크기 제한 (10MB)
        const maxSize = 10 * 1024 * 1024;
        const contentLength = c.req.header('Content-Length');
        
        if (contentLength && parseInt(contentLength) > maxSize) {
          return c.json({ error: '요청 데이터가 너무 큽니다.' }, 413);
        }
        
        // JSON 파싱 시도
        const body = await c.req.text();
        if (body.length > maxSize) {
          return c.json({ error: '요청 데이터가 너무 큽니다.' }, 413);
        }
        
        JSON.parse(body); // 파싱 검증만 수행
      } catch (error) {
        return c.json({ error: '유효하지 않은 JSON 형식입니다.' }, 400);
      }
    }
  }
  
  await next();
});

/**
 * 에러 처리 미들웨어
 */
/**
 * 프로덕션 레벨 에러 핸들러 (보안 강화 & 상세 로깅)
 */
export const errorHandler = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    const environment = c.env?.ENVIRONMENT || 'development';
    const isProduction = environment === 'production';
    const clientIP = getClientIP(c.req.raw);
    const timestamp = new Date().toISOString();
    const requestId = Date.now().toString(36); // 타임스탬프 기반 ID
    
    // 에러 타입별 분류
    const errorInfo = {
      type: 'unknown',
      status: 500,
      message: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR'
    };
    
    if (error instanceof Error) {
      // 일반적인 HTTP 에러들
      if (error.name === 'ValidationError') {
        errorInfo.type = 'validation';
        errorInfo.status = 400;
        errorInfo.message = '입력 데이터가 올바르지 않습니다.';
        errorInfo.code = 'VALIDATION_ERROR';
      } else if (error.name === 'UnauthorizedError' || error.message.includes('Unauthorized')) {
        errorInfo.type = 'auth';
        errorInfo.status = 401;
        errorInfo.message = '인증이 필요합니다.';
        errorInfo.code = 'UNAUTHORIZED';
      } else if (error.name === 'ForbiddenError' || error.message.includes('Forbidden')) {
        errorInfo.type = 'permission';
        errorInfo.status = 403;
        errorInfo.message = '접근 권한이 없습니다.';
        errorInfo.code = 'FORBIDDEN';
      } else if (error.name === 'NotFoundError' || error.message.includes('Not found')) {
        errorInfo.type = 'not_found';
        errorInfo.status = 404;
        errorInfo.message = '요청한 리소스를 찾을 수 없습니다.';
        errorInfo.code = 'NOT_FOUND';
      } else if (error.message.includes('rate limit') || error.message.includes('Too many')) {
        errorInfo.type = 'rate_limit';
        errorInfo.status = 429;
        errorInfo.message = '너무 많은 요청이 발생했습니다.';
        errorInfo.code = 'RATE_LIMITED';
      } else if (error.message.includes('timeout')) {
        errorInfo.type = 'timeout';
        errorInfo.status = 408;
        errorInfo.message = '요청 시간이 초과되었습니다.';
        errorInfo.code = 'TIMEOUT';
      }
    }
    
    // 상세 에러 로깅 (보안 정보 제외)
    const logData = {
      requestId,
      timestamp,
      environment,
      error: {
        type: errorInfo.type,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: !isProduction && error instanceof Error ? error.stack : undefined
      },
      request: {
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header('User-Agent'),
        referer: c.req.header('Referer'),
        ip: clientIP,
        query: Object.fromEntries(c.req.queries() || [])
      },
      response: {
        status: errorInfo.status,
        code: errorInfo.code
      }
    };
    
    // 에러 레벨에 따른 로깅
    if (errorInfo.status >= 500) {
      console.error('🚨 Critical Error:', logData);
    } else if (errorInfo.status >= 400) {
      console.warn('⚠️ Client Error:', logData);
    } else {
      console.info('ℹ️ Info:', logData);
    }
    
    // 보안 헤더 설정
    c.header('X-Request-ID', requestId);
    c.header('X-Error-Type', errorInfo.type);
    
    // 클라이언트 응답 (환경별 정보량 조절)
    const responseBody = {
      success: false,
      error: errorInfo.message,
      code: errorInfo.code,
      requestId: requestId,
      timestamp: timestamp,
      
      // 개발환경에서만 상세 정보 제공
      ...(!isProduction && {
        details: {
          type: errorInfo.type,
          originalMessage: error instanceof Error ? error.message : String(error),
          path: c.req.path,
          method: c.req.method
        }
      }),
      
      // 특정 에러에 대한 추가 정보
      ...(errorInfo.status === 429 && {
        retryAfter: 60 // 재시도 권장 시간
      }),
      
      ...(errorInfo.status === 401 && {
        loginUrl: '/static/login.html'
      })
    };
    
    return c.json(responseBody, errorInfo.status);
  }
});

/**
 * 헬스체크 응답 캐싱 미들웨어
 */
export const healthCheckCache = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  if (c.req.path === '/health' || c.req.path === '/api/health') {
    c.header('Cache-Control', 'public, max-age=60'); // 1분 캐시
  }
  
  await next();
});

/**
 * 개발환경 전용 미들웨어
 */
export const developmentOnly = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const environment = c.env?.ENVIRONMENT || 'production';
  
  if (environment !== 'development') {
    return c.json({ error: '개발환경에서만 접근 가능합니다.' }, 403);
  }
  
  await next();
});

/**
 * IP 화이트리스트 미들웨어 (관리자 전용 엔드포인트)
 */
export const ipWhitelist = (allowedIPs: string[]) => 
  createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const environment = c.env?.ENVIRONMENT || 'development';
    
    // 개발환경에서는 모든 IP 허용
    if (environment === 'development') {
      await next();
      return;
    }
    
    // 프로덕션에서 IP 확인
    if (!allowedIPs.includes(clientIP)) {
      console.warn(`🚫 IP whitelist violation: ${clientIP} attempted to access ${c.req.path}`);
      return c.json({ 
        error: '접근이 거부되었습니다.',
        message: 'IP not whitelisted'
      }, 403);
    }
    
    await next();
  });

/**
 * 의심스러운 요청 감지 미들웨어
 */
export const suspiciousRequestDetector = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const userAgent = c.req.header('User-Agent') || '';
  const path = c.req.path;
  const clientIP = getClientIP(c.req.raw);
  
  // 의심스러운 패턴 검사
  const suspiciousPatterns = [
    /\.\.(\/|\\)/,  // Directory traversal
    /<script/i,     // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i,      // Command injection
    /%00/,          // Null byte
    /0x[0-9a-f]+/i  // Hex encoding
  ];
  
  const suspiciousBots = ['sqlmap', 'nmap', 'nikto', 'burpsuite'];
  const suspiciousPaths = ['/admin', '/wp-admin', '/.env', '/.git'];
  
  let suspiciousScore = 0;
  const issues: string[] = [];
  
  // 패턴 검사
  const fullUrl = c.req.url;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(path)) {
      suspiciousScore += 3;
      issues.push(`Pattern: ${pattern.source}`);
    }
  }
  
  // User-Agent 검사
  for (const bot of suspiciousBots) {
    if (userAgent.toLowerCase().includes(bot)) {
      suspiciousScore += 2;
      issues.push(`Bot: ${bot}`);
    }
  }
  
  // 경로 검사
  for (const suspiciousPath of suspiciousPaths) {
    if (path.includes(suspiciousPath)) {
      suspiciousScore += 1;
      issues.push(`Path: ${suspiciousPath}`);
    }
  }
  
  // 높은 의심도 요청 차단
  if (suspiciousScore >= 3) {
    console.warn(`🚫 Blocked suspicious request:`, {
      ip: clientIP, path, userAgent, score: suspiciousScore, issues
    });
    
    return c.json({
      error: '요청이 차단되었습니다.',
      message: 'Request blocked by security policy'
    }, 403);
  }
  
  // 중간 의심도는 로깅만
  if (suspiciousScore > 0) {
    console.log(`⚠️ Suspicious request:`, { ip: clientIP, path, score: suspiciousScore });
  }
  
  await next();
});

/**
 * 요청 크기 제한 미들웨어
 */
export const requestSizeLimit = (maxSizeBytes: number = 10 * 1024 * 1024) => // 기본 10MB
  createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const contentLength = c.req.header('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      console.warn(`🚫 Request too large: ${contentLength} bytes`);
      return c.json({
        error: '요청 크기가 너무 큽니다.',
        maxSize: `${Math.round(maxSizeBytes / 1024 / 1024)}MB`
      }, 413);
    }
    
    await next();
  });

/**
 * 미들웨어 정리 함수 (메모리 정리)
 */
export function cleanupMiddleware(): void {
  const now = Date.now();
  
  // 만료된 rate limit 엔트리 정리
  Array.from(requestCounts.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  });
  
  console.log(`🧹 Cleaned up ${requestCounts.size} active rate limit entries`);
}

// 주기적으로 메모리 정리 (5분마다) - Cloudflare Workers에서는 비활성화
// Cloudflare Workers는 요청 기반이므로 setInterval 사용 불가
// if (typeof setInterval !== 'undefined') {
//   setInterval(cleanupMiddleware, 5 * 60 * 1000);
// }

export default {
  securityHeaders,
  rateLimiter,
  apiRateLimiter,
  corsMiddleware,
  logger,
  requireAuth,
  safeJsonParser,
  errorHandler,
  healthCheckCache,
  developmentOnly,
  cleanupMiddleware,
  ipWhitelist,
  suspiciousRequestDetector,
  requestSizeLimit
};