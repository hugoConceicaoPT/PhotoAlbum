# CLAUDE.md — Project Instructions

## 1. Project Overview

This is an existing web application undergoing continued development and improvement.

All agents must inspect the existing implementation before making changes. Preserve existing functionality, architecture and conventions wherever possible.

The objective is to improve and extend the application without introducing unnecessary rewrites, dependencies or architectural complexity.

### Application Stack

- Frontend: React + TypeScript.
- Backend: Node.js + TypeScript.
- Database: PostgreSQL.
- Target orchestration: Oracle Kubernetes Engine (OKE).
- Target container registry: GitHub Container Registry (GHCR).
- Image storage: Oracle Cloud Infrastructure (OCI) Object Storage.
- Persistent database storage: OCI Block Volume.

The target architecture provides context for application development. Agents must ensure application code is compatible with this environment but are not responsible for provisioning, configuring or managing it.

---

## 2. General Development Principles

All agents must follow these principles:

- Inspect the existing implementation before making changes.
- Understand the current architecture and coding conventions.
- Reuse existing components, utilities, services and patterns wherever appropriate.
- Reuse relevant existing Claude Code skills rather than recreating them.
- Avoid unnecessary dependencies.
- Prefer simple, maintainable and modular solutions.
- Use TypeScript consistently.
- Avoid unnecessary changes outside the scope of the assigned task.
- Preserve existing functionality unless a change is explicitly requested.
- Do not assume infrastructure resources or external integrations are already configured.
- Ask for clarification when requirements are ambiguous or when a decision could significantly affect the architecture.
- Explain architectural deviations and their reasons.
- Never claim something has been tested, built or verified unless the operation was actually performed.

### Existing Application First

Before replacing an existing service or integration:

1. Inspect its current implementation.
2. Identify where and how it is used.
3. Identify its dependencies and affected components.
4. Understand existing data structures and workflows.
5. Plan the replacement while preserving existing functionality.
6. Identify any required data migration or compatibility changes.

Do not remove existing integrations until their replacements have been implemented and verified, unless explicitly instructed otherwise.

---

## 3. Frontend Development

The frontend uses React and TypeScript.

Agents working on the frontend must:

- Follow existing React and TypeScript conventions.
- Reuse existing components and design patterns.
- Keep components modular and maintainable.
- Separate presentation, business logic and data access appropriately.
- Use reusable components where appropriate.
- Handle loading, error, empty and success states.
- Implement appropriate form validation.
- Consider accessibility and responsive design.
- Avoid unnecessary state management complexity.
- Communicate with the backend through configurable API endpoints.
- Never connect directly to PostgreSQL.
- Never expose backend credentials, OCI credentials or other secrets to the browser.
- Implement image upload and display functionality through approved backend APIs.
- Keep frontend configuration independent of deployment environments.
- Never assume frontend and backend share the same origin.

### Figma Integration

The project has an existing Figma design.

The only Figma file agents must use as the design source is **PhotoMemory – Redesign**. Do not use any other Figma file, draft or page as a visual reference. If the file or a needed frame cannot be found or accessed through the Figma MCP, stop and report it instead of guessing.

Figma file URL: https://www.figma.com/design/CTIhmSkm8zDbhpWQuGIeiB/PhotoMemory-%E2%80%93-Redesign (fileKey: `CTIhmSkm8zDbhpWQuGIeiB`). Use this fileKey with the Figma MCP tools (call `create_session` first, then `get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs`). The file has a single top-level page (`0:1`); ask for a node-specific URL (`?node-id=`) when a particular frame is needed.

When implementing or modifying UI:

- Use the existing Figma design as the primary visual reference.
- Inspect relevant frames and components before implementation.
- Respect spacing, typography, colors, layout and responsive behavior.
- Reuse existing design-system components where available.
- Avoid arbitrary design decisions when the design already specifies the intended result.
- Report discrepancies or missing design information rather than inventing significant design changes.

