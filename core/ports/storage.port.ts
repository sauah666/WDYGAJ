// Layer: PORTS
// Purpose: Define contracts for persistence.

import { AgentConfig } from '../../types';
import { AgentState, ProfileSnapshot, SearchDOMSnapshotV1, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, AppliedFiltersSnapshotV1, FiltersAppliedVerificationV1 } from '../domain/entities';
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

  // Data (Stub for future vacanies/profiles)
  saveDataStub(key: string, data: unknown): Promise<void>;
}