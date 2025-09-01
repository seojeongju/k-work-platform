-- 구직자 테이블의 status 체크 제약조건을 업데이트하여 pending 상태 추가
-- 기존 체크 제약조건 제거 (SQLite에서는 직접 수정 불가능)
-- 새로운 테이블 생성 후 데이터 이전

-- 1. 새로운 구조로 임시 테이블 생성
CREATE TABLE job_seekers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  nationality TEXT NOT NULL,
  current_visa TEXT,
  desired_visa TEXT,
  phone TEXT,
  current_address TEXT,
  korean_level TEXT CHECK (korean_level IN ('beginner', 'intermediate', 'advanced', 'native')),
  education_level TEXT,
  work_experience TEXT,
  agent_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'matched', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  desired_job_category TEXT,
  preferred_region TEXT,
  desired_salary_min INTEGER,
  desired_salary_max INTEGER,
  self_introduction TEXT,
  temp_password INTEGER DEFAULT 0,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 2. 기존 데이터를 새 테이블로 복사
INSERT INTO job_seekers_new 
SELECT * FROM job_seekers;

-- 3. 기존 테이블 삭제
DROP TABLE job_seekers;

-- 4. 새 테이블 이름을 원래 이름으로 변경
ALTER TABLE job_seekers_new RENAME TO job_seekers;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_job_seekers_agent_id ON job_seekers(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_seekers_nationality ON job_seekers(nationality);
CREATE INDEX IF NOT EXISTS idx_job_seekers_desired_visa ON job_seekers(desired_visa);
CREATE INDEX IF NOT EXISTS idx_job_seekers_temp_password ON job_seekers(temp_password);