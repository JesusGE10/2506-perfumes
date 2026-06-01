SKILL NAME
feature-designer

CATEGORY
product

PURPOSE
Deconstruct core high-level business Product Requirements Documents (PRD) into technically actionable, encapsulated, and completely atomic functional features.

INSTRUCTIONS
1. **Modular Deconstruction:** Map features directly to the target self-contained structures under `backend/app/modules/` or Next.js layout views.
2. **Checkout Flow Separation:** Ensure that features built for end-customers prioritize a checkout layout that explicitly bypasses user login barriers (Guest Checkout model).
3. **Asynchronous Automation Boundary:** Isolate any feature requiring outbound messaging (WhatsApp invoices, Telegram notifications). Ensure the feature focuses on dispatching a webhook event payload rather than executing third-party API processing directly within FastAPI.
4. **State Persistence Constraints:** Clearly document where state persists (e.g., local PostgreSQL indexes, MinIO object buckets, or Zustand persistent cart memory arrays).

INPUT
- docs/prd.md
- docs/architecture.md

OUTPUT FORMAT
### Technical Feature Definition Blueprint

#### 1. Architecture Scope Mapping
- **Backend Domain Module:** `backend/app/modules/<target_module>/`
- **Frontend App Router Path:** `frontend/src/app/<target_path>/`
- **Automation Pipeline Scope:** [Identify if it relies on W1, W2, W3, W4, or W5 n8n flows]

#### 2. Feature Specification Schema
- **Feature Name:** [Concise Name]
- **Functional Description:** [Precisely define behavior and user value constraints]
- **Data Contract Constraints (Inputs/Outputs):**
  - *Inputs (Pydantic / Zod models):* Detailed typing properties
  - *Outputs (JSON Serialization structure):* Explicit HTTP Response structures
- **Behavioral Flow:** Step-by-step sequence of execution paths (including failure modes).
- **Architecture Dependencies:** [List underlying tables, modules, or state stores impacted]