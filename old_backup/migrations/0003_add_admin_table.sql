-- 관리자 테이블 추가
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

-- 테이블 구조 확인 후 필요한 컬럼만 추가
-- 기존 컬럼이 있는 경우 에러를 무시하기 위해 개별 실행

-- job_applications 테이블의 컬럼명 수정을 위한 새로운 테이블 생성
-- (SQLite에서는 직접 컬럼명 변경이 제한적이므로)
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

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL CHECK (user_type IN ('agent', 'employer', 'jobseeker', 'admin')),
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 메시지 시스템 테이블
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'employer', 'jobseeker', 'admin')),
  sender_id INTEGER NOT NULL,
  receiver_type TEXT NOT NULL CHECK (receiver_type IN ('agent', 'employer', 'jobseeker', 'admin')),
  receiver_id INTEGER NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'job_inquiry', 'application', 'system')),
  job_posting_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id)
);

-- 새로운 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_job_matches_job_seeker_id ON job_matches(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_posting_id ON job_matches(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_match_score ON job_matches(match_score);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_type, receiver_id);