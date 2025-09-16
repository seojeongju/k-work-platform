-- ================================
-- Make business_number optional for employers
-- Migration 0008 - 2025-09-16
-- ================================

-- SQLite doesn't support ALTER COLUMN directly, so we need to:
-- 1. Disable foreign key checks temporarily
-- 2. Create a new table with the updated schema
-- 3. Copy data from old table to new table
-- 4. Drop old table
-- 5. Rename new table
-- 6. Re-enable foreign key checks

-- Step 1: Disable foreign key checks
PRAGMA foreign_keys=OFF;

-- Step 2: Create new employers table with optional business_number
CREATE TABLE IF NOT EXISTS employers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  company_name TEXT NOT NULL,
  business_number TEXT UNIQUE, -- Removed NOT NULL constraint
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

-- Step 2: Copy existing data to new table
INSERT INTO employers_new (
  id, email, password, company_name, business_number, industry, 
  contact_person, phone, address, region, website, status, 
  created_at, updated_at
)
SELECT 
  id, email, password, company_name, business_number, industry, 
  contact_person, phone, address, region, website, status, 
  created_at, updated_at
FROM employers;

-- Step 3: Drop old table
DROP TABLE employers;

-- Step 4: Rename new table to original name
ALTER TABLE employers_new RENAME TO employers;

-- Step 5: Recreate indexes if any existed
CREATE INDEX IF NOT EXISTS idx_employers_email ON employers(email);
CREATE INDEX IF NOT EXISTS idx_employers_business_number ON employers(business_number);
CREATE INDEX IF NOT EXISTS idx_employers_status ON employers(status);

-- Step 6: Re-enable foreign key checks
PRAGMA foreign_keys=ON;