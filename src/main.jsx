import React, { Component, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  Html,
} from "@react-three/drei";
import SenModel from "./SenModel";
import EnvironmentEffects from "./EnvironmentEffects";
import usePresence from "./usePresence";
import useInteractionManager from "./useInteractionManager";
import useRitualGarden from "./useRitualGarden";
import useVeyraAgent from "./useVeyraAgent";
import { captureSenMoment } from "./captureMoment";
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

const PRESENCE_ICONS = {
  dawn: "☼",
  day: "☀",
  dusk: "◒",
  night: "☾",
  clear: "✧",
  cloudy: "☁",
  rain: "☂",
  mist: "≋",
  wind: "〰",
};

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

function PresenceLab({ presence, onClose }) {
  const weatherDetail =
    presence.weatherStatus === "locating"
      ? "Waiting for location permission…"
      : presence.weatherStatus === "loading"
        ? "Reading local weather…"
        : presence.weatherStatus === "denied"
          ? "Location permission was denied."
          : presence.weatherStatus === "error"
            ? "Weather could not be loaded."
            : presence.weatherStatus === "unsupported"
              ? "Geolocation is not available in this browser."
              : presence.weatherInfo?.temperature != null
                ? `${Math.round(presence.weatherInfo.temperature)}°C · ${Math.round(
                    presence.weatherInfo.windSpeed ?? 0,
                  )} km/h wind`
                : "Auto uses local weather after you allow location once.";

  return (
    <div className="presence-lab" role="dialog" aria-label="P1 Presence preview">
      <div className="presence-lab-head">
        <div>
          <small>P1 · PRESENCE LAB</small>
          <strong>
            {presence.phase.label} · {presence.weather.label}
          </strong>
          <span>Mood · {presence.mood.label}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Presence Lab">
          ×
        </button>
      </div>

      <label>
        <span>Time</span>
        <select
          value={presence.phaseMode}
          onChange={(event) => presence.setPhaseMode(event.target.value)}
        >
          <option value="auto">Auto · local clock</option>
          <option value="dawn">Dawn</option>
          <option value="day">Day</option>
          <option value="dusk">Dusk</option>
          <option value="night">Night</option>
        </select>
      </label>

      <label>
        <span>Weather</span>
        <select
          value={presence.weatherMode}
          onChange={(event) => presence.setWeatherMode(event.target.value)}
        >
          <option value="auto">Auto · local weather</option>
          <option value="clear">Clear</option>
          <option value="cloudy">Cloudy</option>
          <option value="rain">Rain</option>
          <option value="mist">Mist</option>
          <option value="wind">Wind</option>
        </select>
      </label>

      <button
        type="button"
        className="local-weather-button"
        onClick={presence.requestLocalWeather}
        disabled={
          presence.weatherStatus === "locating" ||
          presence.weatherStatus === "loading"
        }
      >
        Use my local weather
      </button>
      <p>{weatherDetail}</p>
      <small className="presence-lab-hint">
        Tip: use manual values to preview P1 instantly, then switch back to Auto.
      </small>
    </div>
  );
}

function formatFocusTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;
}

function RitualPanel({
  ritual,
  onClose,
  onAddThought,
  onStartFocus,
  onCapture,
  captureStatus,
  disabled,
}) {
  const [thought, setThought] = useState("");

  const submitThought = (event) => {
    event.preventDefault();
    if (!thought.trim()) return;
    onAddThought(thought);
    setThought("");
  };

  return (
    <div className="ritual-panel" role="dialog" aria-label="Sen rituals">
      <div className="ritual-panel-head">
        <div>
          <small>P2 · QUIET RITUALS</small>
          <strong>Stay a little longer.</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close rituals">
          ×
        </button>
      </div>

      <div className="ritual-stack">
        <section className="ritual-item ritual-thought">
          <div className="ritual-item-title">
            <span>01</span>
            <div>
              <strong>Leave a thought</strong>
              <small>It becomes a petal in your pond.</small>
            </div>
          </div>
          <form className="thought-form" onSubmit={submitThought}>
            <textarea
              id="sen-thought"
              aria-label="Leave a thought with Sen"
              maxLength={160}
              rows={3}
              value={thought}
              disabled={disabled}
              onChange={(event) => setThought(event.target.value)}
              placeholder="Write something you want to leave here…"
            />
            <div>
              <span>{ritual.thoughtCount}/24 in the pond</span>
              <button type="submit" disabled={disabled || !thought.trim()}>
                Place it ↘
              </button>
            </div>
          </form>
        </section>

        <section className="ritual-item focus-ritual">
          <div className="ritual-item-title">
            <span>02</span>
            <div>
              <strong>Stay with Sen</strong>
              <small>A quiet focus session. Nothing else.</small>
            </div>
          </div>
          <div className="focus-options">
            {[1, 25, 45].map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={disabled}
                onClick={() => onStartFocus(minutes)}
              >
                {minutes === 1 ? "1m preview" : `${minutes}m`}
              </button>
            ))}
          </div>
        </section>

        <section className="ritual-item ritual-capture">
          <div className="ritual-item-title">
            <span>03</span>
            <div>
              <strong>Keep the moment</strong>
              <small>Save the garden as a shareable image.</small>
            </div>
          </div>
          <button
            type="button"
            className="capture-moment-button"
            onClick={onCapture}
            disabled={disabled || captureStatus === "working"}
          >
            <span>Capture</span>
            <b>
              {captureStatus === "working"
                ? "Preparing…"
                : captureStatus === "done"
                  ? "Saved ✧"
                  : captureStatus === "error"
                    ? "Try again"
                    : "PNG ↗"}
            </b>
          </button>
        </section>
      </div>
    </div>
  );
}

