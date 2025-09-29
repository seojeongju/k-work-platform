// 🏷️ WOW-CAMPUS 타입 정의
// 모든 TypeScript 타입과 인터페이스를 정의합니다

// Import Cloudflare types
import type { D1Database } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export type UserType = 'admin' | 'agent' | 'employer' | 'jobseeker' | 'student' | 'instructor';

// 사용자 관련 타입
export interface User {
  id: number;
  email: string;
  name: string;
  userType: UserType;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  userType: UserType;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userType: UserType;
  name?: string;
  firstName?: string;
  lastName?: string;
  // 구직자 전용 필드
  nationality?: string;
  visaType?: string;
  // 기업 전용 필드
  companyName?: string;
  businessNumber?: string;
  industry?: string;
  contactPerson?: string;
  address?: string;
  region?: string;
  website?: string;
  phone?: string;
  // 에이전트 전용 필드
  agencyName?: string;
  licenseNumber?: string;
  country?: string;
}

// 구직자 관련 타입
export interface JobSeeker {
  id: number;
  email: string;
  name: string;
  birth_date?: string;
  gender?: string;
  nationality: string;
  phone?: string;
  current_address?: string;
  korean_level: string;
  education_level: string;
  work_experience?: string;
  current_visa: string;
  desired_visa: string;
  status: string;
  created_at: string;
  updated_at: string;
  visa_status?: string;
}

// 구인 정보 관련 타입
export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  visa_type: string;
  salary?: string;
  description?: string;
  requirements?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'closed';
}

// 기업 관련 타입
export interface Employer {
  id: number;
  email: string;
  company_name: string;
  business_number?: string;
  industry: string;
  contact_person: string;
  phone: string;
  address: string;
  region: string;
  website?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// 에이전트 관련 타입
export interface Agent {
  id: number;
  email: string;
  company_name: string;
  country: string;
  contact_person: string;
  phone?: string;
  address?: string;
  license_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// 관리자 관련 타입
export interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// 통계 관련 타입
export interface Statistics {
  activeJobs: number;
  totalJobSeekers: number;
  successfulMatches: number;
  activeAgents: number;
  totalEmployers?: number;
  pendingApplications?: number;
}

// 라우트 컨텍스트 타입
export interface RouteContext {
  Bindings: Bindings;
}

// 인증된 사용자 컨텍스트
export interface AuthenticatedContext extends RouteContext {
  user: User;
}

// Rate limiting 관련 타입
export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// 환경 설정 타입
export interface Config {
  JWT_SECRET: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  COOKIE_SECURE: boolean;
  ENVIRONMENT: 'development' | 'production' | 'testing';
}

// 데이터베이스 생성 함수 파라미터 타입
export interface CreateUserParams {
  email: string;
  password: string;
  [key: string]: any;
}

// 검증 결과 타입
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// JWT 페이로드 타입
export interface JWTPayload {
  userId: string;
  email: string;
  userType: UserType;
  iat?: number;
  exp?: number;
  [key: string]: any;  // Add index signature for Hono JWT compatibility
}

// All types are exported above with their definitions