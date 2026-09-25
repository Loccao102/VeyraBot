import React, { Component, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  Html,
} from "@react-three/drei";
import SenModel from "./SenModel";
import useVeyraAgent from "./useVeyraAgent";
import "./styles.css";

const STATES = [
  ["idle", "Idle", "A quiet moment, together."],
  ["thinking", "Thinking", "A little space for a thoughtful answer."],
  ["listening", "Listening", "You have my attention."],
  ["working", "Working", "One gentle step at a time."],
  ["success", "Success", "Small steps. Beautiful progress."],
  ["sleep", "Rest", "Folded into stillness. Ready when you are."],
];
const QUICK_COMMANDS = [
  "Continue my project",
  "Check this repo",
  "Explore a design",
];

function LotusMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 35C10 26 15 14 24 5c9 9 14 21 0 30Z"
        fill="currentColor"
        opacity=".8"
      />
      <path
        d="M24 36C9 37 4 27 4 18c12 1 20 7 20 18Zm0 0c15 1 20-9 20-18-12 1-20 7-20 18Z"
        fill="currentColor"
        opacity=".55"
      />
      <path
        d="M11 39c8 5 18 5 26 0M24 35v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <LotusMark />
        <p>Sen is here. The 3D garden needs a browser with WebGL.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Scene({ state, energy, halo, core, hover, reducedMotion, resetKey }) {
  return (
    <>
      <ambientLight
        intensity={state === "sleep" ? 0.65 : 0.9}
        color="#fff0e4"
      />
      <directionalLight position={[3, 5, 5]} intensity={2} color="#fff3df" />
      <directionalLight position={[-4, 2, 1]} intensity={1.6} color="#ffd2de" />
      <directionalLight position={[0, 2, -4]} intensity={2.4} color="#fff9ed" />
      <Suspense
        fallback={
          <Html center>
            <span className="loading">Sen is waking…</span>
          </Html>
        }
      >
        <SenModel
          state={state}
          energy={energy}
          haloControl={halo}
          coreControl={core}
          hoverControl={hover}
          reducedMotion={reducedMotion}
        />
        <Environment resolution={64}>
          <Lightformer
            position={[0, 5, -3]}
            scale={[8, 8, 1]}
            intensity={2}
            color="#fff2e2"
          />
          <Lightformer
            position={[-4, 1, 3]}
            rotation={[0, Math.PI / 3, 0]}
            scale={[4, 7, 1]}
            intensity={3}
            color="#ffe5e9"
          />
          <Lightformer
            position={[4, 2, 2]}
            rotation={[0, -Math.PI / 3, 0]}
            scale={[3, 6, 1]}
            intensity={2}
            color="#ffffff"
          />
        </Environment>
      </Suspense>
      <ContactShadows
        position={[0, -1.16, 0]}
        opacity={0.17}
        scale={5}
        blur={2.8}
        far={2.5}
        color="#765747"
        resolution={256}
      />
      <OrbitControls
        key={resetKey}
        makeDefault
        target={[0, 0.24, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.85}
        dampingFactor={0.06}
      />
    </>
  );
}

function App() {
  const [halo, setHalo] = useState(1),
    [core, setCore] = useState(1),
    [hover, setHover] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [energy, setEnergy] = useState(72);
  const [blooming, setBlooming] = useState(false);
  const reducedMotion = useReducedMotion();
  const {
    state,
    setState,
    command,
    setCommand,
    message,
    history,
    isRunning,
    runCommand,
    cancel,
    startVoiceInput,
  } = useVeyraAgent();
  const current = STATES.find((item) => item[0] === state);
  useEffect(() => {
    if (!blooming || state === "sleep" || energy >= 100) return;
    const timer = setTimeout(
      () => setEnergy((value) => Math.min(100, value + 1)),
      240,
    );
    return () => clearTimeout(timer);
  }, [blooming, energy, state]);
  const isBlooming = blooming && energy < 100 && state !== "sleep";
  const bloomLabel =
    state === "sleep"
      ? "Resting bud"
      : energy < 20
        ? "A quiet bud"
        : energy < 50
          ? "Waking gently"
          : energy < 85
            ? "Opening, petal by petal"
            : "In full bloom";
  const startBloom = () => {
    setEnergy(0);
    setState("idle");
    setBlooming(true);
  };
  return (
    <main className={`app-shell state-${state}`}>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Sen home">
          <LotusMark />
          <strong>sen</strong>
          <span>A QUIETER KIND OF INTELLIGENCE</span>
        </a>
        <div className="edition">
          <span className="online-dot" />
          THE LOTUS EDITION <span className="edition-number">N° 01</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="intro-panel">
          <div className="eyebrow">ROOTED IN VIETNAM · MADE TO BE WITH YOU</div>
          <h1>
            A quiet mind.
            <br />
            <em>A little Sen.</em>
          </h1>
          <p className="intro-text">
            Inspired by the lotus.
            <br />
            Here to listen, think, and grow with you.
          </p>
          <span className="vietnamese-note" lang="vi">
            Dịu dàng bên bạn.
          </span>
          <div className="ornament">
            <span />✧<span />
          </div>
          <div className="states-heading">
            <h2>Moments of Sen</h2>
            <span>01 — 06</span>
          </div>
          <nav className="state-panel" aria-label="Character states">
            {STATES.map(([value, label], index) => (
              <button
                key={value}
                className={`state-btn ${state === value ? "active" : ""}`}
                aria-pressed={state === value}
                disabled={isRunning}
                onClick={() => setState(value)}
              >
                <span className="state-number">0{index + 1}</span>
                <span>{label}</span>
                <span className="state-glyph">
                  {value === "sleep" ? "☾" : "✧"}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="garden" aria-label="Interactive 3D Sen companion">
          <div className="garden-moon" />
          <div className="garden-ring" />
          <div className="scene-topline">
            <span>THE LOTUS GARDEN</span>
            <span>✧</span>
            <span>EST. 2026</span>
          </div>
          <div className="canvas-wrap">
            <SceneBoundary>
              <Canvas
                key={resetKey}
                camera={{ position: [0, 0.75, 6.4], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
                fallback={
                  <div className="scene-fallback">
                    <LotusMark />
                    <p>Enable WebGL to meet Sen in 3D.</p>
                  </div>
                }
              >
                <Scene
                  state={state}
                  energy={energy}
                  halo={halo}
                  core={core}
                  hover={hover}
                  reducedMotion={reducedMotion}
                  resetKey={resetKey}
                />
              </Canvas>
            </SceneBoundary>
          </div>
          <div className="scene-caption">
            <span className="caption-line" />
            <span>{current[2]}</span>
            <span className="caption-line" />
          </div>
          <div className="scene-tools">
            <span>Drag gently to look around</span>
            <button onClick={() => setResetKey((k) => k + 1)}>
              Reset view ↺
            </button>
          </div>
        </section>

        <aside className="detail-panel">
          <div className="detail-seal">
            <LotusMark />
          </div>
          <div className="eyebrow">MEET YOUR COMPANION</div>
          <h2>
            Soft by nature.
            <br />
            <em>Bright within.</em>
          </h2>
          <p>
            Petal by petal, a familiar presence. Pearl ceramic, lotus pink, and
            a little warmth from within.
          </p>
          <div
            className="palette"
            aria-label="Lotus pink, pearl ivory, leaf green and champagne palette"
          >
            {["#e5a2b6", "#f6e4d7", "#708771", "#b18a5c"].map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
            <small>THE SEN PALETTE</small>
          </div>
          <section className="control-panel" aria-label="Character controls">
            <div className="eyebrow">A MOMENT, YOUR WAY</div>
            {[
              ["Petal drift", halo, setHalo],
              ["Inner warmth", core, setCore],
              ["Gentle float", hover, setHover],
            ].map(([label, value, setter]) => (
              <label key={label}>
                <span>
                  {label}
                  <b>{value.toFixed(1)}</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step=".1"
                  value={value}
                  onChange={(event) => setter(+event.target.value)}
                />
              </label>
            ))}
          </section>
          <div className="rest-note">
            <span>☾</span>
            <p>
              Even a lotus needs to rest.
              <br />
              Try{" "}
              <button onClick={() => setState("sleep")} disabled={isRunning}>
                Rest mode
              </button>{" "}
              and watch Sen curl into a bud.
            </p>
          </div>
        </aside>
      </div>

      <section className="energy-panel" aria-label="Sen energy">
        <div className="energy-heading">
          <LotusMark />
          <div>
            <label htmlFor="sen-energy">Năng lượng · Energy</label>
            <span>{bloomLabel}</span>
          </div>
          <output htmlFor="sen-energy">
            {energy}
            <small>%</small>
          </output>
        </div>
        <input
          id="sen-energy"
          type="range"
          min="0"
          max="100"
          step="1"
          value={energy}
          aria-valuetext={`${energy}% — ${bloomLabel}`}
          onChange={(event) => {
            setBlooming(false);
            setEnergy(+event.target.value);
          }}
        />
        <div className="energy-footer">
          <span>
            0 · Nụ sen <span>100 · Nở trọn</span>
          </span>
          <button
            disabled={isRunning}
            onClick={isBlooming ? () => setBlooming(false) : startBloom}
          >
            {isBlooming ? "Tạm dừng · Pause" : "Nở từ từ · Let Sen bloom"}{" "}
            <span>{isBlooming ? "Ⅱ" : "↗"}</span>
          </button>
        </div>
        <p>
          Companion energy preview.{" "}
          {state === "sleep"
            ? "Choose Idle to open at this energy level."
            : "More energy, a little more bloom."}
        </p>
      </section>
      <section className="agent-panel" aria-label="Talk with Sen">
        <div className="agent-status" role="status" aria-live="polite">
          <span className={`agent-status-dot ${state}`} />
          <div>
            <small>
              {isRunning
                ? current[1]
                : state === "sleep"
                  ? "RESTING, NEARBY"
                  : "SEN IS HERE"}
            </small>
            <p>
              {!isRunning && state === "sleep"
                ? "A quiet pause. Send a thought to wake Sen."
                : message}
            </p>
          </div>
          <span className="demo-label">INTERACTIVE DEMO</span>
        </div>
        {history.length > 0 && (
          <div className="agent-history" aria-label="Recent conversation">
            {history.slice(-3).map((item) => (
              <div key={item.id} className={`history-row ${item.type}`}>
                <span>{item.type === "user" ? "YOU" : "SEN"}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        )}
        <div className="quick-commands">
          {QUICK_COMMANDS.map((item) => (
            <button
              key={item}
              disabled={isRunning}
              onClick={() => {
                setCommand(item);
                runCommand(item);
              }}
            >
              {item}
              <span>↗</span>
            </button>
          ))}
        </div>
        <form
          className="command-dock"
          onSubmit={(event) => {
            event.preventDefault();
            runCommand();
          }}
        >
          <button
            type="button"
            className="mic-button"
            disabled={isRunning}
            onClick={startVoiceInput}
            title="Voice input"
            aria-label="Voice input"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v4m-4 0h8" />
            </svg>
          </button>
          <input
            aria-label="Your message to Sen"
            value={command}
            disabled={isRunning}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={
              isRunning
                ? "Sen is giving this a little thought…"
                : "What’s on your mind?"
            }
          />
          {isRunning ? (
            <button type="button" className="cancel-button" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              className="send-button"
              disabled={!command.trim()}
            >
              Send to Sen <span>↗</span>
            </button>
          )}
        </form>
      </section>
      <footer className="bottombar">
        <span>
          <LotusMark />
          SEN — VIETNAMESE LOTUS AI COMPANION
        </span>
        <span>A more mindful tomorrow, together.</span>
        <span>CHARACTER STUDY · v0.5</span>
      </footer>
    </main>
  );
}

// Keep one React root when this entry module is refreshed during design iteration.
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
