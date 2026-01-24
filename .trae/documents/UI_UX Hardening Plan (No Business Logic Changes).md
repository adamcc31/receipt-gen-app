## Guardrails
- Touch only UI/presentation + client-side interaction code.
- Do not change Prisma schema, API routes, request payloads, calculation functions, or tax logic.
- Any “new” behavior uses already-fetched data; if data is missing, show disabled controls or placeholders.
- Add feature flags for all new UI blocks to keep changes backward-compatible.

## 1) Global Layout & Header
- Update [layout.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/layout.tsx) header area to include:
  - Global search input (debounced, client-side state only) with placeholder: `Search client, batch, or file name`.
  - Bell icon with unread badge (static mocked count) implemented as a component so it can later bind to an API.
  - User profile dropdown (static name + role label) with menu items Profile / Preferences / Logout (UI-only actions, no auth flows).
- Add a small dashboard-scoped context provider (e.g., `GlobalSearchProvider`) so pages can read the global query and filter already-loaded tables.

## 2) Cross-App UI Building Blocks
- Add reusable UI-only components:
  - `EmptyState` (icon + one-line explanation + primary CTA) to replace blank states consistently.
  - `ToastProvider` + `useToast()` (lightweight in-app toasts without adding new deps) to support export/upload feedback and general micro-interactions.
  - `SkeletonBlock` helpers for consistent skeleton dimensions.
- Wrap app with `ToastProvider` in [layout.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/layout.tsx) (UI-only).
- Add `src/lib/uiFlags.ts` to gate new features (header search, toasts, table toolbars, analytics placeholder).

## 3) Dashboard Page Enhancements (UI-only)
- Update [page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/page.tsx):
  - Make statistic cards clickable (wrap with `Link` / `UnstyledButton`) navigating to existing pages with query params (e.g., `/batches?status=COMPLETED`).
  - Add skeleton loaders for stat cards and sections using a short UI-only “initial loading” state (no metric recalculation changes).
  - Add an optional informational analytics card:
    - If no aggregate data is already present, render a neutral empty-state chart placeholder (simple SVG/boxed skeleton).

## 4) Upload Page – Validation & Feedback Layer (No parsing/validation logic changes)
- Update [upload/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/upload/page.tsx):
  - Add a file summary panel after selection (name, size, row count if already exposed in response; otherwise show `—`).
  - Add a non-blocking column validation preview:
    - If backend exposes validation later, bind to it; for now show simulated Valid/Warning/Error chips for expected columns.
  - Add a step-based progress indicator (Upload → Validate → Process → Complete) mapped to existing `uploading/progress/success/error` state only.
  - Replace any blocking feedback patterns with toasts where appropriate (keep existing alerts if needed, but prefer non-blocking).

## 5) Batches List & Batch Detail – Table UX (No data/pagination changes)
- Update batches list [batches/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/batches/page.tsx):
  - Add a client-side filter bar (Type/Year/Status):
    - Status from batch status.
    - Year derived from `uploadDate` year.
    - Type disabled (since API doesn’t supply a type); keep UI scaffold.
  - Add column visibility toggle for optional columns where applicable (Mantine Table) and prepare for future expansion.
  - Make table header sticky during vertical scroll.
  - Add row density toggle (comfortable/compact) via CSS-only spacing adjustments.
  - Improve row hover + selection affordances.
  - Replace the spinner loader with skeleton rows sized to the final table layout.
  - Wire global header search to filter the already-loaded `batches` list (filename/date/status text match).
- Update batch detail [batches/[id]/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/batches/%5Bid%5D/page.tsx):
  - Add a toolbar above AG Grid:
    - Global search binds to AG Grid quick filter (client-side filtering only).
    - Dropdown filters for Type/Year/Status applied to displayed rows (local state only).
    - Column visibility toggle focused on the JPY Layer sub-columns (show/hide via AG Grid column API).
    - Row density toggle adjusts AG Grid `rowHeight` / theme spacing (UI-only).
  - Replace loader with a skeleton grid placeholder at the same height as the grid.

## 6) Export Flow – UI Configuration Layer
- Extend [ExportModal.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/components/ExportModal.tsx):
  - Keep existing options intact (format + folder structure).
  - Add additional modal controls required by spec (language selector, currency display toggle) in a disabled or UI-only mode so the existing export call remains unchanged.
- Update export trigger in batch detail to add toast notifications:
  - Export started / success / failure.
  - Ensure the underlying export execution still calls the existing endpoints and uses the same payload.

## 7) Settings Page – Structural & Visual Organization
- Update [settings/page.tsx](file:///z:/03%20NEW/Full%20Stack/FINANCE%20WEB%20APP%20(RECEIPT)/receipt-app/src/app/(dashboard)/settings/page.tsx):
  - Add tabs/sections: General / Finance Rules / Templates / System (category inferred from key patterns; no backend changes).
  - Keep existing CRUD behavior exactly as-is (Initialize Defaults, Add Setting, Edit, Delete).
  - Improve setting item presentation (label + short description + value) and show inline UI-only validation hints (non-blocking).
  - Show “Last updated” only if the API provides it; otherwise hide gracefully.
  - Replace loader spinner with skeleton rows.

## 8) Consistent Empty States & Micro-Interactions
- Replace “No X found” blocks with `EmptyState` component across pages.
- Standardize hover/focus/active styles for clickable cards, menu items, and table rows.
- Use toasts for non-blocking feedback (export, optional upload template download errors).
- Keep animations subtle (short transitions, no blocking overlays beyond existing modals).

## Verification (UI-only)
- Run through pages in dev:
  - Header search updates filters in Batches list and Batch detail without new backend requests.
  - Export modal still calls existing export logic and toasts fire at correct lifecycle points.
  - Skeletons match final layouts and no layout shift glitches.
  - Feature flags can disable each new enhancement cleanly.

If you confirm, I’ll implement the changes in the referenced UI files plus a small set of new reusable UI components (no backend edits).