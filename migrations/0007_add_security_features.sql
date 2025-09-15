-- ================================
-- 보안 기능 추가 마이그레이션 
-- 2FA, 비밀번호 재설정, OTP 기능
-- Date: 2025-09-15
-- ================================

-- 관리자 테이블에 2FA 컬럼 추가
ALTER TABLE admins ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE admins ADD COLUMN two_factor_phone TEXT;

-- 에이전트 테이블에 2FA 컬럼 추가  
ALTER TABLE agents ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN two_factor_phone TEXT;

-- 기업 테이블에 2FA 컬럼 추가
ALTER TABLE employers ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE employers ADD COLUMN two_factor_phone TEXT;

-- 구직자 테이블에 2FA 컬럼 추가
ALTER TABLE job_seekers ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE job_seekers ADD COLUMN two_factor_phone TEXT;

-- OTP 토큰 테이블 생성
CREATE TABLE IF NOT EXISTS otp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  userType TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email_usertype (email, userType),
  INDEX idx_otp_expires (expires_at)
);

-- 비밀번호 재설정 토큰 테이블 생성
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  userType TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  INDEX idx_reset_email_usertype (email, userType),
  INDEX idx_reset_token (reset_token),
  INDEX idx_reset_expires (expires_at)
);

-- 로그인 시도 기록 테이블 (보안 로그)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  userType TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 0, -- 0: 실패, 1: 성공
  failure_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_email_usertype (email, userType),
  INDEX idx_login_created (created_at),
  INDEX idx_login_success (success)
);

-- 보안 이벤트 로그 테이블
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  userType TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'login', 'password_reset', '2fa_enabled', '2fa_disabled', 'otp_sent', 'otp_verified'
  event_data TEXT, -- JSON format for additional data
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_email_usertype (user_email, userType),
  INDEX idx_security_event_type (event_type),
  INDEX idx_security_created (created_at)
);

-- 기존 테이블에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_admins_two_factor ON admins(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_agents_two_factor ON agents(two_factor_enabled);  
CREATE INDEX IF NOT EXISTS idx_employers_two_factor ON employers(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_job_seekers_two_factor ON job_seekers(two_factor_enabled);

-- 보안 설정 뷰 생성 (선택적)
CREATE VIEW IF NOT EXISTS user_security_summary AS
SELECT 
  'admin' as user_type,
  email,
  two_factor_enabled,
  created_at,
  updated_at
FROM admins
UNION ALL
SELECT 
  'agent' as user_type,
  email,
  two_factor_enabled,
  created_at,
  updated_at  
FROM agents
UNION ALL
SELECT 
  'employer' as user_type,
  email,
  two_factor_enabled,
  created_at,
  updated_at
FROM employers  
UNION ALL
SELECT 
  'jobseeker' as user_type,
  email,
  two_factor_enabled,
  created_at,
  updated_at
FROM job_seekers;

-- 마이그레이션 완료 로그
INSERT INTO security_events (
  user_email, 
  userType, 
  event_type, 
  event_data, 
  created_at
) VALUES (
  'system@w-campus.com', 
  'system', 
  'security_migration', 
  '{"migration": "0007_add_security_features", "version": "1.0", "features": ["2FA", "password_reset", "OTP", "security_logging"]}',
  CURRENT_TIMESTAMP
);