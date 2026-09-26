# Sen Desktop

Sen Desktop reuses the finished 3D Sen mascot as a lightweight desktop coding companion.

## Current v0.4

### Desktop shell

- Tauri 2 desktop host
- compact 480×700 companion window
- the same animated Sen model and six moods as the web playground
- system tray with **Show / Hide Sen** and **Quit Sen**
- global shortcut: **Ctrl + Shift + Space**
- closing the window hides Sen to the tray
- **Pin** keeps Sen always on top
- **Startup** launches Sen with Windows and starts minimized
- Windows NSIS installer packaging
- the web playground remains unchanged

### Local workspace + Codex bridge

Sen can work against a real local workspace.

1. Choose the local folder Sen is allowed to work in.
2. Sen reads the actual Git branch, dirty files, recent commits and origin.
3. Sen detects **Codex CLI**.
4. Commands map to the visible Sen lifecycle: Listening → Thinking → Working → Success.
5. Codex runs locally in the selected workspace through:
   ```text
   codex exec --json --full-auto "<task>"
   ```
6. **Stop** terminates the active Codex process tree on Windows.
7. The workspace is inspected again after the task.

Sen does not embed an OpenAI API key. It uses the user's existing local Codex CLI installation and authentication.

### v0.4 task console

The desktop app now exposes what the local agent is actually doing instead of showing only a single final response.

- **Live** console streams normalized Codex JSONL activity while the task is running.
- It surfaces planning, commands, tool calls, file changes, agent messages, errors and completion.
- The bridge uses a lightweight polling buffer between Rust and React, so no extra frontend event dependency is required.
- The console keeps the latest activity bounded rather than dumping unlimited raw output.
- **History** stores the most recent local tasks in localStorage with workspace, result and changed-file count.
- **Continue last** prepares a continuation prompt for the most recent task in the current workspace.
- Selecting a history item loads the task back into the command box.
- Tasks with sensitive wording such as deploy/publish, destructive deletion, database/schema changes, or system/global changes require explicit approval before execution.
- Without that approval, the Rust-side Codex prompt also tells the agent not to push/deploy, perform destructive bulk deletion, modify OS settings, install global software, or access outside the selected workspace.

## Prerequisites

Install and authenticate Codex CLI separately, then ensure `codex` is available in `PATH`.

```bash
codex --version
```

If Codex is not installed, Sen still opens normally and shows **Codex missing**.

## Development

```bash
npm ci
npm run desktop:dev
```

Browser-only desktop preview:

```text
http://localhost:5173/?desktop=1
```

Native workspace, Pin, Startup, process control and agent execution require the Tauri host.

## Build locally

```bash
npm run desktop:build
```

The Windows bundle target is NSIS.

## GitHub Actions Windows installer

Run **Build Sen Windows** manually, or push a tag matching:

```text
sen-desktop-v*
```

The workflow uploads the `Sen-Windows-Installer` artifact.

## Architecture

```text
Sen Desktop
├─ React + Three.js mascot
├─ Tauri shell
│  ├─ tray / shortcut / window lifecycle
│  ├─ always-on-top / Windows startup
│  ├─ workspace picker
│  ├─ Git workspace inspector
│  └─ NSIS packaging
└─ Local agent runtime
   ├─ Codex CLI detection
   ├─ guarded task execution
   ├─ process lifecycle / Stop
   ├─ JSONL activity buffer
   ├─ Live task console
   ├─ local task history
   └─ Continue last task
```

The mascot is frozen as **Character v1**. Future work should focus on orchestration, project memory and reliable desktop workflows rather than additional mascot VFX.
