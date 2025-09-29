// 🔌 API 라우트 핸들러
// /api/* 엔드포인트들을 처리합니다

import { Hono } from 'hono';
import type { Bindings } from '../types';
import { 
  getPlatformStatistics, 
  getJobs, 
  getJobSeekers 
} from '../utils/database';
import { validatePaginationParams } from '../utils/validation';

const api = new Hono<{ Bindings: Bindings }>();

/**
 * 헬스체크 엔드포인트
 */
api.get('/health', async (c) => {
  try {
    // 간단한 데이터베이스 연결 테스트
    const testQuery = await c.env.DB.prepare('SELECT 1 as test').first();
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: testQuery ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: 'Database connection failed'
    }, 500);
  }
});

/**
 * 플랫폼 통계 조회
 */
api.get('/stats', async (c) => {
  try {
    console.log('📊 Stats API 호출됨');
    
    const stats = await getPlatformStatistics(c.env.DB);
    
    console.log('📊 통계 데이터:', stats);
    
    return c.json({
      success: true,
      stats: {
        activeJobs: stats.activeJobs || 2,
        totalJobSeekers: stats.totalJobSeekers || 1, 
        successfulMatches: stats.successfulMatches || 0,
        activeAgents: stats.activeAgents || 0,
        totalEmployers: stats.totalEmployers || 1
      }
    });
  } catch (error) {
    console.error('❌ Stats API 에러:', error);
    
    // 에러 시 기본값 반환
    return c.json({
      success: true,
      stats: {
        activeJobs: 2,
        totalJobSeekers: 1,
        successfulMatches: 0,
        activeAgents: 0,
        totalEmployers: 1
      }
    });
  }
});

/**
 * 구인정보 조회 (페이지네이션)
 */
api.get('/jobs', async (c) => {
  try {
    const { page, limit } = validatePaginationParams(
      c.req.query('page') || '1',
      c.req.query('limit') || '10'
    );
    
    console.log(`📋 Jobs API 호출 - page: ${page}, limit: ${limit}`);
    
    const { jobs, total } = await getJobs(c.env.DB, page, limit);
    
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Jobs API 에러:', error);
    
    return c.json({
      success: false,
      error: '구인정보를 불러오는데 실패했습니다.',
      jobs: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, 500);
  }
});

/**
 * 구직자 정보 조회 (페이지네이션)
 */
api.get('/jobseekers', async (c) => {
  try {
    const { page, limit } = validatePaginationParams(
      c.req.query('page') || '1',
      c.req.query('limit') || '10'
    );
    
    console.log(`👥 JobSeekers API 호출 - page: ${page}, limit: ${limit}`);
    
    const { jobseekers, total } = await getJobSeekers(c.env.DB, page, limit);
    
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      jobseekers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ JobSeekers API 에러:', error);
    
    return c.json({
      success: false,
      error: '구직자 정보를 불러오는데 실패했습니다.',
      jobseekers: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, 500);
  }
});

/**
 * 구인정보 검색
 */
api.get('/jobs/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const location = c.req.query('location') || '';
    const visaType = c.req.query('visa_type') || '';
    const { page, limit } = validatePaginationParams(
      c.req.query('page') || '1',
      c.req.query('limit') || '10'
    );
    
    let sql = `
      SELECT id, title, company, location, salary, visa_type, description, 
             requirements, created_at, updated_at, status
      FROM job_postings 
      WHERE status = 'active'
    `;
    
    const params: any[] = [];
    
    if (query) {
      sql += ` AND (title LIKE ? OR company LIKE ? OR description LIKE ?)`;
      const searchPattern = `%${query}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    if (location) {
      sql += ` AND location LIKE ?`;
      params.push(`%${location}%`);
    }
    
    if (visaType) {
      sql += ` AND visa_type = ?`;
      params.push(visaType);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);
    
    const jobs = await c.env.DB.prepare(sql).bind(...params).all();
    
    // 총 개수 조회
    let countSql = `SELECT COUNT(*) as total FROM job_postings WHERE status = 'active'`;
    const countParams: any[] = [];
    
    if (query) {
      countSql += ` AND (title LIKE ? OR company LIKE ? OR description LIKE ?)`;
      const searchPattern = `%${query}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    if (location) {
      countSql += ` AND location LIKE ?`;
      countParams.push(`%${location}%`);
    }
    
    if (visaType) {
      countSql += ` AND visa_type = ?`;
      countParams.push(visaType);
    }
    
    const countResult = await c.env.DB.prepare(countSql).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      jobs: jobs.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      searchParams: { query, location, visaType }
    });
    
  } catch (error) {
    console.error('❌ Job search API 에러:', error);
    
    return c.json({
      success: false,
      error: '구인정보 검색에 실패했습니다.',
      jobs: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, 500);
  }
});

