// Layer: ADAPTERS

import { StoragePort } from '../../core/ports/storage.port';
import { AgentConfig } from '../../types';
import { AgentState, ProfileSnapshot, SearchDOMSnapshotV1, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, AppliedFiltersSnapshotV1, FiltersAppliedVerificationV1, VacancyCardBatchV1, SeenVacancyIndexV1, DedupedVacancyBatchV1, PreFilterResultBatchV1 } from '../../core/domain/entities';
import { TargetingSpecV1 } from '../../core/domain/llm_contracts';

const KEY_CONFIG = 'as_config';
const KEY_STATE = 'as_state';
const KEY_PROFILE_PREFIX = 'as_profile_';
const KEY_TARGETING_PREFIX = 'as_targeting_';
const KEY_SEARCH_DOM_PREFIX = 'as_search_dom_'; 
const KEY_SEARCH_UI_PREFIX = 'as_search_ui_';
const KEY_SEARCH_PREFS_PREFIX = 'as_search_prefs_';
const KEY_SEARCH_PLAN_PREFIX = 'as_search_plan_';
const KEY_APPLIED_SNAPSHOT_PREFIX = 'as_applied_snap_';
const KEY_VERIFICATION_PREFIX = 'as_verification_';
const KEY_VACANCY_BATCH_PREFIX = 'as_vacancy_batch_';
const KEY_SEEN_INDEX_PREFIX = 'as_seen_index_';
const KEY_DEDUPED_BATCH_PREFIX = 'as_deduped_batch_';
const KEY_PREFILTER_BATCH_PREFIX = 'as_prefilter_batch_';

export class LocalStorageAdapter implements StoragePort {
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

  async saveProfile(profile: ProfileSnapshot): Promise<void> {
    localStorage.setItem(KEY_PROFILE_PREFIX + profile.siteId, JSON.stringify(profile));
  }

