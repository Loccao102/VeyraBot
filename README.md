# VeyraBot

**Veyra** is a personal AI companion designed as a living 3D presence instead of a conventional chatbot window.

## Public preview

https://raw.githack.com/Loccao102/VeyraBot/gh-pages/index.html

The `gh-pages` branch is rebuilt automatically from `main`.

## Current milestone — Veyra v0.4

Veyra is now more than a character viewer. The playground demonstrates the first end-to-end agent experience:

`command → listening → thinking → working → success → idle`

### Character system

- Procedural React Three Fiber character
- Pointer-aware gaze and head tracking
- State-based arm poses and body language
- Listening energy waves
- Working holographic focus panels
- Success particles
- Sleep / low-energy state
- New asymmetric **signature crest**
- New chest energy glyph and orbiting satellite
- Live halo, core and hover controls

### Agent interaction

- Command dock
- Quick actions
- Automatic state lifecycle
- Cancelable runs
- Small conversation history
- Browser speech recognition when available
- Mock context-aware responses for project/repo/design commands

The lifecycle is intentionally separated from real tool execution so the next milestone can replace the mock worker with Veyra Core without redesigning the UI or character states.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Roadmap

### Character

1. v0.2 — full-form procedural model
2. v0.3 — gaze, gestures and reactive behavior
3. **v0.4 — signature silhouette + agent-aware behavior**
4. v0.5 — authored rig, conversational micro-gestures and optimized GLB

### Agent

1. command lifecycle prototype
2. project context detection
3. persistent memory
4. local filesystem + Git + shell tools
5. Codex / coding-worker integration
6. browser worker
7. desktop shell / always-on-top companion

Target architecture:

`Desktop Shell → Veyra Core → Memory → Planner → Tools → Sub-agents → Project Galaxy`
