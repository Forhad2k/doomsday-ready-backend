# Doomsday Ready — Backend API

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5-black.svg)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma%20ORM-8.0.0--rc.24-5a67d8.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791.svg)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-5.1-yellow.svg)](https://vitest.dev/)

Backend API service for **Doomsday Ready**, managing Marvel Cinematic Universe (MCU) movie timeline dependencies, DAG topological sorting, and cinema seat bundle optimization.

---

## Tech Stack & Architecture

- **Runtime & Language**: Node.js 22+, TypeScript 5.7+ (ES Modules, `verbatimModuleSyntax`).
- **Framework**: Express.js 5 with CORS and JSON body parser.
- **Database & ORM**: PostgreSQL with Prisma 8 Release Candidate (`@prisma/orm-postgres: 8.0.0-rc.24`, `@prisma/cli-engine`, `@prisma/orm-toolchain`).
- **Validation**: Zod schema validation.
- **Testing**: Vitest 5.1 and Supertest 7.3 (40 automated tests: 19 unit + 21 integration).

---

## Custom Algorithms

- **Movie Dependency Graph & Topological Sort** (`src/utils/movie-graph.ts`):
  - Traverses transitive prerequisites via DFS.
  - Cycle detection engine that rejects direct self-loops and circular relationships with HTTP 409 `CIRCULAR_DEPENDENCY`.
  - Excludes target movie, includes each prerequisite exactly once, and applies deterministic tie-breaking (release year, then title).
  - Calculates total prerequisites, watched count, unwatched count, and remaining unwatched runtime.
- **Unbounded Coin-Change Dynamic Programming** (`src/utils/cinema-bundles.ts`):
  - Calculates the minimum number of seat bundles required to exactly match party group sizes (1–10,000) across available bundle capacities (1–500).
  - Returns individual bundle quantities and handles impossible seat states.

---

## API Endpoints

### Movies
- `GET /api/movies` — List all MCU movies with prerequisites and watched status.
- `POST /api/movies` — Create a new movie with prerequisites.
- `GET /api/movies/:id` — Get single movie details.
- `PATCH /api/movies/:id` — Update movie attributes or prerequisites (with cycle detection).
- `GET /api/movies/:id/rewatch-order` — Generate topological rewatch roadmap.

### Cinemas
- `GET /api/cinemas` — List all cinema venues with bundle capacities.
- `POST /api/cinemas` — Register a cinema venue with 1 to 10 distinct bundle sizes.
- `GET /api/cinemas/:id/booking?groupSize=11` — Calculate optimal minimum bundle quote.

---

## Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure PostgreSQL is running and update `DATABASE_URL`.

### 3. Prisma 8 Contract Emit & DB Update
```bash
# Emit contract IR and TypeScript types
npm run prisma:emit

# Apply contract updates to PostgreSQL
npm run prisma:update

# Run idempotent database seeder
npm run seed
```

### 4. Development & Testing
```bash
# Start development server (http://localhost:5000)
npm run dev

# Run Vitest test suite (40 tests)
npm test

# Type check
npm run build
```
