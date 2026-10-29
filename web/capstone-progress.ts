// Keep this map in step with data/capstone.json (guarded by tests/capstone.test.mjs).
export const CAP_STAGE_QUESTIONS = {
  'adv-email': ['target', 'lure', 'authentication', 'attachment'],
  'adv-endpoint': ['first-process', 'persistence', 'c2'],
  'adv-network': ['interval', 'exfil', 'source-ip'],
  'adv-ad': ['group-event', 'compromised', 'credential-method', 'contain'],
} as const;

export function completedStages(solved: unknown): string[] {
  const ids = new Set(Array.isArray(solved) ? solved.filter((id): id is string => typeof id === 'string') : []);
  return Object.entries(CAP_STAGE_QUESTIONS).filter(([, questions]) => questions.every(id => ids.has(id))).map(([stage]) => stage);
}
