-- 비자 타입 기본 데이터
INSERT OR IGNORE INTO visa_types (visa_code, visa_name, description, work_allowed, study_allowed, duration, requirements) VALUES 
  ('E-9', 'E-9 (비전문취업)', '비전문 분야 외국인력', true, false, '최대 4년 10개월', '고용허가제 대상'),
  ('E-7', 'E-7 (특정활동)', '전문 인력', true, false, '1-3년', '전문 학력 또는 경력'),
  ('H-2', 'H-2 (방문취업)', '방문취업', true, false, '최대 5년', '재외동포'),
  ('E-2', 'E-2 (회화지도)', '어학강사', true, false, '1-2년', '학사학위 및 관련 경력'),
  ('D-2', 'D-2 (유학)', '유학', false, true, '학업기간', '입학허가서'),
  ('D-4', 'D-4 (일반연수)', '어학연수', false, true, '최대 2년', '연수기관 입학'),
  ('F-4', 'F-4 (재외동포)', '재외동포', true, true, '3년', '재외동포 증명'),
  ('F-5', 'F-5 (영주)', '영주권', true, true, '무제한', '영주 자격 충족');

-- 직종 분류 기본 데이터
INSERT OR IGNORE INTO job_categories (category_code, category_name_ko, category_name_en, parent_category_id) VALUES 
  ('IT', 'IT/소프트웨어', 'IT/Software', NULL),
  ('MFG', '제조업', 'Manufacturing', NULL),
  ('SVC', '서비스업', 'Service', NULL),
  ('EDU', '교육', 'Education', NULL),
  ('HSP', '의료/보건', 'Healthcare', NULL),
  ('AGR', '농업', 'Agriculture', NULL),
  ('CON', '건설', 'Construction', NULL),
  ('TRD', '무역/물류', 'Trade/Logistics', NULL);

-- 세부 직종
INSERT OR IGNORE INTO job_categories (category_code, category_name_ko, category_name_en, parent_category_id) VALUES 
  ('IT001', '웹개발', 'Web Development', 1),
  ('IT002', '모바일앱개발', 'Mobile App Development', 1),
  ('MFG001', '자동차부품', 'Auto Parts', 2),
  ('MFG002', '전자제품', 'Electronics', 2),
  ('SVC001', '음식점', 'Restaurant', 3),
  ('SVC002', '소매판매', 'Retail Sales', 3),
  ('EDU001', '영어강사', 'English Teacher', 4),
  ('EDU002', '중국어강사', 'Chinese Teacher', 4);

-- 지역 정보 기본 데이터
INSERT OR IGNORE INTO regions (region_code, region_name_ko, region_name_en, parent_region_id) VALUES 
  ('SEL', '서울특별시', 'Seoul', NULL),
  ('BSN', '부산광역시', 'Busan', NULL),
  ('DGU', '대구광역시', 'Daegu', NULL),
  ('ICN', '인천광역시', 'Incheon', NULL),
  ('GWJ', '광주광역시', 'Gwangju', NULL),
  ('DJN', '대전광역시', 'Daejeon', NULL),
  ('USN', '울산광역시', 'Ulsan', NULL),
  ('SJG', '세종특별자치시', 'Sejong', NULL),
  ('GGD', '경기도', 'Gyeonggi-do', NULL),
  ('GWD', '강원도', 'Gangwon-do', NULL),
  ('CBD', '충청북도', 'Chungcheongbuk-do', NULL),
  ('CND', '충청남도', 'Chungcheongnam-do', NULL),
  ('JBD', '전북특별자치도', 'Jeonbuk-do', NULL),
  ('JND', '전라남도', 'Jeollanam-do', NULL),
  ('GBD', '경상북도', 'Gyeongsangbuk-do', NULL),
  ('GND', '경상남도', 'Gyeongsangnam-do', NULL),
  ('JJD', '제주특별자치도', 'Jeju-do', NULL);

-- 샘플 에이전트 데이터
INSERT OR IGNORE INTO agents (email, password, company_name, country, contact_person, phone, address, license_number, status) VALUES 
  ('agent1@vietnam.com', 'hashed_password_1', 'Vietnam Job Agency', 'Vietnam', 'Nguyen Van A', '+84-123-456-789', 'Ho Chi Minh City, Vietnam', 'VN-001', 'approved'),
  ('agent2@philippines.com', 'hashed_password_2', 'Philippines Employment Center', 'Philippines', 'Maria Santos', '+63-123-456-789', 'Manila, Philippines', 'PH-001', 'approved'),
  ('agent3@thailand.com', 'hashed_password_3', 'Thailand Work Solutions', 'Thailand', 'Somchai Jaidee', '+66-123-456-789', 'Bangkok, Thailand', 'TH-001', 'pending');

