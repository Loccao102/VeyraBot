import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const PINK = "#eda1b6",
  PEARL = "#ffe3df",
  GOLD = "#bd895c",
  JADE = "#688a70";
const TAU = Math.PI * 2;
const damp = THREE.MathUtils.damp;
export const SEN_STATES = {
  idle: { bloom: 0, tilt: 0, glow: 0.45, bob: 0.045 },
  thinking: { bloom: -0.12, tilt: -0.12, glow: 0.65, bob: 0.025 },
  listening: { bloom: 0.16, tilt: 0.06, glow: 0.5, bob: 0.025 },
  working: { bloom: 0.08, tilt: 0, glow: 0.8, bob: 0.015 },
  success: { bloom: 0.3, tilt: 0.05, glow: 1, bob: 0.065 },
  sleep: { bloom: -0.3, tilt: 0, glow: 0.08, bob: 0.008 },
};

const LOTUS_LAYERS = [
  {
    key: "outer",
    count: 8,
    start: 0,
    end: 0.58,
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
    start: 0.16,
    end: 0.76,
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
    start: 0.34,
    end: 0.9,
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
    start: 0.52,
    end: 1,
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
        color={GOLD}
        lineWidth={0.85}
        transparent
        opacity={0.8}
      />
      {(ornament || leaf) && (
        <Line
          points={vein}
          color={leaf ? "#b6bd8b" : GOLD}
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
            color={GOLD}
            lineWidth={0.8}
            transparent
            opacity={0.7}
          />
        ))}
    </group>
  );
}

function CrownPetal({ side, index, state, motion, bloom }) {
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
        color={index === 1 ? PINK : PEARL}
        bend={index === 0 ? -0.16 : 0.16}
        ornament={index < 2}
      />
    </group>
  );
}

