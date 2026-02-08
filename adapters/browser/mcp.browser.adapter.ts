
// Layer: ADAPTERS
// Purpose: Implements BrowserPort via Model Context Protocol (MCP).
// This allows the agent to control ANY browser automated by an MCP server (Puppeteer, Playwright, Selenium).

import { BrowserPort, RawVacancyCard, ParsedVacancyPage, RawApplyFormSnapshot } from '../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, ApplyControl, QuestionnaireField, QuestionnaireAnswer } from '../../core/domain/entities';
import { McpClient } from '../mcp/mcp_client';

export class McpBrowserAdapter implements BrowserPort {
  private client: McpClient;
  private currentUrlVal: string = 'about:blank';

  constructor(serverUrl: string) {
    if (!serverUrl) throw new Error("MCP Server URL is required");
    this.client = new McpClient(serverUrl);
  }

  // --- Core Lifecycle ---

  async launch(headless: boolean = false): Promise<void> {
    console.log('[McpBrowserAdapter] Connecting via MCP...');
    await this.client.connect();
    // Some MCP servers might have a dedicated launch tool, others assume persistent session.
    // We try to call 'launch' or just 'navigate' later.
    try {
        await this.client.callTool('launch_browser', { headless });
    } catch (e) {
        console.warn("MCP 'launch_browser' tool not found or failed. Assuming persistent session.");
    }
  }

  async navigateTo(url: string): Promise<void> {
    console.log(`[McpBrowserAdapter] Navigating to ${url}`);
    await this.client.callTool('navigate', { url });
    this.currentUrlVal = url;
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  // --- Read Ops ---

  async getCurrentUrl(): Promise<string> {
    try {
        const url = await this.client.callTool('get_url');
        this.currentUrlVal = typeof url === 'string' ? url : this.currentUrlVal;
        return this.currentUrlVal;
    } catch {
        return this.currentUrlVal;
    }
  }

  async getDomSnapshot(): Promise<string> {
    // Map to generic evaluation or specific get_content tool
    try {
        return await this.client.callTool('get_content');
    } catch {
        // Fallback to evaluating document.documentElement.outerHTML
        return await this.client.callTool('evaluate', { expression: "document.documentElement.outerHTML" });
    }
  }

  async captureScreenshot(): Promise<string | null> {
    try {
        const result = await this.client.callTool('screenshot');
        // MCP screenshot usually returns base64
        if (result && typeof result === 'string') {
            return result.startsWith('data:') ? result : `data:image/jpeg;base64,${result}`;
        }
        return null;
    } catch (e) {
        console.error("MCP Screenshot failed", e);
        return null;
    }
  }

  async getPageTextMinimal(): Promise<string> {
    try {
        // Simple extraction via script
        return await this.client.callTool('evaluate', { expression: "document.body.innerText" });
    } catch {
        return "";
    }
  }

  // --- Interaction Ops ---

  async clickElement(selector: string): Promise<boolean> {
    try {
        await this.client.callTool('click', { selector });
        return true;
    } catch (e) {
        console.error("MCP Click failed", e);
        return false;
    }
  }

  async inputText(selector: string, text: string): Promise<boolean> {
    try {
        await this.client.callTool('type', { selector, text });
        return true;
    } catch (e) {
        console.error("MCP Input failed", e);
        return false;
    }
  }

  async waitForHumanInteraction(message: string): Promise<void> {
      console.log(`[McpBrowserAdapter] WAITING: ${message}`);
      // MCP doesn't have a standard "pause" usually, implemented as simple delay or polling
      await new Promise(r => setTimeout(r, 2000));
  }

  // --- Complex Scans (Delegated to Script Evaluation via MCP) ---

  async findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]> {
    const script = `
      (function(keywords) {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(a => ({ text: a.innerText, href: a.href }))
          .filter(l => keywords.some(k => l.text.toLowerCase().includes(k.toLowerCase())));
      })(${JSON.stringify(keywords)})
    `;
    return await this.client.callTool('evaluate', { expression: script }) || [];
  }

  async scanPageInteractionElements(): Promise<RawFormField[]> {
    const script = `
      (function() {
        const inputs = Array.from(document.querySelectorAll('input, select, button, textarea'));
        return inputs.map((el, idx) => {
          return {
            id: el.id || 'gen-' + idx,
            tag: el.tagName.toLowerCase(),
            inputType: el.type,
            label: el.innerText || el.getAttribute('aria-label') || '',
            attributes: {
              name: el.getAttribute('name') || '',
              class: el.className,
              'data-qa': el.getAttribute('data-qa') || ''
            },
            isVisible: true
          };
        });
      })()
    `;
    return await this.client.callTool('evaluate', { expression: script }) || [];
  }

  // --- Stubbed Specialized Methods (Mapped to generic tools for now) ---

