import { AGENT_NAMES, ALL_AGENT_IDS, getAgentGroup } from './agentPositions'

const introductions: Record<string, string> = {
  criminal_law_agent: 'I am the Criminal Law Specialist. I help organize criminal-law questions, identify relevant facts, and prepare questions about procedures and rights for a qualified lawyer.',
  supreme_judge: 'I bring the specialists’ findings together into a research assessment. I am an AI role, not a judge issuing a court order.',
  prosecutor: 'I examine the arguments supporting a claim and the evidence needed to support them.',
  defense_counsel: 'I examine the response to a claim, possible counterarguments, and gaps in the evidence.',
}
export function agentIntroduction(id: string) {
  return introductions[id] || `I am ${AGENT_NAMES[id] || 'a research specialist'}. My role is ${getAgentGroup(id).replaceAll('_', ' ').replace(/ left| right/g, '')}. Select me to explore my role or ask a question in the legal assistant.`
}
export function agentFromHash(hash = location.hash) {
  const id = new URLSearchParams(hash.split('?')[1] || '').get('agent')
  return id && ALL_AGENT_IDS.includes(id) ? id : null
}
