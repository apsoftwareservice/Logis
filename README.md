<div align="center">

# <img src="./public/images/logo/logo-icon.svg" alt="Logis Logo" width="50" height="50" style="vertical-align: middle;" /> Logis

</div>

### Time Travel Dashboard

**Logis** is an open-source log visualization and time-travel dashboard built with **Next.js** and **Tailwind CSS**.  
It lets you load application logs, scrub through time like a video editor, and see the **system state at any moment**.
Perfect for debugging, replaying, and understanding event-driven systems.

![Logis Dashboard Preview](./logis-readme.gif)

With Logis, you can connect a log file or stream live logs, then explore
your application state via a **scrubbable timeline**. 

Each UI card represents a part of your system (orders, calls,
sessions, etc.) and updates instantly when you move back or forward in time.

Logis leverages the powerful features of **Next.js 15**, the advancements of **React 19**, and the robustness of *
*TypeScript** to give developers a fast, modern, and extensible platform for log analysis.

---

## Overview

Logis is designed to help you **replay and inspect system behavior**:

- Ingest log files or live streams (e.g., Winston, JSON logs).
- Organize logs into indexed **event types** for fast queries.
- Scrub through time to see the **true state** at any timestamp.
- Build custom **UI cards** that react to log events (e.g., "Phone State", "Orders Placed", "Active Sessions").
- Switch between **rolling metrics** (last 5 minutes, today, etc.) and full history.

It’s built on:

- Next.js 15.x
- React 19
- TypeScript
- Tailwind CSS v4

---

## Installation

### 🖥️  Run Locally

Make sure you have:

- Node.js 18.x or later (Node.js 20.x recommended)

Clone the Repository

```bash
git clone https://github.com/apsoftwareservice/logis.git
```

Install dependencies:

```bash
cd logis
npm install
npm run dev
```

### 🐳 Run with Docker

You can also run Logis directly using Docker:

```bash
docker run -p 3000:3000 -p 4000:4000 ghcr.io/apsoftwareservice/logis:latest
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

Logis accepts **JSON log files** where each log entry is a separate object.  
Each log must contain:
- A valid **date value** (the key name does not matter).
- A **message** key representing the event name.

```
curl -X POST "https://logis-omega.vercel.app/log?token=1234567" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-01T12:34:56.000Z",
    "message": "UserLoggedIn",
    "userId": "42"
  }'
```
or http://localhost:4000 if running locally.

You can **drag and drop** log files into the dashboard, and Logis will automatically add them and resort the timeline.

### Live Session Mode (🐳 Docker)

When running Logis locally with Docker, you can activate **Live Session mode**:

1. Click **"Live session"** in the UI.
2. Behind the scenes, a `POST` call is sent to the server on port `4000` to register a new client.
3. You’ll receive a **token**, which you can use to send live log events.
4. The Web UI will then display these logs in real time.

This enables you to stream and visualize logs as they happen, in addition to replaying historical data.

## 🔥 Features

Logis provides the building blocks for time-travel debugging dashboards:

- 🎚️ Timeline Slider – scrub back and forth in time
- 🔍 Fast Log Indexing – event types stored in optimized buckets
- 📊 Dashboard Cards – custom React components that render state from logs
- 📈 Data Visualization – charts, tables, and KPIs
- 🕶️ Dark Mode – because logs are cooler in the dark
- ⚡ Live Log Support – append events as they happen



#### Example Use Cases
- Debugging call flows (pickup / hangup events).
- Inspecting order lifecycles (placed, cancelled, shipped).
- Monitoring session activity or feature usage.
- Teaching event-sourced systems and time-travel debugging.

## 📃 License

Logis is released under the MIT License.

You understand that by using Logis on our servers we do not offer any support or guarantee that your data is secure. Use at your own risk.  
If you want privacy protection, use the local Docker image or start a local server inside your corporation.

## ❤️‍🔥 Support

If Logis helps you debug or build faster, please ⭐ star the repository.
Your support helps us improve and maintain this project!