# Project structure

Where to find the main parts of the Logis codebase.

## Root

- **`server.ts`** — Node HTTP server for live session: `/register`, `/stream` (SSE), `/log`. Runs on port 4000 next to Next.js.
- **`next.config.ts`** — Next.js config (e.g. Turbopack).
- **`vitest.config.ts`** — Vitest test config; tests live under `src/**/*.test.{ts,tsx}`.
- **`documentation/`** — This folder.

## `src/`

### `src/app/`

Next.js App Router.

- **`app/layout.tsx`** — Root layout (providers, global styles).
- **`app/(admin)/layout.tsx`** — Admin layout (sidebar, etc.).
- **`app/(admin)/page.tsx`** — Main dashboard page: grid of containers, timeline, drop zone, file parsing.
- **`app/api/`** — API routes (e.g. `log`, `register`, `stream` for proxying or extra endpoints).

### `src/core/`

Core logic: engine, index, utils, and input sources.

- **`engine.ts`** — `TimelineEngine`, `EventBucket`, `EventTypeIndex`; observer pattern and time-range queries.
- **`utils.ts`** — `detectFileFormat` (JSON vs NDJSON), `InputType` enum, `isNewEvent` (dedup for appending).
- **`sources/InputSource.ts`** — Interface: `type`, `start(onEvents)`, optional `stop()`.
- **`sources/jsonFileSource.ts`** — Full JSON array source.
- **`sources/ndJsonFileSource.ts`** — NDJSON file (streaming line-by-line).
- **`sources/eventSource.ts`** — Browser `EventSource` for live SSE.
- **`sources/clipboard.ts`** — Paste: JSON array, NDJSON lines, or single JSON.

### `src/context/`

React context providers.

- **`DashboardContext.tsx`** — Central state: index ref, engine ref, timeframe, currentTimestamp, containers, logs, markers, live session, parseFiles, registerObserver, requestSeek, etc.
- **`SidebarContext.tsx`** — Sidebar open/close state.
- **`ThemeContext.tsx`** — Theme (e.g. dark/light).

### `src/components/`

UI components.

- **`dashboard/`** — Dashboard-specific pieces:
  - **`MainWaitingView.tsx`** — Empty state (“drag log file or start Live Session”).
  - **`BaseView.tsx`** — Wrapper for a card (title, menu, body).
  - **`Containers/`** — One component per container type: `TableView`, `GraphView`, `EventView`, `StateView`, `TargetView`, `LoggerView`, `StatefulEventView`, `ActionView`.
- **`timeline/`** — Timeline UI:
  - **`Timeline.tsx`** — Wraps the slider and timeline chrome.
  - **`TimelineSlider.tsx`** — Scrubbable slider (rc-slider), zoom/pan, markers/clips.
  - **`Timeline.utils.ts`** — Time formatting, snapping, units.
  - **`TimeLine.types.tsx`** — Clip, Marker, etc.
- **`header/`** — Top bar: upload, live session, search, grid lock, add container, export, user menu.
- **`common/`** — Shared bits: ThemeToggleButton, PageBreadCrumb, ComponentCard, ChartTab, GridShape.
- **`ui/`** — Generic UI: button, input, dialog, dropdown, popover, table, tooltip, badge, etc.
- **`tables/`** — GenericTable.
- **`videos/`** — Aspect-ratio wrappers (e.g. 16:9) for media.

### `src/hooks/`

- **`useModal.ts`** — Open/close/toggle for a modal.
- **`useGoBack.ts`** — Navigate back or to home (uses Next router).

### `src/lib/`

Shared utilities.

- **`utils.ts`** — `cn`, `capitalize`, `parseNumeric`, `discoverKeys`, `getNestedValue`, `toMs`, `seekValueToEpochMs`.
- **`crypto-util.ts`** — `hashToken`, `generateToken`, `randomUUID` (used for tokens and IDs).
- **`sse-state.ts`** — SSE-related state helpers if used elsewhere.
- **`cors.ts`** — CORS helpers if used by API or server.

### `src/types/`

- **`containers.ts`** — `ContainerType` enum, `DashboardContainer<T>`, default sizes, and the data models for each container type (TableModel, GraphModel, EventModel, StatefulEventModel, etc.).

### `src/test/`

- **`setup.ts`** — Vitest setup (e.g. `@testing-library/jest-dom`).

## Where to look for what

| I want to… | Look in |
|------------|--------|
| Understand how events are stored and queried by time | `src/core/engine.ts` |
| See how file/stream/paste become events | `src/core/sources/` and `DashboardContext` (parseFiles, startEngineWithSource) |
| See how the timeline drives UI updates | `DashboardContext` (requestSeek, currentTimestamp), `TimelineSlider`, and each container’s `renderAt` |
| Add or change a dashboard card type | `src/types/containers.ts` (type + model), `src/app/(admin)/page.tsx` (switch + component), and the container in `src/components/dashboard/Containers/` |
| Change how date/message keys are discovered | `src/lib/utils.ts` (`discoverKeys`) |
| Change live session server behavior | `server.ts` and `src/app/api/` if used |

For how each container type uses the index and renders at a timestamp, see [Containers and views](./containers-and-views.md).
