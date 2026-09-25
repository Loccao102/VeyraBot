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


function IdleMotes({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.children.forEach((child, i) => {
      const t = clock.elapsedTime * 0.28 * motion + i * 0.9;
      child.position.y = 0.15 + (i % 3) * 0.48 + Math.sin(t) * 0.08;
      child.position.x =
        (i % 2 ? 1 : -1) * (0.85 + (i % 3) * 0.16) + Math.cos(t * 0.7) * 0.05;
      child.material.opacity = 0.14 + (Math.sin(t * 1.3) + 1) * 0.05;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 0.2, -0.2 - (i % 2) * 0.2]}>
          <sphereGeometry args={[0.026 + (i % 2) * 0.008, 10, 8]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? GOLD : "#f4b8c7"}
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ThinkingEffect({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.48 * motion;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.04 * motion;
    ref.current.children.forEach((child, i) => {
      child.position.y = Math.sin(clock.elapsedTime * 1.15 + i) * 0.07;
      child.rotation.y += 0.012 * motion;
      child.rotation.z += 0.018 * motion;
      child.material.opacity =
        0.45 + (Math.sin(clock.elapsedTime * 1.8 + i) + 1) * 0.16;
    });
  });

  return (
    <group ref={ref} position={[0, 1.0, 0]}>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * TAU;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * (0.92 + (i % 2) * 0.12),
              0,
              Math.cos(angle) * 0.58,
            ]}
            rotation={[0.2, angle, Math.PI / 4]}
          >
            <octahedronGeometry args={[0.055 + (i % 3) * 0.012, 0]} />
            <meshBasicMaterial
              color={i % 2 ? "#f0a9bd" : GOLD}
              transparent
              opacity={0.62}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ListeningEffect({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.children.forEach((sideGroup, sideIndex) => {
      sideGroup.children.forEach((mesh, i) => {
        const phase = (clock.elapsedTime * 0.82 * motion + i * 0.24) % 1;
        mesh.scale.setScalar(0.7 + phase * 0.72);
        mesh.material.opacity = (1 - phase) * (0.34 - i * 0.055);
      });
      sideGroup.position.y =
        0.78 + Math.sin(clock.elapsedTime * 1.3 + sideIndex) * 0.025 * motion;
    });
  });

  return (
    <group ref={ref}>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.82, 0.78, 0.12]}
          rotation={[0, side * Math.PI / 2, 0]}
        >
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <ringGeometry args={[0.28 + i * 0.09, 0.292 + i * 0.09, 64]} />
              <meshBasicMaterial
                color={i === 0 ? "#8da798" : "#d9b08a"}
                transparent
                opacity={0.28}
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function WorkingEffect({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.28 * motion;
    ref.current.children.forEach((panel, i) => {
      const t = clock.elapsedTime * 1.15 + i * 1.4;
      panel.position.y = -0.08 + Math.sin(t) * 0.09 * motion;
      panel.rotation.z = Math.sin(t * 0.8) * 0.08 * motion;
      const mesh = panel.children[0];
      if (mesh?.material) {
        mesh.material.opacity = 0.13 + (Math.sin(t) + 1) * 0.035;
      }
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 4 }, (_, i) => {
        const angle = (i / 4) * TAU + 0.45;
        return (
          <group
            key={i}
            position={[
              Math.sin(angle) * 1.22,
              -0.08,
              Math.cos(angle) * 0.72,
            ]}
            rotation={[0, -angle, i % 2 ? -0.05 : 0.05]}
          >
            <mesh>
              <planeGeometry args={[0.34, 0.24]} />
              <meshBasicMaterial
                color={JADE}
                transparent
                opacity={0.15}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {[0, 1, 2].map((lineIndex) => (
              <Line
                key={lineIndex}
                points={[
                  [-0.11, 0.055 - lineIndex * 0.055, 0.006],
                  [
                    0.04 + lineIndex * 0.03,
                    0.055 - lineIndex * 0.055,
                    0.006,
                  ],
                ]}
                color={lineIndex === 0 ? "#d6b47f" : JADE}
                lineWidth={1.25}
                transparent
                opacity={0.75}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function SuccessEffect({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const speed = motion ? 0.34 : 0.08;
    ref.current.children.forEach((child, i) => {
      const phase = (clock.elapsedTime * speed + i / 14) % 1;
      const angle = i * 2.17 + phase * 0.95;
      const radius = 0.52 + (i % 4) * 0.16 + phase * 0.16;
      child.position.set(
        Math.sin(angle) * radius,
        -0.62 + phase * 3.15,
        Math.cos(angle) * 0.42 - 0.16,
      );
      child.rotation.z = angle + phase * 2.2;
      child.rotation.x = 0.18 + phase * 0.7;
      const scale = Math.sin(Math.PI * phase) * (i % 3 === 0 ? 1.12 : 0.9);
      child.scale.setScalar(Math.max(0.06, scale));
      child.children.forEach((part) => {
        if (part.material) {
          part.material.opacity = Math.sin(Math.PI * phase) * 0.88;
        }
      });
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 14 }, (_, i) => (
        <group key={i}>
          {i % 3 === 0 ? (
            <Petal
              scale={[0.11, 0.18, 0.12]}
              color={i % 2 ? "#f1a9bd" : "#ffd8df"}
            />
          ) : (
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.045 + (i % 2) * 0.018, 0]} />
              <meshBasicMaterial
                color={i % 2 ? "#f0b5c5" : "#d6aa72"}
                transparent
                opacity={0.8}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function SleepEffect({ motion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const speed = motion ? 0.055 : 0.012;
    ref.current.children.forEach((child, i) => {
      const phase = (clock.elapsedTime * speed + i / 9) % 1;
      const angle = i * 1.83 + phase * 0.7;
      child.position.set(
        Math.sin(angle) * (0.62 + (i % 3) * 0.18),
        1.65 - phase * 2.15,
        Math.cos(angle) * 0.44 - 0.12,
      );
      const twinkle = 0.4 + 0.6 * Math.sin(Math.PI * phase);
      child.scale.setScalar(0.72 + twinkle * 0.35);
      child.material.opacity = 0.08 + twinkle * 0.22;
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.028 + (i % 3) * 0.008, 10, 8]} />
          <meshBasicMaterial
            color={i % 2 ? "#d6c592" : "#9db39b"}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function DiscoveryEffect({ reaction, reducedMotion }) {
  const ref = useRef();
  const type = reaction?.type ?? "none";
  const active = type.startsWith("secret_");

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

function StateEffects({ state, motion }) {
  if (state === "thinking") return <ThinkingEffect motion={motion} />;
  if (state === "listening") return <ListeningEffect motion={motion} />;
  if (state === "working") return <WorkingEffect motion={motion} />;
  if (state === "success") return <SuccessEffect motion={motion} />;
  if (state === "sleep") return <SleepEffect motion={motion} />;
  return <IdleMotes motion={motion} />;
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
}) {
  const root = useRef(),
    awake = useRef(),
    head = useRef(),
    crystal = useRef(),
    budLight = useRef();
  const sidePetals = useRef({});
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
  const motion = reducedMotion ? 0 : 1;
  useFrame(({ clock, pointer }, delta) => {
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
    const autonomous = state === "idle" ? motion : 0;
    const idleLook =
      (Math.sin(t * 0.17) * 0.075 +
        Math.sin(t * 0.071 + 1.8) * 0.045) *
      autonomous *
      presenceCalm *
      (headHover ? 0.18 : 1);
    const idleTilt =
      Math.sin(t * 0.11 + 0.6) * 0.026 * autonomous * presenceCalm;
    const idleBreath =
      1 + Math.sin(t * 0.82) * 0.0045 * autonomous * presenceCalm;

    bloom.current = damp(
      bloom.current,
      state === "sleep" ? 0 : energy / 100,
      reducedMotion ? 8 : 1.5,
      delta,
    );
    root.current.position.y =
      Math.sin(t * (1.05 + presenceCalm * 0.25)) *
      cfg.bob *
      hoverControl *
      motion *
      (0.72 + presenceCalm * 0.28);
    const emergence = THREE.MathUtils.smoothstep(bloom.current, 0.2, 0.72);
    const folded = 1 - emergence;
    awake.current.scale.set(
      (0.93 + 0.07 * emergence) * idleBreath,
      (0.975 + 0.025 * emergence) * idleBreath,
      (0.93 + 0.07 * emergence) * idleBreath,
    );
    awake.current.position.y =
      -0.43 * folded +
      Math.sin(t * 0.31 + 1.2) * 0.012 * autonomous * presenceCalm;
    awake.current.rotation.x = damp(
      awake.current.rotation.x,
      0.075 * folded,
      3,
      delta,
    );
    awake.current.rotation.y = damp(
      awake.current.rotation.y,
      idleLook * 0.36,
      1.7,
      delta,
    );
    head.current.position.y = damp(
      head.current.position.y,
      -0.13 * folded +
        Math.sin(t * 0.27) * 0.014 * autonomous * presenceCalm -
        headPat * 0.045 -
        shy * 0.045 +
        quietGaze * 0.02,
      headHover ? 4.2 : 2,
      delta,
    );
    head.current.rotation.z = damp(
      head.current.rotation.z,
      cfg.tilt +
        Math.sin(t * 0.65) * 0.016 * motion +
        idleTilt +
        Math.sin(reactionAge * Math.PI * 3) * headPat * 0.065 +
        shy * 0.13 +
        quietGaze * 0.045,
      headHover ? 4.5 : 2.2,
      delta,
    );
    head.current.rotation.y = damp(
      head.current.rotation.y,
      pointer.x *
        (headHover ? 0.21 : 0.12) *
        motion *
        (1 - quietGaze * 0.92) +
        idleLook * (1 - quietGaze) +
        shy * 0.18,
      headHover ? 5 : 2.4,
      delta,
    );
    head.current.rotation.x = damp(
      head.current.rotation.x,
      0.14 * folded -
        pointer.y * (headHover ? 0.072 : 0.045) * motion * emergence +
        Math.sin(t * 0.13 + 2.2) * 0.018 * autonomous * presenceCalm +
        headPat * 0.075 +
        shy * 0.055 -
        quietGaze * 0.028,
      headHover ? 5 : 2.4,
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

      petalGroup.rotation.z = damp(
        petalGroup.rotation.z,
        side * petalHover * 0.035 + flutter,
        8,
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
        ? 0.12 + (Math.sin(t * 1.05) + 1) * 0.035 * motion
        : 0.22 + 0.78 * bloom.current + wakeFlash * 0.55;
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
      (state === "sleep" ? 0.18 : cfg.glow) * coreControl * sleepingPulse +
        coreInteractionGlow,
      coreHeld ? 8 : 4,
      delta,
    );
    budLight.current.intensity = damp(
      budLight.current.intensity,
      (state === "sleep"
        ? 0.22 + Math.sin(t * 1.05) * 0.035 * motion
        : 0.32 + bloom.current * 0.52 + wakeFlash * 0.72) *
        coreControl +
        coreInteractionGlow * 0.62,
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
              color={PINK}
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

      </group>
      <StateEffects state={state} motion={motion} />
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
            color={JADE}
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
