/** Shared mascot state definitions used by the main process and hooks. */

export type MascotState = "idle" | "thinking" | "working" | "done" | "error";

export const MASCOT_STATES: readonly MascotState[] = [
  "idle",
  "thinking",
  "working",
  "done",
  "error",
];

/** Payload accepted by the local HTTP listener and forwarded to the renderer. */
export interface StatePayload {
  state: MascotState;
  /** Optional short context, e.g. the submitted prompt (truncated by the renderer). */
  prompt?: string;
  /** Optional tool name for the "working" state. */
  tool?: string;
}

/** Default loopback port for the mascot's state listener. */
export const DEFAULT_PORT = 4577;

export function isMascotState(value: unknown): value is MascotState {
  return typeof value === "string" && (MASCOT_STATES as readonly string[]).includes(value);
}

/** Resolve the configured port from the environment, falling back to the default. */
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MASCOT_PORT;
  if (!raw) return DEFAULT_PORT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : DEFAULT_PORT;
}
