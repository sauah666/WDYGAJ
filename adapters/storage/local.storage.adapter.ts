
// Layer: ADAPTERS

import { StoragePort } from '../../core/ports/storage.port';
import { AgentConfig } from '../../types';
import { AgentState, ProfileSnapshot, SearchDOMSnapshotV1, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, AppliedFiltersSnapshotV1, FiltersAppliedVerificationV1, VacancyCardBatchV1, SeenVacancyIndexV1, DedupedVacancyBatchV1, PreFilterResultBatchV1, LLMDecisionBatchV1, VacancyExtractionBatchV1, LLMVacancyEvalBatchV1, ApplyQueueV1, ApplyDraftSnapshotV1, ApplySubmitReceiptV1, QuestionnaireSnapshotV1, QuestionnaireAnswerSetV1, ApplyAttemptState, DOMFingerprintV1 } from '../../core/domain/entities';
import { TargetingSpecV1 } from '../../core/domain/llm_contracts';

// Legacy Prefixes (Read-Only fallback)
const KEY_CONFIG = 'as_config';
const KEY_STATE = 'as_state';
const LEGACY_PROFILE_PREFIX = 'as_profile_';
const LEGACY_TARGETING_PREFIX = 'as_targeting_';
const LEGACY_SEARCH_DOM_PREFIX = 'as_search_dom_'; 
const LEGACY_SEARCH_UI_PREFIX = 'as_search_ui_';
const LEGACY_SEARCH_PREFS_PREFIX = 'as_search_prefs_';
const LEGACY_SEARCH_PLAN_PREFIX = 'as_search_plan_';
const LEGACY_APPLIED_SNAPSHOT_PREFIX = 'as_applied_snap_';
const LEGACY_VERIFICATION_PREFIX = 'as_verification_';
const LEGACY_VACANCY_BATCH_PREFIX = 'as_vacancy_batch_';
const LEGACY_SEEN_INDEX_PREFIX = 'as_seen_index_';
const LEGACY_DEDUPED_BATCH_PREFIX = 'as_deduped_batch_';
const LEGACY_PREFILTER_BATCH_PREFIX = 'as_prefilter_batch_';
const LEGACY_LLM_BATCH_PREFIX = 'as_llm_batch_';
const LEGACY_EXTRACTION_BATCH_PREFIX = 'as_extraction_batch_';
const LEGACY_EVAL_BATCH_PREFIX = 'as_eval_batch_';
const LEGACY_APPLY_QUEUE_PREFIX = 'as_apply_queue_';
const LEGACY_APPLY_DRAFT_PREFIX = 'as_apply_draft_';
const LEGACY_APPLY_RECEIPT_PREFIX = 'as_apply_receipt_';
const LEGACY_QUESTIONNAIRE_SNAP_PREFIX = 'as_quest_snap_';
const LEGACY_QUESTIONNAIRE_ANS_PREFIX = 'as_quest_ans_';
const LEGACY_APPLY_ATTEMPT_PREFIX = 'as_apply_attempt_';
const LEGACY_DOM_FP_PREFIX = 'as_dom_fp_';

export class LocalStorageAdapter implements StoragePort {

  /**
   * Phase F2: Site-Scoped Key Helper.
   * Format: as/{siteId}/{resourceKey}
   * Example: as/hh.ru/profile
   */
  private getSiteKey(siteId: string, resource: string, idSuffix?: string): string {
    let key = `as/${siteId}/${resource}`;
    if (idSuffix) key += `/${idSuffix}`;
    return key;
  }

  /**
   * Phase F2: Backward Compatibility Reader.
   * Tries new key first, then legacy key.
   */
  private getWithLegacyFallback(newKey: string, legacyKey: string): string | null {
      const newVal = localStorage.getItem(newKey);
      if (newVal) return newVal;
      return localStorage.getItem(legacyKey);
  }

  async saveConfig(config: AgentConfig): Promise<void> {
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  }

