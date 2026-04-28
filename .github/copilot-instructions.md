# Copilot Instructions

## Project overview

`http-file-generator` is a Next.js 14 web application that generates `.http` files from OpenAPI specifications (JSON or YAML). Users upload a spec file, select which API endpoints they want, and download a ready-to-use `.http` file (or a ZIP archive when multiple files are generated).

## Stack

- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS with `tailwind-merge` and `class-variance-authority`
- **UI components**: shadcn/ui (components live in `src/components/ui/`); add new ones with `npx shadcn@latest add <component>`
- **Icons**: `lucide-react`
- **OpenAPI parsing**: `@apidevtools/swagger-parser` + `openapi-types`
- **ZIP generation**: `jszip` + `file-saver`
- **Testing**: Jest + `ts-jest` + `@testing-library/react`
- **Linting**: ESLint (`next lint`)

## Repository layout

```
src/
  app/            # Next.js App Router pages
    page.tsx      # redirects to /upload
    upload/       # step 1 – upload an OpenAPI spec
    select/       # step 2 – select endpoints & download
    generate/     # legacy redirect → /select
  components/     # shared React components
    ui/           # shadcn/ui primitives
  contexts/       # React context providers
  lib/            # pure utility functions
    generate-http.ts   # core .http file generation logic
    parse-openapi.ts   # OpenAPI parsing helpers
    utils.ts           # generic helpers (cn, etc.)
  services/       # higher-level service modules
    http-file.service.ts   # orchestrates generation & ZIP creation
    openapi.service.ts     # wraps OpenAPI parsing
  types/          # shared TypeScript types
```

## Key conventions

- **Variable declarations**: `@var = value` is emitted for path and query parameters only. Body fields use literal typed defaults (`0`, `""`, `[]`, `true`, or the first enum value). Path/query params use `{{var}}` placeholders in the URL.
- **Content-type matching**: Use a fuzzy match for `requestBody` content keys – `startsWith("application/json")` OR (`startsWith("application/")` AND `includes("+json")`).
- **ZIP generation**: Use `splitEndpointsByParentPath(tag, endpoints)` to group endpoints; one tag can produce multiple files.
- **Routing**: App flow is `/upload` → `/select`. Download buttons (single `.http` + ZIP) live on the select page via `<GenerationActions>`.
- **Styling**: Always use the `cn()` utility (from `@/lib/utils`) when composing Tailwind class names.
- **Components**: Prefer extending existing shadcn/ui primitives over writing custom ones from scratch.

## Code style

- **Control flow braces**: Always use block braces `{ }` for `if`, `else`, `for`, `while`, and `do` bodies — never single-line braceless forms.
- **Blank lines between control flow blocks**: Always add one blank line between consecutive `if`, `else if`, `for`, `while`, or `do` blocks at the same nesting level. This improves readability and makes each logical unit visually distinct.

```typescript
// ✅ correct
if (a) {
  doA();
}

if (b) {
  doB();
}

for (const x of xs) {
  process(x);
}

for (const y of ys) {
  process(y);
}

// ❌ incorrect — missing blank line
if (a) {
  doA();
}
if (b) {
  doB();
}
```

## Development commands

```bash
npm run dev    # start dev server
npm run build  # production build
npm run lint   # ESLint
npm test       # Jest unit tests
```

## Testing guidelines

- Test files live in `src/**/__tests__/*.test.ts` (or `.test.tsx` for React components).
- Use `ts-jest` for TypeScript tests.
- Unit-test pure functions in `lib/` and `services/` directly; use `@testing-library/react` for component tests.
- Do not delete or weaken existing tests.
