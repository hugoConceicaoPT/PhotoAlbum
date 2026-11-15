---
name: dependency-audit
description: Reviews frontend and backend dependencies for known vulnerabilities, outdated packages, suspicious changes, and compatibility risks.
---

# Dependency Audit

## Purpose

Assess the security and maintenance risks associated with application dependencies.

## Scope

Review:

- Frontend dependencies.
- Backend dependencies.
- Development dependencies.
- Transitive dependencies.
- Lockfiles.
- Package scripts.

## Tools

Use available tools where appropriate:

- npm audit.
- Semgrep.
- Existing dependency analysis tools.

## Review process

1. Inspect package.json files.
2. Inspect lockfiles.
3. Identify installed dependencies.
4. Identify known vulnerabilities.
5. Identify deprecated or unmaintained packages where evidence is available.
6. Identify unnecessary or suspicious dependencies.
7. Assess compatibility and upgrade risks.
8. Report findings.

## Vulnerability assessment

For each finding, include:

- Package name.
- Installed version.
- Vulnerable version range where known.
- Severity.
- Advisory or source.
- Affected dependency path.
- Potential impact.
- Recommended remediation.

Distinguish direct dependencies from transitive dependencies.

## Remediation

Do not automatically update all dependencies.

Before proposing upgrades:

- Check breaking changes.
- Check application compatibility.
- Check framework compatibility.
- Review lockfile impact.
- Recommend targeted updates.

Make changes only when authorized.

## Security boundaries

Do not expose package secrets or registry credentials.

Do not publish packages or images.

Do not modify production infrastructure or deployment pipelines.

## Completion criteria

Provide an evidence-based dependency report with prioritized remediation recommendations.