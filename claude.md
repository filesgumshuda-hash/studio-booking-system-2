# Cloud Code Instructions (cloud.md)

## Project Overview
This is a **Photo Studio Management Web App** used by studio owners to manage:
- Bookings & events
- Staff assignments
- Client payments
- Staff payments
- Expenses & profit tracking

The app is already implemented and functional.
Most changes requested will be **UI/UX refinements, layout adjustments, and small feature additions**, not full rewrites.

---

## Primary Goals
1. Keep the app **stable and readable**
2. Avoid breaking existing flows
3. Make incremental, focused changes
4. Prefer clarity over cleverness

---

## Non-Negotiable Rules
- ❌ Do NOT remove existing features or data
- ❌ Do NOT rename routes, APIs, or DB fields unless explicitly asked
- ❌ Do NOT rewrite large parts of the app without approval
- ❌ Do NOT introduce unnecessary libraries

- ✅ Small, scoped changes only
- ✅ Preserve existing logic
- ✅ UI changes should be isolated to components

---

## UI & Design Rules
- Use **consistent typography**
- Avoid random font sizes or weights
- Use spacing instead of borders where possible
- Color rules:
  - Green → profit / success
  - Red → expense / warnings
  - Neutral → default
- Keep dashboards **compact and information-dense**
- Avoid visual noise

---

## Coding Standards
- Prefer simple, readable code
- Use existing components and patterns
- Avoid over-abstraction
- Reuse styles and utilities instead of duplicating
- Keep components small and focused

---

## Change Workflow (IMPORTANT)
For every change:
1. Identify the **exact component(s)** affected
2. Explain what will change (briefly)
3. Implement the change
4. Do NOT refactor unrelated code
5. Do NOT change formatting globally

---

## Running the Project
(Claude: detect the correct command from the repo)

Typical flow:
- Install dependencies if needed
- Run the dev server
- Verify the dashboard loads correctly

If a restart is needed:
- Restart the dev server only
- Do not reset data unless explicitly asked

---

## Testing Expectations
- Ensure dashboard loads without errors
- Verify key sections remain visible:
  - KPI strip
  - Finance summary
  - Client payments
  - Staff payments
  - Expenses
  - Agenda
  - Recent activity

No formal test suite required unless explicitly requested.

---

## Communication Style
- Be concise
- Ask for clarification only if absolutely necessary
- Prefer implementation over discussion
- Highlight risks before making breaking changes

---

## Default Assumption
Unless explicitly stated:
- This is a **UI refinement task**
- Existing behavior should remain unchanged

---

## Project Memory Files

Before making any changes:
- Read `SESSION.md` to understand recent context
- Read `ERRORS.md` to avoid repeating past issues

After making changes:
- Update `SESSION.md` with a brief summary
- Update `ERRORS.md` only if a non-trivial bug was fixed

Behavioral Rules for Future Sessions

Always read cloud.md, SESSION.md, and ERRORS.md before making changes

Keep session updates short and factual

Do not log minor or trivial errors

Treat these files as authoritative project memory
