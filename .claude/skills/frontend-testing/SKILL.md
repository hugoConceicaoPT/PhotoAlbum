---
name: frontend-testing
description: Defines frontend testing practices for React and TypeScript components, interactions, forms, and user workflows.
---

# Frontend Testing

## Purpose

Ensure frontend components and user interactions work as expected.

## Testing tools

Prefer existing project tools.

Recommended:

- Vitest.
- React Testing Library.
- Playwright for end-to-end tests.

## Unit tests

Test:

- Utility functions.
- Custom hooks.
- Component rendering.
- Conditional rendering.
- Data transformations.
- Validation logic.

## Component tests

Verify:

- Expected content.
- User interactions.
- Form behavior.
- Accessibility basics.
- Loading states.
- Error states.
- Empty states.
- Disabled states.

## API-related tests

Verify frontend behavior for:

- Successful responses.
- Failed requests.
- Invalid responses.
- Network errors.
- Authentication failures.
- Authorization failures.

Mock external API interactions appropriately for isolated component tests.

## End-to-end tests

Use Playwright for important user journeys.

Examples:

- Login.
- Registration.
- Navigation.
- Form submission.
- Creating and editing records.
- File upload.
- Permission-restricted workflows.

## Test quality

- Prefer user-visible behavior over implementation details.
- Avoid brittle selectors.
- Use accessible queries where practical.
- Keep tests independent.
- Avoid arbitrary delays.
- Avoid relying on production services.
- Keep test data isolated.

## Completion criteria

Tests must be repeatable and validate meaningful behavior.

Report executed, passed, failed, and skipped tests separately.