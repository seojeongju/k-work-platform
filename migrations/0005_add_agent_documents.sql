-- 에이전트 지정 및 서류 업로드 기능을 위한 테이블 확장

-- job_postings 테이블에 에이전트 관련 컬럼 추가
ALTER TABLE job_postings ADD COLUMN agent_id INTEGER REFERENCES agents(id);
ALTER TABLE job_postings ADD COLUMN agent_fee_percentage REAL DEFAULT 0.0;
ALTER TABLE job_postings ADD COLUMN agent_notes TEXT;

-- 구직자 서류 관리 테이블 생성
CREATE TABLE IF NOT EXISTS job_seeker_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'certificate', 'diploma', 'portfolio', 'visa_copy', 'other')),
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT TRUE,
    description TEXT,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
);

-- 지원서에 서류 첨부 관리 테이블
CREATE TABLE IF NOT EXISTS application_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    attached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES job_seeker_documents(id) ON DELETE CASCADE,
    UNIQUE(application_id, document_id)
);

-- 파일 다운로드 로그 테이블
CREATE TABLE IF NOT EXISTS document_download_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    employer_id INTEGER NOT NULL,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (document_id) REFERENCES job_seeker_documents(id),
    FOREIGN KEY (employer_id) REFERENCES employers(id)
);

-- 에이전트-기업 협력 관계 테이블
CREATE TABLE IF NOT EXISTS agent_employer_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    employer_id INTEGER NOT NULL,
    relationship_type TEXT DEFAULT 'partner' CHECK (relationship_type IN ('partner', 'preferred', 'exclusive')),
    commission_rate REAL DEFAULT 0.0,
    contract_start_date DATE,
    contract_end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (employer_id) REFERENCES employers(id),
    UNIQUE(agent_id, employer_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_job_postings_agent_id ON job_postings(agent_id);
CREATE INDEX IF NOT EXISTS idx_job_seeker_documents_seeker_id ON job_seeker_documents(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_seeker_documents_type ON job_seeker_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_document_download_logs_document_id ON document_download_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_employer_relations_agent_id ON agent_employer_relations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_employer_relations_employer_id ON agent_employer_relations(employer_id);