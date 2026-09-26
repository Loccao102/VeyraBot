# Sen Desktop

Sen Desktop reuses the finished 3D Sen mascot as a lightweight desktop companion.

## Current v0.2

- Tauri 2 desktop host
- compact 480×700 companion window
- the same animated Sen model and six moods as the web playground
- compact command input and voice entry
- local time / weather visual presence
- system tray with **Show / Hide Sen** and **Quit Sen**
- global shortcut: **Ctrl + Shift + Space**
- closing the window hides Sen to the tray instead of ending the process
- **Pin** toggle to keep Sen always on top
- **Startup** toggle to launch Sen when Windows signs in
- autostart launches Sen quietly in the tray with `--minimized`
- Windows NSIS installer packaging
- the web playground remains unchanged

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

Desktop-only controls such as **Pin** and **Startup** are disabled in browser preview because they require the Tauri host.

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
│  └─ NSIS packaging
└─ Agent layer (next)
   ├─ intent
   ├─ planner
   ├─ dispatcher
   └─ tool / coding-agent adapters
```

The mascot is treated as frozen **Character v1**. Future work should focus on desktop behavior and agent capability rather than adding more visual effects.
