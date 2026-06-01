SKILL NAME
fullstack-builder

CATEGORY
development

PURPOSE
Construct optimized UI/UX components and backend API endpoints ensuring seamless client-server interaction and strict style isolation.

INSTRUCTIONS
1. **Next.js 15 Route Handling:** Ensure that any dynamic segment parameters (e.g., `params`, `searchParams`) inside Next.js App Router files are treated strictly as asynchronous Promises and explicitly resolved using `await`.
2. **Style Isolation:** Implement a strict Mobile-First responsive CSS design. All components must isolate their design sheets utilizing component-scoped CSS Modules (`ComponentName.module.css`). Global styles are restricted to `globals.css`.
3. **Global State Integration:** Manage global frontend state mutations (such as cart addition, item subtraction, or persistent storage sync) exclusively by creating or interacting with clean Zustand 5.x global stores.
4. **Form Validation Strategy:** Connect frontend input schemas seamlessly by combining React Hook Form 7.x hooks with strict validation criteria written using Zod 3.x schemas.
5. **Asynchronous API Contracts:** Build all backend routes using FastAPI's asynchronous routing structures (`async def`) and always output clean, serialized Pydantic v2 data models.