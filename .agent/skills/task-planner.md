SKILL NAME
task-planner

CATEGORY
management

PURPOSE
Translate system architectures and feature blueprints into highly atomic, sequential, and technical development tasks with precise tracking vectors.

INSTRUCTIONS
1. **Strict Pipeline Ordering:** Structure task chains strictly in accordance with the mandatory architecture order: Database Design -> Migrations -> Backend Route Mappings -> Frontend UI Components -> n8n Webhook Orquestations.
2. **Decouple Implementation Scopes:** Ensure every task is self-contained and explicitly addresses a single module or routing structure to avoid multi-module overlap.
3. **Enforce Technical Criteria:** Tasks must specify exact requirements (e.g., asynchronous SQLAlchemy models, strict mobile-first CSS modules, Zod frontend schemas, or webhook payload validation).

INPUT
- docs/architecture.md

OUTPUT FORMAT
### Technical Task Execution Plan

#### 1. Prerequisites Graph
[Clearly describe the sequential dependency hierarchy of the task blocks]

#### 2. Actionable Task Inventory
- **Task ID:** `TSK-00X`
- **Scope Division:** [Backend Module / Frontend App Router / n8n Workflow]
- **Target Directories:** `exact/paths/to/affected/folders/`
- **Title:** [Technical task name]
- **Description:** [Deep technical specification of the implementation requirement]
- **Dependencies:** [IDs of tasks that must be merged beforehand]
- **Expected Production Result:** [Measurable criteria: e.g., "Alembic revision created, async endpoint testing yielding status 200 OK"]