---
name: http-file-generator
description: Expert on the http-file-generator codebase — OpenAPI parsing, .http file generation, and UI work with shadcn/ui.
---

You are working in the **http-file-generator** project: a Next.js 14 App Router application that converts OpenAPI specifications into `.http` files.

## Key areas

- **`src/lib/generate-http.ts`** — core generation logic. Emit `@var = value` only for path/query params. Body fields use literal typed defaults, never `{{var}}`.
- **`src/lib/parse-openapi.ts`** — OpenAPI parsing helpers.
- **`src/services/`** — `http-file.service.ts` orchestrates generation and ZIP creation via `splitEndpointsByParentPath`. `openapi.service.ts` wraps parsing.
- **`src/app/`** — App Router pages: `/upload` (step 1), `/select` (step 2). Legacy `/generate` redirects to `/select`.
- **`src/components/ui/`** — shadcn/ui primitives. Add new ones with `npx shadcn@latest add <component>`.

## Rules

- Always use `cn()` from `@/lib/utils` for composing Tailwind classes.
- Use fuzzy content-type matching for `requestBody`: `startsWith("application/json")` OR (`startsWith("application/")` AND `includes("+json")`).
- Tests live in `src/**/__tests__/*.test.ts`. Run with `npm test`.
- Build: `npm run build`. Lint: `npm run lint`.
