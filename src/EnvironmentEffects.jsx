import React, { useMemo, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TAU = Math.PI * 2;

export const PRESENCE_PHASES = {
  dawn: {
    key: "dawn",
    label: "EARLY LIGHT",
    ambient: "#fff0e3",
    keyLight: "#ffd7c5",
    rimLight: "#f3c4d2",
    backLight: "#fff5df",
    ambientIntensity: 0.72,
    keyIntensity: 1.55,
    rimIntensity: 1.05,
    backIntensity: 1.55,
    particle: "#eab2bd",
    accent: "#d6b07a",
    moteCount: 18,
  },
  day: {
    key: "day",
    label: "DAYLIGHT",
    ambient: "#fff4e8",
    keyLight: "#fff0d7",
    rimLight: "#ffd6df",
    backLight: "#fffaf0",
    ambientIntensity: 0.9,
    keyIntensity: 2,
    rimIntensity: 1.55,
    backIntensity: 2.2,
    particle: "#efb9c7",
    accent: "#c9a474",
    moteCount: 14,
  },
  dusk: {
    key: "dusk",
    label: "GOLDEN HOUR",
    ambient: "#f6dfd5",
    keyLight: "#eeb7a0",
    rimLight: "#d99bad",
    backLight: "#f7d8bd",
    ambientIntensity: 0.68,
    keyIntensity: 1.55,
    rimIntensity: 1.45,
    backIntensity: 1.45,
    particle: "#ef9fb2",
    accent: "#d49a62",
    moteCount: 22,
  },
  night: {
    key: "night",
    label: "MOONLIT",
    ambient: "#d8d7dd",
    keyLight: "#e2d9dc",
    rimLight: "#cdaec4",
    backLight: "#dfe5df",
    ambientIntensity: 0.46,
    keyIntensity: 1,
    rimIntensity: 0.95,
    backIntensity: 0.85,
    particle: "#f1c8d3",
    accent: "#d8c691",
    moteCount: 28,
  },
};

export function getPresencePhase(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return PRESENCE_PHASES.dawn;
  if (hour >= 9 && hour < 16) return PRESENCE_PHASES.day;
  if (hour >= 16 && hour < 19) return PRESENCE_PHASES.dusk;
  return PRESENCE_PHASES.night;
}

function AmbientMotes({ phase, weather, reducedMotion }) {
  const ref = useRef();
  const motes = useMemo(
    () =>
      Array.from(
        {
          length:
            phase.moteCount +
            (weather.key === "mist" ? 10 : weather.key === "wind" ? 6 : 0),
        },
        (_, i) => {
        const seed = (i * 37 + 11) % 97;
        const angle = ((seed / 97) * TAU + i * 0.71) % TAU;
        const radius = 0.9 + ((i * 13) % 19) / 15;
        return {
          x: Math.sin(angle) * radius,
          z: Math.cos(angle) * (0.45 + (i % 5) * 0.08) - 0.18,
          y: -0.55 + ((i * 29) % 100) / 47,
          size: 0.018 + (i % 4) * 0.006,
          phase: i * 0.83,
          speed: 0.28 + (i % 5) * 0.045,
          gold: i % 5 === 0,
        };
      },
      ),
    [phase, weather],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    ref.current?.children.forEach((mesh, i) => {
      const mote = motes[i];
      const movement = reducedMotion ? 0.12 : 1;
      const windPush = weather.key === "wind" ? 0.28 : 0.085;
      mesh.position.x =
        mote.x +
        Math.sin(time * mote.speed + mote.phase) * windPush * movement +
        (weather.key === "wind" ? Math.sin(time * 0.52 + mote.phase) * 0.12 : 0);
      mesh.position.y =
        mote.y +
        Math.sin(time * (mote.speed + 0.17) + mote.phase) * 0.11 * movement;
      const twinkle =
        0.34 + (Math.sin(time * 1.15 + mote.phase) + 1) * 0.18;
      const weatherOpacity =
        weather.key === "rain"
          ? 0.52
          : weather.key === "mist"
            ? 0.68
            : weather.key === "cloudy"
              ? 0.72
              : 1;
      mesh.material.opacity =
        (phase.key === "night" ? twinkle * 0.42 : twinkle * 0.26) *
        weatherOpacity;
      const scale =
        0.82 + Math.sin(time * 0.9 + mote.phase) * 0.14 * movement;
      mesh.scale.setScalar(scale);
    });
  });

  return (
    <group ref={ref}>
      {motes.map((mote, i) => (
        <mesh key={i} position={[mote.x, mote.y, mote.z]}>
          <sphereGeometry args={[mote.size, 8, 6]} />
          <meshBasicMaterial
            color={mote.gold ? phase.accent : phase.particle}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function MoonHalo({ phase, weather, reducedMotion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = reducedMotion
      ? 1
      : 1 + Math.sin(clock.elapsedTime * 0.42) * 0.035;
    ref.current.scale.setScalar(pulse);
    const weatherFade =
      weather.key === "rain" ? 0.35 : weather.key === "cloudy" ? 0.55 : 1;
    ref.current.material.opacity =
      (phase.key === "night" ? 0.14 : phase.key === "dusk" ? 0.07 : 0.035) *
      weatherFade;
  });

  return (
    <mesh
      ref={ref}
      position={[0, 0.45, -1.35]}
      rotation={[0, 0, 0]}
      renderOrder={-1}
    >
      <ringGeometry args={[1.28, 1.31, 96]} />
      <meshBasicMaterial
        color={phase.key === "night" ? "#e6d6db" : "#d9b087"}
        transparent
        opacity={0.05}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function RainField({ reducedMotion }) {
  const geometryRef = useRef();
  const drops = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => ({
        x: -2.4 + ((i * 37) % 100) / 20,
        z: -1.15 + ((i * 53) % 100) / 48,
        seed: ((i * 29) % 100) / 100,
        speed: 0.65 + (i % 7) * 0.055,
        length: 0.08 + (i % 4) * 0.025,
      })),
    [],
  );
  const positions = useMemo(() => new Float32Array(drops.length * 6), [drops]);

  useFrame(({ clock }) => {
    if (!geometryRef.current) return;
    const t = clock.elapsedTime * (reducedMotion ? 0.18 : 1);
    drops.forEach((drop, i) => {
      const travel = (t * drop.speed + drop.seed * 3.4) % 3.4;
      const y = 2.05 - travel;
      const base = i * 6;
      positions[base] = drop.x;
      positions[base + 1] = y;
      positions[base + 2] = drop.z;
      positions[base + 3] = drop.x - 0.025;
      positions[base + 4] = y - drop.length;
      positions[base + 5] = drop.z;
    });
    geometryRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments renderOrder={2}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#bcaeb3"
        transparent
        opacity={0.24}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function MistField({ reducedMotion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current?.children.forEach((mesh, i) => {
      const drift = reducedMotion ? 0.04 : 1;
      mesh.position.x =
        Math.sin(clock.elapsedTime * (0.07 + i * 0.012) + i) * 0.34 * drift;
      mesh.material.opacity =
        0.028 + (Math.sin(clock.elapsedTime * 0.19 + i * 1.7) + 1) * 0.009;
    });
  });

  return (
    <group ref={ref}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, -0.08 + i * 0.5, -0.65 - i * 0.22]}
          scale={[2.8 - i * 0.25, 0.72 + i * 0.12, 1]}
        >
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial
            color={i === 0 ? "#eadfdd" : "#efe6e2"}
            transparent
            opacity={0.035}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function WindField({ reducedMotion }) {
  const geometryRef = useRef();
  const streaks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        y: -0.65 + (i % 6) * 0.42,
        z: -0.9 + (i % 4) * 0.3,
        seed: ((i * 31) % 100) / 100,
        length: 0.12 + (i % 4) * 0.04,
      })),
    [],
  );
  const positions = useMemo(() => new Float32Array(streaks.length * 6), [streaks]);

  useFrame(({ clock }) => {
    if (!geometryRef.current) return;
    const t = clock.elapsedTime * (reducedMotion ? 0.12 : 0.75);
    streaks.forEach((streak, i) => {
      const x = -2.2 + ((t + streak.seed * 4.4) % 4.4);
      const base = i * 6;
      positions[base] = x;
      positions[base + 1] = streak.y;
      positions[base + 2] = streak.z;
      positions[base + 3] = x + streak.length;
      positions[base + 4] = streak.y + 0.012;
      positions[base + 5] = streak.z;
    });
    geometryRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#b9aa9f"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export default function EnvironmentEffects({
  phase,
  weather,
  reducedMotion = false,
  sleeping = false,
}) {
  const weatherKey = weather?.key ?? "clear";
  const weatherLight =
    weatherKey === "rain"
      ? 0.72
      : weatherKey === "mist"
        ? 0.8
        : weatherKey === "cloudy"
          ? 0.84
          : weatherKey === "wind"
            ? 0.93
            : 1;
  const lightMultiplier = (sleeping ? 0.72 : 1) * weatherLight;

  return (
    <>
      <ambientLight
        intensity={phase.ambientIntensity * lightMultiplier}
        color={phase.ambient}
      />
      <directionalLight
        position={[3, 5, 5]}
        intensity={phase.keyIntensity * lightMultiplier}
        color={phase.keyLight}
      />
      <directionalLight
        position={[-4, 2, 1]}
        intensity={phase.rimIntensity * lightMultiplier}
        color={phase.rimLight}
      />
      <directionalLight
        position={[0, 2, -4]}
        intensity={phase.backIntensity * lightMultiplier}
        color={phase.backLight}
      />

      <AmbientMotes
        phase={phase}
        weather={weather}
        reducedMotion={reducedMotion}
      />
      <MoonHalo phase={phase} weather={weather} reducedMotion={reducedMotion} />
      {weatherKey === "rain" && <RainField reducedMotion={reducedMotion} />}
      {weatherKey === "mist" && <MistField reducedMotion={reducedMotion} />}
      {weatherKey === "wind" && <WindField reducedMotion={reducedMotion} />}
      {weatherKey === "mist" && (
        <fog attach="fog" args={["#eadfdd", 4.8, 8.4]} />
      )}

      <Environment resolution={64}>
        <Lightformer
          position={[0, 5, -3]}
          scale={[8, 8, 1]}
          intensity={phase.key === "night" ? 1.25 : 2}
          color={phase.keyLight}
        />
        <Lightformer
          position={[-4, 1, 3]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[4, 7, 1]}
          intensity={phase.key === "dusk" ? 3.4 : 2.4}
          color={phase.rimLight}
        />
        <Lightformer
          position={[4, 2, 2]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[3, 6, 1]}
          intensity={phase.key === "night" ? 1.2 : 2}
          color={phase.backLight}
        />
      </Environment>
    </>
  );
}
