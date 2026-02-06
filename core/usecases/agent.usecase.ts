// ... (imports)
import { BrowserPort, RawVacancyCard } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig, WorkMode, SeniorityLevel, RoleCategory } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult, FiltersAppliedVerificationV1, ControlVerificationResult, VerificationStatus, VerificationSource, VacancyCardV1, VacancyCardBatchV1, VacancySalary, SeenVacancyIndexV1, DedupedVacancyBatchV1, DedupedCardResult, VacancyDecision, PreFilterResultBatchV1, PreFilterDecisionV1, PrefilterDecisionType, LLMDecisionBatchV1, LLMDecisionV1, VacancyExtractV1, VacancyExtractionBatchV1, VacancyExtractionStatus, LLMVacancyEvalBatchV1, LLMVacancyEvalResult, ApplyQueueV1, ApplyQueueItem, ApplyEntrypointProbeV1, ApplyFormProbeV1, ApplyDraftSnapshotV1, ApplyBlockedReason, CoverLetterSource, ApplySubmitReceiptV1, ApplyFailureReason, QuestionnaireSnapshotV1, QuestionnaireAnswerSetV1, QuestionnaireAnswer, ApplyAttemptState, SearchFieldDefinition, TokenLedger, ExecutionStatus, DOMFingerprintV1, DomDriftEventV1 } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, LLMScreeningInputV1, ScreeningCard, EvaluateExtractsInputV1, EvalCandidate, QuestionnaireAnswerInputV1 } from '../domain/llm_contracts';

