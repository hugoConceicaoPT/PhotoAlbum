---
name: file-upload-handling
description: Implements secure file upload, validation, metadata management, and application-level storage workflows.
---

# File Upload Handling

## Purpose

Define secure and maintainable file upload behavior in the application.

## Scope

File upload processing is an application responsibility.

OCI bucket administration and infrastructure configuration remain the user's responsibility.

## Validation

Validate:

- Maximum file size.
- Allowed file types.
- File extensions.
- MIME types.
- File content where appropriate.
- Upload permissions.
- Required metadata.

Do not trust client-provided filenames or MIME types.

## File naming

- Generate unique object keys.
- Avoid using raw filenames as storage keys.
- Prevent path traversal.
- Avoid collisions.
- Preserve original filename only as metadata when needed.

## Storage

Use OCI Object Storage through the application's backend integration.

Keep uploaded objects private by default.

Store object references and metadata in PostgreSQL.

Do not store file binaries in PostgreSQL unless explicitly required by an approved design.

## Access control

Before allowing access:

- Authenticate the user where required.
- Verify authorization.
- Check resource ownership.
- Avoid exposing private objects.
- Use expiring signed URLs where appropriate.

## Error handling

Handle:

- Oversized files.
- Unsupported formats.
- Invalid content.
- Failed uploads.
- Missing objects.
- Unauthorized access.
- Storage errors.

## Testing

Test valid and invalid uploads, authorization, size limits, file types, and storage failure scenarios.

Use isolated test data.

## Completion criteria

Uploads must be validated, authorized, safely stored, and correctly associated with application records.