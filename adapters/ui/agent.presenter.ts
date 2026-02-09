
// ... (imports)
import { UIPort } from '../../core/ports/ui.port';
import { AgentState, UserSearchPrefsV1 } from '../../core/domain/entities';
import { AgentUseCase } from '../../core/usecases/agent.usecase';
import { AgentConfig, AgentStatus } from '../../types';
import { DEFAULT_LLM_PROVIDER, LLMProviderRegistry } from '../../core/domain/llm_registry';
import { GeminiLLMAdapter } from '../llm/gemini.llm.adapter';
import { OpenAILLMAdapter } from '../llm/openai.llm.adapter';
import { MockLLMAdapter } from '../llm/mock.llm.adapter';

export class AgentPresenter implements UIPort {
  private viewCallback: ((state: AgentState) => void) | null = null;
  private useCase: AgentUseCase | null = null;
  private currentConfig: Partial<AgentConfig> = {};
  
  // Track the absolute latest state received from the UseCase to handle external interruptions (Pause)
  private latestState: AgentState | null = null;

  // Injection logic
  setUseCase(useCase: AgentUseCase) {
    this.useCase = useCase;
  }

  // --- Configuration Injection (Rehydration) ---
  setConfig(config: Partial<AgentConfig>) {
    this.currentConfig = config;
  }

