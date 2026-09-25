import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const PINK = "#eda1b6",
  PEARL = "#ffe3df",
  GOLD = "#bd895c",
  JADE = "#688a70";
const TAU = Math.PI * 2;
const damp = THREE.MathUtils.damp;

function makeGlyphTexture(glyph, color = "#ffffff", fontSize = 140) {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `italic 600 ${fontSize}px Georgia`;
  context.fillText(glyph, 128, 132);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function applyGazeDeadZone(value, zone = 0.08) {
  const absolute = Math.abs(value);
  if (absolute <= zone) return 0;
  return Math.sign(value) * ((absolute - zone) / (1 - zone));
}

function useGlobalGazePointer() {
  const pointerRef = useRef({ x: 0, y: 0 });
  const { gl } = useThree();

  useEffect(() => {
    const updatePointer = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointerRef.current.x = THREE.MathUtils.clamp(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -1,
        1,
      );
      pointerRef.current.y = THREE.MathUtils.clamp(
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
        -1,
        1,
      );
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointer);
  }, [gl]);

  return pointerRef;
}

export const SEN_STATES = {
  idle: { bloom: 0, tilt: 0, glow: 0.45, bob: 0.045 },
  thinking: { bloom: -0.12, tilt: -0.12, glow: 0.65, bob: 0.025 },
  listening: { bloom: 0.16, tilt: 0.06, glow: 0.5, bob: 0.025 },
  working: { bloom: 0.08, tilt: 0, glow: 0.8, bob: 0.015 },
  success: { bloom: 0.3, tilt: 0.05, glow: 1, bob: 0.065 },
  sleep: { bloom: -0.3, tilt: 0, glow: 0.08, bob: 0.008 },
};

const MOOD_MOTION = {
  idle: {
    floatAmp: 0.072,
    floatSpeed: 0.82,
    swayAmp: 0.04,
    swaySpeed: 0.42,
    headYawAmp: 0.09,
    headPitchAmp: 0.032,
    headSpeed: 0.4,
    breatheAmp: 0.018,
    breatheSpeed: 0.82,
    petalAmp: 0.022,
    corePulseAmp: 0.075,
    corePulseSpeed: 1.08,
    lean: 0,
  },
  thinking: {
    floatAmp: 0.058,
    floatSpeed: 0.64,
    swayAmp: 0.05,
    swaySpeed: 0.31,
    headYawAmp: 0.12,
    headPitchAmp: 0.06,
    headSpeed: 0.31,
    breatheAmp: 0.015,
    breatheSpeed: 0.72,
    petalAmp: 0.025,
    corePulseAmp: 0.09,
    corePulseSpeed: 0.96,
    lean: -0.035,
  },
  listening: {
    floatAmp: 0.052,
    floatSpeed: 0.78,
    swayAmp: 0.032,
    swaySpeed: 0.36,
    headYawAmp: 0.135,
    headPitchAmp: 0.042,
    headSpeed: 0.46,
    breatheAmp: 0.014,
    breatheSpeed: 0.9,
    petalAmp: 0.018,
    corePulseAmp: 0.075,
    corePulseSpeed: 1.18,
    lean: 0.05,
  },
  working: {
    floatAmp: 0.04,
    floatSpeed: 1.0,
    swayAmp: 0.022,
    swaySpeed: 0.68,
    headYawAmp: 0.062,
    headPitchAmp: 0.032,
    headSpeed: 0.66,
    breatheAmp: 0.012,
    breatheSpeed: 1.08,
    petalAmp: 0.014,
    corePulseAmp: 0.11,
    corePulseSpeed: 1.4,
    lean: 0.018,
  },
  success: {
    floatAmp: 0.09,
    floatSpeed: 1.18,
    swayAmp: 0.055,
    swaySpeed: 0.78,
    headYawAmp: 0.085,
    headPitchAmp: 0.055,
    headSpeed: 0.68,
    breatheAmp: 0.02,
    breatheSpeed: 1.24,
    petalAmp: 0.028,
    corePulseAmp: 0.15,
    corePulseSpeed: 1.72,
    lean: -0.018,
  },
  sleep: {
    floatAmp: 0.034,
    floatSpeed: 0.38,
    swayAmp: 0.03,
    swaySpeed: 0.21,
    headYawAmp: 0.025,
    headPitchAmp: 0.018,
    headSpeed: 0.22,
    breatheAmp: 0.022,
    breatheSpeed: 0.52,
    petalAmp: 0.01,
    corePulseAmp: 0.04,
    corePulseSpeed: 0.64,
    lean: 0.07,
  },
};

const LOTUS_LAYERS = [
  {
    key: "outer",
    count: 8,
    start: 0.02,
    end: 0.42,
    radius: 0.56,
    closedHeight: 2.18,
    openRadius: 0.22,
    length: 0.86,
    width: 0.49,
    lift: 0.44,
    tipDrop: 0.07,
    curl: 0.16,
    color: "#f5bdcb",
  },
  {
    key: "middle",
    count: 6,
    start: 0.22,
    end: 0.62,
    radius: 0.44,
    closedHeight: 2.23,
    openRadius: 0.18,
    length: 0.72,
    width: 0.43,
    lift: 0.46,
    tipDrop: 0.05,
    curl: 0.13,
    color: "#eea7bc",
  },
  {
    key: "inner",
    count: 6,
    start: 0.42,
    end: 0.8,
    radius: 0.33,
    closedHeight: 2.28,
    openRadius: 0.13,
    length: 0.57,
    width: 0.37,
    lift: 0.49,
    tipDrop: 0.03,
    curl: 0.1,
    color: "#ffe0df",
  },
  {
    key: "core",
    count: 4,
    start: 0.58,
    end: 0.94,
    radius: 0.24,
    closedHeight: 2.32,
    openRadius: 0.09,
    length: 0.43,
    width: 0.3,
    lift: 0.54,
    tipDrop: 0.015,
    curl: 0.07,
    color: "#f7c2cf",
  },
];

// A curved, rounded petal surface. Shared by the crown, body, leaves and satellites.
function petalPoint(t, u, bend = 0.25) {
  const width = Math.pow(Math.sin(Math.PI * t), 0.82) * 0.49;
  return new THREE.Vector3(
    u * width,
    t,
    0.2 * Math.sin(Math.PI * t) * (1 - u * u) + bend * t * t,
  );
}

function surfaceGeometry(point, rows = 24, columns = 14) {
  const vertices = [],
    indices = [],
    colors = [];
  const base = new THREE.Color("#fff5ed"),
    tip = new THREE.Color("#e998b1");
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const t = j / rows,
        u = (i / columns) * 2 - 1;
      const p = point(t, u);
      vertices.push(p.x, p.y, p.z);
      const color = base.clone().lerp(tip, 0.25 + 0.75 * t * t);
      colors.push(color.r, color.g, color.b);
      if (i < columns && j < rows) {
        const a = j * (columns + 1) + i,
          b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Petal({
  color = PEARL,
  accent = GOLD,
  bend = 0.25,
  ornament = false,
  leaf = false,
  ...props
}) {
  const geometry = useMemo(
    () => surfaceGeometry((t, u) => petalPoint(t, u, bend)),
    [bend],
  );
  const outline = useMemo(
    () => [
      ...Array.from({ length: 33 }, (_, i) => petalPoint(i / 32, -1, bend)),
      ...Array.from({ length: 33 }, (_, i) => petalPoint(1 - i / 32, 1, bend)),
    ],
    [bend],
  );
  const vein = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const p = petalPoint(0.08 + (i / 24) * 0.83, 0, bend);
        p.z += 0.007;
        return p;
      }),
    [bend],
  );
  return (
    <group {...props}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={color}
          vertexColors={!leaf}
          side={THREE.DoubleSide}
          metalness={leaf ? 0.2 : 0.12}
          roughness={0.3}
          clearcoat={0.75}
          clearcoatRoughness={0.23}
          iridescence={leaf ? 0 : 0.24}
          iridescenceIOR={1.3}
        />
      </mesh>
      <Line
        points={outline}
        color={accent}
        lineWidth={0.85}
        transparent
        opacity={0.8}
      />
      {(ornament || leaf) && (
        <Line
          points={vein}
          color={leaf ? "#b6bd8b" : accent}
          lineWidth={0.7}
          transparent
          opacity={0.7}
        />
      )}
      {ornament &&
        [-1, 1].map((side) => (
          <Line
            key={side}
            points={Array.from({ length: 40 }, (_, i) => {
              const t = (i / 39) * Math.PI * 2.4;
              const y = 0.48 + Math.cos(t) * (0.1 - i / 600);
              const x = side * (0.1 + Math.sin(t) * (0.07 - i / 800));
              const p = petalPoint(
                y,
                x / (Math.pow(Math.sin(Math.PI * y), 0.82) * 0.49),
                bend,
              );
              p.z += 0.01;
              return p;
            })}
            color={accent}
            lineWidth={0.8}
            transparent
            opacity={0.7}
          />
        ))}
    </group>
  );
}

function CrownPetal({ side, index, state, motion, bloom, palette }) {
  const ref = useRef();
  const cfg = SEN_STATES[state];
  useFrame(({ clock }, delta) => {
    const angle =
      side * (0.2 + (0.16 + index * 0.42 + cfg.bloom) * bloom.current);
    ref.current.rotation.z = damp(
      ref.current.rotation.z,
      -angle + Math.sin(clock.elapsedTime * 1.25 + index) * 0.015 * motion,
      3,
      delta,
    );
  });
  return (
    <group
      ref={ref}
      position={[
        side * (0.08 + index * 0.1),
        0.37 - index * 0.06,
        index === 0 ? -0.16 : 0.04,
      ]}
      rotation={[0, side * -0.15, -side * (0.36 + index * 0.42)]}
    >
      <Petal
        scale={[0.96 - index * 0.1, 1.32 - index * 0.06, 1]}
        color={
          index === 1
            ? palette?.petalPrimary ?? PINK
            : palette?.petalSoft ?? PEARL
        }
        accent={palette?.gold ?? GOLD}
        bend={index === 0 ? -0.16 : 0.16}
        ornament={index < 2}
      />
    </group>
  );
}

