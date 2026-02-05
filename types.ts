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
  SEARCH_DOM_READY = 'SEARCH_DOM_READY', // DOM Snapshot captured
  
  ANALYZING_SEARCH_UI = 'ANALYZING_SEARCH_UI', // LLM Analysis in progress
  
  WAITING_FOR_SEARCH_PREFS = 'WAITING_FOR_SEARCH_PREFS', // Human Gate
  SEARCH_PREFS_SAVED = 'SEARCH_PREFS_SAVED',
  
  APPLY_PLAN_READY = 'APPLY_PLAN_READY', // Plan built and saved
  
  // Phase A1.1 Execution Statuses
  APPLYING_FILTERS = 'APPLYING_FILTERS', // In process
  APPLY_STEP_DONE = 'APPLY_STEP_DONE',   // One step finished successfully
  APPLY_STEP_FAILED = 'APPLY_STEP_FAILED', // One step failed
  
  SEARCH_READY = 'SEARCH_READY', // Filters applied, ready to parse list

  // Phase B1
  VACANCIES_CAPTURED = 'VACANCIES_CAPTURED', // Batch collected

  // Phase B2
  VACANCIES_DEDUPED = 'VACANCIES_DEDUPED', // Batch processed for duplicates

  // Phase C1
  PREFILTER_DONE = 'PREFILTER_DONE', // Script prefilter executed

  // Phase C2
  LLM_SCREENING_DONE = 'LLM_SCREENING_DONE', // LLM Batch screening executed

  // Phase D1
  EXTRACTING_VACANCIES = 'EXTRACTING_VACANCIES', // In progress
  VACANCIES_EXTRACTED = 'VACANCIES_EXTRACTED', // Done

  // Phase D2
  EVALUATION_DONE = 'EVALUATION_DONE', // LLM Eval batch executed

  // Phase D2.2
  APPLY_QUEUE_READY = 'APPLY_QUEUE_READY', // Queue built, ready for Phase E

  // Phase E1.1
  FINDING_APPLY_BUTTON = 'FINDING_APPLY_BUTTON',
  APPLY_BUTTON_FOUND = 'APPLY_BUTTON_FOUND',
  
  // Phase E1.2
  APPLY_FORM_OPENED = 'APPLY_FORM_OPENED',

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