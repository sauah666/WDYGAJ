// Layer: PORTS
// Purpose: Define contracts for external services (secondary adapters).

import { RawFormField } from '../domain/entities';

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
   * Closes the browser session.
   */
  close(): Promise<void>;
}