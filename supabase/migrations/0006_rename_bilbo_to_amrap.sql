-- Rename 'bilbo' method to 'amrap' in method_instances table
-- This migration updates the check constraint and migrates existing data

-- Step 1: Drop the existing check constraint
ALTER TABLE method_instances
  DROP CONSTRAINT IF EXISTS method_instances_method_key_check;

-- Step 2: Update existing data from 'bilbo' to 'amrap'
UPDATE method_instances 
SET method_key = 'amrap' 
WHERE method_key = 'bilbo';

-- Step 3: Add the new check constraint with 'amrap' instead of 'bilbo'
ALTER TABLE method_instances
  ADD CONSTRAINT method_instances_method_key_check
  CHECK (method_key IN ('amrap', 'wendler_531'));

