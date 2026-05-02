# http-file-generator

A lightweight web application that generates ready-to-use `.http` files from OpenAPI specifications (JSON or YAML).
Upload your spec, select the endpoints you need, preview the output, and download a ZIP archive organized by API tags — no login required, everything runs in your browser.

## Features

- 📂 **Drag-and-drop upload** — supports `.json`, `.yaml`, and `.yml` OpenAPI 3.x spec files
- 🔗 **URL upload** — load a spec directly from any publicly accessible URL
- 🔍 **Endpoint browser** — filter by HTTP method or tag with a real-time search
- 🔎 **Endpoint spec viewer** — expand any endpoint to inspect its parameters, request body, response info, and referenced schemas
- 👁 **Live HTTP preview** — instantly preview the generated `.http` content as you select endpoints
- 📥 **ZIP download** — download a ZIP archive with `.http` files organized by tag/path
- 🌐 **Internationalization** — English and French UI
- 🎨 **Theme support** — light, dark, and system themes
- 🔒 **Privacy-first** — your spec is never sent to any server; all processing happens in the browser

## Tech Stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 14 (App Router, React Server Components)              |
| Language        | TypeScript (strict)                                           |
| Styling         | Tailwind CSS v4, `tailwind-merge`, `class-variance-authority` |
| UI components   | shadcn/ui (in `src/components/ui/`)                           |
| Icons           | `lucide-react`                                                |
| OpenAPI parsing | `@apidevtools/swagger-parser` + `openapi-types` + `yaml`      |
| ZIP generation  | `jszip` + `file-saver`                                        |
| Testing         | Jest + `ts-jest` + `@testing-library/react`                   |
| E2E Testing     | Playwright (Chromium)                                         |
| Linting         | ESLint v10 flat config                                        |
| Formatting      | Prettier + `prettier-plugin-tailwindcss`                      |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/Blouppy/http-file-generator.git
cd http-file-generator
npm install
```

### Development

```bash
npm run dev       # start the dev server (http://localhost:3000)
npm run build     # production build
npm start         # run the production build locally
```

### Linting & Formatting

```bash
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
```

### Testing

```bash
npm test           # Jest unit tests
npm run test:e2e   # Playwright end-to-end tests (requires a production build)
```

## Project Structure

```
src/
  app/                  # Next.js App Router pages
    page.tsx            # landing page (hero, feature overview, CTA)
    upload/             # step 1 – upload an OpenAPI spec (file or URL)
    select/             # step 2 – select endpoints & download
    generate/           # legacy redirect → /select
  components/           # shared React components
    home/               # landing-page-specific UI components
    ui/                 # shadcn/ui primitives
  contexts/             # React context providers
    language-context    # i18n (EN / FR)
    spec-context        # parsed spec + endpoint selection state
  hooks/                # custom React hooks
  lib/                  # pure utility functions
    generate-http.ts    # core .http file generation logic
    parse-openapi.ts    # OpenAPI parsing helpers
    translations.ts     # UI string translations (EN / FR)
    utils.ts            # generic helpers (cn, …)
  services/             # higher-level service modules
    http-file.service   # orchestrates generation & ZIP creation
    local-storage.service # typed localStorage helpers
    openapi.service     # wraps OpenAPI parsing & filtering
  types/                # shared TypeScript types
e2e/                    # Playwright end-to-end tests
```

## How It Works

1. **Upload** — drop a `.json` or `.yaml` OpenAPI 3.x spec, or paste a URL to load it directly from the web. The file is parsed entirely in the browser using `@apidevtools/swagger-parser`.
2. **Select** — browse the endpoint tree, filter by method or tag, and check the ones you want. Expand any endpoint with the chevron button to inspect its parameters, request body, and referenced schemas. A live preview panel shows the generated `.http` content.
3. **Download** — click **Copy** to copy the preview to the clipboard, or click **Download** to get a ZIP archive with one `.http` file per tag/path group.

## Documentation

Detailed documentation lives in the [`docs/`](docs/) folder:

- [`docs/architecture.md`](docs/architecture.md) — architecture overview and data flow
- [`docs/http-file-format.md`](docs/http-file-format.md) — generated `.http` file format and examples
- [`docs/contributing.md`](docs/contributing.md) — development setup and contribution guidelines

## License

[MIT](LICENSE)
