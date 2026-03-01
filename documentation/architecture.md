# Architecture: how Logis works

This document describes how data flows from log input to the UI.

## High-level flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  Input source    │────▶│  EventTypeIndex   │────▶│ TimelineEngine  │────▶│  Dashboard     │
│  (file/stream/   │     │  (buckets by     │     │  (observers,     │     │  containers   │
│   clipboard)     │     │   event type)     │     │   moveTo(ts))    │     │  (cards)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └────────────────┘
        │                          │                        │
        │ onEvents(events)          │ getBucket(type),       │ renderAt(timestampMs)
        │                          │ getEventsInRange()      │
        ▼                          ▼                        ▼
   Raw log events            Sorted by time           UI shows state
   (JSON objects)           per event type            at current time
```

1. **Input source** produces an array of log events (each with a date and a message/type).
2. **EventTypeIndex** groups events by type and keeps them sorted by timestamp (in “buckets”).
3. **TimelineEngine** holds the index and a list of **observers**. When the user scrubs the timeline, the engine calls `moveTo(timestamp)`, which calls `renderAt(timestamp)` on every observer.
4. **Dashboard containers** (graphs, tables, event views, logs, etc.) register as observers and use the index to query “what happened by time T?” and render that state.

---

## 1. Log events and keys

Each log entry is a **JSON object**. Logis does not assume fixed field names. It **discovers**:

- A **date key** — a field whose value can be parsed as a date (e.g. `timestamp`, `date`, `ts`, `createdAt`).
- A **message key** — a field that identifies the event type (e.g. `message`, `msg`, `event`, `body`).

Discovery is implemented in `src/lib/utils.ts` (`discoverKeys()`). The same keys are used consistently for indexing and for container configuration (e.g. “show events of type X”).

---

## 2. Input sources

Input is abstracted behind the **InputSource** interface (`src/core/sources/InputSource.ts`):

- `type`: JSON, NDJSON, stream, or clipboard.
- `start(onEvents)`: when started, the source parses/reads data and calls `onEvents(events)` with an array of log events.
- `stop()` (optional): for streams, stops listening.

Implementations:

- **JSON file** — single array `[{...}, {...}]`; reads the file and calls `onEvents` once.
- **NDJSON file** — newline-delimited JSON; streams the file and parses line by line, then calls `onEvents` with all events.
- **Clipboard** — paste text; tries JSON array, then NDJSON lines, then single JSON.
- **EventSource (live)** — connects to a server-sent event URL; each message is parsed and pushed via `onEvents` (single event or array).

When the user drops a file or starts a live session, the dashboard creates the right source and passes it to the engine (see **DashboardContext** below).

---

## 3. EventTypeIndex and EventBucket

**EventTypeIndex** (`src/core/engine.ts`) is the in-memory index of all events.

- Events are grouped by their **message/type** (the value of the discovered message key).
- Each group lives in an **EventBucket**: a list of `(timestampMs, data)` sorted by time.
- The index supports:
  - **fromSortedBatch(events)** — build from a full array (e.g. after loading a file).
  - **appendLiveSorted(event, dateKey, messageKey)** — append one event (live stream).
  - **appendAndSort(events, dateKey, messageKey)** — add a batch (e.g. second file) with internal sort so buckets stay sorted.
  - **getBucket(type)** — get the bucket for an event type.
  - **getBucketsIncludingType(substring)** — get buckets whose type name contains a string (e.g. search).
  - **getEventsInExclusiveInclusiveRange(startMs, endMs)** on a bucket — get events in the time range `(start, end]`.

So “state at time T” is answered by: for each bucket (event type) the container cares about, ask for “last event at or before T” or “events in (T − window, T]” and render accordingly.

---

## 4. TimelineEngine and observers

**TimelineEngine** (`src/core/engine.ts`) owns:

- The **InputSource** (used to start/stop ingestion).
- A list of **observers**.

Each observer is:

- `id`: unique string.
- `types`: event types it cares about (for bookkeeping).
- `renderAt(tMs)`: function called with the current scrub time in epoch milliseconds.

When the user moves the timeline (or time is updated in live mode), the dashboard sets a new “current timestamp” and the engine calls **moveTo(currentTimestamp)**. That simply calls **renderAt(currentTimestamp)** on every registered observer.

Containers (GraphView, TableView, EventView, etc.) register as observers when they mount and implement `renderAt(ts)` by:

1. Getting the relevant bucket(s) from the index.
2. Querying events up to or around `ts`.
3. Updating their internal state or props so React re-renders the card for that time.

So the engine does not store UI state; it only notifies observers of the current time. All “what to show” logic lives in the containers and the index.

---

## 5. DashboardContext: wiring it together

**DashboardContext** (`src/context/DashboardContext.tsx`) is the central React state and wiring layer.

- Holds:
  - **index** (ref to `EventTypeIndex`) — the single source of truth for events.
  - **timeframe** — `{ start, end }` in epoch ms (min/max time across all events).
  - **currentTimestamp** — the current scrub position (and what gets passed to `moveTo`).
  - **containers** — list of dashboard cards (type, layout, config).
  - **logs** — raw list of all log objects (e.g. for the Logger view).
  - Plus: markers, clips, lock grid, follow logs, live session state, etc.

- When the user loads a file:
  - File format is detected (JSON vs NDJSON).
  - The right **InputSource** is created.
  - If there is no engine yet: a **TimelineEngine** is created with that source, and `source.start(onEvents)` is called.
  - **onEvents** receives the events, builds **EventTypeIndex.fromSortedBatch(events)**, computes timeframe and current timestamp, and adds a default Logger container.

- When the user scrubs the timeline:
  - **currentTimestamp** is updated (e.g. by `TimelineSlider`).
  - An effect calls **requestSeek(currentTimestamp)**, which batches and then calls **engine.moveTo(currentTimestamp)**.
  - All registered container observers run **renderAt(currentTimestamp)** and re-render.

- For **live session**:
  - The app registers with the backend (e.g. `POST /register`), gets a token, and creates an **EventSource** input pointing at the stream URL.
  - New events are pushed via `onEvents`; they are appended with **appendLiveSorted** and the timeframe end (and optionally current time) is extended.

So: **DashboardContext** owns the engine and index refs, parses files, handles live session, and exposes `currentTimestamp`, `registerObserver`, and helpers so the timeline and containers can stay in sync.

---

## 6. Backend (optional): live stream and log ingestion

The Node server (`server.ts`) runs next to the Next.js app (e.g. on port 4000) and provides:

- **POST /register** — register a session key; returns a token. Same key can reuse an existing token.
- **GET /stream?token=...** — Server-Sent Events (SSE) stream for that token. Clients listen here for live events.
- **POST /log?token=...** — ingest a log event; the server forwards it to all clients subscribed to that token’s stream.

So “live session” in the UI means: the frontend opens the SSE stream for its token; anything posted to `/log` with that token is pushed to the client and fed into the same pipeline as file-based events (via **appendLiveSorted** and the shared index).

---

## Summary

- **Events** are JSON objects with discovered **date** and **message/type** keys.
- **InputSource** implementations (file, NDJSON, clipboard, EventSource) produce arrays of events and call **onEvents**.
- **EventTypeIndex** keeps events grouped by type and sorted by time; buckets support range and “last at or before T” queries.
- **TimelineEngine** holds the source and observers; **moveTo(ts)** notifies all observers so they can query the index and render state at that time.
- **DashboardContext** creates the engine and index, parses files, handles live session, and drives **currentTimestamp** and **requestSeek** so the timeline and dashboard cards stay in sync.

For where these pieces live in the repo, see [Project structure](./project-structure.md). For how each card type uses the index and `renderAt`, see [Containers and views](./containers-and-views.md).
