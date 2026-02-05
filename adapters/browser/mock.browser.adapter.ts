// Layer: ADAPTERS
// Purpose: Implementation of ports. External world details.

import { BrowserPort, RawVacancyCard, ParsedVacancyPage, RawApplyFormSnapshot } from '../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, ApplyControl } from '../../core/domain/entities';

export class MockBrowserAdapter implements BrowserPort {
  private currentUrlVal: string = 'about:blank';
  
  // Simulated State of the Page Forms
  private formState: Record<string, any> = {};

  // Mock State for Apply Flow
  private isApplyModalOpen: boolean = false;
  // State specifically for apply inputs
  private applyFormInputs: Record<string, string> = {};
  
  // PATCH P1.11: Track success state after submit
  private isSuccessState: boolean = false;

  async launch(): Promise<void> {
    console.log('[BrowserAdapter] Launching virtual browser session...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async navigateTo(url: string): Promise<void> {
    console.log(`[BrowserAdapter] Navigating to ${url}...`);
    this.currentUrlVal = url;
    this.isApplyModalOpen = false; // Reset on nav
    this.applyFormInputs = {}; // Reset inputs
    this.isSuccessState = false; // Reset success state
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
    // PATCH P1.11: Return success marker if submitted
    if (this.isSuccessState) {
        return `
          Mock Profile Content:    Senior Engineer
          ...
          Application Sent Successfully!
          Отклик отправлен
        `;
    }

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

    // Mock: Return Advanced Search Fields (generic, not site-specific)
    return [
        {
            id: 'f1',
            tag: 'input',
            inputType: 'text',
            label: 'Ключевые слова',
            attributes: { name: 'text', 'mock-id': 'search-keyword' },
            isVisible: true
        },
        {
            id: 'f2',
            tag: 'input',
            inputType: 'number',
            label: 'Уровень дохода',
            attributes: { name: 'salary', 'mock-id': 'search-salary' },
            isVisible: true
        },
        {
            id: 'f3',
            tag: 'select',
            label: 'Регион',
            attributes: { name: 'area', 'mock-id': 'search-area' },
            options: [{ value: '1', label: 'Москва' }, { value: '2', label: 'Spb' }],
            isVisible: true
        },
        {
            id: 'f4',
            tag: 'input',
            inputType: 'checkbox',
            label: 'Только удаленная работа',
            attributes: { name: 'schedule', value: 'remote', 'mock-id': 'search-remote' },
            isVisible: true
        },
        {
            id: 'f5',
            tag: 'button',
            label: 'Найти',
            attributes: { type: 'submit', 'mock-id': 'search-submit' },
            isVisible: true
        }
    ];
  }

  async applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult> {
    console.log(`[BrowserAdapter] EXECUTING: ${actionType} on "${fieldDef.label}" (Hint: ${fieldDef.domHint}) with value: ${value}`);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Persist to mock state
    if (actionType !== 'CLICK' && fieldDef.domHint) {
       // Simple hash of hint as key
       this.formState[fieldDef.domHint] = value;
    }

    return {
      success: true,
      observedValue: value
    };
  }

  async readControlValue(fieldDef: SearchFieldDefinition): Promise<{ value: any; source: 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN' }> {
      console.log(`[BrowserAdapter] READING state of "${fieldDef.label}"...`);
      await new Promise(resolve => setTimeout(resolve, 200)); // Fast read

      // In real browser: perform page.eval using domHint
      // In Mock: read from formState
      if (fieldDef.domHint && this.formState[fieldDef.domHint] !== undefined) {
          return {
              value: this.formState[fieldDef.domHint],
              source: 'CONTROL_VALUE'
          };
      }

      return { value: null, source: 'UNKNOWN' };
  }

  async scanVacancyCards(limit: number): Promise<{ cards: RawVacancyCard[], nextPageCursor?: string }> {
      console.log(`[BrowserAdapter] Scaping ${limit} vacancy cards from list...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Sim scraping time

      // Mock Data Generation
      const mockCards: RawVacancyCard[] = [];
      const roles = ['Frontend Developer', 'React Senior', 'JS/TS Tech Lead', 'Junior Frontend', 'Middle React Native'];
      const companies = ['SberTech', 'Yandex', 'Avito', 'Tinkoff', 'Startup inc.'];
      const salaries = ['100 000 - 200 000 руб.', 'от 300 000 руб.', null, '2500 - 3500 USD', 'до 150 000 руб.'];

      for (let i = 0; i < limit; i++) {
          const role = roles[i % roles.length];
          const company = companies[i % companies.length];
          const salary = salaries[i % salaries.length];
          const isRemote = i % 3 === 0;

          mockCards.push({
              url: `https://hh.ru/vacancy/${100000 + i}`,
              externalId: String(100000 + i),
              title: role,
              company: company,
              city: 'Москва',
              salaryText: salary || undefined,
              workModeText: isRemote ? 'Можно удаленно' : 'В офисе',
              publishedAtText: '2 часа назад'
          });
      }

