---
name: authentication-authorization
description: Defines application-level authentication and authorization requirements for the React, Node.js, and PostgreSQL application.
---

# Authentication and Authorization

## Purpose

Implement and review secure application-level authentication and authorization.

## Authentication

Inspect the existing authentication architecture before making changes.

Requirements:

- Verify user identity securely.
- Handle passwords using appropriate password hashing.
- Protect authentication endpoints.
- Handle sessions or tokens securely.
- Implement appropriate expiration.
- Handle logout correctly.
- Avoid exposing credentials.
- Avoid logging tokens or passwords.

Do not introduce a new authentication provider without user approval.

## Authorization

Authorization must be enforced on the backend.

Verify:

- User roles.
- Resource ownership.
- Permissions.
- Protected operations.
- Administrative privileges.
- Access to sensitive data.

Never rely exclusively on frontend permission checks.

## PostgreSQL integration

Where appropriate:

- Store user and permission data securely.
- Use parameterized queries.
- Maintain referential integrity.
- Avoid exposing sensitive database fields.
- Follow existing schema conventions.

## Frontend integration

The frontend may:

- Display authentication state.
- Hide or show appropriate controls.
- Redirect unauthenticated users.
- Display authorization errors.

These behaviors are usability features, not security boundaries.

## Security considerations

Review:

- Session fixation.
- Token leakage.
- Insecure cookie settings.
- CSRF where applicable.
- Brute-force protection.
- Account enumeration.
- Privilege escalation.
- Insecure password recovery.

## Testing

Test:

- Valid authentication.
- Invalid credentials.
- Expired sessions or tokens.
- Logout.
- Unauthorized requests.
- Forbidden operations.
- Resource ownership.
- Role-based access.

## Completion criteria

Authentication and authorization must be enforced consistently and verified through backend tests.