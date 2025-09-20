-- 0008_make_business_number_optional.sql
-- No-op migration for D1: schema already matches desired state (business_number optional)
-- Context: Original 0001 schema defines business_number as optional (no NOT NULL).
-- Keep this migration idempotent and without explicit BEGIN/COMMIT for remote D1.

-- Ensure indexes exist (safe/idempotent)
CREATE INDEX IF NOT EXISTS idx_employers_email ON employers(email);
CREATE INDEX IF NOT EXISTS idx_employers_business_number ON employers(business_number);
CREATE INDEX IF NOT EXISTS idx_employers_status ON employers(status);
