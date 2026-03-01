# Contributing to Logis

Thank you for your interest in contributing to Logis. This guide will help you get set up and submit your first contribution.

## Prerequisites

- **Node.js** 18.x or later (20.x recommended)
- **npm** (comes with Node.js)
- **Git**

## Getting Started

### 1. Fork and clone the repository

```bash
git clone https://github.com/apsoftwareservice/logis.git
cd logis
```

If you’re a maintainer, you can clone the main repo directly and create a branch.

### 2. Install dependencies

```bash
npm install
```

### 3. Build the server (required for local dev)

The dev setup runs both the Next.js app and a small Node server. Build the server once:

```bash
npm run build:server
```

### 4. Run the app locally

```bash
npm run dev
```

This starts the backend on port 4000 and the Next.js app. Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the GUI.

## Development workflow

| Command | Description |
|--------|-------------|
| `npm run dev` | Run Next.js + server in development mode |
| `npm run build` | Build server and Next.js for production |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode (Vitest) |
| `npm run test:run` | Run tests once (e.g. for CI) |

Before submitting a pull request:

1. **Lint:** Run `npm run lint` and fix any reported issues.
2. **Tests:** Run `npm run test:run` and ensure all tests pass.
3. **Formatting:** The project uses Prettier; format your code (or enable format-on-save in your editor).

## Project structure (high level)

- `src/app/` – Next.js app router (pages, layouts, API routes)
- `src/components/` – React UI (dashboard, timeline, tables, etc.)
- `src/core/` – Core logic: engine, utils, and data sources
- `src/core/sources/` – Input source implementations (JSON file, NDJSON, clipboard, EventSource)
- `src/hooks/` – React hooks
- `src/lib/` – Shared utilities and helpers
- `src/test/` – Test setup (e.g. Vitest + jsdom)

Tests live next to the code they cover as `*.test.ts` or `*.test.tsx`.

## How to contribute

### Reporting bugs or suggesting features

- Open an [issue](https://github.com/apsoftwareservice/logis/issues) with a clear title and description.
- For bugs, include steps to reproduce and your environment (OS, Node version).
- For features, describe the use case and how it fits with the project.

### Submitting code changes

1. **Create a branch** from the default branch (e.g. `main`):
   ```bash
   git checkout -b fix/short-description
   # or
   git checkout -b feature/short-description
   ```

2. **Make your changes** and run:
   - `npm run lint`
   - `npm run test:run`

3. **Commit** with clear, concise messages:
   ```bash
   git add .
   git commit -m "fix: resolve timeline scrubber edge case"
   ```

4. **Push** your branch and open a **Pull Request** against the main repository’s default branch.
   - Describe what you changed and why.
   - Reference any related issues (e.g. “Fixes #123”).

5. **Address review feedback** if the maintainers request changes.

## Code and testing expectations

- **TypeScript:** Keep types accurate; avoid `any` unless necessary.
- **Tests:** New or changed behavior in `src/core/`, `src/lib/`, and `src/hooks/` should be covered by tests. Use Vitest and React Testing Library for components/hooks when relevant.
- **Style:** Follow the existing ESLint and Prettier setup so the codebase stays consistent.

## Questions?

If something in this guide is unclear or you’re stuck, open an issue with the `question` label or start a discussion in the repository. We’re happy to help.

Thank you for contributing to Logis.
