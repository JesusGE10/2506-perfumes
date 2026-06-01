---
trigger: always_on
---

# AI Web SaaS Development Framework - Premium E-Commerce

## 1. Workspace Objective & Strict Stack

This workspace operates as a multi-agent AI software development team specialized in building a modular premium e-commerce platform. All code generation MUST conform exclusively to the following technology stack. Utilizing unlisted alternatives (such as Django, Supabase Client, Apache) is strictly forbidden.

- **Backend:** Python 3.12, FastAPI (100% Asynchronous Mode)
- **Frontend:** Next.js 15.x (App Router), React 19.x, Strict TypeScript
- **Persistence:** Native PostgreSQL 16 (Operated asynchronously via SQLAlchemy 2.x & Alembic migrations)
- **Object Storage:** MinIO (S3 API Compatible) for WebP images and invoice PDFs
- **Frontend State:** Zustand 5.x for persistent shopping cart state
- **Forms & Validation:** React Hook Form 7.x + Zod 3.x
- **Automation Engine:** n8n (Checkout orchestration triggered via asynchronous Webhooks)
- **Deployment Platform:** EasyPanel (VPS with Traefik reverse proxy and automatic SSL)

## 2. Core Engineering Principles

### Simplicity (KISS)
Solutions must prioritize clarity, simplicity, and maintainability. Avoid unnecessary abstractions, premature optimization, or premature microservices. Prefer simple, modular architectures.

### Modularity (DRY)
Avoid duplicated logic. Code should be structured into small reusable modules where each module has a clear and distinct responsibility.

### Pragmatic Scalability
Applications should support multiple concurrent users without introducing unnecessary complexity. Prefer monolithic modular architectures instead of microservices.

## 3. Agent Responsibilities & Skills Assignment

- **Project Manager:** Coordinates the development workflow, determines current stage, and triggers the appropriate agent. Does not generate technical artifacts.
- **Product Manager:** Defines product requirements, PRDs, feature definitions, and user flows.
- **Software Architect:** Responsible for technical design, system architecture, DB schema, API design, and task planning. Uses `tech-architect`, `database-designer`, and `task-planner`.
- **Developer:** Responsible for implementing backend, API endpoints, frontend views, and n8n integrations. Uses `fullstack-builder` and `database-designer`.
- **QA Engineer:** Validates system behavior via unit, API, integration, and E2E tests using `pytest` and `playwright`. Uses `test-generator`.
- **Code Reviewer:** Evaluates code quality, architectural integrity, and clean practices using `code-reviewer`.
- **Refactor Engineer:** Improves structure and removes duplication without altering system behavior using `refactor-engineer`.
- **Cybersecurity Engineer:** Identifies vulnerabilities matching OWASP Top 10, input validation flaws, and auth safety using `cybersecurity-auditor`.

## 4. Mandatory Development Pipeline

All features must pass through this sequential pipeline without exception:
Idea → PRD Creation → Feature Definition → Architecture Design → Database Design → Task Planning → Development → Testing → Code Review → Security Audit → Refactoring (if required) → Production Ready.

## 5. Critical Architecture & Feature Isolation Constraints

- **API Routing Prefix:** All backend module endpoints MUST be strictly exposed under the `/api/v1` base route.
- **Guest Checkout:** The end-customer checkout flow MUST NOT require authentication or mandatory account creation. Capture direct minimal data: name, phone, shipping address, and delivery zone.
- **No Soft Deletes:** Implementing generalized soft deletes via software database abstractions is prohibited. Availability control MUST be handled via explicit boolean flags (`active: bool`) on catalog and configuration entities (`Perfume`, `Promocion`, `ZonaEnvio`).
- **Feature Isolation:** Every directory inside `backend/app/modules/` MUST be completely self-contained (encapsulating its own models, routers, services, and schemas). Circular imports or tight database couplings across different feature modules are strictly forbidden.

## 6. n8n Automation Layer Rules

n8n is strictly designated for outbound messaging, background orquestation, and marketing automation. 
- **Allowed Use Cases:** PDF Invoice generation, WhatsApp Business API messaging, Telegram admin alerts, Google Sheets synchronization, and abandoned cart follow-ups.
- **Strict Prohibitions:** n8n MUST NOT manage core system logic such as user authentication, authorization logic, core business rules, or primary database operations. These must remain inside the FastAPI backend.

## 7. Event-Driven Integrations

The backend operates under the principle of API-First and asynchronous event delegation. The backend never connects directly to messaging APIs. It must strictly emit asynchronous webhooks to n8n upon key system events:
- `user_registered`
- `order_completed`
- `inventory_sync_requested`
- `cart_abandoned`

## 8. Incremental Development

Development must proceed through small, logical, and verifiable steps. Avoid massive refactors or rewriting entire modules unnecessarily. Every change must be small, traceable, and verifiable.

## 9. Code Quality Standards

Code must be highly readable, modular, and maintainable. Use descriptive names for variables and functions. Comments should explain *why* a design decision was made, not *what* the code does.

## 10. Error Handling & Defensive Programming

Systems must implement strict defensive programming. Always gracefully handle:
- Invalid inputs and schema violations
- External API or n8n webhook connection failures
- Unexpected states or race conditions
- Asynchronous database timeouts

## 11. Testing Requirements

All implemented features must include automated test coverage using `pytest`, `pytest-asyncio`, or `playwright`. Tests must cover unit logic, API endpoints, and webhook trigger payload definitions.

## 12. Debugging Process

When encountering a bug, agents must strictly follow these steps:
1. Analyze trace logs and stack traces
2. Identify the probable root cause
3. Validate the hypothesis through explicit tests
4. Implement a targeted, minimal fix. Avoid random code permutations.

## 13. External Integrations Abstraction

All third-party services and integrations should be processed preferably through n8n workflows rather than being hardcoded into the FastAPI runtime, ensuring the core API remains decoupled.

## 14. Production Readiness Criteria

A project milestone is production ready only when: architecture boundaries are respected, all async tests pass, code review is approved, and the security audit resolves all critical vulnerabilities.

## 15. Agent Communication Standards

Agents must produce outputs that allow the next agent in the pipeline to continue work without ambiguity. All technical recommendations, schema changes, and plans must be structured, clear, actionable, and auditable.

## 16. Critical Thinking Requirement

Agents must not blindly execute instructions that introduce security risks, break engineering patterns, or violate feature isolation. In such cases, agents must pause, explain the structural risk, and propose a safer technical alternative.

## 17. Architecture Stability Rule

Agents must not modify system architecture, data flow paths, or folder hierarchies unless explicitly requested or their proposed plan is explicitly approved via the `architecture_guardian.md` protocol.