      return {
          cards: mockCards,
          nextPageCursor: 'page=1'
      };
  }

  async extractVacancyPage(): Promise<ParsedVacancyPage> {
      console.log('[BrowserAdapter] EXTRACTING details from vacancy page...');
      await new Promise(resolve => setTimeout(resolve, 800)); // Sim DOM read

      // SCENARIO LOGIC: Handle Edge Case (ID 100002 has salary: null in scanVacancyCards)
      if (this.currentUrlVal.includes('100002')) {
           return {
               // Merged block scenario: Requirements & Responsibilities in one blob
               requirements: [
                   "Requirements and Responsibilities (Merged Section):",
                   "- 3+ years experience with high-load systems",
                   "- Knowledge of distributed architecture",
                   "- Design and implement scalable services",
                   "- Conduct code reviews and mentor juniors"
               ],
               responsibilities: [], // Empty because found in requirements block
               conditions: [
                   "Health insurance",
                   "Flexible hours",
                   "Cookies in office"
               ],
               workMode: 'office', // Extracted from text "В офисе" (ID 100002 is not remote)
               salary: undefined // Explicitly undefined/unknown
           };
      }

      // Default Happy Path (e.g. for ID 100000)
      return {
          requirements: [
              "3+ years of experience with React/TypeScript",
              "Solid understanding of SOLID principles",
              "Experience with CI/CD"
          ],
          responsibilities: [
              "Develop new features for our core platform",
              "Collaborate with designers and backend engineers",
              "Participate in code reviews"
          ],
          conditions: [
              "Remote work possible",
              "Health insurance",
              "Yearly bonus"
          ],
          workMode: 'remote', // Confirmed from page
          salary: { min: 250000, max: 350000, currency: 'RUB', gross: true }
      };
  }

  async scanApplyEntrypoints(): Promise<ApplyControl[]> {
      console.log('[BrowserAdapter] Scanning for Apply controls...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock: Found "Respond" button with explicit mock selector
      return [
          {
              label: 'Откликнуться',
              selector: 'mock://vacancy/apply-button',
              type: 'BUTTON'
          }
      ];
  }

  async clickElement(selector: string): Promise<boolean> {
      console.log(`[BrowserAdapter] CLICKING element: ${selector}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock logic: Detect our mock-specific selector
      if (selector === 'mock://vacancy/apply-button') {
          this.isApplyModalOpen = true;
          return true;
      }
      
      // PATCH P1.11: Handle submit specifically
      if (selector === 'mock://apply-form/submit') {
          console.log('[BrowserAdapter] SUBMIT clicked! Closing modal, setting success state.');
          this.isApplyModalOpen = false;
          this.isSuccessState = true;
          return true;
      }

      return false;
  }

  async scanApplyForm(): Promise<RawApplyFormSnapshot> {
      console.log('[BrowserAdapter] Scanning Apply Form...');
      await new Promise(resolve => setTimeout(resolve, 800));

      if (this.isApplyModalOpen) {
          return {
              isModal: true,
              hasCoverLetter: true,
              hasResumeSelect: true,
              hasSubmit: true,
              hasQuestionnaire: false,
              coverLetterSelector: 'mock://apply-form/cover-letter',
              submitSelector: 'mock://apply-form/submit'
          };
      }

      // Fallback: Empty/Unknown
      return {
          isModal: false,
          hasCoverLetter: false,
          hasResumeSelect: false,
          hasSubmit: false,
          hasQuestionnaire: false
      };
  }

  async inputText(selector: string, text: string): Promise<boolean> {
    console.log(`[BrowserAdapter] INPUT into ${selector}: "${text.substring(0, 20)}..."`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we can input (simulate state)
    if (this.isApplyModalOpen) {
        // Use generic selector as key for mock state
        this.applyFormInputs[selector] = text;
        return true;
    }
    return false;
  }

  async readInputValue(selector: string): Promise<string | null> {
    console.log(`[BrowserAdapter] READING value from ${selector}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (this.isApplyModalOpen && this.applyFormInputs[selector] !== undefined) {
        return this.applyFormInputs[selector];
    }
    return null;
  }

  async close(): Promise<void> {
    console.log('[BrowserAdapter] Closing session.');
  }
}