function Eyes({ state, motion, bloom }) {
  const ref = useRef();
  useFrame(({ clock, pointer }, delta) => {
    const blink =
      motion && Math.sin(clock.elapsedTime * 0.85) > 0.998 ? 0.13 : 1;
    const wakeAmount = bloom
      ? THREE.MathUtils.smoothstep(bloom.current, 0.46, 0.68)
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
    ref.current.position.x = damp(
      ref.current.position.x,
      pointer.x * 0.035 * motion,
      5,
      delta,
    );
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
    const overshoot =
      Math.sin(settle * Math.PI) *
      0.025 *
      twistSign *
      (1 - layerIndex * 0.12);
    const ambient =
      Math.sin(clock.elapsedTime * 0.72 + index * 0.83 + layerIndex) *
      0.0035 *
      motion *
      amount;
    motionRef.current.rotation.x = damp(
      motionRef.current.rotation.x,
      -0.008 * amount + overshoot,
      4,
      delta,
    );
    motionRef.current.rotation.z = damp(
      motionRef.current.rotation.z,
      twistSign * 0.009 * amount + ambient,
      4,
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

function Ripples({ state, motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.children.forEach((mesh, i) => {
      const phase = (clock.elapsedTime * 0.3 * motion + i / 3) % 1;
      mesh.scale.setScalar(1 + phase * 0.65);
      mesh.material.opacity =
        (1 - phase) * (state === "listening" ? 0.32 : 0.1);
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

export default function SenModel({
  state = "idle",
  energy = 72,
  haloControl = 1,
  coreControl = 1,
  hoverControl = 1,
  reducedMotion = false,
}) {
  const root = useRef(),
    awake = useRef(),
    head = useRef(),
    crystal = useRef(),
    budLight = useRef();
  const bloom = useRef(state === "sleep" ? 0 : energy / 100);
  const cfg = SEN_STATES[state] || SEN_STATES.idle;
  const motion = reducedMotion ? 0 : 1;
  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    bloom.current = damp(
      bloom.current,
      state === "sleep" ? 0 : energy / 100,
      reducedMotion ? 8 : 1.5,
      delta,
    );
    root.current.position.y =
      Math.sin(t * 1.3) * cfg.bob * hoverControl * motion;
    const emergence = THREE.MathUtils.smoothstep(bloom.current, 0.12, 0.72);
    const folded = 1 - emergence;
    awake.current.scale.set(
      0.94 + 0.06 * emergence,
      0.98 + 0.02 * emergence,
      0.94 + 0.06 * emergence,
    );
    awake.current.position.y = -0.34 * folded;
    awake.current.rotation.x = damp(
      awake.current.rotation.x,
      0.075 * folded,
      3,
      delta,
    );
    head.current.position.y = damp(
      head.current.position.y,
      -0.13 * folded,
      3,
      delta,
    );
    head.current.rotation.z = damp(
      head.current.rotation.z,
      cfg.tilt + Math.sin(t * 0.65) * 0.016 * motion,
      3,
      delta,
    );
    head.current.rotation.y = damp(
      head.current.rotation.y,
      pointer.x * 0.12 * motion,
      3,
      delta,
    );
    head.current.rotation.x = damp(
      head.current.rotation.x,
      0.14 * folded - pointer.y * 0.045 * motion * emergence,
      3,
      delta,
    );
    const sleepingPulse =
      state === "sleep"
        ? 0.1 + (Math.sin(t * 1.05) + 1) * 0.018 * motion
        : 0.18 + 0.82 * bloom.current;
    crystal.current.material.emissiveIntensity = damp(
      crystal.current.material.emissiveIntensity,
      (state === "sleep" ? 0.13 : cfg.glow) * coreControl * sleepingPulse,
      3,
      delta,
    );
    budLight.current.intensity = damp(
      budLight.current.intensity,
      (state === "sleep" ? 0.18 : 0.28 + bloom.current * 0.5) * coreControl,
      3,
      delta,
    );
    crystal.current.rotation.y += delta * 0.25 * motion;
  });
  return (
    <group ref={root}>
      <pointLight
        ref={budLight}
        position={[0, -0.12, 0.08]}
        color="#f2a0b5"
        intensity={0.3}
        distance={3.1}
        decay={2}
      />
      <group ref={awake}>
        <group ref={head}>
          <Petal
            position={[0, 0.3, -0.31]}
            scale={[1.1, 1.54, 0.9]}
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
          <Eyes state={state} motion={motion} bloom={bloom} />
          {[-1, 1].map((side) => (
            <Petal
              key={side}
              position={[0, 0.29, 0.3]}
              rotation={[0.05, side * -0.2, -side * 1.38]}
              scale={[0.42, 0.72, 0.35]}
              color={PINK}
              ornament
            />
          ))}
        </group>

        {/* Petal body: no mechanical joints, hands or mouth. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <Petal
              position={[0, -0.85, 0.03]}
              rotation={[0, side * 0.15, -side * 0.32]}
              scale={[0.78, 0.93, 0.65]}
              color={PINK}
              ornament
            />
            <Petal
              position={[side * 0.49, -0.11, 0.06]}
              rotation={[0.18, side * 0.25, -side * 2.52]}
              scale={[0.6, 0.82, 0.8]}
              color={PINK}
              ornament
            />
            <Petal
              position={[side * 0.5, -0.18, -0.035]}
              rotation={[0.15, side * 0.25, -side * 2.4]}
              scale={[0.58, 0.86, 0.6]}
              color={JADE}
              leaf
            />
            <Petal
              position={[0, 0.14, 0.07]}
              rotation={[0.25, 0, -side * 1.16]}
              scale={[0.36, 0.62, 0.5]}
              color={JADE}
              leaf
            />
          </group>
        ))}
        <mesh
          ref={crystal}
          position={[0, -0.1, 0.31]}
          scale={[0.2, 0.29, 0.17]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#f6b6c2"
            emissive="#ec96a7"
            emissiveIntensity={0.45}
            metalness={0.15}
            roughness={0.15}
            clearcoat={1}
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
          color={GOLD}
          lineWidth={1.3}
        />
        <FloatingPetals
          state={state}
          speed={haloControl}
          motion={motion}
          bloom={bloom}
        />
        {state === "working" &&
          [-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.91, -0.28, 0.6]}
              rotation={[0, side * -0.35, side * 0.06]}
            >
              <mesh>
                <planeGeometry args={[0.4, 0.3]} />
                <meshBasicMaterial
                  color={JADE}
                  transparent
                  opacity={0.15}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {[0, 1, 2].map((i) => (
                <Line
                  key={i}
                  points={[
                    [-0.13, 0.07 - i * 0.07, 0.005],
                    [0.06 + i * 0.025, 0.07 - i * 0.07, 0.005],
                  ]}
                  color={JADE}
                  lineWidth={1.5}
                />
              ))}
            </group>
          ))}
        {state === "success" &&
          Array.from({ length: 7 }, (_, i) => (
            <Petal
              key={i}
              position={[Math.sin(i * 2.4) * 1.1, 0.3 + i * 0.2, -0.5]}
              rotation={[0.3, 0, i * 1.3]}
              scale={[0.13, 0.2, 0.15]}
              color={PINK}
            />
          ))}
      </group>
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
            color={JADE}
            leaf
          />
        </group>
      ))}
      <Ripples state={state} motion={motion} />
    </group>
  );
}
