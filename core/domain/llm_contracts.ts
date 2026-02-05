// Layer: DOMAIN
// Purpose: Data Transfer Objects (DTOs) and Contracts for LLM interactions.

import { RawFormField, VacancySalary, QuestionnaireField } from './entities';

// --- Enums for Validation ---

export enum WorkMode {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  OFFICE = 'OFFICE',
  ANY = 'ANY'
}

export enum SeniorityLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  C_LEVEL = 'C_LEVEL'
}

export enum RoleCategory {
  ENGINEERING = 'ENGINEERING',
  PRODUCT = 'PRODUCT',
  DESIGN = 'DESIGN',
  ANALYTICS = 'ANALYTICS',
  MANAGEMENT = 'MANAGEMENT',
  OTHER = 'OTHER'
}

// --- Input Contract ---

export interface UserConstraints {
  preferredWorkMode: WorkMode;
  minSalary: number | null; // in currency units
  currency: string; // 'RUB', 'USD', etc.
  city: string | null;
  targetLanguages: string[]; // e.g. ['ru', 'en']
}

export interface ProfileSummaryV1 {
  siteId: string;
  profileHash: string;
  profileTextNormalized: string; // The raw blob we captured
  userConstraints: UserConstraints;
}

// --- Stage 5 Input Contract ---

export interface SearchUIAnalysisInputV1 {
  siteId: string;
  domSnapshot: {
    pageUrl: string;
    fields: RawFormField[];
  };
  targetingContext: {
    targetRoles: string[]; // merged ru/en titles
    workModeRules: { strictMode: boolean };
    salaryRules: { minThresholdStrategy: string };
  };
}

// --- Phase C2: Batch Screening Input/Output ---

export interface ScreeningCard {
  id: string; // Internal Ref
  title: string;
  company: string | null;
  salary: string | null; // Normalized string e.g. "100k-200k RUB"
  workMode: string;
  url: string;
}

export interface LLMScreeningInputV1 {
  siteId: string;
  targetingSpec: {
    targetRoles: string[]; // Merged
    seniority: string[];
    matchWeights: TitleMatchWeights; // Reuse existing type logic
  };
  cards: ScreeningCard[];
}

export interface LLMScreeningOutputV1 {
  results: {
    cardId: string;
    decision: 'READ' | 'DEFER' | 'IGNORE';
    confidence: number; // 0.0 - 1.0
    reasons: string[]; 
  }[];
  tokenUsage: {
    input: number;
    output: number;
  };
}

// --- Phase D2: Batch Evaluation Input/Output ---

export interface EvalCandidate {
  id: string;
  title: string;
  sections: {
    requirements: string[];
    responsibilities: string[];
    conditions: string[];
  };
  derived: {
    salary?: VacancySalary;
    workMode?: string; // 'remote', 'office', 'unknown'
  };
}

export interface EvaluateExtractsInputV1 {
  profileSummary: string; // from ProfileSnapshot
  targetingRules: {
    targetRoles: string[];
    workModeRules: { strictMode: boolean };
    minSalary?: number | null;
  };
  candidates: EvalCandidate[];
}

export interface EvaluateExtractsOutputV1 {
  results: {
    id: string;
    decision: 'APPLY' | 'SKIP' | 'NEEDS_HUMAN';
    confidence: number;
    reasons: string[];
    risks: string[];
    factsUsed: string[];
  }[];
  tokenUsage: {
    input: number;
    output: number;
  };
}

// --- Phase E2: Questionnaire Answer Generation ---

export interface QuestionnaireAnswerInputV1 {
  profileSummary: string;
  userConstraints: UserConstraints;
  fields: {
    id: string;
    label: string;
    type: string;
    options?: string[];
  }[];
}

export interface QuestionnaireAnswerOutputV1 {
  answers: {
    fieldId: string;
    value: string | boolean | number | string[] | null;
    confidence: number;
    factsUsed: string[];
    risks: string[];
  }[];
  globalRisks: string[];
}

// --- Output Contract ---

export interface TitleMatchWeights {
  exact: number;    // 0.0 - 1.0 (e.g. 1.0)
  contains: number; // 0.0 - 1.0 (e.g. 0.8)
  fuzzy: number;    // 0.0 - 1.0 (e.g. 0.5)
  negativeKeywords: string[]; // Words that immediately disqualify a title (e.g. "Senior" if looking for Junior)
}

export interface SalaryRules {
  ignoreIfMissing: boolean; // If true, vacancy without salary is allowed
  minThresholdStrategy: 'STRICT' | 'MARKET_BOTTOM_10' | 'IGNORE';
}

export interface ConfidenceThresholds {
  autoRead: number;   // Score above which we read the full description (0.0 - 1.0)
  autoIgnore: number; // Score below which we skip immediately (0.0 - 1.0)
}

export interface TargetingSpecV1 {
  targetRoles: {
    ruTitles: string[];
    enTitles: string[];
  };
  seniorityLevels: SeniorityLevel[];
  roleCategories: RoleCategory[];
  
  titleMatchWeights: TitleMatchWeights;
  salaryRules: SalaryRules;
  workModeRules: {
    strictMode: boolean; // If true, discard non-matching work modes immediately
  };
  
  confidenceThresholds: ConfidenceThresholds;
  
  assumptions: string[]; // List of assumptions LLM made if profile data was ambiguous
}