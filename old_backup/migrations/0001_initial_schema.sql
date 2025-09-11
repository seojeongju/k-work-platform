-- 사용자 유형별 테이블
-- 외국인 에이전트 테이블
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  company_name TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 구인 기업 테이블
CREATE TABLE IF NOT EXISTS employers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  company_name TEXT NOT NULL,
  business_number TEXT UNIQUE NOT NULL,
  industry TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  region TEXT NOT NULL,
  website TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 구직자 테이블
CREATE TABLE IF NOT EXISTS job_seekers (
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'matched')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 구인 공고 테이블
CREATE TABLE IF NOT EXISTS job_postings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  job_category TEXT NOT NULL,
  required_visa TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  work_location TEXT NOT NULL,
  region TEXT NOT NULL,
  work_hours TEXT,
  benefits TEXT,
  requirements TEXT,
  description TEXT,
  korean_level_required TEXT CHECK (korean_level_required IN ('none', 'basic', 'intermediate', 'advanced')),
  experience_required TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES employers(id)
);

-- 유학 과정 테이블
CREATE TABLE IF NOT EXISTS study_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('language', 'undergraduate', 'graduate', 'doctoral')),
  program_name TEXT NOT NULL,
  duration TEXT,
  tuition_fee INTEGER,
  location TEXT NOT NULL,
  requirements TEXT,
  description TEXT,
  start_dates TEXT,
  application_deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 유학 지원자 테이블
CREATE TABLE IF NOT EXISTS study_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_seeker_id INTEGER NOT NULL,
  program_id INTEGER NOT NULL,
  agent_id INTEGER,
  application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'submitted', 'accepted', 'rejected')),
  documents_submitted TEXT,
  notes TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id),
  FOREIGN KEY (program_id) REFERENCES study_programs(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 구직 지원 테이블
CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_seeker_id INTEGER NOT NULL,
  job_posting_id INTEGER NOT NULL,
  agent_id INTEGER,
  application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'submitted', 'interview', 'accepted', 'rejected')),
  resume_url TEXT,
  cover_letter TEXT,
  notes TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id),
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 비자 정보 테이블
CREATE TABLE IF NOT EXISTS visa_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visa_code TEXT UNIQUE NOT NULL,
  visa_name TEXT NOT NULL,
  description TEXT,
  work_allowed BOOLEAN DEFAULT false,
  study_allowed BOOLEAN DEFAULT false,
  duration TEXT,
  requirements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 직종 분류 테이블
CREATE TABLE IF NOT EXISTS job_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_code TEXT UNIQUE NOT NULL,
  category_name_ko TEXT NOT NULL,
  category_name_en TEXT NOT NULL,
  parent_category_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_category_id) REFERENCES job_categories(id)
);

-- 지역 정보 테이블
CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_code TEXT UNIQUE NOT NULL,
  region_name_ko TEXT NOT NULL,
  region_name_en TEXT NOT NULL,
  parent_region_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_region_id) REFERENCES regions(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_job_seekers_agent_id ON job_seekers(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_seekers_nationality ON job_seekers(nationality);
CREATE INDEX IF NOT EXISTS idx_job_seekers_desired_visa ON job_seekers(desired_visa);

CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_job_category ON job_postings(job_category);
CREATE INDEX IF NOT EXISTS idx_job_postings_required_visa ON job_postings(required_visa);
CREATE INDEX IF NOT EXISTS idx_job_postings_region ON job_postings(region);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_seeker_id ON job_applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_agent_id ON job_applications(agent_id);

CREATE INDEX IF NOT EXISTS idx_study_applications_job_seeker_id ON study_applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_study_applications_program_id ON study_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_study_applications_agent_id ON study_applications(agent_id);

CREATE INDEX IF NOT EXISTS idx_employers_region ON employers(region);
CREATE INDEX IF NOT EXISTS idx_study_programs_program_type ON study_programs(program_type);