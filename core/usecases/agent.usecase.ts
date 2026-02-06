
// ... (imports)
import { BrowserPort, RawVacancyCard } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig, WorkMode, SeniorityLevel, RoleCategory } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult, FiltersAppliedVerificationV1, ControlVerificationResult, VerificationStatus, VerificationSource, VacancyCardV1, VacancyCardBatchV1, VacancySalary, SeenVacancyIndexV1, DedupedVacancyBatchV1, DedupedCardResult, VacancyDecision, PreFilterResultBatchV1, PreFilterDecisionV1, PrefilterDecisionType, LLMDecisionBatchV1, LLMDecisionV1, VacancyExtractV1, VacancyExtractionBatchV1, VacancyExtractionStatus, LLMVacancyEvalBatchV1, LLMVacancyEvalResult, ApplyQueueV1, ApplyQueueItem, ApplyEntrypointProbeV1, ApplyFormProbeV1, ApplyDraftSnapshotV1, ApplyBlockedReason, CoverLetterSource, ApplySubmitReceiptV1, ApplyFailureReason, QuestionnaireSnapshotV1, QuestionnaireAnswerSetV1, QuestionnaireAnswer, ApplyAttemptState, SearchFieldDefinition, TokenLedger, ExecutionStatus, DOMFingerprintV1, DomDriftEventV1, PruningPolicyV1, DEFAULT_PRUNING_POLICY, ContextBudgetV1, CompactionSummaryV1, DEFAULT_COMPACTION_POLICY } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, LLMScreeningInputV1, ScreeningCard, EvaluateExtractsInputV1, EvalCandidate, QuestionnaireAnswerInputV1 } from '../domain/llm_contracts';
// NEW: Import Site Registry
import { getSite, SiteRegistry, DEFAULT_SITE_ID } from '../domain/site_registry';

export class AgentUseCase {
  