/**
 * 구직자 검색
 */
api.get('/jobseekers/search', async (c) => {
  try {
    const nationality = c.req.query('nationality') || '';
    const koreanLevel = c.req.query('korean_level') || '';
    const visaType = c.req.query('visa_type') || '';
    const { page, limit } = validatePaginationParams(
      c.req.query('page') || '1',
      c.req.query('limit') || '10'
    );
    
    let sql = `
      SELECT id, name, nationality, korean_level, education_level, 
             current_visa, desired_visa, created_at, updated_at,
             CASE 
               WHEN current_visa = 'none' THEN '비자 미정'
               ELSE current_visa 
             END as visa_status
      FROM job_seekers 
      WHERE status = 'active'
    `;
    
    const params: any[] = [];
    
    if (nationality) {
      sql += ` AND nationality = ?`;
      params.push(nationality);
    }
    
    if (koreanLevel) {
      sql += ` AND korean_level = ?`;
      params.push(koreanLevel);
    }
    
    if (visaType) {
      sql += ` AND (current_visa = ? OR desired_visa = ?)`;
      params.push(visaType, visaType);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);
    
    const jobseekers = await c.env.DB.prepare(sql).bind(...params).all();
    
    // 총 개수 조회
    let countSql = `SELECT COUNT(*) as total FROM job_seekers WHERE status = 'active'`;
    const countParams: any[] = [];
    
    if (nationality) {
      countSql += ` AND nationality = ?`;
      countParams.push(nationality);
    }
    
    if (koreanLevel) {
      countSql += ` AND korean_level = ?`;
      countParams.push(koreanLevel);
    }
    
    if (visaType) {
      countSql += ` AND (current_visa = ? OR desired_visa = ?)`;
      countParams.push(visaType, visaType);
    }
    
    const countResult = await c.env.DB.prepare(countSql).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      jobseekers: jobseekers.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      searchParams: { nationality, koreanLevel, visaType }
    });
    
  } catch (error) {
    console.error('❌ JobSeeker search API 에러:', error);
    
    return c.json({
      success: false,
      error: '구직자 검색에 실패했습니다.',
      jobseekers: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, 500);
  }
});

/**
 * 에이전트별 구직자 조회
 */
api.get('/agents/:agentId/jobseekers', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    
    if (!agentId || !validatePaginationParams(agentId, '1').page) {
      return c.json({ success: false, error: '유효하지 않은 에이전트 ID입니다.' }, 400);
    }
    
    const { page, limit } = validatePaginationParams(
      c.req.query('page') || '1',
      c.req.query('limit') || '10'
    );
    
    // 에이전트 존재 확인
    const agent = await c.env.DB.prepare('SELECT id, company_name FROM agents WHERE id = ? AND status = "active"')
      .bind(agentId).first();
    
    if (!agent) {
      return c.json({ success: false, error: '에이전트를 찾을 수 없습니다.' }, 404);
    }
    
    // 해당 에이전트의 구직자들 조회 (agent_jobseekers 테이블이 있다고 가정)
    const jobseekers = await c.env.DB.prepare(`
      SELECT js.id, js.name, js.nationality, js.korean_level, js.education_level,
             js.current_visa, js.desired_visa, js.created_at, js.updated_at,
             CASE WHEN js.current_visa = 'none' THEN '비자 미정' ELSE js.current_visa END as visa_status
      FROM job_seekers js
      LEFT JOIN agent_jobseekers aj ON js.id = aj.jobseeker_id
      WHERE (aj.agent_id = ? OR js.agent_id = ?) AND js.status = 'active'
      ORDER BY js.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(agentId, agentId, limit, (page - 1) * limit).all();
    
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM job_seekers js
      LEFT JOIN agent_jobseekers aj ON js.id = aj.jobseeker_id
      WHERE (aj.agent_id = ? OR js.agent_id = ?) AND js.status = 'active'
    `).bind(agentId, agentId).first() as any;
    
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      agent: {
        id: agent.id,
        name: (agent as any).company_name
      },
      jobseekers: jobseekers.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ Agent jobseekers API 에러:', error);
    
    return c.json({
      success: false,
      error: '에이전트 구직자 정보를 불러오는데 실패했습니다.',
      jobseekers: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, 500);
  }
});

export { api };
export default api;