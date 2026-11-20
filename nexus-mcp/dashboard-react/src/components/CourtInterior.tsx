import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlType } from 'three-stdlib'
import AgentAvatar from './AgentAvatar'
import { ALL_AGENT_IDS, AGENT_NAMES, getAgentGroup } from '../agents/agentPositions'
import { courtroomState } from '../lib/courtroomState'
import { agentIntroduction } from '../agents/agentProfile'
import type { LiveEvent } from '../hooks/useWorkspace'

export type CourtView = 'gallery' | 'bench' | 'counsel' | 'overview'
const views: Record<CourtView, { eye: [number,number,number]; target: [number,number,number] }> = {
  gallery: { eye: [1.5, 5.8, 18], target: [0, 3.5, -16] },
  bench: { eye: [7, 5.5, -10], target: [0, 3.6, -21] },
  counsel: { eye: [12, 7, 1], target: [0, 1.5, -10] },
  overview: { eye: [35, 38, 37], target: [0, 0, -5] },
}
// A small, local grain texture keeps the room independent of external asset servers.
const grainData = new Uint8Array(128 * 512 * 4)
for (let y = 0; y < 512; y++) for (let x = 0; x < 128; x++) {
  const value = 242 + 3 * Math.sin(x * 1.8 + Math.sin(y * .012) * .4) + 2 * Math.sin(x * 3.7 + y * .02)
  const at = (y * 128 + x) * 4
  grainData[at] = grainData[at + 1] = grainData[at + 2] = value; grainData[at + 3] = 255
}
const grain = new THREE.DataTexture(grainData, 128, 512)
grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.needsUpdate = true
grain.magFilter = THREE.LinearFilter; grain.minFilter = THREE.LinearFilter
function CourtNameplate() {
  // Local canvas lettering prevents a remote font download from suspending the whole room.
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ebd5a5'; context.font = '500 62px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'
    context.fillText('DHARMARAKSHA', 512, 64)
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 4.9, -25]}><planeGeometry args={[5.5, .69]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></mesh>
}
function Box({ position, size, color = '#583b28', metal = 0 }: { position:[number,number,number]; size:[number,number,number]; color?:string; metal?:number }) {
  const tint = new THREE.Color(color)
  const wood = !metal && tint.r > tint.g * 1.4 && tint.b < tint.r * .6 && !['#783c31', '#e98f35'].includes(color)
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} map={wood ? grain : null} bumpMap={wood ? grain : null} bumpScale={.004} roughness={metal ? .3 : wood ? .42 : .75} metalness={metal}/></mesh>
}
function Flag({ x }: {x:number}) {
  return <group position={[x,1,-23]}><mesh position={[0,2.5,0]} castShadow><cylinderGeometry args={[.035,.035,5,12]}/><meshStandardMaterial color="#c9a565" metalness={.7} roughness={.25}/></mesh><mesh position={[0,.08,0]}><cylinderGeometry args={[.4,.5,.16,24]}/><meshStandardMaterial color="#ad8c4e" metalness={.6} roughness={.4}/></mesh>{['#e98f35','#f5f1df','#428555'].map((color,i)=><Box key={color} position={[.85,4.5-i*.43,0]} size={[1.7,.43,.035]} color={color}/>)}<mesh position={[.85,4.07,.035]}><torusGeometry args={[.16,.015,6,24]}/><meshBasicMaterial color="#203c79"/></mesh>{Array.from({length:24},(_,i)=><mesh key={i} position={[.85,4.07,.04]} rotation={[0,0,i*Math.PI/12]}><boxGeometry args={[.007,.32,.007]}/><meshBasicMaterial color="#203c79"/></mesh>)}</group>
}
function BalanceEmblem() {
  return <group position={[0,7,-25.3]}><mesh><torusGeometry args={[1.4,.045,8,64]}/><meshStandardMaterial color="#c5a568" metalness={.7} roughness={.25}/></mesh><Box position={[0,0,0]} size={[.07,1.8,.1]} color="#cfb276" metal={.7}/><Box position={[0,.55,0]} size={[1.65,.055,.1]} color="#cfb276" metal={.7}/><Box position={[0,-.9,0]} size={[.8,.07,.12]} color="#cfb276" metal={.7}/>{[-.75,.75].map(x=><group key={x}><Box position={[x,.13,0]} size={[.025,.85,.04]} color="#cfb276" metal={.7}/><mesh position={[x,-.3,0]} rotation={[Math.PI,0,0]}><sphereGeometry args={[.4,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#cfb276" metalness={.7} roughness={.3} side={THREE.DoubleSide}/></mesh></group>)}</group>
}
export default function CourtInterior({ events, view, revision, follow, focusedAgent, hoveredAgent, speakingAgent, onHover, onSelect }: {events:LiveEvent[];view:CourtView;revision:number;follow:boolean;focusedAgent:string|null;hoveredAgent:string|null;speakingAgent:string|null;onHover:(id:string|null)=>void;onSelect:(id:string)=>void}) {
  const state = useMemo(()=>courtroomState(events),[events])
  const controls = useRef<OrbitControlType>(null)
  const transition = useRef({ key:'', active:true })
  const positions = useMemo(()=>Object.fromEntries(ALL_AGENT_IDS.map((id,i)=> {
    if(id==='supreme_judge') return [id,[0,1.6,-23] as [number,number,number]]
    const side=i%2===0?-1:1, col=Math.floor(i/2)%5, row=Math.floor(i/10)
    return [id,[side*(3+col*1.65),0,row===0?-7:1+(row-1)*3.8] as [number,number,number]]
  })),[])
  useFrame(({camera},delta)=>{
    if(!controls.current)return
    const speaker=focusedAgent || (follow ? state.speakingAgentId : null)
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1
    const key=`${view}-${revision}-${speaker}-${aspect}`
    if(transition.current.key!==key) transition.current={key,active:true}
    if(!transition.current.active)return
    const p=speaker ? positions[speaker] : null
    const judge = speaker === 'supreme_judge'
    const target=p ? new THREE.Vector3(p[0],p[1]+(judge ? 2.3 : 1.6),p[2]) : new THREE.Vector3(...views[view].target)
    const eye=p ? new THREE.Vector3(p[0]+(judge ? 3 : 1.4),p[1]+(judge ? 3.3 : 2.7),p[2]+(judge ? 6 : -3.8)) : new THREE.Vector3(...views[view].eye)
    if (p && aspect < 1) eye.sub(target).multiplyScalar(1.3).add(target)
    if (!p && view === 'overview' && aspect < 1) eye.sub(target).multiplyScalar(1 / aspect).add(target)
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const blend=reduced?1:1-Math.exp(-3*delta)
    camera.position.lerp(eye,blend);controls.current.target.lerp(target,blend);controls.current.update()
    if(camera.position.distanceTo(eye)<.02)transition.current.active=false
  })
  const cutaway=view==='overview'
  return <>
    <color attach="background" args={['#171b1b']}/><fog attach="fog" args={cutaway ? ['#171b1b',180,350] : ['#33342e',65,130]}/>
    <ambientLight intensity={.42} color="#ffecd0"/><hemisphereLight args={['#e5eced','#6e4933',1.1]}/>
    <directionalLight position={[-12,19,-9]} intensity={3.1} color="#fff1d7" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={90} shadow-normalBias={.04}/>
    <directionalLight position={[10,10,15]} intensity={1.2} color="#e9ecf1"/>
    <OrbitControls ref={controls} makeDefault target={[0,3,-13]} enableDamping dampingFactor={.08} minDistance={3} maxDistance={view === 'overview' ? 190 : 70} maxPolarAngle={Math.PI/2-.035} onStart={()=>{transition.current.active=false}}/>
    <Box position={[0,-.55,-4]} size={[30,1,46]} color="#695543"/>
    <Box position={[0,-.035,-4]} size={[29,.07,45]} color="#b6ac96"/>
    {Array.from({length:15},(_,i)=><Box key={`tile-x-${i}`} position={[-14+i*2,.007,-4]} size={[.018,.008,44]} color="#8c826f"/>)}
    {Array.from({length:23},(_,i)=><Box key={`tile-z-${i}`} position={[0,.007,-26+i*2]} size={[29,.008,.018]} color="#8c826f"/>)}
    <Box position={[0,.025,-3]} size={[3.5,.04,42]} color="#783c31"/>
    {[-1.7,1.7].map(x=><Box key={x} position={[x,.055,-3]} size={[.045,.02,42]} color="#bea473" metal={.4}/>)}
    <Box position={[0,5.5,-26]} size={[30,11,.6]} color="#d4c6ac"/>
    <Box position={[0,2.1,-25.6]} size={[30,4.2,.3]} color="#523927"/>
    {Array.from({length:13},(_,i)=><group key={i}><Box position={[-13.8+i*2.3,2,-25.38]} size={[2.05,3.45,.12]} color="#694a32"/><Box position={[-13.8+i*2.3,2,-25.25]} size={[1.7,3.1,.05]} color="#5a3c29"/></group>)}
    <Box position={[0,4.3,-25.2]} size={[30,.17,.45]} color="#9c784a"/>
    <Box position={[0,10.4,-25.3]} size={[30,.25,.6]} color="#a28c67"/>
    {[-13,-8,8,13].map(x=><group key={x}><Box position={[x,6.8,-25.15]} size={[.6,7,.6]} color="#ddcfb4"/><Box position={[x,3.4,-25]} size={[1,.3,.9]} color="#b5a07b"/><Box position={[x,10.1,-25]} size={[1,.3,.9]} color="#b5a07b"/></group>)}
    <BalanceEmblem/><CourtNameplate/>
    <spotLight position={[0,10,-17]} target-position={[0,3,-23]} angle={.65} penumbra={.8} intensity={90} distance={22} color="#ffe5b4"/>
    {/* Brass sconces and inset wall panels bring a warmer architectural rhythm. */}
    {[-11,-5,5,11].map(x=><group key={`sconce-${x}`} position={[x,6.5,-25.1]}>
      <Box position={[0,0,0]} size={[.25,1.25,.16]} color="#ad8d50" metal={.65}/>
      <mesh position={[0,.1,.22]}><cylinderGeometry args={[.18,.24,.7,12]}/><meshStandardMaterial color="#ffebbc" emissive="#ffce80" emissiveIntensity={1.8} roughness={.4}/></mesh>
      <pointLight position={[0,.3,.7]} color="#ffd59a" intensity={6} distance={5}/>
    </group>)}
    {/* Case books and a gavel make the bench read as an occupied working room. */}
    {[-2.3,2.5].map(x=><group key={`books-${x}`} position={[x,3.66,-20.7]}>
      {['#384a40','#683b30','#c0a274'].map((c,i)=><group key={c} position={[i*.03,i*.13,0]} rotation={[0,i*.13,0]}><Box position={[0,0,0]} size={[.75,.11,.6]} color={c}/><Box position={[0,.015,.31]} size={[.64,.055,.012]} color="#e4dac2"/></group>)}
    </group>)}
    <mesh position={[1.2,3.69,-20.3]}><cylinderGeometry args={[.22,.25,.09,24]}/><meshStandardMaterial color="#3b281e" roughness={.35}/></mesh>
    <group position={[1.2,3.85,-20.3]} rotation={[0,.5,.15]}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.09,.09,.35,12]}/><meshStandardMaterial color="#5a3522" roughness={.3}/></mesh><Box position={[0,-.16,0]} size={[.045,.35,.045]} color="#825d36"/></group>

    {!cutaway && <group>
      <Box position={[0,11.6,-4]} size={[30,.3,46]} color="#c9bda4"/>
      {[-22,-14,-6,2,10,18].map(z=><group key={z}>
        <Box position={[0,11.15,z]} size={[30,.6,.45]} color="#795f41"/>
        {[-10,0,10].map(x=><group key={x}>
          {z===-22&&<Box position={[x,11,-4]} size={[.35,.5,44]} color="#957854"/>}
          <mesh position={[x,11.35,z+3]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[3,3]}/><meshStandardMaterial color="#fff1ce" emissive="#ffe4b0" emissiveIntensity={1.4} side={THREE.DoubleSide}/></mesh>
        </group>)}
      </group>)}
    </group>}
    {[-1,1].map(side=><group key={side}>
      <Box position={[side*14.7,cutaway?1.2:5.65,-4]} size={[.4,cutaway?2.4:11.3,44]} color="#c6bda8"/>
      <Box position={[side*14.35,1.4,-4]} size={[.2,2.8,44]} color="#634632"/>
      <Box position={[side*14.2,2.9,-4]} size={[.3,.14,44]} color="#ab8750"/>
      {[-18,-8,2,12].map(z=><group key={z}>
        {!cutaway&&<><Box position={[side*14.05,6.2,z]} size={[.12,4.8,3.6]} color="#f2e8cc"/><Box position={[side*13.95,6.2,z]} size={[.15,4.8,.1]} color="#54452f"/><Box position={[side*13.95,6.2,z]} size={[.15,.13,3.6]} color="#54452f"/><pointLight position={[side*12,6,z]} intensity={14} distance={12} color="#ffe4a9"/></>}
        <Box position={[side*14,1.4,z]} size={[.2,2.4,3.3]} color="#765239"/>
      </group>)}
    </group>)}
    <Box position={[0,.5,-21.7]} size={[17,1,7]} color="#60412d"/>
    {[0,1,2].map(i=><Box key={i} position={[0,.15+i*.16,-17.3-i*.55]} size={[7,.3+i*.32,.6]} color="#886845"/>)}
    <Box position={[0,2.2,-20.8]} size={[13,2.5,1.8]} color="#513323"/>
    <Box position={[0,3.5,-20.8]} size={[13.5,.22,2.15]} color="#785031"/>
    {[-5,-2.5,0,2.5,5].map(x=><group key={x}><Box position={[x,2.2,-19.85]} size={[2.15,1.8,.08]} color="#8c663e"/><Box position={[x,2.2,-19.77]} size={[1.9,1.55,.07]} color="#5d3b27"/></group>)}
    {[-4.2,0,4.2].map(x=><group key={x}><Box position={[x,2.7,-23.7]} size={[1.65,3,.4]} color="#463026"/><Box position={[x,2.9,-23.44]} size={[1.25,2.4,.15]} color="#794c39"/></group>)}
    <Flag x={-10}/><Flag x={10}/>
    {[-1,1].map(side=><group key={side}>
      <Box position={[side*6.2,.65,-8.7]} size={[8.7,1.3,1.6]} color="#64442c"/><Box position={[side*6.2,1.35,-8.7]} size={[9,.16,2]} color="#916b41"/>
      {[3,5,7,9].map(x=><group key={x}><Box position={[side*x,1.47,-8.5]} size={[.65,.055,.8]} color="#e5ddc6"/><Box position={[side*x+.15,1.52,-8.8]} size={[.4,.1,.65]} color="#374943"/></group>)}
      {[1,4.8,8.6,12.4].map(z=><group key={z}><Box position={[side*6.3,.45,z]} size={[9,.25,1.3]} color="#765132"/><Box position={[side*6.3,1.1,z+.65]} size={[9,1.2,.2]} color="#583b2a"/>{[2.6,6.3,10].map(x=><Box key={x} position={[side*x,.2,z]} size={[.2,.5,1.2]} color="#463020"/>)}</group>)}
      <Box position={[side*8,1.3,-2]} size={[12,.16,.2]} color="#936c3d"/>{Array.from({length:18},(_,i)=><Box key={i} position={[side*(2.2+i*.65),.65,-2]} size={[.07,1.3,.07]} color="#69472b"/>)}
    </group>)}
    <Box position={[-11,1.1,-16]} size={[3,2.2,2.5]} color="#6e4a30"/><Box position={[-11,2.3,-16]} size={[3.3,.2,2.8]} color="#997345"/>
    <Box position={[7,1.1,-16]} size={[5,2.2,1.8]} color="#62442e"/><Box position={[7,2.25,-16]} size={[5.3,.18,2.1]} color="#8f6b44"/>
    {[-4.2,0,4.2].map(x=><group key={x}>
      <Box position={[x,3.69,-21]} size={[.65,.12,.48]} color="#292b29"/>
      <Box position={[x,4.03,-21.2]} size={[.85,.6,.08]} color="#242927"/>
      <Box position={[x,4.03,-21.25]} size={[.77,.52,.02]} color="#53645d"/>
      <Box position={[x+.8,3.68,-20.6]} size={[.55,.08,.65]} color="#dbd4bd"/>
      <mesh position={[x+.6,3.8,-20.9]} rotation={[0,0,.25]}><cylinderGeometry args={[.022,.022,.5,8]}/><meshStandardMaterial color="#242825"/></mesh>
    </group>)}
    {ALL_AGENT_IDS.map(id => {
      const introducing = hoveredAgent === id || speakingAgent === id
      const selected = focusedAgent === id
      return <group key={id} onClick={event => { event.stopPropagation(); onSelect(id) }} onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(id) }} onPointerOut={() => { document.body.style.cursor = 'auto'; onHover(null) }}>
        <AgentAvatar agentId={id} name={AGENT_NAMES[id]} category={getAgentGroup(id)} color="#cbb386" position={positions[id]} faceAngle={id === 'supreme_judge' ? 0 : Math.PI} state={introducing ? 'speaking' : state.agentStates[id]?.state || 'idle'} bubble={introducing ? agentIntroduction(id) : state.agentStates[id]?.bubble} selected={selected} introducing={introducing}/>
        {selected && <mesh position={[positions[id][0],positions[id][1]+.035,positions[id][2]]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.85,1.02,48]}/><meshBasicMaterial color="#e6c586" transparent opacity={.9} side={THREE.DoubleSide}/></mesh>}
      </group>
    })}
  </>
}
