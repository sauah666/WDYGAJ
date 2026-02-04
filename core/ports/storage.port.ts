// Layer: PORTS
// Purpose: Define contracts for persistence.

import { AgentConfig } from '../../types';
import { AgentState, ProfileSnapshot, SearchUISpecV1, UserSearchPrefsV1 } from '../domain/entities';
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
  saveSearchUISpec(siteId: string, spec: SearchUISpecV1): Promise<void>;
  getSearchUISpec(siteId: string): Promise<SearchUISpecV1 | null>;
  deleteSearchUISpec(siteId: string): Promise<void>;

  saveUserSearchPrefs(siteId: string, prefs: UserSearchPrefsV1): Promise<void>;
  getUserSearchPrefs(siteId: string): Promise<UserSearchPrefsV1 | null>;
  deleteUserSearchPrefs(siteId: string): Promise<void>;

  // Data (Stub for future vacanies/profiles)
  saveDataStub(key: string, data: unknown): Promise<void>;
}