function Eyes({ state, motion, bloom, gazePointer, focusActive = false }) {
  const ref = useRef();
  const gazeRefs = useRef({});

  useFrame(({ clock }, delta) => {
    const blink =
      motion && Math.sin(clock.elapsedTime * 0.85) > 0.998 ? 0.13 : 1;
    const wakeAmount = bloom
      ? THREE.MathUtils.smoothstep(bloom.current, 0.6, 0.72)
      : 1;
    const restAmount = state === "sleep" ? 0.08 : Math.max(0.08, wakeAmount);

    ref.current.scale.y = damp(
      ref.current.scale.y,
      (state === "thinking" ? 0.85 : state === "listening" ? 1.1 : 1) *
        blink *
        restAmount,
      18,
      delta,
    );

    const stateGaze =
      state === "sleep" || state === "success"
        ? 0
        : state === "thinking"
          ? 0.72
          : state === "listening"
            ? 1.05
            : 1;
    const focusGaze = focusActive ? 0.55 : 1;
    const gazeAmount = stateGaze * focusGaze;
    const gazeX = applyGazeDeadZone(gazePointer?.current?.x ?? 0);
    const gazeY = applyGazeDeadZone(gazePointer?.current?.y ?? 0);

    // Pupils only lead the shared gaze target slightly. The head carries most
    // of the motion so Sen feels attentive rather than uncanny.
    const targetX = gazeX * 0.024 * wakeAmount * gazeAmount;
    const targetY = gazeY * 0.019 * wakeAmount * gazeAmount;

    [-1, 1].forEach((side) => {
      const gaze = gazeRefs.current[side];
      if (!gaze) return;

      gaze.position.x = damp(gaze.position.x, targetX, 16, delta);
      gaze.position.y = damp(gaze.position.y, targetY, 16, delta);
      gaze.rotation.z = damp(
        gaze.rotation.z,
        -gazeX * 0.022 * side * gazeAmount,
        12,
        delta,
      );
    });
  });

  return (
    <group position={[0, 0.84, 0.585]}>
      <group ref={ref}>
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.205, 0, 0]}
            rotation={[0, 0, state === "thinking" ? side * 0.12 : -side * 0.06]}
          >
            {state === "success" ? (
              <Line
                points={Array.from({ length: 25 }, (_, i) => {
                  const t = (i / 24) * Math.PI;
                  return [Math.cos(t) * 0.088, Math.sin(t) * 0.06, 0.025];
                })}
                color="#77505a"
                lineWidth={4}
              />
            ) : (
              <>
                <mesh scale={[0.094, 0.139, 0.035]}>
                  <sphereGeometry args={[1, 24, 16]} />
                  <meshBasicMaterial color="#77505a" />
                </mesh>

                <group
                  ref={(node) => {
                    gazeRefs.current[side] = node;
                  }}
                >
                  <mesh
                    position={[0.008, -0.028, 0.033]}
                    scale={[0.056, 0.072, 0.009]}
                  >
                    <sphereGeometry args={[1, 20, 12]} />
                    <meshBasicMaterial color="#b77d80" />
                  </mesh>
                  <mesh
                    position={[-0.024, 0.044, 0.036]}
                    scale={[0.028, 0.033, 0.009]}
                  >
                    <sphereGeometry args={[1, 12, 8]} />
                    <meshBasicMaterial color="#fff9ef" />
                  </mesh>
                  <mesh
                    position={[0.027, -0.067, 0.043]}
                    scale={[0.012, 0.014, 0.006]}
                  >
                    <sphereGeometry args={[1, 10, 8]} />
                    <meshBasicMaterial color="#ffe5ca" />
                  </mesh>
                </group>
              </>
            )}

            <Line
              points={[
                [
                  -0.075,
                  0.21 + (state === "thinking" && side < 0 ? 0.035 : 0),
                  -0.035,
                ],
                [0, 0.23, -0.025],
                [0.075, 0.21, -0.035],
              ]}
              color="#bb8890"
              lineWidth={2}
            />
          </group>
        ))}
      </group>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.34, -0.17, -0.04]}
          scale={[0.08, 0.033, 0.018]}
        >
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color="#e5a2b2" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function lotusLayerPoint(t, u, openness, cfg, twistSign) {
  const bell = Math.pow(Math.sin(Math.PI * t), 0.82);
  const tipBias = 0.22 + 0.78 * t * t;
  const localOpen = THREE.MathUtils.clamp(openness * tipBias, 0, 1);
  const width =
    bell * cfg.width * (1 + 0.07 * openness) * (1 - 0.12 * t);
  const closedRadius = cfg.radius * (1 - 0.9 * t) + 0.015;
  const openRadius =
    cfg.openRadius +
    cfg.length * t * 0.82 +
    cfg.curl * Math.sin(Math.PI * t) * (1 - 0.22 * u * u);
  const radial = THREE.MathUtils.lerp(
    closedRadius,
    openRadius,
    THREE.MathUtils.smoothstep(localOpen, 0, 1),
  );
  const closedY = cfg.closedHeight * t;
  const openY =
    0.14 +
    cfg.lift * Math.sin(Math.PI * t) * (1 - 0.14 * u * u) +
    0.06 * openness * Math.pow(t, 1.8) -
    cfg.tipDrop * Math.pow(t, 2.2);
  const y = THREE.MathUtils.lerp(closedY, openY, localOpen);
  const twist =
    twistSign *
    cfg.width *
    0.08 *
    openness *
    Math.pow(t, 1.6) *
    (0.3 + 0.7 * (1 - u * u));

  return new THREE.Vector3(u * width + twist, y, radial);
}

const LOTUS_MORPH_STAGES = [0, 0.28, 0.66, 1];
const lotusResourceCache = new Map();

function getLotusPetalResources(layer, twistSign) {
  const key = `${layer.key}:${twistSign}`;
  if (lotusResourceCache.has(key)) return lotusResourceCache.get(key);

  const geometries = LOTUS_MORPH_STAGES.map((openness) =>
    surfaceGeometry((t, u) =>
      lotusLayerPoint(t, u, openness, layer, twistSign),
    ),
  );
  const geometry = geometries[0];
  geometry.morphAttributes.position = geometries
    .slice(1)
    .map((geometryStage) => geometryStage.attributes.position);
  geometry.morphAttributes.normal = geometries
    .slice(1)
    .map((geometryStage) => geometryStage.attributes.normal);
  geometries.slice(1).forEach((geometryStage) => geometryStage.dispose());

  const edges = LOTUS_MORPH_STAGES.map((openness) => [
    ...Array.from({ length: 33 }, (_, i) =>
      lotusLayerPoint(i / 32, -1, openness, layer, twistSign),
    ),
    ...Array.from({ length: 33 }, (_, i) =>
      lotusLayerPoint(1 - i / 32, 1, openness, layer, twistSign),
    ),
  ]);

  const material = new THREE.MeshPhysicalMaterial({
    color: layer.color,
    vertexColors: true,
    side: THREE.DoubleSide,
    metalness: 0.04,
    roughness: 0.48,
    clearcoat: 0.28,
    clearcoatRoughness: 0.36,
    iridescence: 0.06,
    iridescenceIOR: 1.3,
    emissive: new THREE.Color("#5c2135"),
    emissiveIntensity: 0.026,
    sheen: 0.16,
    sheenColor: new THREE.Color("#ffdbe4"),
    sheenRoughness: 0.72,
  });

  const resources = { geometry, edges, material };
  lotusResourceCache.set(key, resources);
  return resources;
}

function LotusBloomPetal({
  layer,
  layerIndex,
  index,
  bloom,
  state,
  motion,
}) {
  const meshRef = useRef();
  const motionRef = useRef();
  const edgeRef = useRef();
  const last = useRef(-1);
  const angle =
    (index / layer.count) * TAU +
    (layerIndex % 2 ? Math.PI / layer.count : 0);
  const twistSign = (index + layerIndex) % 2 ? -1 : 1;

  const { geometry, edges, material } = useMemo(
    () => getLotusPetalResources(layer, twistSign),
    [layer, twistSign],
  );
  const linePositions = useMemo(
    () => new Float32Array(edges[0].length * 3),
    [edges],
  );

  useLayoutEffect(() => {
    meshRef.current.updateMorphTargets();
    last.current = -1;
  }, [geometry]);

  useFrame(({ clock }, delta) => {
    const stagger =
      (((index * 5 + layerIndex * 3) % layer.count) /
        Math.max(1, layer.count - 1)) *
      0.055;
    const amount = THREE.MathUtils.smoothstep(
      bloom.current,
      layer.start + stagger,
      Math.min(1, layer.end + stagger),
    );

    if (Math.abs(last.current - amount) > 0.0001) {
      last.current = amount;
      const influences = meshRef.current.morphTargetInfluences;
      influences[0] = 0;
      influences[1] = 0;
      influences[2] = 0;

      let edgeA = 0;
      let edgeB = 1;
      let edgeMix = 0;

      if (amount < 0.32) {
        const p = THREE.MathUtils.smoothstep(amount, 0, 0.32);
        influences[0] = p;
        edgeMix = p;
      } else if (amount < 0.72) {
        const p = THREE.MathUtils.smoothstep(amount, 0.32, 0.72);
        influences[0] = 1 - p;
        influences[1] = p;
        edgeA = 1;
        edgeB = 2;
        edgeMix = p;
      } else {
        const p = THREE.MathUtils.smoothstep(amount, 0.72, 1);
        influences[1] = 1 - p;
        influences[2] = p;
        edgeA = 2;
        edgeB = 3;
        edgeMix = p;
      }

      edges[edgeA].forEach((point, i) => {
        const next = edges[edgeB][i];
        linePositions[i * 3] = THREE.MathUtils.lerp(
          point.x,
          next.x,
          edgeMix,
        );
        linePositions[i * 3 + 1] = THREE.MathUtils.lerp(
          point.y,
          next.y,
          edgeMix,
        );
        linePositions[i * 3 + 2] = THREE.MathUtils.lerp(
          point.z,
          next.z,
          edgeMix,
        );
      });
      edgeRef.current.geometry.setPositions(linePositions);
    }

    const settle = THREE.MathUtils.smoothstep(amount, 0.78, 1);
    const transitionArc =
      Math.sin(Math.PI * THREE.MathUtils.clamp(amount, 0, 1)) *
      (0.075 - layerIndex * 0.009);
    const overshoot =
      Math.sin(settle * Math.PI) *
      0.03 *
      twistSign *
      (1 - layerIndex * 0.12);
    const ambient =
      Math.sin(clock.elapsedTime * 0.72 + index * 0.83 + layerIndex) *
      0.0045 *
      motion *
      amount;
    motionRef.current.rotation.x = damp(
      motionRef.current.rotation.x,
      -0.008 * amount - transitionArc + overshoot,
      5,
      delta,
    );
    motionRef.current.rotation.z = damp(
      motionRef.current.rotation.z,
      twistSign * (0.009 * amount + transitionArc * 0.26) + ambient,
      5,
      delta,
    );

    const sleeping = state === "sleep" && amount < 0.03;
    const breath =
      sleeping && motion
        ? 1 + Math.sin(clock.elapsedTime * 0.92 + index * 0.13) * 0.005
        : 1;
    motionRef.current.scale.set(1, breath, 1);
  });

  return (
    <group position={[0, -1.03, 0]} rotation={[0, angle, 0]}>
      <group ref={motionRef}>
        <mesh ref={meshRef} geometry={geometry} material={material} />
        <Line
          ref={edgeRef}
          points={edges[0]}
          color={GOLD}
          lineWidth={0.8}
          transparent
          opacity={0.68}
        />
      </group>
    </group>
  );
}