  async getConfig(): Promise<AgentConfig | null> {
    const raw = localStorage.getItem(KEY_CONFIG);
    return raw ? JSON.parse(raw) : null;
  }

  async saveAgentState(state: AgentState): Promise<void> {
    localStorage.setItem(KEY_STATE, JSON.stringify(state));
  }

  async getAgentState(): Promise<AgentState | null> {
    const raw = localStorage.getItem(KEY_STATE);
    return raw ? JSON.parse(raw) : null;
  }

  // --- Scoped Artifacts ---

  async saveProfile(profile: ProfileSnapshot): Promise<void> {
    const key = this.getSiteKey(profile.siteId, 'profile');
    localStorage.setItem(key, JSON.stringify(profile));
  }

  async getProfile(siteId: string): Promise<ProfileSnapshot | null> {
    const newKey = this.getSiteKey(siteId, 'profile');
    const legacyKey = LEGACY_PROFILE_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async resetProfile(siteId: string): Promise<void> {
    const newKey = this.getSiteKey(siteId, 'profile');
    const legacyKey = LEGACY_PROFILE_PREFIX + siteId;
    localStorage.removeItem(newKey);
    localStorage.removeItem(legacyKey);
  }

  async saveTargetingSpec(siteId: string, spec: TargetingSpecV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'targeting');
    localStorage.setItem(key, JSON.stringify(spec));
  }

  async getTargetingSpec(siteId: string): Promise<TargetingSpecV1 | null> {
    const newKey = this.getSiteKey(siteId, 'targeting');
    const legacyKey = LEGACY_TARGETING_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteTargetingSpec(siteId: string): Promise<void> {
    localStorage.removeItem(this.getSiteKey(siteId, 'targeting'));
    localStorage.removeItem(LEGACY_TARGETING_PREFIX + siteId);
  }

  // --- Stage 5 Implementation ---

  async saveSearchDOMSnapshot(siteId: string, snapshot: SearchDOMSnapshotV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'search_dom_snapshot');
    localStorage.setItem(key, JSON.stringify(snapshot));
  }

  async getSearchDOMSnapshot(siteId: string): Promise<SearchDOMSnapshotV1 | null> {
    const newKey = this.getSiteKey(siteId, 'search_dom_snapshot');
    const legacyKey = LEGACY_SEARCH_DOM_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async saveSearchUISpec(siteId: string, spec: SearchUISpecV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'search_ui_spec');
    localStorage.setItem(key, JSON.stringify(spec));
  }

  async getSearchUISpec(siteId: string): Promise<SearchUISpecV1 | null> {
    const newKey = this.getSiteKey(siteId, 'search_ui_spec');
    const legacyKey = LEGACY_SEARCH_UI_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteSearchUISpec(siteId: string): Promise<void> {
    localStorage.removeItem(this.getSiteKey(siteId, 'search_ui_spec'));
    localStorage.removeItem(LEGACY_SEARCH_UI_PREFIX + siteId);
  }

  async saveUserSearchPrefs(siteId: string, prefs: UserSearchPrefsV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'search_prefs');
    localStorage.setItem(key, JSON.stringify(prefs));
  }

  async getUserSearchPrefs(siteId: string): Promise<UserSearchPrefsV1 | null> {
    const newKey = this.getSiteKey(siteId, 'search_prefs');
    const legacyKey = LEGACY_SEARCH_PREFS_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteUserSearchPrefs(siteId: string): Promise<void> {
    localStorage.removeItem(this.getSiteKey(siteId, 'search_prefs'));
    localStorage.removeItem(LEGACY_SEARCH_PREFS_PREFIX + siteId);
  }

  async saveSearchApplyPlan(siteId: string, plan: SearchApplyPlanV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'apply_plan');
    localStorage.setItem(key, JSON.stringify(plan));
  }

