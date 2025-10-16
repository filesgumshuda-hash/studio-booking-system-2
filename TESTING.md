# Testing Guide

## Setup

To run the tests, you need to install the testing dependencies first:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom happy-dom
```

## Running Tests

After installing dependencies, you can run tests using:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Unit Tests
- `src/components/bookings/RichBookingCard.test.tsx` - Tests for the RichBookingCard component
  - Verifies card click handlers work correctly
  - Tests keyboard navigation (Enter and Space keys)
  - Validates rendering of booking information
  - Checks accessibility attributes

### Integration Tests
- `src/pages/BookingsPage.test.tsx` - Tests for the BookingsPage
  - Tests the complete user flow of viewing bookings
  - Verifies modal opening/closing functionality
  - Tests filtering and searching
  - Validates role-based access control

## Bug Fix Summary

### Issue: Button Click Not Opening Modal

**Problem:** Clicking on booking cards (specifically the "Shoot Scheduled" status area shown in the screenshot) was not opening the booking detail modal.

**Root Cause:** The card had a click handler, but it lacked proper accessibility attributes and keyboard support, which could cause issues in certain scenarios.

**Solution:**
1. Added explicit `handleCardClick` function for clarity
2. Added `role="button"` attribute for accessibility
3. Added `tabIndex={0}` to make the card keyboard-focusable
4. Implemented `onKeyDown` handler for Enter and Space key support
5. Added comprehensive tests to prevent regression

**Files Modified:**
- `src/components/bookings/RichBookingCard.tsx` - Enhanced click handling and accessibility

**Files Created:**
- `vitest.config.ts` - Vitest configuration
- `src/test/setup.ts` - Test environment setup
- `src/test/utils.tsx` - Test utilities and custom render function
- `src/components/bookings/RichBookingCard.test.tsx` - Unit tests
- `src/pages/BookingsPage.test.tsx` - Integration tests

## Test Coverage

The tests cover:
- ✅ Card click functionality
- ✅ Keyboard navigation (Enter/Space)
- ✅ Booking information rendering
- ✅ Payment status display
- ✅ Progress bar rendering
- ✅ Status badge display
- ✅ Empty state handling
- ✅ Modal opening/closing
- ✅ Search and filter functionality
- ✅ Accessibility attributes

## Notes

- Tests use React Testing Library for user-centric testing
- Vitest is used as the test runner (better integration with Vite)
- Mock data is provided through custom render utilities
- Context providers (Auth and App) are automatically mocked in tests
