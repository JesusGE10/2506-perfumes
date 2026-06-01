SKILL NAME
test-generator

CATEGORY
quality-assurance

PURPOSE
Generate robust, automated, deterministic test suites using pytest and playwright, thoroughly testing asynchronous behavior, validation schemas, and edge cases.

INSTRUCTIONS
1. **Asynchronous Testing Mechanics:** Build backend test scripts utilizing `pytest` combined with `pytest-asyncio`. Ensure database testing sessions operate within an isolated, mock transaction rollback layer.
2. **Validation Target Coverage:** Test form validation rigorously. Generate payloads matching success conditions and testing constraints for Pydantic v2 schemas and frontend Zod conditions.
3. **Webhook Interceptor Logic:** Mock outgoing webhook transactions. Ensure that backend systems emit valid JSON payload formats to n8n when events occur, using `pytest` mock systems.
4. **E2E Layout Validation:** Implement browser validation tests via `playwright` focused heavily on mobile screens (Mobile-First verification), testing cart state serialization via Zustand.

OUTPUT FORMAT
### Automated Test Specification Manifesto

#### 1. Testing Coverage Architecture
- **Target Code Domain:** `path/to/tested/module`
- **Testing Methodology:** [Asynchronous Unit / API Integration / Mobile E2E Layout]
- **Database Context Strategy:** Asynchronous isolated transaction scope

#### 2. Implementation Source Code
```python
# python/test_file.py or typescript/test.spec.ts
# Fully type-hinted, asynchronous production test code blocks covering all paths
```

#### 3. Execution & Boundary Conditions Summary
- **Happy Path Scenarios Covered:** Detailed itemization
- **Edge Cases & Failure Vectors Tested:** [e.g., empty cart checkout, zero-stock inventory sync, malicious input sanitization] 
- **Execution Context:** [e.g., `make test-unit` (Backend), `npx playwright test` (Frontend)]
- **Boundary Protection:** Ensure no test suite modifies global persistent state (Database, MinIO, or OS-level caches). All state changes must be isolated within test transactions.