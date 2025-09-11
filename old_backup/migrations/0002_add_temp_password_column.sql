-- 임시 패스워드 컬럼 추가
ALTER TABLE employers ADD COLUMN temp_password INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN temp_password INTEGER DEFAULT 0;
ALTER TABLE job_seekers ADD COLUMN temp_password INTEGER DEFAULT 0;

-- 임시 패스워드 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_employers_temp_password ON employers(temp_password);
CREATE INDEX IF NOT EXISTS idx_agents_temp_password ON agents(temp_password);
CREATE INDEX IF NOT EXISTS idx_job_seekers_temp_password ON job_seekers(temp_password);