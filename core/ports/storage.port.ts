
// Layer: PORTS
// Purpose: Define contracts for persistence.

import { AgentConfig } from '../../types';
import { AgentState, ProfileSnapshot, SearchDOMSnapshotV1, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, AppliedFiltersSnapshotV1, FiltersAppliedVerificationV1, VacancyCardBatchV1, SeenVacancyIndexV1, DedupedVacancyBatchV1, PreFilterResultBatchV1, LLMDecisionBatchV1, VacancyExtractionBatchV1, LLMVacancyEvalBatchV1, ApplyQueueV1, ApplyDraftSnapshotV1, ApplySubmitReceiptV1 } from '../domain/entities';
import { TargetingSpecV1 } from '../domain/llm_contracts';

export interface StoragePort {
  // Config
  saveConfig(config: AgentConfig): Promise<void>;
  getConfig(): Promise<AgentConfig | null>;

  // State
  saveAgentState(state: AgentState): Promise<void>;
  getAgentState(): Promise<AgentState | null>;

  // Profile Data
  saveProfile(profile: ProfileSnapshot): Promise<void>;
  getProfile(siteId: string): Promise<ProfileSnapshot | null>;
  resetProfile(siteId: string): Promise<void>;

  // Targeting Data (Stage 4)
  saveTargetingSpec(siteId: string, spec: TargetingSpecV1): Promise<void>;
  getTargetingSpec(siteId: string): Promise<TargetingSpecV1 | null>;
  deleteTargetingSpec(siteId: string): Promise<void>; // Cascade delete

  // Search Configuration (Stage 5)
  // 5.2.3 Raw Snapshot
  saveSearchDOMSnapshot(siteId: string, snapshot: SearchDOMSnapshotV1): Promise<void>;
  getSearchDOMSnapshot(siteId: string): Promise<SearchDOMSnapshotV1 | null>;

  // 5.3 Processed Spec
  saveSearchUISpec(siteId: string, spec: SearchUISpecV1): Promise<void>;
  getSearchUISpec(siteId: string): Promise<SearchUISpecV1 | null>;
  deleteSearchUISpec(siteId: string): Promise<void>;

  // 5.3 User Prefs
  saveUserSearchPrefs(siteId: string, prefs: UserSearchPrefsV1): Promise<void>;
  getUserSearchPrefs(siteId: string): Promise<UserSearchPrefsV1 | null>;
  deleteUserSearchPrefs(siteId: string): Promise<void>;

  // 5.4 Apply Plan
  saveSearchApplyPlan(siteId: string, plan: SearchApplyPlanV1): Promise<void>;
  getSearchApplyPlan(siteId: string): Promise<SearchApplyPlanV1 | null>;
  deleteSearchApplyPlan(siteId: string): Promise<void>;

  // Phase A1.1 Execution Snapshot
  saveAppliedFiltersSnapshot(siteId: string, snapshot: AppliedFiltersSnapshotV1): Promise<void>;
  getAppliedFiltersSnapshot(siteId: string): Promise<AppliedFiltersSnapshotV1 | null>;
  deleteAppliedFiltersSnapshot(siteId: string): Promise<void>;

  // Phase A2.1 Verification
  saveFiltersAppliedVerification(siteId: string, verification: FiltersAppliedVerificationV1): Promise<void>;
  getFiltersAppliedVerification(siteId: string): Promise<FiltersAppliedVerificationV1 | null>;
  deleteFiltersAppliedVerification(siteId: string): Promise<void>;

  // Phase B1: Vacancy Batches
  saveVacancyCardBatch(siteId: string, batch: VacancyCardBatchV1): Promise<void>;
  getVacancyCardBatch(siteId: string, batchId: string): Promise<VacancyCardBatchV1 | null>;
  getRecentVacancyCardBatches(siteId: string, limit: number): Promise<VacancyCardBatchV1[]>;

  // Phase B2: Dedup
  saveSeenVacancyIndex(siteId: string, index: SeenVacancyIndexV1): Promise<void>;
  getSeenVacancyIndex(siteId: string): Promise<SeenVacancyIndexV1 | null>;
  saveDedupedVacancyBatch(siteId: string, batch: DedupedVacancyBatchV1): Promise<void>;
  getDedupedVacancyBatch(siteId: string, batchId: string): Promise<DedupedVacancyBatchV1 | null>;

  // Phase C1: Prefilter
  savePreFilterResultBatch(siteId: string, batch: PreFilterResultBatchV1): Promise<void>;
  getPreFilterResultBatch(siteId: string, batchId: string): Promise<PreFilterResultBatchV1 | null>;

  // Phase C2: LLM Decision Batch
  saveLLMDecisionBatch(siteId: string, batch: LLMDecisionBatchV1): Promise<void>;
  getLLMDecisionBatch(siteId: string, batchId: string): Promise<LLMDecisionBatchV1 | null>;

  // Phase D1: Extraction Batch
  saveVacancyExtractionBatch(siteId: string, batch: VacancyExtractionBatchV1): Promise<void>;
  getVacancyExtractionBatch(siteId: string, batchId: string): Promise<VacancyExtractionBatchV1 | null>;

  // Phase D2: LLM Eval Batch
  saveLLMVacancyEvalBatch(siteId: string, batch: LLMVacancyEvalBatchV1): Promise<void>;
  getLLMVacancyEvalBatch(siteId: string, batchId: string): Promise<LLMVacancyEvalBatchV1 | null>;

  // Phase D2.2: Apply Queue
  saveApplyQueue(siteId: string, queue: ApplyQueueV1): Promise<void>;
  getApplyQueue(siteId: string, queueId: string): Promise<ApplyQueueV1 | null>;

  // Phase E1.3: Apply Draft
  saveApplyDraftSnapshot(siteId: string, snapshot: ApplyDraftSnapshotV1): Promise<void>;
  getApplyDraftSnapshot(siteId: string, vacancyId: string): Promise<ApplyDraftSnapshotV1 | null>;

  // Phase E1.4: Apply Submit Receipt
  saveApplySubmitReceipt(siteId: string, receipt: ApplySubmitReceiptV1): Promise<void>;

  // Data (Stub for future vacanies/profiles)
  saveDataStub(key: string, data: unknown): Promise<void>;
}