  // --- Output Port Implementation ---
  renderState(state: AgentState): void {
    this.latestState = state;
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

  // --- Testing Connection (LLM Check) ---
  async testConfiguration(config: Partial<AgentConfig>): Promise<boolean> {
      const providerId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
      const providerDef = LLMProviderRegistry[providerId] || LLMProviderRegistry[DEFAULT_LLM_PROVIDER];
      let tempAdapter;

      if (providerDef.id === 'gemini_cloud') {
          if (!config.apiKey) return false;
          tempAdapter = new GeminiLLMAdapter(config.apiKey);
      } else if (['openai_cloud', 'deepseek_cloud', 'local_llm'].includes(providerDef.id)) {
          const baseUrl = providerDef.id === 'local_llm' 
            ? (config.localGatewayUrl || providerDef.defaultBaseUrl || '') 
            : (providerDef.defaultBaseUrl || '');
          const apiKey = config.apiKey || 'dummy';
          tempAdapter = new OpenAILLMAdapter(apiKey, baseUrl, providerDef.modelId || 'gpt-4');
      } else {
          tempAdapter = new MockLLMAdapter();
      }

      try {
          return await tempAdapter.checkConnection();
      } catch (e: any) {
          console.error("Test Config Failed:", e);
          if (e.message && e.message.includes('Connection Failed')) {
              console.warn("HINT: " + e.message);
          }
          return false;
      }
  }

  // --- Automation Loop ---
  // Orchestrates automatic transitions between states to prevent "stuck" agent
  private async runAutomationLoop(currentState: AgentState) {
      if (!this.useCase) return;
      
      // Always start with the freshest state if available to catch Pauses immediately
      let state = this.latestState && this.latestState.updatedAt > currentState.updatedAt ? this.latestState : currentState;
      if (this.latestState && this.latestState.isPaused) return;

      const site = this.currentConfig.targetSite || 'hh.ru';

      // Loop until we hit a "Wait" state or Error
      // Use a safety counter to prevent infinite loops in one tick
      let steps = 0;
      const MAX_STEPS_PER_TICK = 10;

      while (steps < MAX_STEPS_PER_TICK) {
          // CRITICAL: Check external pause signal (from UI button)
          if (this.latestState && this.latestState.isPaused) {
              break;
          }
          // Also check internal state pause
          if (state.isPaused || state.status === AgentStatus.FAILED) break;

          steps++;

          // 1. Targeting Ready -> Go to Search
          if (state.status === AgentStatus.TARGETING_READY) {
              state = await this.useCase.navigateToSearchPage(state, site);
              continue;
          }

          // 2. Search Page Ready -> Scan DOM
          if (state.status === AgentStatus.SEARCH_PAGE_READY) {
              state = await this.useCase.scanSearchPageDOM(state, site);
              continue;
          }

          // 3. DOM Ready -> Analyze UI
          if (state.status === AgentStatus.SEARCH_DOM_READY) {
              state = await this.useCase.performSearchUIAnalysis(state, site);
              continue;
          }

          // 4. Waiting for Prefs -> Auto-Submit (Automated now)
          if (state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS) {
              if (state.activeSearchPrefs) {
                  state = await this.useCase.submitSearchPrefs(state, state.activeSearchPrefs);
              } else {
                  // Fallback if no prefs generated? Should not happen.
                  break;
              }
              continue;
          }

          // 5. Prefs Saved -> Build Plan
          if (state.status === AgentStatus.SEARCH_PREFS_SAVED) {
              state = await this.useCase.buildSearchApplyPlan(state, site);
              continue;
          }

          // 6. Plan Ready -> Execute Cycle
          if (state.status === AgentStatus.APPLY_PLAN_READY) {
              state = await this.useCase.executeApplyPlanCycle(state, site);
              continue;
          }

          // 7. Search Ready -> Collect Batch
          if (state.status === AgentStatus.SEARCH_READY) {
              state = await this.useCase.collectVacancyCardsBatch(state, site);
              continue;
          }

          // 8. Vacancies Captured -> Dedup
          if (state.status === AgentStatus.VACANCIES_CAPTURED) {
              state = await this.useCase.dedupAndSelectVacancyBatch(state, site);
              continue;
          }

          // 9. Deduped -> Prefilter
          if (state.status === AgentStatus.VACANCIES_DEDUPED) {
              state = await this.useCase.runScriptPrefilter(state, site);
              continue;
          }

          // 10. Prefilter Done -> LLM Screening
          if (state.status === AgentStatus.PREFILTER_DONE) {
              state = await this.useCase.runLLMBatchScreening(state, site);
              continue;
          }

          // 11. LLM Screening Done -> Extraction
          if (state.status === AgentStatus.LLM_SCREENING_DONE) {
              state = await this.useCase.runVacancyExtraction(state, site);
              continue;
          }

          // 12. Extracted -> LLM Eval
          if (state.status === AgentStatus.VACANCIES_EXTRACTED) {
              state = await this.useCase.runLLMEvalBatch(state, site);
              continue;
          }

          // 13. Eval Done -> Build Queue
          if (state.status === AgentStatus.EVALUATION_DONE) {
              state = await this.useCase.buildApplyQueue(state, site);
              continue;
          }

          // 14. Queue Ready -> Probe Entrypoint (First Apply)
          if (state.status === AgentStatus.APPLY_QUEUE_READY) {
              state = await this.useCase.probeNextApplyEntrypoint(state, site);
              continue;
          }

          // 15. Apply Button Found -> Open Form
          if (state.status === AgentStatus.APPLY_BUTTON_FOUND) {
              state = await this.useCase.openAndScanApplyForm(state, site);
              continue;
          }

          // 16. Form Opened -> Fill Draft
          if (state.status === AgentStatus.APPLY_FORM_OPENED) {
              state = await this.useCase.fillApplyFormDraft(state, site);
              continue;
          }

          // 17. Draft Filled -> Submit
          if (state.status === AgentStatus.APPLY_DRAFT_FILLED) {
              state = await this.useCase.submitApplyForm(state, site);
              continue;
          }

          // 18. Submit Result -> Next in Queue
          if (state.status === AgentStatus.APPLY_SUBMIT_SUCCESS || state.status === AgentStatus.APPLY_SUBMIT_FAILED) {
              // Loop back to probe next item
              state = await this.useCase.probeNextApplyEntrypoint(state, site);
              continue;
          }

          // 19. Completed -> Rotate Search Context
          if (state.status === AgentStatus.COMPLETED) {
              state = await this.useCase.rotateSearchContext(state, site);
              continue;
          }

          // If no transition matched, break to allow UI update
          break;
      }

      // --- CONTINUATION LOGIC ---
      const isStillRunning = 
          state.status !== AgentStatus.IDLE && 
          state.status !== AgentStatus.FAILED && 
          // Note: COMPLETED now rotates to TARGETING_READY so it continues
          state.status !== AgentStatus.WAITING_FOR_HUMAN && 
          state.status !== AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE;

      const isPaused = (this.latestState && this.latestState.isPaused) || state.isPaused;

      if (isStillRunning && !isPaused) {
          setTimeout(() => this.runAutomationLoop(state), 200);
      }
  }

  // --- Controller Actions ---
  
  // Phase G1: Report Config Error
  async reportLLMConfigError(currentState: AgentState, message: string) {
      if (!this.useCase) return;
      await this.useCase.signalLLMConfigError(currentState, message);
  }

  // Phase F2: Explicit Site Selection
  async selectActiveSite(currentState: AgentState, siteId: string) {
      if (!this.useCase) return;
      try {
          await this.useCase.selectActiveSite(currentState, siteId);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Site Selection Error");
      }
  }

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

  async confirmLogin(currentState: AgentState) {
    if (!this.useCase) return;
    try {
      let current = await this.useCase.confirmLogin(currentState);
      const site = this.currentConfig.targetSite || 'hh.ru';
      current = await this.useCase.checkAndCaptureProfile(current, site);

      if (current.status === AgentStatus.WAITING_FOR_PROFILE_PAGE) {
          current = await this.useCase.scanAndNavigateToProfile(current, site);
      }

      if (current.status === AgentStatus.PROFILE_CAPTURED) {
         current = await this.useCase.generateTargetingSpec(current, site);
      }
      
      await this.runAutomationLoop(current);

    } catch (e) {
      console.error(e);
      await this.useCase.failSession(currentState, "Login/Profile Error");
    }
  }

  async confirmProfilePage(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let stateAfterCapture = await this.useCase.executeProfileCapture(currentState, site);
          
          if (stateAfterCapture.status === AgentStatus.PROFILE_CAPTURED) {
             stateAfterCapture = await this.useCase.generateTargetingSpec(stateAfterCapture, site);
          }
          
          await this.runAutomationLoop(stateAfterCapture);

      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Profile Capture Error");
      }
  }