### Figma Design Source of Truth

The existing Figma project is the primary design reference for frontend development.

Before implementing or modifying any frontend page, the Frontend Engineer must:

1. Inspect the specific Figma file, page and frames relevant to the assigned task.
2. Use the Figma MCP server to retrieve the design context.
3. Inspect relevant components, variables, typography, colors, spacing, assets and layout specifications.
4. Review responsive variants where available.
5. Identify interactions, navigation flows, form states, loading states, empty states and error states.
6. Compare the existing implementation with the corresponding Figma designs before making changes.

#### Design references

The project owner must provide the relevant Figma file URL and identify the pages, frames and user flows that are in scope.

Do not assume that every page in the Figma file is part of the current implementation task.

Do not invent design decisions when a relevant design already exists.

If a design is missing, ambiguous or inconsistent, report the issue and request clarification before making significant design decisions.

#### Implementation requirements

- Reuse existing design-system components where appropriate.
- Maintain visual consistency with the approved Figma designs.
- Preserve the intended responsive behavior.
- Use existing assets rather than creating unnecessary replacements.
- Do not modify the Figma source file.
- Report any deviations from the design and explain why they were necessary.

Figma is the design source of truth. The existing application architecture and project requirements remain the source of truth for technical implementation.

### Figma Rules

The frame inventory (IDs, sizes, links, known gaps) is in `docs/design/figma-reference.md`. Read it before any Figma work and keep it updated when the design scope changes.

- Only the **PhotoMemory – Redesign** file (`CTIhmSkm8zDbhpWQuGIeiB`) may be used. Never use another Figma file, draft or page.
- Only frames listed in `docs/design/figma-reference.md` are in scope. Do not assume unreferenced frames or pages are part of a task.
- Call `create_session` with the file key before any other Figma tool, and reuse the returned session id.
- Use Figma MCP for reading and inspecting only (`get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs`, `download_assets`). Never call tools that write to Figma (e.g. `use_figma`, `generate_figma_design`, `html_to_figma`, `send_code_to_figma`, `upload_assets`, `create_new_file`, `add_code_connect_map`, `send_code_connect_mappings`).
- Treat `get_design_context` output as a reference to adapt to the existing React and TypeScript code, reusing existing components and styles. Never paste it in as final code.
- Request one frame or node at a time. Do not walk the whole page; the file is large and the Figma MCP has plan-level rate limits.
- If a Figma call fails, is rate limited or returns nothing, stop and report it. Do not guess values, retry in a loop, or implement from memory.
- The file defines no variables or design tokens. Read colors, typography and spacing from the frame being implemented and reuse the existing application's theme values where they match. Report any mismatch.
- Password recovery, dashboard and tablet layouts have no Figma design. Tablet-specific layouts are not required (desktop and mobile follow the designs; intermediate widths must stay usable). Password recovery is in scope: propose a design consistent with Login and Registar, flag it as a proposal in `docs/design/figma-reference.md`, and get the owner to confirm it. Do not invent a dashboard.
- Loading, empty and error states are owned by the Frontend Engineer: design them in the existing design language and documented references, record them in `docs/design/figma-reference.md` as not-from-Figma, and coordinate with the Orchestrator and Backend Engineer where API behavior or error handling affects them.
- Desktop frames labelled "– proposed" are approved by the project owner as the design direction (decision recorded 2026-11-15).
- Implement desktop (1280 px) and mobile (390 px) from their own frames. Do not stretch one to cover the other.
- Do not export or commit real user photos. Use only assets exported from the approved frames or existing project assets.
- Report every deviation from the design, with the reason, in the task report.

### Local Design References (when Figma MCP is unavailable)

The Figma MCP can be rate limited or unavailable. In that case agents must keep working from local references instead of stopping, as long as the task is covered by them.

