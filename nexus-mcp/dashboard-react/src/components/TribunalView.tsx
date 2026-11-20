import languageList from '../locales/languages.json'
import { useLanguage } from '../context/languageState'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import CourtInterior, { type CourtView } from './CourtInterior'
import SceneBoundary from './SceneBoundary'
import Icon from './Icon'
import { ALL_AGENT_IDS, AGENT_NAMES, getAgentGroup } from '../agents/agentPositions'
import { agentIntroduction } from '../agents/agentProfile'
import type { LiveEvent } from '../hooks/useWorkspace'

export default function TribunalView({ events, phase, connected, onNewCase, activityOpen, onActivity, selected, onSelect, onAskAgent }: { events: LiveEvent[]; phase: string; connected: boolean; onNewCase: () => void; activityOpen: boolean; onActivity: () => void; selected: string | null; onSelect: (id: string | null) => void; onAskAgent: (id: string) => void }) {
  const {t, language} = useLanguage()

  const [view, setView] = useState<CourtView>('gallery')
  const [revision, setRevision] = useState(0)
  const [followChoice, setFollow] = useState<boolean | null>(null)
  const follow = followChoice ?? (events.some(event => event.type === 'session_start' && event.origin === 'telegram') && phase !== 'Complete' && phase !== 'Error')
  const [hovered, setHovered] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState('')
  const [clean, setClean] = useState(false)
  useEffect(() => {
    const restore = () => setClean(false)
    window.addEventListener('hashchange', restore)
    return () => window.removeEventListener('hashchange', restore)
  }, [])
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const voiceRequest = useRef<AbortController | null>(null)
  const [sarvam, setSarvam] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/voice/status', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => setSarvam(data?.configured === true)).catch(() => {})
    return () => controller.abort()
  }, [])
  function stopVoice() {
    voiceRequest.current?.abort(); voiceRequest.current = null
    if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null }
    utterance.current = null; window.speechSynthesis?.cancel(); setSpeaking(null)
  }
  function selectAgent(id: string | null) { stopVoice(); setTour(false); setFollow(false); setParticipants(false); onSelect(id) }
  async function playIntroduction(id: string) {
    stopVoice(); setVoiceError('')
    if(languageList.find(item=>item.code===language)?.voice===false){setVoiceError(t('Spoken replies are unavailable in this language. Your replies and guidance appear on screen. You can speak or type.'));return}
    if (!navigator.onLine) { setVoiceError('Voice introductions are available online. You can read the introduction below.'); return }
    if (sarvam) {
      const controller = new AbortController(); voiceRequest.current = controller; setSpeaking(id)
      try {
        const response = await fetch('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t(agentIntroduction(id)), language }), signal: controller.signal })
        if (!response.ok) throw new Error('Voice playback is unavailable. Please try again.')
        const blob = await response.blob()
        if (controller.signal.aborted) return
        const player = new Audio(URL.createObjectURL(blob)); audio.current = player
        player.onended = () => { if (audio.current === player) stopVoice() }
        player.onerror = () => { if (audio.current === player) { stopVoice(); setVoiceError('Your browser could not play the introduction.') } }
        await player.play()
      } catch (error) {
        if (!controller.signal.aborted) { stopVoice(); setVoiceError(error instanceof Error ? error.message : 'Voice could not play.') }
      }
      return
    }
    if (!('speechSynthesis' in window)) { setVoiceError('Device speech is unavailable. You can read the introduction below.'); return }
    const speech = new SpeechSynthesisUtterance(agentIntroduction(id)); utterance.current = speech
    speech.lang = language; speech.rate = .95
    speech.onstart = () => { if (utterance.current === speech) setSpeaking(id) }
    speech.onend = () => { if (utterance.current === speech) setSpeaking(null) }
    speech.onerror = () => { if (utterance.current === speech) { setSpeaking(null); setVoiceError('Device voice could not play. The written introduction is available below.') } }
    window.speechSynthesis.speak(speech)
  }
  useEffect(() => () => {
    voiceRequest.current?.abort(); utterance.current = null; window.speechSynthesis?.cancel()
    if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null }
  }, [selected])
  const [participants, setParticipants] = useState(false)
  const [menu, setMenu] = useState(false)
  const [tour, setTour] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  useEffect(() => { const update = () => { setFullscreen(!!document.fullscreenElement); setClean(!!document.fullscreenElement) }; document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update) }, [])
  useEffect(() => { if (!tour) return; const timer = setInterval(() => { setView(current => { const list: CourtView[] = ['gallery', 'bench', 'counsel', 'overview']; return list[(list.indexOf(current) + 1) % list.length] }); setRevision(n => n + 1) }, 6500); return () => clearInterval(timer) }, [tour])
  const chooseView = (next: CourtView) => { setView(next); setRevision(n => n + 1); setFollow(false); setTour(false); selectAgent(null) }
  const event = selected ? [...events].reverse().find(item => item.agentId === selected) : undefined
  async function toggleFullscreen() { try { setFullscreenError(''); if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { setFullscreenError('Your browser could not enter fullscreen. The room still fills this page.') } }
  return <section className={`court-experience ${clean ? 'is-clean' : ''} ${selected ? 'has-selection' : ''}`} aria-label={t("Interactive 3D courtroom")}>
    <div className="court-canvas" role="img" aria-label={t("Three-dimensional Indian courtroom. Drag to look around, scroll to zoom, or use the camera and participant controls.")}>
      <SceneBoundary fallback={<div className="court-fallback"><Icon name="court" size={54}/><h2>{t("The 3D view is unavailable")}</h2><p>{t("Use a WebGL-capable browser to explore the room. The assistant and case workspace remain available.")}</p></div>}>
        <Suspense fallback={<div className="court-fallback">{t("Opening the courtroom…")}</div>}>
          <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8, 24], fov: 52, near: .15, far: 260 }} gl={{ antialias: true }}>
            <CourtInterior events={events} view={view} revision={revision} follow={follow} focusedAgent={selected} hoveredAgent={hovered} speakingAgent={speaking} onHover={setHovered} onSelect={selectAgent}/>
          </Canvas>
        </Suspense>
      </SceneBoundary>
    </div>
    <div className="court-vignette"/>
    <header className="court-header">
      <a className="court-brand" href="#/overview"><span><Icon name="scales" size={26}/></span><div>{t("dharmaraksha")}<small>{t("THE VIRTUAL COURTROOM")}</small></div></a>
      <nav className={menu ? 'court-nav open' : 'court-nav'} aria-label={t("Courtroom navigation")}><a href="#/assistant"><Icon name="spark" size={16}/>{t("AI assistant")}</a><a href="#/cases">{t("Case workspace")}</a><a href="#/agents">{t("Agent network")}</a></nav>
      <button className="court-new" aria-label={t("New investigation")} onClick={onNewCase}><Icon name="plus" size={17}/><span>{t("New investigation")}</span></button>
      <button className="court-menu" aria-label={t("Open navigation")} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'}/></button>
    </header>
    <div className="court-heading"><span className="court-kicker"><i/>{t("IMMERSIVE COURTROOM · 01")}</span><h1>{selected ? t(AGENT_NAMES[selected]) : t("The courtroom")}</h1><p>{selected ? t("Selected specialist · Explore their perspective") : t("Drag to explore · Select a participant")}</p></div>
    <div className="court-session"><span className="court-kicker">{t("COURT SESSION")}</span><strong><i className={phase === 'Ready' ? '' : 'active'}/>{phase === 'Ready' ? t("Awaiting a case") : phase}</strong><span>{connected ? t("Server connected") : t("Server offline")} · {ALL_AGENT_IDS.length}{t("specialist roles")}</span><button onClick={onActivity} aria-expanded={activityOpen}><Icon name="file" size={15}/>{t("Live activity")}<Icon name="arrow" size={15}/></button></div>
    <button className="court-clean-toggle" aria-pressed={clean} onClick={() => setClean(!clean)}><Icon name={clean ? 'menu' : 'expand'} size={16}/>{clean ? t("Show controls") : t("Hide interface")}</button><div className="court-tools"><button aria-label={t("Participants")} onClick={() => { selectAgent(null); setParticipants(!participants) }} aria-expanded={participants}><Icon name="people" size={19}/><span>{t("Participants")}</span></button><button aria-label={t("Follow speaker")} onClick={() => { selectAgent(null); setFollow(!follow); setTour(false) }} aria-pressed={follow}><Icon name="mic" size={19}/><span>{t("Follow speaker")}</span></button><button aria-label={tour ? t("Stop tour") : t("Take a tour")} onClick={() => { selectAgent(null); setTour(!tour); setFollow(false) }} aria-pressed={tour}><Icon name="play" size={19}/><span>{tour ? t("Stop tour") : t("Take a tour")}</span></button><button onClick={() => void toggleFullscreen()} aria-label={fullscreen ? t("Exit fullscreen") : t("Enter fullscreen")}><Icon name="expand" size={19}/><span>{t("Fullscreen")}</span></button></div>
    {(participants || selected) && <aside className="court-participants" aria-label={t("Court participants")}><button className="court-panel-close" aria-label={t("Close participants")} onClick={() => { setParticipants(false); selectAgent(null) }}><Icon name="close" size={20}/></button><span className="court-kicker">{selected ? t('PARTICIPANT PROFILE') : t('INSIDE THE COURT')}</span>{selected ? <><h2>{t(AGENT_NAMES[selected] || selected)}</h2><p>{getAgentGroup(selected).replaceAll('_', ' ')}</p><span className="participant-status">{event?.type === 'AGENT_START' ? t('Speaking') : event?.type === 'AGENT_COMPLETE' ? t("Research complete") : t("Awaiting an investigation")}</span><p>{t(agentIntroduction(selected))}</p>{event?.bubble && <p className="participant-finding">{t(event.bubble)}</p>}<button className="primary-button" onClick={() => onAskAgent(selected)}>{t("Ask this specialist")}<Icon name="arrow" size={15}/></button><button className="court-text-button" onClick={() => speaking === selected ? stopVoice() : playIntroduction(selected)}><Icon name="mic" size={15}/>{speaking === selected ? t("Stop introduction") : t("Play introduction")}<small>{sarvam ? t("Online voice") : t("Device voice")}</small></button>{voiceError && <p role="status">{t(voiceError)}</p>}<button className="court-text-button" onClick={() => { selectAgent(null); setParticipants(true) }}>{t("View all participants →")}</button></> : <><h2>{t("The people behind")}<br/>{t("each perspective.")}</h2><div className="participant-list">{ALL_AGENT_IDS.map(id => <button key={id} onClick={() => selectAgent(id)}><Icon name={id === 'supreme_judge' ? 'scales' : 'people'} size={17}/>{t(AGENT_NAMES[id])}<Icon name="chevron" size={14}/></button>)}</div></>}</aside>}
    <footer className="court-camera-bar"><div className="camera-label"><Icon name="court" size={19}/><span>{t("YOUR PERSPECTIVE")}<small>{t("Drag to orbit · Scroll to zoom")}</small></span></div><div className="camera-presets" aria-label={t("Camera views")}>{(['gallery', 'bench', 'counsel', 'overview'] as CourtView[]).map((item, i) => <button key={item} aria-pressed={view === item} onClick={() => chooseView(item)}><small>0{i + 1}</small>{t(({ gallery: 'The gallery', bench: 'Judge’s bench', counsel: 'Counsel tables', overview: 'Entire room' })[item])}</button>)}</div><button className="camera-reset" aria-label={t("Reset courtroom camera")} onClick={() => chooseView('gallery')}><Icon name="refresh" size={19}/></button></footer>
    <span className="court-disclaimer">{t("AI research simulation · Not a court proceeding")}</span>{fullscreenError && <p className="court-notice" role="status">{t(fullscreenError)}</p>}
  </section>
}
