import type { LiveEvent } from '../hooks/useWorkspace'
import type { AvatarState } from '../components/AgentAvatar'
type MessengerPhase = 'idle' | 'to_security' | 'to_specialists' | 'to_debate' | 'to_judge'
import { getAgentGroup } from '../agents/agentPositions'

export interface AgentStateData { state: AvatarState; bubble: string; name: string; category: string; color: string }
export interface GroupFeedEntry { agentName: string; text: string; state: 'speaking' | 'complete'; time: number }
interface CourtroomState { agentStates: Record<string, AgentStateData>; speakingAgentId: string | null; messengerPhase: MessengerPhase; groupFeeds: Record<string, GroupFeedEntry[]>; groupCompleted: Record<string, Set<string>> }
const empty = (): CourtroomState => ({ agentStates: {}, speakingAgentId: null, messengerPhase: 'idle', groupFeeds: {}, groupCompleted: {} })

/** Replay the selected session so switching tabs never drops an agent event. */
export function courtroomState(events: LiveEvent[]): CourtroomState {
  let state = empty()
  for (const event of events) {
    if (event.type === 'session_start' || event.type === 'SESSION_START') { state = empty(); continue }
    if (event.type === 'AGENT_ROSTER') {
      state.messengerPhase = 'to_security'
      for (const agent of event.agents ?? []) state.agentStates[agent.id] = { ...agent, state: 'active', bubble: '' }
    }
    const id = event.agentId
    if (id && (event.type === 'AGENT_START' || event.type === 'AGENT_COMPLETE')) {
      const done = event.type === 'AGENT_COMPLETE'
      const previous = state.agentStates[id]
      const name = event.name || previous?.name || id.replaceAll('_', ' ')
      const group = getAgentGroup(id)
      const bubble = event.bubble || (done ? 'Analysis complete' : 'Analyzing…')
      state.agentStates[id] = { state: done ? 'complete' : 'speaking', name, bubble, category: event.category || previous?.category || group, color: event.color || previous?.color || '#81936c' }
      state.speakingAgentId = done ? (state.speakingAgentId === id ? (Object.keys(state.agentStates).reverse().find(key => state.agentStates[key].state === 'speaking') ?? null) : state.speakingAgentId) : id
      const feed = (state.groupFeeds[group] ?? []).filter(entry => entry.agentName !== name || entry.state !== 'speaking')
      state.groupFeeds[group] = [...feed, { agentName: name, text: bubble, state: done ? 'complete' : 'speaking', time: event.timestamp ? Date.parse(event.timestamp) : 0 }].slice(-6) as GroupFeedEntry[]
      if (done) { (state.groupCompleted[group] ??= new Set()).add(id) }
      else if (id === 'supreme_judge') state.messengerPhase = 'to_judge'
      else if (event.category === 'debate') state.messengerPhase = 'to_debate'
      else if (['research', 'legal', 'analysis', 'indian_context'].includes(event.category ?? '')) state.messengerPhase = 'to_specialists'
    }
    if (event.type === 'phase') {
      const phases: Record<string, MessengerPhase> = { security_agents: 'to_security', parallel_specialists: 'to_specialists', debate: 'to_debate', verdict: 'to_judge' }
      state.messengerPhase = phases[event.phase ?? ''] ?? state.messengerPhase
    }
    if (['session_complete', 'COMPLETE', 'session_error', 'SHIELD_BLOCKED'].includes(event.type)) {
      state.speakingAgentId = null; state.messengerPhase = 'idle'
      for (const agent of Object.values(state.agentStates)) if (agent.state === 'speaking') agent.state = 'idle'
    }
  }
  return state
}
