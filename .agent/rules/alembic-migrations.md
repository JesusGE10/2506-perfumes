---
trigger: always_on
---

# Asynchronous Alembic Database Migration Strategy

PostgreSQL 16 operates strictly in 100% Asynchronous Mode via SQLAlchemy 2.x and `asyncpg`. Agents executing or planning structural data mutations MUST enforce these strict migration invariants to eliminate EasyPanel production container deadlocks.

## 1. Migration Code Constraints

- **Strict Async Execution:** Generated migration revision files MUST utilize the async execution loop wrapper inside `env.py`.
- **Foreign Key Definitions:** All structural foreign keys (`ForeignKey`) definitions MUST explicitly specify `ondelete="CASCADE"` or `ondelete="SET NULL"` parameters to avoid orphan runtime records in relational cascades.
- **Index Isolation:** GIN index structures over text attributes or `tsvector` mapping layouts MUST be defined inside the `upgrade()` block explicitly relying on `postgresql_using='gin'`.

## 2. Deterministic Execution Pipeline

Before applying changes into the database layer, the Agent must document the migration blueprint tracking these exact metrics:
1. **Target Model File:** Location of modified SQLAlchemy class declarations.
2. **Down-Revision Validation:** Ensure the auto-generated script correctly assigns the previous schema hash ID into the `down_revision` metadata string variable to protect sequential migration line tracing.