// Layer: ADAPTERS
// Purpose: Implementation of ports. External world details.

import { BrowserPort } from '../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult } from '../../core/domain/entities';

export class MockBrowserAdapter implements BrowserPort {
  private currentUrlVal: string = 'about:blank';

  async launch(): Promise<void> {
    console.log('[BrowserAdapter] Launching virtual browser session...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async navigateTo(url: string): Promise<void> {
    console.log(`[BrowserAdapter] Navigating to ${url}...`);
    this.currentUrlVal = url;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  async waitForHumanInteraction(message: string): Promise<void> {
    console.log(`[BrowserAdapter] PAUSED: ${message}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getDomSnapshot(): Promise<string> {
    console.log('[BrowserAdapter] SNAPSHOT: Capturing DOM...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return "<html><body><mock>Skeleton Content</mock></body></html>";
  }

  async getCurrentUrl(): Promise<string> {
    return this.currentUrlVal;
  }

  async getPageTextMinimal(): Promise<string> {
    // Stub: messy text to prove normalization
    return `
      Mock Profile Content:    Senior Engineer
      
      10 years exp...
      
      Stack: React,    Node,   AI.
    `;
  }

  async findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]> {
    console.log(`[BrowserAdapter] Scanning for links matching: [${keywords.join(', ')}]...`);
    // Mock logic: If we are NOT on a search page, pretend we found one.
    if (!this.currentUrlVal.includes('search')) {
      return [{ text: 'Расширенный поиск', href: '/search/vacancy/advanced' }];
    }
    return [];
  }

  async clickLink(href: string): Promise<void> {
    console.log(`[BrowserAdapter] Clicking link: ${href}`);
    // Simulate navigation via click
    this.currentUrlVal = href.startsWith('/') ? `https://hh.ru${href}` : href;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async scanPageInteractionElements(): Promise<RawFormField[]> {
    console.log('[BrowserAdapter] Scanning DOM for form controls...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mock: Return Advanced Search Fields (mimicking HH.ru)
    return [
        {
            id: 'f1',
            tag: 'input',
            inputType: 'text',
            label: 'Ключевые слова',
            attributes: { name: 'text', 'data-qa': 'vacancy-search-keyword' },
            isVisible: true
        },
        {
            id: 'f2',
            tag: 'input',
            inputType: 'number',
            label: 'Уровень дохода',
            attributes: { name: 'salary', 'data-qa': 'vacancy-search-salary' },
            isVisible: true
        },
        {
            id: 'f3',
            tag: 'select',
            label: 'Регион',
            attributes: { name: 'area' },
            options: [{ value: '1', label: 'Москва' }, { value: '2', label: 'Spb' }],
            isVisible: true
        },
        {
            id: 'f4',
            tag: 'input',
            inputType: 'checkbox',
            label: 'Только удаленная работа',
            attributes: { name: 'schedule', value: 'remote' },
            isVisible: true
        },
        {
            id: 'f5',
            tag: 'button',
            label: 'Найти',
            attributes: { type: 'submit', 'data-qa': 'advanced-search-submit' },
            isVisible: true
        }
    ];
  }

  async applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult> {
    console.log(`[BrowserAdapter] EXECUTING: ${actionType} on "${fieldDef.label}" (Hint: ${fieldDef.domHint}) with value: ${value}`);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple Mock Success Logic
    // In real implementation, this would use Puppeteer to find element by fieldDef.domHint
    
    return {
      success: true,
      observedValue: value // We assume it worked
    };
  }

  async close(): Promise<void> {
    console.log('[BrowserAdapter] Closing session.');
  }
}