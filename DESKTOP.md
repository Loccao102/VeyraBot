# Sen Desktop

Sen Desktop reuses the existing 3D Sen mascot as a lightweight desktop companion.

## Current v0.1 shell

- Tauri 2 desktop host
- compact 480×700 companion window
- the same animated Sen model and six moods as the web playground
- compact command input
- local time / weather visual presence
- system tray with **Show / Hide Sen** and **Quit Sen**
- global shortcut: **Ctrl + Shift + Space**
- closing the window hides Sen to the tray instead of ending the process
- the web playground remains unchanged

## Run

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

## Build

```bash
npm run desktop:build
```

Bundling/installers are intentionally disabled in the first shell while the app identity/icon and Windows packaging are finalized.

## Architecture

```text
Sen Desktop
├─ React + Three.js mascot
├─ Tauri shell
│  ├─ window lifecycle
│  ├─ system tray
│  └─ global shortcut
└─ Agent layer (next)
   ├─ intent
   ├─ planner
   ├─ dispatcher
   └─ tool / coding-agent adapters
```

The mascot is treated as frozen Character v1. Future work should focus on desktop behavior and agent capability rather than adding more visual effects.
