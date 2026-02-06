// Layer: DOMAIN
// Purpose: Enterprise business rules and core entities.
// Allowed: Pure TS classes/interfaces. No external dependencies.
// Forbidden: Framework code, UI logic, Databases.

import { AgentStatus } from '../../types';
import { TargetingSpecV1, WorkMode } from './llm_contracts';

// --- Stage 5: Site Definitions & Strategies ---

export interface SearchEntryStrategy {
  knownUrls: string[];         // e.g. ["https://hh.ru/search/vacancy/advanced"]
  keywords: string[];          // e.g. ["расширенный поиск", "advanced search"]
  maxSteps: number;            // How many clicks to try before giving up
}

export interface SiteDefinition {
  id: string;
  name: string;
  searchStrategy: SearchEntryStrategy;
}

// --- Stage 5: Search Configuration Entities ---

export type SearchFieldType = 'CHECKBOX' | 'SELECT' | 'RANGE' | 'TEXT' | 'BUTTON' | 'UNKNOWN';
export type SemanticFieldType = 'LOCATION' | 'SALARY' | 'WORK_MODE' | 'SCHEDULE' | 'KEYWORD' | 'EXPERIENCE' | 'SUBMIT' | 'OTHER';

export interface SearchFieldOption {
  value: string;
  label: string;
}

export interface SearchFieldDefinition {
  key: string;        // Unique internal ID for the field (e.g. "salary_input")
  label: string;      // Visual label
  
  // Technical Type
  uiControlType: SearchFieldType;
  
  // Semantic Analysis Results
  semanticType: SemanticFieldType;
  options?: SearchFieldOption[]; // For SELECT type
  
  // Behavior rules derived by LLM
  defaultBehavior: 'IGNORE' | 'INCLUDE' | 'EXCLUDE' | 'RANGE' | 'CLICK'; 
  
  // Implementation detail (data-qa, name, etc.) - handled by Adapters later
  domHint?: string;   
  confidence: number; // 0.0 - 1.0
}

export interface SearchUISpecV1 {
  siteId: string;
  derivedAt: number;
  sourceUrl: string;
  fields: SearchFieldDefinition[];
  unsupportedFields: string[]; // List of field IDs that couldn't be mapped
  assumptions: string[];
  version: string; // 'v1'
}

export interface UserSearchPrefsV1 {
  siteId: string;
  updatedAt: number;
  // Core overrides (normalized)
  workMode?: WorkMode;
  city?: string;
  minSalary?: number;
  // Dynamic overrides mapped to SearchUISpec keys
  additionalFilters: Record<string, string | number | boolean | string[]>;
}

// --- Stage 5.2.3: DOM Snapshot (Raw) ---

export interface RawFormField {
  id: string; // generated UUID or stable hash
  tag: 'input' | 'select' | 'textarea' | 'button' | 'unknown';
  inputType?: string; // for input tag
  label?: string; // Associated label text
  placeholder?: string;
  attributes: Record<string, string>; // name, id, class, data-*
  options?: { value: string; label: string }[]; // for select
  isVisible: boolean;
}

export interface SearchDOMSnapshotV1 {
  siteId: string;
  capturedAt: number;
  pageUrl: string;
  domVersion: number;
  fields: RawFormField[];
}

// --- Stage 5.4: Apply Plan ---

export type ApplyActionType = 'FILL_TEXT' | 'SELECT_OPTION' | 'TOGGLE_CHECKBOX' | 'CLICK' | 'UNKNOWN';

export interface SearchApplyStep {
  stepId: string;
  fieldKey: string;
  actionType: ApplyActionType;
  value: string | number | boolean | string[];
  rationale: string;
  priority: number; // Internal for sorting
}

export interface SearchApplyPlanV1 {
  siteId: string;
  createdAt: number;
  steps: SearchApplyStep[];
}

// --- Phase A1.1: Execution Tracking ---

export interface ExecutionResult {
    success: boolean;
    observedValue?: any;
    error?: string;
}

export interface AppliedStepResult extends ExecutionResult {
  stepId: string;
  fieldKey: string;
  timestamp: number;
  actionType: ApplyActionType;
  intendedValue: any;
}

export type ExecutionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface AppliedFiltersSnapshotV1 {
  siteId: string;
  createdAt: number;
  lastUpdatedAt: number;
  overallStatus: ExecutionStatus;
  results: AppliedStepResult[];
}

// --- Phase A2.1: Verification ---

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
  verified: boolean; // true if NO mismatches (UNKNOWN is tolerated)
  results: ControlVerificationResult[];
  mismatches: ControlVerificationResult[];
}

// --- Phase B1: Vacancy Card Collection ---

