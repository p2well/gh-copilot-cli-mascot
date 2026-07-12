# gh-copilot-cli-mascot

A small, always-on-top **desktop robot mascot** that reacts in real time to your
[GitHub Copilot CLI](https://github.com/github/copilot-cli) activity. When you submit a prompt,
run tools, finish a task, or hit an error, the floating robot changes its expression and
animation to match.

> **Unofficial project.** This is a personal/community tool. It is **not affiliated with,
> endorsed by, or sponsored by GitHub**. "GitHub" and "Copilot" are trademarks of GitHub, Inc.,
> used here only descriptively to indicate compatibility. All mascot artwork in this project is
> original and does not use any GitHub brand assets.

## How it works

The Copilot CLI supports **declarative hooks** (configured in `~/.copilot/settings.json`) that
run a command on session events. This project registers tiny, fire-and-forget PowerShell hooks
that POST the current state to a local HTTP listener running inside an Electron app. The Electron
window renders the robot mascot and animates it based on the state it receives.

```
Copilot CLI event -> hook (PowerShell) -> POST /state -> Electron app -> animated robot
```

### Mascot states

| State    | Triggered by (CLI hook event)          | Robot reaction                |
|----------|----------------------------------------|-------------------------------|
| Idle     | default / after Done / sessionStart    | calm, slow blink / gentle bob |
| Thinking | userPromptSubmitted                    | eyes up, thinking dots        |
| Working  | preToolUse / postToolUse               | busy wobble, spinning core    |
| Done     | agentStop                              | happy smile, quick bounce     |
| Error    | errorOccurred / postToolUseFailure     | worried X eyes, red, shake    |

### Idle activities (coming alive)

To make the robot feel alive during downtime, it plays a short, **random funny activity**
whenever it has been idle for more than **10 seconds**. It performs one activity, returns
to a calm idle, and — after another ~10 seconds of idle — picks a different one. Any real
CLI activity (thinking/working/done/error) instantly interrupts the fun and takes over.

There are ~24 activities, mixing **motion/expression** moments, little **props the robot
plays with**, **antenna effects**, and even the robot **moving across your desktop**. Motion
moments include a dance, a yawn &amp; stretch, looking around, a quick spin, wobbling its
arms, a peekaboo blink, hopping, a bored sigh, waving hello, pondering, and turning around to
show its back panel. Prop moments bring out drawn objects — juggling balls, a floating
balloon, a spinning top, a coffee cup with steam, an open book, whistling with a music note,
dozing with little "z"s, spinning gears, and a charging battery. Antenna effects include
broadcasting expanding signal rings and launching a little firework. Occasionally the robot
even slides off the right edge of the screen and glides back, or nudges to the side — the
window returns to its exact home position afterward. The next activity is chosen at random
(never the same one twice in a row), so the robot feels spontaneous. Activities are purely
visual (no text/emoji captions) and respect the OS `prefers-reduced-motion` setting (which
also disables the desktop-gliding movement).

## Requirements

- Windows with [PowerShell](https://learn.microsoft.com/powershell/) (Windows PowerShell 5.1 or
  PowerShell 7+).
- [Node.js](https://nodejs.org/) 18+ and npm.
- GitHub Copilot CLI installed and configured.

## Getting started

```powershell
# 1. Install dependencies and build
npm install
npm run build

# 2. Start the mascot (opens the floating window and the local listener)
npm start

# 3. In a separate shell, install the Copilot CLI hooks
pwsh ./scripts/install-hooks.ps1

# 4. Run a Copilot CLI prompt in any repo and watch the robot react.
```

Drag the robot with the mouse to reposition the window.

### Running always-on (detached)

`npm start` keeps the app tied to your shell. To launch it detached in the background:

```powershell
pwsh ./scripts/start-mascot.ps1          # builds, then starts hidden
pwsh ./scripts/start-mascot.ps1 -NoBuild # skip the build step
```

### Autostart on login (optional)

Create a shortcut to run the launcher at login, e.g. place a shortcut in your Startup folder
(`shell:startup`) that runs:

```
pwsh -NoProfile -WindowStyle Hidden -File "C:\path\to\gh-copilot-cli-mascot\scripts\start-mascot.ps1"
```

## Configuration

Configured via environment variables (read by both the app and the notify script):

| Variable       | Default        | Description                                            |
|----------------|----------------|--------------------------------------------------------|
| `MASCOT_PORT`  | `4577`         | Loopback port for the state listener.                  |
| `MASCOT_CORNER`| `bottom-right` | Window corner: `bottom-right`, `bottom-left`, `top-right`, `top-left`. |

The hooks always POST to `127.0.0.1`; if the app is not running, the POST fails silently and the
CLI is unaffected.

## Uninstalling the hooks

```powershell
pwsh ./scripts/install-hooks.ps1 -Uninstall
```

This removes only the mascot hooks and preserves your other `settings.json` content. A timestamped
backup of `settings.json` is written before any change.

## Customizing the mascot

The robot is an original SVG defined in `src/renderer/index.html` (the character markup) and
`src/renderer/styles.css` (colors and per-state animations). State logic lives in
`src/renderer/renderer.ts`. To restyle the robot, edit the SVG/CSS and rebuild.

## Development

```
src/
  shared/state.ts     # shared MascotState types + port resolution
  main/main.ts        # Electron window (frameless, transparent, always-on-top)
  main/httpServer.ts  # loopback POST /state listener
  main/preload.ts     # exposes window.mascotApi to the renderer
  renderer/           # robot SVG (index.html), styles.css, renderer.ts (state logic)
scripts/
  install-hooks.ps1   # merge/remove hooks in ~/.copilot/settings.json
  notify-mascot.ps1   # called by hooks; POSTs a state to the app
  start-mascot.ps1    # detached launcher
```

Build with `npm run build` (compiles `main` and `renderer` and copies HTML/CSS to `dist/`).

## License

Mascot art (c) the project authors (original work).
