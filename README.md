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
| Working  | preToolUse / postToolUse               | busy, spinning / bounce       |
| Done     | agentStop                              | happy smile, quick bounce     |
| Error    | errorOccurred / postToolUseFailure     | worried eyes, red, shake      |

## Status

Early development. Setup, run, and hook-install instructions will be added as the app is built.

## License

Mascot art (c) the project authors (original work).