function FocusHUD({ focus, onTogglePause, onExit }) {
  const progress =
    focus.durationMs > 0
      ? Math.max(
          0,
          Math.min(1, 1 - focus.remainingMs / focus.durationMs),
        )
      : 0;

  return (
    <div
      className="focus-hud"
      aria-live="polite"
      style={{ "--focus-progress": `${progress * 100}%` }}
    >
      <div className="focus-hud-brand">
        <LotusMark />
        <span>Stay with Sen</span>
      </div>
      <div className="focus-clock">
        <strong>{formatFocusTime(focus.remainingMs)}</strong>
        <span>{focus.paused ? "Paused" : "Quiet focus"}</span>
      </div>
      <div className="focus-actions">
        <button type="button" onClick={onTogglePause}>
          {focus.paused ? "Continue" : "Pause"}
        </button>
        <button type="button" onClick={onExit}>
          Exit
        </button>
      </div>
      <span className="focus-progress" aria-hidden="true">
        <i />
      </span>
    </div>
  );
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

function Scene({
  state,
  energy,
  halo,
  core,
  hover,
  reducedMotion,
  resetKey,
  presence,
  weather,
  mood,
  interaction,
  interactionEnabled,
  ritual,
  focusActive,
}) {
  return (
    <>
      <EnvironmentEffects
        phase={presence}
        weather={weather}
        reducedMotion={reducedMotion}
        sleeping={state === "sleep"}
      />
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
          presencePhase={presence.key}
          presenceWeather={weather.key}
          presenceMood={mood.key}
          interaction={interaction}
          interactionEnabled={interactionEnabled}
          ritual={ritual}
          focusActive={focusActive}
        />
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
      {!focusActive && (
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
      )}
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
  const [presenceLabOpen, setPresenceLabOpen] = useState(false);
  const [ritualPanelOpen, setRitualPanelOpen] = useState(false);
  const [captureStatus, setCaptureStatus] = useState("idle");
  const reducedMotion = useReducedMotion();
  const presence = usePresence();
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
  const interaction = useInteractionManager({
    phase: presence.phase.key,
    weather: presence.weather.key,
    state,
    enabled: !isRunning,
  });
  const ritual = useRitualGarden();
  const current = STATES.find((item) => item[0] === state);
  useEffect(() => {
    if (!blooming || state === "sleep" || energy >= 100) return;
    const timer = setTimeout(
      () => setEnergy((value) => Math.min(100, value + 1)),
      140,
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

  useEffect(() => {
    if (!ritual.focus.completionId) return undefined;
    interaction.celebrateFocus();
    setState("success");
    const timer = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [ritual.focus.completionId]);

  const addRitualThought = (text) => {
    const thought = ritual.addThought(text);
    if (thought) interaction.celebrateThought();
  };

  const startFocus = (minutes) => {
    setState("idle");
    setBlooming(false);
    setRitualPanelOpen(false);
    setPresenceLabOpen(false);
    ritual.clearSelectedThought();
    ritual.startFocus(minutes);
  };

  const captureMoment = async () => {
    setCaptureStatus("working");
    try {
      const result = await captureSenMoment({
        phase: presence.phase.key,
        weather: presence.weather.key,
        mood: presence.mood.key,
        thoughtCount: ritual.thoughtCount,
      });
      setCaptureStatus(result.mode === "cancelled" ? "idle" : "done");
    } catch {
      setCaptureStatus("error");
    }
    window.setTimeout(() => setCaptureStatus("idle"), 2200);
  };

  return (
    <main
      className={`app-shell state-${state} time-${presence.phase.key} weather-${presence.weather.key} ${
        ritual.focus.active ? "focus-mode" : ""
      }`}
    >
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
            <span className="scene-presence">
              {PRESENCE_ICONS[presence.phase.key]} {presence.phase.label}
              <i>·</i>
              {PRESENCE_ICONS[presence.weather.key]} {presence.weather.label}
            </span>
            <span className="scene-discoveries">
              DISCOVERED {interaction.discoveryCount}/{interaction.discoveryTotal}
            </span>
          </div>
          <div
            className={`interaction-toast ${
              interaction.reaction.type !== "none" || interaction.hoveredTarget
                ? "visible"
                : ""
            } ${interaction.reaction.discoveryId ? "discovery-found" : ""}`}
            aria-live="polite"
          >
            {interaction.reaction.discoveryId
              ? `✧ ${interaction.reaction.label}`
              : interaction.reaction.label ||
                (interaction.hoveredTarget === "core"
                  ? "Hold Sen’s inner light."
                  : interaction.hoveredTarget?.startsWith("petal:")
                    ? "A petal is listening."
                    : interaction.hoveredTarget === "head"
                      ? "Sen is looking back."
                      : "")}
          </div>
          <div className="canvas-wrap">
            <SceneBoundary>
              <Canvas
                key={`${resetKey}-${ritual.focus.active ? "focus" : "garden"}`}
                camera={
                  ritual.focus.active
                    ? { position: [0, 0.68, 6.85], fov: 36 }
                    : { position: [0, 0.75, 6.4], fov: 38 }
                }
                gl={{
                  antialias: true,
                  alpha: true,
                  preserveDrawingBuffer: true,
                }}
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
                  presence={presence.phase}
                  weather={presence.weather}
                  mood={presence.mood}
                  interaction={interaction}
                  interactionEnabled={!isRunning && !ritual.focus.active}
                  ritual={ritual}
                  focusActive={ritual.focus.active}
                />
              </Canvas>
            </SceneBoundary>
          </div>
          <div className="scene-caption">
            <span className="caption-line" />
            <span>{current[2]}</span>
            <span className="caption-line" />
          </div>
          <div className="scene-tools" aria-label="Garden controls">
            <button
              type="button"
              className={presenceLabOpen ? "active" : ""}
              onClick={() => {
                setRitualPanelOpen(false);
                setPresenceLabOpen((value) => !value);
              }}
            >
              Presence
            </button>
            <button
              type="button"
              className={ritualPanelOpen ? "active" : ""}
              onClick={() => {
                setPresenceLabOpen(false);
                setRitualPanelOpen((value) => !value);
              }}
            >
              Rituals
            </button>
            <button type="button" onClick={() => setResetKey((k) => k + 1)}>
              Reset
            </button>
          </div>
          {presenceLabOpen && (
            <PresenceLab
              presence={presence}
              onClose={() => setPresenceLabOpen(false)}
            />
          )}
          {ritualPanelOpen && !ritual.focus.active && (
            <RitualPanel
              ritual={ritual}
              onClose={() => setRitualPanelOpen(false)}
              onAddThought={addRitualThought}
              onStartFocus={startFocus}
              onCapture={captureMoment}
              captureStatus={captureStatus}
              disabled={isRunning}
            />
          )}
          {ritual.selectedThought && !ritual.focus.active && (
            <div className="thought-card" role="status">
              <button
                type="button"
                onClick={ritual.clearSelectedThought}
                aria-label="Close thought"
              >
                ×
              </button>
              <small>A THOUGHT RESTING HERE</small>
              <p>“{ritual.selectedThought.text}”</p>
              <span>
                {new Date(ritual.selectedThought.createdAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                className="thought-remove"
                onClick={() => ritual.removeThought(ritual.selectedThought.id)}
              >
                Let it go
              </button>
            </div>
          )}
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
      {ritual.focus.active && (
        <FocusHUD
          focus={ritual.focus}
          onTogglePause={ritual.toggleFocusPause}
          onExit={ritual.stopFocus}
        />
      )}
      <footer className="bottombar">
        <span>
          <LotusMark />
          SEN — VIETNAMESE LOTUS AI COMPANION
        </span>
        <span>A more mindful tomorrow, together.</span>
        <span>P2 · PLAY · FINAL PASS · v1.1</span>
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