-- 샘플 기업 데이터
INSERT OR IGNORE INTO employers (email, password, company_name, business_number, industry, contact_person, phone, address, region, website, status) VALUES 
  ('hr@samsung.com', 'hashed_password_1', '삼성전자', '123-45-67890', '전자제품 제조', '김인사', '02-1234-5678', '서울시 서초구', 'SEL', 'www.samsung.com', 'approved'),
  ('recruit@hyundai.com', 'hashed_password_2', '현대자동차', '234-56-78901', '자동차 제조', '이채용', '02-2345-6789', '서울시 강남구', 'SEL', 'www.hyundai.com', 'approved'),
  ('jobs@lotte.com', 'hashed_password_3', '롯데마트', '345-67-89012', '소매업', '박매니저', '051-3456-7890', '부산시 해운대구', 'BSN', 'www.lotte.com', 'approved');

-- 샘플 구직자 데이터
INSERT OR IGNORE INTO job_seekers (email, password, name, birth_date, gender, nationality, current_visa, desired_visa, phone, current_address, korean_level, education_level, work_experience, agent_id, status) VALUES 
  ('nguyen@email.com', 'hashed_password_1', 'Nguyen Van B', '1995-05-15', 'male', 'Vietnam', 'D-4', 'E-9', '+84-987-654-321', 'Seoul, Korea', 'intermediate', 'High School', '2 years manufacturing', 1, 'active'),
  ('maria@email.com', 'hashed_password_2', 'Maria Cruz', '1992-08-20', 'female', 'Philippines', 'Tourist', 'E-7', '+63-987-654-321', 'Manila, Philippines', 'advanced', 'Bachelor', '3 years IT', 2, 'active'),
  ('somchai@email.com', 'hashed_password_3', 'Somchai Lee', '1990-12-10', 'male', 'Thailand', 'D-2', 'E-2', '+66-987-654-321', 'Bangkok, Thailand', 'beginner', 'Bachelor', '1 year teaching', 3, 'active');

-- 샘플 구인 공고 데이터
INSERT OR IGNORE INTO job_postings (employer_id, title, job_category, required_visa, salary_min, salary_max, work_location, region, work_hours, benefits, requirements, description, korean_level_required, experience_required, deadline, status) VALUES 
  (1, '전자제품 조립 작업자', 'MFG002', 'E-9', 2000000, 2500000, '서울시 서초구 삼성전자', 'SEL', '주 40시간', '4대보험, 숙소제공', '성실한 근무자', '전자제품 조립 및 검사 업무', 'basic', '경험무관', '2024-12-31', 'active'),
  (2, 'IT 소프트웨어 개발자', 'IT001', 'E-7', 3500000, 5000000, '서울시 강남구 현대자동차', 'SEL', '주 40시간', '4대보험, 성과급', '컴퓨터공학 전공 우대', '자동차 관련 소프트웨어 개발', 'intermediate', '2년 이상', '2024-11-30', 'active'),
  (3, '매장 판매직', 'SVC002', 'H-2', 2200000, 2800000, '부산시 해운대구 롯데마트', 'BSN', '주 44시간', '4대보험, 직원할인', '고객응대 가능자', '매장 내 상품 판매 및 고객 응대', 'advanced', '경험무관', '2024-10-31', 'active');

-- 샘플 유학 프로그램 데이터
INSERT OR IGNORE INTO study_programs (institution_name, program_type, program_name, duration, tuition_fee, location, requirements, description, start_dates, application_deadline, status) VALUES 
  ('서울대학교 언어교육원', 'language', '한국어 정규과정', '1년', 6000000, '서울시 관악구', '고등학교 졸업 이상', '초급부터 고급까지 체계적인 한국어 교육', '3월, 6월, 9월, 12월', '2024-12-15', 'active'),
  ('연세대학교', 'undergraduate', '경영학과', '4년', 8000000, '서울시 서대문구', '고등학교 졸업, TOPIK 4급 이상', '글로벌 경영 인재 양성 프로그램', '3월, 9월', '2024-11-30', 'active'),
  ('KAIST', 'graduate', '컴퓨터공학 석사', '2년', 12000000, '대전시 유성구', '학사학위, TOPIK 4급 또는 영어능력', '첨단 IT 기술 연구 프로그램', '3월, 9월', '2024-12-31', 'active');