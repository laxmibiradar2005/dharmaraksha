import { useLanguage } from './context/languageState'
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import LegalLibrary from './components/LegalLibrary'
import Icon, { type IconName } from './components/Icon'
import Assistant, { RichText, type Message, type Attachment } from './components/Assistant'
import useWorkspace, { api, type CaseSummary } from './hooks/useWorkspace'
import { ALL_AGENT_IDS, AGENT_NAMES, getAgentGroup } from './agents/agentPositions'
import { agentFromHash } from './agents/agentProfile'
import './App.css'
import './components/TribunalView.css'

const TribunalView = lazy(() => import('./components/TribunalView'))
const NFCVoicePage = lazy(() => import('./pages/NFCVoicePage'))
const SensorPanel = lazy(() => import('./components/SensorPanel'))
const VerdictFeed = lazy(() => import('./components/VerdictFeed'))
type Page = 'overview' | 'assistant' | 'cases' | 'documents' | 'courtroom' | 'agents' | 'sensors' | 'nfc-voice'
const navigation: { id: Page; label: string; icon: IconName; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'assistant', label: 'AI assistant', icon: 'spark', badge: 'AI' },
  { id: 'cases', label: 'Case workspace', icon: 'folder' },
  { id: 'documents', label: 'Documents', icon: 'file' },
  { id: 'courtroom', label: 'Virtual courtroom', icon: 'court', badge: '3D' },
  { id: 'agents', label: 'Agent network', icon: 'people' },
]
const titles: Record<Page, [string, string]> = {
  overview: ['A clearer path to justice.', 'Your legal workspace. Every perspective, in one place.'],
  assistant: ['Good questions. Clearer answers.', 'Understand your rights with your AI legal research companion.'],
  cases: ['Every case has a story.', 'Your investigations, findings, and next steps, together.'],
  documents: ['Clarity, beyond the fine print.', 'Bring your documents into the conversation.'],
  courtroom: ['See every perspective.', 'A live, three-dimensional view of your multi-agent investigation.'],
  agents: ['Many perspectives. One purpose.', 'Meet the specialists behind your legal research.'],
  'nfc-voice': ['Your voice. A clearer next step.', 'Capture, review, and discuss a document.'],
  sensors: ['Connected to the real world.', 'Monitor your connected devices and incoming events.'],
}
function getPage(): Page { const route = location.hash.replace('#/', '').split('?')[0]; return [...navigation.map(n => n.id), 'sensors', 'nfc-voice'].includes(route as Page) ? route as Page : 'overview' }
function formatDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function statusLabel(status: string) { return status === 'complete' || status === 'done' ? 'Completed' : status === 'running' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1) }

