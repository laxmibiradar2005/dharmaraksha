import { useCallback, useEffect, useRef, useState } from 'react'

export interface CaseSummary { session_id: string; topic: string; status: string; risk_level: string; agents_done: number; created_at: string }
export interface LiveEvent { origin?: string; type: string; session_id?: string; name?: string; agentId?: string; category?: string; color?: string; agents?: { id: string; name: string; category: string; color: string }[]; bubble?: string; output?: string; topic?: string; verdict?: string; confidence?: number; risk_level?: string; risk_score?: number; status?: string; error?: string; totalAgents?: number; timestamp?: string; phase?: string; wasBlocked?: boolean }

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(60000) })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}). Please try again.`)
  if (body === null) throw new Error('The server returned an invalid response.')
  return body as T
}

export default function useWorkspace() {
  const [connected, setConnected] = useState(false)
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loadError, setLoadError] = useState('')
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [sessionId, setSessionId] = useState('')
  const sessionRef = useRef('')
  const [phase, setPhase] = useState('Ready')
  const [busy, setBusy] = useState(false)
  const [risk, setRisk] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const refresh = useCallback(async () => {
    try { setCases(await api<CaseSummary[]>('/api/sessions')); setLoadError('') }
    catch { setLoadError('Case history is unavailable. Start the server, then refresh.') }
  }, [])
  useEffect(() => {
    let stopped = false, socket: WebSocket | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    api<CaseSummary[]>('/api/sessions', { signal: controller.signal }).then(data => { if (!stopped) setCases(data) }).catch(() => { if (!stopped) setLoadError('Case history is unavailable. Start the server, then refresh.') })
    function connect() {
      if (stopped) return
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`)
      socket.onopen = () => { if (!stopped) { setConnected(true); void refresh() } }
      socket.onclose = () => { if (!stopped) { setConnected(false); retry = setTimeout(connect, 4000) } }
      socket.onerror = () => socket?.close()
      socket.onmessage = event => {
        if (stopped) return
        let d: LiveEvent
        try { d = JSON.parse(event.data) as LiveEvent } catch { return }
        if (!d.type || d.type === 'connected') return
        if (d.type === 'session_complete' || d.type === 'session_error') void refresh()
        if(d.type==='session_start'&&d.origin==='telegram'&&d.session_id){sessionRef.current=d.session_id;setSessionId(d.session_id);setEvents([]);location.hash='/courtroom'}
        if (!sessionRef.current || d.session_id !== sessionRef.current) return
        setEvents(previous => [...previous.slice(-999), d])
        if (d.type === 'session_start') { setBusy(true); setPhase('Research'); setRisk(null) }
        if (d.type === 'AGENT_START') setPhase(d.agentId === 'supreme_judge' ? 'Review' : d.category === 'debate' ? 'Debate' : 'Research')
        if (d.type === 'RISK_GATE') { setRisk(d.status === 'paused' ? (d.risk_score ?? 0) : null); if (d.status === 'cancelled') { setBusy(false); setPhase('Cancelled') } }
        if (d.type === 'SHIELD_BLOCKED' || (d.type === 'SECURITY_SHIELD' && d.wasBlocked)) { setBusy(false); setPhase('Blocked') }
        if (d.type === 'session_complete') { setBusy(false); setPhase('Complete'); setRisk(null) }
        if (d.type === 'session_error') { setBusy(false); setPhase('Error'); setRisk(null) }
      }
    }
    connect()
    return () => { stopped = true; controller.abort(); clearTimeout(retry); socket?.close() }
  }, [refresh])
  const adoptSession = useCallback((id: string) => {
    sessionRef.current = id
    setSessionId(id); setEvents([]); setRisk(null); setPhase('Research'); setBusy(true)
    void refresh()
  }, [refresh])
  const startCase = async (input: string) => {
    if (starting || busy) throw new Error('An investigation is already in progress.')
    if (!connected) throw new Error('Connect to the server before starting a live investigation.')
    // randomUUID requires HTTPS; getRandomValues also works on the local HTTP kiosk.
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    sessionRef.current = id
    setSessionId(id); setEvents([]); setStarting(true); setRisk(null); setPhase('Starting'); setBusy(true)
    try {
      await api('/api/pipeline/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input, session_id: id, username: 'WebUser' }) })
      void refresh()
    } catch (error) { setBusy(false); setPhase('Error'); throw error }
    finally { setStarting(false) }
  }
  const respondToRisk = async (approved: boolean) => {
    const result = await api<{ ok: boolean }>('/api/pipeline/risk-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, approved }) })
    if (!result.ok) throw new Error('This review request is no longer active. Refresh the case status.')
    setRisk(null)
    if (!approved) { setBusy(false); setPhase('Cancelled') }
  }
  return { connected, cases, loadError, refresh, events, sessionId, phase, busy, risk, starting, startCase, respondToRisk, adoptSession }
}
