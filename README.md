[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![tRPC 11](https://img.shields.io/badge/tRPC_11-2563EB?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

English · [Português](README.pt-BR.md)

[Case](docs/case.pdf)

# Task Nexus: Next.js 15 + tRPC

A small task manager. The backend keeps tasks in memory (no database) and exposes them through tRPC. The frontend is server-rendered on first load and uses React Query on the client for pagination, filtering and mutations.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev              # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start            # http://localhost:3000
```

Tested on Windows 10 and WSL.

Playwright needs a browser the first time you run the end-to-end tests:

```bash
npx playwright install chromium
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run typecheck` | TypeScript check for the whole project, including tests |
| `npm run lint` | ESLint (Next.js rules) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, runs using a production build) |
| `npm run check` | Typecheck, lint, unit tests and end-to-end tests |

## Features

- Create, edit, complete and delete tasks.
- Search by title or description, filter by status (all, pending, completed), and sort by creation date (newest or oldest first).
- Infinite scroll with a "Load more" fallback.
- Summary cards with completion progress.
- Confirmation before deleting, with success and error toasts.
- Debug menu in the navbar: generate up to 500 random tasks (optional seed for reproducible data) or delete all tasks.
- Light and dark mode based on system preference.

## Architecture

```
src/
├── app/                  Routes (App Router): list, new task, edit task, layout, error pages
│   └── api/trpc/         tRPC HTTP endpoint (fetch adapter)
├── components/           UI: TaskList, TaskItem, TaskForm, TaskStats, DebugMenu
├── lib/                  Code shared by browser and server
│   ├── schemas.ts        Zod schemas: the single validation contract
│   ├── mock-tasks.ts     Seeded generator for debug tasks
│   └── format.ts         Date formatting
├── server/
│   ├── routers/          tRPC procedures (tasks) and app router type
│   ├── tasks-store.ts    In-memory store and queries
│   ├── cursor.ts         Keyset cursor encoding and ordering
│   └── caller.ts         Direct router calls for Server Components
└── trpc/                 React Query + tRPC client and provider
tests/e2e/                Playwright specs
scripts/e2e.mjs           Starts the production server, runs Playwright, stops the process tree
docs/THEORY.md            Answers to the theoretical questions
playwright.config.ts      Playwright configuration
vitest.config.ts          Vitest configuration
```

### Request flow

1. `/` runs on the server (`force-dynamic`). It calls the router directly through `caller`, so the first page of tasks and the stats are already in the HTML.
2. The client components receive that data as `initialData`. React Query takes over from there, so there is no loading flash on first paint.
3. Mutations go through `httpBatchLink` to `/api/trpc`. On success they invalidate the affected queries. Toggling completion is optimistic and rolls back on error.

## Decisions

- **Validation in one place.** `src/lib/schemas.ts` is imported by both the router and the forms. The server is the source of truth; the client uses the same rules only for immediate feedback.
- **Strict inputs.** Every input schema uses `.strict()`. Unknown fields are rejected instead of silently ignored, which blocks mass assignment (for example, sending `id` or `createdAt` when creating a task).
- **Errors with meaning.** Validation failures return `BAD_REQUEST` with per-field messages; missing tasks return `NOT_FOUND`; exceeding the limit returns `TOO_MANY_REQUESTS`. The client maps field errors back onto the form.
- **In-memory store on `globalThis`.** The data survives Next.js hot reloads in development.
- **Keyset pagination.** The cursor encodes the `createdAt` and `id` of the last task on the page (base64url JSON, validated on the server). The next page is "everything after that key", so deleting or inserting tasks while scrolling never skips or repeats items. Offset pagination would shift every item after a change. Cursors are rejected with `BAD_REQUEST` if they are malformed.
- **Fixed time zone (UTC) for dates.** Server and browser render the same text, which avoids hydration mismatches.
- **Field names.** Internal names are in English (`title`, `description`, `completed`, `createdAt`). They correspond to the fields in the challenge brief (`titulo`, `descricao`, `dataCriacao`).
- **Sorting by date only.** Sorting by name would need the cursor to encode strings and collation rules, which adds complexity for little benefit in this scope. Both directions reuse the same keyset.
- **Optimistic completion toggle.** The cache is updated before the server responds and rolled back on error. The checkbox also keeps local state, because a controlled checkbox reverts to its previous value if the cache update arrives after the click.
- **Store capacity.** The in-memory store is capped at 1000 tasks. Without a cap, any client could grow the process memory without limit.
- **Debug tools in production.** The debug menu is available in every environment, without configuration. That is a conscious demo trade-off, documented under Security.

## Security

- **Input validation** on every procedure, with length limits, control-character filtering and UUID checks for IDs.
- **Mutations are POST-only.** tRPC rejects mutations over GET.
- **Response headers** set in `next.config.ts`: a Content-Security-Policy that blocks foreign origins and framing, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy and `Cross-Origin-Opener-Policy`. `X-Powered-By` is removed.
- **CSP limitation.** The policy allows `'unsafe-inline'` scripts because Next.js hydration relies on inline scripts. The stricter option is a per-request nonce, which would require moving rendering decisions into middleware. It is the next step for a production deployment.
- **No HTML injection.** Titles and descriptions are rendered as text by React. Tests check that a payload such as `<img onerror>` is shown literally and never runs.
- **Debug endpoints are part of the public API.** This is a demo decision. In a real product, `generateMock` and `clearAll` would sit behind authentication and an admin role.

## Testing

- **Unit tests (Vitest, 46 tests)** cover:
  - Schemas: length limits, control characters, trimming, form and debug input coercion.
  - Router: every rejection path (invalid input, mass assignment, missing IDs, malformed cursors), business rules, filtering, copy-on-read behavior and the debug operations.
  - Pagination: every task returned exactly once across pages, stable results when a task is deleted or inserted between pages, filters combined with cursors, both sort directions, and the last-page cursor.
  - Mock generator: deterministic output for the same seed, valid output for every task, and date range.
- **End-to-end tests (Playwright)** run against the production build in Chromium. `npm run test:e2e` builds first, then `scripts/e2e.mjs` starts the server and stops its whole process tree when the run ends. Playwright's own `webServer` option left the Next process running on Windows, so the script handles teardown directly. They cover:
  - SSR content in the initial HTML and security headers.
  - API behavior from the outside (mass assignment, bad IDs, GET mutations).
  - Creating, validating, editing, completing, searching, filtering, sorting and deleting tasks, including the confirmation step.
  - Debug generation, infinite scroll (the next page loads when the list reaches the bottom), the 404 page and the rendering of HTML payloads as text.

## Stack

- Next.js 15 (App Router) 
- React 19 
- tRPC 11 
- TanStack React Query 5 
- Zod 3 
- React Hook Form 
- superjson 
- Tailwind CSS 4 
- Sonner 
- Lucide 
- Vitest 
- Playwright