export default function App() {
  const {t} = useLanguage()

  const [page, setPage] = useState<Page>(getPage)
  const [focusedAgent, setFocusedAgent] = useState<string | null>(agentFromHash)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const inCourt = page === 'overview' || page === 'courtroom'
  const [caseModal, setCaseModal] = useState(false)
  const [help, setHelp] = useState(false)
  const [caseInput, setCaseInput] = useState('')
  const [actionError, setActionError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [caseDetail, setCaseDetail] = useState<(CaseSummary & { verdict?: string; confidence?: number }) | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [riskPending, setRiskPending] = useState(false)
  const workspace = useWorkspace()
  const modal = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const detailRequest = useRef(0)

  useEffect(() => { const onHash = () => { setPage(getPage()); setFocusedAgent(agentFromHash()); setMobileOpen(false); setSearch('') }; window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  useEffect(() => { main.current?.scrollTo(0, 0) }, [page])
  const dialogOpen = caseModal || help || !!caseDetail || detailLoading
  useEffect(() => { if (dialogOpen) modal.current?.showModal(); else modal.current?.close() }, [dialogOpen])
  const navigate = (next: Page) => { location.hash = `/${next}`; setMobileOpen(false) }
  const selectAgent = (id: string | null) => { setFocusedAgent(id); location.hash = `/courtroom${id ? `?agent=${encodeURIComponent(id)}` : ''}` }
  const openAssistant = (question = '') => { if (question) setDraft(question); navigate('assistant') }
  const openNewCase = () => { setActionError(''); setCaseInput(''); setCaseModal(true) }
  const closeModal = () => { detailRequest.current++; setCaseModal(false); setHelp(false); setCaseDetail(null); setDetailLoading(false); setActionError('') }
  const shownCases = workspace.cases.filter(c => c.topic.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'complete' ? ['complete', 'done'].includes(c.status) : ['running', 'paused'].includes(c.status))))
  const recent = page === 'overview' ? shownCases.slice(0, 4) : shownCases
  const liveOutput = [...workspace.events].reverse().find(e => e.type === 'session_complete')

  async function startCase(e: FormEvent) {
    e.preventDefault(); setActionError('')
    try { await workspace.startCase(caseInput.trim()); setCaseModal(false); navigate('courtroom') }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Could not start the investigation.') }
  }
  async function openCase(item: CaseSummary) {
    const requestId = ++detailRequest.current
    setActionError(''); setDetailLoading(true)
    try { const detail = await api<CaseSummary & { verdict?: string; confidence?: number }>(`/api/sessions/${encodeURIComponent(item.session_id)}`); if (detailRequest.current === requestId) setCaseDetail({ ...item, ...detail }) }
    catch (err) { if (detailRequest.current === requestId) { setCaseDetail(item); setActionError(err instanceof Error ? err.message : 'Unable to load this case.') } }
    finally { if (detailRequest.current === requestId) setDetailLoading(false) }
  }
  async function respondRisk(approved: boolean) {
    setActionError(''); setRiskPending(true)
    try { await workspace.respondToRisk(approved) } catch (err) { setActionError(err instanceof Error ? err.message : 'Unable to submit your response.') }
    finally { setRiskPending(false) }
  }
  function exportCase() {
    if (!caseDetail?.verdict) return
    const url = URL.createObjectURL(new Blob([`DHARMARAKSHA — AI research report\n${caseDetail.topic}\n${formatDate(caseDetail.created_at)}\n\n${caseDetail.verdict}\n\nAI-generated research. Verify with a qualified lawyer.`], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `Dharmaraksha-${caseDetail.session_id.slice(0, 8)}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function caseTable() {
    return <div className="case-table-wrap">{workspace.loadError ? <div className="empty-state"><span className="empty-icon"><Icon name="folder" size={27} /></span><h3>{t("Your workspace is waiting")}</h3><p>{workspace.loadError}</p><button className="text-button" onClick={() => void workspace.refresh()}>{t("Try again")}<Icon name="refresh" size={15} /></button></div> : !recent.length ? <div className="empty-state"><span className="empty-icon"><Icon name="folder" size={27} /></span><h3>{search || filter !== 'all' ? t("No matching cases") : t("Your next chapter starts here")}</h3><p>{search || filter !== 'all' ? t("Try another search or status filter.") : t("Start an investigation to bring your research, evidence, and findings together.")}</p><button className="text-button" onClick={search || filter !== 'all' ? () => { setSearch(''); setFilter('all') } : openNewCase}>{search || filter !== 'all' ? t("Clear filters") : t("Create your first case")} <Icon name="arrow" size={16} /></button></div> : <table className="case-table"><thead><tr><th>{t("CASE / TOPIC")}</th><th>{t("CREATED")}</th><th>{t("STATUS")}</th><th aria-label={t("Open case")} /></tr></thead><tbody>{recent.map(item => <tr key={item.session_id}><td><button className="case-name" onClick={() => void openCase(item)}><span className="case-file"><Icon name="file" size={18} /></span><span><strong>{item.topic}</strong><small>{t("CASE")}{item.session_id.slice(0, 8).toUpperCase()}</small></span></button></td><td>{formatDate(item.created_at)}</td><td><span className={`status-badge ${item.status}`}>{t(statusLabel(item.status))}</span></td><td><button className="icon-button" aria-label={`Open case: ${item.topic}`} onClick={() => void openCase(item)}><Icon name="diagonal" size={17} /></button></td></tr>)}</tbody></table>}</div>
  }

  return <div className={`workspace-app ${inCourt ? 'is-court' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus() }}>{t("Skip to content")}</a>
    {mobileOpen && <button className="sidebar-backdrop" aria-label={t("Close navigation")} onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <a className="brand" href="#/overview"><span className="brand-mark"><Icon name="scales" size={27} /></span><span>{t("dharmaraksha")}<small>{t("CLARITY. BALANCE. JUSTICE.")}</small></span></a>
      <button className="new-case-button" onClick={openNewCase}><Icon name="plus" size={18} />{t("New investigation")}<span aria-hidden="true">↗</span></button>
      <span className="nav-label">{t("WORKSPACE")}</span>
      <nav aria-label={t("Main navigation")}>{navigation.map(item => <a href={`#/${item.id}`} key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => setMobileOpen(false)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge && <small>{item.badge}</small>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="connected-card"><span className="tiny-star">✧</span><strong>{t("Justice, within reach.")}</strong><p>{t("Built for better questions.")}<br />{t("Designed for informed decisions.")}</p><button onClick={() => openAssistant()}>{t("Meet your AI assistant")}<Icon name="arrow" size={15} /></button></div>
        <a href="#/nfc-voice" className="utility-link"><Icon name="mic" size={18} />{t("Voice & document scan")}<Icon name="diagonal" size={14} /></a><button className="utility-link" onClick={() => navigate('sensors')}><Icon name="globe" size={18} />{t("Connected devices")}</button><button className="utility-link" onClick={() => setHelp(true)}><Icon name="help" size={18} />{t("Help & getting started")}</button>
        <div className="workspace-profile"><span className="profile-avatar">{t("DR")}</span><div><strong>{t("Dharmaraksha workspace")}</strong><small>{t("Legal research platform")}</small></div><Icon name="shield" size={17} /></div>
      </div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label={t("Open navigation")} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Icon name="menu" /></button><span>{t("Workspace")}</span><Icon name="chevron" size={13} /><strong>{page === 'sensors' ? t("Connected devices") : page === 'nfc-voice' ? 'Voice & document scan' : navigation.find(n => n.id === page)?.label}</strong></div><div className="topbar-right"><span className={`connection ${workspace.connected ? 'online' : ''}`}><i />{workspace.connected ? t("Server connected") : t("Server offline")}</span><span className="topbar-divider" /><span className="top-avatar">{t("DR")}</span></div></header>
      <main id="main-content" tabIndex={-1} ref={main} className="main-content"><div className="page-heading"><div><div className="eyebrow">{page === 'overview' ? t("YOUR LEGAL COMMAND CENTER") : t("DHARMARAKSHA WORKSPACE")}</div><h1>{t(titles[page][0])}</h1><p>{t(titles[page][1])}</p></div>{page === 'overview' ? <span className="date-label"><Icon name="clock" size={15} />{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span> : page === 'cases' || page === 'courtroom' ? <button className="primary-button" onClick={openNewCase}><Icon name="plus" size={17} />{t("New investigation")}</button> : page === 'assistant' ? <button className="secondary-button" onClick={() => { setMessages([]); setDraft(''); setAttachment(null) }} disabled={assistantBusy || messages.length === 0}>{t("New conversation")}<Icon name="plus" size={16} /></button> : null}</div>

      <div hidden={page !== 'assistant'}><Assistant messages={messages} setMessages={setMessages} attachment={attachment} onAttachment={setAttachment} draft={draft} setDraft={setDraft} onBusyChange={setAssistantBusy} /></div>
      {page === 'cases' && <section className="panel"><div className="case-toolbar"><div className="filter-tabs" aria-label={t("Filter cases")}>{[['all', 'All cases'], ['running', 'In progress'], ['complete', 'Completed']].map(([value, label]) => <button className={filter === value ? 'selected' : ''} aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div><label className="search-field"><Icon name="search" size={17} /><input placeholder={t("Search investigations…")} aria-label={t("Search investigations")} value={search} onChange={e => setSearch(e.target.value)} /></label></div>{caseTable()}</section>}
      {page === 'documents' && <LegalLibrary/>}
      {page === 'documents' && <div className="documents-layout"><section className="panel document-upload"><span className="document-big-icon"><Icon name="file" size={42} /></span><span className="eyebrow">{t("YOUR DOCUMENT, MADE CLEARER")}</span><h2>{t("From complex clauses")}<br /><em>{t("to clearer understanding.")}</em></h2><p>{t("Attach a contract, notice, or agreement in the assistant.")}<br />{t("Ask for a summary, key obligations, or questions to take to a lawyer.")}</p><button className="primary-button" onClick={() => openAssistant('Please help me review a document.')}><Icon name="upload" size={18} />{t("Open document assistant")}</button><small>{t("PDF, DOCX, TXT, or Markdown · Up to 10 MB")}</small>{attachment && <div className="document-attached"><Icon name="file" />{attachment.name}<button className="text-button" onClick={() => openAssistant()}>{t("Continue review")}<Icon name="arrow" size={15} /></button></div>}</section><section className="document-guide"><span className="eyebrow">{t("HOW IT WORKS")}</span>{[['01', 'Bring your document', 'Upload a readable document through the assistant.'], ['02', 'Ask what matters', 'Explore terms, obligations, and potential concerns.'], ['03', 'Make an informed next step', 'Use the findings to prepare for professional legal advice.']].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}<div className="document-privacy"><Icon name="shield" size={20} /><p>{t("Document text is shared with the configured AI provider when you send a question. Only upload documents you are authorized to share.")}</p></div></section></div>}
      {inCourt && <><Suspense fallback={<div className="loading-panel">{t("Preparing the courtroom…")}</div>}><TribunalView events={workspace.events} phase={t(workspace.phase)} connected={workspace.connected} onNewCase={openNewCase} selected={focusedAgent} onSelect={selectAgent} onAskAgent={id => openAssistant(`I would like help from ${t(AGENT_NAMES[id])}. `)} activityOpen={activityOpen} onActivity={() => setActivityOpen(!activityOpen)} /></Suspense><div className={`courtroom-bottom ${activityOpen ? 'is-open' : ''}`}><button className="activity-close icon-button" aria-label={t("Close live activity")} onClick={() => setActivityOpen(false)}><Icon name="close" /></button><section className="panel activity-panel"><div className="section-heading"><h2>{t("Live activity")}</h2><span className="subtle-badge">{t(workspace.phase)}</span></div>{workspace.events.length ? <div className="activity-list" aria-live="polite">{workspace.events.slice(-15).reverse().map((event, i) => <div className="activity-row" key={`${event.timestamp}-${i}`}><span className="activity-dot" /><div><strong>{event.name || event.type.replaceAll('_', ' ').toLowerCase()}</strong><p>{event.bubble || event.error || event.topic || event.status || 'Investigation updated'}</p></div><small>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div>)}</div> : <div className="empty-state compact"><Icon name="court" size={27} /><h3>{t("Ready when you are.")}</h3><p>{t("Start an investigation to see agents research, debate, and review your question here.")}</p></div>}</section><section className="panel review-panel"><span className="eyebrow">{t("INVESTIGATION STATUS")}</span><h3>{t(workspace.phase)}</h3><p>{t("The tribunal combines specialist research and debate into an AI-generated assessment.")}</p><div className="pipeline-steps">{['Research', 'Debate', 'Review', 'Complete'].map((step, i) => <span className={workspace.phase === step ? 'current' : ''} key={t(step)}><i>{i + 1}</i>{t(step)}</span>)}</div><small>{t("Research support, not a court ruling.")}</small></section></div>{workspace.risk !== null && <section className="risk-review panel" role="alert"><h3>{t("Human review required · Risk score")} {workspace.risk}</h3><p>{t("The investigation is paused. Review the case before continuing.")}</p>{actionError && <p className="inline-error">{actionError}</p>}<button className="primary-button" disabled={riskPending} onClick={() => void respondRisk(true)}>{t("Approve and continue")}</button><button className="secondary-button" disabled={riskPending} onClick={() => void respondRisk(false)}>{t("Cancel investigation")}</button></section>}{liveOutput?.verdict && <section className="panel findings-panel"><span className="eyebrow">{t("RESEARCH FINDINGS")}</span><h2>{t("Your investigation, considered.")}</h2><RichText text={liveOutput.verdict} /></section>}</>}
      {page === 'agents' && <><div className="agent-intro"><div><span className="eyebrow">{t("COLLABORATIVE INTELLIGENCE")}</span><h2>{t("Specialists for the bigger picture.")}</h2><p>{t("Agents are selected to suit each investigation. The network covers security, law, Indian context, research, analysis, debate, and judicial synthesis.")}</p></div><span className="agent-total">{ALL_AGENT_IDS.length}<small>{t("SPECIALIST ROLES")}</small></span></div><label className="search-field agent-search"><Icon name="search" size={18} /><input aria-label={t("Search agents")} placeholder={t("Find a specialist…")} value={search} onChange={e => setSearch(e.target.value)} /></label><div className="agent-grid">{ALL_AGENT_IDS.filter(id => (AGENT_NAMES[id] || id).toLowerCase().includes(search.toLowerCase())).map(id => { const event = [...workspace.events].reverse().find(e => e.agentId === id); return <button type="button" className="agent-card panel" key={id} aria-label={`Meet ${t(AGENT_NAMES[id] || id)} in the courtroom`} onClick={() => selectAgent(id)}><span className="agent-card-icon"><Icon name={id === 'supreme_judge' ? 'scales' : 'people'} size={22} /></span><span className={`agent-state ${event?.type === 'AGENT_START' ? 'working' : ''}`}>{event?.type === 'AGENT_START' ? t("Working") : event?.type === 'AGENT_COMPLETE' ? t("Completed") : t("Standby")}</span><h3>{t(AGENT_NAMES[id] || id)}</h3><p>{t(getAgentGroup(id).replaceAll('_', ' ').replace(/ left| right/g, ''))}</p><span className="agent-card-action">{t("Meet in the courtroom")}<Icon name="arrow" size={15}/></span></button> })}</div>{!ALL_AGENT_IDS.some(id => (AGENT_NAMES[id] || id).toLowerCase().includes(search.toLowerCase())) && <div className="empty-state"><h3>{t("No matching specialists")}</h3><p>{t("Try another name or clear the search.")}</p></div>}</>}
      {page === 'nfc-voice' && <Suspense fallback={<div className="loading-panel">{t("Opening voice and document scan…")}</div>}><NFCVoicePage onSessionStarted={workspace.adoptSession} /></Suspense>}
      {page === 'sensors' && <section className="panel sensor-page"><Suspense fallback={<p>{t("Loading connected devices…")}</p>}><SensorPanel /><VerdictFeed /></Suspense></section>}
      </main>
    </div>
    <dialog ref={modal} className={`workspace-dialog ${caseDetail ? 'report-dialog' : ''}`} onCancel={closeModal} onClick={e => { if (e.target === e.currentTarget) closeModal() }} aria-label={caseModal ? t("New investigation") : help ? t("Getting started") : t("Case details")}><button className="dialog-close icon-button" aria-label={t("Close dialog")} onClick={closeModal}><Icon name="close" /></button>
      {caseModal && <form onSubmit={startCase}><span className="dialog-symbol"><Icon name="folder" size={27} /></span><span className="eyebrow">{t("START WITH A QUESTION")}</span><h2>{t("A new perspective")}<br />{t("starts here.")}</h2><p>{t("Describe the legal issue you want the tribunal to investigate. Include the facts and the outcome you want to understand.")}</p><label className="field-label" htmlFor="case-question">{t("Investigation topic")}</label><textarea id="case-question" autoFocus required minLength={10} maxLength={20000} rows={5} value={caseInput} onChange={e => setCaseInput(e.target.value)} placeholder={t("Describe your legal question or case…")} /><p className="form-hint">{t("The tribunal uses your configured AI providers and existing report integrations.")}</p>{actionError && <p className="inline-error" role="alert">{actionError}</p>}<button className="primary-button full-width" disabled={workspace.starting || workspace.busy || caseInput.trim().length < 10}>{workspace.starting ? t("Starting investigation…") : workspace.busy ? t("Investigation in progress") : t("Start investigation")}<Icon name="arrow" size={17} /></button></form>}
      {help && <><span className="dialog-symbol"><Icon name="scales" size={28} /></span><span className="eyebrow">{t("WELCOME TO DHARMARAKSHA")}</span><h2>{t("Find your starting point.")}</h2><div className="help-options">{[['spark', 'Ask the assistant', 'Get conversational help with Indian legal questions.'], ['file', 'Understand a document', 'Attach a document and ask about its contents.'], ['court', 'Launch an investigation', 'Let specialist agents research and debate a case.']].map(([icon, title, text]) => <div key={t(title)}><Icon name={icon as IconName} /><div><h3>{t(title)}</h3><p>{t(text)}</p></div></div>)}</div><p className="form-hint">{t("AI output is research assistance. It can be incomplete or incorrect and should be checked by a qualified lawyer.")}</p><button className="primary-button full-width" onClick={() => { closeModal(); openAssistant() }}>{t("Meet your assistant")}<Icon name="arrow" size={17} /></button></>}
      {detailLoading && <div className="empty-state">{t("Loading case findings…")}</div>}{caseDetail && !detailLoading && <><span className="eyebrow">{t("CASE")}{caseDetail.session_id.slice(0, 8).toUpperCase()}</span><h2>{caseDetail.topic}</h2><div className="report-meta"><span className={`status-badge ${caseDetail.status}`}>{t(statusLabel(caseDetail.status))}</span><span>{formatDate(caseDetail.created_at)}</span></div>{actionError && <p className="inline-error" role="alert">{actionError}</p>}{caseDetail.verdict ? <><RichText text={caseDetail.verdict} /><button className="secondary-button" onClick={exportCase}><Icon name="download" size={17} />{t("Download findings")}</button></> : <div className="empty-state"><Icon name="clock" size={28} /><p>{t("No final findings are available for this case yet.")}</p></div>}<p className="assistant-note">{t("AI-generated research. Verify findings and citations with a qualified lawyer.")}</p></>}
    </dialog>
  </div>
}
