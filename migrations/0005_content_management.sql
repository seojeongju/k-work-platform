-- Content Management Tables

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- FAQ 테이블
CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- 정책 테이블
CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL UNIQUE, -- 'terms', 'privacy', 'cookies'
    content TEXT NOT NULL,
    last_updated DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);

-- 문의 테이블
CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    category TEXT NOT NULL, -- 'general', 'technical', 'business', 'other'
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'answered', 'closed'
    reply TEXT,
    replied_at DATETIME,
    replied_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 연락처 정보 테이블
CREATE TABLE IF NOT EXISTS contact_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone1 TEXT NOT NULL,
    phone2 TEXT,
    email TEXT NOT NULL,
    address1 TEXT NOT NULL,
    address2 TEXT,
    hours TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notices_active ON notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_order ON faqs(order_index);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries(category);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

-- 기본 데이터 삽입
INSERT OR IGNORE INTO contact_info (phone1, phone2, email, address1, address2, hours) VALUES 
('02-3144-3137', '054-464-3137', 'wow3d16@naver.com', 
 '서울특별시 강남구 테헤란로 123', '경상북도 포항시 남구 지곡로 80', 
 '평일 09:00 - 18:00');

-- 샘플 공지사항
INSERT OR IGNORE INTO notices (title, content, is_active) VALUES 
('WOW-CAMPUS 플랫폼 오픈', 'WOW-CAMPUS 외국인 인재 채용 플랫폼이 정식 오픈되었습니다. 많은 이용 바랍니다.', 1),
('시스템 점검 안내', '매주 일요일 오전 2시-4시에 시스템 점검이 진행됩니다.', 1);

-- 샘플 FAQ
INSERT OR IGNORE INTO faqs (category, question, answer, is_active, order_index) VALUES 
('일반', '회원가입은 어떻게 하나요?', '홈페이지 우측 상단의 "회원가입" 버튼을 클릭하여 가입하실 수 있습니다.', 1, 1),
('일반', '비밀번호를 잊어버렸어요', '로그인 페이지에서 "비밀번호 찾기"를 클릭하여 재설정하실 수 있습니다.', 1, 2),
('구인기업', '채용공고는 어떻게 등록하나요?', '구인기업으로 로그인 후 "채용공고 등록" 메뉴에서 등록하실 수 있습니다.', 1, 3),
('구직자', '이력서는 어떻게 작성하나요?', '구직자로 로그인 후 "프로필 관리" 메뉴에서 이력서를 작성하실 수 있습니다.', 1, 4);