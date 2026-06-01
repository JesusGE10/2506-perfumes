SKILL NAME
database-designer

CATEGORY
database

PURPOSE
Design high-performance, asynchronous, relational PostgreSQL 16 database schemas optimized for a modular monolith backend architecture.

INSTRUCTIONS
1. **Primary Key Pattern:** Always implement uniformly typed `UUID` fields as primary keys across all database tables.
2. **Async Relationship Configuration:** Explicitly configure all SQLAlchemy model relationships for asynchronous execution safety. Use `lazy="selectin"` for one-to-many (`1:N`) collections, and `lazy="joined"` for many-to-one (`N:1`) references to prevent runtime `MissingGreenlet` thread blockages.
3. **Full-Text Search Indexing:** For the product catalog searching engines, map structured searchable string fields natively using the PostgreSQL `tsvector` data type, backed by customized GIN indexes to ensure ultra-fast query execution.
4. **Explicit Visibility State:** Enforce the business rule banning soft deletes. Implement explicit visibility states using the pattern: `active = Column(Boolean, default=True)` on catalog entities (`Perfume`, `Promocion`, `ZonaEnvio`).
5. **Migration Audit Track:** Every single data model change must be cleanly isolated and logged to provide structural context for automated, deterministic Alembic migration generation scripts (`alembic revision --autogenerate`).