- Local screenshots of the approved frames are in `assets/` (repository root). The mapping from each screenshot to its Figma frame, node ID and app screen is in `docs/design/figma-reference.md` ("Local design screenshots"). Quote file paths: names contain accents and spaces.
- Use the order of authority: (1) Figma via MCP when available, (2) the screenshots in `assets/`, (3) `docs/design/figma-reference.md`. Approved Figma designs are the source of truth; screenshots and the reference doc are copies of them.
- Open the screenshot of every frame you implement or change and compare it with the running app before editing. Report differences before changing code.
- Treat as verified only what is visible in a screenshot or recorded as verified in the reference doc (layout, copy, structure, sampled colors). Fonts, font sizes, weights, line heights, spacing, radii and shadows cannot be read reliably from an image: do not guess them. Mark them as unverified, use the closest existing application value, and list them as pending a `get_design_context` check.
- Do not invent missing design details. Record each uncertainty in `docs/design/figma-reference.md` (open questions) and raise it with the project owner through the Orchestrator.
- Keep `docs/design/figma-reference.md` current: add verified details, resolved questions and any newly supplied screenshots, preserving existing information. Say which source each detail came from (screenshot, Figma MCP, owner decision).
- When Figma MCP becomes available again, inspect only the specific frames needed for the current task (the reference doc lists which ones). Do not request the whole file.
- Use theme tokens: introduce centralized, reusable tokens (colors, typography, spacing, borders and other recurring values) where needed to match the approved designs. Inspect the existing Bootstrap implementation first, keep Bootstrap if it remains suitable, and do not let its defaults block an accurate result. Avoid unnecessary rewrites.
- The screenshots are design references only. Do not copy them into the frontend source or serve them as application assets.

---

## 4. Backend Development

The backend uses Node.js and TypeScript.

Agents working on the backend must:

- Follow existing backend architecture and conventions.
- Keep routes, controllers, services and data-access logic appropriately separated.
- Implement clear API contracts.
- Validate request parameters, request bodies and uploaded files.
- Implement appropriate authentication and authorization.
- Use consistent error handling.
- Avoid exposing internal implementation details through API responses.
- Use environment variables for application configuration.
- Keep infrastructure-specific integrations isolated behind dedicated services or interfaces.
- Handle external service failures gracefully.
- Avoid hardcoded environment-specific values.
- Support independent execution from the frontend.
- Handle termination signals and graceful application shutdown.
- Provide application-level health endpoints where appropriate.

### API Design

- Use consistent endpoint naming and response structures.
- Apply appropriate HTTP methods and status codes.
- Validate all untrusted input.
- Protect sensitive endpoints with appropriate authorization.
- Implement pagination and filtering where appropriate.
- Avoid exposing database implementation details unnecessarily.
- Document significant API changes.
- Keep API behavior independent of the underlying deployment platform.

---

## 5. PostgreSQL

PostgreSQL is the application's database.

The intended production environment will host PostgreSQL separately, using OCI Block Volume for persistent storage.

This is architectural context only. Agents are responsible for application-level database development, not database infrastructure administration.

### Database Development Requirements

- Use PostgreSQL-compatible schemas and queries.
- Use parameterized queries.
- Keep database connection settings configurable through environment variables.
- Use migrations for schema changes.
- Preserve existing data structures unless a migration is required.
- Make migrations explicit and reviewable.
- Handle database connection failures safely.
- Use connection pooling where appropriate.
- Avoid unnecessary database queries.
- Implement appropriate indexes when justified.
- Use transactions when operations require consistency.
- Store image object keys and relevant metadata in PostgreSQL, not image binaries.
- Ensure application code works with a single PostgreSQL primary instance.

### Database Restrictions

Agents must not:

- Provision or configure PostgreSQL infrastructure.
- Configure OCI Block Volumes.
- Configure database persistence at the Kubernetes level.
- Implement infrastructure-level database replication.
- Implement production backup or restore automation.
- Expose the database publicly.
- Assume PostgreSQL can be scaled through ordinary application replica scaling.
- Use production database credentials for local development or testing.
- Perform destructive database operations without explicit approval.
- Modify or delete production data.

