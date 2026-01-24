## What Will Change

* Update NENKIN calculations to a 2-layer model (JPY deductions first, then IDR deduction for ongkir).

* Keep GENSEN core formula, but add a `gensen_year` field stored in DB and shown on the Gensen receipt.

* Add dynamic receipt accents by `type`: Orange (NENKIN\_NORMAL), Blue (NENKIN\_SPEED), Yellow (GENSEN).

* Extend DB + Excel import/template + AG Grid to support `regional_tax_yen` and `shipping_fee_idr`.

## Calculation Logic (Core Engine)

* Update [calculations.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/lib/calculations.ts) to implement:

  * **Nenkin (Normal/Speed)**

    * Inputs: `BaseNominal (rawNominalYen)`, `regionalTaxYen`, `shippingFeeIdr`, `exchangeRate`.

    * JPY layer:

      * `adminFee = base * 0.15`

      * `fixedTax = 3500`

      * `speedFee = 3000` if speed

      * `netYen = base - regionalTaxYen - adminFee - fixedTax - speedFee`

    * IDR layer:

      * `grossIdr = netYen * kurs`

      * `finalTransferIdr = grossIdr - shippingFeeIdr`

  * **Gensen** stays `(base - 40% - 3000) * kurs`.

* Extend the shared result shape to expose `netYen`, `grossIdr`, and `finalTransferIdr` (while keeping `finalNominalIdr` as the persisted/displayed “final transfer” amount).

## Database (Prisma + Migration)

* Update [schema.prisma](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/prisma/schema.prisma) `Transaction` model:

  * Add `regionalTaxYen` mapped to `regional_tax_yen` (Decimal, default 0).

  * Add `shippingFeeIdr` mapped to `shipping_fee_idr` (Decimal, default 0).

  * Add `gensenYear` mapped to `gensen_year` (nullable String or Int; I will implement as **String?** so values like "2024" always work).

* Create a new Prisma migration SQL to add these columns to Postgres with defaults where required.

## Excel Template + Import

* Update [excel-parser.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/lib/excel-parser.ts):

  * Add optional columns/aliases for:

    * `Regional Tax (Yen)` → `regional_tax_yen`

    * `Shipping Fee (IDR)` / `Ongkir` → `shipping_fee_idr`

    * `Gensen Year` → `gensen_year`

  * Parse them with defaults: 0 for the numeric fields; nullable for year.

  * Update `generateExcelTemplate()` so downloaded template includes these columns.

* Update the upload help table in [upload/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/\(dashboard\)/upload/page.tsx) to reflect the new optional columns.

## API Updates (Persist + Recalculate)

* Update upload creation logic in [api/upload/route.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/api/upload/route.ts) to persist the new fields and compute `finalNominalIdr` using the revised Nenkin logic.

* Update transaction PATCH logic in [api/transactions/\[id\]/route.ts](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/api/transactions/%5Bid%5D/route.ts):

  * Allow updating `regionalTaxYen`, `shippingFeeIdr`, `gensenYear`.

  * Recalculate `finalNominalIdr` when any of the calculation inputs change.

## AG Grid (UI) Updates

* Update the grid in [batches/\[id\]/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/\(dashboard\)/batches/%5Bid%5D/page.tsx):

  * Add editable columns:

    * `Regional Tax (¥)` (Yen deduction)

    * `Shipping Fee (IDR)` / `Ongkir` (IDR deduction)

    * `Gensen Year` (only meaningful for GENSEN; still editable but can be shown conditionally or left blank for Nenkin)

  * Visually separate **Yen deductions** vs **IDR deductions** using column groups (e.g., “JPY Layer” and “IDR Layer”) so ongkir is clearly after conversion.

  * Update client-side recalculation triggers to include these new fields.

## Receipt Rendering + Dynamic Theming

* Eliminate duplicated math in renderer pages by switching them to call the shared calculation engine:

  * [render/nenkin/\[id\]/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/\(renderer\)/render/nenkin/%5Bid%5D/page.tsx)

  * [render/gensen/\[id\]/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/app/\(renderer\)/render/gensen/%5Bid%5D/page.tsx)

* Update receipt templates to:

  * Show `regionalTaxYen` as a Yen deduction line on Nenkin receipts.

  * Show `shippingFeeIdr` as an IDR deduction line after conversion (and optionally show the intermediate “Gross IDR”).

  * Display `gensenYear` prominently on the Gensen receipt.

  * Apply dynamic accents:

    * Nenkin Normal: Orange

    * Nenkin Speed: Blue

    * Gensen: Yellow

  * Files:

    * [ReceiptNenkin.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/components/templates/ReceiptNenkin.tsx)

    * [ReceiptGensen.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20\(RECEIPT\)/receipt-app/src/components/templates/ReceiptGensen.tsx)

## Verification

* Run typecheck/build and lint (Next build + ESLint).

* Smoke-test flows:

  * Download updated Excel template.

  * Upload a sheet containing regional tax + ongkir.

  * Edit values in AG Grid and confirm `finalNominalIdr` updates correctly.

  * Generate/export receipts and visually confirm the correct accent + correct post-conversion ongkir deduction.

## Implementation Note (Important)

* `shipping_fee_idr` will be deducted **only after** converting Net JPY to IDR, and will default to 0 so existing rows remain valid.

