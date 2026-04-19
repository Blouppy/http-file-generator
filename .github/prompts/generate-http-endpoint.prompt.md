---
mode: agent
description: Generate a .http file snippet for a new endpoint
---

Generate a `.http` file snippet for the following endpoint:

- **Method**: ${input:method}
- **Path**: ${input:path}
- **Description**: ${input:description}

Follow the project conventions in `src/lib/generate-http.ts`:
- Emit `@var = value` only for **path** and **query** parameters (use `{{var}}` in the URL).
- Body fields use literal typed defaults (`0`, `""`, `[]`, `true`, or first enum value) — **no** `{{var}}` references in the body.
- Content-type detection: fuzzy match with `startsWith("application/json")` or (`startsWith("application/")` && `includes("+json")`).
