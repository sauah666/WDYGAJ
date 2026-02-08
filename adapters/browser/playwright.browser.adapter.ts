// Layer: ADAPTERS
// Purpose: Real Browser Automation using Playwright.
// NOTE: This adapter requires a Node.js environment (Electron/Server). 
// It will NOT work in a standard browser client.

import { BrowserPort, RawVacancyCard, ParsedVacancyPage, RawApplyFormSnapshot } from '../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, ApplyControl, QuestionnaireField, QuestionnaireAnswer } from '../../core/domain/entities';

// Fix for missing Node types
declare var require: any;

// Conditional import to avoid build errors in pure web (this is a strategy pattern, in real app we'd use dynamic imports or separate builds)
// import { chromium, Browser, Page, ElementHandle } from 'playwright'; 
// Mocking types for compilation in web-only skeleton
type Browser = any;
type Page = any;

export class PlaywrightBrowserAdapter implements BrowserPort {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isHeadless: boolean = false; // Default to headful for "Agent" feel

  constructor() {
    console.log('[PlaywrightAdapter] Initialized. Expecting Node.js environment.');
  }

  async launch(headless: boolean = false): Promise<void> {
    try {
      this.isHeadless = headless;
      // Dynamic require to avoid bundling issues
      const { chromium } = require('playwright'); 
      this.browser = await chromium.launch({ headless: this.isHeadless });
      const context = await this.browser.newContext();
      this.page = await context.newPage();
      console.log('[PlaywrightAdapter] Browser launched.');
    } catch (e) {
      console.error('[PlaywrightAdapter] Failed to launch. Are you in a browser environment?', e);
      throw e;
    }
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async waitForHumanInteraction(message: string): Promise<void> {
    console.log(`[PlaywrightAdapter] PAUSED: ${message}`);
    // In a real agent, we might wait for a specific signal or UI element change
    // For "Login", we can wait until the URL changes or a "Profile" icon appears.
    if (!this.page) return;
    
    // Simple infinite wait loop until external signal (or user clicks something in the UI)
    // Here we just wait for a known login indicator or timeout
    // In a real scenario, we might poll for a cookie or selector
    try {
      await this.page.waitForSelector('[data-qa="mainmenu_applicantProfile"]', { timeout: 300000 }); // 5 min for login
    } catch (e) {
      console.warn('Human interaction timeout or skip');
    }
  }

  async getDomSnapshot(): Promise<string> {
    if (!this.page) return "";
    return await this.page.content();
  }

  async captureScreenshot(): Promise<string | null> {
    if (!this.page) return null;
    try {
      const buffer = await this.page.screenshot({ type: 'jpeg', quality: 50 });
      return "data:image/jpeg;base64," + buffer.toString('base64');
    } catch (e) {
      console.error('[PlaywrightAdapter] Screenshot failed:', e);
      return null;
    }
  }

  async getCurrentUrl(): Promise<string> {
    return this.page?.url() || "";
  }

  async getPageTextMinimal(): Promise<string> {
    if (!this.page) return "";
    // Extract visible text
    return await this.page.innerText('body');
  }

  async findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]> {
    if (!this.page) return [];
    
    return await this.page.evaluate((kw: string[]) => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .map(a => ({ text: a.innerText, href: a.href }))
        .filter(l => kw.some(k => l.text.toLowerCase().includes(k.toLowerCase())));
    }, keywords);
  }

  async clickLink(href: string): Promise<void> {
    if (!this.page) return;
    // Try to find by href
    await this.page.click(`a[href*="${href}"]`);
  }

  async scanPageInteractionElements(): Promise<RawFormField[]> {
    if (!this.page) return [];
    
    // Complex DOM extraction logic running inside the page
    return await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, button, textarea'));
      return inputs.map((el, idx) => {
        const e = el as HTMLElement;
        return {
          id: e.id || `gen-${idx}`,
          tag: e.tagName.toLowerCase(),
          inputType: (e as HTMLInputElement).type,
          label: e.innerText || e.getAttribute('aria-label') || '',
          attributes: {
            name: e.getAttribute('name') || '',
            class: e.className,
            'data-qa': e.getAttribute('data-qa') || ''
          },
          isVisible: e.offsetParent !== null
        };
      });
    }) as RawFormField[];
  }

  async applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult> {
    if (!this.page) throw new Error("No Page");

    // Use domHint to find selector. Assuming domHint is like "name=text" or "data-qa=submit"
    // We need a helper to convert hint to selector
    const selector = this.hintToSelector(fieldDef.domHint);
    
    try {
      if (actionType === 'FILL_TEXT') {
        await this.page.fill(selector, String(value));
      } else if (actionType === 'CLICK') {
        await this.page.click(selector);
      } else if (actionType === 'TOGGLE_CHECKBOX') {
        if (value) await this.page.check(selector);
        else await this.page.uncheck(selector);
      } else if (actionType === 'SELECT_OPTION') {
        await this.page.selectOption(selector, String(value));
      }
      return { success: true, observedValue: value };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private hintToSelector(hint?: string): string {
    if (!hint) return 'body'; // fallback
    if (hint.startsWith('name=')) return `[name="${hint.split('=')[1]}"]`;
    if (hint.startsWith('data-qa=')) return `[data-qa="${hint.split('=')[1]}"]`;
    return hint; // assume raw selector
  }

  async readControlValue(fieldDef: SearchFieldDefinition): Promise<{ value: any; source: 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN' }> {
    if (!this.page) return { value: null, source: 'UNKNOWN' };
    const selector = this.hintToSelector(fieldDef.domHint);
    
    try {
      const val = await this.page.inputValue(selector);
      return { value: val, source: 'CONTROL_VALUE' };
    } catch {
      return { value: null, source: 'UNKNOWN' };
    }
  }

  async scanVacancyCards(limit: number): Promise<{ cards: RawVacancyCard[], nextPageCursor?: string }> {
    if (!this.page) return { cards: [] };

    // Real scraping logic would use specific selectors for hh.ru
    // Here we use generic placeholders as per "Real Adapter Skeleton" requirement
    const cards = await this.page.evaluate((l: number) => {
      const nodes = Array.from(document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]')).slice(0, l);
      return nodes.map(n => {
        const titleEl = n.querySelector('[data-qa="serp-item__title"]');
        const link = titleEl?.getAttribute('href') || '';
        return {
          url: link,
          title: (titleEl as HTMLElement)?.innerText || '',
          company: (n.querySelector('[data-qa="vacancy-serp__vacancy-employer"]') as HTMLElement)?.innerText,
          salaryText: (n.querySelector('[data-qa="vacancy-serp__vacancy-compensation"]') as HTMLElement)?.innerText,
          externalId: link.split('/vacancy/')[1]?.split('?')[0]
        };
      });
    }, limit);

    return { cards, nextPageCursor: undefined };
  }

  async extractVacancyPage(): Promise<ParsedVacancyPage> {
    if (!this.page) throw new Error("No page");

    const data = await this.page.evaluate(() => {
      const desc = (document.querySelector('[data-qa="vacancy-description"]') as HTMLElement)?.innerText || '';
      return {
        desc,
        // ... simplistic extraction
      };
    });

    // In a real impl, we'd parse `data.desc` into sections. 
    // For this skeleton, we assume the LLM handles raw text well, or we do regex split.
    return {
      requirements: [data.desc],
      responsibilities: [],
      conditions: []
    };
  }

  async scanApplyEntrypoints(): Promise<ApplyControl[]> {
    if (!this.page) return [];
    
    return await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[data-qa="vacancy-response-link-top"]'));
      return btns.map(b => ({
        label: (b as any).innerText,
        selector: '[data-qa="vacancy-response-link-top"]',
        type: 'BUTTON'
      }));
    });
  }

  async clickElement(selector: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.click(selector);
      return true;
    } catch {
      return false;
    }
  }

  async scanApplyForm(): Promise<RawApplyFormSnapshot> {
    if (!this.page) return { isModal: false, hasCoverLetter: false, hasResumeSelect: false, hasSubmit: false, hasQuestionnaire: false };
    
    // Check for modal presence
    const isModal = await this.page.isVisible('.bloko-modal');
    return {
      isModal,
      hasCoverLetter: await this.page.isVisible('textarea[name="message"]'),
      hasResumeSelect: await this.page.isVisible('[data-qa="resume-search-input"]'),
      hasSubmit: await this.page.isVisible('[data-qa="vacancy-response-submit-popup"]'),
      hasQuestionnaire: false, // Todo: detect
      coverLetterSelector: 'textarea[name="message"]',
      submitSelector: '[data-qa="vacancy-response-submit-popup"]'
    };
  }

  async scanApplyFormArbitrary(): Promise<QuestionnaireField[]> {
    // Implement deep scan
    return [];
  }

  async fillApplyForm(answers: QuestionnaireAnswer[]): Promise<boolean> {
    // Implement filling logic
    return true;
  }

  async submitApplyForm(): Promise<void> {
    if (!this.page) return;
    await this.page.click('[data-qa="vacancy-response-submit-popup"]');
  }

  async detectApplyOutcome(): Promise<'SUCCESS' | 'QUESTIONNAIRE' | 'UNKNOWN' | 'ERROR'> {
    // Check for success message
    // e.g. text "Success" or modal close
    return 'UNKNOWN'; 
  }

  async hideVacancy(vacancyId: string): Promise<boolean> {
    // Implement hide logic
    return true;
  }

  async inputText(selector: string, text: string): Promise<boolean> {
    if (!this.page) return false;
    await this.page.fill(selector, text);
    return true;
  }

  async readInputValue(selector: string): Promise<string | null> {
    if (!this.page) return null;
    return await this.page.inputValue(selector);
  }

  async getPageFingerprint(pageType: 'search' | 'vacancy' | 'apply_form' | 'unknown'): Promise<{ structuralHash: string }> {
    if (!this.page) return { structuralHash: '0000' };

    // F1: Structural Hash (Tag names + Classes + IDs, stripped of dynamic junk)
    const hash = await this.page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let str = '';
      while(walker.nextNode()) {
        const el = walker.currentNode as Element;
        str += el.tagName;
        if (el.id && !el.id.match(/\d/)) str += '#' + el.id; // Skip dynamic IDs
        if (el.className) str += '.' + el.className.split(' ').sort().join('.');
      }
      // Simple string hash
      let h = 0;
      for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      return h.toString(16);
    });

    return { structuralHash: hash };
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
