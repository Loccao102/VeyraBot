import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import VeyraSignature from './VeyraSignature'

const STATE = {
  idle:      { bob: .08, sway: .035, halo: .55, core: 1.0, orbit: .25, ear: .04, eye: 1.0 },
  thinking:  { bob: .045, sway: .085, halo: 1.35, core: 1.35, orbit: 1.2, ear: .10, eye: .86 },
  listening: { bob: .035, sway: .025, halo: .90, core: 1.10, orbit: .45, ear: .18, eye: 1.15 },
  working:   { bob: .025, sway: .015, halo: 2.25, core: 1.85, orbit: 2.15, ear: .07, eye: .78 },
  success:   { bob: .12, sway: .13, halo: 1.85, core: 2.25, orbit: 1.65, ear: .15, eye: 1.22 },
  sleep:     { bob: .018, sway: .010, halo: .12, core: .30, orbit: .08, ear: .01, eye: .10 },
}

function mat(color, emissive = null, intensity = 0, metalness = .25, roughness = .22) {
  return {
    color,
    metalness,
    roughness,
    ...(emissive ? { emissive, emissiveIntensity: intensity, toneMapped: false } : {}),
  }
}

const WHITE = '#eef2ff'
const BLACK = '#030713'
const CYAN = '#20e6ff'
const VIOLET = '#8c5cff'
const METAL = '#101827'

function Ring({ radius = 1, tube = .03, color = VIOLET, rotation = [0,0,0], scale = 1, opacity = 1 }) {
  return (
    <mesh rotation={rotation} scale={scale}>
      <torusGeometry args={[radius, tube, 16, 96]} />
      <meshStandardMaterial {...mat(color, color, 2.4, .15, .12)} transparent opacity={opacity} />
    </mesh>
  )
}

function Limb({ side = 1, state = 'idle' }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime

    const pose =
      state === 'success' ? { x: -.22, z: -.82 * side } :
      state === 'working' ? { x: -.52, z: -.08 * side } :
      state === 'listening' ? { x: -.18, z: -.28 * side } :
      state === 'thinking'
        ? (side < 0 ? { x: -.30, z: .42 } : { x: -.06, z: -.08 })
        : state === 'sleep' ? { x: .20, z: .18 * side }
        : { x: 0, z: 0 }

    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, pose.x, .07)
    ref.current.rotation.z = THREE.MathUtils.lerp(
      ref.current.rotation.z,
      pose.z + Math.sin(t * 1.4 + side) * (state === 'idle' ? .025 : .008),
      .07
    )
  })

  return (
    <group ref={ref} position={[.76 * side, .20, .10]}>
      <mesh position={[.10 * side, 0, .10]} rotation={[0,0,-.52 * side]}>
        <capsuleGeometry args={[.105, .46, 8, 16]} />
        <meshStandardMaterial {...mat(METAL, null, 0, .8, .2)} />
      </mesh>

      <mesh position={[.24 * side, -.34, -.02]} rotation={[0,0,-.28 * side]}>
        <capsuleGeometry args={[.095, .38, 8, 16]} />
        <meshStandardMaterial {...mat(METAL, null, 0, .8, .2)} />
      </mesh>

      <mesh position={[.04 * side,.05,.24]} scale={[.25,.20,.28]}>
        <sphereGeometry args={[1,24,16]} />
        <meshStandardMaterial {...mat(WHITE)} />
      </mesh>

      <mesh position={[.35 * side,-.54,-.05]} scale={[.17,.12,.15]}>
        <sphereGeometry args={[1,20,14]} />
        <meshStandardMaterial {...mat(BLACK, null, 0, .7, .16)} />
      </mesh>

      {[0,1,2].map((i) => (
        <mesh
          key={i}
          position={[(.29 + i*.055) * side, -.64 - i*.025, -.10]}
          rotation={[.15,0,-.16*side]}
        >
          <capsuleGeometry args={[.023,.15,5,10]} />
          <meshStandardMaterial {...mat(METAL, null, 0, .9, .18)} />
        </mesh>
      ))}
    </group>
  )
}

