# Contributing

Thank you for your interest in contributing to **http-file-generator**!
This guide covers local setup, development workflow, testing, and code style.

---

## Prerequisites

| Tool    | Minimum version |
| ------- | --------------- |
| Node.js | 18              |
| npm     | 9               |

---

## Local Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/Blouppy/http-file-generator.git
cd http-file-generator

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Project Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the dev server with Turbopack |
| `npm run build`        | Production build                    |
| `npm start`            | Serve the production build locally  |
| `npm run lint`         | Run ESLint (flat config)            |
| `npm run format`       | Format all files with Prettier      |
| `npm run format:check` | Check formatting without writing    |
| `npm test`             | Run Jest unit tests                 |
| `npm run test:e2e`     | Run Playwright end-to-end tests     |

---

## Running Tests

### Unit Tests

Unit tests use Jest + `ts-jest` and live in `src/**/__tests__/*.test.ts` (or `.test.tsx` for React components).

```bash
npm test

# Run a single file
npm test -- src/lib/__tests__/generate-http.test.ts

# Watch mode
npm test -- --watch
```

**Important:** The Jest config sets `testEnvironment: "node"` globally. Tests that require browser APIs (e.g. React hook tests using `renderHook`) must add the following docblock at the top of the file:

```ts
/**
 * @jest-environment jsdom
 */
```

### End-to-End Tests

E2E tests use Playwright (Chromium only) and live in the `e2e/` directory.

```bash
# Build first, then run tests
npm run build && npm run test:e2e

# Or using the single command (builds automatically via webServer config)
npm run test:e2e
```

---

## Code Style

### TypeScript

- Strict mode is enabled (`tsconfig.json`).
- Prefer explicit types over `any`. Use `unknown` when the type is genuinely unknown.
- Use `interface` for object shapes that may be extended; use `type` for unions, aliases, and mapped types.

### React

- Mark any component that uses browser APIs or React hooks with `"use client"` at the top of the file.
- Use the `cn()` utility from `@/lib/utils` whenever composing Tailwind class names.
- Extend shadcn/ui primitives instead of writing custom components from scratch. Add new shadcn/ui components with:
  ```bash
  npx shadcn@latest add <component>
  ```

### Naming

- React component files: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utility / service files: `kebab-case.ts`
- Test files: `*.test.ts` / `*.test.tsx` inside a `__tests__/` sub-directory

### Formatting

Prettier is configured with the following settings (`.prettierrc`):

- Double quotes
- Semicolons
- Trailing commas
- `printWidth: 100`
- 2-space indent
- `prettier-plugin-tailwindcss` (sorts Tailwind class names)

Run `npm run format` before committing.

---

## Adding a New Feature

1. **Understand the data flow** — read [`architecture.md`](architecture.md) first.
2. **Pure logic** (parsing, generation) belongs in `src/lib/` or `src/services/`.
3. **UI components** belong in `src/components/` (or `src/components/ui/` for shadcn primitives).
4. **i18n strings** — add new UI strings to both `en` and `fr` entries in `src/lib/translations.ts`.
5. **Tests** — add or update unit tests alongside your changes.
6. **Lint & format** — run `npm run lint` and `npm run format` before opening a PR.

---

## Opening a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes with focused, atomic commits.
3. Ensure all tests pass:
   ```bash
   npm test
   npm run lint
   ```
4. Push and open a pull request against `main` on GitHub.
5. Describe what the PR does and reference any related issues.
