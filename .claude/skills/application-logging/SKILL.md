---
name: application-logging
description: Defines consistent, useful, and security-conscious logging practices for the Node.js application.
---

# Application Logging

## Purpose

Provide useful application logs for debugging and operational visibility without exposing sensitive information.

## Logging requirements

Follow the existing logging framework where possible.

Use consistent log levels:

- Error
- Warn
- Info
- Debug

## Log useful information

Where appropriate, log:

- Application events.
- Request failures.
- Validation failures.
- Authentication failures.
- Database operation failures.
- Object storage operation failures.
- Unexpected exceptions.
- Important application lifecycle events.

## Sensitive information

Never log:

- Passwords.
- Authentication tokens.
- Session secrets.
- API keys.
- OCI credentials.
- Full database connection strings.
- Sensitive personal information.
- Private file contents.

Redact sensitive fields where necessary.

## Error logging

Include enough context to investigate failures without exposing internal details to users.

Avoid returning stack traces or internal implementation details in production-facing API responses.

## Request correlation

Use request or correlation identifiers where supported by the existing application architecture.

Avoid logging unnecessary request bodies.

## Testing

Verify that:

- Important failures are logged.
- Sensitive values are redacted.
- Log levels are appropriate.
- Logging does not break application behavior.

## Infrastructure boundary

This skill covers application logging only.

Do not configure OCI logging services, cluster logging, monitoring infrastructure, or production observability resources.