function BloomAura({ bloom, motion, state }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const opening = THREE.MathUtils.smoothstep(bloom.current, 0.08, 0.34);
    const settling = 1 - THREE.MathUtils.smoothstep(bloom.current, 0.72, 0.98);
    const visibility =
      state === "sleep" ? 0 : opening * settling * (motion ? 1 : 0.45);
    ref.current.visible = visibility > 0.01;

    ref.current.children.forEach((mesh, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.1 - i * 0.9);
      const phaseScale = 0.86 + bloom.current * 0.45 + i * 0.16;
      mesh.scale.setScalar(phaseScale + pulse * 0.035 * motion);
      mesh.material.opacity =
        visibility * (0.18 - i * 0.035) * (0.78 + pulse * 0.22);
    });
  });

  return (
    <group ref={ref} position={[0, -0.18, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.72 + i * 0.12, 0.735 + i * 0.12, 96]} />
          <meshBasicMaterial
            color={i === 0 ? "#f29aad" : "#d9a67c"}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ripples({ state, motion, bloom }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const wakeRipple =
      Math.sin(Math.PI * THREE.MathUtils.smoothstep(bloom.current, 0.08, 0.72)) *
      0.22;
    ref.current.children.forEach((mesh, i) => {
      const phase = (clock.elapsedTime * 0.46 * motion + i / 3) % 1;
      mesh.scale.setScalar(1 + phase * (0.7 + wakeRipple));
      mesh.material.opacity =
        (1 - phase) *
        (state === "listening" ? 0.34 : 0.08 + wakeRipple);
    });
  });
  return (
    <group ref={ref} position={[0, -1.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[1.1, 1.108, 96]} />
          <meshBasicMaterial
            color={JADE}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function TouchRipple({ ripple, reducedMotion }) {
  const ref = useRef();

  useFrame(() => {
    if (!ref.current) return;
    const age = THREE.MathUtils.clamp(
      ((typeof performance !== "undefined" ? performance.now() : Date.now()) -
        ripple.startedAt) /
        ripple.duration,
      0,
      1,
    );
    const ease = THREE.MathUtils.smoothstep(age, 0, 1);
    const chorus = ripple.variant?.includes("chorus");
    const pulse = reducedMotion
      ? 0.55
      : 0.55 + ease * (chorus ? 5.1 : 3.9);
    ref.current.scale.setScalar(pulse);
    ref.current.material.opacity =
      Math.sin(Math.PI * age) *
      (reducedMotion ? 0.14 : chorus ? 0.4 : 0.3);
  });

  const rain = ripple.variant?.includes("rain");
  const chorus = ripple.variant?.includes("chorus");

  return (
    <mesh
      ref={ref}
      position={[ripple.position[0], -1.105, ripple.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={chorus ? [0.05, 0.068, 64] : [0.055, 0.068, 56]} />
      <meshBasicMaterial
        color={rain ? "#a9a2ad" : chorus ? "#c38ca0" : "#7f9987"}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function TouchRipples({ ripples = [], reducedMotion }) {
  return (
    <group>
      {ripples.map((ripple) => (
        <TouchRipple
          key={ripple.id}
          ripple={ripple}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

function GardenFireflies({ color, reducedMotion }) {
  const ref = useRef();
  const points = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        angle: i * 2.17,
        radius: 1.12 + (i % 4) * 0.18,
        height: -0.72 + (i % 5) * 0.26,
        phase: i * 0.91,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const speed = reducedMotion ? 0.12 : 1;
    ref.current?.children.forEach((mesh, i) => {
      const point = points[i];
      const time = clock.elapsedTime * speed;
      mesh.position.x =
        Math.sin(point.angle + time * 0.18) * point.radius +
        Math.sin(time * 0.43 + point.phase) * 0.08;
      mesh.position.z =
        Math.cos(point.angle + time * 0.18) * point.radius * 0.48;
      mesh.position.y =
        point.height + Math.sin(time * 0.62 + point.phase) * 0.08;
      mesh.material.opacity =
        0.28 + (Math.sin(time * 1.8 + point.phase) + 1) * 0.18;
    });
  });

  return (
    <group ref={ref}>
      {points.map((point, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(point.angle) * point.radius,
            point.height,
            Math.cos(point.angle) * point.radius * 0.48,
          ]}
        >
          <sphereGeometry args={[0.018 + (i % 3) * 0.004, 8, 6]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? "#d9c47a" : color}
            transparent
            opacity={0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function AdaptiveGardenSignature({ personal, reducedMotion }) {
  const style = personal?.gardenStyle ?? "young";
  const dna = personal?.dna ?? {};
  const leaf = dna.leaf ?? JADE;
  const pink = dna.petalPrimary ?? PINK;
  const gold = dna.gold ?? GOLD;
  const core = dna.coreGlow ?? "#ec96a7";

  if (style === "young") return null;

  if (style === "focus") {
    return (
      <group>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[-1.18 + i * 0.13, -1.02 + i * 0.075, -0.55 + i * 0.02]}
            rotation={[0.12, 0.5 + i * 0.35, 0.05]}
            scale={[0.16 - i * 0.018, 0.055, 0.12 - i * 0.012]}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i === 1 ? "#b8aaa2" : "#c9bcb2"}
              roughness={0.86}
            />
          </mesh>
        ))}
        <group position={[-1.18, -1.095, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i}>
              <ringGeometry args={[0.24 + i * 0.16, 0.247 + i * 0.16, 72]} />
              <meshBasicMaterial
                color={i ? gold : leaf}
                transparent
                opacity={0.11}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (style === "reflection") {
    return (
      <group>
        {Array.from({ length: 5 }, (_, i) => {
          const angle = -1.1 + i * 0.55;
          return (
            <group
              key={i}
              position={[
                Math.sin(angle) * (1.42 + (i % 2) * 0.12),
                -1.02,
                Math.cos(angle) * 0.64 - 0.22,
              ]}
              rotation={[0, -angle, i % 2 ? -0.18 : 0.18]}
            >
              <Petal
                rotation={[1.34, 0, 0]}
                scale={[0.15, 0.24, 0.1]}
                color={i % 2 ? pink : dna.petalSoft ?? PEARL}
                accent={gold}
              />
            </group>
          );
        })}
      </group>
    );
  }

  if (style === "explorer") {
    return (
      <group>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * TAU + 0.4;
          return (
            <mesh
              key={i}
              position={[
                Math.sin(angle) * (1.28 + (i % 3) * 0.18),
                -0.58 + (i % 4) * 0.28,
                Math.cos(angle) * 0.62 - 0.06,
              ]}
              rotation={[0.3, angle, Math.PI / 4]}
            >
              <octahedronGeometry args={[0.024 + (i % 3) * 0.006, 0]} />
              <meshBasicMaterial
                color={i % 3 === 0 ? gold : i % 2 ? pink : leaf}
                transparent
                opacity={0.42}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (style === "nocturne") {
    return (
      <group>
        <GardenFireflies color={core} reducedMotion={reducedMotion} />
        <mesh position={[-1.38, -0.82, -0.5]}>
          <octahedronGeometry args={[0.085, 0]} />
          <meshPhysicalMaterial
            color={dna.petalSoft ?? PEARL}
            emissive={core}
            emissiveIntensity={0.62}
            roughness={0.22}
            clearcoat={0.9}
          />
        </mesh>
        <pointLight
          position={[-1.38, -0.76, -0.5]}
          color={core}
          intensity={0.3}
          distance={1.4}
          decay={2}
        />
      </group>
    );
  }

  return (
    <group>
      <mesh position={[-1.32, -1.045, -0.42]} scale={[0.14, 0.06, 0.11]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c1b4aa" roughness={0.85} />
      </mesh>
      <group position={[1.3, -1.02, -0.38]} rotation={[0, -0.5, 0]}>
        <Petal
          rotation={[1.34, 0, 0]}
          scale={[0.14, 0.22, 0.1]}
          color={pink}
          accent={gold}
        />
      </group>
      <mesh position={[0.95, -0.46, -0.35]}>
        <sphereGeometry args={[0.024, 8, 6]} />
        <meshBasicMaterial
          color={core}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function PersonalGardenGrowth({ personal, reducedMotion }) {
  const level = personal?.level ?? 1;
  const dna = personal?.dna ?? {};
  const leafColor = dna.leaf ?? JADE;
  const goldColor = dna.gold ?? GOLD;
  const coreColor = dna.coreGlow ?? "#ec96a7";

  const leaves = [
    [-1.26, -1.097, 0.48, -0.24, 1.08],
    [1.28, -1.098, 0.37, 0.2, 0.92],
    [-1.48, -1.099, -0.18, 0.12, 0.78],
    [1.5, -1.099, -0.28, -0.16, 0.72],
  ];
  const stones = [
    [-1.58, -1.02, 0.08, 0.14],
    [1.64, -1.03, 0.04, 0.11],
    [1.34, -1.04, -0.55, 0.09],
  ];

  return (
    <group>
      <AdaptiveGardenSignature
        personal={personal}
        reducedMotion={reducedMotion}
      />
      {level >= 2 &&
        leaves.slice(0, Math.min(leaves.length, level)).map(
          ([x, y, z, rotation, scale], index) => (
            <group key={`leaf-${index}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale * 0.58, 1]}>
                <circleGeometry args={[0.2, 40]} />
                <meshPhysicalMaterial
                  color={leafColor}
                  roughness={0.56}
                  metalness={0.04}
                  clearcoat={0.2}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh
                position={[0, 0.004, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[scale, scale * 0.58, 1]}
              >
                <ringGeometry args={[0.18, 0.192, 40]} />
                <meshBasicMaterial
                  color={goldColor}
                  transparent
                  opacity={0.3}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ),
        )}

      {level >= 3 &&
        stones.map(([x, y, z, size], index) => (
          <mesh
            key={`stone-${index}`}
            position={[x, y, z]}
            rotation={[0.2, index * 0.7, 0.08]}
            scale={[size * 1.35, size * 0.62, size]}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={index % 2 ? "#b8aaa2" : "#c8bbb0"}
              roughness={0.82}
            />
          </mesh>
        ))}

      {level >= 4 && (
        <GardenFireflies color={coreColor} reducedMotion={reducedMotion} />
      )}

      {level >= 5 && (
        <group position={[1.43, -0.84, -0.63]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.115, 0]} />
            <meshPhysicalMaterial
              color={dna.petalSoft ?? PEARL}
              emissive={coreColor}
              emissiveIntensity={0.72}
              roughness={0.24}
              clearcoat={0.9}
            />
          </mesh>
          <mesh position={[0, -0.13, 0]} scale={[0.11, 0.05, 0.11]}>
            <cylinderGeometry args={[1, 1.18, 1, 8]} />
            <meshStandardMaterial color={goldColor} roughness={0.45} />
          </mesh>
          <pointLight
            position={[0, 0.02, 0]}
            color={coreColor}
            intensity={0.42}
            distance={1.8}
            decay={2}
          />
        </group>
      )}
    </group>
  );
}

function ThoughtPetal({
  thought,
  index,
  selected,
  onSelect,
  reducedMotion,
  enabled,
}) {
  const ref = useRef();
  const placement = useMemo(() => {
    const seed = Number.isFinite(thought.seed) ? thought.seed : 0.5;
    const angle = (seed * TAU + index * 1.83) % TAU;
    const radius = 1.28 + ((seed * 997 + index * 0.17) % 1) * 0.46;
    return {
      x: Math.sin(angle) * radius,
      z: Math.cos(angle) * radius * 0.55,
      rotation: -angle + Math.PI / 2,
      phase: seed * TAU + index,
      tint: index % 3 === 0 ? "#f8c7d2" : index % 3 === 1 ? "#f0a9bd" : "#ffe1dd",
    };
  }, [index, thought.seed]);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const motion = reducedMotion ? 0.12 : 1;
    const bob = Math.sin(clock.elapsedTime * 0.42 + placement.phase) * 0.018 * motion;
    const targetScale = selected ? 1.18 : 1;
    ref.current.position.y = damp(
      ref.current.position.y,
      -1.055 + bob + (selected ? 0.018 : 0),
      5,
      delta,
    );
    ref.current.scale.x = damp(ref.current.scale.x, targetScale, 6, delta);
    ref.current.scale.y = damp(ref.current.scale.y, targetScale, 6, delta);
    ref.current.scale.z = damp(ref.current.scale.z, targetScale, 6, delta);
    ref.current.rotation.y =
      placement.rotation +
      Math.sin(clock.elapsedTime * 0.2 + placement.phase) * 0.045 * motion;
  });

  return (
    <group
      ref={ref}
      position={[placement.x, -1.055, placement.z]}
      rotation={[0, placement.rotation, 0]}
      onPointerOver={(event) => {
        if (!enabled) return;
        event.stopPropagation();
        if (typeof document !== "undefined") document.body.style.cursor = "pointer";
      }}
      onPointerOut={(event) => {
        if (!enabled) return;
        event.stopPropagation();
        if (typeof document !== "undefined") document.body.style.cursor = "";
      }}
      onClick={(event) => {
        if (!enabled) return;
        event.stopPropagation();
        onSelect?.(thought.id);
      }}
    >
      <Petal
        rotation={[1.34, 0, 0]}
        scale={[0.18, 0.28, 0.12]}
        color={placement.tint}
      />
      <mesh position={[0, 0.11, 0]} scale={[0.18, 0.12, 0.18]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial
          color={selected ? "#d9aa75" : "#f0c4cc"}
          transparent
          opacity={selected ? 0.12 : 0.035}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ThoughtGarden({
  thoughts = [],
  selectedThoughtId,
  onSelect,
  reducedMotion,
  enabled,
}) {
  return (
    <group>
      {thoughts.slice(-24).map((thought, index) => (
        <ThoughtPetal
          key={thought.id}
          thought={thought}
          index={index}
          selected={thought.id === selectedThoughtId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          enabled={enabled}
        />
      ))}
    </group>
  );
}

function FloatingPetals({ state, speed, motion, bloom }) {
  const ref = useRef();
  const phase = useRef(0);
  useFrame(({ clock }, delta) => {
    phase.current +=
      delta * 0.12 * speed * motion * (state === "working" ? 0.18 : 1);
    const reveal = THREE.MathUtils.smoothstep(bloom.current, 0.38, 0.7);
    ref.current.visible = reveal > 0.01;
    ref.current.scale.setScalar(reveal);
    ref.current.rotation.y = phase.current;
    ref.current.children.forEach((child, i) => {
      child.position.y =
        0.12 + Math.sin(clock.elapsedTime * 0.8 + i * 2) * 0.1 * motion;
    });
  });
  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * TAU + 0.65;
        return (
          <group
            key={i}
            position={[Math.sin(angle) * 1.18, 0.12, Math.cos(angle) * 0.72]}
            rotation={[0.3, -angle, i % 2 ? -0.8 : 0.8]}
          >
            <Petal scale={[0.35, 0.5, 0.4]} color={PINK} />
          </group>
        );
      })}
    </group>
  );
}


function IdleMotes({ motion, strength = 1 }) {
  const particles = useRef();
  const rings = useRef();
  const visual = 0.32 + strength * 0.52;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    particles.current?.children.forEach((child, i) => {
      const angle = i * 1.41 + time * 0.075 * motion;
      const radius = 0.72 + (i % 4) * 0.14;
      child.position.set(
        Math.sin(angle) * radius,
        -0.16 + (i % 6) * 0.28 + Math.sin(time * 0.48 + i) * 0.045 * motion,
        Math.cos(angle) * radius * 0.42 - 0.1,
      );
      child.material.opacity =
        (0.12 + (Math.sin(time * 0.62 + i) + 1) * 0.045) * visual;
    });

    rings.current?.children.forEach((mesh, i) => {
      const pulse = 0.95 + Math.sin(time * (0.36 + i * 0.07)) * 0.035 * motion;
      mesh.scale.setScalar(pulse * (1 + i * 0.105));
      mesh.material.opacity = (0.055 + i * 0.016) * visual;
    });
  });

  return (
    <group>
      <group ref={particles}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.023 + (i % 3) * 0.006, 10, 8]} />
            <meshBasicMaterial
              color={i % 4 === 0 ? "#d7b77d" : i % 3 === 0 ? "#9ab59d" : "#efb2c5"}
              transparent
              opacity={0.16}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group
        ref={rings}
        position={[0, -0.8, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {[0, 1].map((i) => (
          <mesh key={i}>
            <ringGeometry args={[0.65 + i * 0.19, 0.66 + i * 0.19, 80]} />
            <meshBasicMaterial
              color={i === 0 ? "#e6b6c2" : "#9fb39f"}
              transparent
              opacity={0.07}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ThinkingEffect({ motion, strength = 1 }) {
  const orbit = useRef();
  const halo = useRef();
  const marks = useRef();
  const visual = 0.5 + strength * 0.5;

  const questionTexture = useMemo(
    () => makeGlyphTexture("?", "#ffffff", 154),
    [],
  );

  useEffect(
    () => () => questionTexture?.dispose?.(),
    [questionTexture],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (halo.current) {
      const pulse = 0.95 + Math.sin(time * 1.08) * 0.055 * motion;
      halo.current.scale.setScalar(pulse);
      halo.current.material.opacity = 0.14 * visual;
    }

    if (orbit.current) {
      orbit.current.rotation.y = time * 0.42 * motion;
      orbit.current.rotation.z = Math.sin(time * 0.38) * 0.045 * motion;
    }

    marks.current?.children.forEach((sprite, i) => {
      const phase = (time * 0.22 * (motion ? 1 : 0.25) + i / 7) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 0.18 + (i % 3) * 0.11;
      const drift = Math.sin(time * 1.18 + i * 0.9) * 0.04 * motion;

      sprite.position.set(
        side * spread + drift,
        0.68 + phase * 1.12,
        0.08 - (i % 3) * 0.055,
      );

      const envelope = Math.sin(Math.PI * phase);
      const base = 0.15 + (i % 3) * 0.045;
      const scale = (base + envelope * 0.12) * visual;
      sprite.scale.set(scale, scale * 1.28, scale);
      sprite.material.opacity = Math.min(
        0.98,
        (0.22 + envelope * 0.68) * visual,
      );
    });
  });

  return (
    <group position={[0, 0.92, 0]}>
      <mesh ref={halo} position={[0, 0.02, -0.42]}>
        <circleGeometry args={[0.64, 64]} />
        <meshBasicMaterial
          color="#b9a1ee"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={orbit}>
        <mesh rotation={[1.12, 0.2, 0.24]}>
          <torusGeometry args={[0.78, 0.01, 8, 96]} />
          <meshBasicMaterial
            color="#c3abf3"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[1.0, -0.44, -0.4]}>
          <torusGeometry args={[1.02, 0.008, 8, 96]} />
          <meshBasicMaterial
            color="#e2b96f"
            transparent
            opacity={0.17}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={marks}>
        {Array.from({ length: 7 }, (_, i) => (
          <sprite key={i}>
            <spriteMaterial
              map={questionTexture}
              color={i % 3 === 0 ? "#e7bf6e" : i % 2 ? "#c7afff" : "#efabc7"}
              transparent
              opacity={0.82}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

function ListeningEffect({ motion, strength = 1 }) {
  const leftWaves = useRef();
  const rightWaves = useRef();
  const pulse = useRef();
  const visual = 0.52 + strength * 0.48;

  const waveSets = useMemo(
    () =>
      Array.from({ length: 4 }, (_, waveIndex) =>
        Array.from({ length: 34 }, (_, pointIndex) => {
          const x = -0.34 + (pointIndex / 33) * 0.68;
          const envelope = Math.sin((pointIndex / 33) * Math.PI);
          const frequency = 2.1 + waveIndex * 0.55;
          const y =
            Math.sin((pointIndex / 33) * Math.PI * frequency * 2) *
            (0.045 + waveIndex * 0.012) *
            envelope;
          return [x, y, 0];
        }),
      ),
    [],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    [leftWaves.current, rightWaves.current].forEach((group, groupIndex) => {
      if (!group) return;
      group.position.y =
        0.76 + Math.sin(time * 1.25 + groupIndex * 0.7) * 0.025 * motion;

      group.children.forEach((line, i) => {
        const phase = (time * 0.78 * (motion ? 1 : 0.2) + i * 0.15) % 1;
        const waveScale = 0.84 + phase * 0.56;
        line.scale.setScalar(waveScale);
        line.material.opacity =
          (1 - phase) * Math.max(0.12, (0.78 - i * 0.12) * visual);
      });
    });

    if (pulse.current) {
      const amount = 0.84 + (Math.sin(time * 2.2) + 1) * 0.16;
      pulse.current.scale.setScalar(amount);
      pulse.current.material.opacity = 0.2 * visual;
    }
  });

  return (
    <group>
      <mesh ref={pulse} position={[0, 0.79, -0.18]}>
        <ringGeometry args={[0.46, 0.48, 80]} />
        <meshBasicMaterial
          color="#78d0c5"
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={leftWaves} position={[-0.92, 0.76, 0.35]}>
        {waveSets.map((points, i) => (
          <Line
            key={`left-${i}`}
            points={points}
            color={i % 2 === 0 ? "#91e6db" : "#5ec1b6"}
            lineWidth={2.2 - i * 0.24}
            transparent
            opacity={0.58}
            depthWrite={false}
          />
        ))}
      </group>

      <group ref={rightWaves} position={[0.92, 0.76, 0.35]}>
        {waveSets.map((points, i) => (
          <Line
            key={`right-${i}`}
            points={points.map(([x, y, z]) => [-x, y, z])}
            color={i % 2 === 0 ? "#91e6db" : "#5ec1b6"}
            lineWidth={2.2 - i * 0.24}
            transparent
            opacity={0.58}
            depthWrite={false}
          />
        ))}
      </group>
    </group>
  );
}

function WorkingEffect({ motion, strength = 1 }) {
  const orbit = useRef();
  const nodes = useRef();
  const rings = useRef();
  const visual = 0.5 + strength * 0.5;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const orbitSpeed = 0.58 * (motion ? 1 : 0.18);

    if (orbit.current) {
      orbit.current.rotation.y = time * orbitSpeed;
    }

    orbit.current?.children.forEach((panel, i) => {
      const phase = time * 1.12 + i * 1.08;
      panel.position.y = 0.05 + Math.sin(phase) * 0.09 * motion;
      panel.rotation.z = Math.sin(phase * 0.68) * 0.045 * motion;

      const mesh = panel.children[0];
      if (mesh?.material) {
        mesh.material.opacity = Math.min(
          0.62,
          (0.34 + (Math.sin(phase) + 1) * 0.05) * visual,
        );
      }
    });

    nodes.current?.children.forEach((node, i) => {
      const angle = time * 1.02 * (motion ? 1 : 0.2) + (i / 10) * TAU;
      const radius = 0.62 + (i % 3) * 0.08;
      node.position.set(
        Math.sin(angle) * radius,
        0.18 + Math.sin(angle * 2 + i) * 0.08,
        Math.cos(angle) * 0.42 + 0.18,
      );
      node.material.opacity = Math.min(
        0.98,
        (0.48 + (i % 2) * 0.16) * visual,
      );
    });

    rings.current?.children.forEach((mesh, i) => {
      mesh.rotation.z =
        (i % 2 === 0 ? 1 : -1) *
        time *
        (0.13 + i * 0.055) *
        (motion ? 1 : 0.18);
      mesh.material.opacity = (0.16 + i * 0.025) * visual;
    });
  });

  return (
    <group position={[0, 0.12, 0]}>
      <group ref={rings}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[1.08 + i * 0.05, i * 0.18, i % 2 ? -0.2 : 0.2]}
          >
            <torusGeometry args={[0.86 + i * 0.13, 0.008, 8, 96]} />
            <meshBasicMaterial
              color={i === 1 ? "#e0b866" : "#88b47a"}
              transparent
              opacity={0.16}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      <group ref={orbit}>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * TAU;
          return (
            <group
              key={i}
              position={[
                Math.sin(angle) * 1.16,
                0.05,
                Math.cos(angle) * 0.76,
              ]}
              rotation={[0, -angle, 0]}
            >
              <mesh>
                <planeGeometry args={[0.43, 0.29]} />
                <meshBasicMaterial
                  color={i % 2 ? "#79a879" : "#a4bd82"}
                  transparent
                  opacity={0.36}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {[0, 1, 2].map((lineIndex) => (
                <Line
                  key={lineIndex}
                  points={[
                    [-0.13, 0.07 - lineIndex * 0.066, 0.006],
                    [0.11 - lineIndex * 0.018, 0.07 - lineIndex * 0.066, 0.006],
                  ]}
                  color={lineIndex === 0 ? "#e7bc64" : "#e0edd9"}
                  lineWidth={1.6}
                  transparent
                  opacity={0.92}
                />
              ))}
            </group>
          );
        })}
      </group>

      <group ref={nodes}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.031 + (i % 2) * 0.008, 0]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? "#e5b85f" : "#95bd80"}
              transparent
              opacity={0.62}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SuccessEffect({ motion, strength = 1 }) {
  const particles = useRef();
  const rings = useRef();
  const crown = useRef();
  const visual = 0.52 + strength * 0.48;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    particles.current.children.forEach((child, i) => {
      const phase =
        (time * 0.5 * (motion ? 1 : 0.22) + i / 32) % 1;
      const angle = i * 1.72 + phase * 1.6;
      const radius = 0.34 + (i % 7) * 0.13 + phase * 0.34;

      child.position.set(
        Math.sin(angle) * radius,
        -0.78 + phase * 3.72,
        Math.cos(angle) * 0.52 - 0.1,
      );
      child.rotation.z = angle + phase * 3.4;
      child.rotation.x = 0.14 + phase * 1.0;

      const envelope = Math.sin(Math.PI * phase);
      const scale = envelope * (i % 4 === 0 ? 1.45 : 1.06) * visual;
      child.scale.setScalar(Math.max(0.04, scale));

      child.children.forEach((part) => {
        if (part.material) {
          part.material.opacity = Math.min(
            1,
            envelope * 0.98 * visual,
          );
        }
      });
    });

    rings.current?.children.forEach((mesh, i) => {
      const phase = (time * 0.44 + i * 0.17) % 1;
      mesh.scale.setScalar(0.42 + phase * 1.72);
      mesh.material.opacity = (1 - phase) * 0.34 * visual;
    });

    if (crown.current) {
      crown.current.rotation.z = Math.sin(time * 0.6) * 0.08 * motion;
      crown.current.scale.setScalar(
        0.94 + Math.sin(time * 2.0) * 0.04 * motion,
      );
    }
  });

  return (
    <group>
      <group ref={particles}>
        {Array.from({ length: 32 }, (_, i) => (
          <group key={i}>
            {i % 4 === 0 ? (
              <Petal
                scale={[0.13, 0.21, 0.14]}
                color={i % 2 ? "#f09db8" : "#ffd6df"}
              />
            ) : (
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <octahedronGeometry args={[0.05 + (i % 3) * 0.015, 0]} />
                <meshBasicMaterial
                  color={i % 3 === 0 ? "#f0abc2" : "#edc16b"}
                  transparent
                  opacity={0.94}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>

      <group
        ref={rings}
        position={[0, -0.74, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <ringGeometry args={[0.46 + i * 0.105, 0.476 + i * 0.105, 80]} />
            <meshBasicMaterial
              color={i % 2 ? "#efbf65" : "#eba0ba"}
              transparent
              opacity={0.27}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      <group ref={crown} position={[0, 1.64, 0.05]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = -0.7 + i * 0.35;
          return (
            <mesh
              key={i}
              position={[
                Math.sin(angle) * 0.38,
                Math.cos(angle) * 0.09,
                0,
              ]}
              rotation={[0, 0, angle]}
            >
              <octahedronGeometry args={[0.045 + (i % 2) * 0.012, 0]} />
              <meshBasicMaterial
                color={i % 2 ? "#f2a6bd" : "#f0c46d"}
                transparent
                opacity={0.8}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function SleepEffect({ motion, strength = 1 }) {
  const dust = useRef();
  const crescent = useRef();
  const zMarks = useRef();
  const visual = 0.5 + strength * 0.5;

  const zTexture = useMemo(
    () => makeGlyphTexture("Z", "#ffffff", 150),
    [],
  );

  useEffect(
    () => () => zTexture?.dispose?.(),
    [zTexture],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    dust.current?.children.forEach((child, i) => {
      const phase =
        (time * 0.065 * (motion ? 1 : 0.24) + i / 14) % 1;
      const angle = i * 1.57 + phase * 0.7;
      child.position.set(
        Math.sin(angle) * (0.52 + (i % 5) * 0.14),
        1.72 - phase * 2.18,
        Math.cos(angle) * 0.46 - 0.15,
      );
      const twinkle = 0.42 + 0.58 * Math.sin(Math.PI * phase);
      child.scale.setScalar(0.76 + twinkle * 0.4);
      child.material.opacity = Math.min(
        0.6,
        (0.09 + twinkle * 0.21) * visual,
      );
    });

    if (crescent.current) {
      crescent.current.rotation.z =
        -0.28 + Math.sin(time * 0.22) * 0.05 * motion;
      crescent.current.material.opacity =
        (0.2 + (Math.sin(time * 0.5) + 1) * 0.04) * visual;
    }

    zMarks.current?.children.forEach((sprite, i) => {
      const phase =
        (time * 0.12 * (motion ? 1 : 0.2) + i / 5) % 1;
      const x =
        0.38 + i * 0.105 + Math.sin(time * 0.82 + i) * 0.025 * motion;
      const y = 0.82 + phase * 0.86;
      const envelope = Math.sin(Math.PI * phase);
      const scale =
        (0.13 + i * 0.035 + envelope * 0.045) * visual;

      sprite.position.set(x, y, 0.04 - i * 0.025);
      sprite.scale.set(scale, scale * 1.15, scale);
      sprite.material.opacity = Math.min(
        0.94,
        (0.2 + envelope * 0.68) * visual,
      );
    });
  });

  return (
    <group>
      <group ref={dust}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.028 + (i % 3) * 0.009, 10, 8]} />
            <meshBasicMaterial
              color={i % 4 === 0 ? "#d9c78c" : i % 2 ? "#a9bce7" : "#c6a9dc"}
              transparent
              opacity={0.28}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      <mesh
        ref={crescent}
        position={[0.78, 1.4, -0.08]}
        rotation={[0, 0, -0.28]}
      >
        <torusGeometry args={[0.23, 0.019, 8, 64, Math.PI * 1.42]} />
        <meshBasicMaterial
          color="#b7c8f2"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={zMarks}>
        {Array.from({ length: 5 }, (_, i) => (
          <sprite key={i}>
            <spriteMaterial
              map={zTexture}
              color={i % 2 ? "#c8afe7" : "#b6c9f4"}
              transparent
              opacity={0.76}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

function DiscoveryEffect({ reaction, reducedMotion }) {
  const ref = useRef();
  const type = reaction?.type ?? "none";
  const active =
    type.startsWith("secret_") || type.startsWith("ritual_");

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = active;
    if (!active) return;

    const current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const age = THREE.MathUtils.clamp(
      (current - reaction.startedAt) / Math.max(1, reaction.duration),
      0,
      1,
    );
    const envelope = Math.sin(Math.PI * age);
    const motionScale = reducedMotion ? 0.22 : 1;

    ref.current.children.forEach((mesh, i) => {
      const angle = i * 2.399;
      const seed = (i % 5) / 5;
      const flutter = Math.sin(clock.elapsedTime * 2.4 + i) * 0.045 * motionScale;

      if (type === "secret_shy") {
        const side = i % 2 ? 1 : -1;
        mesh.position.set(
          side * (0.34 + seed * 0.42),
          0.62 + seed * 0.72 + age * 0.22,
          0.18 + Math.cos(angle) * 0.16,
        );
      } else if (type === "secret_petal_dance") {
        const side = i % 2 ? 1 : -1;
        mesh.position.set(
          side * (0.55 + seed * 0.55),
          -0.24 + Math.sin(angle + age * 5) * 0.24 + age * 0.48,
          0.08 + Math.cos(angle) * 0.26,
        );
      } else if (type === "secret_night_fireflies") {
        const radius = 0.4 + seed * 0.7;
        mesh.position.set(
          Math.sin(angle + clock.elapsedTime * 0.65 * motionScale) * radius,
          -0.05 + seed * 1.25 + flutter,
          Math.cos(angle + clock.elapsedTime * 0.65 * motionScale) * 0.44,
        );
      } else if (type === "secret_pond_chorus") {
        const radius = 0.52 + seed * 0.75 + age * 0.16;
        mesh.position.set(
          Math.sin(angle) * radius,
          -0.92 + age * 0.52 + flutter,
          Math.cos(angle) * radius * 0.42,
        );
      } else if (type === "secret_quiet_gaze") {
        const radius = 0.18 + seed * 0.34;
        mesh.position.set(
          Math.sin(angle) * radius,
          0.58 + seed * 0.72 + age * 0.12,
          0.42 + Math.cos(angle) * 0.09,
        );
      } else if (type === "ritual_thought") {
        const radius = 0.45 + seed * 0.78 + age * 0.18;
        mesh.position.set(
          Math.sin(angle + age * 1.2) * radius,
          -0.84 + seed * 0.42 + age * 0.52 + flutter,
          Math.cos(angle) * radius * 0.46,
        );
      } else if (type === "ritual_focus_complete") {
        const radius = 0.32 + seed * 0.88 + age * 0.26;
        mesh.position.set(
          Math.sin(angle + age * 1.5) * radius,
          -0.82 + age * 2.7 + seed * 0.52 + flutter,
          Math.cos(angle + age * 0.8) * 0.38,
        );
      }

      const sparkle =
        0.72 + (Math.sin(clock.elapsedTime * 4 + i * 0.9) + 1) * 0.14;
      mesh.scale.setScalar(
        (0.72 + seed * 0.38) * sparkle * (0.72 + envelope * 0.4),
      );
      mesh.material.opacity = envelope * (0.34 + seed * 0.34);
    });
  });

  return (
    <group ref={ref} visible={false}>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} rotation={[0, 0, i * 0.7]}>
          {i % 3 === 0 ? (
            <octahedronGeometry args={[0.026 + (i % 4) * 0.006, 0]} />
          ) : (
            <sphereGeometry args={[0.018 + (i % 3) * 0.005, 8, 6]} />
          )}
          <meshBasicMaterial
            color={
              type === "secret_night_fireflies"
                ? i % 2
                  ? "#d5c57e"
                  : "#8fac83"
                : type === "secret_pond_chorus"
                  ? i % 2
                    ? "#9bb2a0"
                    : "#d5a2b2"
                  : type === "ritual_focus_complete"
                    ? i % 3 === 0
                      ? "#e2bf75"
                      : "#f1a3bc"
                    : type === "ritual_thought"
                      ? i % 2
                        ? "#efb4c3"
                        : "#cda972"
                      : i % 3 === 0
                        ? "#d6ae73"
                        : "#efa9bd"
            }
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function StateEffects({ state, motion, strength }) {
  if (state === "thinking") {
    return <ThinkingEffect motion={motion} strength={strength} />;
  }
  if (state === "listening") {
    return <ListeningEffect motion={motion} strength={strength} />;
  }
  if (state === "working") {
    return <WorkingEffect motion={motion} strength={strength} />;
  }
  if (state === "success") {
    return <SuccessEffect motion={motion} strength={strength} />;
  }
  if (state === "sleep") {
    return <SleepEffect motion={motion} strength={strength} />;
  }
  return <IdleMotes motion={motion} strength={strength} />;
}

export default function SenModel({
  state = "idle",
  energy = 72,
  haloControl = 1,
  coreControl = 1,
  hoverControl = 1,
  reducedMotion = false,
  presencePhase = "day",
  presenceWeather = "clear",
  presenceMood = "bright",
  interaction = null,
  interactionEnabled = true,
  ritual = null,
  focusActive = false,
  personal = null,
}) {
  const root = useRef(),
    awake = useRef(),
    head = useRef(),
    crystal = useRef(),
    coreAura = useRef(),
    budLight = useRef();
  const sidePetals = useRef({});
  const gazePointer = useGlobalGazePointer();
  const bloom = useRef(state === "sleep" ? 0 : energy / 100);
  const reaction = interaction?.reaction ?? {
    type: "none",
    target: null,
    intensity: 0,
    startedAt: 0,
    duration: 1,
  };
  const hoveredTarget = interaction?.hoveredTarget ?? null;
  const heldTarget = interaction?.heldTarget ?? null;
  const personalPalette = personal?.dna ?? {
    petalPrimary: PINK,
    petalSoft: PEARL,
    leaf: JADE,
    core: "#f6b6c2",
    coreGlow: "#ec96a7",
    gold: GOLD,
  };
  const characterInteractionEnabled =
    interactionEnabled && state !== "sleep" && energy > 28;

  const setCursor = (cursor) => {
    if (typeof document !== "undefined") document.body.style.cursor = cursor;
  };
  const beginHover = (event, target) => {
    if (!characterInteractionEnabled) return;
    event.stopPropagation();
    interaction?.setHoveredTarget(target);
    setCursor("pointer");
  };
  const endHover = (event, target) => {
    if (!characterInteractionEnabled) return;
    event.stopPropagation();
    if (interaction?.hoveredTarget === target) {
      interaction.setHoveredTarget(null);
    }
    setCursor("");
  };

  useLayoutEffect(
    () => () => {
      if (typeof document !== "undefined") document.body.style.cursor = "";
    },
    [],
  );
  const cfg = SEN_STATES[state] || SEN_STATES.idle;
  const moodMotion = MOOD_MOTION[state] || MOOD_MOTION.idle;
  const motion = reducedMotion ? 0 : 1;
  const ambientMotion = reducedMotion ? 0.35 : 1;
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const interactionNow =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const reactionAge =
      reaction.type === "none" || !reaction.startedAt || reaction.type === "core_hold"
        ? 0
        : THREE.MathUtils.clamp(
            (interactionNow - reaction.startedAt) /
              Math.max(1, reaction.duration),
            0,
            1,
          );
    const reactionEnvelope =
      reaction.type === "none"
        ? 0
        : reaction.type === "core_hold"
          ? 1
          : Math.sin(Math.PI * reactionAge) * (reaction.intensity ?? 1);
    const headHover = hoveredTarget === "head" ? 1 : 0;
    const headPat = reaction.type === "head_pat" ? reactionEnvelope : 0;
    const shy = reaction.type === "secret_shy" ? reactionEnvelope : 0;
    const petalDance =
      reaction.type === "secret_petal_dance" ? reactionEnvelope : 0;
    const nightFireflies =
      reaction.type === "secret_night_fireflies" ? reactionEnvelope : 0;
    const quietGaze =
      reaction.type === "secret_quiet_gaze" ? reactionEnvelope : 0;
    const phaseCalm =
      presencePhase === "night"
        ? 0.48
        : presencePhase === "dawn"
          ? 0.68
          : presencePhase === "dusk"
            ? 0.8
            : 1;
    const weatherCalm =
      presenceWeather === "rain"
        ? 0.68
        : presenceWeather === "mist"
          ? 0.58
          : presenceWeather === "cloudy"
            ? 0.82
            : presenceWeather === "wind"
              ? 1.12
              : 1;
    const moodBias =
      presenceMood === "sleepy"
        ? 0.82
        : presenceMood === "dreamy"
          ? 0.88
          : presenceMood === "curious"
            ? 1.08
            : 1;
    const presenceCalm = phaseCalm * weatherCalm * moodBias;
    const ambientScale =
      ambientMotion *
      (focusActive ? 0.72 : 1) *
      THREE.MathUtils.clamp(presenceCalm, 0.88, 1.08);
    const ambientFloat =
      Math.sin(t * moodMotion.floatSpeed) *
      moodMotion.floatAmp *
      ambientScale;
    const ambientSway =
      Math.sin(t * moodMotion.swaySpeed + 0.55) *
      moodMotion.swayAmp *
      ambientScale;
    const ambientHeadYaw =
      (Math.sin(t * moodMotion.headSpeed + 0.7) * 0.68 +
        Math.sin(t * moodMotion.headSpeed * 0.47 + 2.1) * 0.32) *
      moodMotion.headYawAmp *
      ambientScale;
    const ambientHeadPitch =
      Math.sin(t * moodMotion.headSpeed * 0.83 + 1.15) *
        moodMotion.headPitchAmp *
        ambientScale +
      moodMotion.lean * ambientScale;
    const ambientBreath =
      1 +
      Math.sin(t * moodMotion.breatheSpeed) *
        moodMotion.breatheAmp *
        ambientScale;
    const ambientCorePulse =
      1 +
      Math.sin(t * moodMotion.corePulseSpeed) *
        moodMotion.corePulseAmp *
        ambientScale;

    // Slow asymmetric micro-gestures keep Sen feeling alive without looking
    // like a looping idle animation. Each mood bends the gesture differently.
    const gesturePulse = Math.pow(
      Math.max(0, Math.sin(t * 0.36 + 1.1)),
      6,
    ) * ambientScale;
    const gestureDirection =
      state === "thinking"
        ? -1
        : state === "listening"
          ? 1
          : state === "success"
            ? 0.65
            : state === "sleep"
              ? -0.35
              : 0.5;
    const gestureYaw = gesturePulse * 0.085 * gestureDirection;
    const gestureTilt =
      gesturePulse *
      (state === "working" ? 0.018 : state === "sleep" ? 0.016 : 0.036) *
      (state === "thinking" ? -1 : 1);
    const gestureLift =
      gesturePulse *
      (state === "success" ? 0.055 : state === "sleep" ? 0.008 : 0.025);

    const gazeState =
      state === "sleep" || state === "success"
        ? 0
        : state === "thinking"
          ? 0.72
          : state === "listening"
            ? 1.05
            : 1;
    const gazeStrength = gazeState * (focusActive ? 0.55 : 1);
    const gazeX = applyGazeDeadZone(gazePointer.current.x) * gazeStrength;
    const gazeY = applyGazeDeadZone(gazePointer.current.y) * gazeStrength;
    const autonomous = state === "idle" ? motion : 0;
    const idleLook =
      (Math.sin(t * 0.17) * 0.075 +
        Math.sin(t * 0.071 + 1.8) * 0.045) *
      autonomous *
      presenceCalm *
      (headHover ? 0.18 : 1);
    const idleTilt =
      Math.sin(t * 0.11 + 0.6) * 0.026 * autonomous * presenceCalm;

    bloom.current = damp(
      bloom.current,
      state === "sleep" ? 0 : energy / 100,
      reducedMotion ? 8 : 1.5,
      delta,
    );
    root.current.position.y = damp(
      root.current.position.y,
      ambientFloat +
        gestureLift +
        Math.sin(t * (0.92 + presenceCalm * 0.24)) *
          cfg.bob *
          0.3 *
          hoverControl *
          motion,
      state === "success" ? 4.6 : state === "sleep" ? 1.7 : 3,
      delta,
    );
    root.current.position.x = damp(
      root.current.position.x,
      Math.sin(t * (moodMotion.swaySpeed * 0.72) + 1.2) *
        moodMotion.swayAmp *
        0.6 *
        ambientScale,
      state === "sleep" ? 1.5 : 2.5,
      delta,
    );
    root.current.rotation.z = damp(
      root.current.rotation.z,
      ambientSway,
      state === "working" ? 4.8 : state === "sleep" ? 1.6 : 2.7,
      delta,
    );
    const emergence = THREE.MathUtils.smoothstep(bloom.current, 0.2, 0.72);
    const folded = 1 - emergence;
    awake.current.scale.set(
      (0.93 + 0.07 * emergence) * ambientBreath,
      (0.975 + 0.025 * emergence) * ambientBreath,
      (0.93 + 0.07 * emergence) * ambientBreath,
    );
    awake.current.position.y =
      -0.43 * folded +
      Math.sin(t * 0.31 + 1.2) * 0.012 * autonomous * presenceCalm;
    awake.current.rotation.x = damp(
      awake.current.rotation.x,
      0.075 * folded - gazeY * 0.018 * emergence,
      2.6,
      delta,
    );
    awake.current.rotation.y = damp(
      awake.current.rotation.y,
      idleLook * 0.18 +
        gazeX * 0.038 * emergence +
        ambientHeadYaw * 0.16,
      2.4,
      delta,
    );
    awake.current.rotation.z = damp(
      awake.current.rotation.z,
      ambientSway * 0.42 +
        Math.sin(t * 0.48) *
          0.007 *
          hoverControl *
          motion *
          (0.7 + presenceCalm * 0.3),
      2.5,
      delta,
    );
    head.current.position.y = damp(
      head.current.position.y,
      -0.13 * folded +
        Math.sin(t * 0.27) * 0.014 * autonomous * presenceCalm +
        gestureLift * 0.38 -
        headPat * 0.045 -
        shy * 0.045 +
        quietGaze * 0.02,
      headHover ? 4.2 : 2,
      delta,
    );
    head.current.rotation.z = damp(
      head.current.rotation.z,
      cfg.tilt +
        ambientSway * 0.68 +
        Math.sin(t * 0.65) * 0.006 * motion +
        idleTilt * 0.55 +
        Math.sin(reactionAge * Math.PI * 3) * headPat * 0.065 +
        shy * 0.13 +
        quietGaze * 0.045,
      headHover ? 4.5 : state === "sleep" ? 1.8 : 2.8,
      delta,
    );
    head.current.rotation.y = damp(
      head.current.rotation.y,
      gazeX *
        (headHover ? 0.21 : 0.17) *
        emergence *
        (1 - quietGaze * 0.92) +
        idleLook * 0.45 * (1 - quietGaze) +
        ambientHeadYaw +
        gestureYaw +
        shy * 0.18,
      headHover ? 6.2 : state === "sleep" ? 1.7 : state === "working" ? 4.8 : 3.6,
      delta,
    );
    head.current.rotation.x = damp(
      head.current.rotation.x,
      0.14 * folded -
        gazeY * (headHover ? 0.105 : 0.082) * emergence +
        ambientHeadPitch +
        gestureTilt +
        Math.sin(t * 0.13 + 2.2) * 0.008 * autonomous * presenceCalm +
        headPat * 0.075 +
        shy * 0.055 -
        quietGaze * 0.028,
      headHover ? 6.2 : state === "sleep" ? 1.7 : state === "working" ? 4.6 : 3.7,
      delta,
    );

    [-1, 1].forEach((side) => {
      const petalGroup = sidePetals.current[side];
      if (!petalGroup) return;
      const target = `petal:${side}`;
      const petalHover = hoveredTarget === target ? 1 : 0;
      const petalTouch =
        reaction.type === "petal_touch" && reaction.target === target
          ? reactionEnvelope
          : 0;
      const flutter =
        Math.sin(reactionAge * Math.PI * 4) * petalTouch * 0.105 * side +
        Math.sin(reactionAge * Math.PI * 8 + side * 0.8) *
          petalDance *
          0.14 *
          side;

      const ambientPetal =
        Math.sin(t * (0.58 + moodMotion.floatSpeed * 0.22) + side * 1.8) *
        moodMotion.petalAmp *
        ambientScale *
        side;
      petalGroup.rotation.z = damp(
        petalGroup.rotation.z,
        ambientPetal + side * petalHover * 0.035 + flutter,
        petalHover || petalTouch ? 8 : state === "sleep" ? 1.8 : 3.4,
        delta,
      );
      petalGroup.position.y = damp(
        petalGroup.position.y,
        petalHover * 0.014 + petalTouch * 0.025 + petalDance * 0.04,
        8,
        delta,
      );
    });
    const wakeFlash =
      state === "sleep"
        ? 0
        : Math.sin(
            Math.PI * THREE.MathUtils.smoothstep(bloom.current, 0.08, 0.76),
          );
    const sleepingPulse =
      state === "sleep"
        ? 0.12 +
          (Math.sin(t * moodMotion.corePulseSpeed) + 1) *
            0.035 *
            ambientMotion
        : (0.22 + 0.78 * bloom.current + wakeFlash * 0.55) *
          ambientCorePulse;
    const nightBoost = presencePhase === "night" ? 1.28 : 1;
    const coreHovered = hoveredTarget === "core";
    const coreHeld = heldTarget === "core";
    const coreRelease =
      reaction.type === "core_release" ? reactionEnvelope : 0;
    const coreInteractionGlow =
      (coreHovered ? 0.28 : 0) +
      (coreHeld ? 1.1 + Math.sin(t * 5.2) * 0.16 : 0) +
      coreRelease * 0.45 +
      nightFireflies * 0.78;

    crystal.current.material.emissiveIntensity = damp(
      crystal.current.material.emissiveIntensity,
      ((state === "sleep" ? 0.18 : cfg.glow) *
        (0.06 + coreControl * 1.12) *
        sleepingPulse +
        coreInteractionGlow) *
        nightBoost,
      coreHeld ? 8 : 4,
      delta,
    );
    budLight.current.intensity = damp(
      budLight.current.intensity,
      (state === "sleep"
        ? 0.22 +
          Math.sin(t * moodMotion.corePulseSpeed) *
            0.035 *
            ambientMotion
        : (0.32 + bloom.current * 0.52 + wakeFlash * 0.72) *
          ambientCorePulse) *
        (0.04 + coreControl * 1.18) * nightBoost +
        coreInteractionGlow * 0.72 * nightBoost,
      coreHeld ? 8 : 4,
      delta,
    );
    const coreScale =
      1 +
      (coreHovered ? 0.035 : 0) +
      (coreHeld ? 0.09 + Math.sin(t * 5.2) * 0.018 : 0) +
      coreRelease * 0.045;
    crystal.current.scale.x = damp(
      crystal.current.scale.x,
      0.2 * coreScale,
      8,
      delta,
    );
    crystal.current.scale.y = damp(
      crystal.current.scale.y,
      0.29 * coreScale,
      8,
      delta,
    );
    crystal.current.scale.z = damp(
      crystal.current.scale.z,
      0.17 * coreScale,
      8,
      delta,
    );
    crystal.current.rotation.y += delta * (coreHeld ? 0.72 : 0.25) * motion;
    if (coreAura.current) {
      const warmth = THREE.MathUtils.clamp(coreControl / 2, 0, 1);
      const pulse =
        1 + Math.sin(t * (1.5 + warmth * 1.2)) * 0.07 * motion * warmth;
      const auraScale =
        (0.72 + warmth * 0.72 + coreInteractionGlow * 0.08) * pulse;
      coreAura.current.scale.setScalar(auraScale);
      coreAura.current.material.opacity = damp(
        coreAura.current.material.opacity,
        ((0.015 + warmth * 0.24) * bloom.current +
          coreInteractionGlow * 0.04) *
          (presencePhase === "night" ? 1.38 : 1),
        6,
        delta,
      );
    }
  });
  return (
    <group ref={root}>
      <pointLight
        ref={budLight}
        position={[0, -0.12, 0.08]}
        color={personalPalette.coreGlow}
        intensity={0.3}
        distance={3.1}
        decay={2}
      />
      <group ref={awake}>
        <group ref={head}>
          <Petal
            position={[0, 0.3, -0.31]}
            scale={[1.1, 1.54, 0.9]}
            color={personalPalette.petalSoft}
            accent={personalPalette.gold}
            bend={-0.22}
            ornament
          />
          {[-1, 1].flatMap((side) =>
            [0, 1, 2].map((index) => (
              <CrownPetal
                key={`${side}-${index}`}
                side={side}
                index={index}
                state={state}
                motion={motion}
                bloom={bloom}
                palette={personalPalette}
              />
            )),
          )}
          <mesh position={[0, 0.8, 0.18]} scale={[0.6, 0.5, 0.36]}>
            <sphereGeometry args={[1, 48, 32]} />
            <meshPhysicalMaterial
              color="#fff0df"
              metalness={0.02}
              roughness={0.55}
              clearcoat={0.15}
            />
          </mesh>
          <Eyes
            state={state}
            motion={motion}
            bloom={bloom}
            gazePointer={gazePointer}
            focusActive={focusActive}
          />
          {characterInteractionEnabled && (
            <mesh
              position={[0, 0.8, 0.24]}
              scale={[0.7, 0.61, 0.48]}
              onPointerOver={(event) => beginHover(event, "head")}
              onPointerOut={(event) => endHover(event, "head")}
              onClick={(event) => {
                event.stopPropagation();
                interaction?.patHead();
              }}
            >
              <sphereGeometry args={[1, 18, 12]} />
              <meshBasicMaterial
                transparent
                opacity={0}
                depthWrite={false}
                colorWrite={false}
              />
            </mesh>
          )}
          {[-1, 1].map((side) => (
            <Petal
              key={side}
              position={[0, 0.29, 0.3]}
              rotation={[0.05, side * -0.2, -side * 1.38]}
              scale={[0.42, 0.72, 0.35]}
              color={personalPalette.petalPrimary}
              accent={personalPalette.gold}
              ornament
            />
          ))}
        </group>

        {/* Petal body: no mechanical joints, hands or mouth. */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            ref={(node) => {
              sidePetals.current[side] = node;
            }}
          >
            <Petal
              position={[0, -0.85, 0.03]}
              rotation={[0, side * 0.15, -side * 0.32]}
              scale={[0.78, 0.93, 0.65]}
              color={personalPalette.petalPrimary}
              accent={personalPalette.gold}
              ornament
            />
            <Petal
              position={[side * 0.49, -0.11, 0.06]}
              rotation={[0.18, side * 0.25, -side * 2.52]}
              scale={[0.6, 0.82, 0.8]}
              color={personalPalette.petalPrimary}
              accent={personalPalette.gold}
              ornament
            />
            <Petal
              position={[side * 0.5, -0.18, -0.035]}
              rotation={[0.15, side * 0.25, -side * 2.4]}
              scale={[0.58, 0.86, 0.6]}
              color={personalPalette.leaf}
              accent={personalPalette.gold}
              leaf
            />
            <Petal
              position={[0, 0.14, 0.07]}
              rotation={[0.25, 0, -side * 1.16]}
              scale={[0.36, 0.62, 0.5]}
              color={personalPalette.leaf}
              accent={personalPalette.gold}
              leaf
            />
            {characterInteractionEnabled && (
              <mesh
                position={[side * 0.45, -0.11, 0.2]}
                scale={[0.48, 0.62, 0.34]}
                onPointerOver={(event) =>
                  beginHover(event, `petal:${side}`)
                }
                onPointerOut={(event) =>
                  endHover(event, `petal:${side}`)
                }
                onClick={(event) => {
                  event.stopPropagation();
                  interaction?.touchPetal(side);
                }}
              >
                <sphereGeometry args={[1, 14, 10]} />
                <meshBasicMaterial
                  transparent
                  opacity={0}
                  depthWrite={false}
                  colorWrite={false}
                />
              </mesh>
            )}
          </group>
        ))}
        <mesh
          ref={crystal}
          position={[0, -0.1, 0.31]}
          scale={[0.2, 0.29, 0.17]}
          onPointerOver={(event) => {
            if (!characterInteractionEnabled) return;
            event.stopPropagation();
            interaction?.setHoveredTarget("core");
            setCursor("pointer");
          }}
          onPointerOut={(event) => {
            if (!characterInteractionEnabled) return;
            event.stopPropagation();
            if (interaction?.heldTarget === "core") interaction.endCoreHold();
            if (interaction?.hoveredTarget === "core") {
              interaction.setHoveredTarget(null);
            }
            setCursor("");
          }}
          onPointerDown={(event) => {
            if (!characterInteractionEnabled) return;
            event.stopPropagation();
            interaction?.beginCoreHold();
          }}
          onPointerUp={(event) => {
            if (!characterInteractionEnabled) return;
            event.stopPropagation();
            interaction?.endCoreHold();
          }}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color={personalPalette.core}
            emissive={personalPalette.coreGlow}
            emissiveIntensity={0.45}
            metalness={0.15}
            roughness={0.15}
            clearcoat={1}
          />
        </mesh>
        <mesh
          ref={coreAura}
          position={[0, -0.1, 0.295]}
          scale={[0.9, 0.9, 0.9]}
        >
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshBasicMaterial
            color={personalPalette.coreGlow}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <Line
          points={[
            [0, 0.22, 0.31],
            [0.23, -0.09, 0.31],
            [0, -0.42, 0.31],
            [-0.23, -0.09, 0.31],
            [0, 0.22, 0.31],
          ]}
          color={personalPalette.gold}
          lineWidth={1.3}
        />
        <FloatingPetals
          state={state}
          speed={haloControl}
          motion={motion}
          bloom={bloom}
        />

      </group>
      <StateEffects state={state} motion={motion} strength={haloControl} />
      <DiscoveryEffect reaction={reaction} reducedMotion={reducedMotion} />
      {LOTUS_LAYERS.flatMap((layer, layerIndex) =>
        Array.from({ length: layer.count }, (_, index) => (
          <LotusBloomPetal
            key={layer.key + "-" + index}
            layer={layer}
            layerIndex={layerIndex}
            index={index}
            bloom={bloom}
            state={state}
            motion={motion}
          />
        )),
      )}
      {Array.from({ length: 7 }, (_, i) => (
        <group
          key={i}
          position={[0, -1.03, 0]}
          rotation={[0, (i / 7) * TAU, 0]}
        >
          <Petal
            rotation={[1.32, 0, 0]}
            scale={[0.64, 0.91, 0.4]}
            color={personalPalette.leaf}
            accent={personalPalette.gold}
            leaf
          />
        </group>
      ))}
      <BloomAura bloom={bloom} motion={motion} state={state} />
      <Ripples state={state} motion={motion} bloom={bloom} />
      <TouchRipples
        ripples={interaction?.ripples ?? []}
        reducedMotion={reducedMotion}
      />
      <PersonalGardenGrowth
        personal={personal}
        reducedMotion={reducedMotion}
      />
      <ThoughtGarden
        thoughts={ritual?.thoughts ?? []}
        selectedThoughtId={ritual?.selectedThoughtId ?? null}
        onSelect={ritual?.selectThought}
        reducedMotion={reducedMotion}
        enabled={interactionEnabled}
      />
      {interactionEnabled && (
        <mesh
          position={[0, -1.108, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerOver={() => setCursor("crosshair")}
          onPointerOut={() => setCursor("")}
          onClick={(event) => {
            event.stopPropagation();
            interaction?.touchWater([
              event.point.x,
              event.point.y,
              event.point.z,
            ]);
          }}
        >
          <circleGeometry args={[1.9, 64]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
