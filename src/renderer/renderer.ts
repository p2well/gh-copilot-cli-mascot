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
  moveBy?(dx: number, dy: number): void;
}

// Read the bridge from the global exposed by the preload script. The local
// binding must NOT be named `mascotApi`: the preload's
// contextBridge.exposeInMainWorld("mascotApi", ...) already defines a global
// `mascotApi`, and re-declaring it with `const` in this classic script throws
// "Identifier 'mascotApi' has already been declared", aborting the whole file.
const mascotBridge: MascotApi | undefined = (window as unknown as { mascotApi?: MascotApi })
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
/** Idle time before the robot starts a random "alive" activity (ms). */
const IDLE_ACTIVITY_DELAY_MS = 10000;

/**
 * Fun idle activities. When the robot has been idle for a while it plays one of
 * these at random to feel alive, then returns to calm idle and (after another
 * idle delay) plays a different one. Each activity toggles an `activity-*` class
 * on #mascot (see styles.css). Activities are motion/object based — no captions.
 */
interface IdleActivity {
  /** CSS class added to #mascot (without the leading dot). */
  className: string;
  /** How long the activity runs before returning to idle (ms). */
  durationMs: number;
  /** Optional side-effect fired when the activity starts (e.g. window movement). */
  run?: () => void;
}

/**
 * Glide the window along an out-and-back path and return to the exact starting
 * position. We track the integer pixels already sent so rounding telescopes to
 * zero (no cumulative drift across many activities). `peakX`/`peakY` are the
 * furthest offset from home; the motion eases out to the peak and back. If the
 * activity is interrupted, `cancelWindowMove()` snaps the window home.
 */
function moveWindowRoundTrip(peakX: number, peakY: number, durationMs: number): void {
  if (!mascotBridge?.moveBy) return;
  // Honor the OS reduced-motion setting: skip gliding the window around.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const move = mascotBridge.moveBy.bind(mascotBridge);
  cancelWindowMove();
  const start = performance.now();
  let sentX = 0;
  let sentY = 0;

  const step = (targetX: number, targetY: number): void => {
    const nextX = Math.round(targetX);
    const nextY = Math.round(targetY);
    const dx = nextX - sentX;
    const dy = nextY - sentY;
    if (dx !== 0 || dy !== 0) move(dx, dy);
    sentX = nextX;
    sentY = nextY;
  };

  // Allow an interrupt to return the window home immediately.
  moveHome = () => step(0, 0);

  const frame = (now: number): void => {
    const t = Math.min(1, (now - start) / durationMs);
    // sin(0..π) => smooth out to peak at t=0.5 and back to 0 at t=1.
    const k = Math.sin(t * Math.PI);
    step(peakX * k, peakY * k);
    if (t < 1) {
      moveRaf = window.requestAnimationFrame(frame);
    } else {
      step(0, 0); // guarantee exact return home
      moveRaf = undefined;
      moveHome = undefined;
    }
  };

  moveRaf = window.requestAnimationFrame(frame);
}

/** Stop any in-flight window glide and snap the window back to its home spot. */
function cancelWindowMove(): void {
  if (moveRaf !== undefined) {
    window.cancelAnimationFrame(moveRaf);
    moveRaf = undefined;
  }
  if (moveHome) {
    moveHome();
    moveHome = undefined;
  }
}

const IDLE_ACTIVITIES: IdleActivity[] = [
  // motion / expression
  { className: "activity-dance", durationMs: 1800 },
  { className: "activity-yawn", durationMs: 2200 },
  { className: "activity-look", durationMs: 2800 },
  { className: "activity-spin", durationMs: 900 },
  { className: "activity-wobble", durationMs: 2000 },
  { className: "activity-peek", durationMs: 2600 },
  { className: "activity-hop", durationMs: 2000 },
  { className: "activity-sigh", durationMs: 2200 },
  { className: "activity-wave", durationMs: 1800 },
  { className: "activity-ponder", durationMs: 1600 },
  { className: "activity-turn", durationMs: 2600 },
  // object props: playful toys, desk items, techy gadgets
  { className: "activity-whistle", durationMs: 2600 },
  { className: "activity-doze", durationMs: 3000 },
  { className: "activity-juggle", durationMs: 2800 },
  { className: "activity-balloon", durationMs: 3200 },
  { className: "activity-top", durationMs: 2600 },
  { className: "activity-coffee", durationMs: 2800 },
  { className: "activity-read", durationMs: 3000 },
  { className: "activity-gears", durationMs: 2800 },
  { className: "activity-charge", durationMs: 3000 },
  // antenna effects
  { className: "activity-signal", durationMs: 2600 },
  { className: "activity-firework", durationMs: 2200 },
  // robot travels across the desktop (window movement)
  {
    className: "activity-travel",
    durationMs: 3000,
    run: () => moveWindowRoundTrip(280, 0, 3000),
  },
  {
    className: "activity-nudge",
    durationMs: 1600,
    run: () => moveWindowRoundTrip(-70, 0, 1600),
  },
];

const ACTIVITY_CLASSES = IDLE_ACTIVITIES.map((a) => a.className);

const root = document.getElementById("mascot") as HTMLElement | null;
const mouth = document.getElementById("mouth") as SVGPathElement | null;
const caption = document.getElementById("caption") as HTMLElement | null;

let idleTimer: number | undefined;
let captionTimer: number | undefined;
let activityStartTimer: number | undefined;
let activityEndTimer: number | undefined;
let lastActivityIndex = -1;
let moveRaf: number | undefined;
let moveHome: (() => void) | undefined;

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

function clearActivity(): void {
  window.clearTimeout(activityStartTimer);
  window.clearTimeout(activityEndTimer);
  activityStartTimer = undefined;
  activityEndTimer = undefined;
  cancelWindowMove();
  if (root) root.classList.remove(...ACTIVITY_CLASSES);
}

/** Pick a random activity index, avoiding an immediate repeat. */
function pickActivityIndex(): number {
  if (IDLE_ACTIVITIES.length <= 1) return 0;
  let index = lastActivityIndex;
  while (index === lastActivityIndex) {
    index = Math.floor(Math.random() * IDLE_ACTIVITIES.length);
  }
  return index;
}

function playRandomActivity(): void {
  if (!root || !root.classList.contains("state-idle")) return;
  const index = pickActivityIndex();
  lastActivityIndex = index;
  const activity = IDLE_ACTIVITIES[index];

  root.classList.add(activity.className);
  activity.run?.();

  activityEndTimer = window.setTimeout(() => {
    root.classList.remove(activity.className);
    // Back to calm idle; schedule the next activity after another idle delay.
    scheduleActivity();
  }, activity.durationMs);
}

/** Start the timer that kicks off the next idle activity. */
function scheduleActivity(): void {
  window.clearTimeout(activityStartTimer);
  activityStartTimer = window.setTimeout(playRandomActivity, IDLE_ACTIVITY_DELAY_MS);
}

function applyState(payload: StatePayload): void {
  if (!root) return;
  const state = STATES.includes(payload.state) ? payload.state : "idle";

  // Any incoming state cancels an in-flight idle activity.
  clearActivity();

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
  } else if (state === "idle") {
    // Start the "come alive" timer once the robot settles into idle.
    scheduleActivity();
  }
}

// Start idle.
applyState({ state: "idle" });

if (mascotBridge) {
  mascotBridge.onState(applyState);
} else {
  // eslint-disable-next-line no-console
  console.warn("[mascot] mascotApi not available; running without live updates");
}
