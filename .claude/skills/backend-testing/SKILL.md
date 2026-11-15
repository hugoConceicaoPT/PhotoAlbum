---
name: backend-testing
description: Defines testing practices for Node.js and TypeScript backend services, APIs, database interactions, and application integrations.
---

# Backend Testing

## Purpose

Ensure backend application behavior is correct, secure, and reliable.

## Testing tools

Prefer existing tools.

Recommended:

- Vitest.
- Supertest.

## Unit testing

Test:

- Business logic.
- Services.
- Utility functions.
- Validation.
- Error handling.
- Data transformations.

## API testing

Verify:

- HTTP methods.
- Routes.
- Request validation.
- Response structures.
- Status codes.
- Authentication.
- Authorization.
- Error responses.

## Database testing

Use isolated test databases or approved test environments.

Test:

- Queries.
- Constraints.
- Transactions.
- Migrations.
- Data integrity.
- Failure behavior.

Never use production data for ordinary automated tests.

## Object storage testing

Use mocks or approved isolated test resources.

Test:

- Upload.
- Retrieval.
- Deletion.
- Invalid files.
- Unauthorized access.
- Storage failures.
- Signed URL behavior where applicable.

## Test quality

- Keep tests repeatable.
- Avoid unnecessary external dependencies.
- Isolate test data.
- Clean up test resources.
- Avoid destructive operations outside test environments.
- Do not mock the behavior that the test is intended to verify.

## Completion criteria

Important backend behavior must have appropriate automated coverage, and actual test execution results must be reported.