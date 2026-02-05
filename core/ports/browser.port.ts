// Layer: PORTS
// Purpose: Define contracts for external services (secondary adapters).

import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, VacancySalary, ApplyControl, ApplyFormProbeV1 } from '../domain/entities';

// DTO for raw vacancy data from the browser (before normalization)
export interface RawVacancyCard {
  url: string;
  title: string;
  company?: string;
  city?: string;
  salaryText?: string; // "100 000 - 200 000 руб."
  workModeText?: string; // "Можно удаленно"
  publishedAtText?: string;
  externalId?: string;
}

// DTO for parsed vacancy page
export interface ParsedVacancyPage {
    requirements: string[];
    responsibilities: string[];
    conditions: string[];
    salary?: VacancySalary;
    workMode?: 'remote' | 'hybrid' | 'office' | 'unknown';
}

export interface RawApplyFormSnapshot {
    isModal: boolean;
    hasCoverLetter: boolean;
    hasResumeSelect: boolean;
    hasSubmit: boolean;
    hasQuestionnaire: boolean;
    coverLetterSelector?: string;
    submitSelector?: string;
}

export interface BrowserPort {
  /**
   * Initializes the browser environment (or connects to one).
   */
  launch(): Promise<void>;

  /**
   * Navigates the browser to a specific URL.
   */
  navigateTo(url: string): Promise<void>;

  /**
   * Pauses execution and waits for a manual user trigger (Human Gate).
   */
  waitForHumanInteraction(message: string): Promise<void>;

  /**
   * Captures the current DOM snapshot of the active page.
   */
  getDomSnapshot(): Promise<string>;

  /**
   * Returns the current active URL.
   */
  getCurrentUrl(): Promise<string>;

  /**
   * returns minimal visible text from the page (abstraction for profile extraction).
   */
  getPageTextMinimal(): Promise<string>;

  /**
   * Scans the page for links containing any of the provided keywords.
   * @param keywords - List of text substrings to match (case-insensitive)
   * @returns Array of found links with their text and href
   */
  findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]>;

  /**
   * Clicks a link identified by its href.
   */
  clickLink(href: string): Promise<void>;

  /**
   * Scans the current page for interactive form elements.
   * Does NOT analyze logic, just returns raw structure.
   */
  scanPageInteractionElements(): Promise<RawFormField[]>;

  /**
   * Executes a specific action on a form control.
   * Used for applying search filters.
   * @param fieldDef - The semantic definition of the field (contains domHint)
   * @param actionType - What to do (fill, select, toggle, click)
   * @param value - The value to apply
   */
  applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult>;

  /**
   * Reads the current state/value of a form control without modifying it.
   * Used for verification (Phase A2.1).
   * @param fieldDef - The semantic definition
   */
  readControlValue(fieldDef: SearchFieldDefinition): Promise<{ value: any; source: 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN' }>;

  /**
   * Scans the current page for vacancy cards (listing items).
   * Phase B1.
   * @param limit - Max number of cards to extract (typically 10-15)
   */
  scanVacancyCards(limit: number): Promise<{ cards: RawVacancyCard[], nextPageCursor?: string }>;

  /**
   * Extracts relevant details from the currently open vacancy page.
   * Phase D1.
   */
  extractVacancyPage(): Promise<ParsedVacancyPage>;

  /**
   * Phase E1.1: Scans the page for potential "Apply" entrypoints.
   * Does NOT click.
   */
  scanApplyEntrypoints(): Promise<ApplyControl[]>;

  /**
   * Phase E1.2: Clicks a specific DOM element (Apply button).
   */
  clickElement(selector: string): Promise<boolean>;

  /**
   * Phase E1.2: Scans the currently open apply form/modal.
   */
  scanApplyForm(): Promise<RawApplyFormSnapshot>;

  /**
   * Phase E1.3: Enters text into a specific element.
   */
  inputText(selector: string, text: string): Promise<boolean>;

  /**
   * Phase E1.3: Reads the value/text from a specific element.
   */
  readInputValue(selector: string): Promise<string | null>;

  /**
   * Closes the browser session.
   */
  close(): Promise<void>;
}