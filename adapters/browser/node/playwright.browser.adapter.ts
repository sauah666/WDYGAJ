
// Layer: ADAPTERS (Node.js Only)
// Purpose: Real Browser Automation using Playwright.

import { BrowserPort, RawVacancyCard, ParsedVacancyPage, RawApplyFormSnapshot } from '../../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, ApplyControl, QuestionnaireField, QuestionnaireAnswer } from '../../../core/domain/entities';

// Types for compilation in generic env
type Browser = any;
type Page = any;

export class PlaywrightBrowserAdapter implements BrowserPort {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isHeadless: boolean = false; 

  constructor() {
    console.log('[PlaywrightAdapter] Initialized. Expecting Node.js environment.');
  }

  async launch(): Promise<void> {
    try {
      // @ts-ignore
      const { chromium } = require('playwright'); 
      this.browser = await chromium.launch({ headless: this.isHeadless });
      const context = await this.browser.newContext();
      this.page = await context.newPage();
      console.log('[PlaywrightAdapter] Browser launched.');
    } catch (e) {
      console.error('[PlaywrightAdapter] Failed to launch.', e);
      throw e;
    }
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async waitForHumanInteraction(message: string): Promise<void> {
    console.log(`[PlaywrightAdapter] PAUSED: ${message}`);
    if (!this.page) return;
    try {
      await this.page.waitForSelector('[data-qa="mainmenu_applicantProfile"]', { timeout: 300000 }); 
    } catch (e) {
      console.warn('Human interaction timeout or skip');
    }
  }

  async getDomSnapshot(): Promise<string> {
    if (!this.page) return "";
    return await this.page.content();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page?.url() || "";
  }

  async getPageTextMinimal(): Promise<string> {
    if (!this.page) return "";
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
    await this.page.click(`a[href*="${href}"]`);
  }

  async scanPageInteractionElements(): Promise<RawFormField[]> {
    if (!this.page) return [];
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
    if (!hint) return 'body'; 
    if (hint.startsWith('name=')) return `[name="${hint.split('=')[1]}"]`;
    if (hint.startsWith('data-qa=')) return `[data-qa="${hint.split('=')[1]}"]`;
    return hint; 
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
      return { desc };
    });
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
    const isModal = await this.page.isVisible('.bloko-modal');
    return {
      isModal,
      hasCoverLetter: await this.page.isVisible('textarea[name="message"]'),
      hasResumeSelect: await this.page.isVisible('[data-qa="resume-search-input"]'),
      hasSubmit: await this.page.isVisible('[data-qa="vacancy-response-submit-popup"]'),
      hasQuestionnaire: false, 
      coverLetterSelector: 'textarea[name="message"]',
      submitSelector: '[data-qa="vacancy-response-submit-popup"]'
    };
  }

  async scanApplyFormArbitrary(): Promise<QuestionnaireField[]> {
    return [];
  }

  async fillApplyForm(answers: QuestionnaireAnswer[]): Promise<boolean> {
    return true;
  }

  async submitApplyForm(): Promise<void> {
    if (!this.page) return;
    await this.page.click('[data-qa="vacancy-response-submit-popup"]');
  }

  async detectApplyOutcome(): Promise<'SUCCESS' | 'QUESTIONNAIRE' | 'UNKNOWN' | 'ERROR'> {
    return 'UNKNOWN'; 
  }

  async hideVacancy(vacancyId: string): Promise<boolean> {
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
    const hash = await this.page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let str = '';
      while(walker.nextNode()) {
        const el = walker.currentNode as Element;
        str += el.tagName;
        if (el.id && !el.id.match(/\d/)) str += '#' + el.id; 
        if (el.className) str += '.' + el.className.split(' ').sort().join('.');
      }
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
