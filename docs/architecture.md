# Architecture

This document describes the high-level architecture of **http-file-generator**, explains the directory layout, and traces the data flow from file upload to `.http` file download.

---

## Technology Overview

| Concern           | Choice                                 | Notes                                                                                    |
| ----------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Framework         | Next.js 14 (App Router)                | Uses React Server Components where possible; client components are marked `"use client"` |
| Language          | TypeScript (strict)                    | All source files are `.ts` / `.tsx`                                                      |
| Styling           | Tailwind CSS v4                        | `cn()` utility from `src/lib/utils.ts` merges class names with `tailwind-merge`          |
| UI primitives     | shadcn/ui                              | Components live in `src/components/ui/`                                                  |
| Icons             | `lucide-react`                         |                                                                                          |
| OpenAPI parsing   | `@apidevtools/swagger-parser` + `yaml` | Runs entirely in the browser; the spec is never sent to a server                         |
| ZIP generation    | `jszip` + `file-saver`                 |                                                                                          |
| State persistence | `localStorage`                         | Typed wrapper in `src/services/local-storage.service.ts`                                 |

---

## Directory Layout

```
src/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Redirects to /upload
│   ├── layout.tsx             # Root layout (providers, toolbar)
│   ├── upload/
│   │   ├── page.tsx           # Step 1 — upload OpenAPI spec
│   │   └── loading.tsx        # Streaming loading UI
│   ├── select/
│   │   └── page.tsx           # Step 2 — select endpoints & download
│   └── generate/
│       └── page.tsx           # Legacy redirect → /select
│
├── components/                # Shared React components
│   ├── home/                  # Landing-page components (mockup, hero, etc.)
│   ├── ui/                    # shadcn/ui primitives (button, card, …)
│   ├── endpoint-filters.tsx   # Method/tag filter bar
│   ├── endpoint-group.tsx     # Collapsible endpoint list grouped by tag
│   ├── endpoint-item.tsx      # Single endpoint row with checkbox
│   ├── file-upload-zone.tsx   # Drag-and-drop upload area
│   ├── http-preview.tsx       # Live preview panel (right column)
│   ├── select-page-header.tsx # Spec info + download action bar
│   ├── method-badge.tsx       # Coloured HTTP method badge
│   ├── language-toggle.tsx    # EN / FR switcher
│   ├── theme-toggle.tsx       # Light / dark / system switcher
│   ├── theme-provider.tsx     # next-themes provider
│   └── toolbar.tsx            # Top navigation bar
│
├── contexts/
│   ├── language-context.tsx   # i18n (EN / FR) via React Context
│   └── spec-context.tsx       # Parsed spec + endpoint selection state
│
├── hooks/
│   └── use-endpoint-filters.ts # Derived filter/search state for the select page
│
├── lib/
│   ├── generate-http.ts       # Core .http file generation logic
│   ├── parse-openapi.ts       # OpenAPI parsing (delegates to swagger-parser)
│   ├── translations.ts        # UI strings for EN and FR
│   └── utils.ts               # cn() and other generic utilities
│
├── services/
│   ├── http-file.service.ts   # Orchestrates generation, tag grouping, and ZIP building
│   ├── local-storage.service.ts # Typed localStorage helpers + STORAGE_KEYS
│   └── openapi.service.ts     # Parses, filters, and groups endpoints
│
└── types/
    └── openapi.ts             # Shared TypeScript interfaces
```

---

## Application Flow

The application follows a two-step wizard:

```mermaid
flowchart LR
    A(["/"]):::route -->|redirect| B(["/upload"]):::route
    B -->|file selected| C{Parse OpenAPI spec\nswagger-parser}
    C -->|error| B
    C -->|ParsedSpec| D(["/select"]):::route
    D -->|Copy button| E[copy to clipboard]:::output
    D -->|Download button| F[ZIP archive\njszip + saveAs]:::output
    D -->|Upload new file| B

    classDef route fill:#4f46e5,color:#fff,stroke:none
    classDef output fill:#059669,color:#fff,stroke:none
```

### Step 1 — Upload (`/upload`)

1. The user drops or selects a file in `<FileUploadZone>`.
2. `openapi.service.parseSpec()` reads the file as text and calls `parseOpenAPISpec()` from `lib/parse-openapi.ts`.
3. `parseOpenAPISpec()` uses `@apidevtools/swagger-parser` to dereference `$ref` pointers, then extracts a `ParsedSpec` (title, version, baseUrl, endpoints).
4. The resulting `ParsedSpec` is stored in `SpecContext` and the user is redirected to `/select`.