Database backups, persistent storage and recovery procedures belong to the infrastructure owner.

---

## 6. Oracle Cloud Object Storage

OCI Object Storage will replace Cloudinary for image and media storage.

Agents must implement application-level integration with OCI Object Storage.

### Integration Requirements

- Use the official OCI SDK for Node.js unless a documented reason justifies another integration.
- Keep Object Storage operations behind a dedicated backend service or abstraction.
- Assume private buckets by default.
- Keep OCI authentication credentials out of source code and container images.
- Prefer supported workload identity authentication for OKE workloads when available in the eventual deployment environment.
- Never expose long-lived OCI credentials to the frontend.
- Validate uploaded files by actual content, file type and size.
- Generate unique object names.
- Store object keys and relevant metadata in PostgreSQL, not image binaries.
- Implement authorized image access.
- Use narrowly scoped, expiring access URLs where appropriate.
- Handle failed uploads and deletions safely.
- Handle missing or inaccessible objects gracefully.
- Avoid coupling application business logic directly to OCI SDK calls.
- Keep the storage integration configurable without exposing credentials to the browser.

### Object Storage Restrictions

Agents must not:

- Create or delete OCI buckets.
- Modify bucket policies.
- Configure OCI IAM permissions.
- Configure OCI networking or access policies.
- Provision or manage OCI Object Storage resources.

If required resources or permissions are missing, document the requirement and report it to the project owner.

---

## 7. Target Production Architecture

The intended production architecture is:

### Application

- React + TypeScript frontend.
- Node.js + TypeScript backend.
- Separate frontend and backend production container images.
- Multi-stage production Docker builds.
- Minimal production images.
- Non-root container execution.
- Support for the target OKE worker architecture, including ARM64 when using Ampere processors.
- Pinned production image versions, preferably referenced by immutable digests.

### Kubernetes

The intended production Kubernetes architecture is:

- Frontend: Deployment and Service.
- Backend: Deployment and internal Service.
- PostgreSQL: StatefulSet with persistent storage.
- PostgreSQL initially uses one primary instance.
- PostgreSQL must use persistent OCI Block Volume storage.
- PostgreSQL and internal backend services remain private.
- Public access is limited to intended application endpoints.
- Ingress uses an appropriate OCI-supported solution.
- ConfigMaps hold non-sensitive configuration.
- Kubernetes Secrets or an approved external secret mechanism hold sensitive configuration.
- Workloads use appropriate resource requests and limits.
- Rolling deployments and graceful shutdown are supported.

### Container Registry

- GHCR is the intended production container registry.
- Production image publishing and registry configuration are outside agent responsibilities.

### Important Boundary

The production architecture is provided exclusively as application development context.

Agents must not create, modify, validate or manage the production deployment architecture.

They must not create Kubernetes resources, production container configurations or deployment artifacts.

---

## 8. Local Docker Development and Testing

Agents may use Docker exclusively to support local application development, debugging and testing.

This permission does not extend to production containerization or deployment.

### Permitted Activities

- Create and maintain frontend and backend Dockerfiles for local development and testing.
- Build local frontend and backend Docker images.
- Run and troubleshoot local containers.
- Create and maintain local Docker Compose configurations.
- Run local PostgreSQL test databases.
- Test frontend-to-backend communication.
- Test backend-to-database communication.
- Test application integrations using appropriately configured test credentials or mocks.
- Use safe local environment variables and `.env.example` files.
- Verify application functionality inside local containers.
- Use multi-stage builds where useful for local testing.
- Use non-root users where practical.

### Local Docker Security

- Never include real credentials or secrets in images.
- Never include `.env` files in images.
- Never include database data or uploaded images in images.
- Maintain appropriate `.dockerignore` files.
- Keep local configuration separate from production configuration.
- Use safe local test credentials.
- Do not assume local Docker configuration is production-ready.

