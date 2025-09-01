-- 테스트 계정 생성 SQL

-- 관리자 계정
INSERT INTO admins (email, password, name, role, status, created_at) VALUES 
('admin@wowcampus.com', 'admin123', 'WOW-CAMPUS 관리자', 'super_admin', 'active', CURRENT_TIMESTAMP);

-- 에이전트 계정들 (기존 컬럼 구조에 맞춤)
INSERT INTO agents (email, password, company_name, contact_person, phone, country, status, created_at) VALUES 
('agent1@wowcampus.com', 'agent123', '글로벌인재에이전시', '김에이전트', '02-1234-5678', '베트남', 'approved', CURRENT_TIMESTAMP),
('agent2@wowcampus.com', 'agent123', '아시아인재센터', '박에이전트', '02-2345-6789', '필리핀', 'approved', CURRENT_TIMESTAMP),
('agent3@wowcampus.com', 'agent123', '코리아잡스', '이에이전트', '02-3456-7890', '태국', 'approved', CURRENT_TIMESTAMP);

-- 구인기업 계정들 (기존 컬럼 구조에 맞춤)
INSERT INTO employers (email, password, company_name, business_number, industry, contact_person, phone, address, region, status, created_at) VALUES 
('hr@techcorp.com', 'company123', '테크코퍼레이션', '123-45-67890', 'IT/소프트웨어', '김인사', '02-1111-2222', '서울시 강남구 테헤란로 123', '서울', 'approved', CURRENT_TIMESTAMP),
('jobs@manufacturing.com', 'company123', '한국제조', '234-56-78901', '제조업', '박채용', '031-3333-4444', '경기도 안산시 공단로 456', '경기', 'approved', CURRENT_TIMESTAMP),
('recruit@globalservice.com', 'company123', '글로벌서비스', '345-67-89012', '서비스업', '최담당', '02-5555-6666', '서울시 마포구 월드컵북로 789', '서울', 'approved', CURRENT_TIMESTAMP);

-- 구직자 계정들 (기존 컬럼 구조에 맞춤)
INSERT INTO job_seekers (
    email, password, name, birth_date, gender, nationality, phone, 
    current_visa, desired_visa, korean_level, current_address, 
    education_level, work_experience, agent_id, status, created_at
) VALUES 
(
    'nguyenvan@example.com', 'jobseeker123', '응우엔 반', '1995-03-15', 'male', '베트남', 
    '010-1111-1111', 'D-4', 'E-7', 'intermediate', '서울시 구로구', 
    '학사', '베트남에서 웹개발 2년 경험', 1, 'active', CURRENT_TIMESTAMP
),
(
    'maria@example.com', 'jobseeker123', '마리아 산토스', '1992-07-20', 'female', '필리핀', 
    '010-2222-2222', 'H-2', 'F-4', 'advanced', '인천시 남동구', 
    '전문학사', '호텔 서비스업 3년 경험', 2, 'active', CURRENT_TIMESTAMP
),
(
    'somchai@example.com', 'jobseeker123', '솜차이', '1988-12-10', 'male', '태국', 
    '010-3333-3333', 'E-9', 'H-2', 'beginner', '경기도 화성시', 
    '고등학교', '태국에서 자동차 부품 제조 5년', 3, 'active', CURRENT_TIMESTAMP
),
(
    'ahmed@example.com', 'jobseeker123', '아흐메드', '1990-05-25', 'male', '방글라데시', 
    '010-4444-4444', 'E-9', 'H-2', 'intermediate', '경기도 안산시', 
    '학사', '건설 현장 관리 4년 경험', 1, 'active', CURRENT_TIMESTAMP
);

-- 구인공고들 (기존 컬럼 구조에 맞춤)
INSERT INTO job_postings (
    employer_id, title, job_category, work_location, region, required_visa, 
    salary_min, salary_max, korean_level_required, 
    deadline, description, status, created_at
) VALUES 
(
    1, '웹 개발자 (외국인 우대)', 'IT/소프트웨어', '서울시 강남구', '서울', 'E-7', 
    30000000, 45000000, 'intermediate', '2024-12-31', 
    '스타트업에서 함께 성장할 웹 개발자를 찾습니다. React, Node.js 경험자 우대', 'active', CURRENT_TIMESTAMP
),
(
    2, '생산직 작업자 모집', '제조업', '경기도 안산시', '경기', 'E-9', 
    28000000, 32000000, 'basic', '2024-11-30', 
    '자동차 부품 제조 생산라인 작업자를 모집합니다. 경험자 우대', 'active', CURRENT_TIMESTAMP
),
(
    3, '호텔 프론트 직원', '서비스업', '서울시 중구', '서울', 'H-2', 
    25000000, 30000000, 'advanced', '2024-10-31', 
    '5성급 호텔에서 근무할 프론트 직원을 모집합니다. 영어, 한국어 가능자', 'active', CURRENT_TIMESTAMP
),
(
    1, 'IT 시스템 관리자', 'IT/소프트웨어', '서울시 강남구', '서울', 'E-7', 
    35000000, 50000000, 'advanced', '2024-12-15', 
    '서버 및 네트워크 관리 경험이 있는 시스템 관리자 모집', 'active', CURRENT_TIMESTAMP
),
(
    2, '품질관리 담당자', '제조업', '경기도 안산시', '경기', 'E-7', 
    32000000, 40000000, 'intermediate', '2024-11-15', 
    '제조업 품질관리 경험자를 모집합니다. QC 자격증 우대', 'active', CURRENT_TIMESTAMP
);

-- 유학 프로그램들
INSERT INTO study_programs (
    institution_name, program_name, program_type, location, duration, 
    tuition_fee, application_deadline, description, requirements, 
    status, created_at
) VALUES 
(
    '서울대학교 언어교육원', '한국어 정규과정', 'language', '서울시 관악구', '1학기 (10주)', 
    1800000, '2024-11-30', '체계적인 한국어 교육과정으로 초급부터 고급까지', 
    '고등학교 졸업 이상, 여권 사본, 은행잔고증명서', 
    'active', CURRENT_TIMESTAMP
),
(
    '연세대학교 한국어학당', '한국어 집중과정', 'language', '서울시 서대문구', '1학기 (10주)', 
    1700000, '2024-12-15', '60년 전통의 한국어 교육기관', 
    '고등학교 졸업 이상, TOPIK 등급 무관', 
    'active', CURRENT_TIMESTAMP
),
(
    '고려대학교', '컴퓨터학과 학부과정', 'undergraduate', '서울시 성북구', '4년', 
    8000000, '2024-10-31', '글로벌 IT 인재 양성을 위한 학부과정', 
    'TOPIK 4급 이상, 고등학교 성적 80점 이상', 
    'active', CURRENT_TIMESTAMP
);