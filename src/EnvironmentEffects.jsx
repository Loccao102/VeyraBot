import React, { useMemo, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TAU = Math.PI * 2;

export const PRESENCE_PHASES = {
  dawn: {
    key: "dawn",
    label: "EARLY LIGHT",
    ambient: "#f2c8b8",
    keyLight: "#ffb992",
    rimLight: "#e994ac",
    backLight: "#ffe2bd",
    ambientIntensity: 0.58,
    keyIntensity: 1.9,
    rimIntensity: 1.35,
    backIntensity: 1.2,
    particle: "#e88fa8",
    accent: "#d29a57",
    moteCount: 24,
  },
  day: {
    key: "day",
    label: "DAYLIGHT",
    ambient: "#f4f0dc",
    keyLight: "#fff4c7",
    rimLight: "#a8c99a",
    backLight: "#f9f5df",
    ambientIntensity: 0.98,
    keyIntensity: 2.45,
    rimIntensity: 1.55,
    backIntensity: 1.75,
    particle: "#c9d8b9",
    accent: "#c7a45e",
    moteCount: 10,
  },
  dusk: {
    key: "dusk",
    label: "GOLDEN HOUR",
    ambient: "#bc8178",
    keyLight: "#e86f52",
    rimLight: "#a15d8f",
    backLight: "#e5a45b",
    ambientIntensity: 0.42,
    keyIntensity: 2.05,
    rimIntensity: 1.95,
    backIntensity: 1.5,
    particle: "#e9859f",
    accent: "#d08b3f",
    moteCount: 28,
  },
  night: {
    key: "night",
    label: "MOONLIT",
    ambient: "#7f7891",
    keyLight: "#f2ddff",
    rimLight: "#9cc6ff",
    backLight: "#c18bea",
    ambientIntensity: 0.34,
    keyIntensity: 1.55,
    rimIntensity: 1.85,
    backIntensity: 1.35,
    particle: "#f0c8dc",
    accent: "#e1ca83",
    moteCount: 34,
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
        (phase.key === "night" ? twinkle * 0.68 : twinkle * 0.26) *
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

function PhaseSignature({ phase, weather, reducedMotion }) {
  const ref = useRef();
  const stars = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: -2.2 + ((i * 43) % 100) / 22.5,
        y: 0.15 + ((i * 31) % 100) / 42,
        z: -1.55 - (i % 3) * 0.08,
        size: 0.008 + (i % 3) * 0.004,
        phase: i * 0.73,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      if (!child.userData.twinkle || !child.material) return;
      const pulse = reducedMotion
        ? 1
        : 0.68 + (Math.sin(t * 1.1 + i * 0.83) + 1) * 0.16;
      child.material.opacity = child.userData.baseOpacity * pulse;
    });
  });

  const obscured = weather.key === "rain" || weather.key === "cloudy";
  const signatureOpacity = obscured ? 0.48 : 1;

  return (
    <group ref={ref}>
      {phase.key === "dawn" && (
        <>
          <mesh position={[-1.45, 1.28, -1.52]}>
            <circleGeometry args={[0.2, 48]} />
            <meshBasicMaterial
              color="#f2b18f"
              transparent
              opacity={0.28 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[-1.45, 1.28, -1.54]}>
            <ringGeometry args={[0.25, 0.38, 64]} />
            <meshBasicMaterial
              color="#f5c5a8"
              transparent
              opacity={0.1 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = -0.75 + i * 0.38;
            return (
              <mesh
                key={i}
                position={[
                  -1.45 + Math.cos(angle) * 0.48,
                  1.28 + Math.sin(angle) * 0.48,
                  -1.56,
                ]}
                rotation={[0, 0, angle]}
              >
                <planeGeometry args={[0.34, 0.008]} />
                <meshBasicMaterial
                  color="#efbd9d"
                  transparent
                  opacity={0.08 * signatureOpacity}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
        </>
      )}

      {phase.key === "day" && (
        <>
          <mesh position={[1.55, 1.52, -1.52]}>
            <circleGeometry args={[0.17, 48]} />
            <meshBasicMaterial
              color="#f7d7a3"
              transparent
              opacity={0.24 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[1.55, 1.52, -1.54]}>
            <ringGeometry args={[0.22, 0.36, 64]} />
            <meshBasicMaterial
              color="#f7ddb1"
              transparent
              opacity={0.08 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {phase.key === "dusk" && (
        <>
          <mesh position={[-1.48, 1.05, -1.52]}>
            <circleGeometry args={[0.24, 48]} />
            <meshBasicMaterial
              color="#dc8c70"
              transparent
              opacity={0.34 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[-1.48, 1.05, -1.54]}>
            <ringGeometry args={[0.28, 0.46, 64]} />
            <meshBasicMaterial
              color="#e6a17e"
              transparent
              opacity={0.22 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {phase.key === "night" && (
        <>
          <mesh position={[1.48, 1.42, -1.52]}>
            <circleGeometry args={[0.2, 48]} />
            <meshBasicMaterial
              color="#eadde4"
              transparent
              opacity={0.68 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[1.48, 1.42, -1.54]}>
            <ringGeometry args={[0.24, 0.42, 64]} />
            <meshBasicMaterial
              color="#d8c5d2"
              transparent
              opacity={0.12 * signatureOpacity}
              depthWrite={false}
            />
          </mesh>
          {stars.map((star, i) => (
            <mesh
              key={i}
              position={[star.x, star.y, star.z]}
              userData={{
                twinkle: true,
                baseOpacity: 0.42 + (i % 3) * 0.1,
              }}
            >
              <circleGeometry args={[star.size, 10]} />
              <meshBasicMaterial
                color={i % 4 === 0 ? "#e5c991" : "#efe3ea"}
                transparent
                opacity={0.28}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function ClearSparkles({ phase, reducedMotion }) {
  const ref = useRef();
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: -1.85 + ((i * 37) % 100) / 27,
        y: -0.65 + ((i * 29) % 100) / 55,
        z: -0.65 - (i % 4) * 0.18,
        size: 0.012 + (i % 3) * 0.006,
        phase: i * 0.71,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const motion = reducedMotion ? 0.2 : 1;
    ref.current?.children.forEach((mesh, i) => {
      const sparkle = sparkles[i];
      const lift = (t * 0.055 * motion + sparkle.phase * 0.08) % 0.42;
      mesh.position.y = sparkle.y + lift;
      mesh.position.x =
        sparkle.x + Math.sin(t * 0.22 + sparkle.phase) * 0.035 * motion;
      mesh.rotation.z = t * 0.18 * motion + sparkle.phase;
      const twinkle = 0.5 + (Math.sin(t * 1.45 + sparkle.phase) + 1) * 0.25;
      mesh.material.opacity = twinkle * (phase.key === "night" ? 0.15 : 0.32);
      mesh.scale.setScalar(0.8 + twinkle * 0.4);
    });
  });

  return (
    <group ref={ref}>
      {sparkles.map((sparkle, i) => (
        <mesh
          key={i}
          position={[sparkle.x, sparkle.y, sparkle.z]}
          rotation={[0, 0, sparkle.phase]}
        >
          <octahedronGeometry args={[sparkle.size, 0]} />
          <meshBasicMaterial
            color={i % 4 === 0 ? phase.accent : "#f7ead4"}
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function CloudVeil({ reducedMotion }) {
  const ref = useRef();
  const clouds = useMemo(
    () =>
      [
        [-1.55, 0.92, -1.58, 1.05, 0.42, 0.0],
        [-0.72, 1.15, -1.64, 1.2, 0.46, 1.2],
        [0.18, 0.88, -1.56, 1.35, 0.5, 2.1],
        [1.12, 1.18, -1.67, 1.08, 0.4, 3.0],
        [1.72, 0.82, -1.6, 0.92, 0.36, 4.1],
      ],
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const motion = reducedMotion ? 0.12 : 1;
    ref.current?.children.forEach((mesh, i) => {
      const cloud = clouds[i];
      mesh.position.x =
        cloud[0] + Math.sin(t * (0.065 + i * 0.006) + cloud[5]) * 0.32 * motion;
      mesh.position.y =
        cloud[1] + Math.sin(t * 0.05 + cloud[5]) * 0.06 * motion;
      mesh.material.opacity =
        0.075 + (Math.sin(t * 0.11 + cloud[5]) + 1) * 0.018;
    });
  });

  return (
    <group ref={ref}>
      {clouds.map(([x, y, z, sx, sy, phase], i) => (
        <mesh
          key={i}
          position={[x, y, z]}
          scale={[sx, sy, 1]}
          rotation={[0, 0, (i - 2) * 0.025]}
        >
          <circleGeometry args={[0.75, 48]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#c9c3bd" : "#ddd7d0"}
            transparent
            opacity={0.085}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function RainRipples({ reducedMotion }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    ref.current?.children.forEach((mesh, i) => {
      const phase =
        (clock.elapsedTime * (reducedMotion ? 0.1 : 0.62) + i / 12) % 1;
      mesh.scale.setScalar(0.68 + phase * 3.8);
      mesh.material.opacity = (1 - phase) * 0.24;
    });
  });

  return (
    <group
      ref={ref}
      position={[0, -1.095, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * 2.17;
        const radius = 0.34 + (i % 5) * 0.23;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * radius,
              Math.cos(angle) * radius * 0.62,
              0,
            ]}
          >
            <ringGeometry args={[0.03, 0.043, 36]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? "#b7ced8" : "#98aeb8"}
              transparent
              opacity={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
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
      Array.from({ length: 168 }, (_, i) => ({
        x: -2.6 + ((i * 37) % 100) / 19,
        z: -1.25 + ((i * 53) % 100) / 45,
        seed: ((i * 29) % 100) / 100,
        speed: 0.84 + (i % 7) * 0.08,
        length: 0.12 + (i % 5) * 0.038,
      })),
    [],
  );
  const positions = useMemo(() => new Float32Array(drops.length * 6), [drops]);

  useFrame(({ clock }) => {
    if (!geometryRef.current) return;
    const t = clock.elapsedTime * (reducedMotion ? 0.2 : 1);
    drops.forEach((drop, i) => {
      const travel = (t * drop.speed + drop.seed * 3.6) % 3.6;
      const y = 2.2 - travel;
      const base = i * 6;
      positions[base] = drop.x;
      positions[base + 1] = y;
      positions[base + 2] = drop.z;
      positions[base + 3] = drop.x - 0.035;
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
        color="#a8bdc8"
        transparent
        opacity={0.44}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function MistField({ reducedMotion }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    ref.current?.children.forEach((mesh, i) => {
      const motion = reducedMotion ? 0.06 : 1;
      mesh.position.x =
        Math.sin(clock.elapsedTime * (0.055 + i * 0.009) + i * 1.2) *
        (0.28 + i * 0.055) *
        motion;
      mesh.position.y =
        -0.74 +
        i * 0.22 +
        Math.sin(clock.elapsedTime * 0.075 + i) * 0.035 * motion;
      mesh.material.opacity =
        0.085 + (Math.sin(clock.elapsedTime * 0.15 + i * 1.7) + 1) * 0.02;
    });
  });

  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, -0.74 + i * 0.22, -0.46 - i * 0.16]}
          scale={[3.15 - i * 0.2, 0.56 + i * 0.1, 1]}
        >
          <circleGeometry args={[1, 56]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#e8e0dc" : "#f1eae4"}
            transparent
            opacity={0.095}
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
  const petalsRef = useRef();
  const streaks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        y: -0.72 + (i % 7) * 0.39,
        z: -0.95 + (i % 5) * 0.27,
        seed: ((i * 31) % 100) / 100,
        length: 0.12 + (i % 4) * 0.05,
      })),
    [],
  );
  const petals = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        seed: ((i * 43 + 17) % 100) / 100,
        y: -0.45 + (i % 5) * 0.42,
        z: -0.52 + (i % 4) * 0.28,
        size: 0.055 + (i % 3) * 0.012,
      })),
    [],
  );
  const positions = useMemo(() => new Float32Array(streaks.length * 6), [streaks]);

  useFrame(({ clock }) => {
    const motion = reducedMotion ? 0.16 : 1;
    const t = clock.elapsedTime * (reducedMotion ? 0.16 : 0.82);

    if (geometryRef.current) {
      streaks.forEach((streak, i) => {
        const x = -2.35 + ((t + streak.seed * 4.7) % 4.7);
        const base = i * 6;
        positions[base] = x;
        positions[base + 1] = streak.y;
        positions[base + 2] = streak.z;
        positions[base + 3] = x + streak.length;
        positions[base + 4] = streak.y + 0.018;
        positions[base + 5] = streak.z;
      });
      geometryRef.current.attributes.position.needsUpdate = true;
    }

    petalsRef.current?.children.forEach((mesh, i) => {
      const petal = petals[i];
      const phase = (clock.elapsedTime * 0.13 * motion + petal.seed) % 1;
      mesh.position.x = 2.25 - phase * 4.55;
      mesh.position.y =
        petal.y + Math.sin(phase * TAU * 1.4 + i) * 0.24 * motion;
      mesh.position.z =
        petal.z + Math.cos(phase * TAU + i * 0.8) * 0.1 * motion;
      mesh.rotation.z =
        phase * TAU * 1.8 + i * 0.7;
      mesh.rotation.x =
        0.35 + Math.sin(phase * TAU + i) * 0.45 * motion;
      mesh.material.opacity = 0.08 + Math.sin(Math.PI * phase) * 0.26;
    });
  });

  return (
    <group>
      <lineSegments>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#9cae99"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </lineSegments>

      <group ref={petalsRef}>
        {petals.map((petal, i) => (
          <mesh key={i} scale={[0.72, 1.25, 1]}>
            <circleGeometry args={[petal.size, 24]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? "#c99b63" : i % 2 ? "#df8da5" : "#efb7c6"}
              transparent
              opacity={0.16}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
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
      {phase.key === "dawn" && (
        <>
          <pointLight
            position={[-2.7, 0.8, 2.5]}
            intensity={1.25 * lightMultiplier}
            distance={7}
            decay={2}
            color="#ff9f7d"
          />
          <pointLight
            position={[1.7, 1.55, -1.4]}
            intensity={0.6 * lightMultiplier}
            distance={6}
            decay={2}
            color="#efabc0"
          />
        </>
      )}
      {phase.key === "day" && (
        <>
          <pointLight
            position={[0.4, 2.8, 2.2]}
            intensity={1.15 * lightMultiplier}
            distance={8}
            decay={2}
            color="#fff2b8"
          />
          <pointLight
            position={[-2.1, 0.2, -0.4]}
            intensity={0.55 * lightMultiplier}
            distance={6}
            decay={2}
            color="#a9c99b"
          />
        </>
      )}
      {phase.key === "dusk" && (
        <>
          <pointLight
            position={[-2.5, 0.45, 2.1]}
            intensity={1.5 * lightMultiplier}
            distance={7.5}
            decay={2}
            color="#e5684f"
          />
          <pointLight
            position={[2.2, 1.5, -1.2]}
            intensity={0.9 * lightMultiplier}
            distance={6.5}
            decay={2}
            color="#a9639b"
          />
        </>
      )}
      {phase.key === "night" && (
        <>
          <pointLight
            position={[-2.4, 1.65, 2.35]}
            intensity={1.35 * lightMultiplier}
            distance={8}
            decay={2}
            color="#9fc7ff"
          />
          <pointLight
            position={[2.1, 1.1, -1.2]}
            intensity={0.95 * lightMultiplier}
            distance={7}
            decay={2}
            color="#d590ff"
          />
          <pointLight
            position={[0, -0.12, 2.5]}
            intensity={0.48 * lightMultiplier}
            distance={5.5}
            decay={2}
            color="#ffd9e5"
          />
        </>
      )}

      {weatherKey === "clear" && (
        <pointLight
          position={[1.9, 1.8, 2.4]}
          intensity={0.32 * lightMultiplier}
          distance={6}
          decay={2}
          color="#ffe7b3"
        />
      )}
      {weatherKey === "rain" && (
        <pointLight
          position={[-1.8, 1.4, 2]}
          intensity={0.34 * lightMultiplier}
          distance={6}
          decay={2}
          color="#a9c9da"
        />
      )}
      {weatherKey === "cloudy" && (
        <pointLight
          position={[0, 2.3, 1.8]}
          intensity={0.28 * lightMultiplier}
          distance={7}
          decay={2}
          color="#d8d4cd"
        />
      )}
      {weatherKey === "mist" && (
        <pointLight
          position={[0, 0.35, 2.1]}
          intensity={0.38 * lightMultiplier}
          distance={5.5}
          decay={2}
          color="#eee5df"
        />
      )}
      {weatherKey === "wind" && (
        <pointLight
          position={[2.2, 1.1, 1.5]}
          intensity={0.24 * lightMultiplier}
          distance={6}
          decay={2}
          color="#c6d5b8"
        />
      )}

      <PhaseSignature
        phase={phase}
        weather={weather}
        reducedMotion={reducedMotion}
      />
      {weatherKey === "clear" && (
        <ClearSparkles phase={phase} reducedMotion={reducedMotion} />
      )}
      {weatherKey === "cloudy" && (
        <CloudVeil reducedMotion={reducedMotion} />
      )}
      <AmbientMotes
        phase={phase}
        weather={weather}
        reducedMotion={reducedMotion}
      />
      <MoonHalo phase={phase} weather={weather} reducedMotion={reducedMotion} />
      {weatherKey === "rain" && (
        <>
          <RainField reducedMotion={reducedMotion} />
          <RainRipples reducedMotion={reducedMotion} />
        </>
      )}
      {weatherKey === "mist" && <MistField reducedMotion={reducedMotion} />}
      {weatherKey === "wind" && <WindField reducedMotion={reducedMotion} />}
      {weatherKey === "mist" && (
        <fog attach="fog" args={["#e5d9d8", 3.7, 7.2]} />
      )}

      <Environment resolution={64}>
        <Lightformer
          position={[0, 5, -3]}
          scale={[8, 8, 1]}
          intensity={phase.key === "night" ? 2.15 : 2}
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
          intensity={phase.key === "night" ? 1.9 : 2}
          color={phase.backLight}
        />
      </Environment>
    </>
  );
}
