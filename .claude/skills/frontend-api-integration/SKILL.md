---
name: frontend-api-integration
description: Integrates React and TypeScript frontend features with the application's documented Node.js backend APIs.
---

# Frontend API Integration

## Purpose

Provide reliable integration between the React frontend and backend APIs.

## Before integration

Identify:

- Existing API client.
- API base URL configuration.
- Authentication mechanism.
- Request conventions.
- Response conventions.
- Error handling.
- Type definitions.
- Existing hooks and services.

Reuse existing implementation patterns.

## API contracts

Follow the agreed API contract.

Do not invent:

- Endpoint paths.
- HTTP methods.
- Request fields.
- Response properties.
- Authentication behavior.

Coordinate missing or inconsistent information with the Backend Engineer.

## Implementation requirements

- Use TypeScript types for requests and responses.
- Reuse the existing API client.
- Avoid duplicated request logic.
- Handle loading states.
- Handle empty responses.
- Handle validation errors.
- Handle authentication errors.
- Handle network failures.
- Avoid exposing sensitive information.
- Avoid logging credentials or tokens.

## Authentication

Follow the application's existing authentication architecture.

Do not store sensitive credentials insecurely.

Do not assume that frontend authentication checks replace backend authorization.

## User experience

Provide appropriate feedback for:

- Loading.
- Successful operations.
- Validation failures.
- Authorization failures.
- Network failures.
- Unexpected server errors.

Avoid displaying raw internal server errors.

## Testing

Test:

- Successful API calls.
- Failed API calls.
- Empty responses.
- Invalid requests.
- Authentication failures.
- Loading states.
- Error presentation.

## Completion criteria

Integration is complete when:

- The documented contract is followed.
- Type definitions are consistent.
- Errors are handled.
- Relevant user flows work.
- Tests cover important scenarios.