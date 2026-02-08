
// Shared types that may traverse layers (e.g. DTOs or Enums)

// Enums moved from llm_contracts to avoid circular deps
export enum WorkMode {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  OFFICE = 'OFFICE',
  ANY = 'ANY'
}

export enum SeniorityLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  C_LEVEL = 'C_LEVEL'
}

export enum RoleCategory {
  ENGINEERING = 'ENGINEERING',
  PRODUCT = 'PRODUCT',
  DESIGN = 'DESIGN',
  ANALYTICS = 'ANALYTICS',
  MANAGEMENT = 'MANAGEMENT',
  OTHER = 'OTHER'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  // Phase F2: Site Selection
  WAITING_FOR_SITE_SELECTION = 'WAITING_FOR_SITE_SELECTION',
  // Phase G1: Config Error
  LLM_CONFIG_ERROR = 'LLM_CONFIG_ERROR',
  RUNTIME_CONFIG_ERROR = 'RUNTIME_CONFIG_ERROR', 

  STARTING = 'STARTING',
  NAVIGATING = 'NAVIGATING',
  WAITING_FOR_HUMAN = 'WAITING_FOR_HUMAN',
  WAITING_FOR_HUMAN_ASSISTANCE = 'WAITING_FOR_HUMAN_ASSISTANCE', 
  LOGGED_IN_CONFIRMED = 'LOGGED_IN_CONFIRMED',
  WAITING_FOR_PROFILE_PAGE = 'WAITING_FOR_PROFILE_PAGE',
  EXTRACTING = 'EXTRACTING',
  PROFILE_CAPTURED = 'PROFILE_CAPTURED',
  
  // Stage 4 Statuses
  TARGETING_PENDING = 'TARGETING_PENDING',
  ANALYZING_PROFILE = 'ANALYZING_PROFILE', // NEW: LLM Active
  TARGETING_READY = 'TARGETING_READY',
  TARGETING_ERROR = 'TARGETING_ERROR',

  // Stage 5 Statuses (Search Configuration)
  NAVIGATING_TO_SEARCH = 'NAVIGATING_TO_SEARCH',
  SEARCH_PAGE_READY = 'SEARCH_PAGE_READY', 
  EXTRACTING_SEARCH_UI = 'EXTRACTING_SEARCH_UI',
  SEARCH_DOM_READY = 'SEARCH_DOM_READY', 
  
  ANALYZING_SEARCH_UI = 'ANALYZING_SEARCH_UI', // LLM Active
  
  WAITING_FOR_SEARCH_PREFS = 'WAITING_FOR_SEARCH_PREFS', 
  SEARCH_PREFS_SAVED = 'SEARCH_PREFS_SAVED',
  
  APPLY_PLAN_READY = 'APPLY_PLAN_READY', 
  
  // Phase F1: Resilience
  DOM_DRIFT_DETECTED = 'DOM_DRIFT_DETECTED',

  // Phase G3: Context & Pruning
  CONTEXT_NEAR_LIMIT = 'CONTEXT_NEAR_LIMIT', 
  CONTEXT_OVER_LIMIT = 'CONTEXT_OVER_LIMIT', 
  PRUNING_VIOLATION = 'PRUNING_VIOLATION',   

  // Phase A1.1 Execution Statuses
  APPLYING_FILTERS = 'APPLYING_FILTERS', 
  APPLY_STEP_DONE = 'APPLY_STEP_DONE',   
  APPLY_STEP_FAILED = 'APPLY_STEP_FAILED', 
  
  SEARCH_READY = 'SEARCH_READY', 

  // Phase B1
  VACANCIES_CAPTURED = 'VACANCIES_CAPTURED', 

  // Phase B2
  VACANCIES_DEDUPED = 'VACANCIES_DEDUPED', 

  // Phase C1
  PREFILTER_DONE = 'PREFILTER_DONE', 

  // Phase C2
  LLM_SCREENING_IN_PROGRESS = 'LLM_SCREENING_IN_PROGRESS', // NEW: LLM Active
  LLM_SCREENING_DONE = 'LLM_SCREENING_DONE', 

  // Phase D1
  EXTRACTING_VACANCIES = 'EXTRACTING_VACANCIES', 
  VACANCIES_EXTRACTED = 'VACANCIES_EXTRACTED', 

  // Phase D2
  EVALUATING_CANDIDATES = 'EVALUATING_CANDIDATES', // NEW: LLM Active
  EVALUATION_DONE = 'EVALUATION_DONE', 

  // Phase D2.2
  APPLY_QUEUE_READY = 'APPLY_QUEUE_READY', 

  // Phase E1.1
  FINDING_APPLY_BUTTON = 'FINDING_APPLY_BUTTON',
  APPLY_BUTTON_FOUND = 'APPLY_BUTTON_FOUND',
  
  // Phase E1.2
  APPLY_FORM_OPENED = 'APPLY_FORM_OPENED',

  // Phase E1.3
  APPLY_DRAFT_FILLED = 'APPLY_DRAFT_FILLED',
  
  // Phase E2
  GENERATING_QUESTIONNAIRE_ANSWERS = 'GENERATING_QUESTIONNAIRE_ANSWERS', // NEW: LLM Active
  FILLING_QUESTIONNAIRE = 'FILLING_QUESTIONNAIRE',

  // Phase E1.4 & E3
  SUBMITTING_APPLICATION = 'SUBMITTING_APPLICATION',
  APPLY_RETRYING = 'APPLY_RETRYING',
  APPLY_SUBMIT_SUCCESS = 'APPLY_SUBMIT_SUCCESS',
  APPLY_SUBMIT_FAILED = 'APPLY_SUBMIT_FAILED',
  APPLY_FAILED_HIDDEN = 'APPLY_FAILED_HIDDEN',
  APPLY_FAILED_SKIPPED = 'APPLY_FAILED_SKIPPED',

  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED' 
}

export enum HumanGateSignal {
  LOGIN_CONFIRMED = 'LOGIN_CONFIRMED',
  CANCEL = 'CANCEL'
}

export enum AppRoute {
  MODE_SELECTION = 'MODE_SELECTION',
  SITE_SELECTION = 'SITE_SELECTION',
  SETTINGS = 'SETTINGS',
  AGENT_RUNNER = 'AGENT_RUNNER'
}

export interface AgentConfig {
  mode: string;
  targetSite: string; // Legacy/Display
  activeSiteId?: string; // F2: Canonical Site ID
  
  // G1: LLM Configuration
  activeLLMProviderId?: string;
  llmProvider?: string; // Legacy fallback, prefer activeLLMProviderId
  apiKey?: string;
  
  // Runtime Config
  useMockBrowser?: boolean; // TOGGLE: True=Mock, False=Real
  browserProvider?: 'mock' | 'remote_node' | 'playwright' | 'electron_ipc' | 'mcp'; // Added 'mcp'
  mcpServerUrl?: string; // New: URL for MCP SSE Server
  nodeRunnerUrl?: string; // e.g. http://localhost:3001
  localGatewayUrl?: string; // e.g. http://localhost:11434
  chromeExecutablePath?: string; // Path to Brave/Chrome

  // User Constraints for Targeting
  minSalary?: number;
  currency?: string;
  city?: string;
  
  // Work Mode Strategy
  workMode?: WorkMode; // Deprecated in UI, kept for compat
  targetWorkModes?: WorkMode[]; // Multi-select support
  
  targetLanguages?: string[];
  // User Templates
  coverLetterTemplate?: string;
  autoCoverLetter?: boolean;
}
