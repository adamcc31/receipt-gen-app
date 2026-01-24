I have updated the plan to incorporate the critical addendums regarding database migration, AG Grid localization, and filename sanitization.

## 1. Database & Upload Logic (Smart Numbering Support)
**Goal:** Enable row-level tracking with backward compatibility.

*   **Schema Update (`prisma/schema.prisma`):**
    *   Add `rowIndex` as an **Optional** field (`Int?`) to the `Transaction` model to prevent migration issues with existing data.
*   **Upload API (`src/app/api/upload/route.ts`):**
    *   Update the transaction creation loop to populate `rowIndex` (index + 1).

## 2. Receipt Generation Logic
**Goal:** Implement `[Filename]-[Row]` numbering with robust sanitization and fallbacks.

*   **Service (`src/services/receipt-generator.ts`):**
    *   **Fetch Metadata:** Update query to include `batch` relation (specifically `filename`).
    *   **Sanitization Helper:** Create a function to:
        *   Remove extension (`.xlsx`).
        *   Replace spaces with `_`.
        *   Remove special chars (keep alphanumeric and `_`).
    *   **Numbering Logic:**
        *   Primary: `[SanitizedFilename]-[RowIndex]` (padded to 2 digits).
        *   Fallback (if `rowIndex` is null): `[SanitizedFilename]-[TransactionID]` (as requested).

## 3. Receipt Template Overhaul (Layout & Localization)
**Goal:** Fix layout, move date, and localize.

*   **Templates (`ReceiptNenkin.tsx` & `ReceiptGensen.tsx`):**
    *   **Layout:** Remove `marginTop: 'auto'` from footer; ensure natural flow.
    *   **Date:** Move from Header to Footer bottom with label "Tanggal Cetak: [Date]".
    *   **Localization:** Translate all labels (RECEIPT -> KWITANSI, etc.).
    *   **Content:** Rename "Shipping Fee" to "Potongan Ongkir Berkas Nenkin 80%".

## 4. UI & Dashboard Localization (Full Indonesian)
**Goal:** Translate buttons and data grids.

*   **Batch Detail Page (`src/app/(dashboard)/batches/[id]/page.tsx`):**
    *   **AG Grid:** Update `columnDefs` header names:
        *   "Client Name" -> "Nama Klien"
        *   "Nominal (Yen)" -> "Nominal Awal (¥)"
        *   "Admin Fee" -> "Biaya Admin"
        *   "Tax Rep Fee" -> "Biaya Perwakilan Pajak"
        *   "Shipping Fee (IDR)" -> "Potongan Ongkir (Rp)"
        *   "Total IDR" -> "Total Transfer (Rp)"
        *   And others to match context.
    *   **Buttons:** Rename "Generate" / "Export" to "Buat Kwitansi".
*   **Upload Page (`src/app/(dashboard)/upload/page.tsx`):**
    *   "Download Template" -> "Unduh Template Excel".

## 5. Verification
*   Verify `prisma db push` works without data loss.
*   Check receipt number format for new vs old data.
*   Verify all Indonesian labels in UI and PDF.
