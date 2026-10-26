# Decisions

Format: each entry states the decision, what else was considered, and why.
New entries go at the end. Do not edit past entries — supersede them.

---

## D-001: Next.js App Router + TypeScript

**Decided:** Next.js 15 with App Router, TypeScript, no `src/` directory.
**Considered:** Pages Router; Remix; SvelteKit; adding `src/`.
**Why:** Server Components + Server Actions collapse a lot of boilerplate for
this app's shape (mostly forms and reads). App Router is the current default;
learning it is a stated goal. No `src/` keeps paths shorter and matches how
the docs are written.

## D-002: MongoDB over PostgreSQL

**Decided:** MongoDB with Mongoose as the primary and only database.
**Considered:** PostgreSQL with Prisma or Drizzle; MongoDB + Neon polyglot.
**Why:** The core query is "users whose `teaches` intersects my `learns` AND
whose `learns` intersects my `teaches`." With skills embedded on the user
document, this is a single indexed `find` — no join, no `$lookup`. That
directly demonstrates the data-modeling lesson the project is meant to teach.
Neon was cut because it was insurance, not a learning goal.

## D-003: Clerk for auth

**Decided:** Use Clerk for authentication and session management.
**Considered:** Hand-rolled sessions; Better Auth; Auth.js; NextAuth.
**Why:** Auth is not a learning goal for this project. Clerk gives working
sign-in on day 1, and the mapping cost (a `clerkId` string on the user doc) is
acceptable. Better Auth is the better long-term choice (data stays in Mongo);
migration is deferred, not rejected.

## D-004: Zod as the single validation source

**Decided:** Zod validates every boundary (forms, Server Actions, route
handlers, env). Mongoose schemas define storage shape and indexes only.
**Considered:** Mongoose validators as primary; duplicating rules in both.
**Why:** One source of truth per rule. Duplication drifts — a rule relaxed in
Zod but not Mongoose (or vice versa) is a bug you find in production. Zod also
gives typed inference and field-level error shapes that Mongoose does not.

## D-005: Skill catalog is seeded, IDs are slugs

**Decided:** Skills are a fixed catalog of ~150 items seeded into the DB.
`_id` is a slug (`"react"`, `"spanish"`). Users cannot create skills.
**Considered:** Free-text skills; user-submitted skills with a review queue.
**Why:** Free text destroys matching. "React", "ReactJS", and "react.js" are
three different skills and zero matches. Slug IDs also make seed data
readable (`{ skillId: "react" }`), which matters because it will be edited
dozens of times. User-submitted skills are deferred.

## D-006: Matching requires reciprocity in v1

