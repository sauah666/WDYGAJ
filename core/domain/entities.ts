

import { AgentStatus, WorkMode } from '../../types';
import { TargetingSpecV1 } from './llm_contracts';

// ... (previous interfaces remain unchanged until AgentState)

// --- Shared Value Objects ---

export interface TokenLedger {
  inputTokens: number;
  outputTokens: number;
  cacheHits: number;
  cacheMisses: number;
  calls: number;
  totalCostEstimateUSD?: number;
}

export interface SiteDefinition {
  id: string;
  label: string;
  baseUrl: string;
  enabled: boolean;
  storageNamespace: string;
  searchEntrypoint: { kind: 'url', url: string } | { kind: 'click', selector: string };
}

// --- Browser / Raw DOM Types ---

export interface RawFormField {
  id: string;
  tag: string;
  inputType?: string;
  label: string;
  attributes: Record<string, string>;
  isVisible: boolean;
  options?: { label: string; value: string }[];
}

export interface ApplyControl {
  label: string;
  selector: string;
  type: 'BUTTON' | 'LINK';
}

export interface VacancySalary {
  min: number | null;
  max: number | null;
  currency: string;
  gross: boolean;
}

// --- Search Configuration (Stage 5) ---

export interface SearchDOMSnapshotV1 {
  siteId: string;
  capturedAt: number;
  pageUrl: string;
  domVersion: number; // e.g. 1
  domHash: string; // quick comparison
  fields: RawFormField[];
}

export type SearchFieldType = 'KEYWORD' | 'SALARY' | 'LOCATION' | 'WORK_MODE' | 'SUBMIT' | 'UNKNOWN';
export type SemanticFieldType = SearchFieldType;

export interface SearchFieldDefinition {
  key: string;
  label: string;
  uiControlType: 'TEXT' | 'SELECT' | 'CHECKBOX' | 'RADIO' | 'BUTTON' | 'RANGE';
  semanticType: SearchFieldType;
  defaultBehavior: 'INCLUDE' | 'EXCLUDE' | 'RANGE' | 'CLICK';
  domHint?: string; // e.g. "name=text"
  confidence: number;
  options?: { label: string; value: string }[];
}

export interface SearchUISpecV1 {
  siteId: string;
  derivedAt: number;
  sourceUrl: string;
  version: string; // "v1"
  fields: SearchFieldDefinition[];
  unsupportedFields: string[]; // IDs of ignored fields
  assumptions: string[];
  tokenUsage?: { input: number; output: number };
}

export interface UserSearchPrefsV1 {
  siteId: string;
  updatedAt: number;
  additionalFilters: Record<string, any>; // key (from Spec) -> value
}

export type ApplyActionType = 'FILL_TEXT' | 'SELECT_OPTION' | 'TOGGLE_CHECKBOX' | 'CLICK' | 'UNKNOWN';

export interface SearchApplyStep {
  stepId: string;
  fieldKey: string;
  actionType: ApplyActionType;
  value: any;
  rationale: string;
  priority: number;
}

export interface SearchApplyPlanV1 {
  siteId: string;
  createdAt: number;
  steps: SearchApplyStep[];
}

// --- Execution & Verification Types (Phase A) ---

export interface ExecutionResult {
  success: boolean;
  observedValue?: any;
  error?: string;
}

export type ExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface AppliedStepResult extends ExecutionResult {
  stepId: string;
  fieldKey: string;
  timestamp: number;
  actionType: ApplyActionType;
  intendedValue: any;
}

export interface AppliedFiltersSnapshotV1 {
  siteId: string;
  createdAt: number;
  lastUpdatedAt: number;
  overallStatus: ExecutionStatus;
  results: AppliedStepResult[];
}

export type VerificationStatus = 'MATCH' | 'MISMATCH' | 'UNKNOWN';
export type VerificationSource = 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN';

export interface ControlVerificationResult {
  fieldKey: string;
  expectedValue: any;
  actualValue: any;
  source: VerificationSource;
  status: VerificationStatus;
}

export interface FiltersAppliedVerificationV1 {
  siteId: string;
  verifiedAt: number;
  verified: boolean; // True if all criticals match
  results: ControlVerificationResult[];
  mismatches: ControlVerificationResult[];
}

