// Shared types that may traverse layers (e.g. DTOs or Enums)

import { WorkMode } from './core/domain/llm_contracts';

export enum AgentStatus {
  IDLE = 'IDLE',
  STARTING = 'STARTING',
  NAVIGATING = 'NAVIGATING',
  WAITING_FOR_HUMAN = 'WAITING_FOR_HUMAN',
  WAITING_FOR_HUMAN_ASSISTANCE = 'WAITING_FOR_HUMAN_ASSISTANCE', // Stuck, need help
  LOGGED_IN_CONFIRMED = 'LOGGED_IN_CONFIRMED',
  WAITING_FOR_PROFILE_PAGE = 'WAITING_FOR_PROFILE_PAGE',
  EXTRACTING = 'EXTRACTING',
  PROFILE_CAPTURED = 'PROFILE_CAPTURED',
  
  // Stage 4 Statuses
  TARGETING_PENDING = 'TARGETING_PENDING',
  TARGETING_READY = 'TARGETING_READY',
  TARGETING_ERROR = 'TARGETING_ERROR',

  // Stage 5 Statuses (Search Configuration)
  NAVIGATING_TO_SEARCH = 'NAVIGATING_TO_SEARCH',
  SEARCH_PAGE_READY = 'SEARCH_PAGE_READY', // On the search page, ready to extract UI
  EXTRACTING_SEARCH_UI = 'EXTRACTING_SEARCH_UI',
  WAITING_FOR_SEARCH_PREFS = 'WAITING_FOR_SEARCH_PREFS', // Human Gate
  SEARCH_PREFS_SAVED = 'SEARCH_PREFS_SAVED',
  APPLYING_FILTERS = 'APPLYING_FILTERS',
  SEARCH_READY = 'SEARCH_READY', // Filters applied, ready to parse list

  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
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
  targetSite: string;
  // User Constraints for Targeting
  minSalary?: number;
  currency?: string;
  city?: string;
  workMode?: WorkMode;
  targetLanguages?: string[];
}