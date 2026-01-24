## Scope
Implement urgent final revisions:
- GENSEN filenames include year.
- Replace GENSEN fixed 3000 fee with optional `tax_representative_fee_yen` (default 0), update label, and hide row when 0.
- Enforce strict single-color theming per type (Nenkin Normal orange, Nenkin Speed blue, Gensen green).
- Replace `Received from:` with `Recipient of Funds:` and remove signature block on all receipts.
- Update Excel parser/template + AG Grid editing for the new Gensen fee.

## 1) Export Filename Rule (GENSEN Year)
- Update per-receipt filename generation in [receipt-generator.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/services/receipt-generator.ts#L237-L286).
- Keep generic rule: `YYYY-MM-DD_<ClientName>_<Type>`.
- Apply GENSEN exception for JPG/PDF base filename:
  - Flat: `YYYY-MM-DD_<ClientName>_GENSEN_<Year>`
  - Grouped folder mode: `YYYY-MM-DD_GENSEN_<Year>` (still consistent with “Date_Type” but with required year).
- Retrieve year from `transaction.gensenYear` and sanitize it.
- Ensure the stored `pdfPath` / `imagePath` fields match the new base filename.
- Fallback behavior if year is missing: use `YYYY-MM-DD_<ClientName>_GENSEN` (no trailing `_undefined`).

## 2) Database / Prisma: Rename Gensen Fixed Fee
- Current field/column is `adminFeeFixed` / `admin_fee_fixed` (used for GENSEN fixed 3000). See [schema.prisma](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/prisma/schema.prisma#L56-L84).
- Add a migration that renames the column:
  - `ALTER TABLE "transactions" RENAME COLUMN "admin_fee_fixed" TO "tax_representative_fee_yen";`
- Update Prisma model field name to `taxRepresentativeFeeYen` mapped to `tax_representative_fee_yen` with default 0.
- Update code references that currently read/write `adminFeeFixed`.

## 3) Excel Parser + Template: Add Tax Rep Fee Column
- Update [excel-parser.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/lib/excel-parser.ts):
  - Add a new optional numeric column mapping: `Tax Rep Fee (Yen)` → `taxRepresentativeFeeYen` with aliases like `tax rep fee`, `tax representative fee`, `tax_representative_fee_yen`.
  - Parse as Decimal with default 0.
  - Include the column in `generateExcelTemplate()`.

## 4) Gensen Calculation Update (Optional Fee)
- Update [calculations.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/lib/calculations.ts):
  - Replace Gensen fixed-fee input from `adminFeeFixed` to `taxRepresentativeFeeYen`.
  - Formula becomes:
    - `NetGensen = Base - (Base*0.40) - tax_representative_fee_yen`
  - Only subtract the fee if it’s > 0.
  - Keep Nenkin admin rounding as Excel-compatible (already half-up).

## 5) API Updates
- Upload API: update [upload/route.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/api/upload/route.ts) to persist `taxRepresentativeFeeYen` (for GENSEN) and pass it to calculation.
- Transaction PATCH API: update [transactions/[id]/route.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/api/transactions/%5Bid%5D/route.ts) to allow editing `taxRepresentativeFeeYen` and recalculate when it changes.

## 6) AG Grid: Editable Tax Rep Fee
- Update [batches/[id]/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/batches/%5Bid%5D/page.tsx):
  - Add an editable Yen-layer column for `Tax Rep Fee (¥)`.
  - This column is primarily for GENSEN rows, but can exist for all rows (value 0 for Nenkin).
  - Include it in the recalculation triggers and PATCH payload.

## 7) Receipt Visual + Copy Cleanup
- Apply strict single-color theming:
  - NENKIN_NORMAL: orange
  - NENKIN_SPEED: blue
  - GENSEN: green (change from current yellow accent)
- Update label on all receipt templates:
  - Replace `Received from:` → `Recipient of Funds:`
  - Files: [ReceiptNenkin.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/components/templates/ReceiptNenkin.tsx), [ReceiptGensen.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/components/templates/ReceiptGensen.tsx)
- Remove signature block completely on all receipts:
  - Remove `signatureArea` rendering and related styles.
- Gensen template label + conditional row:
  - Rename row label to `Tax Representative Fees`.
  - Hide the row if the value is 0.

## 8) Verification
- Run Prisma validation + generate.
- Run `lint` and `build`.
- Smoke check:
  - Export a GENSEN receipt and confirm filename includes `_GENSEN_<Year>`.
  - Confirm Gensen fee is editable via Excel + grid and is only shown/deducted when > 0.
  - Confirm all receipts show `Recipient of Funds:` and no signature block.
  - Confirm theming matches the strict colors.

If you approve, I’ll implement all changes above end-to-end (schema/migrations, parsing, calculations, grid, rendering, generator filenames) and rerun build verification.