# RestMon

REST API Monitoring and Orchestration Platform with visual workflow design.

## Project Structure

This is a monorepo containing:

### Apps
- **`apps/web`** - Frontend (React + React Flow + TailwindCSS)
- **`apps/api`** - Backend API (NestJS + PostgreSQL + Prisma)
- **`apps/worker`** - Workflow Execution Engine (TypeScript + Temporal)

### Packages
- **`packages/shared-types`** - Shared TypeScript types and interfaces

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Docker (for running Temporal locally)

### Installation

```bash
# Install all dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env

# Start Temporal (via Docker)
docker-compose up -d

# Run database migrations
npm run migrate -w apps/api

# Start development servers
npm run dev -w apps/web    # Frontend on http://localhost:5173
npm run dev -w apps/api    # API on http://localhost:3000
npm run dev -w apps/worker # Worker
```

## Architecture

RestMon uses a **Vertical Slice** architecture where features are built across the entire stack:

1. **Define Types** in `packages/shared-types`
2. **Backend API** endpoints in `apps/api`
3. **Frontend UI** components in `apps/web`
4. **Worker Logic** in `apps/worker`

## Tech Stack

- **Frontend**: React, React Flow, TailwindCSS, TanStack Query
- **Backend**: NestJS, PostgreSQL, Prisma
- **Orchestration**: Temporal.io
- **Language**: TypeScript

## Development Workflow

Work on features vertically, not horizontally:
- ✅ Build "Create Task" feature end-to-end
- ❌ Build "All Backend" then "All Frontend"

## Documentation

See `/Docs/Design/rest_mon_prd.md` for the complete Product Requirements Document.
