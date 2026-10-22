# SkillSwap

## Project overview

A skill-exchange platform: users list skills they teach and skills they want
to learn; the app surfaces reciprocal matches and tracks a swap from request
to completion.

**Stack:** TypeScript · Next.js (App Router) · MongoDB + Mongoose · Zod · Clerk · Vercel
**Architecture:** Full-stack Nextjs (APIs + Server actions) — see `docs/architecture.md`

## Rules that apply everywhere

- MUST, MUST NOT, SHOULD and MAY use RFC 2119 meanings. They mark real invariants - layer boundaries, wire contracts, output shapes - not house style.

## Layout

| Path          | Description                           |
| ------------- | ------------------------------------- |
| `app/`        | Contains application pages and APIs   |
| `app/(root)`  | The root level for the website        |
| `components/` | Contains application's components\*   |
| `docs/`       | Contains application's Documents      |
| `lib/`        | Contains application's integrations   |
| `services/`   | Contains application's business logic |
| `__tests__/`  | Contains application's test           |

\* **Components rule:** each page in `app/(root)` has a folder in `components/`.
Reusable UI → `components/ui`. Cross-page layout → `components/layout`.

**Types rule:** types live in `types.ts` in the consumer's folder. Shared
types prefer `lib/` → `services/` → `components/`.

**Domain vs integration:** business rules belong in `services/`. If a file
imports `mongoose`, `@clerk/nextjs`, or `next/*`, it is an integration and
belongs in `lib/`, not `services/`.

## Hand-written zones (do not edit without asking)

- Finding match related code
- State machine (the heart of the match finding system)

These are deliberate learning artifacts. You MAY read them and propose changes
in a comment; you MUST NOT modify them in place.

## Do NOT

- Add toolchain, logging upgrades, or new config surfaces unless asked
- Refactor existing working code as part of another task
- Add dependencies without asking
- Add tests beyond the budget
- Reverse a decision in `DECISIONS.md` without asking

## When implementing a feature

1. State the acceptance test first.
2. Plan before writing code.
3. Write the smallest code that passes.
4. Run `pnpm check`.
5. Stop. Do not add nice-to-haves.

## Commands

- `pnpm typecheck` — type check
- `pnpm test` — unit tests
- `pnpm check` — typecheck + tests (run before calling a task done)
