# Containers and views

Dashboard “cards” are **containers**. Each container has a **type**, a **layout** (position/size on the grid), and **data** (configuration for that type). When the user scrubs the timeline, each container re-renders to show the system state at the current timestamp.

## Container types

Defined in `src/types/containers.ts`:

| Type | Purpose |
|------|--------|
| **logs** | Raw log list; shows all events (often filtered by current time or full list). |
| **table** | Table of events of a given type; columns from event fields. |
| **graph** | Charts (e.g. time series) from event data; one or more series (event + x/y keys). |
| **event** | Single event type: shows the “last” or “current” event at the scrub time (e.g. one JSON blob). |
| **statefulEvent** | Between a start and stop event: shows state (e.g. a parameter) that applies over that interval. |
| **state** | Current value of a chosen parameter for an event type at the scrub time. |
| **target** | Target/goal value vs actual (e.g. max value and current value at time T). |
| **action** | Button to trigger an HTTP action (e.g. run a test); not time-based. |

Default sizes (grid width/height) are in `DefaultContainerSize(type)` in the same file.

## How containers get “state at time T”

Containers register as **observers** with the **TimelineEngine**. The engine does not send them data; it only calls **renderAt(timestampMs)** when the user scrubs or time advances (e.g. in live mode).

Each container then:

1. Uses **DashboardContext** to get the **index** (EventTypeIndex) and **currentTimestamp** (or the `tMs` passed to `renderAt`).
2. Gets the relevant **EventBucket**(s) from the index:
   - `index.getBucket(eventType)` for an exact type, or
   - `index.getBucketsIncludingType(substring)` for search/filter.
3. Queries the bucket for the time range or “last event at or before T”:
   - `bucket.getLastEventAtOrBefore(tMs)`
   - `bucket.getEventsInExclusiveInclusiveRange(startMs, endMs)`
   - `bucket.countInExclusiveInclusiveRange(startMs, endMs)`
4. Derives what to show (e.g. “last event”, “events in last 5 minutes”, “current value of field X”) and updates state so React re-renders the card.

So “how does the project work for this card?” is: **observer → renderAt(ts) → query index by type and time → render**.

## Container components (views)

In `src/components/dashboard/Containers/`:

- **LoggerView** — Logs container; shows the raw list of log entries (from context or filtered by time).
- **TableView** — Generic table for one event type; columns configured via container data (TableModel).
- **GraphView** — Charts (e.g. ApexCharts); series defined by event type and x/y parameter keys (StatisticsModel).
- **EventView** — Single event type; shows one “current” event at the scrub time (EventModel).
- **StatefulEventView** — Start/stop events and a parameter; shows the value over the active interval (StatefulEventModel).
- **StateView** — One event type + parameter; shows the value at the current time (StateModel).
- **TargetView** — Event type, parameter, max value; shows progress toward target at current time (TargetModel).
- **ActionView** — Configurable HTTP action (method, URL, headers, params, body); not driven by timeline (ActionModel).

The main dashboard page (`src/app/(admin)/page.tsx`) maps `container.type` to one of these components and passes `container` (id, title, type, gridLayout, data).

## Adding or changing a container type

1. **Types and model** — In `src/types/containers.ts`:
   - Add or extend `ContainerType`.
   - Add a default size in `DefaultContainerSize` if new.
   - Define the data shape (e.g. `MyModel`) for the new type.

2. **View component** — In `src/components/dashboard/Containers/`:
   - Implement a component that accepts `container: DashboardContainer<YourModel>`.
   - Register as an observer (e.g. in `useEffect`) with `registerObserver({ id, types, renderAt })`.
   - In `renderAt(tMs)`, use the index and bucket APIs to compute state at `tMs` and set state so the card re-renders.

3. **Dashboard wiring** — In `src/app/(admin)/page.tsx`:
   - In the `containers.map` switch, add a case for your `ContainerType` and render your view with `container` and `data-grid={ container.gridLayout }`.

4. **Add-container UI** — If users can add this card from the UI, extend the “add container” flow (e.g. in `AddContainer` or related popover) to create a container with your type and default data.

## Configuration popovers

Many containers are configured via popovers (e.g. choose event type, parameters, axis keys). Those live in `src/components/ui/popover/`:

- **EventConfigurationPopover** / **StatefulEventConfigurationPopover** — Event (and optionally start/stop) selection.
- **GraphConfigurationPopover** — Series, x/y keys for graphs.
- **TargetConfigurationPopover** — Event, parameter, max value.
- **EventParameterConfigurationPopover** — Event + parameter for state/target-style views.
- **ActionConfigurationPopover** — Method, URL, headers, params, body.

Updating a container’s `data` (e.g. event type or parameter) is done through the context (e.g. `setContainer` or dedicated update functions) so the container re-registers or re-queries with the new config and keeps `renderAt` in sync with the index.
