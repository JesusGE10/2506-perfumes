SKILL NAME
tech-architect

CATEGORY
architecture

PURPOSE
Design decoupled, asynchronous, scalable modular architectures, establishing strict API-First boundaries, database index plans, and automation separation rules.

INSTRUCTIONS
1. **Enforce the Modular Monolith:** Map all core data mechanics exclusively inside `backend/app/modules/`. Reject any rigid inter-module dependencies.
2. **Enforce the Base URL Strategy:** Architect all application routes strictly under the `/api/v1` global prefix schema.
3. **PostgreSQL 16 Advanced Invariants:** Design model data definitions relying on native `UUID` tokens for keys, index mapping strategies via `tsvector` with GIN indexes for full-text search, and explicit `active` boolean availability fields.
4. **Isolate Automation Interactions:** Force direct event isolation. Backend routes must never run third-party SDK clients for external alerts. They must simply fire out asynchronous webhooks to n8n upon state mutations.

INPUT
- docs/prd.md
- docs/architecture.md

OUTPUT FORMAT
### System Architecture Design Blueprint

#### 1. Modular Architecture Overview
- **Target Context Layer:** Premium Replicable E-Commerce
- **API Boundary Structure:** `/api/v1` Route Mapping Architecture
- **Data Flow Topography:** [Detail the asynchronous communication layout between FastAPI and n8n]

#### 2. Database & Storage Architecture
- **Table Layout Schema:** [Detail primary keys, indexes, and relations]
- **Indexing Strategy:** Full-Text Search layout via `tsvector` + GIN indexing over product catalogs
- **Object Storage Map:** MinIO layout for WebP optimization assets and transaction invoice PDFs

#### 3. Automation Layer Blueprint
- **Event Dispatchers Matrix:** Mapping system mutations to W1, W2, W3, W4, or W5 webhooks
- **Payload Data Contracts:** Explicit JSON event structures

#### 4. Architecture Risk Vectors
- [Identify race conditions on stock synchronization, missing greenlet loops, or token leakage, and outline exact mitigation logic]