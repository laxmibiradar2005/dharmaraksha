import { createContext, useContext } from 'react'
export const SENSOR_AGENT_IDS = ['compliance_classifier', 'rights_advisor', 'compliance_recorder', 'jurisdiction_analyzer', 'escalation_planner', 'voice_narrator'] as const
export type SensorAgentId = typeof SENSOR_AGENT_IDS[number]
export const AgentContext = createContext<{ activeAgents: Set<SensorAgentId>; eventStatus: string; eventType: string }>({ activeAgents: new Set(), eventStatus: '', eventType: '' })
export function useAgents() { return useContext(AgentContext) }
