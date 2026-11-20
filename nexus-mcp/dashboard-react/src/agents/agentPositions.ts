export const GROUP_CENTERS: Record<string, [number, number, number]> = {
  security_left: [-8, 0, -8],
  security_right: [8, 0, -8],
  legal: [-14, 0, -20],
  indian_context: [14, 0, -20],
  research: [-14, 0, -34],
  analysis: [14, 0, -34],
  debate: [0, 0, -46],
  supreme_judge: [0, 6.5, 0],
};

export const ALL_AGENT_IDS: string[] = [
  // 0-2: Security Left (3)
  'fraud_detector', 'misinfo_checker', 'deepfake_checker',
  // 3-5: Security Right (3)
  'propaganda_detector', 'conflict_of_interest', 'manipulation_checker',
  // 6-15: Legal (10)
  'tax_law_agent', 'ip_law_agent', 'criminal_law_agent', 'corporate_law_agent',
  'family_law_agent', 'property_law_agent', 'labour_law_agent', 'constitutional_law_agent',
  'consumer_law_agent', 'cyber_law_agent',
  // 16-25: Indian Context (10)
  'rbi_agent', 'sebi_agent', 'cci_agent', 'rera_agent', 'ngt_agent',
  'nclt_agent', 'cyber_tribunal', 'election_commission', 'human_rights_agent', 'supreme_court_precedent',
  // 26-33: Research (8)
  'finance_analyst', 'medical_researcher', 'tech_analyst', 'political_analyst',
  'historical_researcher', 'economic_analyst', 'scientific_analyst', 'social_researcher',
  // 34-41: Analysis (8)
  'fact_checker', 'bias_detector', 'sentiment_analyst', 'source_credibility',
  'logical_fallacy', 'data_verifier', 'claim_extractor', 'evidence_ranker',
  // 42-49: Debate (8)
  'prosecutor', 'defense_counsel', 'ethicist', 'devils_advocate',
  'mediator', 'cross_examiner', 'closing_argument', 'rebuttal_agent',
  // 50: Supreme Judge (1)
  'supreme_judge',
];

export const AGENT_NAMES: Record<string, string> = {
  fraud_detector: 'Fraud Detector',
  misinfo_checker: 'Misinfo Checker',
  deepfake_checker: 'Deepfake Checker',
  propaganda_detector: 'Propaganda Detector',
  conflict_of_interest: 'Conflict of Interest',
  manipulation_checker: 'Manipulation Checker',
  tax_law_agent: 'Tax Law Specialist',
  ip_law_agent: 'IP Law Specialist',
  criminal_law_agent: 'Criminal Law (BNS)',
  corporate_law_agent: 'Corporate Law (MCA)',
  family_law_agent: 'Family Law Specialist',
  property_law_agent: 'Property Law Specialist',
  labour_law_agent: 'Labour Code Specialist',
  constitutional_law_agent: 'Constitutional Law',
  consumer_law_agent: 'Consumer Protection',
  cyber_law_agent: 'Cyber Law (DPDP/IT)',
  rbi_agent: 'RBI Specialist',
  sebi_agent: 'SEBI Specialist',
  cci_agent: 'CCI Competition Law',
  rera_agent: 'RERA Real Estate',
  ngt_agent: 'NGT Environment',
  nclt_agent: 'NCLT Insolvency',
  cyber_tribunal: 'Cyber Appellate Tribunal',
  election_commission: 'Election Law Specialist',
  human_rights_agent: 'NHRC Human Rights',
  supreme_court_precedent: 'Supreme Court Precedent',
  finance_analyst: 'Finance Analyst',
  medical_researcher: 'Medical Researcher',
  tech_analyst: 'Technology Analyst',
  political_analyst: 'Political Analyst',
  historical_researcher: 'Historical Researcher',
  economic_analyst: 'Economic Analyst',
  scientific_analyst: 'Scientific Analyst',
  social_researcher: 'Social Researcher',
  fact_checker: 'Fact Checker',
  bias_detector: 'Bias Detector',
  sentiment_analyst: 'Sentiment Analyst',
  source_credibility: 'Source Credibility',
  logical_fallacy: 'Logical Fallacy Detector',
  data_verifier: 'Data Verifier',
  claim_extractor: 'Claim Extractor',
  evidence_ranker: 'Evidence Ranker',
  prosecutor: 'Public Prosecutor',
  defense_counsel: 'Defense Counsel',
  ethicist: 'Legal Ethicist',
  devils_advocate: "Devil's Advocate",
  mediator: 'ADR Mediator',
  cross_examiner: 'Cross Examiner',
  closing_argument: 'Closing Argument',
  rebuttal_agent: 'Rebuttal Specialist',
  supreme_judge: 'Supreme Chief Justice',
};

const GROUP_COUNTS: Record<string, number> = {
  security_left: 3,
  security_right: 3,
  legal: 10,
  indian_context: 10,
  research: 8,
  analysis: 8,
  debate: 8,
  supreme_judge: 1,
};

export function getAgentGroup(idOrIndex: string | number): string {
  let idx = typeof idOrIndex === 'number' ? idOrIndex : parseInt(idOrIndex, 10);
  if (isNaN(idx) && typeof idOrIndex === 'string') {
    idx = ALL_AGENT_IDS.indexOf(idOrIndex);
  }
  if (idx < 0) idx = 6; // default to legal

  if (idx < 3) return 'security_left';
  if (idx < 6) return 'security_right';
  if (idx < 16) return 'legal';
  if (idx < 26) return 'indian_context';
  if (idx < 34) return 'research';
  if (idx < 42) return 'analysis';
  if (idx < 50) return 'debate';
  return 'supreme_judge';
}

const groupIndexCounter: Record<string, number> = {};

export const AGENT_POSITIONS: Record<string, [number, number, number]> = {};
export const AGENT_FACE_ANGLES: Record<string, number> = {};

// Initialize positions for all 51 agents
ALL_AGENT_IDS.forEach((agentId, i) => {
  const group = getAgentGroup(i);
  const center = GROUP_CENTERS[group] || [0, 0, 0];

  if (group === 'supreme_judge') {
    const pos: [number, number, number] = [center[0], center[1], center[2]];
    AGENT_POSITIONS[agentId] = pos;
    AGENT_POSITIONS[i.toString()] = pos;
    AGENT_FACE_ANGLES[agentId] = 0;
    AGENT_FACE_ANGLES[i.toString()] = 0;
    return;
  }

  if (groupIndexCounter[group] === undefined) groupIndexCounter[group] = 0;
  const currentIdx = groupIndexCounter[group]++;
  const totalInGroup = GROUP_COUNTS[group] || 8;

  const angle = (currentIdx / totalInGroup) * Math.PI * 2;
  const radius = totalInGroup > 5 ? 2.8 : 2.0;

  const pos: [number, number, number] = [
    center[0] + Math.cos(angle) * radius,
    center[1],
    center[2] + Math.sin(angle) * radius,
  ];

  AGENT_POSITIONS[agentId] = pos;
  AGENT_POSITIONS[i.toString()] = pos;

  const faceAngle = Math.atan2(center[0] - pos[0], center[2] - pos[2]);
  AGENT_FACE_ANGLES[agentId] = faceAngle;
  AGENT_FACE_ANGLES[i.toString()] = faceAngle;
});

export const sharedMessengerPosition = {
  current: [0, 0, 0] as [number, number, number],
  direction: [0, 0, 1] as [number, number, number],
};