  async getSearchApplyPlan(siteId: string): Promise<SearchApplyPlanV1 | null> {
    const newKey = this.getSiteKey(siteId, 'apply_plan');
    const legacyKey = LEGACY_SEARCH_PLAN_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteSearchApplyPlan(siteId: string): Promise<void> {
    localStorage.removeItem(this.getSiteKey(siteId, 'apply_plan'));
    localStorage.removeItem(LEGACY_SEARCH_PLAN_PREFIX + siteId);
  }

  // --- Phase A1.1 Implementation ---

  async saveAppliedFiltersSnapshot(siteId: string, snapshot: AppliedFiltersSnapshotV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'applied_filters_snapshot');
    localStorage.setItem(key, JSON.stringify(snapshot));
  }

  async getAppliedFiltersSnapshot(siteId: string): Promise<AppliedFiltersSnapshotV1 | null> {
    const newKey = this.getSiteKey(siteId, 'applied_filters_snapshot');
    const legacyKey = LEGACY_APPLIED_SNAPSHOT_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteAppliedFiltersSnapshot(siteId: string): Promise<void> {
    localStorage.removeItem(this.getSiteKey(siteId, 'applied_filters_snapshot'));
    localStorage.removeItem(LEGACY_APPLIED_SNAPSHOT_PREFIX + siteId);
  }

  // --- Phase A2.1 Implementation ---

  async saveFiltersAppliedVerification(siteId: string, verification: FiltersAppliedVerificationV1): Promise<void> {
    const key = this.getSiteKey(siteId, 'verification');
    localStorage.setItem(key, JSON.stringify(verification));
  }

  async getFiltersAppliedVerification(siteId: string): Promise<FiltersAppliedVerificationV1 | null> {
    const newKey = this.getSiteKey(siteId, 'verification');
    const legacyKey = LEGACY_VERIFICATION_PREFIX + siteId;
    const raw = this.getWithLegacyFallback(newKey, legacyKey);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteFiltersAppliedVerification(siteId: string): Promise<void> {
     localStorage.removeItem(this.getSiteKey(siteId, 'verification'));
     localStorage.removeItem(LEGACY_VERIFICATION_PREFIX + siteId);
  }

  // --- Phase B1 Implementation ---

  async saveVacancyCardBatch(siteId: string, batch: VacancyCardBatchV1): Promise<void> {
      // Store by batchId
      const key = this.getSiteKey(siteId, 'vacancy_batch', batch.batchId);
      localStorage.setItem(key, JSON.stringify(batch));

      // Also maintain a list of recent batches for this site (index)
      const indexKey = this.getSiteKey(siteId, 'vacancy_batch_index');
      const legacyIndexKey = LEGACY_VACANCY_BATCH_PREFIX + siteId + '_INDEX';
      
      const rawIndex = this.getWithLegacyFallback(indexKey, legacyIndexKey);
      let index: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      
      index.push(batch.batchId);
      if (index.length > 10) index = index.slice(-10);
      
      localStorage.setItem(indexKey, JSON.stringify(index));
  }

  async getVacancyCardBatch(siteId: string, batchId: string): Promise<VacancyCardBatchV1 | null> {
      const newKey = this.getSiteKey(siteId, 'vacancy_batch', batchId);
      const legacyKey = LEGACY_VACANCY_BATCH_PREFIX + siteId + '_' + batchId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  async getRecentVacancyCardBatches(siteId: string, limit: number): Promise<VacancyCardBatchV1[]> {
      const indexKey = this.getSiteKey(siteId, 'vacancy_batch_index');
      const legacyIndexKey = LEGACY_VACANCY_BATCH_PREFIX + siteId + '_INDEX';
      const rawIndex = this.getWithLegacyFallback(indexKey, legacyIndexKey);
      
      if (!rawIndex) return [];
      
      const index: string[] = JSON.parse(rawIndex);
      const batches: VacancyCardBatchV1[] = [];
      
      // Get last N (reverse order)
      for (let i = index.length - 1; i >= 0 && batches.length < limit; i--) {
          const b = await this.getVacancyCardBatch(siteId, index[i]);
          if (b) batches.push(b);
      }
      return batches;
  }

  // --- Phase B2 Implementation ---
  
  async saveSeenVacancyIndex(siteId: string, index: SeenVacancyIndexV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'seen_index');
      localStorage.setItem(key, JSON.stringify(index));
  }

  async getSeenVacancyIndex(siteId: string): Promise<SeenVacancyIndexV1 | null> {
      const newKey = this.getSiteKey(siteId, 'seen_index');
      const legacyKey = LEGACY_SEEN_INDEX_PREFIX + siteId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  async saveDedupedVacancyBatch(siteId: string, batch: DedupedVacancyBatchV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'deduped_batch', batch.id);
      localStorage.setItem(key, JSON.stringify(batch));
  }

  async getDedupedVacancyBatch(siteId: string, batchId: string): Promise<DedupedVacancyBatchV1 | null> {
       const newKey = this.getSiteKey(siteId, 'deduped_batch', batchId);
       const legacyKey = LEGACY_DEDUPED_BATCH_PREFIX + siteId + '_' + batchId;
       const raw = this.getWithLegacyFallback(newKey, legacyKey);
       return raw ? JSON.parse(raw) : null;
  }

  // --- Phase C1 Implementation ---

  async savePreFilterResultBatch(siteId: string, batch: PreFilterResultBatchV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'prefilter_batch', batch.id);
      localStorage.setItem(key, JSON.stringify(batch));
  }

  async getPreFilterResultBatch(siteId: string, batchId: string): Promise<PreFilterResultBatchV1 | null> {
      const newKey = this.getSiteKey(siteId, 'prefilter_batch', batchId);
      const legacyKey = LEGACY_PREFILTER_BATCH_PREFIX + siteId + '_' + batchId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase C2 Implementation ---

  async saveLLMDecisionBatch(siteId: string, batch: LLMDecisionBatchV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'llm_batch', batch.id);
      localStorage.setItem(key, JSON.stringify(batch));
  }

  async getLLMDecisionBatch(siteId: string, batchId: string): Promise<LLMDecisionBatchV1 | null> {
      const newKey = this.getSiteKey(siteId, 'llm_batch', batchId);
      const legacyKey = LEGACY_LLM_BATCH_PREFIX + siteId + '_' + batchId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase D1 Implementation ---
  
  async saveVacancyExtractionBatch(siteId: string, batch: VacancyExtractionBatchV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'extraction_batch', batch.id);
      localStorage.setItem(key, JSON.stringify(batch));
  }
  
  async getVacancyExtractionBatch(siteId: string, batchId: string): Promise<VacancyExtractionBatchV1 | null> {
      const newKey = this.getSiteKey(siteId, 'extraction_batch', batchId);
      const legacyKey = LEGACY_EXTRACTION_BATCH_PREFIX + siteId + '_' + batchId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase D2 Implementation ---

  async saveLLMVacancyEvalBatch(siteId: string, batch: LLMVacancyEvalBatchV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'eval_batch', batch.id);
      localStorage.setItem(key, JSON.stringify(batch));
  }
  
  async getLLMVacancyEvalBatch(siteId: string, batchId: string): Promise<LLMVacancyEvalBatchV1 | null> {
      const newKey = this.getSiteKey(siteId, 'eval_batch', batchId);
      const legacyKey = LEGACY_EVAL_BATCH_PREFIX + siteId + '_' + batchId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase D2.2 Implementation ---

  async saveApplyQueue(siteId: string, queue: ApplyQueueV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'apply_queue', queue.id);
      localStorage.setItem(key, JSON.stringify(queue));
  }

  async getApplyQueue(siteId: string, queueId: string): Promise<ApplyQueueV1 | null> {
      const newKey = this.getSiteKey(siteId, 'apply_queue', queueId);
      const legacyKey = LEGACY_APPLY_QUEUE_PREFIX + siteId + '_' + queueId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase E1.3 Implementation ---

  async saveApplyDraftSnapshot(siteId: string, snapshot: ApplyDraftSnapshotV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'apply_draft', snapshot.vacancyId);
      localStorage.setItem(key, JSON.stringify(snapshot));
  }

  async getApplyDraftSnapshot(siteId: string, vacancyId: string): Promise<ApplyDraftSnapshotV1 | null> {
      const newKey = this.getSiteKey(siteId, 'apply_draft', vacancyId);
      const legacyKey = LEGACY_APPLY_DRAFT_PREFIX + siteId + '_' + vacancyId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }
  
  // --- Phase E2: Questionnaire ---
  
  async saveQuestionnaireSnapshot(siteId: string, snapshot: QuestionnaireSnapshotV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'questionnaire_snap', snapshot.vacancyId);
      localStorage.setItem(key, JSON.stringify(snapshot));
  }
  
