# GSC Tracker

An iOS app for tracking gym strength workouts using data from Garmin watches (FIT files).
**`PLAN.md` is the source of truth**: phases, data model, API. Work phase by phase; after each phase, stop and wait for the user's confirmation.

## Commands

Node 24 (`.nvmrc`; run `nvm use` first), pnpm 10 via corepack.

```bash
pnpm install
pnpm db:up                 # postgres (localhost:5433) + S3/SeaweedFS (localhost:8333) + bucket
pnpm dev                   # API (tsx watch, :3000) + Metro (dev client)
pnpm --filter @gsc/mobile ios   # build and install the dev client on the iOS simulator (expo run:ios)
pnpm lint && pnpm typecheck && pnpm test   # must be green at the end of every phase
pnpm format                # prettier
pnpm fit:dump <file> [mesgKey]   # every FIT message/field as decoded by @garmin/fitsdk
pnpm fit:sets <file>       # parsed set table (compare with Garmin Connect)
```

Local env: `cp .env.example .env`. The API validates env with zod at startup (`apps/api/src/env.ts`).

## Structure

- `apps/api`: Fastify + TypeScript, Vitest. Entry point `src/server.ts`, app factory `src/app.ts` (tests use `app.inject`).
- `apps/mobile`: Expo SDK 58, expo-router, dev client (no Expo Go). Routes live only in `src/app/`; screen bodies go in `src/screens/`, components in `src/components/`. Tests (Jest + RNTL) sit next to their files, never in `src/app/`.
- `packages/shared`: types, zod schemas, exercise/muscle catalog, analytics formulas.
- `packages/fit-parser`: FIT → `ParsedWorkout` (`parseFit`). `normalize.ts` is pure (unit-tested on synthetic messages); errors are `FitParseError` with a `code`.
- `fixtures/fit/`: real FIT files for tests.
- Packages export TS source directly (`exports: ./src/index.ts`) with no build step; the API runs through tsx and mobile through Metro.

## Rules

- UI language: Russian. Code, identifiers, tables and commits: English (Conventional Commits, small commits).
- Garmin data is an immutable layer; user annotations are a separate layer. Effective value = `annotation ?? garmin`, through one function/view (`effective_sets`).
- Business logic (parsing, analytics, muscle mapping) lives in `packages/`; components stay thin.
- Every analytics formula and every parser branch gets a test.
- Don't make up Garmin/Terra/Apple APIs. When unsure, leave a TODO and ask. No unofficial Garmin APIs.
- Before writing FIT mapping, check real field names with `pnpm fit:dump <file>`.
- No secrets in code: `.env.example` + zod validation.
- No extra dependencies; briefly justify every new library.
- Mobile packages: install via `npx expo install <pkg>` (from `apps/mobile`).
- TypeScript is pinned to `~6.0` (typescript-eslint does not support TS 7 yet). TS 6 doesn't pick up `@types/*` automatically; set `types` in tsconfig.
- Mark completed phases in `PLAN.md` and record decisions in its "Decision log".
