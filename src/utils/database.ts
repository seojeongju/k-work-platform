// 🗄️ 데이터베이스 관련 유틸리티 함수들
// 사용자 생성, 조회, 업데이트 등 데이터베이스 조작을 담당합니다

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  User, JobSeeker, Employer, Agent, Admin, 
  CreateUserParams, Statistics 
} from '../types';

/**
 * 이메일 중복 검사 함수 (강화된 버전)
 */
export async function checkEmailExists(
  db: D1Database, 
  email: string, 
  userType?: string
): Promise<boolean> {
  const tables = ['admins', 'agents', 'employers', 'job_seekers'];
  
  try {
    for (const table of tables) {
      const result = await db.prepare(`SELECT id FROM ${table} WHERE email = ?`)
        .bind(email)
        .first();
      if (result) {
        console.log(`⚠️ Email ${email} already exists in ${table}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Email check error:', error);
    return false;
  }
}

/**
 * 강화된 관리자 생성 함수
 */
export async function createAdmin(db: D1Database, data: CreateUserParams): Promise<number | null> {
  try {
    const { email, password, name = 'Administrator', role = 'admin' } = data;
    
    const result = await db.prepare(`
      INSERT INTO admins (email, password, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(email, password, name, role).run();
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null;
  } catch (error) {
    console.error('❌ Admin creation error:', error);
    return null;
  }
}

/**
 * 강화된 에이전트 생성 함수
 */
export async function createAgent(db: D1Database, data: CreateUserParams): Promise<number | null> {
  try {
    const { 
      email, password, company_name, country, 
      contact_person, phone, address, license_number 
    } = data;
    
    // 필수 필드 검증
    if (!company_name) {
      throw new Error('회사명이 필요합니다.');
    }
    if (!country) {
      throw new Error('국가 정보가 필요합니다.');
    }
    if (!contact_person) {
      throw new Error('담당자명이 필요합니다.');
    }
    
    console.log(`🏢 Creating agent: ${company_name} (${country})`);
    
    const result = await db.prepare(`
      INSERT INTO agents (
        email, password, company_name, country, contact_person, 
        phone, address, license_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email, password, company_name, country, contact_person,
      phone || null, address || null, license_number || null
    ).run();
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null;
  } catch (error) {
    console.error('❌ Agent creation error:', error.message);
    throw error;
  }
}

/**
 * 강화된 기업 생성 함수
 */
export async function createEmployer(db: D1Database, data: CreateUserParams): Promise<number | null> {
  try {
    const { 
      email, password, company_name, business_number, industry,
      contact_person, phone, address, region, website 
    } = data;
    
    // 필수 필드 검증 (사업자등록번호는 선택사항으로 변경)
    if (!company_name) {
      throw new Error('회사명이 필요합니다.');
    }
    if (!industry) {
      throw new Error('업종 정보가 필요합니다.');
    }
    if (!contact_person) {
      throw new Error('담당자명이 필요합니다.');
    }
    if (!phone) {
      throw new Error('연락처가 필요합니다.');
    }
    if (!address) {
      throw new Error('주소가 필요합니다.');
    }
    if (!region) {
      throw new Error('지역 정보가 필요합니다.');
    }
    
    console.log(`🏭 Creating employer: ${company_name} (${business_number || '사업자번호 미제공'})`);
    
    const result = await db.prepare(`
      INSERT INTO employers (
        email, password, company_name, business_number, industry, 
        contact_person, phone, address, region, website, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      email, password, company_name, business_number || null, industry,
      contact_person, phone, address, region, website || null
    ).run();
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null;
  } catch (error) {
    console.error('❌ Employer creation error:', error.message);
    throw error;
  }
}

/**
 * 강화된 구직자 생성 함수 (학생, 강사 포함)
 */
export async function createJobSeeker(db: D1Database, data: CreateUserParams): Promise<number | null> {
  try {
    const { 
      email, password, name, birth_date, gender, nationality = 'Unknown',
      phone, current_address, korean_level = 'beginner', education_level = 'unknown',
      current_visa = 'none', desired_visa = 'none'
    } = data;
    
    const result = await db.prepare(`
      INSERT INTO job_seekers (
        email, password, name, birth_date, gender, nationality, 
        phone, current_address, korean_level, education_level, work_experience,
        current_visa, desired_visa, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(
      email, password, name || 'User', birth_date || null, gender || null, nationality,
      phone || null, current_address || null, korean_level, education_level || 'unknown', 
      data.work_experience || null, current_visa, desired_visa
    ).run();
    
    return result.meta?.last_row_id ? Number(result.meta.last_row_id) : null;
  } catch (error) {
    console.error('❌ JobSeeker creation error:', error);
    return null;
  }
}

/**
 * 사용자 인증 (로그인)
 */
export async function authenticateUser(
  db: D1Database, 
  email: string, 
  userType: string
): Promise<User | null> {
  try {
    let tableName: string;
    let query: string;
    
    switch (userType) {
      case 'admin':
        tableName = 'admins';
        query = `SELECT id, email, password, name, role as userType, status, created_at, updated_at FROM ${tableName} WHERE email = ?`;
        break;
      case 'agent':
        tableName = 'agents';
        query = `SELECT id, email, password, company_name as name, 'agent' as userType, status, created_at, updated_at FROM ${tableName} WHERE email = ?`;
        break;
      case 'employer':
        tableName = 'employers';
        query = `SELECT id, email, password, company_name as name, 'employer' as userType, status, created_at, updated_at FROM ${tableName} WHERE email = ?`;
        break;
      case 'jobseeker':
      case 'student':
        tableName = 'job_seekers';
        query = `SELECT id, email, password, name, 'jobseeker' as userType, status, created_at, updated_at FROM ${tableName} WHERE email = ?`;
        break;
      case 'instructor':
        // 강사는 별도 테이블이 있다면 처리, 없으면 job_seekers 테이블 활용
        tableName = 'job_seekers';
        query = `SELECT id, email, password, name, 'instructor' as userType, status, created_at, updated_at FROM ${tableName} WHERE email = ?`;
        break;
      default:
        console.error('❌ Unknown user type:', userType);
        return null;
    }
    
    const result = await db.prepare(query).bind(email).first() as any;
    
    if (!result) {
      console.log(`❌ User not found in ${tableName} table`);
      return null;
    }
    
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      userType: result.userType,
      status: result.status,
      created_at: result.created_at,
      updated_at: result.updated_at,
      password: result.password // 비밀번호 검증을 위해 포함 (응답에서는 제외해야 함)
    } as User & { password: string };
    
  } catch (error) {
    console.error('❌ User authentication error:', error);
    return null;
  }
}

/**
 * 플랫폼 통계 조회
 */
export async function getPlatformStatistics(db: D1Database): Promise<Statistics> {
  try {
    // 병렬로 모든 통계 조회
    const [jobsResult, jobSeekersResult, employersResult, agentsResult] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM job_postings WHERE status = "active"').first(),
      db.prepare('SELECT COUNT(*) as count FROM job_seekers WHERE status = "active"').first(),
      db.prepare('SELECT COUNT(*) as count FROM employers WHERE status = "active"').first(),
      db.prepare('SELECT COUNT(*) as count FROM agents WHERE status = "active"').first()
    ]);
    
    // 성공 매칭 수 (예시 - 실제 매칭 테이블이 있다면 해당 테이블 조회)
    const matchesResult = await db.prepare(`
      SELECT COUNT(*) as count FROM job_applications 
      WHERE status = "accepted" OR status = "hired"
    `).first().catch(() => ({ count: 0 }));
    
    return {
      activeJobs: (jobsResult as any)?.count || 0,
      totalJobSeekers: (jobSeekersResult as any)?.count || 0,
      totalEmployers: (employersResult as any)?.count || 0,
      activeAgents: (agentsResult as any)?.count || 0,
      successfulMatches: (matchesResult as any)?.count || 0
    };
  } catch (error) {
    console.error('❌ Statistics query error:', error);
    // 기본값 반환
    return {
      activeJobs: 0,
      totalJobSeekers: 0,
      successfulMatches: 0,
      activeAgents: 0,
      totalEmployers: 0
    };
  }
}

/**
 * 구인정보 조회 (페이지네이션 포함)
 */
export async function getJobs(
  db: D1Database, 
  page: number = 1, 
  limit: number = 10
): Promise<{ jobs: any[], total: number }> {
  try {
    const offset = (page - 1) * limit;
    
    // 전체 카운트 조회
    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM job_postings WHERE status = 'active'
    `).first() as any;
    
    // 페이지네이션된 결과 조회
    const jobs = await db.prepare(`
      SELECT 
        id, title, company, location, salary, visa_type, description, requirements,
        created_at, updated_at, status
      FROM job_postings 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return {
      jobs: jobs.results || [],
      total: countResult?.total || 0
    };
  } catch (error) {
    console.error('❌ Jobs query error:', error);
    return { jobs: [], total: 0 };
  }
}

/**
 * 구직자 정보 조회 (페이지네이션 포함)
 */
export async function getJobSeekers(
  db: D1Database, 
  page: number = 1, 
  limit: number = 10
): Promise<{ jobseekers: JobSeeker[], total: number }> {
  try {
    const offset = (page - 1) * limit;
    
    // 전체 카운트 조회
    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM job_seekers WHERE status = 'active'
    `).first() as any;
    
    // 페이지네이션된 결과 조회
    const jobseekers = await db.prepare(`
      SELECT 
        id, name, nationality, korean_level, education_level, 
        current_visa, desired_visa, created_at, updated_at,
        CASE 
          WHEN current_visa = 'none' THEN '비자 미정'
          ELSE current_visa 
        END as visa_status
      FROM job_seekers 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return {
      jobseekers: jobseekers.results as unknown as JobSeeker[] || [],
      total: countResult?.total || 0
    };
  } catch (error) {
    console.error('❌ JobSeekers query error:', error);
    return { jobseekers: [], total: 0 };
  }
}

/**
 * 사용자 ID로 사용자 정보 조회
 */
export async function getUserById(
  db: D1Database, 
  userId: string, 
  userType: string
): Promise<User | null> {
  try {
    let tableName: string;
    let nameField: string;
    
    switch (userType) {
      case 'admin':
        tableName = 'admins';
        nameField = 'name';
        break;
      case 'agent':
        tableName = 'agents';
        nameField = 'company_name';
        break;
      case 'employer':
        tableName = 'employers';
        nameField = 'company_name';
        break;
      case 'jobseeker':
      case 'student':
      case 'instructor':
        tableName = 'job_seekers';
        nameField = 'name';
        break;
      default:
        return null;
    }
    
    const result = await db.prepare(`
      SELECT id, email, ${nameField} as name, status, created_at, updated_at
      FROM ${tableName} WHERE id = ?
    `).bind(userId).first() as any;
    
    if (!result) return null;
    
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      userType: userType as any,
      status: result.status,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    console.error('❌ Get user by ID error:', error);
    return null;
  }
}

export default {
  checkEmailExists,
  createAdmin,
  createAgent,
  createEmployer,
  createJobSeeker,
  authenticateUser,
  getPlatformStatistics,
  getJobs,
  getJobSeekers,
  getUserById
};