// --- Vacancy & Processing Types (Phase B) ---

export interface VacancyCardV1 {
  id: string; // Internal ID
  siteId: string;
  externalId: string | null;
  url: string;
  title: string;
  company: string | null;
  city: string | null;
  workMode: string; // raw string
  salary: VacancySalary | null;
  publishedAt: string | null;
  cardHash: string;
}

export interface VacancyCardBatchV1 {
  batchId: string;
  siteId: string;
  capturedAt: number;
  queryFingerprint: string; // Hash of search URL/params
  cards: VacancyCardV1[];
  pageCursor: string | null;
}

export enum VacancyDecision {
  SELECTED = 'SELECTED',
  SKIP_SEEN = 'SKIP_SEEN',
  SKIP_FILTERED = 'SKIP_FILTERED'
}

export interface DedupedCardResult {
  cardId: string;
  decision: VacancyDecision;
  dedupKey: string;
}

export interface DedupedVacancyBatchV1 {
  id: string;
  batchId: string; // Parent batch
  siteId: string;
  processedAt: number;
  userCity: string | null;
  results: DedupedCardResult[];
  summary: {
    total: number;
    selected: number;
    duplicates: number;
    seen: number;
  };
  endOfResults?: boolean;
}

export interface SeenVacancyIndexV1 {
  siteId: string;
  lastUpdatedAt: number;
  seenKeys: string[];
}

// --- Prefilter Types (Phase C) ---

export type PrefilterDecisionType = 'READ_CANDIDATE' | 'DEFER' | 'REJECT';

export interface PreFilterDecisionV1 {
  cardId: string;
  decision: PrefilterDecisionType;
  reasons: string[];
  score: number;
  gates: {
    salary: 'PASS' | 'FAIL' | 'UNKNOWN';
    workMode: 'PASS' | 'FAIL' | 'UNKNOWN';
  };
}

export interface PreFilterResultBatchV1 {
  id: string;
  siteId: string;
  inputBatchId: string;
  processedAt: number;
  thresholds: { read: number; defer: number };
  results: PreFilterDecisionV1[];
  summary: {
    read: number;
    defer: number;
    reject: number;
  };
  endOfResults?: boolean;
}

export interface LLMDecisionV1 {
  cardId: string;
  decision: 'READ' | 'DEFER' | 'IGNORE';
  confidence: number;
  reasons: string[];
}

export interface LLMDecisionBatchV1 {
  id: string;
  siteId: string;
  inputPrefilterBatchId: string;
  decidedAt: number;
  modelId: string;
  decisions: LLMDecisionV1[];
  summary: {
    read: number;
    defer: number;
    ignore: number;
  };
  tokenUsage: { input: number; output: number };
}

// --- Extraction & Eval Types (Phase D) ---

export interface VacancyExtractV1 {
  vacancyId: string;
  siteId: string;
  url: string;
  extractedAt: number;
  sections: {
    requirements: string[];
    responsibilities: string[];
    conditions: string[];
    salary?: VacancySalary;
    workMode?: string;
  };
  extractionStatus: VacancyExtractionStatus;
}

export type VacancyExtractionStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';

export interface VacancyExtractionBatchV1 {
  id: string;
  siteId: string;
  inputLLMBatchId: string;
  processedAt: number;
  results: VacancyExtractV1[];
  summary: { total: number; success: number; failed: number };
}

export interface LLMVacancyEvalResult {
  vacancyId: string;
  decision: 'APPLY' | 'SKIP' | 'NEEDS_HUMAN';
  confidence: number;
  reasons: string[];
  risks: string[];
  factsUsed: string[];
}

export interface LLMVacancyEvalBatchV1 {
  id: string;
  siteId: string;
  inputExtractionBatchId: string;
  decidedAt: number;
  modelId: string;
  results: LLMVacancyEvalResult[];
  summary: {
    apply: number;
    skip: number;
    needsHuman: number;
  };
  tokenUsage: { input: number; output: number };
  status: 'OK' | 'FAILED';
}

