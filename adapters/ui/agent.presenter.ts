// Layer: ADAPTERS
// Purpose: Connects React View to Use Cases. Implements UIPort (Output) and acts as Controller (Input).

import { UIPort } from '../../core/ports/ui.port';
import { AgentState, UserSearchPrefsV1 } from '../../core/domain/entities';
import { AgentUseCase } from '../../core/usecases/agent.usecase';
import { AgentConfig, AgentStatus } from '../../types';

export class AgentPresenter implements UIPort {
  private viewCallback: ((state: AgentState) => void) | null = null;
  private useCase: AgentUseCase | null = null;
  private currentConfig: Partial<AgentConfig> = {};

  // Injection logic
  setUseCase(useCase: AgentUseCase) {
    this.useCase = useCase;
  }

  // --- Output Port Implementation ---
  renderState(state: AgentState): void {
    if (this.viewCallback) {
      this.viewCallback(state);
    }
  }

  // --- View Binding ---
  bind(callback: (state: AgentState) => void) {
    this.viewCallback = callback;
  }

  unbind() {
    this.viewCallback = null;
  }

  // --- Controller Actions ---
  
  // Step 1: Start -> Open URL -> Wait for Human
  async startLoginSequence(initialState: AgentState, config: Partial<AgentConfig>) {
    if (!this.useCase) return;
    this.currentConfig = config;
    try {
      await this.useCase.startLoginFlow(initialState, config.targetSite || 'hh.ru');
    } catch (e) {
      console.error(e);
      await this.useCase.failSession(initialState, "Startup Error");
    }
  }

  // Step 2: User says "I logged in" -> Check Profile
  async confirmLogin(currentState: AgentState) {
    if (!this.useCase) return;
    try {
      // 1. Confirm Login
      let current = await this.useCase.confirmLogin(currentState);
      
      // 2. Check Profile
      const site = this.currentConfig.targetSite || 'hh.ru';
      current = await this.useCase.checkAndCaptureProfile(current, site);

      // If profile was already captured (found in storage), trigger targeting immediately
      if (current.status === AgentStatus.PROFILE_CAPTURED) {
         await this.useCase.generateTargetingSpec(current, site);
      }
      
    } catch (e) {
      console.error(e);
      await this.useCase.failSession(currentState, "Login/Profile Error");
    }
  }

  // Step 3: User says "I am on profile page" -> Capture -> Auto-Trigger Targeting
  async confirmProfilePage(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          // 1. Capture
          let stateAfterCapture = await this.useCase.executeProfileCapture(currentState, site);
          
          // 2. Trigger AI Targeting (Chained automatically)
          if (stateAfterCapture.status === AgentStatus.PROFILE_CAPTURED) {
             await this.useCase.generateTargetingSpec(stateAfterCapture, site);
          }
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Profile Capture Error");
      }
  }

  // Step 4: Continue to Search Page
  async continueToSearch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         await this.useCase.navigateToSearchPage(currentState, site);
         // NOTE: We stop here and let the UI reflect "SEARCH_PAGE_READY"
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "Navigation Error");
      }
  }

  // Step 5.2: Scan Search UI (DOM Snapshot)
  async scanSearchUI(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         await this.useCase.scanSearchPageDOM(currentState, site);
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "DOM Scan Error");
      }
  }

  // Step 5.3: LLM Analyze Search UI
  async analyzeSearchUI(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         await this.useCase.performSearchUIAnalysis(currentState, site);
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "UI Analysis Error");
      }
  }

  // Step 5.3: Submit Preferences
  async submitSearchPrefs(currentState: AgentState, prefs: UserSearchPrefsV1) {
    if (!this.useCase) return;
    try {
        await this.useCase.submitSearchPrefs(currentState, prefs);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Preferences Save Error");
    }
  }

  // Step 5.4: Plan Search Actions
  async planSearchActions(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        await this.useCase.buildSearchApplyPlan(currentState, site);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Planning Error");
    }
  }

  // Phase A1.1: Execute Single Step
  async executePlanStep(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        await this.useCase.executeSearchPlanStep(currentState, site);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Execution Error");
    }
  }
  
  // Phase A1.2: Execute Plan Cycle
  async executePlanCycle(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        await this.useCase.executeApplyPlanCycle(currentState, site);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Auto-Execution Error");
    }
  }

  // Phase A2.1: Verify Filters
  async verifySearchFilters(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        await this.useCase.verifyAppliedFilters(currentState, site);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Verification Error");
    }
  }

  // Phase B1: Collect Vacancy Batch
  async collectVacancyBatch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.collectVacancyCardsBatch(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Batch Collection Error");
      }
  }

  // Phase B2: Dedup
  async dedupVacancyBatch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.dedupAndSelectVacancyBatch(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Deduplication Error");
      }
  }

  // Phase C1: Script Prefilter
  async runScriptPrefilter(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.runScriptPrefilter(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Prefilter Error");
      }
  }

  // Phase C2: LLM Batch Screening
  async runLLMBatchScreening(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.runLLMBatchScreening(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "LLM Screening Error");
      }
  }

  // Phase D1: Vacancy Extraction
  async runVacancyExtraction(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.runVacancyExtraction(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Vacancy Extraction Error");
      }
  }

  // Phase D2: LLM Eval Batch
  async runLLMEvalBatch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.runLLMEvalBatch(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "LLM Evaluation Error");
      }
  }

  // Phase D2.2: Build Apply Queue
  async buildApplyQueue(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.buildApplyQueue(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Build Apply Queue Error");
      }
  }

  async resetProfile(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          // Reset data
          let nextState = await this.useCase.resetProfileData(currentState, site);
          // Restart check (which will now fail and ask for nav)
          await this.useCase.checkAndCaptureProfile(nextState, site);
      } catch (e) {
          console.error(e);
      }
  }

  async cancelSequence(currentState: AgentState) {
      if (!this.useCase) return;
      await this.useCase.abortSession(currentState);
  }

  async resetSession(currentState: AgentState) {
      if (!this.useCase) return;
      await this.useCase.resetSession(currentState);
  }
}