  async getProfile(siteId: string): Promise<ProfileSnapshot | null> {
    const raw = localStorage.getItem(KEY_PROFILE_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async resetProfile(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_PROFILE_PREFIX + siteId);
  }

  async saveTargetingSpec(siteId: string, spec: TargetingSpecV1): Promise<void> {
    localStorage.setItem(KEY_TARGETING_PREFIX + siteId, JSON.stringify(spec));
  }

  async getTargetingSpec(siteId: string): Promise<TargetingSpecV1 | null> {
    const raw = localStorage.getItem(KEY_TARGETING_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteTargetingSpec(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_TARGETING_PREFIX + siteId);
  }

  // --- Stage 5 Implementation ---

  async saveSearchDOMSnapshot(siteId: string, snapshot: SearchDOMSnapshotV1): Promise<void> {
    localStorage.setItem(KEY_SEARCH_DOM_PREFIX + siteId, JSON.stringify(snapshot));
  }

  async getSearchDOMSnapshot(siteId: string): Promise<SearchDOMSnapshotV1 | null> {
    const raw = localStorage.getItem(KEY_SEARCH_DOM_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async saveSearchUISpec(siteId: string, spec: SearchUISpecV1): Promise<void> {
    localStorage.setItem(KEY_SEARCH_UI_PREFIX + siteId, JSON.stringify(spec));
  }

  async getSearchUISpec(siteId: string): Promise<SearchUISpecV1 | null> {
    const raw = localStorage.getItem(KEY_SEARCH_UI_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteSearchUISpec(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_SEARCH_UI_PREFIX + siteId);
  }

  async saveUserSearchPrefs(siteId: string, prefs: UserSearchPrefsV1): Promise<void> {
    localStorage.setItem(KEY_SEARCH_PREFS_PREFIX + siteId, JSON.stringify(prefs));
  }

  async getUserSearchPrefs(siteId: string): Promise<UserSearchPrefsV1 | null> {
    const raw = localStorage.getItem(KEY_SEARCH_PREFS_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteUserSearchPrefs(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_SEARCH_PREFS_PREFIX + siteId);
  }

  async saveSearchApplyPlan(siteId: string, plan: SearchApplyPlanV1): Promise<void> {
    localStorage.setItem(KEY_SEARCH_PLAN_PREFIX + siteId, JSON.stringify(plan));
  }

  async getSearchApplyPlan(siteId: string): Promise<SearchApplyPlanV1 | null> {
    const raw = localStorage.getItem(KEY_SEARCH_PLAN_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteSearchApplyPlan(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_SEARCH_PLAN_PREFIX + siteId);
  }

  // --- Phase A1.1 Implementation ---

  async saveAppliedFiltersSnapshot(siteId: string, snapshot: AppliedFiltersSnapshotV1): Promise<void> {
    localStorage.setItem(KEY_APPLIED_SNAPSHOT_PREFIX + siteId, JSON.stringify(snapshot));
  }

  async getAppliedFiltersSnapshot(siteId: string): Promise<AppliedFiltersSnapshotV1 | null> {
    const raw = localStorage.getItem(KEY_APPLIED_SNAPSHOT_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteAppliedFiltersSnapshot(siteId: string): Promise<void> {
    localStorage.removeItem(KEY_APPLIED_SNAPSHOT_PREFIX + siteId);
  }

  // --- Phase A2.1 Implementation ---

  async saveFiltersAppliedVerification(siteId: string, verification: FiltersAppliedVerificationV1): Promise<void> {
    localStorage.setItem(KEY_VERIFICATION_PREFIX + siteId, JSON.stringify(verification));
  }

  async getFiltersAppliedVerification(siteId: string): Promise<FiltersAppliedVerificationV1 | null> {
    const raw = localStorage.getItem(KEY_VERIFICATION_PREFIX + siteId);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteFiltersAppliedVerification(siteId: string): Promise<void> {
     localStorage.removeItem(KEY_VERIFICATION_PREFIX + siteId);
  }

  // --- Phase B1 Implementation ---

  async saveVacancyCardBatch(siteId: string, batch: VacancyCardBatchV1): Promise<void> {
      // Store by batchId
      const key = `${KEY_VACANCY_BATCH_PREFIX}${siteId}_${batch.batchId}`;
      localStorage.setItem(key, JSON.stringify(batch));

      // Also maintain a list of recent batches for this site (index)
      const indexKey = `${KEY_VACANCY_BATCH_PREFIX}${siteId}_INDEX`;
      const rawIndex = localStorage.getItem(indexKey);
      let index: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      index.push(batch.batchId);
      // Keep last 10
      if (index.length > 10) index = index.slice(-10);
      localStorage.setItem(indexKey, JSON.stringify(index));
  }

  async getVacancyCardBatch(siteId: string, batchId: string): Promise<VacancyCardBatchV1 | null> {
      const key = `${KEY_VACANCY_BATCH_PREFIX}${siteId}_${batchId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
  }

  async getRecentVacancyCardBatches(siteId: string, limit: number): Promise<VacancyCardBatchV1[]> {
      const indexKey = `${KEY_VACANCY_BATCH_PREFIX}${siteId}_INDEX`;
      const rawIndex = localStorage.getItem(indexKey);
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
      localStorage.setItem(KEY_SEEN_INDEX_PREFIX + siteId, JSON.stringify(index));
  }

  async getSeenVacancyIndex(siteId: string): Promise<SeenVacancyIndexV1 | null> {
      const raw = localStorage.getItem(KEY_SEEN_INDEX_PREFIX + siteId);
      return raw ? JSON.parse(raw) : null;
  }

  async saveDedupedVacancyBatch(siteId: string, batch: DedupedVacancyBatchV1): Promise<void> {
      const key = `${KEY_DEDUPED_BATCH_PREFIX}${siteId}_${batch.id}`;
      localStorage.setItem(key, JSON.stringify(batch));
  }

  async getDedupedVacancyBatch(siteId: string, batchId: string): Promise<DedupedVacancyBatchV1 | null> {
       const key = `${KEY_DEDUPED_BATCH_PREFIX}${siteId}_${batchId}`;
       const raw = localStorage.getItem(key);
       return raw ? JSON.parse(raw) : null;
  }

  // --- Phase C1 Implementation ---

  async savePreFilterResultBatch(siteId: string, batch: PreFilterResultBatchV1): Promise<void> {
      const key = `${KEY_PREFILTER_BATCH_PREFIX}${siteId}_${batch.id}`;
      localStorage.setItem(key, JSON.stringify(batch));
  }

  async getPreFilterResultBatch(siteId: string, batchId: string): Promise<PreFilterResultBatchV1 | null> {
      const key = `${KEY_PREFILTER_BATCH_PREFIX}${siteId}_${batchId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
  }

  // -----------------------------

  async saveDataStub(key: string, data: unknown): Promise<void> {
    console.log(`[StorageAdapter] Stub saving data to ${key}`, data);
  }
}