**Decided:** A swap request can only be sent to a user who is a mutual match:
they teach something I want, and they want something I teach.
**Considered:** Asymmetric requests ("I'll teach you X even though you have
nothing I want"); one-directional offers.
**Why:** Reciprocity is the product's entire idea. Allowing asymmetric
requests makes the match screen meaningless and roughly doubles the permission
and state-machine surface. Deferred, not rejected.

## D-007: Product name

**Decided:** SkillSwap. Tagline: "teach what you know, learn what you don't,
from someone who needs exactly the same thing."
**Considered:** Quid, SkillLoop, Give/Take, Reciproc, Two-Way, Handshake, Swapp.
**Why:** Clarity over memorability. The artifact's user is a reviewer with ~90
seconds; the name must read instantly. Memorability and brand voice are worth
less than comprehension here, and can be traded for later.

## D-008: Folder structure — services/ + lib/

**Decided:** Domain logic lives in `services/`. `lib/` is integrations and
shared infrastructure only. Thin Server Actions are colocated in `app/`.
**Considered:** `lib/features/` holding domain logic; a single flat `lib/`.
**Why:** Separating domain from integration makes the boundary enforceable by
a rule ("imports mongoose/next/clerk → lib") rather than by taste. Colocating
actions next to their pages keeps them near the forms that call them and
avoids a growing central actions folder.

## D-009: dotenv removed from application config

**Decided:** `lib/config/*` reads `process.env` only. Scripts load their own
env (`import "dotenv/config"` or `tsx -r dotenv/config`).
**Considered:** Loading dotenv inside config so scripts inherit it.
**Why:** Next.js already loads `.env*` files with a documented precedence.
A second loader can re-read them in a different order and mask precedence bugs
that only appear in deploy. One loader, one source of truth.

## D-010: No `staging` in the NODE_ENV enum

**Decided:** NODE_ENV is `test` | `development` | `production`.
**Considered:** Including `staging` for future-proofing.
**Why:** Next.js only distinguishes those three, and no staging environment
exists. Carried-over complexity is still complexity; add it when the
environment exists.

## D-011: AppError is a pure value; logging happens at the boundary

**Decided:** `AppError` constructor has no side effects. `runAction` is the
only place errors are logged for actions, so the AsyncLocalStorage request
context is present.
**Considered:** Logging in the constructor (the previous project's pattern).
**Why:** Constructor logging fires at creation, not at handling, and may not
be inside the request context. It also logs errors that are later swallowed or
reshaped. Logging once at the boundary gives one line per handled error, with
`requestId` and `userId` attached.

## D-012: Server Actions vs Route Handlers

**Decided:** Forms and mutations in our own app use Server Actions. Anything
polled, cacheable, or externally consumable uses a Route Handler.
**Considered:** Everything via Route Handlers (more portable); everything via
Server Actions (less code).
**Why:** Server Actions give type-safe calls and fewer moving parts for forms.
Polling needs a cacheable GET, which actions don't do well. The rule makes the
choice mechanical rather than a matter of taste, which matters when an agent
is writing half the code.

## D-013: Demo mode is read-only with a hand-authored seed

**Decided:** The deployed demo is read-only (`DEMO_READ_ONLY=true`), gated in
`runAction`. Demo data is five hand-authored users: one demo account, one
pending incoming request, one accepted swap with messages, one completed swap
with reviews, one non-match to demonstrate reciprocity.
**Considered:** Allowing writes scoped to `demo_` accounts with a reset cron;
using two users only.
**Why:** Read-only guarantees every reviewer sees the same curated story and
removes the abuse surface (rate limiting, moderation, cleanup) that is out of
scope. Two users cannot show the three swap states the demo needs to
communicate. The non-match user is there so a reviewer — or a recruiter — can
see that reciprocity is enforced, not just suggested.

## D-014: Read-only queries use `.lean()`

**Decided:** Mongoose reads that are not mutated SHOULD use `.lean()`.
**Considered:** Hydrating full documents everywhere for consistency.
**Why:** Hydration costs CPU and memory per document and provides getters,
virtuals, and dirty-tracking that read-only paths don't use. The matching
query scans every candidate, so the cost is per-user, not per-request.

## D-015: Design tokens for v1.

**Decided:** Font: `Inter`. Palette: bg `#faf9f6`, fg `#141311`, accent `#a33b20`. Light mode only.
**Why:** Lack of proper visual foundation for upcoming features

## D-016: Lazy JIT user provisioning instead of Clerk webhook

**Decided:** On first authenticated request, upsert the Mongo User by clerkId.
**Considered:** Clerk webhook (user.created), middleware sync.
**Why:** Webhooks introduce infrastructure and eventual consistency; Clerk's
own guidance notes syncing is not always necessary. The upsert is
race-safe because clerkId is unique and duplicate-key errors are retried.
A webhook can be added later for user.updated/deleted sync.

## D-017: Resource-based auth checks, not middleware route matchers

**Decided:** Protect pages and Server Actions individually via
getCurrentUser/requireCurrentUser.
**Considered:** createRouteMatcher in middleware.
**Why:** Clerk has deprecated createRouteMatcher() and recommends checking
auth as close to the resource as possible. Middleware cannot reliably
protect Server Actions, which are called by ID, not by path.

## D-018: Two resolvers — getCurrentUser (null) + requireCurrentUser (throw)

**Decided:** getCurrentUser returns null for signed-out; requireCurrentUser
throws AppError.unauthorized().
**Considered:** one function with a flag, or only one behavior.
**Why:** Pages need a signed-out UX (redirect), so null is appropriate.
Server Actions must fail closed, so requireCurrentUser throws and runAction
translates the error. The function name makes the contract explicit.

## D-019: Integration tests use the real dev DB with `test_` prefix

**Decided:** Vitest integration tests connect to config.DATABASE*URL,
seed with prefix-scoped clerkIds, and clean up with
deleteMany({ clerkId: { $regex: /^test*/ } }).
**Considered:** mongodb-memory-server for isolation.
**Why:** Real DB exercises the production connection path (driver,
connection string, bufferCommands:false). One fewer dependency.
Isolation comes from prefix-scoped cleanup, not from an ephemeral DB.
RULE: never deleteMany({}) in a test's afterAll on this DB.

## D-020: Two demo accounts with account switching

**Decided:** Supersedes part of D-013 ("one demo account"). Demo seeds `demo_you` and `demo_ana` — the two sides of the same swap. The demo entry offers "Explore as You" / "Explore as Ana", each auto-signing into that Clerk user. Read-only mode (D-013) is unchanged — both accounts are view-only.
**Considered:** let viewer interact with app like prod, keep the single user demo
**Why:** reciprocity is the product's core idea, and a one-sided view hides it.