### Docker Restrictions

Agents must not:

- Create production Dockerfiles or production container deployment configurations.
- Publish or push images to GHCR.
- Configure container registries.
- Create production container release workflows.
- Deploy containers to OKE or any remote environment.
- Create Kubernetes manifests.
- Create Helm charts or Kustomize configurations.
- Create Kubernetes Deployments, Services, StatefulSets, Ingresses, ConfigMaps or Secrets.

If local Docker configuration needs to be adapted to production infrastructure, agents must document the application requirements and leave production implementation to the project owner.

---

## 9. Security Requirements

Security must be considered throughout application development.

### General Security

- Never commit secrets, credentials, tokens or private keys.
- Never hardcode credentials in source code.
- Use environment variables or approved secret-management mechanisms for sensitive configuration.
- Validate and sanitize untrusted input.
- Apply appropriate authentication and authorization.
- Use secure HTTP headers.
- Configure CORS appropriately.
- Protect against CSRF where applicable.
- Protect against XSS.
- Use parameterized database queries.
- Avoid logging secrets, access tokens or sensitive personal information.
- Handle errors without leaking internal information.
- Apply rate limiting where appropriate.
- Validate uploaded files and restrict file sizes.
- Review dependencies for known vulnerabilities.
- Avoid unnecessary privileges and unnecessary Linux capabilities in local container configurations.
- Keep dependencies and application frameworks reasonably up to date.

### OCI Security Context

The target environment will use OCI IAM and workload permissions.

Agents must design integrations to support least-privilege access but must not create or modify OCI IAM policies or permissions.

If a required permission is missing, document the required access and explain why it is needed.

---

## 10. Testing and Quality Assurance

The existing project does not yet have a fully configured testing environment.

Agents should inspect the current state before introducing testing frameworks.

### Testing Requirements

- Establish an appropriate testing strategy.
- Add unit tests for important business logic.
- Add integration tests for backend APIs and database interactions.
- Add frontend component tests.
- Add end-to-end tests for important user workflows.
- Test authentication and authorization.
- Test validation and error handling.
- Test image upload and retrieval workflows.
- Test database migrations where appropriate.
- Test local Docker workflows when relevant.

### Suggested Testing Tools

- Vitest for unit testing.
- React Testing Library for React component testing.
- Playwright Test for browser-based end-to-end testing.
- Supertest for backend HTTP testing when compatible with the existing backend architecture.

Do not introduce all testing tools blindly. Inspect the existing project and select appropriate tools.

Tests must not use production data or production credentials.

### Test Reporting

Agents must distinguish between:

- Tests that were actually executed and passed.
- Tests that were executed and failed.
- Tests that could not be executed.
- Tests that have not yet been implemented.

Never report unexecuted tests as successful.

---

## 11. Strict Agent Responsibilities and Infrastructure Boundaries

Agents are application developers, not infrastructure or DevOps engineers.

### Agents May

- Develop frontend application code.
- Develop backend application code.
- Design and implement APIs.
- Create and maintain application-level database schemas and migrations.
- Integrate PostgreSQL into the application.
- Integrate OCI Object Storage into the application.
- Implement authentication and authorization.
- Implement application-level validation and error handling.
- Create and run automated tests.
- Create local Dockerfiles for development and testing.
- Create local Docker Compose configurations.
- Build and run local Docker images and containers.
- Debug local application environments.
- Maintain application documentation.
- Identify external infrastructure requirements and report them to the project owner.

### Agents Must Never

