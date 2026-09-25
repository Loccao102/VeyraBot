# VeyraBot

**Veyra** is a personal AI companion designed as a living 3D presence instead of a conventional chatbot window.

## Live playground

Temporary public preview:

https://raw.githack.com/Loccao102/VeyraBot/gh-pages/index.html

The `gh-pages` branch is rebuilt automatically from `main`.

## Current milestone — Character Playground v0.3

- Procedural React Three Fiber character with no external model dependency
- Signature visor, ear fins, dual halo, energy core and levitation system
- Runtime states: Idle, Thinking, Listening, Working, Success and Sleep
- Pointer-aware gaze and head tracking
- State-driven arm gestures and body language
- Listening energy waves
- Working holographic focus panels
- Success particles and low-energy sleep behavior
- Live controls for halo speed, core energy and hover amplitude
- Galaxy playground UI

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Direction

Veyra will evolve into a desktop AI companion that can understand project context, remember work, delegate to coding/browser/research agents and operate local tools with explicit permissions.

### Character roadmap

1. v0.2 — procedural full-form character and state language
2. v0.3 — gaze, hand/arm gestures, reactive behavior and richer face language
3. v0.4 — voice-reactive animation, authored rig and conversational micro-gestures
4. v0.5 — optimized production GLB with baked animation clips

### Agent roadmap

`Desktop Shell → Veyra Core → Memory → Planner → Tools → Sub-agents → Project Galaxy`
