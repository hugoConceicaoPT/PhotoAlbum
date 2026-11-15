---
name: test-data-management
description: Manages safe, isolated, repeatable test data for unit, integration, API, and end-to-end testing.
---

# Test Data Management

## Purpose

Ensure test data is safe, predictable, isolated, and repeatable.

## Rules

- Never use production user data for routine testing.
- Prefer synthetic test data.
- Use dedicated test databases or isolated test schemas.
- Avoid sharing mutable test records between tests.
- Create only the data needed for each test.
- Clean up test data safely.
- Avoid destructive cleanup operations outside approved test environments.

## Test fixtures

Use reusable fixtures for:

- Users.
- Roles.
- Permissions.
- Application records.
- API requests.
- File metadata.

Keep fixtures understandable and maintainable.

## Sensitive data

Never include:

- Real credentials.
- Production tokens.
- Real user passwords.
- Private personal data.
- Production database dumps.

Use clearly synthetic values.

## Repeatability

Tests should produce consistent results regardless of execution order.

Avoid dependencies on existing records or manually prepared production state.

## Completion criteria

Test data must be isolated, safe, documented where necessary, and reproducible.