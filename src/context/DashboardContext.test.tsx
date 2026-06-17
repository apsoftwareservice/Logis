import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardProvider, useDashboard } from "./DashboardContext"

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
}))

const fetchMock = vi.fn()
const eventSourceInstances: Array<{ url: string }> = []

class MockEventSource {
  url: string
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    eventSourceInstances.push({ url })
  }

  close() {}
}

function DashboardConsumer() {
  const { isLiveSession, sessionId } = useDashboard()

  return (
    <div>
      <span data-testid="live-session-state">{String(isLiveSession)}</span>
      <span data-testid="session-id">{sessionId ?? ""}</span>
    </div>
  )
}

describe("DashboardProvider live session startup", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ token: "server-token-123", reused: false }),
      text: async () => "",
      status: 200,
      statusText: "OK",
    })

    eventSourceInstances.length = 0
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("EventSource", MockEventSource)
    window.history.replaceState({}, "", "/")
  })

  it("auto-starts live session from the session_id query param", async () => {
    window.history.replaceState({}, "", "/?session_id=test-123")

    render(
      <DashboardProvider>
        <DashboardConsumer />
      </DashboardProvider>,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:4000/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "test-123" }),
        }),
      )
    })

    await waitFor(() => {
      expect(eventSourceInstances).toHaveLength(1)
      expect(eventSourceInstances[0].url).toBe(
        "http://localhost:4000/stream?token=server-token-123",
      )
    })

    expect(screen.getByTestId("live-session-state")).toHaveTextContent("true")
    expect(screen.getByTestId("session-id")).toHaveTextContent("test-123")
  })
})
