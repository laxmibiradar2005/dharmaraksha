import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../lib/firebase'
import { ref, onValue } from 'firebase/database'
import { AgentContext, SENSOR_AGENT_IDS, type SensorAgentId } from './agentState'

export function AgentProvider({ children }: { children: ReactNode }) {
  const [activeAgents, setActiveAgents] = useState<Set<SensorAgentId>>(new Set())
  const [eventStatus, setEventStatus] = useState('')
  const [eventType, setEventType] = useState('')
  useEffect(() => {
    let lastStatus = ''
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear() }
    const stop = onValue(ref(db, '/events/latest'), snapshot => {
      if (!snapshot.exists()) return
      const data = snapshot.val()
      const status = typeof data?.status === 'string' ? data.status : ''
      setEventStatus(status)
      setEventType(typeof data?.type === 'string' ? data.type : '')
      if (status === lastStatus) return
      clearTimers()
      if (status === 'processing') {
        setActiveAgents(new Set())
        SENSOR_AGENT_IDS.forEach((id, index) => {
          timers.add(setTimeout(() => setActiveAgents(previous => new Set([...previous, id])), index * 1200))
        })
      } else {
        timers.add(setTimeout(() => setActiveAgents(new Set()), status === 'resolved' ? 2500 : 0))
      }
      lastStatus = status
    })
    return () => { stop(); clearTimers() }
  }, [])
  return <AgentContext.Provider value={{ activeAgents, eventStatus, eventType }}>{children}</AgentContext.Provider>
}