  // Phase G3 Constants
  private readonly CONTEXT_BUDGET: ContextBudgetV1 = {
      softTokenLimit: 30000,
      hardTokenLimit: 36000
  };

  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private llm: LLMProviderPort
  ) {}

  // ... (observability helpers)
  private addTokenUsage(state: AgentState, input: number, output: number, cached: boolean): AgentState {
     const ledger = { ...state.tokenLedger };
     ledger.inputTokens += input;
     ledger.outputTokens += output;
     ledger.calls += 1; // Phase G2: Count calls
     if (cached) ledger.cacheHits++; else ledger.cacheMisses++;
     return { ...state, tokenLedger: ledger };
  }

  // Phase G3: Context Monitor & Compaction Trigger
  private async updateState(state: AgentState): Promise<AgentState> {
    // 1. Monitor Context Health
    let nextState = this.monitorContextHealth(state);
    
    // 2. Persist
    await this.storage.saveAgentState(nextState);
    this.ui.renderState(nextState);
    return nextState;
  }

  private monitorContextHealth(state: AgentState): AgentState {
      // Heuristic: Chars / 4
      const jsonStr = JSON.stringify(state);
      const estimatedTokens = Math.ceil(jsonStr.length / 4);
      
      let status: 'OK' | 'NEAR_LIMIT' | 'OVER_LIMIT' = 'OK';
      let agentStatus = state.status;
      
      if (estimatedTokens >= this.CONTEXT_BUDGET.hardTokenLimit) {
          status = 'OVER_LIMIT';
          agentStatus = AgentStatus.CONTEXT_OVER_LIMIT;
      } else if (estimatedTokens >= this.CONTEXT_BUDGET.softTokenLimit) {
          status = 'NEAR_LIMIT';
          // Only trigger compaction ONCE per breach
          if (state.contextHealth?.status !== 'NEAR_LIMIT') {
             // Auto-compact logs if near limit
             return this.compactSession(state, estimatedTokens, status);
          }
          if (state.status !== AgentStatus.CONTEXT_NEAR_LIMIT) {
              agentStatus = AgentStatus.CONTEXT_NEAR_LIMIT;
          }
      }

      return {
          ...state,
          status: agentStatus,
          contextHealth: {
              estimatedTokens,
              softLimit: this.CONTEXT_BUDGET.softTokenLimit,
              hardLimit: this.CONTEXT_BUDGET.hardTokenLimit,
              status
          }
      };
  }

  private compactSession(state: AgentState, currentEstimate: number, healthStatus: 'NEAR_LIMIT' | 'OVER_LIMIT'): AgentState {
      // G3.0.1: Use Policy Constants
      const POLICY = DEFAULT_COMPACTION_POLICY;
      if (state.logs.length < (POLICY.keptLogHead + POLICY.keptLogTail + 5)) return state; // Nothing to compact

      // Summarize Logs (Script-only)
      const keptLogs = [
          ...state.logs.slice(0, POLICY.keptLogHead), 
          `... [COMPACTED ${state.logs.length - (POLICY.keptLogHead + POLICY.keptLogTail)} ITEMS] ...`,
          ...state.logs.slice(-POLICY.keptLogTail)
      ];

      const summaryId = crypto.randomUUID();
      const summary: CompactionSummaryV1 = {
          id: summaryId,
          createdAt: Date.now(),
          scope: 'session',
          source: ['logs'],
          summary: {
              logCountBefore: state.logs.length,
              lastStatus: state.status,
              notes: `Compacted at estimate ${currentEstimate} tokens.`
          }
      };

      // We cannot await here easily inside synchronous monitor, but we should persist summary.
      // Fire-and-forget save (robustness tradeoff for skeleton simplicity)
      this.storage.saveCompactionSummary(summary).catch(console.error);

      return {
          ...state,
          logs: keptLogs,
          lastCompaction: {
              summaryId,
              timestamp: Date.now()
          },
          status: AgentStatus.CONTEXT_NEAR_LIMIT // Force warning state
      };
  }

  // Phase G3: Input Pruning (Sanitizer)
  private pruneInput<T>(input: T, policy: PruningPolicyV1 = DEFAULT_PRUNING_POLICY): T {
      const json = JSON.stringify(input);
      
      // Safety Check: HTML Tags
      if (policy.forbidRawHtml) {
          // crude check for tags like <div>, <script>, </html>
          if (/<[a-z][\s\S]*>/i.test(json) || /<\/[a-z]+>/i.test(json)) {
              // We won't block everything (e.g. prompt might contain example tags),
              // but we check for MASSIVE html dumps.
              if (json.length > 5000 && (json.match(/<div/g) || []).length > 5) {
                   throw new Error("PRUNING_VIOLATION: Raw HTML detected in LLM input.");
              }
          }
      }

      // We return copy to avoid mutation, 
      // but in this skeleton we assume inputs are already DTOs constructed for LLM.
      // Real trimming would traverse the object.
      return input;
  }

  // ... (text normalization helpers remain same)
  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // ... (computeHash and getSiteDefinition remain same)
  private async computeHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Phase F2: Registry Lookup
  private getSiteDefinition(siteId: string): SiteDefinition {
    const fromRegistry = getSite(siteId);
    if (fromRegistry) return fromRegistry;
    
    return {
      id: siteId,
      label: siteId,
      baseUrl: `https://${siteId}`,
      enabled: true,
      storageNamespace: siteId,
      searchEntrypoint: { kind: 'url', url: `https://${siteId}/search` }
    };
  }

  // ... (Helpers: failSession, abortSession, resetSession, resetProfileData - unchanged)
  async failSession(state: AgentState, reason: string): Promise<AgentState> {
      return this.updateState({
          ...state,
          status: AgentStatus.FAILED,
          logs: [...state.logs, `❌ FAILURE: ${reason}`]
      });
  }

  async abortSession(state: AgentState): Promise<AgentState> {
      return this.updateState({
          ...state,
          status: AgentStatus.IDLE,
          logs: [...state.logs, "Session aborted by user."]
      });
  }

  async resetSession(state: AgentState): Promise<AgentState> {
      const newState = createInitialAgentState();
      return this.updateState(newState);
  }

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.resetProfile(siteId);
      return this.updateState({
          ...state,
          logs: [...state.logs, "Profile data reset."]
      });
  }

  // ... (Drift Detection methods unchanged)
  async checkDomDrift(state: AgentState, siteId: string, pageType: 'search' | 'vacancy' | 'apply_form' | 'unknown'): Promise<{ drifted: boolean; event?: DomDriftEventV1 }> {
        const fingerprint = await this.browser.getPageFingerprint(pageType);
        const stored = await this.storage.getDomFingerprint(siteId, pageType);

        if (!stored) {
            const newFp: DOMFingerprintV1 = {
                siteId,
                pageType,
                capturedAt: Date.now(),
                domVersion: 1,
                structuralHash: fingerprint.structuralHash
            };
            await this.storage.saveDomFingerprint(siteId, newFp);
            return { drifted: false };
        }

        if (stored.structuralHash !== fingerprint.structuralHash) {
            const event: DomDriftEventV1 = {
                siteId,
                pageType,
                detectedAt: Date.now(),
                expectedHash: stored.structuralHash,
                observedHash: fingerprint.structuralHash,
                severity: 'HIGH',
                actionRequired: 'HUMAN_CHECK'
            };
            return { drifted: true, event };
        }
        return { drifted: false };
  }

  async resolveDomDrift(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeDriftEvent) return state;
      
      const event = state.activeDriftEvent;
      const newFp: DOMFingerprintV1 = {
            siteId,
            pageType: event.pageType as any,
            capturedAt: Date.now(),
            domVersion: Date.now(),
            structuralHash: event.observedHash
      };
      await this.storage.saveDomFingerprint(siteId, newFp);
      
      return this.updateState({
          ...state,
          status: AgentStatus.IDLE,
          activeDriftEvent: null,
          logs: [...state.logs, "Drift resolved. Please retry."]
      });
  }

  // ... (signalLLMConfigError, startLoginFlow, selectActiveSite, confirmLogin, checkAndCaptureProfile, executeProfileCapture, generateTargetingSpec - unchanged)
  async signalLLMConfigError(state: AgentState, message: string): Promise<AgentState> {
      return this.updateState({
          ...state,
          status: AgentStatus.LLM_CONFIG_ERROR,
          logs: [...state.logs, `LLM Configuration Error: ${message}`]
      });
  }

  async startLoginFlow(state: AgentState, targetSite: string): Promise<AgentState> {
      let activeSiteId = targetSite;
      const config = await this.storage.getConfig();
      if (config?.activeSiteId) activeSiteId = config.activeSiteId;
      const siteDef = getSite(activeSiteId);
      if (!siteDef || !siteDef.enabled) {
          const defaultDef = getSite(DEFAULT_SITE_ID);
          if (defaultDef && defaultDef.enabled && (!config?.activeSiteId)) {
             activeSiteId = DEFAULT_SITE_ID; 
          } else {
             return this.updateState({
                 ...state,
                 status: AgentStatus.WAITING_FOR_SITE_SELECTION,
                 logs: [...state.logs, "Site selection required. Please choose a target site."]
             });
          }
      }
      if (config && config.activeSiteId !== activeSiteId) {
          config.activeSiteId = activeSiteId;
          await this.storage.saveConfig(config);
      }
      const validDef = getSite(activeSiteId)!; 
      let newState = await this.updateState({
          ...state,
          status: AgentStatus.STARTING,
          logs: [...state.logs, `Starting flow for ${validDef.label} (ID: ${validDef.id})...`]
      });
      try {
          await this.browser.launch();
          await this.browser.navigateTo(validDef.baseUrl);
          newState = await this.updateState({
              ...newState,
              status: AgentStatus.WAITING_FOR_HUMAN,
              currentUrl: await this.browser.getCurrentUrl(),
              logs: [...newState.logs, "Waiting for user to log in manually..."]
          });
          return newState;
      } catch (e: any) {
          return this.failSession(newState, `Browser Launch Error: ${e.message}`);
      }
  }

  async selectActiveSite(state: AgentState, siteId: string): Promise<AgentState> {
      const siteDef = getSite(siteId);
      if (!siteDef || !siteDef.enabled) {
          return this.updateState({
              ...state,
              logs: [...state.logs, `Error: Site ${siteId} is invalid or disabled.`]
          });
      }
      const config = await this.storage.getConfig() || { mode: 'JOB_SEARCH', targetSite: siteId };
      config.activeSiteId = siteId;
      config.targetSite = siteId; 
      await this.storage.saveConfig(config);
      return this.startLoginFlow(state, siteId);
  }

  async confirmLogin(state: AgentState): Promise<AgentState> {
      return this.updateState({
          ...state,
          status: AgentStatus.LOGGED_IN_CONFIRMED,
          logs: [...state.logs, "Login confirmed by user."]
      });
  }
  
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
      const savedProfile = await this.storage.getProfile(siteId);
      if (savedProfile) {
          return this.updateState({
              ...state,
              status: AgentStatus.PROFILE_CAPTURED,
              logs: [...state.logs, "Existing profile found. Skip capture."]
          });
      }
      return this.updateState({
          ...state,
          status: AgentStatus.WAITING_FOR_PROFILE_PAGE,
          logs: [...state.logs, "No profile found. Please navigate to your CV/Profile page."]
      });
  }

  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> {
      const url = await this.browser.getCurrentUrl();
      const rawText = await this.browser.getPageTextMinimal();
      const normalized = this.normalizeText(rawText);
      const hash = await this.computeHash(normalized);
      const snapshot: ProfileSnapshot = {
          siteId,
          capturedAt: Date.now(),
          sourceUrl: url,
          rawContent: rawText,
          contentHash: hash
      };
      await this.storage.saveProfile(snapshot);
      return this.updateState({
          ...state,
          status: AgentStatus.PROFILE_CAPTURED,
          logs: [...state.logs, `Profile captured! Hash: ${hash.substring(0, 8)}`]
      });
  }

  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
      const profile = await this.storage.getProfile(siteId);
      if (!profile) return this.failSession(state, "Profile not found for targeting.");
      const existingSpec = await this.storage.getTargetingSpec(siteId);
      if (existingSpec) {
          return this.updateState({
              ...state,
              status: AgentStatus.TARGETING_READY,
              activeTargetingSpec: existingSpec,
              logs: [...state.logs, "Targeting Spec loaded from storage (Cached)."]
          });
      }
      const config = await this.storage.getConfig();
      const summary: ProfileSummaryV1 = {
          siteId,
          profileHash: profile.contentHash,
          profileTextNormalized: profile.rawContent.substring(0, 5000), 
          userConstraints: {
              preferredWorkMode: config?.workMode || WorkMode.ANY,
              minSalary: config?.minSalary || null,
              currency: config?.currency || 'RUB',
              city: config?.city || null,
              targetLanguages: config?.targetLanguages || ['ru']
          }
      };
      try {
          const spec = await this.llm.analyzeProfile(this.pruneInput(summary));
          let nextState = state;
          if (spec.tokenUsage) {
               nextState = this.addTokenUsage(state, spec.tokenUsage.input, spec.tokenUsage.output, false);
          } else {
               nextState = this.addTokenUsage(state, 1000, 500, false); 
          }
          await this.storage.saveTargetingSpec(siteId, spec);
          return this.updateState({
              ...nextState,
              status: AgentStatus.TARGETING_READY,
              activeTargetingSpec: spec,
              logs: [...nextState.logs, "Targeting Spec generated by LLM."]
          });
      } catch (e: any) {
          return this.updateState({
              ...state,
              status: AgentStatus.TARGETING_ERROR,
              logs: [...state.logs, `LLM Error: ${e.message}`]
          });
      }
  }

  // ... (Search Config methods unchanged)
  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
      const def = this.getSiteDefinition(siteId);
      const searchUrl = (def.searchEntrypoint && 'url' in def.searchEntrypoint) 
          ? def.searchEntrypoint.url 
          : `https://${siteId}/search/vacancy/advanced`;
      let nextState = await this.updateState({
          ...state,
          status: AgentStatus.NAVIGATING_TO_SEARCH,
          logs: [...state.logs, `Navigating to search: ${searchUrl}`]
      });
      await this.browser.navigateTo(searchUrl);
      return this.updateState({
          ...nextState,
          status: AgentStatus.SEARCH_PAGE_READY,
          logs: [...nextState.logs, "Search page reached."]
      });
  }

  async scanSearchPageDOM(state: AgentState, siteId: string): Promise<AgentState> {
      const driftCheck = await this.checkDomDrift(state, siteId, 'search');
      if (driftCheck.drifted) {
          return this.updateState({
              ...state,
              status: AgentStatus.DOM_DRIFT_DETECTED,
              activeDriftEvent: driftCheck.event,
              logs: [...state.logs, `⚠️ DOM DRIFT DETECTED on Search Page. Action Required: ${driftCheck.event?.actionRequired}`]
          });
      }
      const rawFields = await this.browser.scanPageInteractionElements();
      const url = await this.browser.getCurrentUrl();
      const hashStr = JSON.stringify(rawFields.map(f => f.id + f.tag));
      const hash = await this.computeHash(hashStr);
      const snapshot: SearchDOMSnapshotV1 = {
          siteId,
          capturedAt: Date.now(),
          pageUrl: url,
          domVersion: 1,
          domHash: hash,
          fields: rawFields
      };
      await this.storage.saveSearchDOMSnapshot(siteId, snapshot);
      return this.updateState({
          ...state,
          status: AgentStatus.SEARCH_DOM_READY,
          activeSearchDOMSnapshot: snapshot,
          logs: [...state.logs, `DOM Scanned. Found ${rawFields.length} interactive elements.`]
      });
  }

  async performSearchUIAnalysis(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeSearchDOMSnapshot || !state.activeTargetingSpec) {
          return this.failSession(state, "Missing DOM Snapshot or Targeting Spec.");
      }
      const cachedSpec = await this.storage.getSearchUISpec(siteId);
      if (cachedSpec) {
           return this.updateState({
              ...state,
              status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
              activeSearchUISpec: cachedSpec,
              logs: [...state.logs, "Search UI Spec loaded from cache."]
          });
      }
      const input: SearchUIAnalysisInputV1 = {
          siteId,
          domSnapshot: {
              pageUrl: state.activeSearchDOMSnapshot.pageUrl,
              fields: state.activeSearchDOMSnapshot.fields
          },
          targetingContext: {
              targetRoles: [...state.activeTargetingSpec.targetRoles.ruTitles, ...state.activeTargetingSpec.targetRoles.enTitles],
              workModeRules: state.activeTargetingSpec.workModeRules,
              salaryRules: { minThresholdStrategy: state.activeTargetingSpec.salaryRules.minThresholdStrategy }
          }
      };
      const uiSpec = await this.llm.analyzeSearchDOM(this.pruneInput(input));
      let nextState = state;
      if (uiSpec.tokenUsage) {
           nextState = this.addTokenUsage(state, uiSpec.tokenUsage.input, uiSpec.tokenUsage.output, false);
      } else {
           nextState = this.addTokenUsage(state, 1500, 300, false);
      }
      await this.storage.saveSearchUISpec(siteId, uiSpec);
      const config = await this.storage.getConfig();
      const initialPrefs = this.createDraftPrefs(siteId, uiSpec, state.activeTargetingSpec, config || {});
      return this.updateState({
          ...nextState,
          status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
          activeSearchUISpec: uiSpec,
          activeSearchPrefs: initialPrefs,
          logs: [...nextState.logs, "Search UI analyzed. Waiting for user preferences..."]
      });
  }

  private createDraftPrefs(siteId: string, spec: SearchUISpecV1, targeting: TargetingSpecV1, config: Partial<AgentConfig>): UserSearchPrefsV1 {
      const prefs: UserSearchPrefsV1 = {
          siteId,
          updatedAt: Date.now(),
          additionalFilters: {}
      };
      spec.fields.forEach(field => {
          if (field.defaultBehavior === 'INCLUDE') {
              if (field.semanticType === 'WORK_MODE' && config.workMode === WorkMode.REMOTE && field.uiControlType === 'CHECKBOX') {
                  prefs.additionalFilters[field.key] = true;
              }
          }
      });
      return prefs;
  }

  async submitSearchPrefs(state: AgentState, prefs: UserSearchPrefsV1): Promise<AgentState> {
      await this.storage.saveUserSearchPrefs(prefs.siteId, prefs);
      return this.updateState({
          ...state,
          status: AgentStatus.SEARCH_PREFS_SAVED,
          activeSearchPrefs: prefs,
          logs: [...state.logs, "User Search Preferences Saved."]
      });
  }

  async buildSearchApplyPlan(state: AgentState, siteId: string): Promise<AgentState> {
      const uiSpec = state.activeSearchUISpec;
      const prefs = state.activeSearchPrefs;
      if (!uiSpec || !prefs) return this.failSession(state, "Missing UI Spec or Prefs");
      const steps: SearchApplyStep[] = [];
      let stepCounter = 0;
      for (const field of uiSpec.fields) {
          const prefValue = prefs.additionalFilters[field.key];
          if (field.semanticType === 'SUBMIT') continue;
          if (prefValue !== undefined && prefValue !== '') {
               let action: ApplyActionType = 'UNKNOWN';
               if (field.uiControlType === 'TEXT' || field.uiControlType === 'RANGE') action = 'FILL_TEXT';
               else if (field.uiControlType === 'SELECT') action = 'SELECT_OPTION';
               else if (field.uiControlType === 'CHECKBOX') action = 'TOGGLE_CHECKBOX';
               steps.push({
                   stepId: `step-${stepCounter++}`,
                   fieldKey: field.key,
                   actionType: action,
                   value: prefValue,
                   rationale: `User pref for ${field.label}`,
                   priority: stepCounter
               });
          }
      }
      const submitField = uiSpec.fields.find(f => f.semanticType === 'SUBMIT');
      if (submitField) {
          steps.push({
              stepId: `step-${stepCounter++}`,
              fieldKey: submitField.key,
              actionType: 'CLICK',
              value: 'true',
              rationale: 'Execute Search',
              priority: 999
          });
      }
      const plan: SearchApplyPlanV1 = {
          siteId,
          createdAt: Date.now(),
          steps
      };
      await this.storage.saveSearchApplyPlan(siteId, plan);
      return this.updateState({
          ...state,
          status: AgentStatus.APPLY_PLAN_READY,
          activeSearchApplyPlan: plan,
          logs: [...state.logs, `Apply Plan built with ${steps.length} steps.`]
      });
  }

  // ... (Phase A: execution methods unchanged)
  async executeSearchPlanStep(state: AgentState, siteId: string): Promise<AgentState> {
      const plan = state.activeSearchApplyPlan;
      const uiSpec = state.activeSearchUISpec;
      if (!plan || !uiSpec) return state;
      let appliedSnapshot = state.activeAppliedFilters;
      if (!appliedSnapshot) {
          appliedSnapshot = {
              siteId,
              createdAt: Date.now(),
              lastUpdatedAt: Date.now(),
              overallStatus: 'IN_PROGRESS',
              results: []
          };
      }
      const nextStepIndex = appliedSnapshot.results.length;
      if (nextStepIndex >= plan.steps.length) {
          return this.updateState({
              ...state,
              status: AgentStatus.SEARCH_READY,
              logs: [...state.logs, "All steps executed."]
          });
      }
      const step = plan.steps[nextStepIndex];
      const fieldDef = uiSpec.fields.find(f => f.key === step.fieldKey);
      if (!fieldDef) {
           return this.failSession(state, `Field def not found for key ${step.fieldKey}`);
      }
      const result = await this.browser.applyControlAction(fieldDef, step.actionType, step.value);
      const stepResult: AppliedStepResult = {
          ...result,
          stepId: step.stepId,
          fieldKey: step.fieldKey,
          timestamp: Date.now(),
          actionType: step.actionType,
          intendedValue: step.value
      };
      const newResults = [...appliedSnapshot.results, stepResult];
      const overallStatus: ExecutionStatus = newResults.length === plan.steps.length ? 'COMPLETED' : 'IN_PROGRESS';
      const newSnapshot = {
          ...appliedSnapshot,
          lastUpdatedAt: Date.now(),
          overallStatus,
          results: newResults
      };
      await this.storage.saveAppliedFiltersSnapshot(siteId, newSnapshot);
      const nextStatus = overallStatus === 'COMPLETED' ? AgentStatus.SEARCH_READY : AgentStatus.APPLY_STEP_DONE;
      return this.updateState({
          ...state,
          status: nextStatus,
          activeAppliedFilters: newSnapshot,
          logs: [...state.logs, `Executed step ${step.stepId}: ${result.success ? 'OK' : 'FAIL'}`]
      });
  }

  async executeApplyPlanCycle(state: AgentState, siteId: string): Promise<AgentState> {
      let currentState = state;
      const plan = state.activeSearchApplyPlan;
      if (!plan) return state;
      while (
          currentState.status !== AgentStatus.SEARCH_READY && 
          currentState.status !== AgentStatus.FAILED
      ) {
          currentState = await this.executeSearchPlanStep(currentState, siteId);
          await new Promise(r => setTimeout(r, 500));
      }
      return currentState;
  }

  async verifyAppliedFilters(state: AgentState, siteId: string): Promise<AgentState> {
      const plan = state.activeSearchApplyPlan;
      const uiSpec = state.activeSearchUISpec;
      if (!plan || !uiSpec) return state;
      const results: ControlVerificationResult[] = [];
      const mismatches: ControlVerificationResult[] = [];
      for (const step of plan.steps) {
          if (step.actionType === 'CLICK') continue; 
          const fieldDef = uiSpec.fields.find(f => f.key === step.fieldKey);
          if (fieldDef) {
              const read = await this.browser.readControlValue(fieldDef);
              const isMatch = this.looseEquals(step.value, read.value);
              const res: ControlVerificationResult = {
                  fieldKey: step.fieldKey,
                  expectedValue: step.value,
                  actualValue: read.value,
                  source: read.source,
                  status: isMatch ? 'MATCH' : 'MISMATCH'
              };
              results.push(res);
              if (!isMatch) mismatches.push(res);
          }
      }
      const verification: FiltersAppliedVerificationV1 = {
          siteId,
          verifiedAt: Date.now(),
          verified: mismatches.length === 0,
          results,
          mismatches
      };
      await this.storage.saveFiltersAppliedVerification(siteId, verification);
      return this.updateState({
          ...state,
          activeVerification: verification,
          logs: [...state.logs, `Verification Done. Mismatches: ${mismatches.length}`]
      });
  }

  // --- Phase B ---

  async collectVacancyCardsBatch(state: AgentState, siteId: string): Promise<AgentState> {
      const { cards, nextPageCursor } = await this.browser.scanVacancyCards(15);
      const batch: VacancyCardBatchV1 = {
          batchId: crypto.randomUUID(),
          siteId,
          capturedAt: Date.now(),
          queryFingerprint: 'TODO_HASH', 
          cards: cards.map(c => ({
              id: c.externalId || crypto.randomUUID(),
              siteId,
              externalId: c.externalId || null,
              url: c.url,
              title: c.title,
              company: c.company || null,
              city: c.city || null,
              workMode: 'unknown', 
              salary: this.parseSalaryString(c.salaryText),
              publishedAt: c.publishedAtText || null,
              cardHash: 'hash' 
          })),
          pageCursor: nextPageCursor || null
      };
      await this.storage.saveVacancyCardBatch(siteId, batch);
      return this.updateState({
          ...state,
          status: AgentStatus.VACANCIES_CAPTURED,
          activeVacancyBatch: batch,
          logs: [...state.logs, `Captured ${batch.cards.length} vacancies.`]
      });
  }

  async dedupAndSelectVacancyBatch(state: AgentState, siteId: string): Promise<AgentState> {
      const batch = state.activeVacancyBatch;
      if (!batch) return state;
      let seenIndex = await this.storage.getSeenVacancyIndex(siteId);
      if (!seenIndex) seenIndex = { siteId, lastUpdatedAt: Date.now(), seenKeys: [] };
      const dedupResults: DedupedCardResult[] = [];
      let duplicateCount = 0;
      let seenCount = 0;
      let selectedCount = 0;
      for (const card of batch.cards) {
          const key = card.id; 
          let decision = VacancyDecision.SELECTED;
          if (seenIndex.seenKeys.includes(key)) {
              decision = VacancyDecision.SKIP_SEEN;
              seenCount++;
          } else {
              seenIndex.seenKeys.push(key); 
              selectedCount++;
          }
          dedupResults.push({ cardId: card.id, decision, dedupKey: key });
      }
      await this.storage.saveSeenVacancyIndex(siteId, seenIndex);
      const dedupBatch: DedupedVacancyBatchV1 = {
          id: crypto.randomUUID(),
          batchId: batch.batchId,
          siteId,
          processedAt: Date.now(),
          userCity: 'Moscow', 
          results: dedupResults,
          summary: {
              total: batch.cards.length,
              selected: selectedCount,
              duplicates: duplicateCount,
              seen: seenCount
          },
          // G3.0.1: Signal derived from source batch
          endOfResults: !batch.pageCursor
      };
      await this.storage.saveDedupedVacancyBatch(siteId, dedupBatch);
      return this.updateState({
          ...state,
          status: AgentStatus.VACANCIES_DEDUPED,
          activeDedupedBatch: dedupBatch,
          logs: [...state.logs, `Dedup done. Selected: ${selectedCount}`]
      });
  }

  // --- Phase C ---

  async runScriptPrefilter(state: AgentState, siteId: string): Promise<AgentState> {
      const dedup = state.activeDedupedBatch;
      if (!dedup) return state;
      const decisions: PreFilterDecisionV1[] = [];
      const batch = state.activeVacancyBatch!;
      for (const res of dedup.results) {
          if (res.decision !== VacancyDecision.SELECTED) continue;
          const card = batch.cards.find(c => c.id === res.cardId);
          if (!card) continue;
          const decision: PrefilterDecisionType = 'READ_CANDIDATE';
          decisions.push({
              cardId: card.id,
              decision,
              reasons: [],
              score: 1.0,
              gates: { salary: 'PASS', workMode: 'PASS' }
          });
      }
      const prefilterBatch: PreFilterResultBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputBatchId: dedup.id,
          processedAt: Date.now(),
          thresholds: { read: 0.8, defer: 0.5 },
          results: decisions,
          summary: { read: decisions.length, defer: 0, reject: 0 },
          // G3.0.1: Propagate signal
          endOfResults: dedup.endOfResults
      };
      await this.storage.savePreFilterResultBatch(siteId, prefilterBatch);
      return this.updateState({
          ...state,
          status: AgentStatus.PREFILTER_DONE,
          activePrefilterBatch: prefilterBatch,
          logs: [...state.logs, `Prefilter done. Candidates: ${decisions.length}`]
      });
  }

  async runLLMBatchScreening(state: AgentState, siteId: string): Promise<AgentState> {
      const prefilter = state.activePrefilterBatch;
      const batch = state.activeVacancyBatch;
      const targeting = state.activeTargetingSpec;
      
      if (!prefilter || !batch || !targeting) return state;

      // Phase G3: Batch Discipline (Max 15) & End-of-Results
      const MAX_BATCH_SIZE = DEFAULT_PRUNING_POLICY.maxItemsPerBatch; // 15
      const MIN_BATCH_SIZE = DEFAULT_PRUNING_POLICY.minItemsPerBatch; // 10

      const candidates = prefilter.results
          .filter(r => r.decision === 'READ_CANDIDATE')
          .map(r => batch.cards.find(c => c.id === r.cardId)!)
          .filter(Boolean)
          .slice(0, MAX_BATCH_SIZE); // Enforcement

      // G3.0.1: Minimum Size Check
      if (candidates.length === 0) return state;
      if (candidates.length < MIN_BATCH_SIZE && !prefilter.endOfResults) {
          return this.updateState({
              ...state,
              logs: [...state.logs, `Batch deferred: ${candidates.length} candidates (min ${MIN_BATCH_SIZE}). Waiting for more...`]
          });
      }

      const input: LLMScreeningInputV1 = {
          siteId,
          targetingSpec: {
              targetRoles: [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles],
              seniority: targeting.seniorityLevels,
              matchWeights: targeting.titleMatchWeights
          },
          cards: candidates.map(c => ({
              id: c.id,
              title: c.title,
              company: c.company,
              salary: c.salary ? `${c.salary.min}-${c.salary.max}` : null,
              workMode: c.workMode,
              url: c.url
          }))
      };

      const output = await this.llm.screenVacancyCardsBatch(this.pruneInput(input));
      let nextState = this.addTokenUsage(state, output.tokenUsage.input, output.tokenUsage.output, false);

      const llmBatch: LLMDecisionBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputPrefilterBatchId: prefilter.id,
          decidedAt: Date.now(),
          modelId: 'mock',
          decisions: output.results,
          summary: {
              read: output.results.filter(r => r.decision === 'READ').length,
              defer: output.results.filter(r => r.decision === 'DEFER').length,
              ignore: output.results.filter(r => r.decision === 'IGNORE').length
          },
          tokenUsage: output.tokenUsage
      };

      await this.storage.saveLLMDecisionBatch(siteId, llmBatch);

      return this.updateState({
          ...nextState,
          status: AgentStatus.LLM_SCREENING_DONE,
          activeLLMBatch: llmBatch,
          logs: [...nextState.logs, `LLM Screening done. To Read: ${llmBatch.summary.read}`]
      });
  }

  // --- Phase D ---

  async runVacancyExtraction(state: AgentState, siteId: string): Promise<AgentState> {
      const llmBatch = state.activeLLMBatch;
      const batch = state.activeVacancyBatch;
      if (!llmBatch || !batch) return state;
      const toRead = llmBatch.decisions.filter(d => d.decision === 'READ');
      const results: VacancyExtractV1[] = [];
      for (const d of toRead) {
          const card = batch.cards.find(c => c.id === d.cardId)!;
          await this.browser.navigateTo(card.url);
          const parsed = await this.browser.extractVacancyPage();
          results.push({
              vacancyId: card.id,
              siteId,
              url: card.url,
              extractedAt: Date.now(),
              sections: {
                  requirements: parsed.requirements,
                  responsibilities: parsed.responsibilities,
                  conditions: parsed.conditions,
                  salary: parsed.salary,
                  workMode: parsed.workMode
              },
              extractionStatus: 'COMPLETE'
          });
      }
      const extBatch: VacancyExtractionBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputLLMBatchId: llmBatch.id,
          processedAt: Date.now(),
          results,
          summary: { total: results.length, success: results.length, failed: 0 }
      };
      await this.storage.saveVacancyExtractionBatch(siteId, extBatch);
      return this.updateState({
          ...state,
          status: AgentStatus.VACANCIES_EXTRACTED,
          activeExtractionBatch: extBatch,
          logs: [...state.logs, `Extracted ${results.length} vacancies.`]
      });
  }

  async runLLMEvalBatch(state: AgentState, siteId: string): Promise<AgentState> {
      const extractBatch = state.activeExtractionBatch;
      const profile = await this.storage.getProfile(siteId);
      const targeting = state.activeTargetingSpec;
      
      if (!extractBatch || !profile || !targeting) return state;

      // Phase G3: Batch Discipline (Max 15)
      const MAX_BATCH_SIZE = DEFAULT_PRUNING_POLICY.maxItemsPerBatch;
      const candidates: EvalCandidate[] = extractBatch.results
          .slice(0, MAX_BATCH_SIZE)
          .map(r => ({
              id: r.vacancyId,
              title: 'Unknown', 
              sections: r.sections,
              derived: { salary: r.sections.salary, workMode: r.sections.workMode }
          }));

      const input: EvaluateExtractsInputV1 = {
          profileSummary: profile.rawContent,
          targetingRules: {
              targetRoles: targeting.targetRoles.ruTitles,
              workModeRules: targeting.workModeRules,
              minSalary: 100000 
          },
          candidates
      };

      const output = await this.llm.evaluateVacancyExtractsBatch(this.pruneInput(input));
      let nextState = this.addTokenUsage(state, output.tokenUsage.input, output.tokenUsage.output, false);

      const evalBatch: LLMVacancyEvalBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputExtractionBatchId: extractBatch.id,
          decidedAt: Date.now(),
          modelId: 'mock',
          results: output.results.map(r => ({
              ...r,
              vacancyId: r.id
          })),
          summary: {
              apply: output.results.filter(r => r.decision === 'APPLY').length,
              skip: output.results.filter(r => r.decision === 'SKIP').length,
              needsHuman: output.results.filter(r => r.decision === 'NEEDS_HUMAN').length
          },
          tokenUsage: output.tokenUsage,
          status: 'OK'
      };

      await this.storage.saveLLMVacancyEvalBatch(siteId, evalBatch);

      return this.updateState({
          ...nextState,
          status: AgentStatus.EVALUATION_DONE,
          activeEvalBatch: evalBatch,
          logs: [...nextState.logs, `Eval Done. Apply: ${evalBatch.summary.apply}`]
      });
  }

  // ... (buildApplyQueue, probeNextApplyEntrypoint, openAndScanApplyForm, fillApplyFormDraft, submitApplyForm - unchanged)
  async buildApplyQueue(state: AgentState, siteId: string): Promise<AgentState> {
      const evalBatch = state.activeEvalBatch;
      const batch = state.activeVacancyBatch;
      if (!evalBatch || !batch) return state;
      const items: ApplyQueueItem[] = evalBatch.results
          .filter(r => r.decision === 'APPLY')
          .map(r => ({
              vacancyId: r.vacancyId,
              url: batch.cards.find(c => c.id === r.vacancyId)!.url,
              decision: r.decision,
              status: 'PENDING'
          }));
      const queue: ApplyQueueV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputEvalBatchId: evalBatch.id,
          createdAt: Date.now(),
          items,
          summary: { total: items.length, pending: items.length, applied: 0, failed: 0 }
      };
      await this.storage.saveApplyQueue(siteId, queue);
      return this.updateState({
          ...state,
          status: AgentStatus.APPLY_QUEUE_READY,
          activeApplyQueue: queue,
          logs: [...state.logs, `Queue Built: ${items.length} items.`]
      });
  }

  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> {
      const queue = state.activeApplyQueue;
      if (!queue) return state;
      const nextItem = queue.items.find(i => i.status === 'PENDING');
      if (!nextItem) return this.updateState({ ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, "Queue Finished."] });
      await this.browser.navigateTo(nextItem.url);
      const controls = await this.browser.scanApplyEntrypoints();
      const probe: ApplyEntrypointProbeV1 = {
          taskId: nextItem.vacancyId,
          vacancyUrl: nextItem.url,
          foundControls: controls,
          blockers: { requiresLogin: false, applyNotAvailable: controls.length === 0, unknownLayout: false },
          probedAt: Date.now()
      };
      return this.updateState({
          ...state,
          status: AgentStatus.APPLY_BUTTON_FOUND,
          activeApplyProbe: probe,
          logs: [...state.logs, `Entrypoint Probe: ${controls.length} controls found.`]
      });
  }

  async openAndScanApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      const probe = state.activeApplyProbe;
      if (!probe || !probe.foundControls.length) return state;
      const control = probe.foundControls[0];
      await this.browser.clickElement(control.selector);
      const form = await this.browser.scanApplyForm();
      const formProbe: ApplyFormProbeV1 = {
          taskId: probe.taskId,
          vacancyUrl: probe.vacancyUrl,
          entrypointUsed: control.label,
          applyUiKind: form.isModal ? 'MODAL' : 'PAGE',
          detectedFields: {
              coverLetterTextarea: form.hasCoverLetter,
              resumeSelector: form.hasResumeSelect,
              submitButtonPresent: form.hasSubmit,
              extraQuestionnaireDetected: form.hasQuestionnaire
          },
          safeLocators: {
              coverLetterHint: form.coverLetterSelector || null,
              submitHint: form.submitSelector || null
          },
          successTextHints: ['отправлен', 'success'],
          blockers: { requiresLogin: false, captchaOrAntibot: false, applyNotAvailable: false, unknownLayout: !form.hasSubmit },
          scannedAt: Date.now()
      };
      return this.updateState({
          ...state,
          status: AgentStatus.APPLY_FORM_OPENED,
          activeApplyFormProbe: formProbe,
          logs: [...state.logs, `Form Scanned: CL=${form.hasCoverLetter}, Submit=${form.hasSubmit}`]
      });
  }

  async fillApplyFormDraft(state: AgentState, siteId: string): Promise<AgentState> {
      const probe = state.activeApplyFormProbe;
      const config = await this.storage.getConfig();
      if (!probe) return state;
      const queueItem = state.activeApplyQueue?.items.find(i => i.vacancyId === probe.taskId);
      let source: CoverLetterSource = 'NONE';
      let textToFill = "";
      if (queueItem?.generatedCoverLetter) {
          textToFill = queueItem.generatedCoverLetter;
          source = 'GENERATED';
      } else if (config?.coverLetterTemplate) {
          textToFill = config.coverLetterTemplate;
          source = 'TEMPLATE';
      } else {
          textToFill = "Добрый день! Рассмотрите мое резюме.";
          source = 'DEFAULT';
      }
      if (probe.detectedFields.coverLetterTextarea && probe.safeLocators.coverLetterHint) {
          await this.browser.inputText(probe.safeLocators.coverLetterHint, textToFill);
      }
      let answersSet: QuestionnaireAnswerSetV1 | null = null;
      let questionnaireSnapshot: QuestionnaireSnapshotV1 | null = null;
      let nextState = state; 
      if (probe.detectedFields.extraQuestionnaireDetected) {
          const rawFields = await this.browser.scanApplyFormArbitrary();
          const profile = await this.storage.getProfile(siteId);
          if (profile) {
              const qHash = await this.computeHash(JSON.stringify(rawFields.map(f => f.id)));
              answersSet = await this.storage.getQuestionnaireAnswerSet(siteId, qHash);
              if (!answersSet) {
                 const inputs: QuestionnaireAnswerInputV1 = {
                     profileSummary: profile.rawContent,
                     userConstraints: {
                        preferredWorkMode: WorkMode.ANY, 
                        minSalary: null,
                        currency: 'RUB',
                        city: null,
                        targetLanguages: []
                     },
                     fields: rawFields.map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options }))
                 };
                 const output = await this.llm.generateQuestionnaireAnswers(this.pruneInput(inputs));
                 if (output.tokenUsage) {
                      nextState = this.addTokenUsage(state, output.tokenUsage.input, output.tokenUsage.output, false);
                 } else {
                      nextState = this.addTokenUsage(state, 500, 100, false);
                 }
                 answersSet = {
                     id: crypto.randomUUID(),
                     questionnaireHash: qHash,
                     vacancyId: probe.taskId,
                     generatedAt: Date.now(),
                     answers: output.answers,
                     globalRisks: output.globalRisks
                 };
                 await this.storage.saveQuestionnaireAnswerSet(siteId, answersSet);
              }
              await this.browser.fillApplyForm(answersSet.answers);
              questionnaireSnapshot = {
                  vacancyId: probe.taskId,
                  siteId,
                  pageUrl: probe.vacancyUrl,
                  capturedAt: Date.now(),
                  fields: rawFields,
                  questionnaireHash: qHash
              };
          }
      }
      const draft: ApplyDraftSnapshotV1 = {
          vacancyId: probe.taskId,
          siteId,
          createdAt: Date.now(),
          coverLetterFieldFound: probe.detectedFields.coverLetterTextarea,
          coverLetterFilled: true,
          coverLetterReadbackHash: null,
          coverLetterSource: source,
          questionnaireFound: probe.detectedFields.extraQuestionnaireDetected,
          questionnaireFilled: !!answersSet,
          questionnaireSnapshot: questionnaireSnapshot || undefined,
          questionnaireAnswers: answersSet || undefined,
          formStateSummary: 'Ready',
          blockedReason: null
      };
      await this.storage.saveApplyDraftSnapshot(siteId, draft);
      return this.updateState({
          ...nextState,
          status: AgentStatus.APPLY_DRAFT_FILLED,
          activeApplyDraft: draft,
          activeQuestionnaireSnapshot: questionnaireSnapshot,
          activeQuestionnaireAnswers: answersSet,
          logs: [...state.logs, `Draft Filled. Source: ${source}. Quest: ${!!answersSet}`]
      });
  }

  async submitApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      const draft = state.activeApplyDraft;
      if (!draft) return state;
      this.updateState({ ...state, status: AgentStatus.SUBMITTING_APPLICATION, logs: [...state.logs, "Submitting application..."]});
      await this.browser.submitApplyForm();
      const outcome = await this.browser.detectApplyOutcome();
      let nextStatus = AgentStatus.APPLY_SUBMIT_SUCCESS;
      if (outcome === 'ERROR' || outcome === 'UNKNOWN') nextStatus = AgentStatus.APPLY_SUBMIT_FAILED;
      else if (outcome === 'QUESTIONNAIRE') nextStatus = AgentStatus.FILLING_QUESTIONNAIRE;
      const receipt: ApplySubmitReceiptV1 = {
          receiptId: crypto.randomUUID(),
          vacancyId: draft.vacancyId,
          siteId,
          submittedAt: Date.now(),
          submitAttempts: 1,
          successConfirmed: outcome === 'SUCCESS',
          confirmationSource: 'unknown',
          confirmationEvidence: null,
          finalQueueStatus: outcome === 'SUCCESS' ? 'APPLIED' : 'FAILED',
          failureReason: outcome === 'SUCCESS' ? null : 'UNKNOWN'
      };
      await this.storage.saveApplySubmitReceipt(siteId, receipt);
      return this.updateState({
          ...state,
          status: nextStatus,
          logs: [...state.logs, `Submit Result: ${outcome}`]
      });
  }

  // ... (looseEquals and parseSalaryString - unchanged)
  private looseEquals(a: any, b: any): boolean {
      if (a === b) return true;
      if (a === null || b === null) return false;
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  private parseSalaryString(text?: string): VacancySalary | null {
      if (!text) return null;
      const clean = text.replace(/\s/g, '');
      const matches = clean.match(/(\d+)/g);
      let min: number | null = null;
      let max: number | null = null;
      if (matches && matches.length === 1) {
          min = parseInt(matches[0], 10);
      } else if (matches && matches.length >= 2) {
          min = parseInt(matches[0], 10);
          max = parseInt(matches[1], 10);
      }
      let currency = 'RUB';
      if (text.toUpperCase().includes('USD')) currency = 'USD';
      else if (text.toUpperCase().includes('EUR')) currency = 'EUR';
      return { min, max, currency, gross: false };
  }
}
