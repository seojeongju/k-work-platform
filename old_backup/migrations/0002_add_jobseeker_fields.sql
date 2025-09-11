-- 구직자 테이블에 새로운 필드들 추가

-- 희망 직종 필드 추가
ALTER TABLE job_seekers ADD COLUMN desired_job_category TEXT;

-- 희망 근무 지역 필드 추가  
ALTER TABLE job_seekers ADD COLUMN preferred_region TEXT;

-- 희망 급여 범위 필드 추가
ALTER TABLE job_seekers ADD COLUMN desired_salary_min INTEGER;
ALTER TABLE job_seekers ADD COLUMN desired_salary_max INTEGER;

-- 자기소개 필드 추가
ALTER TABLE job_seekers ADD COLUMN self_introduction TEXT;

-- 새로운 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_job_seekers_desired_job_category ON job_seekers(desired_job_category);
CREATE INDEX IF NOT EXISTS idx_job_seekers_preferred_region ON job_seekers(preferred_region);
CREATE INDEX IF NOT EXISTS idx_job_seekers_desired_salary ON job_seekers(desired_salary_min, desired_salary_max);