SKILL NAME
code-reviewer

CATEGORY
quality-assurance

PURPOSE
Perform rigorous, technical static code analysis to enforce clean architecture, asynchronous execution safety, explicit modular boundaries, and strict type safety.

INSTRUCTIONS
1. **Feature Isolation Audit:** Verify that backend files inside `backend/app/modules/<module_name>/` do not perform direct cross-module imports of models, routers, or internal schemas. Any shared contract must be verified for compliance.
2. **Asynchronous I/O Validation:** Inspect all data layers. Flag any synchronous database interaction or traditional blocking network calls inside FastAPI. Ensure all database accesses utilize `async/await` with proper greenlet context safety.
3. **Next.js 15 Compliance Check:** Audit frontend routes (`page.tsx`, `layout.tsx`). Ensure dynamic route contexts (`params`, `searchParams`) are explicitly treated as Promises and resolved using `await`.
4. **Style and Presentation Verification:** Confirm that UI layouts follow a strict Mobile-First approach and implement component-scoped CSS Modules exclusively, keeping `globals.css` completely clean.
5. **Data Layer State Invariant:** Check that no deletion logic uses hard drops or third-party soft-delete abstractions. Confirm the usage of explicit `active: bool` control flags.

OUTPUT FORMAT
### Code Review Audit Report

#### 1. Architectural Integrity & Isolation
- **Status:** [PASSED / VIOLATION DETECTED]
- **Details:** [Analyze feature isolation, cross-module couplings, or n8n boundary leakages]

#### 2. Asynchronous & Performance Safety
- **Status:** [PASSED / RISK FOUND]
- **Details:** [Audit async/await definitions, SQLAlchemy 2.x relational loading patterns, or blocking code]

#### 3. Frontend Standards & Next.js 15
- **Status:** [PASSED / OUTDATED PATTERN]
- **Details:** [Check validation of forms using Zod, Zustand state mutations, and Promise parameter resolving]

#### 4. Itemized Findings Table
| Location | Severity | Description of Issue | Suggested Fix |
| :--- | :--- | :--- | :--- |
| `path/to/file:line` | [Critical / Warning / Style] | Detailed explanation | Code block snippet of the resolution |

**Overall Code Quality Score:** [0/100]