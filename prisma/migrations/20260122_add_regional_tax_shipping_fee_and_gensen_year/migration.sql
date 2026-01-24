-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN     "regional_tax_yen" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_fee_idr" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gensen_year" TEXT;