function EarFin({ side = 1, pulse = 0 }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.z = (-.23 - Math.sin(t*2.1)*pulse) * side
  })

  return (
    <group ref={ref} position={[.82*side,.12,1.42]} rotation={[0,0,-.23*side]}>
      <mesh scale={[.18,.11,.64]} rotation={[0,0,.10*side]}>
        <coneGeometry args={[1,2,4]} />
        <meshStandardMaterial {...mat(WHITE)} />
      </mesh>

      <mesh position={[0,-.015,0]} scale={[.075,.12,.43]}>
        <coneGeometry args={[1,2,4]} />
        <meshStandardMaterial {...mat(VIOLET, VIOLET, 2.3,.1,.12)} />
      </mesh>

      <mesh position={[-.09*side,-.02,-.16]} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[.14,.034,12,40]} />
        <meshStandardMaterial {...mat(CYAN,CYAN,2.5,.15,.1)} />
      </mesh>
    </group>
  )
}

function Face({ state }) {
  const left = useRef()
  const right = useRef()
  const mouth = useRef()

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime
    const blink = state === 'sleep' ? 1 : (Math.sin(t*.72) > .992 ? .12 : 1)
    const cfg = STATE[state]
    const y = state === 'sleep' ? .10 : cfg.eye * blink
    const eyeShift = state === 'sleep' ? 0 : pointer.x * .025

    if (left.current) {
      left.current.scale.y = THREE.MathUtils.lerp(left.current.scale.y, y, .25)
      left.current.position.x = THREE.MathUtils.lerp(left.current.position.x, -.23 + eyeShift, .12)
    }
    if (right.current) {
      right.current.scale.y = THREE.MathUtils.lerp(right.current.scale.y, y, .25)
      right.current.position.x = THREE.MathUtils.lerp(right.current.position.x, .23 + eyeShift, .12)
    }
    if (mouth.current) {
      const sx =
        state === 'success' ? 1.35 :
        state === 'working' ? .75 :
        state === 'sleep' ? .55 :
        1
      mouth.current.scale.x = THREE.MathUtils.lerp(mouth.current.scale.x, sx, .12)
      mouth.current.scale.y = THREE.MathUtils.lerp(
        mouth.current.scale.y,
        state === 'listening' ? 1 + Math.sin(t*5)*.15 : 1,
        .18
      )
    }
  })

  return (
    <group position={[0,-.704,1.33]}>
      <mesh ref={left} position={[-.23,0,.10]} scale={[.09,.15,.06]}>
        <sphereGeometry args={[1,20,16]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>

      <mesh ref={right} position={[.23,0,.10]} scale={[.09,.15,.06]}>
        <sphereGeometry args={[1,20,16]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>

      <group ref={mouth} position={[0,-.005,-.12]}>
        {[-.11,-.055,0,.055,.11].map((x,i) => (
          <mesh
            key={x}
            position={[x,0,-.006 + Math.abs(i-2)*.012]}
            scale={[.022,.016,.014]}
          >
            <sphereGeometry args={[1,12,8]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ListeningWaves() {
  const refs = [useRef(), useRef(), useRef()]

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.forEach((r,i) => {
      if (!r.current) return
      const phase = (t*1.35 + i*.55) % 1.65
      const s = .72 + phase*.50
      r.current.scale.setScalar(s)
      r.current.material.opacity = Math.max(0, .55 - phase*.30)
    })
  })

  return (
    <group position={[0,.02,1.36]} rotation={[Math.PI/2,0,0]}>
      {refs.map((ref,i)=>(
        <mesh ref={ref} key={i}>
          <torusGeometry args={[.92,.014,10,80]} />
          <meshBasicMaterial color={i%2 ? VIOLET : CYAN} transparent opacity={.45} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function WorkHolograms() {
  const group = useRef()

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.y = .72 + Math.sin(t*1.5)*.025
    group.current.rotation.y = Math.sin(t*.55)*.05
  })

  return (
    <group ref={group} position={[0,-.56,.72]}>
      {[-1,1].map((side)=>(
        <group key={side} position={[.82*side,0,.02]} rotation={[0,.24*side,0]}>
          <mesh scale={[.48,.02,.30]}>
            <boxGeometry args={[1,1,1]} />
            <meshStandardMaterial color="#0c1730" emissive={side<0?VIOLET:CYAN} emissiveIntensity={.75} transparent opacity={.30} />
          </mesh>
          {[0,1,2].map(i=>(
            <mesh key={i} position={[-.16 + i*.16,-.027,.02]} scale={[.045,.012,.16 + i*.025]}>
              <boxGeometry args={[1,1,1]} />
              <meshBasicMaterial color={i%2?CYAN:VIOLET} transparent opacity={.75} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function SleepMarks() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = 1.95 + (t % 1.4) * .12
    ref.current.material.opacity = .55 + Math.sin(t*2)*.18
  })

  return (
    <mesh ref={ref} position={[.70,-.22,1.95]} rotation={[0,0,-.45]}>
      <torusGeometry args={[.10,.018,8,26,Math.PI*1.4]} />
      <meshBasicMaterial color={VIOLET} transparent opacity={.65} toneMapped={false}/>
    </mesh>
  )
}

export default function VeyraModel({
  state='idle',
  haloControl=1,
  coreControl=1,
  hoverControl=1,
}) {
  const root = useRef()
  const head = useRef()
  const halo = useRef()
  const halo2 = useRef()
  const core = useRef()
  const orbitA = useRef()
  const orbitB = useRef()
  const lowerRing = useRef()

  const cfg = STATE[state] || STATE.idle

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime
    if (!root.current) return

    root.current.position.y = Math.sin(t*1.45) * cfg.bob * hoverControl
    root.current.rotation.z = Math.sin(t*.75) * cfg.sway
    root.current.rotation.y = Math.sin(t*.33) * .07

    if (head.current) {
      const stateTilt =
        state === 'thinking' ? -.12 :
        state === 'listening' ? .07 :
        state === 'sleep' ? -.08 :
        0

      const gazeX = state === 'sleep' ? 0 : -pointer.y * .10
      const gazeY = state === 'sleep' ? 0 : pointer.x * .16

      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, gazeX, .055)
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, gazeY, .055)
      head.current.rotation.z = THREE.MathUtils.lerp(
        head.current.rotation.z,
        stateTilt + Math.sin(t*.9)*.015,
        .04
      )
    }

    if (halo.current) halo.current.rotation.z += delta * cfg.halo * haloControl
    if (halo2.current) halo2.current.rotation.z -= delta * cfg.halo * .68 * haloControl
    if (orbitA.current) orbitA.current.rotation.z += delta * cfg.orbit
    if (orbitB.current) orbitB.current.rotation.z -= delta * cfg.orbit * .65
    if (lowerRing.current) lowerRing.current.rotation.z += delta * (.8 + cfg.halo*.45)

    if (core.current) {
      const s =
        1 +
        Math.sin(t * (1.8 + cfg.core)) *
        (.07 + cfg.core*.018) *
        coreControl

      core.current.scale.setScalar(s)
      core.current.material.emissiveIntensity =
        .65 +
        cfg.core * coreControl +
        Math.sin(t*3.2)*.22
    }
  })

  const sparks = useMemo(
    () =>
      Array.from({length: 14}, (_,i) => ({
        a: i / 14 * Math.PI * 2,
        r: .75 + (i%4)*.12,
        y: .65 + ((i*7)%5)*.15,
        s: .012 + (i%3)*.009,
      })),
    []
  )

  return (
    <group ref={root} scale={1.12} position={[0,-.2,0]}>
      <group ref={head}>
        <mesh position={[0,0,1.38]} scale={[.83,.66,.70]}>
          <sphereGeometry args={[1,48,32]} />
          <meshStandardMaterial {...mat(WHITE,null,0,.18,.19)} />
        </mesh>

        <mesh position={[0,-.50,1.36]} scale={[.69,.34,.50]}>
          <sphereGeometry args={[1,48,32]} />
          <meshStandardMaterial {...mat(BLACK,null,0,.42,.055)} />
        </mesh>

        <Face state={state} />
        <EarFin side={-1} pulse={cfg.ear} />
        <EarFin side={1} pulse={cfg.ear} />

        <group ref={halo} position={[0,.05,2.20]} rotation={[.10,0,0]}>
          <Ring radius={.70} tube={.035} color={VIOLET} opacity={state==='sleep'?.38:1} />
        </group>

        <group ref={halo2} position={[0,.05,2.20]} rotation={[.10,0,.32]}>
          <Ring radius={.52} tube={.018} color={CYAN} opacity={state==='sleep'?.22:.9} />
        </group>
      </group>

      <mesh position={[0,0,.80]}>
        <cylinderGeometry args={[.16,.19,.24,32]} />
        <meshStandardMaterial {...mat(METAL,null,0,.9,.2)} />
      </mesh>

      <mesh position={[0,0,.30]} scale={[.57,.46,.68]}>
        <sphereGeometry args={[1,40,28]} />
        <meshStandardMaterial {...mat(WHITE,null,0,.2,.21)} />
      </mesh>

      <mesh position={[0,-.26,.31]} scale={[.42,.27,.49]}>
        <sphereGeometry args={[1,36,24]} />
        <meshStandardMaterial {...mat(BLACK,null,0,.4,.08)} />
      </mesh>

      <group position={[0,-.49,.38]} rotation={[Math.PI/2,0,0]}>
        <Ring radius={.25} tube={.038} color={VIOLET} opacity={state==='sleep'?.35:1} />
        <Ring radius={.17} tube={.022} color={CYAN} opacity={state==='sleep'?.28:1} />
      </group>

      <mesh ref={core} position={[0,-.56,.38]}>
        <sphereGeometry args={[.12,32,20]} />
        <meshStandardMaterial {...mat(CYAN,CYAN,state==='sleep'?.8:3,.08,.08)} />
      </mesh>

      <Limb side={-1} state={state} />
      <Limb side={1} state={state} />

      {[-1,1].map(side => (
        <group key={side} position={[.92*side,.18,.85]}>
          <mesh scale={[.16,.12,.20]}>
            <sphereGeometry args={[1,24,18]} />
            <meshStandardMaterial {...mat(WHITE)} />
          </mesh>

          <mesh position={[0,-.10,0]} rotation={[Math.PI/2,0,0]}>
            <torusGeometry args={[.10,.024,10,32]} />
            <meshStandardMaterial {...mat(CYAN,CYAN,state==='sleep'?.5:2.2,.1,.1)} />
          </mesh>
        </group>
      ))}

      <mesh position={[0,.02,-.25]} scale={[.40,.32,.28]}>
        <sphereGeometry args={[1,30,20]} />
        <meshStandardMaterial {...mat(WHITE)} />
      </mesh>

      <group ref={lowerRing} position={[0,0,-.57]}>
        <Ring radius={.45} tube={.043} color={VIOLET} opacity={state==='sleep'?.32:1} />
        <Ring radius={.29} tube={.024} color={CYAN} rotation={[.12,0,.2]} opacity={state==='sleep'?.25:1} />
      </group>

      <mesh position={[0,0,-.59]}>
        <sphereGeometry args={[.11,24,16]} />
        <meshStandardMaterial {...mat(CYAN,CYAN,state==='sleep'?.55:2.8,.08,.08)} />
      </mesh>

      <group ref={orbitA} rotation={[.52,.22,.14]} position={[0,0,.42]}>
        <Ring radius={1.05} tube={.012} color={VIOLET} opacity={state==='sleep'?.15:.72} />
      </group>

      <group ref={orbitB} rotation={[-.35,-.28,.12]} position={[0,0,.48]}>
        <Ring radius={.86} tube={.010} color={CYAN} opacity={state==='sleep'?.10:.55} />
      </group>

      <VeyraSignature state={state} />\n\n      {state === 'listening' && <ListeningWaves />}
      {state === 'working' && <WorkHolograms />}
      {state === 'sleep' && <SleepMarks />}

      {state === 'success' && sparks.map((p,i) => (
        <mesh
          key={i}
          position={[
            Math.cos(p.a)*p.r,
            Math.sin(p.a*.7)*.12 + p.y,
            Math.sin(p.a)*p.r*.42
          ]}
          scale={p.s*10}
        >
          <octahedronGeometry args={[.055,0]} />
          <meshBasicMaterial color={i%2 ? CYAN : VIOLET} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
