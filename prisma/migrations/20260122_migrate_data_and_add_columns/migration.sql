-- Migrate existing data (Part 2)
UPDATE transactions SET type = 'NENKIN_NORMAL' WHERE type = 'NENKIN';

-- Add new columns to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "speed_service_fee" DECIMAL(18,2);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "additional_cost_label" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "additional_cost_amount" DECIMAL(18,2);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "note" TEXT;
