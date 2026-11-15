---
name: oci-object-storage
description: Implements secure application-level integration with Oracle Cloud Infrastructure Object Storage for images and media.
---

# OCI Object Storage Integration

## Purpose

Implement the application's integration with OCI Object Storage.

OCI Object Storage replaces Cloudinary as the application's image and media storage solution.

## Scope

This skill covers application code only.

It does not authorize infrastructure provisioning, bucket administration, IAM policy changes, or OKE configuration.

## Integration requirements

- Use the official OCI SDK for Node.js where appropriate.
- Follow the existing backend architecture.
- Keep OCI credentials out of frontend code.
- Never hardcode long-lived credentials.
- Prefer OKE workload identity when configured by the infrastructure owner.
- Use configuration supplied through the approved application environment.

## Object management

Implement appropriate application services for:

- Uploading objects.
- Retrieving object information.
- Deleting objects.
- Generating unique object keys.
- Handling object access.
- Handling storage errors.

## PostgreSQL relationship

Store relevant metadata in PostgreSQL, such as:

- Object key.
- Original filename where appropriate.
- Content type.
- File size.
- Owner or associated record.
- Upload timestamp.

Store object keys and metadata, not image or media binaries, in PostgreSQL.

## Security

- Keep buckets private by default.
- Validate authorization before object access.
- Validate uploaded content.
- Use unique object keys.
- Avoid predictable object names.
- Use expiring signed URLs where appropriate.
- Avoid exposing credentials or sensitive object metadata.
- Do not trust client-provided object keys.

## Error handling

Handle:

- Authentication failures.
- Authorization failures.
- Missing objects.
- Upload failures.
- Network failures.
- Invalid files.
- Expired signed URLs.

Avoid exposing internal storage errors to users.

## Configuration documentation

You may document:

- Required environment variables.
- Required application configuration.
- Required OCI permissions.
- Expected bucket configuration.
- Integration assumptions.

The user is responsible for creating buckets and configuring OCI IAM permissions and infrastructure.

## Testing

Use mocks or approved isolated resources to test:

- Uploads.
- Retrieval.
- Deletion.
- Authorization.
- Invalid files.
- Storage failures.
- Signed URL behavior.

## Prohibited activities

Do not:

- Create OCI buckets.
- Modify OCI IAM policies.
- Provision OCI resources.
- Configure OKE.
- Manage OCI networking.
- Perform production infrastructure changes.

## Completion criteria

The application must integrate securely with OCI Object Storage while leaving all infrastructure administration to the user.