  async applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult> {
      const selector = this.hintToSelector(fieldDef.domHint);
      try {
          if (actionType === 'FILL_TEXT') await this.inputText(selector, String(value));
          else if (actionType === 'CLICK') await this.clickElement(selector);
          else if (actionType === 'TOGGLE_CHECKBOX') await this.client.callTool('evaluate', { expression: `document.querySelector('${selector}').checked = ${Boolean(value)}` });
          else if (actionType === 'SELECT_OPTION') await this.client.callTool('evaluate', { expression: `document.querySelector('${selector}').value = '${value}'` });
          
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

  async clickLink(href: string): Promise<void> {
      await this.client.callTool('evaluate', { expression: `
          const link = document.querySelector('a[href*="${href}"]');
          if(link) link.click();
      `});
  }

  async readControlValue(fieldDef: SearchFieldDefinition): Promise<{ value: any; source: 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN' }> {
      const selector = this.hintToSelector(fieldDef.domHint);
      const val = await this.client.callTool('evaluate', { expression: `document.querySelector('${selector}')?.value` });
      return { value: val, source: 'CONTROL_VALUE' };
  }

  // For high-level scans (Vacancy cards, Apply Forms), we rely on robust JS evaluation via MCP
  // because transfering huge DOM snapshots to the Agent logic is expensive.
  
  async scanVacancyCards(limit: number): Promise<{ cards: RawVacancyCard[], nextPageCursor?: string }> {
      // Logic borrowed from Playwright adapter, injected as script
      const script = `
        (function(limit) {
            const nodes = Array.from(document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]')).slice(0, limit);
            return nodes.map(n => {
                const titleEl = n.querySelector('[data-qa="serp-item__title"]');
                const link = titleEl?.getAttribute('href') || '';
                const comp = n.querySelector('[data-qa="vacancy-serp__vacancy-employer"]')?.innerText;
                const sal = n.querySelector('[data-qa="vacancy-serp__vacancy-compensation"]')?.innerText;
                return {
                    url: link,
                    title: titleEl?.innerText || '',
                    company: comp,
                    salaryText: sal,
                    externalId: link.split('/vacancy/')[1]?.split('?')[0]
                };
            });
        })(${limit})
      `;
      const cards = await this.client.callTool('evaluate', { expression: script });
      return { cards: cards || [], nextPageCursor: undefined };
  }

  async extractVacancyPage(): Promise<ParsedVacancyPage> {
      const script = `(function() { return document.querySelector('[data-qa="vacancy-description"]')?.innerText || ''; })()`;
      const desc = await this.client.callTool('evaluate', { expression: script });
      return { requirements: [desc], responsibilities: [], conditions: [] };
  }

  async scanApplyEntrypoints(): Promise<ApplyControl[]> {
      const script = `
        (function() {
            const btns = Array.from(document.querySelectorAll('[data-qa="vacancy-response-link-top"]'));
            return btns.map(b => ({
                label: b.innerText,
                selector: '[data-qa="vacancy-response-link-top"]',
                type: 'BUTTON'
            }));
        })()
      `;
      return await this.client.callTool('evaluate', { expression: script }) || [];
  }

  async scanApplyForm(): Promise<RawApplyFormSnapshot> {
      // Simplified check for now
      const script = `
        (function() {
            return {
                isModal: !!document.querySelector('.bloko-modal'),
                hasCoverLetter: !!document.querySelector('textarea[name="message"]'),
                hasResumeSelect: !!document.querySelector('[data-qa="resume-search-input"]'),
                hasSubmit: !!document.querySelector('[data-qa="vacancy-response-submit-popup"]'),
                hasQuestionnaire: false
            };
        })()
      `;
      const res = await this.client.callTool('evaluate', { expression: script });
      return res || { isModal: false, hasCoverLetter: false, hasResumeSelect: false, hasSubmit: false, hasQuestionnaire: false };
  }

  async scanApplyFormArbitrary(): Promise<QuestionnaireField[]> { return []; }
  async fillApplyForm(answers: QuestionnaireAnswer[]): Promise<boolean> { return true; }
  
  async submitApplyForm(): Promise<void> {
      await this.clickElement('[data-qa="vacancy-response-submit-popup"]');
  }

  async detectApplyOutcome(): Promise<'SUCCESS' | 'QUESTIONNAIRE' | 'UNKNOWN' | 'ERROR'> {
      return 'UNKNOWN';
  }

  async hideVacancy(vacancyId: string): Promise<boolean> { return true; }
  async readInputValue(selector: string): Promise<string | null> { return null; }
  
  async getPageFingerprint(pageType: string): Promise<{ structuralHash: string }> {
      return { structuralHash: 'mcp_hash' };
  }
}
