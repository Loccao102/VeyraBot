import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const CYAN = '#20e6ff'
const VIOLET = '#8c5cff'
const WHITE = '#eef2ff'

function shardMaterial(color, intensity = 1.5) {
  return {
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: .3,
    roughness: .16,
    toneMapped: false,
  }
}

export default function VeyraSignature({ state = 'idle' }) {
  const crest = useRef()
  const glyph = useRef()
  const satellite = useRef()

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime

    if (crest.current) {
      const speed =
        state === 'working' ? 1.35 :
        state === 'thinking' ? .85 :
        state === 'sleep' ? .08 :
        .45

      crest.current.rotation.y += delta * speed * .14
      crest.current.rotation.z = -.28 + Math.sin(t * .8) * .035
    }

    if (glyph.current) {
      const speed =
        state === 'success' ? 2.2 :
        state === 'working' ? 1.5 :
        state === 'sleep' ? .18 :
        .7

      glyph.current.rotation.z += delta * speed
      const pulse = state === 'sleep' ? .96 : 1 + Math.sin(t * 2.6) * .045
      glyph.current.scale.setScalar(pulse)
    }

    if (satellite.current) {
      const orbit =
        state === 'working' ? t * 1.15 :
        state === 'thinking' ? t * .72 :
        t * .38

      satellite.current.position.x = 1.04 + Math.cos(orbit) * .12
      satellite.current.position.z = 1.18 + Math.sin(orbit) * .12
      satellite.current.position.y = .12 + Math.sin(t * 1.4) * .04
    }
  })

  return (
    <>
      <group
        ref={crest}
        position={[.56,.16,1.86]}
        rotation={[.08,.18,-.28]}
      >
        <mesh position={[.18,0,.14]} rotation={[0,0,-.18]} scale={[.08,.045,.34]}>
          <octahedronGeometry args={[1,0]} />
          <meshStandardMaterial {...shardMaterial(WHITE,.25)} />
        </mesh>

        <mesh position={[.38,.03,.04]} rotation={[0,0,-.38]} scale={[.07,.038,.27]}>
          <octahedronGeometry args={[1,0]} />
          <meshStandardMaterial {...shardMaterial(VIOLET,1.7)} />
        </mesh>

        <mesh position={[.51,.06,-.12]} rotation={[0,0,-.58]} scale={[.05,.03,.20]}>
          <octahedronGeometry args={[1,0]} />
          <meshStandardMaterial {...shardMaterial(CYAN,1.8)} />
        </mesh>

        <mesh position={[.29,.08,.00]} rotation={[Math.PI/2,0,.15]}>
          <torusGeometry args={[.34,.014,8,44,Math.PI*1.15]} />
          <meshBasicMaterial
            color={VIOLET}
            transparent
            opacity={state === 'sleep' ? .12 : .48}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group
        ref={glyph}
        position={[0,-.705,.43]}
        rotation={[Math.PI/2,0,0]}
      >
        <mesh scale={[.065,.065,.065]}>
          <octahedronGeometry args={[1,0]} />
          <meshStandardMaterial {...shardMaterial(CYAN,state === 'sleep' ? .5 : 2.4)} />
        </mesh>

        {[0,1,2,3].map(i => {
          const angle = i * Math.PI / 2
          return (
            <mesh
              key={i}
              position={[Math.cos(angle)*.12,Math.sin(angle)*.12,0]}
              scale={[.018,.018,.018]}
            >
              <sphereGeometry args={[1,12,8]} />
              <meshBasicMaterial
                color={i%2 ? VIOLET : CYAN}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>

      <group ref={satellite} position={[1.04,.12,1.18]}>
        <mesh scale={[.085,.065,.10]}>
          <octahedronGeometry args={[1,1]} />
          <meshStandardMaterial {...shardMaterial(VIOLET,state === 'sleep' ? .3 : 1.9)} />
        </mesh>
        <mesh rotation={[Math.PI/2,0,0]}>
          <torusGeometry args={[.13,.011,8,34]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={state === 'sleep' ? .12 : .55}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  )
}
