import { answerLegal } from './groundedAssistant';
import { createSession, updateSession, addEvent, setAgentOutput } from './sessionStore';
import { broadcast } from './websocket';

export async function runEconomyInvestigation(id: string, topic: string, chatId?: number, language = 'en-IN') {
  createSession(id, topic.slice(0,20000), chatId);
  const emit = (type: string, data: Record<string,unknown>) => { addEvent(id, { type, data }); broadcast({ type, session_id: id, ...data }); };
  emit('session_start', { topic, mode: 'economy', totalAgents: 1 });
  emit('AGENT_START', { agentId: 'legal_aid_agent', name: 'Source-grounded legal research', category: 'legal', bubble: 'Economy mode: searching the local law library.', totalAgents: 1 });
  try {
    const result = await answerLegal({ message: topic.startsWith('[Document Review]') ? 'Identify the legal issues raised by this document. Cite supporting law, identify missing facts and avoid declaring it valid or safe.' : topic.slice(0,3000), context: topic.startsWith('[Document Review]') ? topic.slice(17,18000) : '', history: [], language });
    const verdict = `${result.reply}\n\nSources retrieved:\n${result.sources.map(s=>`${s.title}\n${s.url}`).join('\n')}\n\nEconomy mode: one research pass; not a 51-agent deliberation or court decision.`;
    updateSession(id, { status: 'complete', verdict, risk_level: 'medium' });
    setAgentOutput(id, 'legal', verdict);
    emit('AGENT_COMPLETE', { agentId: 'legal_aid_agent', name: 'Source-grounded legal research', output: verdict, bubble: 'Research ready. Review the cited source pages.', category: 'legal' });
    emit('session_complete', { verdict, mode: 'economy', agent_count: 1, risk_level: 'medium' });
    return verdict;
  } catch (error) {
    updateSession(id, { status: 'error' }); emit('session_error', { error: 'The budget research request could not finish. Use free law search or try again later.' }); throw error;
  }
}
