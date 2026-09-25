# Sen — Vietnamese Lotus AI Companion

**Sen** is a gentle, thoughtful AI companion inspired by the Vietnamese lotus: a living presence that listens, opens petal by petal, and folds into a protected bud to rest. _Dịu dàng bên bạn._

The repository keeps its historical name, `VeyraBot`; the product and character are now **Sen**.

## Public preview

[Meet Sen on GitHub Pages](https://loccao102.github.io/VeyraBot/) · [Alternative preview](https://raw.githack.com/Loccao102/VeyraBot/gh-pages/index.html)

Every push to `main` builds and publishes the static preview to `gh-pages` through the existing GitHub Actions workflow. Relative asset paths support both this preview and GitHub Pages hosting.

## Character direction — v0.5

Sen's identity combines layered lotus petals, a pearl ivory face with expressive rose-brown eyes, leaf accents and fine champagne ornament. The silhouette is organic, rounded and light, with floating petal modules in place of mechanical hands. There is no visible mouth. A small pink crystal is the warm heart of the companion.

The scene draws lightly from a moon gate and a still lotus pond. Serif typography, hairline ornaments, warm ivory space and restrained metallic edges give the playground a classical touch without overwhelming its modern purpose.

### Palette and materials

| Material     | Direction                                                          |
| ------------ | ------------------------------------------------------------------ |
| Outer petals | Lotus pink, blush and pearl pink ceramic with subtle iridescence   |
| Face         | Warm pearl ivory; expressive rose-brown eyes, soft brows and blush |
| Leaves       | Soft lotus-leaf green with fine veins                              |
| Trim         | Champagne / rose-gold outlines and delicate curled motifs          |
| Core         | Pink crystal with a small, warm pulse                              |

### Energy and gradual bloom

The **Năng lượng · Energy** slider previews a companion energy level from **0–100%**. It is a character animation control, not a device battery reading or a claim about a connected AI service.

- At **0%**, Sen is enclosed in a lotus bud.
- As energy rises, alternating petal layers unfurl continuously and Sen emerges from within.
- At **100%**, the flower is fully open, with a brighter core and wider crown.
- **Nở từ từ · Let Sen bloom** starts a roughly 24-second bloom from 0 to 100%. Pause or use the slider to explore intermediate forms.
- **Rest** closes the bud at any energy level. Leaving Rest opens Sen back to the selected level; it does not erase that level.

The bud uses continuous geometry morphs with matching animated trim, rather than swapping between unrelated models. State transitions are damped so they remain gentle when controls change quickly.

### States

| State        | Sen's behavior                                                                  |
| ------------ | ------------------------------------------------------------------------------- |
| Idle         | Gentle floating, soft petal movement, blinking and a warm gaze                  |
| Thinking     | Slight head tilt, focused eyes and a more gathered crown                        |
| Listening    | Attentive eyes, opening crown and soft pond ripples                             |
| Working      | Steadier floating modules, small jade task panels and a warm core               |
| Success      | Smiling eyes, wider petals and a few celebratory petals                         |
| Sleep / Rest | Body draws inside a closed, leaf-supported lotus bud; light and movement settle |

Pointer-aware gaze and drag-to-orbit remain available. The layout adapts to mobile, and motion preferences reduce ambient movement. The scene uses local procedural geometry and generated studio lighting, with no external model or environment download required. A WebGL fallback leaves the command interface available.

## Agent playground

The existing lifecycle remains:

`command → listening → thinking → working → success → idle`

The command dock, quick commands, cancel, recent history and browser voice input are retained. The internal hook name `useVeyraAgent` remains for compatibility; user-facing text uses Sen.

**This is an interactive demo.** Responses are simulated; filesystem, Git, memory, coding agents and real execution tools are not connected. Voice input requires browser support and microphone permission, and captured text can be reviewed before sending.

## Development

```bash
npm ci
npm run dev
```

```bash
npm run build
npm run preview
```

## Main files

- `src/SenModel.jsx` — petals, expressive face, state gestures and energy-driven bud morphs.
- `src/main.jsx` — garden, lighting, energy controls, state selection and command interface.
- `src/styles.css` — ivory / lotus visual identity and responsive layout.
- `src/useVeyraAgent.js` — agent lifecycle, cancellation, demo responses and voice input.
- `.github/workflows/deploy-pages.yml` — reproducible build and publication to `gh-pages`.

## Next direction

1. Refine authored petal geometry, delicate surface motifs and conversational micro-expressions.
2. Give energy a meaningful relationship to real companion activity and rest when the agent backend exists.
3. Connect Sen Core to project context, persistent memory and explicitly authorized local tools.
4. Explore an optimized GLB and desktop companion shell while retaining the lotus-bud behavior.