// --- Apply Queue & Execution (Phase E) ---

export interface ApplyQueueItem {
  vacancyId: string;
  url: string;
  decision: 'APPLY' | 'NEEDS_HUMAN';
  status: 'PENDING' | 'APPLYING' | 'APPLIED' | 'FAILED' | 'SKIPPED';
  generatedCoverLetter?: string;
}

export interface ApplyQueueV1 {
  id: string;
  siteId: string;
  inputEvalBatchId: string;
  createdAt: number;
  items: ApplyQueueItem[];
  summary: { total: number; pending: number; applied: number; failed: number };
}

export interface ApplyEntrypointProbeV1 {
  taskId: string;
  vacancyUrl: string;
  foundControls: ApplyControl[];
  blockers: {
    requiresLogin: boolean;
    applyNotAvailable: boolean;
    unknownLayout: boolean;
  };
  probedAt: number;
}

export interface ApplyFormProbeV1 {
  taskId: string;
  vacancyUrl: string;
  entrypointUsed: string;
  applyUiKind: 'MODAL' | 'PAGE' | 'UNKNOWN';
  detectedFields: {
    coverLetterTextarea: boolean;
    resumeSelector: boolean;
    submitButtonPresent: boolean;
    extraQuestionnaireDetected: boolean;
  };
  safeLocators: {
    coverLetterHint: string | null;
    submitHint: string | null;
  };
  successTextHints: string[];
  blockers: {
    requiresLogin: boolean;
    captchaOrAntibot: boolean;
    applyNotAvailable: boolean;
    unknownLayout: boolean;
  };
  scannedAt: number;
}

export type CoverLetterSource = 'GENERATED' | 'TEMPLATE' | 'DEFAULT' | 'NONE';
export type ApplyBlockedReason = 'AUTH_REQUIRED' | 'CAPTCHA' | 'COMPLEX_FORM' | 'UNKNOWN';

export interface QuestionnaireField {
    id: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    selector: string;
}

export interface QuestionnaireAnswer {
    fieldId: string;
    value: string | boolean | number | string[] | null;
}

export interface QuestionnaireSnapshotV1 {
    vacancyId: string;
    siteId: string;
    pageUrl: string;
    capturedAt: number;
    fields: QuestionnaireField[];
    questionnaireHash: string;
}

export interface QuestionnaireAnswerSetV1 {
    id: string;
    questionnaireHash: string;
    vacancyId: string;
    generatedAt: number;
    answers: { fieldId: string; value: any; confidence: number; risks: string[] }[];
    globalRisks: string[];
}

export interface ApplyDraftSnapshotV1 {
  vacancyId: string;
  siteId: string;
  createdAt: number;
  coverLetterFieldFound: boolean;
  coverLetterFilled: boolean;
  coverLetterReadbackHash: string | null;
  coverLetterSource: CoverLetterSource;
  
  questionnaireFound: boolean;
  questionnaireFilled: boolean;
  questionnaireSnapshot?: QuestionnaireSnapshotV1;
  questionnaireAnswers?: QuestionnaireAnswerSetV1;
  
  formStateSummary: string;
  blockedReason: ApplyBlockedReason | null;
}

export type ApplyFailureReason = 'SUBMIT_TIMEOUT' | 'ERROR_MESSAGE_DETECTED' | 'CAPTCHA' | 'UNKNOWN';

export interface ApplySubmitReceiptV1 {
  receiptId: string;
  vacancyId: string;
  siteId: string;
  submittedAt: number;
  submitAttempts: number;
  successConfirmed: boolean;
  confirmationSource: 'UI_TEXT' | 'URL_CHANGE' | 'unknown';
  confirmationEvidence: string | null;
  finalQueueStatus: 'APPLIED' | 'FAILED';
  failureReason: ApplyFailureReason | null;
}

export interface ApplyAttemptState {
    vacancyId: string;
    attemptCount: number;
    lastAttemptAt: number;
    history: { status: string; timestamp: number; error?: string }[];
}

// --- Resilience (Phase F1) ---

export interface DOMFingerprintV1 {
  siteId: string;
  pageType: 'search' | 'vacancy' | 'apply_form';
  capturedAt: number;
  domVersion: number;
  structuralHash: string;
}

