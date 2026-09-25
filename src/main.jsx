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
import usePersonalGarden from "./usePersonalGarden";
import useVeyraAgent from "./useVeyraAgent";
import { captureSenMoment } from "./captureMoment";
import "./styles.css";

const STATES = [
  ["idle", "Idle", "A quiet moment, together.", "◌"],
  ["thinking", "Thinking", "A little space for a thoughtful answer.", "◇"],
  ["listening", "Listening", "You have my attention.", "∿"],
  ["working", "Working", "One gentle step at a time.", "⌁"],
  ["success", "Success", "Small steps. Beautiful progress.", "✦"],
  ["sleep", "Rest", "Folded into stillness. Ready when you are.", "☾"],
];
const STATE_LIGHTS = {
  idle: { color: "#efb7c7", back: "#b9c7a5", intensity: 0.48 },
  thinking: { color: "#c6afff", back: "#e1bd7f", intensity: 0.72 },
  listening: { color: "#8fd8d0", back: "#c5e5dc", intensity: 0.66 },
  working: { color: "#a8c98d", back: "#e0b978", intensity: 0.72 },
  success: { color: "#ffd07b", back: "#f2a9c0", intensity: 0.98 },
  sleep: { color: "#9ab4e8", back: "#b99bd3", intensity: 0.38 },
};

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

