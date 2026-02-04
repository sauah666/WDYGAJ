// Layer: DOMAIN
// Purpose: Data Transfer Objects (DTOs) and Contracts for LLM interactions.

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
