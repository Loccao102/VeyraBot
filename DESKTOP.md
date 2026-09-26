# Sen Desktop

Sen Desktop reuses the finished 3D Sen mascot as a lightweight desktop coding companion.

## Current v0.3

### Desktop shell

- Tauri 2 desktop host
- compact 480×700 companion window
- the same animated Sen model and six moods as the web playground
- system tray with **Show / Hide Sen** and **Quit Sen**
- global shortcut: **Ctrl + Shift + Space**
- closing the window hides Sen to the tray instead of ending the process
- **Pin** toggle to keep Sen always on top
- **Startup** toggle to launch Sen when Windows signs in
- autostart launches Sen quietly in the tray with `--minimized`
- Windows NSIS installer packaging
- the web playground remains unchanged

### Local agent bridge

Sen can now work against a real local workspace instead of only simulating agent states.

1. Click **Workspace** and choose the local project folder Sen is allowed to work in.
2. Sen reads the actual Git state: branch, changed files, recent commits and remote.
3. Sen detects whether **Codex CLI** is available.
4. When a task is submitted in the desktop app, Sen maps its visible lifecycle to the real executor:
   - Listening
   - Thinking
   - Working
   - Success / Idle
5. The desktop host runs:
   ```text
   codex exec --json --full-auto "<task>"
   ```
   with the selected workspace as the process working directory.
6. **Stop** terminates the active Codex process tree on Windows.
7. The workspace is re-inspected after the task so Sen can show the resulting Git changes.

The app does not embed an OpenAI API key. It uses the user's existing local Codex CLI installation and authentication.

## Prerequisites for local coding tasks

Install and authenticate Codex CLI separately, then ensure `codex` is available in `PATH`.

You can verify it with:

```bash
codex --version
```

If Codex is not installed, Sen still opens normally and shows **Codex missing** in the workspace bar.

## Run in development

Requirements:

- Node.js 22+
- Rust stable
- platform dependencies required by Tauri 2

Then:

```bash
npm ci
npm run desktop:dev
```

The desktop UI can also be previewed without Tauri:

```text
http://localhost:5173/?desktop=1
```

Native workspace, Pin, Startup and agent execution controls require the Tauri desktop host.

## Build locally

```bash
npm run desktop:build
```

The desktop bundle target is NSIS on Windows.

## Build a Windows installer in GitHub Actions

Run the **Build Sen Windows** workflow manually. It builds the NSIS installer and uploads it as the `Sen-Windows-Installer` artifact.

Tags matching:

```text
sen-desktop-v*
```

also trigger the Windows build workflow.

## Architecture

```text
Sen Desktop
├─ React + Three.js mascot
├─ Tauri shell
│  ├─ window lifecycle
│  ├─ system tray
│  ├─ global shortcut
│  ├─ always-on-top
│  ├─ Windows autostart
│  ├─ workspace picker
│  ├─ Git workspace inspector
│  └─ NSIS packaging
└─ Local agent bridge
   ├─ executor detection
   ├─ Codex CLI
   ├─ process lifecycle / Stop
   └─ post-task Git refresh
```

The mascot is treated as frozen **Character v1**. Future desktop work should focus on agent memory, task history, permissions and orchestration rather than adding more visual effects.