function PersonalPanel({ personal, onClose }) {
  const progressPercent = Math.round(personal.progress * 100);

  return (
    <div className="personal-panel" role="dialog" aria-label="My Sen">
      <div className="personal-panel-head">
        <div>
          <small>P3 · MY SEN</small>
          <strong>{personal.levelName}</strong>
          <span>
            Level {personal.level} · {personal.gardenStyleLabel} · Together for{" "}
            {personal.ageDays} day{personal.ageDays === 1 ? "" : "s"}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close My Sen">
          ×
        </button>
      </div>

      <div className="personal-progress">
        <span>
          <b>{progressPercent}%</b>
          {personal.nextLevel
            ? `toward ${personal.nextLevel.name}`
            : "garden fully grown"}
        </span>
        <i>
          <b style={{ width: `${progressPercent}%` }} />
        </i>
      </div>

      <div className="personal-stats">
        <div>
          <small>NATURE</small>
          <strong>{personal.dna.nature}</strong>
        </div>
        <div>
          <small>RETURN DAYS</small>
          <strong>{personal.profile.visitDays.length}</strong>
        </div>
        <div>
          <small>THOUGHTS</small>
          <strong>{personal.profile.thoughtsPlaced}</strong>
        </div>
        <div>
          <small>FOCUS</small>
          <strong>{Math.round(personal.profile.focusMinutes)}m</strong>
        </div>
      </div>

      <div className="personal-affinity">
        <div className="personal-affinity-head">
          <small>HOW YOUR GARDEN IS LEARNING</small>
          <strong>{personal.gardenStyleLabel}</strong>
        </div>
        <div className="personal-affinity-bars">
          {[
            ["Focus", personal.affinities.normalized.focus],
            ["Thought", personal.affinities.normalized.reflection],
            ["Explore", personal.affinities.normalized.explorer],
            ["Night", personal.affinities.normalized.nocturne],
          ].map(([label, value]) => (
            <span key={label}>
              <em>{label}</em>
              <i>
                <b style={{ width: `${Math.round(value * 100)}%` }} />
              </i>
            </span>
          ))}
        </div>
      </div>

      <div className="personal-dna">
        <div>
          <small>SEN DNA · {personal.dna.signature}</small>
          <span>Your Sen keeps the same quiet signature on this browser.</span>
        </div>
        <div className="personal-swatches" aria-label="Your Sen palette">
          {[
            personal.dna.petalPrimary,
            personal.dna.petalSoft,
            personal.dna.leaf,
            personal.dna.gold,
          ].map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </div>
      </div>

      <div className="personal-unlocks">
        <small>GROWN SO FAR</small>
        <p>{personal.unlocks.join(" · ")}</p>
      </div>
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
  personal,
}) {
  const stateLight = STATE_LIGHTS[state] ?? STATE_LIGHTS.idle;

  return (
    <>
      <EnvironmentEffects
        phase={presence}
        weather={weather}
        reducedMotion={reducedMotion}
        sleeping={state === "sleep"}
      />
      <pointLight
        position={[0, 1.15, 2.2]}
        intensity={stateLight.intensity}
        distance={5.5}
        decay={2}
        color={stateLight.color}
      />
      <pointLight
        position={[0, 1.55, -1.6]}
        intensity={stateLight.intensity * 0.62}
        distance={5}
        decay={2}
        color={stateLight.back}
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
          personal={personal}
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
  const [resetKey, setResetKey] = useState(0);
  const [energy, setEnergy] = useState(72);
  const [blooming, setBlooming] = useState(false);
  const [presenceLabOpen, setPresenceLabOpen] = useState(false);
  const [ritualPanelOpen, setRitualPanelOpen] = useState(false);
  const [personalPanelOpen, setPersonalPanelOpen] = useState(false);
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
  const personal = usePersonalGarden({
    existingThoughts: ritual.thoughtCount,
    currentPhase:
      presence.phaseMode === "auto" ? presence.phase.key : null,
  });
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
    personal.registerFocus(ritual.focus.durationMs / 60_000);
    setState("success");
    const timer = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [ritual.focus.completionId]);

  useEffect(() => {
    if (!interaction.lastDiscovery?.id) return;
    personal.registerDiscovery(interaction.lastDiscovery.id);
  }, [interaction.lastDiscovery?.id]);

  const addRitualThought = (text) => {
    const thought = ritual.addThought(text);
    if (thought) {
      interaction.celebrateThought();
      personal.registerThought();
    }
  };

  const startFocus = (minutes) => {
    setState("idle");
    setBlooming(false);
    setRitualPanelOpen(false);
    setPersonalPanelOpen(false);
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
      if (result.mode !== "cancelled") personal.registerCapture();
    } catch {
      setCaptureStatus("error");
    }
    window.setTimeout(() => setCaptureStatus("idle"), 2200);
  };

  return (
    <main
      className={`app-shell state-${state} time-${presence.phase.key} weather-${presence.weather.key} garden-level-${personal.level} garden-style-${personal.gardenStyle} ${
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
          <div className="intro-kicker">
            <LotusMark />
            <span>LOTUS COMPANION</span>
          </div>
          <h1>
            A little
            <br />
            <em>Sen.</em>
          </h1>
          <span className="vietnamese-note" lang="vi">
            Dịu dàng bên bạn.
          </span>
          <div className="states-heading">
            <h2>Moments</h2>
            <span>{state.toUpperCase()}</span>
          </div>
          <nav className="state-panel" aria-label="Character states">
            {STATES.map(([value, label, , glyph], index) => (
              <button
                key={value}
                className={`state-btn ${state === value ? "active" : ""}`}
                aria-pressed={state === value}
                disabled={isRunning}
                onClick={() => setState(value)}
              >
                <span className="state-glyph">{glyph}</span>
                <span className="state-label">{label}</span>
                <span className="state-number">0{index + 1}</span>
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
              DISCOVERED {personal.discoveryCount}/{interaction.discoveryTotal}
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
                  halo={1.35}
                  core={1.15}
                  hover={0.95}
                  reducedMotion={reducedMotion}
                  resetKey={resetKey}
                  presence={presence.phase}
                  weather={presence.weather}
                  mood={presence.mood}
                  interaction={interaction}
                  interactionEnabled={!isRunning && !ritual.focus.active}
                  ritual={ritual}
                  focusActive={ritual.focus.active}
                  personal={personal}
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
                setPersonalPanelOpen(false);
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
                setPersonalPanelOpen(false);
                setRitualPanelOpen((value) => !value);
              }}
            >
              Rituals
            </button>
            <button
              type="button"
              className={personalPanelOpen ? "active" : ""}
              onClick={() => {
                setPresenceLabOpen(false);
                setRitualPanelOpen(false);
                setPersonalPanelOpen((value) => !value);
              }}
            >
              My Sen · L{personal.level}
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
          {personalPanelOpen && !ritual.focus.active && (
            <PersonalPanel
              personal={personal}
              onClose={() => setPersonalPanelOpen(false)}
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
          <div className="moment-card">
            <small>CURRENT MOMENT</small>
            <div className="moment-symbol">{current[3]}</div>
            <strong>{current[1]}</strong>
            <p>{current[2]}</p>
            <div className="moment-palette" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>

          <button
            type="button"
            className={`rest-toggle ${state === "sleep" ? "active" : ""}`}
            onClick={() => setState(state === "sleep" ? "idle" : "sleep")}
            disabled={isRunning}
          >
            <span>{state === "sleep" ? "☀" : "☾"}</span>
            <span>
              <strong>{state === "sleep" ? "Wake Sen" : "Rest mode"}</strong>
              <small>
                {state === "sleep"
                  ? "Open the lotus again"
                  : "Fold into a quiet bud"}
              </small>
            </span>
          </button>
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
        <span>P3 · PERSONAL · v1.2</span>
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
