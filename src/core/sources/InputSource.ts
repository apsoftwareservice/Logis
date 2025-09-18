import type { LogEvent } from "@/core/engine"

export type OnEvents = (events: LogEvent[]) => void;

/**
 * Minimal InputSource interface — each implementation is responsible
 * for reading/producing LogEvent[] and calling `onEvents`.
 */
export interface InputSource {
  name: string;
  start: (onEvents: OnEvents) => Promise<void> | void;
  stop?: () => void;
}