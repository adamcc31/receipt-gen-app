-- AlterEnum: Add new enum values (Part 1)
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'NENKIN_NORMAL';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'NENKIN_SPEED';
