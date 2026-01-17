# Known Errors & Resolutions

## KPI Typography Inconsistency
**Issue**
- Font sizes became inconsistent after dashboard refactor

**Cause**
- Mixed utility classes applied across components

**Resolution**
- Standardized typography scale across dashboard components

**Status**
Resolved

---

## Missing Payment Cards
**Issue**
- Client Payments and Staff Payments cards disappeared during UI restructuring

**Cause**
- Components were unintentionally removed during layout refactor

**Resolution**
- Restored cards as compact information panels

**Status**
Resolved

---

## Payment Management Page Crash on Save
**Issue**
- App crashes when updating payment amounts and clicking Save button on Payment Management page

**Cause**
- StaffDetailSection.tsx line 150 used `window.location.reload()` after saving payment updates
- Full page reload caused improper state management and app crash

**Resolution**
- Added `onPaymentUpdated` callback prop to StaffDetailSection component
- Passed `refreshData` from parent NewPaymentsPage component
- Replaced `window.location.reload()` with proper state refresh via `onPaymentUpdated()`

**Files Modified**
- src/components/payments/StaffDetailSection.tsx
- src/pages/NewPaymentsPage.tsx

**Status**
Resolved
