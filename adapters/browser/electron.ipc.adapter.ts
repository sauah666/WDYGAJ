
// Layer: ADAPTERS
// Purpose: Connects React (Renderer) to Electron (Main) via ContextBridge.

import { BrowserPort, RawVacancyCard, ParsedVacancyPage, RawApplyFormSnapshot } from '../../core/ports/browser.port';
import { RawFormField, SearchFieldDefinition, ApplyActionType, ExecutionResult, ApplyControl, QuestionnaireField, QuestionnaireAnswer } from '../../core/domain/entities';

// Type definition for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

export class ElectronIPCAdapter implements BrowserPort {
  
  constructor() {
    console.log('[ElectronIPCAdapter] Initialized.');
    if (!window.electronAPI) {
      throw new Error("Electron API not found. Are you running in Electron?");
    }
  }

  private async invoke<T>(action: string, payload: any = {}): Promise<T> {
    try {
      // @ts-ignore - TS might complain about optional invoke call if not strict null checks, but here we guarded in constructor (mostly)
      // Actually with ?, we need to assert it exists or use ?.
      return await window.electronAPI!.invoke(`browser:${action}`, payload);
    } catch (e: any) {
      console.error(`[ElectronIPC] Error calling ${action}:`, e);
      throw e;
    }
  }

  async launch(headless: boolean = true): Promise<void> {
    await this.invoke('launch', { headless });
  }

  async navigateTo(url: string): Promise<void> {
    await this.invoke('navigateTo', { url });
  }

  async waitForHumanInteraction(message: string): Promise<void> {
    // In Electron, we might show a native dialog, but for now we just wait/log
    console.log(`Waiting for human: ${message}`);
    // We could invoke a main process dialog here
  }

  async getDomSnapshot(): Promise<string> {
    return await this.invoke<string>('getDomSnapshot');
  }

  async captureScreenshot(): Promise<string | null> {
      try {
          return await this.invoke<string>('captureScreenshot');
      } catch (e) {
          console.error("Screenshot failed", e);
          return null;
      }
  }

  async getCurrentUrl(): Promise<string> {
    return await this.invoke<string>('getCurrentUrl');
  }

  async getPageTextMinimal(): Promise<string> {
    // TODO: Implement in main.js
    return "Page Text Placeholder"; 
  }

  async findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]> {
    // TODO: Implement in main.js
    return [];
  }

  async clickLink(href: string): Promise<void> {
    // TODO: Implement in main.js
    console.log('Click Link', href);
  }

  async scanPageInteractionElements(): Promise<RawFormField[]> {
    return await this.invoke<RawFormField[]>('scanPageInteractionElements');
  }

  async applyControlAction(fieldDef: SearchFieldDefinition, actionType: ApplyActionType, value: any): Promise<ExecutionResult> {
    // TODO: Implement specific control logic in main
    return { success: true };
  }

  async readControlValue(fieldDef: SearchFieldDefinition): Promise<{ value: any; source: 'CONTROL_VALUE' | 'URL_PARAMS' | 'UNKNOWN' }> {
    return { value: null, source: 'UNKNOWN' };
  }

  async scanVacancyCards(limit: number): Promise<{ cards: RawVacancyCard[], nextPageCursor?: string }> {
    const res = await this.invoke<{ cards: RawVacancyCard[] }>('scanVacancyCards', { limit });
    return { cards: res.cards || [] };
  }

  async extractVacancyPage(): Promise<ParsedVacancyPage> {
    const res = await this.invoke<any>('extractVacancyPage');
    return res || { requirements: [], responsibilities: [], conditions: [] };
  }

  async scanApplyEntrypoints(): Promise<ApplyControl[]> {
    return [];
  }

  async clickElement(selector: string): Promise<boolean> {
    return await this.invoke<boolean>('clickElement', { selector });
  }

  async scanApplyForm(): Promise<RawApplyFormSnapshot> {
    return { isModal: false, hasCoverLetter: false, hasResumeSelect: false, hasSubmit: false, hasQuestionnaire: false };
  }

  async scanApplyFormArbitrary(): Promise<QuestionnaireField[]> {
    return [];
  }

  async fillApplyForm(answers: QuestionnaireAnswer[]): Promise<boolean> {
    return true;
  }

  async submitApplyForm(): Promise<void> {
    // noop
  }

  async detectApplyOutcome(): Promise<'SUCCESS' | 'QUESTIONNAIRE' | 'UNKNOWN' | 'ERROR'> {
    return 'UNKNOWN';
  }

  async hideVacancy(vacancyId: string): Promise<boolean> {
    return true;
  }

  async inputText(selector: string, text: string): Promise<boolean> {
    return true;
  }

  async readInputValue(selector: string): Promise<string | null> {
    return null;
  }

  async getPageFingerprint(pageType: string): Promise<{ structuralHash: string }> {
    return { structuralHash: 'electron_hash' };
  }

  async close(): Promise<void> {
    // noop
  }
}
