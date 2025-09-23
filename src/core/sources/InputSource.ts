import type { LogEvent } from "@/core/engine"
import { InputType } from '@/core/utils'

export type OnEvents = (events: LogEvent[]) => void;

/**
 * Minimal InputSource interface — each implementation is responsible
 * for reading/producing LogEvent[] and calling `onEvents`.
 */
export interface InputSource {
  type: InputType
  start: (onEvents: OnEvents) => Promise<void> | void;
  stop?: () => void;
}