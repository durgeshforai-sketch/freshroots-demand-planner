# Skill: Extending the API

**Purpose:** add an endpoint that matches the existing conventions.

## Steps
1. Business logic goes in `src/lib/services/*`, not in the route file. Engine logic stays pure in `src/lib/engine`.
2. Add a zod schema to `src/lib/validation.ts`.
3. Create `src/app/api/<path>/route.ts`, wrap it in `handler("METHOD /api/<path>", …)` and use `parseJson`/`parseId`.
4. Errors: throw `ApiError` / `notFound` / `conflict` / `badRequest`. Responses are `{ error: { code, message } }` with the right status.
5. Dynamic params are async in Next 16: `const { id } = await ctx.params` with `RouteContext<"/api/...">`.
6. Log important events with `logger.info("<noun>.<verb>", {...})`. Never log secrets or passwords.
7. The proxy gate already protects `/api/*` (except login and health). New public routes must be added to `PUBLIC` in `src/proxy.ts`. Don't do that for anything that writes.
8. `npx tsc --noEmit && npm run lint && npm run build`, then curl it locally and add the result to HANDOFF.md.

## Example prompts
- "Add GET /api/runs/[id]/export.csv so procurement can download approved orders."
- "Add DELETE /api/flags/[id] that only removes flags created in the last 24h."
- "Add GET /api/skus with search and a perishable filter."
