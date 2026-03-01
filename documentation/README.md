# Logis documentation

This folder explains how the Logis project works: architecture, data flow, project structure, and how to extend it.

## Contents

| Document | Description |
|----------|-------------|
| [**Architecture**](./architecture.md) | How the app works: data ingestion, event index, timeline engine, and UI updates. |
| [**Project structure**](./project-structure.md) | Folder layout, main entry points, and where to find key logic. |
| [**Containers and views**](./containers-and-views.md) | Dashboard card types (graphs, tables, events, logs, etc.) and how they render at a given time. |

## Quick overview

Logis is a **time-travel log dashboard**:

1. You load logs (file upload, paste, or live stream).
2. Events are indexed by a **timestamp** and a **message/type** key.
3. A **timeline** lets you scrub to any moment in time.
4. **Dashboard containers** (cards) register as observers and re-render to show the system state at the current timestamp.

For a high-level picture and data flow, start with [Architecture](./architecture.md).
