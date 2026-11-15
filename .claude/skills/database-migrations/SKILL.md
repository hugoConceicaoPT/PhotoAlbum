---
name: database-migrations
description: Defines safe, version-controlled PostgreSQL schema migration practices for the existing application.
---

# Database Migrations

## Purpose

Manage application-level PostgreSQL schema changes safely and consistently.

## Scope

This skill covers application database migrations only.

It does not cover PostgreSQL infrastructure administration or OCI Block Volume management.

## Before creating a migration

1. Inspect the current database schema.
2. Inspect existing migration files.
3. Identify the migration framework.
4. Understand affected tables and relationships.
5. Identify data integrity implications.
6. Consider application compatibility.
7. Identify rollback implications.

## Migration requirements

Every migration must:

- Be version-controlled.
- Follow existing project conventions.
- Have a clear purpose.
- Use appropriate PostgreSQL types.
- Maintain constraints and relationships.
- Avoid unnecessary destructive changes.
- Preserve existing data unless a change is explicitly approved.
- Be tested where possible.

## PostgreSQL practices

Use appropriate:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Indexes.
- Defaults.
- Nullability rules.

Consider transaction behavior and locking implications.

## Existing data

Never assume existing data can be discarded.

For destructive changes:

- Explain the impact.
- Identify affected data.
- Provide a safe migration strategy.
- Obtain approval where required.

## Testing

Verify:

- Migration application.
- Schema correctness.
- Data preservation.
- Constraints.
- Relevant application queries.
- Rollback behavior where supported.

Use local or approved test databases.

## Infrastructure restrictions

You may create application migrations.

You must not:

- Administer production PostgreSQL infrastructure.
- Configure OCI Block Volumes.
- Configure database backups.
- Configure database infrastructure replication.
- Modify production infrastructure.

## Completion criteria

A migration must be documented, tested, and compatible with the application's existing database architecture.