export interface VacancySalary {
  min: number | null;
  max: number | null;
  currency: string | null;
  gross?: boolean;
}

export interface VacancyCardV1 {
  id: string; // Internal UUID
  siteId: string;
  externalId: string | null; // e.g. from data-qa or url
  url: string;
  title: string;
  company: string | null;
  city: string | null;
  workMode: 'remote' | 'hybrid' | 'office' | 'unknown';
  salary: VacancySalary | null;
  publishedAt: string | null; // human string, e.g. "2 hours ago"
  cardHash: string; // SHA-256 of url+title+company
}

export interface VacancyCardBatchV1 {
  batchId: string;
  siteId: string;
  capturedAt: number;
  queryFingerprint: string; // Hash of current filters/URL
  cards: VacancyCardV1[];
  pageCursor: string | null; // Next page URL or offset
}

// --- Phase B2: Dedup & City Preference ---

export enum VacancyDecision {
  SELECTED = 'SELECTED',
  DUPLICATE = 'DUPLICATE',
  SKIP_SEEN = 'SKIP_SEEN'
}

export interface DedupedCardResult {
  cardId: string; // Ref to VacancyCardV1.id
  decision: VacancyDecision;
  dedupKey: string; // key used for grouping
}

export interface DedupedVacancyBatchV1 {
  id: string;
  batchId: string; // Parent batch
  siteId: string;
  processedAt: number;
  userCity: string | null; // Context used for filtering
  results: DedupedCardResult[];
  summary: {
    total: number;
    selected: number;
    duplicates: number;
    seen: number;
  };
}

export interface SeenVacancyIndexV1 {
  siteId: string;
  lastUpdatedAt: number;
  seenKeys: string[]; // List of dedupKeys that have been SELECTED previously
}

// --- Phase C1: Script Prefilter ---

export type PrefilterDecisionType = 'READ_CANDIDATE' | 'DEFER' | 'REJECT';

export interface PreFilterDecisionV1 {
  cardId: string;
  decision: PrefilterDecisionType;
  reasons: string[]; // e.g., ["salary_too_low", "exact_title_match"]
  score: number;
  gates: {
    salary: 'PASS' | 'FAIL' | 'UNKNOWN';
    workMode: 'PASS' | 'FAIL' | 'UNKNOWN';
  };
}

export interface PreFilterResultBatchV1 {
  id: string;
  siteId: string;
  inputBatchId: string; // Ref to DedupedBatch
  processedAt: number;
  thresholds: { read: number; defer: number };
  results: PreFilterDecisionV1[];
  summary: {
    read: number;
    defer: number;
    reject: number;
  };
}

// --- Phase C2: LLM Batch Screening ---

export type LLMDecisionType = 'READ' | 'DEFER' | 'IGNORE';

export interface LLMDecisionV1 {
  cardId: string;
  decision: LLMDecisionType;
  confidence: number; // 0.0 - 1.0
  reasons: string[]; // short codes or phrases
}

export interface LLMDecisionBatchV1 {
  id: string;
  siteId: string;
  inputPrefilterBatchId: string; // Link to C1
  decidedAt: number;
  modelId: string; // e.g. "mock-llm", "gemini-2.0-flash"
  decisions: LLMDecisionV1[];
  summary: {
    read: number;
    defer: number;
    ignore: number;
  };
  tokenUsage: {
    input: number;
    output: number;
  };
  // Phase D1 queues
  read_queue?: string[]; // cardIds
  defer_queue?: string[];
  ignore_queue?: string[];
}

// --- Phase D1: Extraction ---

export type VacancyExtractionStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';

export interface VacancyExtractV1 {
  vacancyId: string; // ref to VacancyCardV1
  siteId: string;
  url: string;
  extractedAt: number;
  sections: {
    requirements: string[]; // extracted bullets/paragraphs
    responsibilities: string[]; // extracted bullets
    conditions: string[]; // extracted bullets
    salary?: VacancySalary; // refined salary from page
    workMode?: 'remote' | 'hybrid' | 'office' | 'unknown'; // confirmed from page
  };
  extractionStatus: VacancyExtractionStatus;
}

