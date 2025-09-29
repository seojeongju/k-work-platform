// 🔐 인증 라우트 핸들러
// 로그인, 회원가입, 토큰 검증 등을 처리합니다

import { Hono } from 'hono';
import type { Bindings, LoginRequest, RegisterRequest, User } from '../types';
import { 
  hashPassword, 
  verifyPassword, 
  createJWTToken, 
  verifyJWTToken,
  extractUserFromToken
} from '../utils/auth';
import {
  checkEmailExists,
  createAdmin,
  createAgent,
  createEmployer,
  createJobSeeker,
  authenticateUser,
  getUserById
} from '../utils/database';
import {
  validateRegistrationData,
  sanitizeInput
} from '../utils/validation';

const auth = new Hono<{ Bindings: Bindings }>();

/**
 * 로그인 엔드포인트
 */
auth.post('/login', async (c) => {
  try {
    console.log('🔐 로그인 요청 받음');
    
    const requestData = await c.req.json() as LoginRequest;
    console.log('📊 로그인 데이터:', {
      email: requestData.email,
      hasPassword: !!requestData.password,
      userType: requestData.userType
    });
    
    // 입력값 검증 및 sanitization
    const email = sanitizeInput(requestData.email?.toLowerCase() || '');
    const password = requestData.password || '';
    const userType = sanitizeInput(requestData.userType || 'jobseeker');
    
    if (!email || !password || !userType) {
      return c.json({
        success: false,
        error: '이메일, 비밀번호, 사용자 유형이 모두 필요합니다.'
      }, 400);
    }
    
    console.log(`🔍 사용자 인증 시도: ${email} (${userType})`);
    
    // 사용자 조회
    const user = await authenticateUser(c.env.DB, email, userType) as (User & { password?: string }) | null;
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음');
      return c.json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      }, 401);
    }
    
    console.log('👤 사용자 발견:', { id: user.id, email: user.email, userType: user.userType });
    
    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password || '');
    
    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치');
      return c.json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      }, 401);
    }
    
    console.log('✅ 비밀번호 검증 성공');
    
    // JWT 토큰 생성
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key';
    const token = await createJWTToken({
      userId: user.id,
      email: user.email,
      userType: user.userType
    }, jwtSecret);
    
    console.log('🎫 JWT 토큰 생성 완료');
    
    // 응답에서 비밀번호 제거
    const { password: _, ...userResponse } = user;
    
    return c.json({
      success: true,
      message: '로그인 성공',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ 로그인 에러:', error);
    
    return c.json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    }, 500);
  }
});

/**
 * 회원가입 엔드포인트
 */
