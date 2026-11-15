---
name: project-rules
description: Enforces the project's architecture, development conventions, and strict separation between application development and infrastructure responsibilities.
---

# Project Rules

## Purpose

Ensure all agents follow the application's architecture, project conventions, and infrastructure restrictions.

## Application architecture

The application uses:

- Frontend: React and TypeScript.
- Backend: Node.js and TypeScript.
- Database: PostgreSQL.
- Production object storage: OCI Object Storage.
- Target production environment: Oracle Kubernetes Engine (OKE).
- Container registry: GitHub Container Registry (GHCR).
- Persistent PostgreSQL storage: OCI Block Volume.

This architecture provides context for application compatibility.

It does not authorize agents to manage infrastructure or deployment.

## General development rules

1. Inspect the existing codebase before making changes.
2. Preserve existing architecture unless a change is justified and approved.
3. Reuse existing components, utilities, and dependencies.
4. Avoid unnecessary dependencies.
5. Use TypeScript consistently.
6. Avoid `any` unless there is a documented reason.
7. Follow existing naming and formatting conventions.
8. Write maintainable, modular code.
9. Validate inputs on the backend.
10. Handle errors consistently.
11. Write appropriate tests.
12. Document important architectural decisions.
13. Avoid unrelated modifications.

## Frontend rules

- Use React and TypeScript.
- Follow the existing component architecture.
- Follow the **PhotoMemory – Redesign** Figma file as the only Figma design source.
- Implement responsive layouts.
- Maintain accessibility.
- Integrate with documented backend APIs.
- Handle loading, error, success, and empty states.
- Never rely on frontend validation as a security boundary.

## Backend rules

- Use Node.js and TypeScript.
- Follow existing backend framework conventions.
- Maintain clear separation of routes, controllers, services, and data access where appropriate.
- Validate all untrusted input.
- Enforce authentication and authorization on the backend.
- Use parameterized SQL or safe database abstractions.
- Use appropriate transactions.
- Avoid exposing sensitive information in responses or logs.

## PostgreSQL rules

- PostgreSQL is the relational database.
- Application-level schema changes must use version-controlled migrations.
- Maintain data integrity and appropriate constraints.
- Do not introduce another database without approval.
- Do not perform infrastructure administration.

## OCI Object Storage rules

- Use OCI Object Storage for application image and media storage.
- Use the official OCI Node.js SDK where appropriate.
- Never hardcode long-lived credentials.
- Never expose OCI credentials to the frontend.
- Keep objects private by default.
- Validate uploaded files.
- Generate unique object keys.
- Store object keys and metadata in PostgreSQL, not file binaries.
- Use authorized access and expiring signed URLs where appropriate.
- Document required permissions, but do not configure IAM.

## Local Docker rules

Agents may create:

- Local development Dockerfiles.
- Local Docker images.
- Docker Compose configurations for local development and testing.
- Local PostgreSQL test environments.

These configurations are exclusively for local development and testing.

They must not become production deployment configurations.

## Strict infrastructure restrictions

### Allowed

- Application development.
- Application database integration.
- Application-level migrations.
- Application-level OCI Object Storage integration.
- Application health endpoints.
- Graceful application shutdown.
- Local Docker development and testing.
- Automated testing.

### Prohibited

- Kubernetes manifests.
- Helm charts.
- Kustomize configurations.
- OKE cluster configuration.
- OCI infrastructure creation or modification.
- OCI IAM policy creation or modification.
- Production Docker configurations.
- GHCR image publishing.
- Production deployments.
- CI/CD and production release pipelines.
- Production infrastructure administration.

No agent may delegate prohibited work to another agent.

If a task requires prohibited work, explain the requirement and leave it to the user.

## Change management

Before modifying files:

1. Understand the existing implementation.
2. Identify affected components.
3. Check dependencies.
4. Consider compatibility.
5. Define expected behavior.
6. Identify required tests.

After modifying files:

1. Review the diff.
2. Run relevant tests.
3. Check for regressions.
4. Report changed files.
5. Document unresolved issues.

## Governing principle

Agents develop and test the application.

The user manages infrastructure, production deployment, cluster administration, and production operations.