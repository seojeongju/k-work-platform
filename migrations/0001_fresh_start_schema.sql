-- ================================
-- WOW-CAMPUS K-Work Platform
-- 완전 새로운 DB 스키마 (2025-09-11)
-- ================================

-- 관리자 테이블
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
  business_number TEXT UNIQUE,
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
  resume_url TEXT,
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

-- 매칭 테이블 (구인-구직 매칭)
CREATE TABLE IF NOT EXISTS job_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_seeker_id INTEGER NOT NULL,
  job_posting_id INTEGER NOT NULL,
  agent_id INTEGER,
  match_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'interview', 'hired', 'rejected')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

-- ================================
-- 인덱스 생성 (성능 최적화)
-- ================================

-- 사용자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_employers_email ON employers(email);
CREATE INDEX IF NOT EXISTS idx_employers_status ON employers(status);
CREATE INDEX IF NOT EXISTS idx_employers_region ON employers(region);

-- 구직자 인덱스
CREATE INDEX IF NOT EXISTS idx_job_seekers_email ON job_seekers(email);
CREATE INDEX IF NOT EXISTS idx_job_seekers_agent_id ON job_seekers(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_seekers_nationality ON job_seekers(nationality);
CREATE INDEX IF NOT EXISTS idx_job_seekers_desired_visa ON job_seekers(desired_visa);
CREATE INDEX IF NOT EXISTS idx_job_seekers_status ON job_seekers(status);

-- 구인공고 인덱스
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_job_category ON job_postings(job_category);
CREATE INDEX IF NOT EXISTS idx_job_postings_required_visa ON job_postings(required_visa);
CREATE INDEX IF NOT EXISTS idx_job_postings_region ON job_postings(region);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_deadline ON job_postings(deadline);

-- 지원/매칭 인덱스
CREATE INDEX IF NOT EXISTS idx_job_applications_job_seeker_id ON job_applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_agent_id ON job_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(application_status);

CREATE INDEX IF NOT EXISTS idx_job_matches_job_seeker_id ON job_matches(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_posting_id ON job_matches(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_agent_id ON job_matches(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_status ON job_matches(status);

-- 유학 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_study_programs_program_type ON study_programs(program_type);
CREATE INDEX IF NOT EXISTS idx_study_programs_status ON study_programs(status);
CREATE INDEX IF NOT EXISTS idx_study_applications_job_seeker_id ON study_applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_study_applications_program_id ON study_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_study_applications_agent_id ON study_applications(agent_id);

-- ================================
-- 기본 데이터 삽입
-- ================================

-- 기본 관리자 계정
INSERT OR IGNORE INTO admins (email, password, name, role) VALUES
('admin@w-campus.com', 'admin123!', 'System Administrator', 'super_admin');

-- 기본 비자 유형
INSERT OR IGNORE INTO visa_types (visa_code, visa_name, description, work_allowed, study_allowed, duration) VALUES
('D-4', '일반연수(D-4)', '대학(원)에서 정규과정의 교육을 받거나 특정 연구기관에서 연수·연구·기술습득 활동', false, true, '2년'),
('E-7', '특정활동(E-7)', '전문지식·기술 또는 기능을 가지고 취업활동을 하는 사람', true, false, '3년'),
('F-2', '거주(F-2)', '국민의 배우자, 영주권자 등 거주자격', true, true, '3년'),
('F-4', '재외동포(F-4)', '외국국적동포 거주자격', true, true, '3년'),
('H-2', '방문취업(H-2)', '중국·구소련 지역 동포의 방문취업', true, false, '3년');

-- 기본 직종 분류
INSERT OR IGNORE INTO job_categories (category_code, category_name_ko, category_name_en) VALUES
('IT', '정보기술', 'Information Technology'),
('MFG', '제조업', 'Manufacturing'),
('SVC', '서비스업', 'Service Industry'),
('EDU', '교육', 'Education'),
('HSP', '의료/보건', 'Healthcare'),
('CST', '건설', 'Construction'),
('AGR', '농업', 'Agriculture'),
('TRD', '무역/유통', 'Trade/Distribution');

-- 기본 지역 정보
INSERT OR IGNORE INTO regions (region_code, region_name_ko, region_name_en) VALUES
('SEL', '서울특별시', 'Seoul'),
('PUS', '부산광역시', 'Busan'), 
('DGU', '대구광역시', 'Daegu'),
('ICN', '인천광역시', 'Incheon'),
('GWJ', '광주광역시', 'Gwangju'),
('DJN', '대전광역시', 'Daejeon'),
('USN', '울산광역시', 'Ulsan'),
('GGD', '경기도', 'Gyeonggi-do'),
('GWD', '강원도', 'Gangwon-do'),
('CBD', '충청북도', 'Chungcheongbuk-do'),
('CND', '충청남도', 'Chungcheongnam-do'),
('JBD', '전라북도', 'Jeollabuk-do'),
('JND', '전라남도', 'Jeollanam-do'),
('GBD', '경상북도', 'Gyeongsangbuk-do'),
('GND', '경상남도', 'Gyeongsangnam-do'),
('JJD', '제주특별자치도', 'Jeju-do');