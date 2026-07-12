/**
 * Renderer state logic for the robot mascot.
 *
 * This file is intentionally self-contained (no imports/exports) so it can be
 * loaded directly via a plain <script> tag in the sandboxed renderer.
 */

type MascotState = "idle" | "thinking" | "working" | "done" | "error";

interface StatePayload {
  state: MascotState;
  prompt?: string;
  tool?: string;
}

interface MascotApi {
  onState(callback: (payload: StatePayload) => void): void;
}

const mascotApi: MascotApi | undefined = (window as unknown as { mascotApi?: MascotApi })
  .mascotApi;

const STATES: MascotState[] = ["idle", "thinking", "working", "done", "error"];

/** Mouth shape (SVG path "d") per state. */
const MOUTHS: Record<MascotState, string> = {
  idle: "M42 52 h16",
  thinking: "M44 53 q6 -3 12 0",
  working: "M43 52 q7 4 14 0",
  done: "M40 50 q10 10 20 0",
  error: "M42 55 q8 -7 16 0",
};

/** How long the "done" celebration shows before returning to idle (ms). */
const DONE_TO_IDLE_MS = 3500;
/** How long the caption stays visible (ms). */
const CAPTION_MS = 4000;

const root = document.getElementById("mascot") as HTMLElement | null;
const mouth = document.getElementById("mouth") as SVGPathElement | null;
const caption = document.getElementById("caption") as HTMLElement | null;

let idleTimer: number | undefined;
let captionTimer: number | undefined;

function truncate(text: string, max = 42): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function showCaption(text: string): void {
  if (!caption) return;
  window.clearTimeout(captionTimer);
  if (!text) {
    caption.classList.remove("show");
    caption.textContent = "";
    return;
  }
  caption.textContent = truncate(text);
  caption.classList.add("show");
  captionTimer = window.setTimeout(() => caption.classList.remove("show"), CAPTION_MS);
}

function captionFor(payload: StatePayload): string {
  switch (payload.state) {
    case "thinking":
      return payload.prompt ? `“${truncate(payload.prompt, 34)}”` : "Thinking…";
    case "working":
      return payload.tool ? `Running ${payload.tool}…` : "Working…";
    case "done":
      return "Done!";
    case "error":
      return "Something went wrong";
    default:
      return "";
  }
}

function applyState(payload: StatePayload): void {
  if (!root) return;
  const state = STATES.includes(payload.state) ? payload.state : "idle";

  // Re-trigger one-shot animations (done/error) even if state repeats.
  root.classList.remove(...STATES.map((s) => `state-${s}`));
  // Force reflow so the animation restarts.
  void root.offsetWidth;
  root.classList.add(`state-${state}`);

  if (mouth) mouth.setAttribute("d", MOUTHS[state]);

  showCaption(captionFor(payload));

  window.clearTimeout(idleTimer);
  if (state === "done" || state === "error") {
    idleTimer = window.setTimeout(() => applyState({ state: "idle" }), DONE_TO_IDLE_MS);
  }
}

// Start idle.
applyState({ state: "idle" });

if (mascotApi) {
  mascotApi.onState(applyState);
} else {
  // eslint-disable-next-line no-console
  console.warn("[mascot] mascotApi not available; running without live updates");
}
