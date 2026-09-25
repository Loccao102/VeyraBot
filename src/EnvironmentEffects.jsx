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

function AmbientMotes({ phase, reducedMotion }) {
  const ref = useRef();
  const motes = useMemo(
    () =>
      Array.from({ length: phase.moteCount }, (_, i) => {
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
      }),
    [phase],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    ref.current?.children.forEach((mesh, i) => {
      const mote = motes[i];
      const movement = reducedMotion ? 0.12 : 1;
      mesh.position.x =
        mote.x + Math.sin(time * mote.speed + mote.phase) * 0.085 * movement;
      mesh.position.y =
        mote.y +
        Math.sin(time * (mote.speed + 0.17) + mote.phase) * 0.11 * movement;
      const twinkle =
        0.34 + (Math.sin(time * 1.15 + mote.phase) + 1) * 0.18;
      mesh.material.opacity =
        phase.key === "night" ? twinkle * 0.42 : twinkle * 0.26;
      const scale =
        0.82 + Math.sin(time * 0.9 + mote.phase) * 0.14 * movement;
      mesh.scale.setScalar(mote.size * scale);
    });
  });

  return (
    <group ref={ref}>
      {motes.map((mote, i) => (
        <mesh
          key={i}
          position={[mote.x, mote.y, mote.z]}
          scale={mote.size}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial
            color={mote.gold ? phase.accent : phase.particle}
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function MoonHalo({ phase, reducedMotion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = reducedMotion
      ? 1
      : 1 + Math.sin(clock.elapsedTime * 0.42) * 0.035;
    ref.current.scale.setScalar(pulse);
    ref.current.material.opacity =
      phase.key === "night" ? 0.14 : phase.key === "dusk" ? 0.07 : 0.035;
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

export default function EnvironmentEffects({
  phase,
  reducedMotion = false,
  sleeping = false,
}) {
  const lightMultiplier = sleeping ? 0.72 : 1;

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

      <AmbientMotes phase={phase} reducedMotion={reducedMotion} />
      <MoonHalo phase={phase} reducedMotion={reducedMotion} />

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
