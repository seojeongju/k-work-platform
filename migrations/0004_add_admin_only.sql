-- 관리자 테이블만 추가
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- job_matches 테이블 (매칭 결과용)
CREATE TABLE IF NOT EXISTS job_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_seeker_id INTEGER NOT NULL,
  job_posting_id INTEGER NOT NULL,
  match_score REAL NOT NULL DEFAULT 0.0,
  match_type TEXT CHECK (match_type IN ('perfect', 'good', 'fair')) DEFAULT 'fair',
  match_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'applied', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id),
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id)
);

-- job_applications 테이블에 status 컬럼 이름 통일을 위한 뷰
CREATE VIEW IF NOT EXISTS job_applications_view AS
SELECT 
  id,
  job_seeker_id,
  job_posting_id,
  agent_id,
  application_status as status,
  resume_url,
  cover_letter,
  notes,
  applied_at as created_at,
  updated_at
FROM job_applications;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_job_matches_job_seeker_id ON job_matches(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_posting_id ON job_matches(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_match_score ON job_matches(match_score);