export class AgentUseCase {
  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private llm: LLMProviderPort
  ) {}

  // --- Observability Helper ---
  private addTokenUsage(state: AgentState, input: number, output: number, cached: boolean): AgentState {
     const ledger = { ...state.tokenLedger };
     ledger.inputTokens += input;
     ledger.outputTokens += output;
     if (cached) ledger.cacheHits++; else ledger.cacheMisses++;
     return { ...state, tokenLedger: ledger };
  }

  private async updateState(state: AgentState): Promise<AgentState> {
    await this.storage.saveAgentState(state);
    this.ui.renderState(state);
    return state;
  }

  // --- Helpers for Profile Logic ---
  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private async computeHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private getSiteDefinition(siteId: string): SiteDefinition {
    if (siteId.includes('hh.ru')) {
      return {
        id: 'hh.ru',
        name: 'HeadHunter',
        searchStrategy: {
          knownUrls: ['https://hh.ru/search/vacancy/advanced'],
          keywords: ['расширенный поиск', 'advanced search', 'поиск вакансий'],
          maxSteps: 3
        }
      };
    }
    return {
      id: siteId,
      name: siteId,
      searchStrategy: {
        knownUrls: [],
        keywords: ['search', 'jobs'],
        maxSteps: 3
      }
    };
  }

  // --- Core Lifecycle ---

  async startLoginFlow(state: AgentState, targetSite: string): Promise<AgentState> {
      let newState = await this.updateState({
          ...state,
          status: AgentStatus.STARTING,
          logs: [...state.logs, `Starting flow for ${targetSite}...`]
      });

      try {
          await this.browser.launch();
          await this.browser.navigateTo('https://' + targetSite);
          
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

  async confirmLogin(state: AgentState): Promise<AgentState> {
      return this.updateState({
          ...state,
          status: AgentStatus.LOGGED_IN_CONFIRMED,
          logs: [...state.logs, "Login confirmed by user."]
      });
  }

  // --- Profile Capture ---

  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Check if we already have a profile in storage
      const savedProfile = await this.storage.getProfile(siteId);
      
      if (savedProfile) {
          return this.updateState({
              ...state,
              status: AgentStatus.PROFILE_CAPTURED,
              logs: [...state.logs, "Existing profile found. Skip capture."]
          });
      }

      // 2. If no profile, we need to navigate or ask user
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

  // --- Targeting (LLM) ---

  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
      const profile = await this.storage.getProfile(siteId);
      if (!profile) return this.failSession(state, "Profile not found for targeting.");

      // Dedupe: Check if targeting exists for this site (assuming profile invariant for now)
      // Ideally we check if targeting exists for this *profile hash*.
      const existingSpec = await this.storage.getTargetingSpec(siteId);
      
      if (existingSpec) {
          return this.updateState({
              ...state,
              status: AgentStatus.TARGETING_READY,
              activeTargetingSpec: existingSpec,
              logs: [...state.logs, "Targeting Spec loaded from storage (Cached)."]
          });
      }

      // Config check for API Key
      const config = await this.storage.getConfig();
      if (!config?.apiKey && config?.llmProvider !== 'mock') {
          return this.failSession(state, "API Key missing. Please configure in Settings.");
      }

      // LLM Call
      const summary: ProfileSummaryV1 = {
          siteId,
          profileHash: profile.contentHash,
          profileTextNormalized: profile.rawContent.substring(0, 5000), // Limit context
          userConstraints: {
              preferredWorkMode: config?.workMode || WorkMode.ANY,
              minSalary: config?.minSalary || null,
              currency: config?.currency || 'RUB',
              city: config?.city || null,
              targetLanguages: config?.targetLanguages || ['ru']
          }
      };

      try {
          const spec = await this.llm.analyzeProfile(summary);
          // Telemetry stub (Mock doesn't return usage yet properly, but assume fixed in future)
          // For now we manually track rough estimate
          let nextState = this.addTokenUsage(state, 1000, 500, false); 
          
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

  private validateTargetingSpec(spec: TargetingSpecV1): void { 
      // Validation stub
      if (!spec.targetRoles.ruTitles.length && !spec.targetRoles.enTitles.length) {
          throw new Error("Targeting Spec has no job titles.");
      }
  }

  // --- Search Navigation & Config ---

  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
      const def = this.getSiteDefinition(siteId);
      const searchUrl = def.searchStrategy.knownUrls[0];
      
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
      // Phase F1: Check Drift BEFORE scanning or relying on cache
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
      // compute hash
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

      // Check Cache
      const cachedSpec = await this.storage.getSearchUISpec(siteId);
      if (cachedSpec) {
           // We might want to check drift here too, but scanSearchPageDOM handles it usually.
           return this.updateState({
              ...state,
              status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
              activeSearchUISpec: cachedSpec,
              logs: [...state.logs, "Search UI Spec loaded from cache."]
          });
      }

      // Prepare LLM Input
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

      const uiSpec = await this.llm.analyzeSearchDOM(input);
      let nextState = this.addTokenUsage(state, 1500, 300, false);
      
      await this.storage.saveSearchUISpec(siteId, uiSpec);

      // Create Initial Prefs
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
              // Add more heuristics here
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
          
          if (field.semanticType === 'SUBMIT') {
               // Submit button is last
               continue;
          }

          if (prefValue !== undefined && prefValue !== '') {
               // Determine action type
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

      // Add Submit Step
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

  // --- Phase A Execution ---

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
          // Small pause
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
          if (step.actionType === 'CLICK') continue; // Skip buttons

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
              workMode: 'unknown', // naive init
              salary: this.parseSalaryString(c.salaryText),
              publishedAt: c.publishedAtText || null,
              cardHash: 'hash' // TODO
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

      // Ensure seen index exists
      let seenIndex = await this.storage.getSeenVacancyIndex(siteId);
      if (!seenIndex) seenIndex = { siteId, lastUpdatedAt: Date.now(), seenKeys: [] };

      const dedupResults: DedupedCardResult[] = [];
      let duplicateCount = 0;
      let seenCount = 0;
      let selectedCount = 0;

      for (const card of batch.cards) {
          const key = card.id; // Simple key for now
          let decision = VacancyDecision.SELECTED;

          if (seenIndex.seenKeys.includes(key)) {
              decision = VacancyDecision.SKIP_SEEN;
              seenCount++;
          } else {
              seenIndex.seenKeys.push(key); // Mark as seen now
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
          userCity: 'Moscow', // Mock preference
          results: dedupResults,
          summary: {
              total: batch.cards.length,
              selected: selectedCount,
              duplicates: duplicateCount,
              seen: seenCount
          }
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

          // Simple logic
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
          summary: { read: decisions.length, defer: 0, reject: 0 }
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

      const candidates = prefilter.results
          .filter(r => r.decision === 'READ_CANDIDATE')
          .map(r => batch.cards.find(c => c.id === r.cardId)!)
          .filter(Boolean);

      if (candidates.length === 0) return state;

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

      const output = await this.llm.screenVacancyCardsBatch(input);
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
          // Navigate and extract
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

      const candidates: EvalCandidate[] = extractBatch.results.map(r => ({
          id: r.vacancyId,
          title: 'Unknown', // Ideally get from card
          sections: r.sections,
          derived: { salary: r.sections.salary, workMode: r.sections.workMode }
      }));

      const input: EvaluateExtractsInputV1 = {
          profileSummary: profile.rawContent,
          targetingRules: {
              targetRoles: targeting.targetRoles.ruTitles,
              workModeRules: targeting.workModeRules,
              minSalary: 100000 // Mock
          },
          candidates
      };

      const output = await this.llm.evaluateVacancyExtractsBatch(input);
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

  // --- Phase E ---

  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> {
      const queue = state.activeApplyQueue;
      if (!queue) return state;

      const nextItem = queue.items.find(i => i.status === 'PENDING');
      if (!nextItem) return this.updateState({ ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, "Queue Finished."] });

      // Navigate
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
      
      // Cover Letter Logic
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

      // E2: Questionnaire Logic
      let answersSet: QuestionnaireAnswerSetV1 | null = null;
      let questionnaireSnapshot: QuestionnaireSnapshotV1 | null = null;

      if (probe.detectedFields.extraQuestionnaireDetected) {
          const rawFields = await this.browser.scanApplyFormArbitrary();
          const profile = await this.storage.getProfile(siteId);

          if (profile) {
              const qHash = await this.computeHash(JSON.stringify(rawFields.map(f => f.id)));
              
              // 1. Dedupe check
              answersSet = await this.storage.getQuestionnaireAnswerSet(siteId, qHash);
              
              if (!answersSet) {
                 // Generate via LLM
                 const inputs: QuestionnaireAnswerInputV1 = {
                     profileSummary: profile.rawContent,
                     userConstraints: {
                        preferredWorkMode: WorkMode.ANY, // simplify
                        minSalary: null,
                        currency: 'RUB',
                        city: null,
                        targetLanguages: []
                     },
                     fields: rawFields.map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options }))
                 };

                 const output = await this.llm.generateQuestionnaireAnswers(inputs);
                 // track usage
                 this.addTokenUsage(state, 500, 100, false);

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

              // Apply answers
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
          ...state,
          status: AgentStatus.APPLY_DRAFT_FILLED,
          activeApplyDraft: draft,
          activeQuestionnaireSnapshot: questionnaireSnapshot,
          activeQuestionnaireAnswers: answersSet,
          logs: [...state.logs, `Draft Filled. Source: ${source}. Quest: ${!!answersSet}`]
      });
  }

  // --- Phase E3: Retry Policy Helper ---
  private async getOrCreateApplyAttempt(siteId: string, vacancyId: string): Promise<ApplyAttemptState> {
      let attempt = await this.storage.getApplyAttemptState(siteId, vacancyId);
      if (!attempt) {
          attempt = {
              vacancyId,
              siteId,
              applyStage: 'STARTED',
              retryCount: 0,
              lastErrorCode: null,
              lastErrorMessage: null,
              lastAttemptAt: Date.now(),
              terminalAction: 'NONE'
          };
      }
      return attempt;
  }

  // --- Phase E1.4 + E3: Submit Apply Form with Retry Logic ---
  async submitApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeApplyProbe || !state.activeApplyFormProbe || !state.activeApplyQueue) {
          return this.failSession(state, "Missing dependencies for submit (Probe, Form, or Queue).");
      }

      const vacancyId = state.activeApplyProbe.taskId;
      const formProbe = state.activeApplyFormProbe;
      const entrypointSelector = state.activeApplyProbe.foundControls[0].selector;
      const url = state.activeApplyProbe.vacancyUrl;
      const successHints = formProbe.successTextHints || ['Success', 'отправлен'];

      // Find the queue item
      const queueItem = state.activeApplyQueue.items.find(i => i.vacancyId === vacancyId);
      if (!queueItem) {
          return this.failSession(state, `Queue item for vacancy ${vacancyId} not found.`);
      }

      // Initialize Policy State
      let attemptState = await this.getOrCreateApplyAttempt(siteId, vacancyId);
      
      // Safety Check
      if (attemptState.terminalAction !== 'NONE') {
          return this.updateState({
              ...state,
              activeApplyAttempt: attemptState,
              logs: [...state.logs, `Skipping submit: Vacancy already marked as ${attemptState.terminalAction}.`]
          });
      }

      let currentState = await this.updateState({
          ...state,
          status: AgentStatus.SUBMITTING_APPLICATION,
          activeApplyAttempt: attemptState,
          logs: [...state.logs, `INITIATING SUBMIT SEQUENCE for ${vacancyId}. Retry Count: ${attemptState.retryCount}`]
      });

      const MAX_RETRIES = 3;
      let successConfirmed = false;
      let confirmationEvidence = null;
      let failureReason: ApplyFailureReason | null = null;

      // --- RETRY LOOP ---
      while (attemptState.retryCount <= MAX_RETRIES && !successConfirmed) {
          
          if (attemptState.retryCount > 0) {
               currentState = await this.updateState({
                   ...currentState,
                   status: AgentStatus.APPLY_RETRYING,
                   activeApplyAttempt: attemptState,
                   logs: [...currentState.logs, `Retry Attempt #${attemptState.retryCount}... (Wait 1s)`]
               });
               await new Promise(r => setTimeout(r, 1000)); // Backoff
          }

          try {
              // 1. RE-OPEN & RE-FILL (Deterministic Idempotency)
              currentState = await this.updateState({
                  ...currentState,
                  logs: [...currentState.logs, `Navigating to ${url} and re-opening form...`]
              });
              await this.browser.navigateTo(url);
              
              // FIX F-004: Re-scan for fresh selector if stale
              let freshEntrypoint = entrypointSelector;
              if (attemptState.retryCount > 0) {
                  const freshControls = await this.browser.scanApplyEntrypoints();
                  if (freshControls.length > 0) freshEntrypoint = freshControls[0].selector;
              }

              const clickSuccess = await this.browser.clickElement(freshEntrypoint);
              if (!clickSuccess) {
                  throw new Error("Failed to re-open apply form.");
              }
              await new Promise(r => setTimeout(r, 1000));

              // 2. Refill Text if needed
              if (formProbe.detectedFields.coverLetterTextarea && formProbe.safeLocators.coverLetterHint) {
                  const config = await this.storage.getConfig();
                  let text = "Default Cover Letter"; // Fallback
                  
                  if (queueItem.generatedCoverLetter) text = queueItem.generatedCoverLetter;
                  else if (config?.coverLetterTemplate) text = config.coverLetterTemplate;
                  
                  await this.browser.inputText(formProbe.safeLocators.coverLetterHint, text);
              }

              // 2.1 Refill Questionnaire (Phase E2)
              if (formProbe.detectedFields.extraQuestionnaireDetected) {
                  const answers = await this.storage.getQuestionnaireAnswerSet(siteId, state.activeApplyDraft?.questionnaireSnapshot?.questionnaireHash || '');
                  if (answers) {
                      await this.browser.fillApplyForm(answers.answers);
                  }
              }

              // 3. SUBMIT
              currentState = await this.updateState({
                  ...currentState,
                  logs: [...currentState.logs, `Submitting form (Attempt ${attemptState.retryCount})...`]
              });
              
              await this.browser.submitApplyForm();

              // 4. VERIFY
              let verifyAttempts = 0;
              while (verifyAttempts < 5 && !successConfirmed) {
                  await new Promise(r => setTimeout(r, 1000));
                  const outcome = await this.browser.detectApplyOutcome();
                  
                  if (outcome === 'SUCCESS') {
                      successConfirmed = true;
                      confirmationEvidence = 'Detected by BrowserPort';
                      break;
                  }
                  if (outcome === 'UNKNOWN') {
                       const pageText = await this.browser.getPageTextMinimal();
                       for (const hint of successHints) {
                          if (pageText.includes(hint)) {
                              successConfirmed = true;
                              confirmationEvidence = hint;
                              break;
                          }
                       }
                  }
                  verifyAttempts++;
              }

              if (!successConfirmed) {
                  throw new Error("Confirmation not detected after submit.");
              }

          } catch (e: any) {
              console.error(e);
              attemptState.lastErrorCode = 'SUBMIT_ERROR';
              attemptState.lastErrorMessage = e.message;
              attemptState.retryCount++;
              attemptState.lastAttemptAt = Date.now();
              await this.storage.saveApplyAttemptState(siteId, attemptState);
              
              if (attemptState.retryCount > MAX_RETRIES) {
                  failureReason = 'TIMEOUT'; // Or generic retry exhaust
              }
          }
      }

      // --- POST-LOOP HANDLING ---

      if (successConfirmed) {
          // SUCCESS
          attemptState.applyStage = 'DONE';
          attemptState.terminalAction = 'NONE';
          await this.storage.saveApplyAttemptState(siteId, attemptState);

          queueItem.status = 'APPLIED';
          queueItem.applicationResult = new Date().toISOString();
      } else {
          // FAILURE -> FAILOVER
          attemptState.applyStage = 'FAILED';
          
          // Failover: Hide Vacancy
          currentState = await this.updateState({
              ...currentState,
              logs: [...currentState.logs, "Max retries reached. Initiating FAILOVER (Hide Vacancy)..."]
          });
          
          const hidden = await this.browser.hideVacancy(vacancyId);
          attemptState.terminalAction = hidden ? 'HIDDEN' : 'SKIPPED';
          await this.storage.saveApplyAttemptState(siteId, attemptState);

          queueItem.status = 'FAILED';
          queueItem.applicationResult = `Failed after ${attemptState.retryCount} attempts. Action: ${attemptState.terminalAction}`;
      }

      // Update Queue Stats
      const newSummary = state.activeApplyQueue.summary;
      newSummary.applied = state.activeApplyQueue.items.filter(i => i.status === 'APPLIED').length;
      newSummary.failed = state.activeApplyQueue.items.filter(i => i.status === 'FAILED').length;
      newSummary.pending = state.activeApplyQueue.items.filter(i => i.status === 'PENDING').length;
      await this.storage.saveApplyQueue(siteId, state.activeApplyQueue);

      // Create Receipt
      const receipt: ApplySubmitReceiptV1 = {
          receiptId: crypto.randomUUID(),
          vacancyId,
          siteId,
          submittedAt: Date.now(),
          submitAttempts: attemptState.retryCount,
          successConfirmed,
          confirmationSource: successConfirmed ? 'text_hint' : 'unknown',
          confirmationEvidence,
          finalQueueStatus: successConfirmed ? 'APPLIED' : 'FAILED',
          failureReason
      };
      await this.storage.saveApplySubmitReceipt(siteId, receipt);

      // Determine Final Status
      let finalStatus = AgentStatus.APPLY_SUBMIT_SUCCESS;
      let logMsg = `SUCCESS: Application submitted after ${attemptState.retryCount} attempts.`;

      if (!successConfirmed) {
          finalStatus = attemptState.terminalAction === 'HIDDEN' 
              ? AgentStatus.APPLY_FAILED_HIDDEN 
              : AgentStatus.APPLY_FAILED_SKIPPED;
          logMsg = `FAILURE: Application failed. Vacancy marked as ${attemptState.terminalAction}.`;
      }

      return this.updateState({
          ...currentState,
          status: finalStatus,
          activeApplyQueue: state.activeApplyQueue,
          activeApplyAttempt: attemptState,
          logs: [...currentState.logs, logMsg]
      });
  }

  // --- Phase F1: DOM Drift Check ---
  private async checkDomDrift(state: AgentState, siteId: string, pageType: 'search' | 'apply_form' | 'vacancy'): Promise<{ drifted: boolean, event?: DomDriftEventV1 }> {
      const currentFp = await this.browser.getPageFingerprint(pageType);
      const storedFp = await this.storage.getDomFingerprint(siteId, pageType);

      if (!storedFp) {
          // Baseline capture
          const newFp: DOMFingerprintV1 = {
              siteId,
              pageType,
              capturedAt: Date.now(),
              domVersion: 1,
              structuralHash: currentFp.structuralHash
          };
          await this.storage.saveDomFingerprint(siteId, newFp);
          return { drifted: false };
      }

      if (storedFp.structuralHash !== currentFp.structuralHash) {
          const event: DomDriftEventV1 = {
              siteId,
              pageType,
              detectedAt: Date.now(),
              expectedHash: storedFp.structuralHash,
              observedHash: currentFp.structuralHash,
              severity: 'HIGH',
              actionRequired: 'REANALYZE_UI'
          };
          return { drifted: true, event };
      }

      return { drifted: false };
  }

  // Phase F1: Drift Resolution
  async resolveDomDrift(state: AgentState, siteId: string): Promise<AgentState> {
     // Acknowledge drift = Clear broken artifacts + Clear drift status
     await this.storage.deleteSearchUISpec(siteId);
     await this.storage.deleteSearchApplyPlan(siteId);
     // We do NOT clear the drift fingerprint yet; it will be updated when the next scan succeeds (baseline update).
     // Actually, we should probably delete the old fingerprint so the next scan is treated as a new baseline.
     // Let's rely on baseline update logic in checkDomDrift: if we delete stored FP, next check saves new one.
     // But we only have get/save. Let's overwrite it on next successful scan?
     // Better: Remove the old stored fingerprint to allow "New Baseline" capture.
     // NOTE: storage port doesn't have deleteDomFingerprint specific method, but we have save.
     // We can just rely on the fact that the artifacts (UISpec) are gone, so the flow will naturally go to Scan -> Analysis.
     // When Scan happens, checkDomDrift will see mismatch again? YES.
     // So we MUST clear the stored fingerprint to accept the new one.
     // Let's use generic remove or add specific delete if strict. 
     // Using `removeByPrefix` on the specific key is safest if we construct it manually, 
     // or just trust that we can't easily delete it without a new port method.
     // Alternative: Update the stored fingerprint NOW to the observed one from the event?
     // Yes, that accepts the "Drift" as the "New Normal".
     
     if (state.activeDriftEvent) {
         const newFp: DOMFingerprintV1 = {
             siteId,
             pageType: state.activeDriftEvent.pageType as any,
             capturedAt: Date.now(),
             domVersion: Date.now(), // simple versioning
             structuralHash: state.activeDriftEvent.observedHash
         };
         await this.storage.saveDomFingerprint(siteId, newFp);
     }

     return this.updateState({
         ...state,
         status: AgentStatus.SEARCH_PAGE_READY, // Reset to state that triggers re-scan/re-analysis
         activeDriftEvent: null,
         logs: [...state.logs, "DOM Drift acknowledged. Old artifacts cleared. Ready for Re-analysis."]
     });
  }

  // --- Utils ---

  private parseSalaryString(text?: string): VacancySalary | null { 
     // Stub logic for parsing "100 000 - 200 000 руб."
     if (!text) return null;
     return { min: 100000, max: 200000, currency: 'RUB', gross: false };
  }
  
  private looseEquals(expected: any, actual: any): boolean { 
      return String(expected) === String(actual);
  }

  // --- Reset & Session Management ---

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> { 
      await this.storage.resetProfile(siteId);
      await this.storage.deleteTargetingSpec(siteId);
      
      // NEW: Clean dependent artifacts
      await this.storage.deleteSearchUISpec(siteId);
      await this.storage.deleteSearchApplyPlan(siteId);
      await this.storage.deleteAppliedFiltersSnapshot(siteId); // Probably good to clear execution state too?
      
      // Clear caches via prefix (using agreed prefixes)
      await this.storage.removeByPrefix(`as_quest_ans_${siteId}`);
      await this.storage.removeByPrefix(`as_quest_snap_${siteId}`);
      await this.storage.removeByPrefix(`as_search_dom_${siteId}`); // Clear DOM snapshot as well if we clear UI Spec
      
      return this.updateState({
          ...state,
          activeTargetingSpec: null,
          activeSearchUISpec: null,
          activeSearchDOMSnapshot: null,
          activeSearchApplyPlan: null,
          activeQuestionnaireAnswers: null,
          activeQuestionnaireSnapshot: null,
          status: AgentStatus.LOGGED_IN_CONFIRMED,
          logs: [...state.logs, "Profile data and derived artifacts (Targeting, UI Spec, Answers) reset."]
      });
  }
  
  async completeSession(state: AgentState): Promise<AgentState> { 
       return this.updateState({ ...state, status: AgentStatus.COMPLETED });
  }
  
  async failSession(state: AgentState, error: string): Promise<AgentState> { 
      console.error(error);
      return this.updateState({
          ...state,
          status: AgentStatus.FAILED,
          logs: [...state.logs, `CRITICAL ERROR: ${error}`]
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
      // Clear active runtime state but keep config/profile
      const newState = createInitialAgentState();
      // Restore persisted config
      const config = await this.storage.getConfig();
      // Keep logs if needed or clear them? Usually reset clears logs.
      await this.storage.saveAgentState(newState);
      this.ui.renderState(newState);
      return newState;
  }
}