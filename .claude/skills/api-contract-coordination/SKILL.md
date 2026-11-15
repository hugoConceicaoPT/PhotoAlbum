---
name: api-contract-coordination
description: Coordinates API contracts between the React frontend and Node.js backend to ensure consistent integration.
---

# API Contract Coordination

## Purpose

Establish consistent API contracts between frontend and backend development.

## Required contract information

Every API endpoint should document:

- Endpoint name.
- HTTP method.
- URL path.
- Purpose.
- Authentication requirements.
- Authorization requirements.
- Request headers.
- Request parameters.
- Request body.
- Successful response.
- Error responses.
- HTTP status codes.
- Validation rules.

## Contract design rules

1. Follow existing API conventions.
2. Use consistent naming.
3. Use appropriate HTTP methods.
4. Use predictable response structures.
5. Define error response formats.
6. Document optional and required fields.
7. Define pagination and filtering conventions where applicable.
8. Avoid exposing internal implementation details.
9. Define authorization requirements.
10. Use TypeScript types where appropriate.

## Frontend responsibilities

The Frontend Engineer must:

- Follow the agreed contract.
- Use the documented request and response types.
- Handle all documented error states.
- Avoid inventing endpoints or response properties.
- Report contract inconsistencies.

## Backend responsibilities

The Backend Engineer must:

- Implement the agreed contract.
- Validate requests.
- Return documented response structures.
- Use appropriate HTTP status codes.
- Enforce authentication and authorization.
- Document any necessary contract changes.

## Contract changes

If an API contract changes:

1. Identify affected frontend components.
2. Identify affected backend components.
3. Notify the orchestrator.
4. Update documentation and TypeScript types.
5. Update tests.
6. Verify compatibility.

Do not silently change API contracts.

## Completion criteria

An API contract is ready for integration when:

- Request and response structures are documented.
- Authentication requirements are clear.
- Error behavior is defined.
- Frontend and backend responsibilities are agreed.
- Relevant tests are identified.