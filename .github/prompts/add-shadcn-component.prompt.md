---
mode: agent
description: Add a new shadcn/ui component to the project
---

Add the shadcn/ui component `${input:component}` to this project.

1. Run `npx shadcn@latest add ${input:component}` to install the component into `src/components/ui/`.
2. If the component is already installed, report that and stop.
3. After installation, verify the generated file matches the project's Tailwind v3 setup (see `tailwind.config.ts`).
4. Use `cn()` from `@/lib/utils` for any conditional class merging in wrapper components.
