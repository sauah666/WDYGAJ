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

export type SearchFieldType = 'CHECKBOX' | 'SELECT' | 'RANGE' | 'TEXT' | 'UNKNOWN';

export interface SearchFieldOption {
  value: string;
  label: string;
}

export interface SearchFieldDefinition {
  key: string;        // Unique internal ID for the field
  label: string;      // Visual label
  type: SearchFieldType;
  options?: SearchFieldOption[]; // For SELECT type
  domHint?: string;   // Implementation detail (data-qa, name, etc.) - handled by Adapters later
}

export interface SearchUISpecV1 {
  siteId: string;
  capturedAt: number;
  sourceUrl: string;
  fields: SearchFieldDefinition[];
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
  activeSearchPrefs?: UserSearchPrefsV1 | null; // Stage 5.4: User Choices
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
  activeSearchPrefs: null
});