  async continueToSearch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         const next = await this.useCase.navigateToSearchPage(currentState, site);
         await this.runAutomationLoop(next);
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "Navigation Error");
      }
  }

  async scanSearchUI(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         const next = await this.useCase.scanSearchPageDOM(currentState, site);
         await this.runAutomationLoop(next);
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "DOM Scan Error");
      }
  }

  async analyzeSearchUI(currentState: AgentState) {
      if (!this.useCase) return;
      try {
         const site = this.currentConfig.targetSite || 'hh.ru';
         const next = await this.useCase.performSearchUIAnalysis(currentState, site);
         await this.runAutomationLoop(next);
      } catch (e) {
         console.error(e);
         await this.useCase.failSession(currentState, "UI Analysis Error");
      }
  }

  async submitSearchPrefs(currentState: AgentState, prefs: UserSearchPrefsV1) {
    if (!this.useCase) return;
    try {
        let next = await this.useCase.submitSearchPrefs(currentState, prefs);
        await this.planSearchActions(next);
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Preferences Save Error");
    }
  }

  async planSearchActions(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        let next = await this.useCase.buildSearchApplyPlan(currentState, site);
        await this.runAutomationLoop(next); 
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Planning Error");
    }
  }

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
  
  async executePlanCycle(currentState: AgentState) {
    if (!this.useCase) return;
    try {
        const site = this.currentConfig.targetSite || 'hh.ru';
        let next = await this.useCase.executeApplyPlanCycle(currentState, site);
        await this.runAutomationLoop(next); 
    } catch (e) {
        console.error(e);
        await this.useCase.failSession(currentState, "Auto-Execution Error");
    }
  }

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

  async collectVacancyBatch(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.collectVacancyCardsBatch(currentState, site);
          await this.runAutomationLoop(next);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Batch Collection Error");
      }
  }

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
  
  async probeApplyEntrypoint(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.probeNextApplyEntrypoint(currentState, site);
          await this.runAutomationLoop(next);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Probe Apply Entrypoint Error");
      }
  }
  
  async openApplyForm(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.openAndScanApplyForm(currentState, site);
          await this.runAutomationLoop(next);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Open Apply Form Error");
      }
  }

  async fillApplyDraft(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.fillApplyFormDraft(currentState, site);
          await this.runAutomationLoop(next);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Fill Apply Draft Error");
      }
  }

  async submitApply(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.submitApplyForm(currentState, site);
          await this.runAutomationLoop(next);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Submit Application Error");
      }
  }

  async resolveDomDrift(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          await this.useCase.resolveDomDrift(currentState, site);
      } catch (e) {
          console.error(e);
          await this.useCase.failSession(currentState, "Resolve Drift Error");
      }
  }

  async resetProfile(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.resetProfileData(currentState, site);
          await this.useCase.checkAndCaptureProfile(next, site);
      } catch (e) {
          console.error(e);
      }
  }

  // --- MEMORY WIPE ---
  async wipeMemory(currentState: AgentState) {
      if (!this.useCase) return;
      try {
          const site = this.currentConfig.targetSite || 'hh.ru';
          let next = await this.useCase.forgetSearchHistory(currentState, site);
          // If paused, just render. If running, automation loop will pick up new clean state.
          this.renderState(next); 
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
