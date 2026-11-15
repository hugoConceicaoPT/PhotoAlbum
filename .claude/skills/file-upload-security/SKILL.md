---
name: file-upload-security
description: Reviews and enforces application-level security controls for file uploads and OCI Object Storage access.
---

# File Upload Security

## Purpose

Prevent malicious, unauthorized, or unsafe file uploads and protect stored objects.

## Validation controls

Review:

- File size.
- Allowed extensions.
- MIME types.
- Actual file content.
- Filename handling.
- Object key generation.
- Upload authorization.

Never rely solely on the file extension or client-provided content type.

## Access control

- Authenticate users where required.
- Enforce backend authorization.
- Verify resource ownership.
- Keep private objects private.
- Restrict access to authorized users.
- Use expiring signed URLs where appropriate.

## Storage security

For OCI Object Storage:

- Keep credentials out of frontend code.
- Avoid hardcoded secrets.
- Use the approved application authentication method.
- Generate unique object keys.
- Avoid predictable object references.
- Validate access before issuing download links.

## Risk areas

Review for:

- Path traversal.
- Malicious file content.
- Oversized uploads.
- MIME type spoofing.
- Unauthorized uploads.
- Unauthorized retrieval.
- Insecure direct object references.
- Public exposure of private files.
- Credential leakage.

## Testing

Use safe test files and isolated environments.

Test rejection of invalid files, access control, and upload limits.

Do not upload malicious payloads to production systems.

## Infrastructure boundary

Review application code only.

Do not configure OCI buckets, IAM policies, OKE, or infrastructure-level malware scanning services.