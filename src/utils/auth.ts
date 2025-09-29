// 🔐 인증 관련 유틸리티 함수들
// 비밀번호 해싱, JWT 토큰 처리, 인증 검증 등을 담당합니다

import { sign, verify } from 'hono/jwt';
import type { JWTPayload, UserType } from '../types';

/**
 * PBKDF2를 사용한 강력한 비밀번호 해싱
 * @param password 평문 비밀번호
 * @returns 해시된 비밀번호 (솔트 포함)
 */
export async function hashPassword(password: string): Promise<string> {
  // 솔트 생성
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // PBKDF2를 사용한 강력한 해시
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 10만번 반복
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 솔트와 해시를 결합하여 저장
  return `$pbkdf2$${saltHex}$${hashHex}`;
}

/**
 * 비밀번호 검증 함수
 * @param password 평문 비밀번호
 * @param hashedPassword 해시된 비밀번호
 * @returns 검증 결과
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    if (!hashedPassword.startsWith('$pbkdf2$')) {
      // 기존 평문 비밀번호 호환성 (보안 경고: 프로덕션에서는 제거 필요)
      console.warn('⚠️ Plain text password detected - should be migrated to PBKDF2');
      return password === hashedPassword;
    }
    
    const parts = hashedPassword.split('$');
    if (parts.length !== 4) return false;
    
    const saltHex = parts[2];
    const storedHashHex = parts[3];
    
    // 솔트를 바이트 배열로 변환
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === storedHashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * 기존 SHA-256 해시 함수 (호환성을 위해 유지)
 * @deprecated PBKDF2 사용 권장
 */
export async function legacyHash(password: string): Promise<string> {
  console.warn('⚠️ Using legacy SHA-256 hash - migrate to PBKDF2');
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * JWT 토큰 생성
 * @param payload JWT 페이로드
 * @param secret JWT 시크릿
 * @param expiresIn 만료 시간 (초)
 * @returns JWT 토큰
 */
export async function createJWTToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 86400 // 24시간
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = {
    userId: payload.userId,
    email: payload.email,
    userType: payload.userType,
    iat: now,
    exp: now + expiresIn
  };
  
  return await sign(jwtPayload, secret);
}

/**
 * JWT 토큰 검증
 * @param token JWT 토큰
 * @param secret JWT 시크릿
 * @returns 검증된 페이로드 또는 null
 */
export async function verifyJWTToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, secret) as JWTPayload;
    
    // 만료 시간 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('Token expired');
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * 사용자 유형별 권한 확인
 * @param userType 사용자 유형
 * @param requiredPermissions 필요한 권한들
 * @returns 권한 보유 여부
 */
export function hasPermission(userType: UserType, requiredPermissions: string[]): boolean {
  const permissions: Record<UserType, string[]> = {
    admin: ['read', 'write', 'delete', 'manage_users', 'view_stats', 'system_config'],
    agent: ['read', 'write', 'manage_jobseekers', 'view_stats'],
    employer: ['read', 'write', 'post_jobs', 'view_jobseekers'],
    instructor: ['read', 'write', 'manage_students', 'create_courses'],
    jobseeker: ['read', 'update_profile', 'apply_jobs'],
    student: ['read', 'update_profile', 'enroll_courses']
  };
  
  const userPermissions = permissions[userType] || [];
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * 토큰에서 사용자 정보 추출
 * @param authHeader Authorization 헤더
 * @param secret JWT 시크릿
 * @returns 사용자 정보 또는 null
 */
export async function extractUserFromToken(
  authHeader: string | undefined,
  secret: string
): Promise<JWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return await verifyJWTToken(token, secret);
}

/**
 * 비밀번호 강도 검증
 * @param password 비밀번호
 * @returns 검증 결과
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  
  if (password.length > 100) {
    errors.push('비밀번호는 100자를 초과할 수 없습니다.');
  }
  
  if (!/(?=.*[A-Za-z])/.test(password)) {
    errors.push('영문자를 포함해야 합니다.');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  }
  
  // 선택사항: 특수문자 요구사항
  // if (!/(?=.*[@$!%*?&])/.test(password)) {
  //   errors.push('특수문자를 포함해야 합니다.');
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Rate limiting을 위한 클라이언트 IP 추출
 * @param request 요청 객체
 * @returns 클라이언트 IP
 */
export function getClientIP(request: Request): string {
  // Cloudflare의 경우 CF-Connecting-IP 헤더 사용
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  
  // 일반적인 프록시 헤더들
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) return realIP;
  
  // 기본값
  return 'unknown';
}

export default {
  hashPassword,
  verifyPassword,
  legacyHash,
  createJWTToken,
  verifyJWTToken,
  hasPermission,
  extractUserFromToken,
  validatePasswordStrength,
  getClientIP
};