- Create, provision, modify or delete OCI infrastructure.
- Create or manage OKE clusters.
- Manage Kubernetes worker nodes or workloads.
- Create, modify or validate Kubernetes manifests.
- Create Helm charts or Kustomize configurations.
- Create or modify Kubernetes Deployments, Services, StatefulSets, Ingresses, ConfigMaps or Secrets.
- Create or modify OCI networking, VCNs, subnets, gateways or firewall rules.
- Create or modify OCI IAM policies or permissions.
- Create, modify or delete OCI Block Volumes.
- Create, modify or delete OCI Object Storage buckets.
- Configure GHCR or publish container images.
- Create production Docker configurations or deployment pipelines.
- Create or modify GitHub Actions or CI/CD workflows.
- Deploy application code to production or remote environments.
- Perform production database administration.
- Modify or delete production data or resources.
- Perform destructive infrastructure operations.

If a task requires any prohibited activity, agents must stop and explain the requirement to the project owner.

No agent may delegate prohibited infrastructure work to another agent.

Access to an external tool or integration does not grant permission to perform prohibited infrastructure or production operations.

---

## 12. Existing Skills and Tools

Agents should reuse relevant existing Claude Code skills and integrations whenever available.

Before creating a new skill or workflow:

1. Check whether a relevant skill already exists.
2. Inspect its instructions and capabilities.
3. Reuse it if it fits the task.
4. Adapt or extend it only when necessary.
5. Avoid creating duplicate skills.

Skills should support consistent application development, testing, security reviews and code quality.

MCP integrations may be used when relevant, subject to the project's security and permission boundaries.

Agents must not use tools or integrations to bypass infrastructure restrictions.

---

## 13. Workflow and Change Management

Before implementing a significant feature or architectural change:

1. Inspect the existing implementation.
2. Understand the relevant application components.
3. Identify dependencies and affected functionality.
4. Check relevant skills and project conventions.
5. Identify required environment variables and external integrations.
6. Prepare an implementation plan when the change is significant.
7. Identify potential compatibility or security issues.
8. Identify any infrastructure requirements that must be handled by the project owner.

During implementation:

- Keep changes focused.
- Avoid unnecessary rewrites.
- Preserve existing functionality.
- Follow established conventions.
- Keep changes understandable and maintainable.
- Ask for approval before significant architectural deviations.

After implementation:

1. Run relevant tests.
2. Verify TypeScript compilation.
3. Verify application builds.
4. Build and test local Docker images when relevant.
5. Review security implications.
6. Update relevant application documentation.
7. Report modified files.
8. Report tests and commands actually executed.
9. Identify unresolved issues and assumptions.
10. Document any external infrastructure requirements for the project owner.

Never claim that a test, build, security scan or verification succeeded unless it was actually executed.

---

## 14. Communication and Reporting

Agents must communicate clearly with the orchestrator and project owner.

When completing a task, provide:

- A concise summary of the implementation.
- Files created or modified.
- Important technical decisions.
- Tests executed and their actual results.
- Known limitations.
- Security considerations.
- Outstanding issues.
- External infrastructure requirements that need owner attention.

Separate confirmed findings from assumptions and recommendations.

Do not silently make significant architectural decisions.

---

## 15. MCP Usage Rules

- Figma MCP is for reading and inspecting approved designs only.
- Playwright MCP is for local development and testing only.
- Never use MCP tools to access production systems or data.
- Never expose credentials, tokens, cookies or secrets through MCP.
- Do not add or modify MCP servers without project owner approval.
- Review all MCP server configuration changes before accepting them.

---

## 16. Final Governing Principle

The target Oracle Cloud architecture is a constraint and reference for application development, not an instruction to manage infrastructure.

Agents are responsible for:

- Building and improving the application.
- Maintaining application code.
- Implementing PostgreSQL and OCI Object Storage integrations.
- Testing application functionality.
- Creating and using local Docker images for development and testing.

The project owner is responsible for:

- Oracle Cloud infrastructure.
- OKE cluster creation and management.
- Kubernetes manifests and configuration.
- Production container configuration.
- GHCR publishing and registry management.
- OCI Block Volumes, buckets, networking and IAM.
- Production deployment and operations.

**Application development and local testing are the agents' responsibility. Production infrastructure and deployment are exclusively the project owner's responsibility.**