### Step 2 — Select (`/select`)

1. The page reads `ParsedSpec` from `SpecContext`. If the context is empty the user is redirected back to `/upload`.
2. All endpoints start as **selected**. The user can:
   - Search/filter via `useEndpointFilters` hook.
   - Toggle individual endpoints or whole tags.
3. The right panel (`<HttpPreview>`) calls `generateHttpFileContent()` on every render to display live `.http` output. The **Copy** button copies the content to the clipboard.
4. **Download** (ZIP): `buildZipFromEndpoints()` groups endpoints by tag with `groupEndpointsByTag()`, then calls `splitEndpointsByParentPath()` to produce one file per tag/parent-path combination, and packages them with `jszip`.

---

## Data Model

```mermaid
classDiagram
    class ParsedSpec {
        +string title
        +string version
        +string baseUrl
        +ParsedEndpoint[] endpoints
    }

    class ParsedEndpoint {
        +string path
        +string method
        +string? operationId
        +string? summary
        +string? description
        +string[]? tags
        +Parameter[]? parameters
        +RequestBody? requestBody
    }

    class Parameter {
        +string name
        +string in
        +boolean? required
        +Schema? schema
        +unknown? example
        +string? description
    }

    class RequestBody {
        +boolean? required
        +Record~string,MediaType~? content
        +string? description
    }

    class MediaType {
        +Schema? schema
        +unknown? example
        +Record~string,unknown~? examples
    }

    ParsedSpec "1" --> "0..*" ParsedEndpoint : endpoints
    ParsedEndpoint "1" --> "0..*" Parameter : parameters
    ParsedEndpoint "1" --> "0..1" RequestBody : requestBody
    RequestBody "1" --> "0..*" MediaType : content
```

### `ParsedSpec`

```ts
interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
}
```

### `ParsedEndpoint`

```ts
interface ParsedEndpoint {
  path: string;
  method: string; // uppercase: GET, POST, …
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
}
```

### `Parameter`

```ts
interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: { type?: string; example?: unknown; default?: unknown };
}
```

---

## State Management

Global state is handled with two lightweight React Contexts:

| Context           | What it stores                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `SpecContext`     | `ParsedSpec`, selected endpoint IDs (`Set<string>`), helpers (`toggleEndpoint`, `selectAll`, …) |
| `LanguageContext` | Current language (`"en"` \| `"fr"`), translated strings object `t`                              |

Both contexts are provided at the root layout level (`src/app/layout.tsx`).

Preferences (language, theme) are persisted to `localStorage` via the typed service in `src/services/local-storage.service.ts`.

---

## ZIP File Structure

When the user downloads the ZIP archive, endpoints are grouped by tag and then further split by their **parent path context**:

- Meaningful path segments (non-param, non-version) are extracted.
- The last segment (the resource itself) is dropped, leaving the parent segments.
- One `.http` file is created per unique `(tag, parent)` combination.

```mermaid
flowchart TD
    A[Selected endpoints] --> B[groupEndpointsByTag]
    B --> C{For each tag}
    C --> D[splitEndpointsByParentPath]
    D --> E{For each endpoint}
    E --> F[Extract meaningful path segments\nremove params, api, version prefixes]
    F --> G[Drop last segment\nkeep parent context]
    G --> H{Group by parent}
    H -->|parent = ''| I["tag/tag.http"]:::file
    H -->|parent = 'projects'| J["projects/tag/tag.http"]:::file
    H -->|parent = 'workspaces'| K["workspaces/tag/tag.http"]:::file
    I --> L[jszip]
    J --> L
    K --> L
    L --> M[.zip archive]:::output

    classDef file fill:#f59e0b,color:#000,stroke:none
    classDef output fill:#059669,color:#fff,stroke:none
```

Example:

| Tag      | Endpoint paths                          | ZIP path                        |
| -------- | --------------------------------------- | ------------------------------- |
| `issues` | `/api/v1/issues`, `/api/v1/issues/{id}` | `issues/issues.http`            |
| `issues` | `/api/v1/projects/{id}/issues`          | `projects/issues/issues.http`   |
| `labels` | `/api/v1/workspaces/{id}/labels`        | `workspaces/labels/labels.http` |
