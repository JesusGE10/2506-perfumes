SKILL NAME
cybersecurity-auditor

CATEGORY
security

PURPOSE
Identify technical vulnerabilities across the modular monolith backend and the Next.js frontend, focusing heavily on OWASP Top 10, input validation, secure webhooks, and data exposure.

INSTRUCTIONS
1. **Input Sanitization & Schema Safety:** Audit all entry points. Ensure the backend implements absolute validation via strict Pydantic v2 schemas and the frontend forces data schema constraints via Zod 3.x.
2. **Webhook Verification Integrity:** Inspect endpoints consuming external events (such as n8n responses or inbound payment status updates). Ensure strict signature validation, token verification, or cryptographic checks are enforced.
3. **Role-Based Access Control (RBAC):** Enforce strict segregation between `Superadmin` and `Admin` hierarchies. Ensure that the guest checkout endpoints do not inadvertently expose internal database structures or admin APIs.
4. **Sensitive Data Handlers:** Check for environment leakages. Ensure credentials, database URIs, or S3 bucket keys are handled safely via EasyPanel environment scopes, never hardcoded into codebase components.

OUTPUT FORMAT
### Cybersecurity Vulnerability Audit

#### 1. Risk Vector Analysis
- **OWASP Top 10 Alignment:** [Review structural vulnerabilities like Injection, Broken Auth, or Data Exposure]
- **API Boundary Protection:** [Evaluate security of the `/api/v1` routes and CORS policy configurations]
- **Automation / Webhook Security:** [Inspect validity of n8n listener endpoints and event token verification]

#### 2. Itemized Vulnerability Register
| Risk Level | Vector Location | Threat Vector Description | Mitigation Blueprint |
| :--- | :--- | :--- | :--- |
| [CRITICAL / HIGH / MEDIUM] | `module/path/file.py` | Vulnerability mechanism explanation | Step-by-step mitigation and code implementation |