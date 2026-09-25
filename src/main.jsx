import React, { Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, Stars } from '@react-three/drei'
import VeyraModel from './VeyraModel'
import './styles.css'

const STATES = ['idle','thinking','listening','working','success','sleep']

function Scene({ state, halo, core, hover }) {
  return <>
    <color attach="background" args={['#02050d']} />
    <fog attach="fog" args={['#030611',8,18]} />
    <ambientLight intensity={state === 'sleep' ? .42 : .72} />
    <directionalLight position={[4,6,5]} intensity={state === 'sleep' ? 2.0 : 3.4} color="#dfe7ff" />
    <pointLight position={[-4,2,2]} intensity={state === 'sleep' ? 15 : 30} distance={10} color="#8b5cff" />
    <pointLight position={[4,1,2]} intensity={state === 'sleep' ? 12 : 26} distance={10} color="#00e5ff" />
    <Stars radius={50} depth={20} count={1900} factor={2.2} saturation={.3} fade speed={state === 'sleep' ? .08 : .22} />
    <Suspense fallback={null}>
      <VeyraModel state={state} haloControl={halo} coreControl={core} hoverControl={hover} />
      <Environment preset="city" />
    </Suspense>
    <ContactShadows position={[0,-1.68,0]} opacity={.5} scale={7} blur={2.8} far={4} />
    <OrbitControls makeDefault target={[0,.42,0]} minDistance={3.1} maxDistance={7.5} enablePan={false} dampingFactor={.06} />
  </>
}

function App(){
  const [state,setState]=useState('idle')
  const [halo,setHalo]=useState(1)
  const [core,setCore]=useState(1)
  const [hover,setHover]=useState(1)

  return <main className="app-shell">
    <header className="topbar glass">
      <div className="brand">
        <div className="brand-mark">✦</div>
        <strong>VEYRA</strong>
        <span>PLAYGROUND · MODEL v0.3</span>
      </div>
      <div className="window-actions">
        <button>⌁</button><button>—</button><button>□</button><button>×</button>
      </div>
    </header>

    <section className="viewport">
      <Canvas
        shadows
        camera={{position:[0,.9,4.75],fov:38}}
        gl={{antialias:true}}
        dpr={[1,1.8]}
      >
        <Scene state={state} halo={halo} core={core} hover={hover}/>
      </Canvas>

      <aside className="state-panel glass">
        {STATES.map(s=>(
          <button
            key={s}
            className={`state-btn ${state===s?'active':''}`}
            onClick={()=>setState(s)}
          >
            <span className="state-orb"/>
            <span>{s[0].toUpperCase()+s.slice(1)}</span>
          </button>
        ))}
      </aside>

      <aside className="control-panel glass">
        <div className="eyebrow">LIVE CHARACTER CONTROLS</div>
        <label>
          <span>Halo speed <b>{halo.toFixed(2)}</b></span>
          <input type="range" min="0" max="2" step=".01" value={halo} onChange={e=>setHalo(+e.target.value)}/>
        </label>
        <label>
          <span>Core energy <b>{core.toFixed(2)}</b></span>
          <input type="range" min="0" max="2" step=".01" value={core} onChange={e=>setCore(+e.target.value)}/>
        </label>
        <label>
          <span>Hover <b>{hover.toFixed(2)}</b></span>
          <input type="range" min="0" max="2" step=".01" value={hover} onChange={e=>setHover(+e.target.value)}/>
        </label>
        <div className="control-note">
          v0.3 adds pointer gaze, state-based arm gestures, listening waves,
          focused work holograms and a low-energy sleep behavior.
        </div>
      </aside>

      <div className="hero-copy">
        <span className="status-dot"/>
        <span>VEYRA ONLINE</span>
        <strong>{state.toUpperCase()}</strong>
      </div>

      <footer className="bottombar glass">
        <div><span className="online-dot"/>Veyra Online</div>
        <div>Character v0.3</div>
        <div className="live-pill">BEHAVIOR MODEL</div>
        <div className="spacer"/>
        <div>Move pointer · Veyra follows</div>
        <div>Drag to orbit</div>
      </footer>
    </section>
  </main>
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App/></React.StrictMode>
)
