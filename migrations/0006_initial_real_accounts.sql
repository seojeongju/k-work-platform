-- 실제 사용 가능한 초기 계정들 생성

-- 관리자 계정
INSERT OR IGNORE INTO admins (email, password, name, role, status) 
VALUES ('admin@wowcampus.com', '0324af1d693e5f40984ec96b14b8efe2f38d3f003403dccbb55ecdbcba7e33f1', '시스템 관리자', 'super_admin', 'active');

-- 구직자 계정
INSERT OR IGNORE INTO job_seekers (email, password, name, birth_date, gender, nationality, current_visa, desired_visa, phone, current_address, korean_level, education_level, status) 
VALUES ('test.jobseeker@gmail.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', '김구직', '1995-05-15', 'male', 'Vietnam', 'D-4', 'E-9', '+84-987-654-321', 'Seoul, Korea', 'intermediate', 'High School', 'active');

-- 기업 계정
INSERT OR IGNORE INTO employers (email, password, company_name, business_number, industry, contact_person, phone, address, region, website, status) 
VALUES ('test.employer@gmail.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', '테스트 기업', '123-45-67890', 'IT/소프트웨어', '박인사', '02-1234-5678', '서울시 강남구 테헤란로 123', 'SEL', 'www.testcompany.com', 'approved');

-- 에이전트 계정
INSERT OR IGNORE INTO agents (email, password, company_name, country, contact_person, phone, address, license_number, status) 
VALUES ('test.agent@gmail.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Global Talent Agency', 'Vietnam', '이에이전트', '+84-123-456-789', 'Ho Chi Minh City, Vietnam', 'GT-2024-001', 'approved');

-- 추가 샘플 구인 공고
INSERT OR IGNORE INTO job_postings (employer_id, title, job_category, required_visa, salary_min, salary_max, work_location, region, work_hours, benefits, requirements, description, korean_level_required, experience_required, deadline, status) 
VALUES 
(1, 'IT 개발자 모집', 'IT001', 'E-7', 3500000, 5000000, '서울시 강남구', 'SEL', '주 40시간', '4대보험, 연봉협상가능, 복리후생', '프로그래밍 경험 필수', 'Java, Spring 기반 웹 개발', 'intermediate', '2년 이상', '2024-12-31', 'active'),
(1, '제조업 생산직', 'MFG001', 'E-9', 2200000, 2800000, '경기도 안산시', 'GGD', '주 40시간', '4대보험, 숙소제공, 식대지원', '성실한 근무태도', '전자제품 생산라인 작업', 'basic', '경험무관', '2024-11-30', 'active');

-- 샘플 유학 프로그램
INSERT OR IGNORE INTO study_programs (institution_name, program_type, program_name, duration, tuition_fee, location, requirements, description, start_dates, application_deadline, status) 
VALUES 
('고려대학교 국제어학원', 'language', '한국어 정규과정', '1년', 7000000, '서울시 성북구', '고등학교 졸업 이상', '체계적인 한국어 교육 프로그램', '3월, 6월, 9월, 12월', '2024-12-15', 'active'),
('성균관대학교', 'undergraduate', '경영학과', '4년', 9000000, '서울시 종로구', '고등학교 졸업, TOPIK 4급', '글로벌 경영 인재 양성', '3월, 9월', '2024-11-30', 'active');