auth.post('/register', async (c) => {
  try {
    console.log('📝 회원가입 요청 받음');
    
    const requestData = await c.req.json() as RegisterRequest;
    console.log('📊 회원가입 데이터:', {
      email: requestData.email,
      userType: requestData.userType,
      hasPassword: !!requestData.password
    });
    
    // 입력값 검증
    const validation = validateRegistrationData(requestData);
    if (!validation.isValid) {
      console.log('❌ 유효성 검사 실패:', validation.errors);
      return c.json({
        success: false,
        error: '입력 데이터가 올바르지 않습니다.',
        details: validation.errors
      }, 400);
    }
    
    // 입력값 sanitization
    const sanitizedData = {
      ...requestData,
      email: sanitizeInput(requestData.email?.toLowerCase() || ''),
      firstName: sanitizeInput(requestData.firstName || ''),
      lastName: sanitizeInput(requestData.lastName || ''),
      companyName: sanitizeInput(requestData.companyName || ''),
      agencyName: sanitizeInput(requestData.agencyName || ''),
      contactPerson: sanitizeInput(requestData.contactPerson || ''),
      address: sanitizeInput(requestData.address || ''),
      website: sanitizeInput(requestData.website || '')
    };
    
    console.log('🔍 이메일 중복 검사:', sanitizedData.email);
    
    // 이메일 중복 검사
    const emailExists = await checkEmailExists(c.env.DB, sanitizedData.email, sanitizedData.userType);
    if (emailExists) {
      return c.json({
        success: false,
        error: '이미 등록된 이메일입니다.'
      }, 409);
    }
    
    console.log('🔒 비밀번호 해싱 중...');
    
    // 비밀번호 해싱
    const hashedPassword = await hashPassword(sanitizedData.password);
    
    console.log(`👤 ${sanitizedData.userType} 계정 생성 중...`);
    
    // 사용자 생성
    let userId: number | null = null;
    const userData = {
      ...sanitizedData,
      password: hashedPassword,
      name: sanitizedData.firstName && sanitizedData.lastName 
        ? `${sanitizedData.firstName} ${sanitizedData.lastName}`
        : (sanitizedData.companyName || sanitizedData.agencyName || 'User')
    };
    
    switch (sanitizedData.userType) {
      case 'admin':
        userId = await createAdmin(c.env.DB, userData);
        break;
      case 'agent':
        (userData as any).company_name = sanitizedData.agencyName;
        (userData as any).license_number = sanitizedData.licenseNumber;
        (userData as any).country = sanitizedData.country || 'Unknown';
        (userData as any).contact_person = sanitizedData.contactPerson;
        userId = await createAgent(c.env.DB, userData);
        break;
      case 'employer':
        (userData as any).company_name = sanitizedData.companyName;
        (userData as any).business_number = sanitizedData.businessNumber;
        (userData as any).industry = sanitizedData.industry;
        (userData as any).contact_person = sanitizedData.contactPerson;
        (userData as any).phone = sanitizedData.phone;
        (userData as any).address = sanitizedData.address;
        (userData as any).region = sanitizedData.region;
        (userData as any).website = sanitizedData.website;
        userId = await createEmployer(c.env.DB, userData);
        break;
      case 'jobseeker':
      case 'student':
      case 'instructor':
        (userData as any).nationality = sanitizedData.nationality || 'Unknown';
        (userData as any).korean_level = 'beginner';
        (userData as any).education_level = 'unknown';
        (userData as any).current_visa = sanitizedData.visaType || 'none';
        (userData as any).desired_visa = sanitizedData.visaType || 'none';
        userId = await createJobSeeker(c.env.DB, userData);
        break;
      default:
        return c.json({
          success: false,
          error: '지원하지 않는 사용자 유형입니다.'
        }, 400);
    }
    
    if (!userId) {
      console.error('❌ 사용자 생성 실패');
      return c.json({
        success: false,
        error: '계정 생성에 실패했습니다.'
      }, 500);
    }
    
    console.log('✅ 사용자 생성 성공:', userId);
    
    // 생성된 사용자 정보 조회
    const newUser = await getUserById(c.env.DB, String(userId), sanitizedData.userType);
    
    if (!newUser) {
      console.error('❌ 생성된 사용자 조회 실패');
      return c.json({
        success: false,
        error: '계정 생성은 완료되었으나 정보 조회에 실패했습니다.'
      }, 500);
    }
    
    // JWT 토큰 생성
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key';
    const token = await createJWTToken({
      userId: newUser.id,
      email: newUser.email,
      userType: newUser.userType
    }, jwtSecret);
    
    console.log('🎉 회원가입 완료');
    
    return c.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      token,
      user: newUser
    }, 201);
    
  } catch (error) {
    console.error('❌ 회원가입 에러:', error);
    
    return c.json({
      success: false,
      error: '회원가입 처리 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * 토큰 검증 엔드포인트
 */
auth.post('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key';
    
    const payload = await extractUserFromToken(authHeader, jwtSecret);
    
    if (!payload) {
      return c.json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      }, 401);
    }
    
    // 사용자 정보 조회 (토큰의 정보가 최신인지 확인)
    const user = await getUserById(c.env.DB, payload.userId, payload.userType);
    
    if (!user || user.status !== 'active') {
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없거나 비활성 상태입니다.'
      }, 401);
    }
    
    return c.json({
      success: true,
      user,
      payload
    });
    
  } catch (error) {
    console.error('❌ 토큰 검증 에러:', error);
    
    return c.json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.'
    }, 500);
  }
});

/**
 * 토큰 갱신 엔드포인트
 */
auth.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key';
    
    const payload = await extractUserFromToken(authHeader, jwtSecret);
    
    if (!payload) {
      return c.json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      }, 401);
    }
    
    // 사용자 정보 재확인
    const user = await getUserById(c.env.DB, payload.userId, payload.userType);
    
    if (!user || user.status !== 'active') {
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없거나 비활성 상태입니다.'
      }, 401);
    }
    
    // 새 토큰 발급 (24시간)
    const newToken = await createJWTToken({
      userId: user.id,
      email: user.email,
      userType: user.userType
    }, jwtSecret);
    
    return c.json({
      success: true,
      token: newToken,
      user
    });
    
  } catch (error) {
    console.error('❌ 토큰 갱신 에러:', error);
    
    return c.json({
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.'
    }, 500);
  }
});

/**
 * 로그아웃 엔드포인트 (토큰 무효화)
 */
auth.post('/logout', async (c) => {
  try {
    // 현재는 stateless JWT를 사용하므로 클라이언트에서 토큰 삭제
    // 향후 blacklist 구현 시 여기에 추가
    
    return c.json({
      success: true,
      message: '로그아웃 되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 로그아웃 에러:', error);
    
    return c.json({
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.'
    }, 500);
  }
});

/**
 * 사용자 프로필 조회
 */
auth.get('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key';
    
    const payload = await extractUserFromToken(authHeader, jwtSecret);
    
    if (!payload) {
      return c.json({
        success: false,
        error: '인증이 필요합니다.'
      }, 401);
    }
    
    const user = await getUserById(c.env.DB, payload.userId, payload.userType);
    
    if (!user) {
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      }, 404);
    }
    
    return c.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('❌ 프로필 조회 에러:', error);
    
    return c.json({
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다.'
    }, 500);
  }
});

export { auth };
export default auth;