export interface VacancyExtractionBatchV1 {
  id: string;
  siteId: string;
  inputLLMBatchId: string;
  processedAt: number;
  results: VacancyExtractV1[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// --- Phase D2: LLM Eval Batch ---

export type VacancyEvalDecision = 'APPLY' | 'SKIP' | 'NEEDS_HUMAN';

export interface LLMVacancyEvalResult {
  vacancyId: string;
  decision: VacancyEvalDecision;
  confidence: number;
  reasons: string[]; // e.g. "strong_stack_match", "salary_fit"
  risks: string[]; // e.g. "questionnaire_detected", "salary_missing"
  factsUsed: string[]; // e.g. "requirements", "conditions"
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
  tokenUsage: {
    input: number;
    output: number;
  };
  status: 'OK' | 'FAILED_SCHEMA' | 'FAILED_CALL';
}

// --- Phase D2.2: Apply Queue ---

export type ApplyQueueStatus = 'PENDING' | 'IN_PROGRESS' | 'APPLIED' | 'FAILED' | 'SKIPPED';

export interface ApplyQueueItem {
  vacancyId: string;
  url: string;
  decision: VacancyEvalDecision; // Should be 'APPLY' mostly
  status: ApplyQueueStatus;
  generatedCoverLetter?: string; // Phase E1 will populate this
  applicationResult?: string; // timestamp or result ID
}

export interface ApplyQueueV1 {
  id: string;
  siteId: string;
  inputEvalBatchId: string;
  createdAt: number;
  items: ApplyQueueItem[];
  summary: {
    total: number;
    pending: number;
    applied: number;
    failed: number;
  };
}

// --- Phase E1.1: Apply Entrypoint Probe ---

export interface ApplyControl {
    label: string;
    selector: string; // hint
    type: 'BUTTON' | 'LINK' | 'MENU' | 'UNKNOWN';
}

export interface ApplyEntrypointProbeV1 {
    taskId: string; // vacancyId
    vacancyUrl: string;
    foundControls: ApplyControl[];
    blockers: {
        requiresLogin: boolean;
        applyNotAvailable: boolean;
        unknownLayout: boolean;
    };
    probedAt: number;
}

// --- Phase E1.2: Apply Form Probe ---

export interface ApplyFormProbeV1 {
    taskId: string;
    vacancyUrl: string;
    entrypointUsed: string; // label of clicked control
    applyUiKind: 'MODAL' | 'PAGE' | 'INLINE' | 'UNKNOWN';
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
    successTextHints?: string[]; // Markers to check for after submit
    blockers: {
        requiresLogin: boolean;
        captchaOrAntibot: boolean;
        applyNotAvailable: boolean;
        unknownLayout: boolean;
    };
    scannedAt: number;
}

// --- Phase E2: Questionnaire Handling ---

export interface QuestionnaireField {
    id: string;
    type: 'TEXT' | 'TEXTAREA' | 'RADIO' | 'CHECKBOX' | 'SELECT' | 'FILE' | 'UNKNOWN';
    label: string;
    options?: string[]; // For SELECT/RADIO
    required: boolean;
    selector: string; // Abstract handle
}

export interface QuestionnaireSnapshotV1 {
    vacancyId: string;
    siteId: string;
    pageUrl: string;
    capturedAt: number;
    fields: QuestionnaireField[];
    questionnaireHash: string; // to detect duplicates/idempotency
}

export interface QuestionnaireAnswer {
    fieldId: string;
    value: string | boolean | number | string[] | null;
    confidence: number; // 0..1
    factsUsed: string[];
    risks: string[];
}

export interface QuestionnaireAnswerSetV1 {
    id: string;
    questionnaireHash: string;
    vacancyId: string;
    generatedAt: number;
    answers: QuestionnaireAnswer[];
    globalRisks: string[];
}

// --- Phase E3: Retry & Failover ---

export type ApplyStage = 'STARTED' | 'QUESTIONNAIRE' | 'SUBMITTING' | 'CONFIRMING' | 'DONE' | 'FAILED';
export type TerminalAction = 'NONE' | 'HIDDEN' | 'SKIPPED';

export interface ApplyAttemptState {
    vacancyId: string;
    siteId: string;
    applyStage: ApplyStage;
    retryCount: number; // 0, 1, 2, 3
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    lastAttemptAt: number;
    terminalAction: TerminalAction;
}

// --- Phase E1.3: Apply Draft Snapshot ---

export type ApplyBlockedReason = 'VACANCY_NOT_OPENED' | 'APPLY_ENTRYPOINT_NOT_FOUND' | 'FORM_NOT_REACHED' | 'FIELD_NOT_FOUND' | 'READBACK_FAILED' | null;
export type CoverLetterSource = 'GENERATED' | 'TEMPLATE' | 'DEFAULT' | 'NONE';

export interface ApplyDraftSnapshotV1 {
  vacancyId: string;
  siteId: string;
  createdAt: number;
  coverLetterFieldFound: boolean;
  coverLetterFilled: boolean;
  coverLetterReadbackHash: string | null;
  coverLetterSource?: CoverLetterSource; // Track where the text came from
  
  // Phase E2: Questionnaire State
  questionnaireFound: boolean;
  questionnaireFilled: boolean;
  questionnaireSnapshot?: QuestionnaireSnapshotV1;
  questionnaireAnswers?: QuestionnaireAnswerSetV1;

  formStateSummary: string; // Short desc e.g. "Visible: textarea, submit"
  blockedReason: ApplyBlockedReason;
}

// --- Phase E1.4: Apply Submit Receipt ---

export type ApplyFailureReason = 'NO_CONFIRMATION' | 'SUBMIT_BUTTON_NOT_FOUND' | 'FORM_NOT_REACHED' | 'NAV_CHANGED' | 'TIMEOUT' | 'UNKNOWN';

export interface ApplySubmitReceiptV1 {
  receiptId: string;
  vacancyId: string;
  siteId: string;
  submittedAt: number;
  submitAttempts: number;
  successConfirmed: boolean;
  confirmationSource: "text_hint" | "url_change" | "dom_marker" | "unknown";
  confirmationEvidence: string | null;
  finalQueueStatus: "APPLIED" | "FAILED";
  failureReason: ApplyFailureReason | null;
}

// --- Core State ---

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentUrl: string | null;
  lastSnapshotTimestamp: number | null;
  logs: string[];
  
  // Data Containers
  activeTargetingSpec?: TargetingSpecV1 | null; // Stage 4: Job Requirements
  activeSearchDOMSnapshot?: SearchDOMSnapshotV1 | null; // Stage 5.2.3: Raw DOM
  activeSearchUISpec?: SearchUISpecV1 | null;   // Stage 5.3: Processed Spec
  activeSearchPrefs?: UserSearchPrefsV1 | null; // Stage 5.3: User Choices
  activeSearchApplyPlan?: SearchApplyPlanV1 | null; // Stage 5.4: Execution Plan
  activeAppliedFilters?: AppliedFiltersSnapshotV1 | null; // Phase A1.1: Execution Progress
  activeVerification?: FiltersAppliedVerificationV1 | null; // Phase A2.1: Verification Report
  activeVacancyBatch?: VacancyCardBatchV1 | null; // Phase B1: Captured Vacancies
  activeDedupedBatch?: DedupedVacancyBatchV1 | null; // Phase B2: Deduped Vacancies
  activePrefilterBatch?: PreFilterResultBatchV1 | null; // Phase C1: Script Filter Results
  activeLLMBatch?: LLMDecisionBatchV1 | null; // Phase C2: LLM Screening Results
  activeExtractionBatch?: VacancyExtractionBatchV1 | null; // Phase D1: Extracted Details
  activeEvalBatch?: LLMVacancyEvalBatchV1 | null; // Phase D2: Evaluated Vacancies
  activeApplyQueue?: ApplyQueueV1 | null; // Phase D2.2: Queue for Auto Apply
  activeApplyProbe?: ApplyEntrypointProbeV1 | null; // Phase E1.1: Transient Probe Result
  activeApplyFormProbe?: ApplyFormProbeV1 | null; // Phase E1.2: Transient Form Probe
  activeApplyDraft?: ApplyDraftSnapshotV1 | null; // Phase E1.3: Transient Draft Result
  
  // Phase E2 & E3
  activeQuestionnaireSnapshot?: QuestionnaireSnapshotV1 | null;
  activeQuestionnaireAnswers?: QuestionnaireAnswerSetV1 | null;
  activeApplyAttempt?: ApplyAttemptState | null;
}

export interface ProfileSnapshot {
  siteId: string;      // e.g. 'hh.ru'
  capturedAt: number;  // timestamp
  sourceUrl: string;   // where we got it
  rawContent: string;  // minimal text content
  contentHash: string; // simple hash to detect changes
}

export const createInitialAgentState = (): AgentState => ({
  id: crypto.randomUUID(),
  status: AgentStatus.IDLE,
  currentUrl: null,
  lastSnapshotTimestamp: null,
  logs: [],
  activeTargetingSpec: null,
  activeSearchDOMSnapshot: null,
  activeSearchUISpec: null,
  activeSearchPrefs: null,
  activeSearchApplyPlan: null,
  activeAppliedFilters: null,
  activeVerification: null,
  activeVacancyBatch: null,
  activeDedupedBatch: null,
  activePrefilterBatch: null,
  activeLLMBatch: null,
  activeExtractionBatch: null,
  activeEvalBatch: null,
  activeApplyQueue: null,
  activeApplyProbe: null,
  activeApplyFormProbe: null,
  activeApplyDraft: null,
  activeQuestionnaireSnapshot: null,
  activeQuestionnaireAnswers: null,
  activeApplyAttempt: null
});