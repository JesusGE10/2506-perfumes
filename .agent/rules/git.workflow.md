---
trigger: always_on
---

# .agent/rules/git-workflow.md

---
trigger: always_on
---

# Git Workflow & Conventional Commits Standard

All AI agents producing code alterations, technical specs, or environment mutations MUST structure their task closure by providing the exact Git branch name and Conventional Commit message matching the implementation. All commit messages MUST be written in Spanish.

## 1. Branch Naming Convention

When preparing or suggesting code integration paths, branch naming MUST strictly cross-reference the active Task ID from the `task-planner` blueprint:
- **New Features:** `feat/TSK-XXX-short-description`
- **Bug Fixes:** `fix/TSK-XXX-bug-name`
- **Refactoring:** `refactor/TSK-XXX-component-name`
- **Documentation:** `docs/update-architecture-or-prd`

## 2. Strict Conventional Commit Format

Every single commit message generated or suggested MUST strictly adhere to the Angular/Conventional Commits standard specification and MUST be written in Spanish. The structure must be:

```
<type>(<scope>): <short descriptive imperative summary in Spanish> [TSK-XXX]

[Optional detailed body in Spanish explaining WHY this structural change was introduced]
```

### Allowed Structural Types:
- `feat`: A new functional capability mapped inside a target backend module or frontend view.
- `fix`: A resolution for an active bug, runtime greenlet thread block, or Zod validation flaw.
- `refactor`: Structural codebase optimization that neither alters functional behavior nor database schemas.
- `docs`: Technical documentation mutations inside the `docs/` or `.agent/` directories.
- `chore`: Infrastructure adaptations, EasyPanel environment setups, or package dependency adjustments.

### Strict Scope Mapping:
The scope MUST match the isolated feature module directory or core tier:
- *Backend Scopes:* `auth`, `products`, `orders`, `categories`, `brands`, `promotions`, `search`, `media`, `metrics`, `ai`, `webhooks`.
- *Frontend Scopes:* `components`, `store`, `checkout`, `catalog`, `admin`.
- *Infra Scopes:* `alembic`, `easypanel`, `docker`.

## 3. Mandatory Commit Example (In Spanish)

```
feat(orders): implementar pipeline de procesamiento para checkout de invitados [TSK-004]

- Se agregó la ruta de servicio asíncrona para mapear los datos del checkout recibido.
- Se despachó el payload del evento order_completed hacia el webhook configurado en n8n.
- Se ajustó la lógica de persistencia para descontar el stock de inventario de forma asíncrona.
```