export interface DomDriftEventV1 {
  siteId: string;
  pageType: string;
  detectedAt: number;
  expectedHash: string;
  observedHash: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actionRequired: 'NONE' | 'RE_SCAN' | 'HUMAN_CHECK';
}

// --- Governance (Phase G3) ---

export interface PruningPolicyV1 {
  forbidRawHtml: true;
  maxCharsPerField: number; 
  maxItemsPerBatch: number;
  minItemsPerBatch: number;
}

export const DEFAULT_PRUNING_POLICY: PruningPolicyV1 = {
  forbidRawHtml: true,
  maxCharsPerField: 10000,
  maxItemsPerBatch: 15,
  minItemsPerBatch: 10
};

export interface CompactionPolicyV1 {
  maxLogItems: number; 
  keptLogHead: number; 
  keptLogTail: number; 
}

export const DEFAULT_COMPACTION_POLICY: CompactionPolicyV1 = {
  maxLogItems: 50,
  keptLogHead: 5,
  keptLogTail: 5
};

export interface ContextBudgetV1 {
  softTokenLimit: number;
  hardTokenLimit: number;
}

export interface CompactionSummaryV1 {
  id: string;
  createdAt: number;
  scope: 'session';
  source: string[];
  summary: {
    logCountBefore: number;
    lastStatus: string;
    pipelineStats?: string;
    notes: string;
  };
}

// --- Profile & Agent State ---

export interface ProfileSnapshot {
  siteId: string;
  capturedAt: number;
  sourceUrl: string;
  rawContent: string;
  contentHash: string;
}

export interface AgentState {
  status: AgentStatus;
  currentUrl: string;
  logs: string[];
  isPaused: boolean; // New Flag for Pause Control
  
  // Observability
  tokenLedger: TokenLedger;
  
  // Phase G3
  contextHealth?: {
      estimatedTokens: number;
      softLimit: number;
      hardLimit: number;
      status: 'OK' | 'NEAR_LIMIT' | 'OVER_LIMIT';
  };
  lastCompaction?: {
      summaryId: string;
      timestamp: number;
  };

  // Phase F1
  activeDriftEvent: DomDriftEventV1 | null;
  
  // Data
  activeProfileSnapshot?: ProfileSnapshot;
  activeTargetingSpec?: TargetingSpecV1;

  // Search Config
  activeSearchDOMSnapshot?: SearchDOMSnapshotV1;
  activeSearchUISpec?: SearchUISpecV1;
  activeSearchPrefs?: UserSearchPrefsV1;
  activeSearchApplyPlan?: SearchApplyPlanV1;

  // Execution (Phase A)
  activeAppliedFilters?: AppliedFiltersSnapshotV1;
  activeVerification?: FiltersAppliedVerificationV1;

  // Vacancies (Phase B)
  activeVacancyBatch?: VacancyCardBatchV1;
  activeDedupedBatch?: DedupedVacancyBatchV1;

  // Screening (Phase C)
  activePrefilterBatch?: PreFilterResultBatchV1;
  activeLLMBatch?: LLMDecisionBatchV1;

  // Extraction/Eval (Phase D)
  activeExtractionBatch?: VacancyExtractionBatchV1;
  activeEvalBatch?: LLMVacancyEvalBatchV1;
  activeApplyQueue?: ApplyQueueV1;
  
  // Apply (Phase E)
  activeApplyProbe?: ApplyEntrypointProbeV1;
  activeApplyFormProbe?: ApplyFormProbeV1;
  activeApplyDraft?: ApplyDraftSnapshotV1;
  activeQuestionnaireSnapshot?: QuestionnaireSnapshotV1;
  activeQuestionnaireAnswers?: QuestionnaireAnswerSetV1;
}

export const createInitialAgentState = (): AgentState => ({
  status: AgentStatus.IDLE,
  currentUrl: '',
  logs: [],
  isPaused: false,
  tokenLedger: { inputTokens: 0, outputTokens: 0, cacheHits: 0, cacheMisses: 0, calls: 0 },
  activeDriftEvent: null
});
