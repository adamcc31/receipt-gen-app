DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
      AND column_name = 'admin_fee_fixed'
  ) THEN
    ALTER TABLE "transactions"
      RENAME COLUMN "admin_fee_fixed" TO "tax_representative_fee_yen";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
      AND column_name = 'tax_representative_fee_yen'
  ) THEN
    ALTER TABLE "transactions"
      ALTER COLUMN "tax_representative_fee_yen" SET DEFAULT 0;
  END IF;
END $$;
