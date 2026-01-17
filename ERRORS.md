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

---

## Payment Amount Accumulating Instead of Updating
**Issue**
- When updating a payment amount (e.g., from 100 to 200), the system would accumulate values instead of replacing them (showing 300 after update)
- Multiple duplicate payment records were being created in the database

**Cause**
- `saveEventAmount` function used `.maybeSingle()` which could fail when duplicate records existed
- `getEventAmount` function sums ALL payment records for a staff+event+type combination
- When duplicates existed, query would fail and create another record instead of updating

**Resolution**
- Changed query to fetch ALL existing payment records instead of using `.maybeSingle()`
- Logic now updates the first record and deletes any duplicates
- Ensures only one payment record exists per staff+event+type combination

**Files Modified**
- src/components/payments/StaffDetailSection.tsx (saveEventAmount function)

**Status**
Resolved

---

## Payment Status Display Issues in Booking Detail
**Issue**
- Package Amount showed "₹0" instead of indicating the value is not set
- "View Payment History" button navigated to client payments page but didn't pre-select the client
- "Agreed Payment" in Booking Details showed different amount than "Total Agreed" in Client Payments page

**Cause**
- Payment Status section displayed 0 for unset package amounts instead of "Not set"
- Navigation didn't pass client ID to the destination page
- Booking Details modal used `booking.package_amount` field while Client Payments page calculated from payment records with "Agreed" status

**Resolution**
- Changed both Booking Details and Payment Status sections to calculate "Agreed Payment" from payment records (same as Client Payments page)
- Both now sum all payment records with status "Agreed" for the booking
- Outstanding shows "N/A" when agreed amount is 0
- "View Payment History" now navigates with client_id in state
- ClientPaymentsPage now auto-selects client from navigation state and scrolls to details

**Files Modified**
- src/components/bookings/BookingDetailModal.tsx
- src/pages/ClientPaymentsPage.tsx

**Status**
Resolved
