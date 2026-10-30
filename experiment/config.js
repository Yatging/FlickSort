// Public deployment settings only. Never put service-role credentials here.
window.EXPERIMENT_CONFIG = {
  supabaseUrl: '',
  publishableKey: '',
  mode: 'test', // Use 'real' only after deployment acceptance checks.
  trialsPerCondition: 12,
  retentionDays: 90,
  contact: '请向现场研究员提出数据撤回要求，并提供 Session ID。'
};
