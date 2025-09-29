// 🛡️ 보안 미들웨어
// 보안 헤더, Rate limiting, CORS 등을 담당합니다

import { createMiddleware } from 'hono/factory';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { Bindings, RateLimitInfo } from '../types';
import { getClientIP } from '../utils/auth';

// Rate limiting을 위한 메모리 저장소 (프로덕션에서는 Redis 권장)
const requestCounts = new Map<string, RateLimitInfo>();

/**
 * 보안 헤더 설정 미들웨어
 */
export const securityHeaders = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  // 보안 헤더 설정
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  c.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://w-campus.com https://www.w-campus.com https://cloudflareinsights.com"
  );
  
  // Strict Transport Security (HTTPS 강제)
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Permissions Policy (기능 제한)
  c.header('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  
  await next();
});

/**
 * Rate Limiting 미들웨어
 */
export const rateLimiter = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const clientIP = getClientIP(c.req.raw);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15분
  const maxRequests = 100; // 15분당 100요청
  
  const key = `rate_limit_${clientIP}`;
  const current = requestCounts.get(key);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
  } else {
    current.count++;
    if (current.count > maxRequests) {
      // Rate limit 초과 시 로깅
      console.log(`🚫 Rate limit exceeded for IP: ${clientIP}`);
      
      return c.json({ 
        error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }, 429);
    }
  }
  
  // Rate limit 정보를 헤더에 포함
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - (current?.count || 0)).toString());
  c.header('X-RateLimit-Reset', current ? Math.ceil(current.resetTime / 1000).toString() : '0');
  
  await next();
});

/**
 * API 전용 Rate Limiting (더 엄격한 제한)
 */
export const apiRateLimiter = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const clientIP = getClientIP(c.req.raw);
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5분
  const maxRequests = 20; // 5분당 20요청
  
  const key = `api_rate_limit_${clientIP}`;
  const current = requestCounts.get(key);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
  } else {
    current.count++;
    if (current.count > maxRequests) {
      console.log(`🚫 API Rate limit exceeded for IP: ${clientIP}`);
      
      return c.json({ 
        error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }, 429);
    }
  }
  
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - (current?.count || 0)).toString());
  c.header('X-RateLimit-Reset', current ? Math.ceil(current.resetTime / 1000).toString() : '0');
  
  await next();
});

/**
 * CORS 설정
 */
export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://w-campus.com',
    'https://www.w-campus.com',
    'https://w-campus-com.pages.dev',
    'https://job-platform.pages.dev'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400 // 24시간
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
export const errorHandler = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('🚨 Unhandled error:', error);
    
    // 개발환경에서만 상세 에러 정보 제공
    const isDevelopment = c.env?.ENVIRONMENT === 'development';
    
    return c.json({
      error: '서버 내부 오류가 발생했습니다.',
      ...(isDevelopment && { 
        details: error instanceof Error ? error.message : String(error) 
      })
    }, 500);
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

// 주기적으로 메모리 정리 (5분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMiddleware, 5 * 60 * 1000);
}

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
  cleanupMiddleware
};