  async getQuestionnaireSnapshot(siteId: string, vacancyId: string): Promise<QuestionnaireSnapshotV1 | null> {
      const newKey = this.getSiteKey(siteId, 'questionnaire_snap', vacancyId);
      const legacyKey = LEGACY_QUESTIONNAIRE_SNAP_PREFIX + siteId + '_' + vacancyId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }
  
  async saveQuestionnaireAnswerSet(siteId: string, set: QuestionnaireAnswerSetV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'questionnaire_ans', set.questionnaireHash);
      localStorage.setItem(key, JSON.stringify(set));
  }
  
  async getQuestionnaireAnswerSet(siteId: string, questionnaireHash: string): Promise<QuestionnaireAnswerSetV1 | null> {
      const newKey = this.getSiteKey(siteId, 'questionnaire_ans', questionnaireHash);
      const legacyKey = LEGACY_QUESTIONNAIRE_ANS_PREFIX + siteId + '_' + questionnaireHash;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase E3: Retry & Failover ---

  async saveApplyAttemptState(siteId: string, attempt: ApplyAttemptState): Promise<void> {
      const key = this.getSiteKey(siteId, 'apply_attempt', attempt.vacancyId);
      localStorage.setItem(key, JSON.stringify(attempt));
  }

  async getApplyAttemptState(siteId: string, vacancyId: string): Promise<ApplyAttemptState | null> {
      const newKey = this.getSiteKey(siteId, 'apply_attempt', vacancyId);
      const legacyKey = LEGACY_APPLY_ATTEMPT_PREFIX + siteId + '_' + vacancyId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase E1.4 Implementation ---

  async saveApplySubmitReceipt(siteId: string, receipt: ApplySubmitReceiptV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'apply_receipt', receipt.vacancyId);
      localStorage.setItem(key, JSON.stringify(receipt));
  }

  async getApplySubmitReceipt(siteId: string, vacancyId: string): Promise<ApplySubmitReceiptV1 | null> {
      const newKey = this.getSiteKey(siteId, 'apply_receipt', vacancyId);
      const legacyKey = LEGACY_APPLY_RECEIPT_PREFIX + siteId + '_' + vacancyId;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // --- Phase F1: DOM Drift ---
  async saveDomFingerprint(siteId: string, fp: DOMFingerprintV1): Promise<void> {
      const key = this.getSiteKey(siteId, 'dom_fp', fp.pageType);
      localStorage.setItem(key, JSON.stringify(fp));
  }

  async getDomFingerprint(siteId: string, pageType: string): Promise<DOMFingerprintV1 | null> {
      const newKey = this.getSiteKey(siteId, 'dom_fp', pageType);
      const legacyKey = LEGACY_DOM_FP_PREFIX + siteId + '_' + pageType;
      const raw = this.getWithLegacyFallback(newKey, legacyKey);
      return raw ? JSON.parse(raw) : null;
  }

  // -----------------------------
  
  async removeByPrefix(keyPrefix: string): Promise<void> {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(keyPrefix)) {
              keysToRemove.push(key);
          }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  async saveDataStub(key: string, data: unknown): Promise<void> {
    console.log(`[StorageAdapter] Stub saving data to ${key}`, data);
  }
}
