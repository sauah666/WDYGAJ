// Layer: USE CASES
// Purpose: Application specific business rules. Orchestrates flow between Domain and Ports.

import { BrowserPort, RawVacancyCard } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult, FiltersAppliedVerificationV1, ControlVerificationResult, VerificationStatus, VerificationSource, VacancyCardV1, VacancyCardBatchV1, VacancySalary, SeenVacancyIndexV1, DedupedVacancyBatchV1, DedupedCardResult, VacancyDecision, PreFilterResultBatchV1, PreFilterDecisionV1, PrefilterDecisionType, LLMDecisionBatchV1, LLMDecisionV1, VacancyExtractV1, VacancyExtractionBatchV1, VacancyExtractionStatus, LLMVacancyEvalBatchV1, LLMVacancyEvalResult, ApplyQueueV1, ApplyQueueItem, ApplyEntrypointProbeV1 } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, WorkMode, LLMScreeningInputV1, ScreeningCard, EvaluateExtractsInputV1, EvalCandidate } from '../domain/llm_contracts';

export class AgentUseCase {
  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private llm: LLMProviderPort
  ) {}

  private async updateState(state: AgentState): Promise<AgentState> {
    await this.storage.saveAgentState(state);
    this.ui.renderState(state);
    return state;
  }

  // --- Helpers for Profile Logic ---
  private normalizeText(text: string): string {
    // Collapse whitespace and lowercase
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private async computeHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Minimal Site Registry for Stage 5.2 (Hardcoded for now)
  private getSiteDefinition(siteId: string): SiteDefinition {
    // In a real app, this would come from a repository
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
    // Default fallback
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
  // --------------------------------

  async startLoginFlow(state: AgentState, url: string): Promise<AgentState> {
    let currentState = { ...state, status: AgentStatus.STARTING, logs: [...state.logs, 'Initializing login flow...'] };
    await this.updateState(currentState);
    
    await this.browser.launch();
    
    currentState = { ...currentState, status: AgentStatus.NAVIGATING, currentUrl: url, logs: [...currentState.logs, `Navigating to ${url}`] };
    await this.updateState(currentState);
    
    await this.browser.navigateTo(url);

    currentState = { 
      ...currentState, 
      status: AgentStatus.WAITING_FOR_HUMAN, 
      logs: [...currentState.logs, 'Waiting for manual login confirmation...'] 
    };
    return this.updateState(currentState);
  }

  async confirmLogin(state: AgentState): Promise<AgentState> {
    if (state.status !== AgentStatus.WAITING_FOR_HUMAN) {
      throw new Error(`Cannot confirm login from status ${state.status}`);
    }

    const newState = { 
      ...state, 
      status: AgentStatus.LOGGED_IN_CONFIRMED, 
      logs: [...state.logs, 'Human login confirmed. Session authenticated.'] 
    };
    return this.updateState(newState);
  }

  async captureContext(state: AgentState): Promise<AgentState> {
    const newState = { ...state, status: AgentStatus.EXTRACTING, logs: [...state.logs, 'Capturing DOM snapshot...'] };
    await this.updateState(newState);
    const snapshot = await this.browser.getDomSnapshot();
    
    const finalState = { 
        ...newState, 
        lastSnapshotTimestamp: Date.now(), 
        logs: [...newState.logs, `Snapshot captured (${snapshot.length} chars)`] 
    };
    return this.updateState(finalState);
  }

  /**
   * Stage 3.1: Skeleton for "One-time Profile Capture".
   */
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
    const logs = [...state.logs, `Checking existing profile for ${siteId}...`];
    let currentState = await this.updateState({ ...state, logs });

    // 1. Check if profile exists
    const existing = await this.storage.getProfile(siteId);
    if (existing) {
      // Stage 4.3: Ensure we reload the spec if we have the profile
      const spec = await this.storage.getTargetingSpec(siteId);
      
      if (spec) {
          // Optimized Path: Spec exists, skip generation
          currentState = { 
            ...currentState, 
            status: AgentStatus.TARGETING_READY,
            activeTargetingSpec: spec, 
            logs: [...currentState.logs, `Profile found. Existing Targeting Spec loaded. Skipping generation.`] 
          };
      } else {
          // Standard Path: Profile exists, Spec missing -> trigger generation
          currentState = { 
            ...currentState, 
            status: AgentStatus.PROFILE_CAPTURED,
            activeTargetingSpec: null, 
            logs: [...currentState.logs, `Profile found! Hash: ${existing.contentHash.substring(0, 8)}...`] 
          };
      }
      return this.updateState(currentState);
    }

    // 2. If unknown, we need user navigation
    currentState = { 
      ...currentState, 
      status: AgentStatus.WAITING_FOR_PROFILE_PAGE,
      logs: [...currentState.logs, `Profile unknown. Waiting for user to navigate to profile page...`]
    };
    return this.updateState(currentState);
  }

  /**
   * Stage 3.3: Capture, Normalize, Hash, and Compare.
   */
  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> {
      let newState = { ...state, status: AgentStatus.EXTRACTING, logs: [...state.logs, 'Extracting profile data...'] };
      await this.updateState(newState);

      // 1. Extract
      const url = await this.browser.getCurrentUrl();
      const rawContent = await this.browser.getPageTextMinimal();
      
      // 2. Normalize
      const normalizedContent = this.normalizeText(rawContent);
      
      // 3. Hash
      const hash = await this.computeHash(normalizedContent);

      // 4. Compare with existing (if any)
      const existing = await this.storage.getProfile(siteId);
      let logMsg = '';
      
      if (existing && existing.contentHash === hash) {
          logMsg = `Profile content identical (Hash: ${hash.substring(0,8)}). Timestamp updated.`;
      } else if (existing) {
          logMsg = `Profile changed! (Old: ${existing.contentHash.substring(0,8)} -> New: ${hash.substring(0,8)}). Updated.`;
      } else {
          logMsg = `Profile captured for first time. Hash: ${hash.substring(0,8)}.`;
      }

      const profile: ProfileSnapshot = {
          siteId,
          capturedAt: Date.now(),
          sourceUrl: url,
          rawContent: normalizedContent,
          contentHash: hash
      };

      await this.storage.saveProfile(profile);

      newState = { 
          ...newState, 
          status: AgentStatus.PROFILE_CAPTURED, 
          logs: [...newState.logs, logMsg] 
      };
      return this.updateState(newState);
  }

  /**
   * Stage 4.2: Derive Targeting Spec from Profile (LLM)
   */
  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
    // 1. Verify Profile
    const profile = await this.storage.getProfile(siteId);
    if (!profile) {
      return this.failSession(state, "Cannot generate targeting: Profile not found.");
    }

    // 2. Update Status
    let currentState = await this.updateState({ 
      ...state, 
      status: AgentStatus.TARGETING_PENDING,
      logs: [...state.logs, 'Initializing AI Analysis of profile...']
    });

    // 3. Prepare Input
    const config = await this.storage.getConfig();
    const input: ProfileSummaryV1 = {
      siteId,
      profileHash: profile.contentHash,
      profileTextNormalized: profile.rawContent,
      userConstraints: {
        preferredWorkMode: config?.workMode || WorkMode.ANY,
        minSalary: config?.minSalary || null,
        currency: config?.currency || 'RUB',
        city: config?.city || null,
        targetLanguages: config?.targetLanguages || ['ru']
      }
    };

    try {
      // 4. Call LLM (Single Shot)
      currentState = await this.updateState({ 
        ...currentState, 
        logs: [...currentState.logs, 'Sending profile to LLM for targeting generation...']
      });
      
      const spec = await this.llm.analyzeProfile(input);

      // 5. Validate Output (Strict)
      this.validateTargetingSpec(spec);

      // 6. Save Result
      await this.storage.saveTargetingSpec(siteId, spec);

      // 7. Complete
      const finalState = {
        ...currentState,
        status: AgentStatus.TARGETING_READY,
        activeTargetingSpec: spec, // Stage 4.3: Store spec in state for UI
        logs: [...currentState.logs, 'Targeting specification generated and saved.']
      };
      return this.updateState(finalState);

    } catch (e: any) {
      console.error(e);
      const errorState = {
        ...currentState,
        status: AgentStatus.TARGETING_ERROR,
        logs: [...currentState.logs, `LLM Analysis Failed: ${e.message}`]
      };
      return this.updateState(errorState);
    }
  }

  private validateTargetingSpec(spec: TargetingSpecV1): void {
    if (!spec.targetRoles.ruTitles.length && !spec.targetRoles.enTitles.length) {
      throw new Error("LLM returned empty target roles.");
    }
    if (spec.titleMatchWeights.exact < 0 || spec.titleMatchWeights.exact > 1) {
       throw new Error("Invalid weight range.");
    }
  }

  // --- Stage 5.2: Auto-Navigation to Search ---
  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
    let currentState = await this.updateState({ 
      ...state, 
      status: AgentStatus.NAVIGATING_TO_SEARCH,
      logs: [...state.logs, `Initiating auto-navigation to search page for ${siteId}...`]
    });

    const siteDef = this.getSiteDefinition(siteId);
    const strategy = siteDef.searchStrategy;

    try {
      // Strategy 1: Known Direct URLs
      if (strategy.knownUrls.length > 0) {
        const target = strategy.knownUrls[0];
        currentState = await this.updateState({ 
            ...currentState, 
            logs: [...currentState.logs, `Using known direct URL: ${target}`] 
        });
        await this.browser.navigateTo(target);
        // Assume success for now, or check URL
        return this.updateState({
          ...currentState,
          status: AgentStatus.SEARCH_PAGE_READY,
          logs: [...currentState.logs, `Navigation completed (Direct URL). Ready to scan.`]
        });
      }

      // Strategy 2: Heuristic Search (Find Links)
      let steps = 0;
      currentState = await this.updateState({ 
          ...currentState, 
          logs: [...currentState.logs, `No direct URL. Scanning page for keywords: [${strategy.keywords.join(', ')}]...`] 
      });

      while (steps < strategy.maxSteps) {
         const links = await this.browser.findLinksByTextKeywords(strategy.keywords);
         
         if (links.length > 0) {
             const bestLink = links[0]; // Take first match
             currentState = await this.updateState({ 
                ...currentState, 
                logs: [...currentState.logs, `Found link: "${bestLink.text}" (${bestLink.href}). Clicking...`] 
             });
             await this.browser.clickLink(bestLink.href);
             
             // Simple heuristic: If we clicked, we assume we are transitioning
             return this.updateState({
                ...currentState,
                status: AgentStatus.SEARCH_PAGE_READY,
                logs: [...currentState.logs, `Navigation completed (Link Click). Ready to scan.`]
             });
         }
         
         steps++;
         if (steps < strategy.maxSteps) {
            // Wait/Retry or check if page changed (omitted for brevity in skeleton)
             await new Promise(r => setTimeout(r, 1000));
         }
      }

      // Fallback: Failed to find
      return this.updateState({
        ...currentState,
        status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE,
        logs: [...currentState.logs, `Auto-navigation failed. Could not find search page links. Please navigate manually.`]
      });

    } catch (e: any) {
       console.error(e);
       return this.updateState({
        ...currentState,
        status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE,
        logs: [...currentState.logs, `Navigation Error: ${e.message}. Please navigate manually.`]
      });
    }
  }

  // --- Stage 5.2.3: Scan Search Page DOM ---
  async scanSearchPageDOM(state: AgentState, siteId: string): Promise<AgentState> {
    let currentState = await this.updateState({
       ...state,
       status: AgentStatus.EXTRACTING_SEARCH_UI,
       logs: [...state.logs, `Starting DOM Scan for ${siteId}...`]
    });

    try {
        // 1. Check if snapshot already exists
        const existing = await this.storage.getSearchDOMSnapshot(siteId);
        if (existing) {
             return this.updateState({
                ...currentState,
                status: AgentStatus.SEARCH_DOM_READY,
                activeSearchDOMSnapshot: existing,
                logs: [...currentState.logs, `Found existing DOM snapshot (v${existing.domVersion}). Skipping scan.`]
             });
        }

        // 2. Scan
        const fields = await this.browser.scanPageInteractionElements();
        const currentUrl = await this.browser.getCurrentUrl();

        // 3. Serialize
        const snapshot: SearchDOMSnapshotV1 = {
            siteId,
            capturedAt: Date.now(),
            pageUrl: currentUrl,
            domVersion: 1,
            fields: fields
        };

        // 4. Save
        await this.storage.saveSearchDOMSnapshot(siteId, snapshot);

        // 5. Update State
        return this.updateState({
            ...currentState,
            status: AgentStatus.SEARCH_DOM_READY,
            activeSearchDOMSnapshot: snapshot,
            logs: [...currentState.logs, `DOM Scan complete. Captured ${fields.length} interaction elements.`]
        });

    } catch (e: any) {
        console.error(e);
        return this.updateState({
            ...currentState,
            status: AgentStatus.FAILED, // Or recover
            logs: [...currentState.logs, `DOM Scan Failed: ${e.message}`]
        });
    }
  }

  // --- Stage 5.3: LLM Analysis of Search DOM ---
  async performSearchUIAnalysis(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Preconditions
      const snapshot = await this.storage.getSearchDOMSnapshot(siteId);
      const targeting = await this.storage.getTargetingSpec(siteId);
      const config = await this.storage.getConfig(); // Need config for auto-fill

      if (!snapshot || !targeting) {
          return this.failSession(state, "Missing DOM Snapshot or Targeting Spec for analysis.");
      }

      // 2. Check Existance
      const existingSpec = await this.storage.getSearchUISpec(siteId);
      if (existingSpec) {
          // If spec exists, we also try to recover draft prefs or create new ones
          const existingPrefs = await this.storage.getUserSearchPrefs(siteId);
          
          if (existingPrefs) {
              return this.updateState({
                  ...state,
                  status: AgentStatus.SEARCH_PREFS_SAVED, // Already done!
                  activeSearchUISpec: existingSpec,
                  activeSearchPrefs: existingPrefs,
                  logs: [...state.logs, `Loaded existing UI Spec and User Prefs. Ready to filter.`]
              });
          }

          // If Spec exists but Prefs do not -> Generate Draft
          const draftPrefs = this.createDraftPrefs(siteId, existingSpec, targeting, config || {});

          return this.updateState({
              ...state,
              status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
              activeSearchUISpec: existingSpec,
              activeSearchPrefs: draftPrefs,
              logs: [...state.logs, `Loaded existing UI Spec (v${existingSpec.version}). Prepared draft preferences.`]
          });
      }

      // 3. Prepare Input
      let currentState = await this.updateState({
          ...state,
          status: AgentStatus.ANALYZING_SEARCH_UI,
          logs: [...state.logs, `Sending ${snapshot.fields.length} DOM elements to LLM for semantic analysis...`]
      });

      const input: SearchUIAnalysisInputV1 = {
          siteId,
          domSnapshot: {
              pageUrl: snapshot.pageUrl,
              fields: snapshot.fields
          },
          targetingContext: {
              targetRoles: [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles],
              workModeRules: { strictMode: targeting.workModeRules.strictMode },
              salaryRules: { minThresholdStrategy: targeting.salaryRules.minThresholdStrategy }
          }
      };

      try {
          // 4. LLM Call
          const spec = await this.llm.analyzeSearchDOM(input);

          // 5. Validate (Basic)
          if (!spec.fields.some(f => f.semanticType !== 'OTHER')) {
             throw new Error("LLM failed to identify any semantic fields.");
          }

          // 6. Save Spec
          await this.storage.saveSearchUISpec(siteId, spec);

          // 7. Generate Draft Prefs (Stage 5.4 Logic)
          const draftPrefs = this.createDraftPrefs(siteId, spec, targeting, config || {});

          // 8. Finalize
          return this.updateState({
              ...currentState,
              status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
              activeSearchUISpec: spec,
              activeSearchPrefs: draftPrefs, // Inject draft
              logs: [...currentState.logs, `Analysis complete. Identified ${spec.fields.length} fields. Draft preferences generated.`]
          });

      } catch (e: any) {
          console.error(e);
          return this.updateState({
              ...currentState,
              status: AgentStatus.FAILED,
              logs: [...currentState.logs, `UI Analysis Failed: ${e.message}`]
          });
      }
  }

  // --- Stage 5.3: Create Draft Prefs ---
  private createDraftPrefs(siteId: string, spec: SearchUISpecV1, targeting: TargetingSpecV1, config: Partial<AgentConfig>): UserSearchPrefsV1 {
    const additionalFilters: Record<string, any> = {};

    // Auto-fill logic based on semantic types
    for (const field of spec.fields) {
        if (field.defaultBehavior === 'IGNORE' || field.defaultBehavior === 'EXCLUDE') continue;

        switch (field.semanticType) {
            case 'KEYWORD':
                // Combine roles. Just taking the first RU role for simplicity, or all joined
                // Real implementation might differ based on UI type (single input vs tag list)
                if (targeting.targetRoles.ruTitles.length > 0) {
                   additionalFilters[field.key] = targeting.targetRoles.ruTitles.join(' OR ');
                }
                break;
            case 'SALARY':
                if (config.minSalary) {
                   additionalFilters[field.key] = config.minSalary;
                }
                break;
            case 'LOCATION':
                if (config.city) {
                   // If it's a SELECT, we'd need to match options. 
                   // For now, we assume simple text or value match. 
                   // Complex fuzzy matching omitted for skeleton.
                   // If options exist, try to find one that includes the city name
                   if (field.options) {
                      const match = field.options.find(opt => opt.label.toLowerCase().includes(config.city!.toLowerCase()));
                      if (match) additionalFilters[field.key] = match.value;
                   } else {
                      additionalFilters[field.key] = config.city;
                   }
                }
                break;
            case 'WORK_MODE':
                if (config.workMode && config.workMode !== WorkMode.ANY) {
                    // For Checkbox: 'true' if we want it.
                    // But usually "Remote" is a specific checkbox.
                    // We assume the LLM identified the specific "Remote" checkbox.
                    // If the label contains "remote" or "удален", check it.
                    const isRemoteField = field.label.toLowerCase().includes('удален') || field.label.toLowerCase().includes('remote');
                    if (isRemoteField && config.workMode === WorkMode.REMOTE) {
                         additionalFilters[field.key] = true;
                    }
                }
                break;
            default:
                break;
        }
    }

    return {
        siteId,
        updatedAt: Date.now(),
        city: config.city,
        minSalary: config.minSalary,
        workMode: config.workMode,
        additionalFilters
    };
  }

  // --- Stage 5.3: Submit Prefs ---
  async submitSearchPrefs(state: AgentState, prefs: UserSearchPrefsV1): Promise<AgentState> {
      // 1. Save to storage
      await this.storage.saveUserSearchPrefs(prefs.siteId, prefs);

      // 2. Update State
      return this.updateState({
          ...state,
          status: AgentStatus.SEARCH_PREFS_SAVED,
          activeSearchPrefs: prefs,
          logs: [...state.logs, `User Search Preferences saved. Ready to build plan.`]
      });
  }

  // --- Stage 5.4: Build Apply Plan ---
  async buildSearchApplyPlan(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Checks
      const spec = await this.storage.getSearchUISpec(siteId);
      const prefs = await this.storage.getUserSearchPrefs(siteId);

      if (!spec || !prefs) {
          return this.failSession(state, "Cannot build Apply Plan: Missing Spec or Prefs.");
      }

      const existingPlan = await this.storage.getSearchApplyPlan(siteId);
      if (existingPlan) {
          // Also load existing execution snapshot if any
          const existingSnapshot = await this.storage.getAppliedFiltersSnapshot(siteId);

          return this.updateState({
             ...state,
             status: AgentStatus.APPLY_PLAN_READY,
             activeSearchApplyPlan: existingPlan,
             activeAppliedFilters: existingSnapshot,
             logs: [...state.logs, `Apply Plan already exists (${existingPlan.steps.length} steps). Ready to apply.`]
          });
      }

      // 2. Build Steps
      const steps: SearchApplyStep[] = [];
      const logs = [...state.logs, 'Building execution plan from user preferences...'];

      for (const field of spec.fields) {
          if (field.defaultBehavior === 'IGNORE' || field.defaultBehavior === 'EXCLUDE') continue;

          // Special Case: SUBMIT button
          if (field.semanticType === 'SUBMIT') {
              steps.push({
                  stepId: crypto.randomUUID(),
                  fieldKey: field.key,
                  actionType: 'CLICK',
                  value: true,
                  rationale: 'Submitting the search form',
                  priority: 100 // High priority (last)
              });
              continue;
          }

          const userValue = prefs.additionalFilters[field.key];
          
          // Only add step if user provided a value
          if (userValue !== undefined && userValue !== null && userValue !== '') {
               const priority = this.getSemanticPriority(field.semanticType);
               const action = this.mapControlTypeToAction(field.uiControlType);
               
               steps.push({
                   stepId: crypto.randomUUID(),
                   fieldKey: field.key,
                   actionType: action,
                   value: userValue,
                   rationale: `User preference for ${field.semanticType} (${field.label})`,
                   priority
               });
          }
      }

      // 3. Sort Steps
      // Logic: Fill Location -> Work Mode -> Salary -> Other Inputs -> Submit
      steps.sort((a, b) => a.priority - b.priority);

      // 4. Create & Save Plan
      const plan: SearchApplyPlanV1 = {
          siteId,
          createdAt: Date.now(),
          steps
      };

      await this.storage.saveSearchApplyPlan(siteId, plan);

      // 5. Update State
      return this.updateState({
          ...state,
          status: AgentStatus.APPLY_PLAN_READY,
          activeSearchApplyPlan: plan,
          logs: [...logs, `Plan built: ${steps.length} steps scheduled. Waiting for execution.`]
      });
  }

  // --- Phase A1.1: Execute Single Step ---
  async executeSearchPlanStep(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Load context
      const plan = await this.storage.getSearchApplyPlan(siteId);
      const spec = await this.storage.getSearchUISpec(siteId);
      let snapshot = await this.storage.getAppliedFiltersSnapshot(siteId);

      if (!plan || !spec) {
          return this.failSession(state, "Missing Plan or Spec for execution.");
      }

      if (!snapshot) {
          snapshot = {
              siteId,
              createdAt: Date.now(),
              lastUpdatedAt: Date.now(),
              overallStatus: 'IN_PROGRESS',
              results: []
          };
      }

      // 2. Determine Next Step
      // Find the first step in plan that is NOT in snapshot results as SUCCESS
      // This implicitly allows Retries (if a step failed, it's not successful, so it is picked again)
      const successfulStepIds = new Set(snapshot.results.filter(r => r.success).map(r => r.stepId));
      const nextStep = plan.steps.find(s => !successfulStepIds.has(s.stepId));

      if (!nextStep) {
          // All steps done!
          const logs = [...state.logs, "All steps executed successfully. Moving to SEARCH_READY."];
          snapshot.overallStatus = 'COMPLETED';
          snapshot.lastUpdatedAt = Date.now();
          await this.storage.saveAppliedFiltersSnapshot(siteId, snapshot);
          
          return this.updateState({
              ...state,
              status: AgentStatus.SEARCH_READY,
              activeAppliedFilters: snapshot,
              logs
          });
      }

      // 3. Prepare Execution
      const fieldDef = spec.fields.find(f => f.key === nextStep.fieldKey);
      if (!fieldDef) {
           // Critical error: Plan refers to missing field
           return this.failSession(state, `Plan references unknown field key: ${nextStep.fieldKey}`);
      }

      let currentState = await this.updateState({
          ...state,
          status: AgentStatus.APPLYING_FILTERS,
          logs: [...state.logs, `Executing Step: ${nextStep.actionType} on ${fieldDef.label}...`]
      });

      // 4. Execute via Port
      try {
          const result = await this.browser.applyControlAction(fieldDef, nextStep.actionType, nextStep.value);
          
          const stepResult: AppliedStepResult = {
              stepId: nextStep.stepId,
              fieldKey: nextStep.fieldKey,
              timestamp: Date.now(),
              actionType: nextStep.actionType,
              intendedValue: nextStep.value,
              success: result.success,
              observedValue: result.observedValue,
              error: result.error
          };

          // 5. Update Snapshot
          snapshot.results.push(stepResult);
          snapshot.lastUpdatedAt = Date.now();
          snapshot.overallStatus = 'IN_PROGRESS';
          await this.storage.saveAppliedFiltersSnapshot(siteId, snapshot);

          // 6. Update State
          const status = result.success ? AgentStatus.APPLY_STEP_DONE : AgentStatus.APPLY_STEP_FAILED;
          const logMsg = result.success 
              ? `Step Success: Set ${fieldDef.label} = ${nextStep.value}` 
              : `Step Failed: ${result.error}`;

          return this.updateState({
              ...currentState,
              status,
              activeAppliedFilters: snapshot,
              logs: [...currentState.logs, logMsg]
          });

      } catch (e: any) {
           console.error(e);
           return this.updateState({
              ...currentState,
              status: AgentStatus.APPLY_STEP_FAILED,
              logs: [...currentState.logs, `Execution Error: ${e.message}`]
           });
      }
  }

  // --- Phase A1.2: Execute Plan Cycle ---
  async executeApplyPlanCycle(state: AgentState, siteId: string): Promise<AgentState> {
      let currentState = state;
      const MAX_RETRIES = 3;

      while (true) {
          // 1. Check for Stop Condition from outside? (Not implemented in this loop, assumes run to completion)
          
          // 2. Get Snapshot for retry check
          const snapshot = await this.storage.getAppliedFiltersSnapshot(siteId);
          if (snapshot && snapshot.overallStatus === 'FAILED') {
              return this.failSession(currentState, "Plan execution previously failed permanently.");
          }

          // 3. Identify Next Step (Peek)
          const plan = await this.storage.getSearchApplyPlan(siteId);
          if (!plan) return this.failSession(currentState, "No plan found.");

          const successfulStepIds = new Set(snapshot?.results.filter(r => r.success).map(r => r.stepId) || []);
          const nextStep = plan.steps.find(s => !successfulStepIds.has(s.stepId));

          if (!nextStep) {
               // Nothing left to do, ensure state is updated final time
               return this.executeSearchPlanStep(currentState, siteId); 
          }

          // 4. Retry Policy Check
          const failuresForStep = snapshot?.results.filter(r => r.stepId === nextStep.stepId && !r.success).length || 0;
          if (failuresForStep >= MAX_RETRIES) {
               const logs = [...currentState.logs, `Step ${nextStep.fieldKey} failed ${failuresForStep} times. Aborting session.`];
               if (snapshot) {
                   snapshot.overallStatus = 'FAILED';
                   await this.storage.saveAppliedFiltersSnapshot(siteId, snapshot);
               }
               return this.updateState({
                   ...currentState,
                   status: AgentStatus.FAILED,
                   activeAppliedFilters: snapshot || undefined,
                   logs
               });
          }

          // 5. Execute Step
          currentState = await this.executeSearchPlanStep(currentState, siteId);

          // 6. Evaluate Result
          if (currentState.status === AgentStatus.SEARCH_READY) {
              return currentState; // Done
          }

          if (currentState.status === AgentStatus.FAILED) {
              return currentState; // Critical error
          }

          if (currentState.status === AgentStatus.APPLY_STEP_FAILED) {
              // Wait before retry
              await new Promise(r => setTimeout(r, 1000));
          } else if (currentState.status === AgentStatus.APPLY_STEP_DONE) {
              // Small delay for realism
              await new Promise(r => setTimeout(r, 500));
          }
          
          // Loop continues...
      }
  }

  // --- Phase A2.1: Verify Applied Filters ---
  async verifyAppliedFilters(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Load context
      const snapshot = await this.storage.getAppliedFiltersSnapshot(siteId);
      const spec = await this.storage.getSearchUISpec(siteId);
      
      if (!snapshot || !spec) {
          return this.failSession(state, "Missing snapshot or spec for verification.");
      }

      const logs = [...state.logs, "Verifying applied filters against actual DOM state..."];
      let currentState = await this.updateState({ ...state, logs });

      const results: ControlVerificationResult[] = [];
      const mismatches: ControlVerificationResult[] = [];

      // 2. Identify unique fields processed successfully
      const processedFields = new Map<string, AppliedStepResult>();
      
      // Iterate strictly in order, overwriting with latest success
      for (const step of snapshot.results) {
          if (step.success) {
              processedFields.set(step.fieldKey, step);
          }
      }

      // 3. Verify each field
      for (const [key, step] of processedFields) {
           const fieldDef = spec.fields.find(f => f.key === key);
           if (!fieldDef || fieldDef.semanticType === 'SUBMIT') continue; // Skip buttons/unknowns

           // a. Read from Browser
           const readResult = await this.browser.readControlValue(fieldDef);
           
           // b. Compare
           const isMatch = this.looseEquals(step.intendedValue, readResult.value);
           const status: VerificationStatus = readResult.source === 'UNKNOWN' ? 'UNKNOWN' : (isMatch ? 'MATCH' : 'MISMATCH');

           const result: ControlVerificationResult = {
               fieldKey: key,
               expectedValue: step.intendedValue,
               actualValue: readResult.value,
               source: readResult.source,
               status
           };

           results.push(result);
           if (status === 'MISMATCH') {
               mismatches.push(result);
           }
      }

      // 4. Create Verification Record
      const verification: FiltersAppliedVerificationV1 = {
          siteId,
          verifiedAt: Date.now(),
          verified: mismatches.length === 0,
          results,
          mismatches
      };

      await this.storage.saveFiltersAppliedVerification(siteId, verification);

      // 5. Update State
      const finalLog = mismatches.length === 0 
        ? `Verification Passed: All ${results.length} controls match.` 
        : `Verification WARNING: ${mismatches.length} mismatches detected.`;

      return this.updateState({
          ...currentState,
          activeVerification: verification,
          logs: [...currentState.logs, finalLog]
      });
  }

  // --- Phase B1: Collect Vacancy Cards ---
  async collectVacancyCardsBatch(state: AgentState, siteId: string): Promise<AgentState> {
      const logs = [...state.logs, "Scanning page for vacancy cards (Limit: 15)..."];
      let currentState = await this.updateState({ ...state, logs });

      try {
          // 1. Scan via Port
          const limit = 15;
          const { cards: rawCards, nextPageCursor } = await this.browser.scanVacancyCards(limit);

          if (rawCards.length === 0) {
              return this.updateState({
                  ...currentState,
                  logs: [...currentState.logs, "WARNING: No vacancy cards found on current page."]
              });
          }

          // 2. Normalize and Map to Domain Entity
          const cards: VacancyCardV1[] = [];
          
          for (const raw of rawCards) {
              const url = raw.url; // already absolute from adapter
              const title = raw.title.trim();
              const company = raw.company?.trim() || null;
              
              // Generate hash for dedup (Site + URL + Title)
              const hashInput = `${siteId}|${url}|${title}`;
              const cardHash = await this.computeHash(hashInput);

              // Parse Work Mode if present in raw text
              let workMode: 'remote' | 'hybrid' | 'office' | 'unknown' = 'unknown';
              if (raw.workModeText) {
                  const wm = raw.workModeText.toLowerCase();
                  if (wm.includes('удален') || wm.includes('remote')) workMode = 'remote';
                  else if (wm.includes('гибрид') || wm.includes('hybrid')) workMode = 'hybrid';
                  else if (wm.includes('офис') || wm.includes('office')) workMode = 'office';
              }

              // Salary Parsing is handled by Adapter usually, but if Adapter returns text, we parse here or assume Adapter did it.
              // For B1, we assume Adapter does heavy lifting or we do simple checks.
              // Let's rely on Adapter to have populated salary if possible, 
              // but our RawVacancyCard has 'salaryText'.
              // We need to parse it to VacancySalary structure if we want structured data now.
              // For simplicity in B1, we'll try to parse the text or leave null.
              const salary = this.parseSalaryString(raw.salaryText);

              cards.push({
                  id: crypto.randomUUID(),
                  siteId,
                  externalId: raw.externalId || null,
                  url,
                  title,
                  company,
                  city: raw.city || null,
                  workMode,
                  salary,
                  publishedAt: raw.publishedAtText || null,
                  cardHash
              });
          }

          // 3. Create Batch
          const currentUrl = await this.browser.getCurrentUrl();
          const queryFingerprint = await this.computeHash(currentUrl); // Simplified fingerprint

          const batch: VacancyCardBatchV1 = {
              batchId: crypto.randomUUID(),
              siteId,
              capturedAt: Date.now(),
              queryFingerprint,
              cards,
              pageCursor: nextPageCursor || null
          };

          // 4. Save Batch
          await this.storage.saveVacancyCardBatch(siteId, batch);

          // 5. Update State
          return this.updateState({
              ...currentState,
              status: AgentStatus.VACANCIES_CAPTURED,
              activeVacancyBatch: batch,
              logs: [...currentState.logs, `Collected batch of ${cards.length} vacancies.`]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `Vacancy Collection Failed: ${e.message}`);
      }
  }

  // --- Phase B2: Dedup & Select ---
  async dedupAndSelectVacancyBatch(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activeVacancyBatch) {
          return this.failSession(state, "No vacancy batch found to process.");
      }
      
      const logs = [...state.logs, "Processing vacancies: Deduplication & City Matching..."];
      let currentState = await this.updateState({ ...state, logs });

      try {
          const batch = state.activeVacancyBatch;
          const prefs = await this.storage.getUserSearchPrefs(siteId);
          const userCity = prefs?.city?.toLowerCase() || null;
          
          let seenIndex = await this.storage.getSeenVacancyIndex(siteId);
          if (!seenIndex) {
              seenIndex = { siteId, lastUpdatedAt: Date.now(), seenKeys: [] };
          }
          const seenSet = new Set(seenIndex.seenKeys);

          // 2. Group Cards
          const groups = new Map<string, VacancyCardV1[]>();

          for (const card of batch.cards) {
              // Group Key Logic: Use externalId if available, else Hash(Title+Company+Salary)
              let groupKey = '';
              if (card.externalId) {
                  groupKey = `EXT:${card.externalId}`;
              } else {
                  const salarySig = card.salary ? `${card.salary.min}-${card.salary.max}-${card.salary.currency}` : 'NOSALARY';
                  const rawKey = `${this.normalizeText(card.title)}|${this.normalizeText(card.company || '')}|${salarySig}`;
                  groupKey = `HASH:${await this.computeHash(rawKey)}`;
              }
              
              if (!groups.has(groupKey)) groups.set(groupKey, []);
              groups.get(groupKey)!.push(card);
          }

          // 3. Process Groups
          const results: DedupedCardResult[] = [];
          const newSeenKeys: string[] = [];
          
          let countSelected = 0;
          let countDuplicates = 0;
          let countSeen = 0;

          for (const [key, groupCards] of groups) {
              // Check if already seen
              const isSeen = seenSet.has(key); // We check key, not individual card hash, because key represents the "position"
              
              if (isSeen) {
                   // Mark all as SKIP_SEEN
                   for (const c of groupCards) {
                       results.push({ cardId: c.id, decision: VacancyDecision.SKIP_SEEN, dedupKey: key });
                   }
                   countSeen += groupCards.length;
                   continue;
              }

              // Selection Logic within Group
              // Sort by: 1. City Match, 2. Completeness, 3. Hash Stability
              groupCards.sort((a, b) => {
                  if (userCity) {
                      const aCity = a.city?.toLowerCase() || '';
                      const bCity = b.city?.toLowerCase() || '';
                      if (aCity.includes(userCity) && !bCity.includes(userCity)) return -1;
                      if (!aCity.includes(userCity) && bCity.includes(userCity)) return 1;
                  }
                  
                  // Completeness score
                  const scoreA = (a.salary ? 2 : 0) + (a.workMode !== 'unknown' ? 1 : 0);
                  const scoreB = (b.salary ? 2 : 0) + (b.workMode !== 'unknown' ? 1 : 0);
                  if (scoreA !== scoreB) return scoreB - scoreA;

                  return a.cardHash.localeCompare(b.cardHash);
              });

              // Winner
              const winner = groupCards[0];
              results.push({ cardId: winner.id, decision: VacancyDecision.SELECTED, dedupKey: key });
              newSeenKeys.push(key);
              countSelected++;

              // Losers
              for (let i = 1; i < groupCards.length; i++) {
                  results.push({ cardId: groupCards[i].id, decision: VacancyDecision.DUPLICATE, dedupKey: key });
                  countDuplicates++;
              }
          }

          // 4. Update Persistence
          seenIndex.seenKeys = [...seenIndex.seenKeys, ...newSeenKeys];
          seenIndex.lastUpdatedAt = Date.now();
          await this.storage.saveSeenVacancyIndex(siteId, seenIndex);

          const dedupedBatch: DedupedVacancyBatchV1 = {
              id: crypto.randomUUID(),
              batchId: batch.batchId,
              siteId,
              processedAt: Date.now(),
              userCity,
              results,
              summary: {
                  total: batch.cards.length,
                  selected: countSelected,
                  duplicates: countDuplicates,
                  seen: countSeen
              }
          };

          await this.storage.saveDedupedVacancyBatch(siteId, dedupedBatch);

          // 5. Update State
          return this.updateState({
              ...currentState,
              status: AgentStatus.VACANCIES_DEDUPED,
              activeDedupedBatch: dedupedBatch,
              logs: [...currentState.logs, `Deduped: ${countSelected} selected, ${countDuplicates} duplicates, ${countSeen} seen.`]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `Dedup Failed: ${e.message}`);
      }
  }
  
  // --- Phase C1: Script Prefilter ---
  async runScriptPrefilter(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activeDedupedBatch || !state.activeVacancyBatch) {
          return this.failSession(state, "No deduped batch found to filter.");
      }

      const targeting = await this.storage.getTargetingSpec(siteId);
      const userPrefs = await this.storage.getUserSearchPrefs(siteId); // For raw minSalary constraints if needed
      
      if (!targeting) {
           return this.failSession(state, "Missing targeting spec for prefilter.");
      }

      const logs = [...state.logs, "Running Script Prefilter (Salary, WorkMode, Title Score)..."];
      let currentState = await this.updateState({ ...state, logs });

      try {
          const THRESHOLD_READ = 0.7;
          const THRESHOLD_DEFER = 0.4;

          const batch = state.activeDedupedBatch;
          const results: PreFilterDecisionV1[] = [];
          
          let countRead = 0;
          let countDefer = 0;
          let countReject = 0;

          // Only process SELECTED cards
          const selectedResults = batch.results.filter(r => r.decision === VacancyDecision.SELECTED);
          
          for (const res of selectedResults) {
              const card = state.activeVacancyBatch!.cards.find(c => c.id === res.cardId);
              if (!card) continue;

              const reasons: string[] = [];
              let score = 0;
              let salaryGate: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';
              let workModeGate: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';

              // --- 1. Salary Gate ---
              // Rule: Reject if card.max < user.min
              if (card.salary && card.salary.max && userPrefs?.minSalary) {
                   if (card.salary.max < userPrefs.minSalary) {
                       salaryGate = 'FAIL';
                       reasons.push('salary_too_low');
                   } else {
                       salaryGate = 'PASS';
                   }
              } else if (card.salary) {
                  salaryGate = 'PASS'; // Salary exists but no strict conflict
              } else {
                  salaryGate = 'UNKNOWN';
              }

              // --- 2. WorkMode Gate ---
              // Logic: If strictMode is ON, we require exact match (or acceptable mapping)
              // Simplified: If user said REMOTE, reject OFFICE/HYBRID.
              // If User said ANY, pass all.
              const userMode = userPrefs?.workMode || WorkMode.ANY;
              const strictMode = targeting.workModeRules.strictMode;
              
              if (userMode === WorkMode.ANY) {
                  workModeGate = 'PASS';
              } else if (card.workMode === 'unknown') {
                  workModeGate = 'UNKNOWN'; // Give benefit of doubt
              } else {
                  // Mismatch logic
                  let isMatch = false;
                  if (userMode === WorkMode.REMOTE && card.workMode === 'remote') isMatch = true;
                  else if (userMode === WorkMode.HYBRID && (card.workMode === 'hybrid' || card.workMode === 'office')) isMatch = true; // Hybrid usually allows office
                  else if (userMode === WorkMode.OFFICE && card.workMode === 'office') isMatch = true;
                  
                  if (!isMatch && strictMode) {
                      workModeGate = 'FAIL';
                      reasons.push('work_mode_mismatch');
                  } else {
                      workModeGate = 'PASS';
                  }
              }

              // --- 3. Title Score ---
              const normalizedTitle = this.normalizeText(card.title);
              
              // Negative Keywords
              const isNegative = targeting.titleMatchWeights.negativeKeywords.some(kw => normalizedTitle.includes(this.normalizeText(kw)));
              if (isNegative) {
                  score = -1.0;
                  reasons.push('negative_keyword');
              } else {
                  // Positive Matching
                  // Exact match
                  const allTargets = [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles];
                  const exactMatch = allTargets.some(t => normalizedTitle.includes(this.normalizeText(t)));
                  
                  if (exactMatch) {
                      score += 1.0;
                      reasons.push('title_exact_match');
                  } else {
                      // Token overlap (Fuzzy)
                      // Simple implementation: count overlapping words
                      const titleTokens = normalizedTitle.split(' ');
                      let maxOverlap = 0;
                      for (const target of allTargets) {
                           const targetTokens = this.normalizeText(target).split(' ');
                           const intersection = titleTokens.filter(t => targetTokens.includes(t));
                           const overlap = intersection.length / targetTokens.length;
                           if (overlap > maxOverlap) maxOverlap = overlap;
                      }
                      score += (0.5 * maxOverlap);
                      if (maxOverlap > 0.5) reasons.push('title_fuzzy_match');
                  }
                  
                  // Seniority Bonus
                  // (Omitted in minimal impl, can add if needed)
              }

              // --- 4. Final Decision ---
              let decision: PrefilterDecisionType = 'REJECT';

              if (salaryGate === 'FAIL' || workModeGate === 'FAIL' || score < 0) {
                  decision = 'REJECT';
                  countReject++;
              } else if (score >= THRESHOLD_READ) {
                  decision = 'READ_CANDIDATE';
                  countRead++;
              } else if (score >= THRESHOLD_DEFER) {
                  decision = 'DEFER';
                  countDefer++;
              } else {
                  decision = 'REJECT';
                  reasons.push('low_score');
                  countReject++;
              }

              results.push({
                  cardId: card.id,
                  decision,
                  reasons,
                  score,
                  gates: { salary: salaryGate, workMode: workModeGate }
              });
          }

          // 5. Artifact
          const prefilterBatch: PreFilterResultBatchV1 = {
              id: crypto.randomUUID(),
              siteId,
              inputBatchId: batch.id,
              processedAt: Date.now(),
              thresholds: { read: THRESHOLD_READ, defer: THRESHOLD_DEFER },
              results,
              summary: {
                  read: countRead,
                  defer: countDefer,
                  reject: countReject
              }
          };

          await this.storage.savePreFilterResultBatch(siteId, prefilterBatch);

          // 6. Update State
          return this.updateState({
              ...currentState,
              status: AgentStatus.PREFILTER_DONE,
              activePrefilterBatch: prefilterBatch,
              logs: [...currentState.logs, `Prefilter: ${countRead} Candidates, ${countDefer} Deferred, ${countReject} Rejected.`]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `Prefilter Failed: ${e.message}`);
      }
  }

  // --- Phase C2: LLM Batch Screening ---
  async runLLMBatchScreening(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activePrefilterBatch || !state.activeVacancyBatch) {
          return this.failSession(state, "No prefilter batch results found for LLM screening.");
      }

      const targeting = await this.storage.getTargetingSpec(siteId);
      if (!targeting) {
          return this.failSession(state, "Missing targeting spec.");
      }

      const logs = [...state.logs, "Running LLM Batch Screening..."];
      let currentState = await this.updateState({ ...state, logs });

      try {
          const prefilterBatch = state.activePrefilterBatch;
          
          // 2. Select Candidates (Priority: READ > DEFER, Score Desc)
          const candidates = prefilterBatch.results
              .filter(r => r.decision === 'READ_CANDIDATE' || r.decision === 'DEFER')
              .sort((a, b) => {
                  // Prioritize READ over DEFER
                  if (a.decision === 'READ_CANDIDATE' && b.decision !== 'READ_CANDIDATE') return -1;
                  if (a.decision !== 'READ_CANDIDATE' && b.decision === 'READ_CANDIDATE') return 1;
                  // Then by Score Desc
                  return b.score - a.score;
              });

          if (candidates.length === 0) {
             return this.updateState({
                 ...currentState,
                 status: AgentStatus.LLM_SCREENING_DONE,
                 logs: [...currentState.logs, "No candidates passed prefilter. LLM screening skipped."]
             });
          }

          // Limit to 15 items per batch
          const batchSize = 15;
          const selection = candidates.slice(0, batchSize);
          
          // 3. Prepare Input
          const inputCards: ScreeningCard[] = [];
          for (const sel of selection) {
              const card = state.activeVacancyBatch!.cards.find(c => c.id === sel.cardId);
              if (card) {
                  inputCards.push({
                      id: card.id,
                      title: card.title,
                      company: card.company,
                      salary: card.salary ? `${card.salary.min || ''}-${card.salary.max || ''} ${card.salary.currency || ''}` : null,
                      workMode: card.workMode,
                      url: card.url
                  });
              }
          }

          const llmInput: LLMScreeningInputV1 = {
              siteId,
              targetingSpec: {
                  targetRoles: [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles],
                  seniority: targeting.seniorityLevels,
                  matchWeights: targeting.titleMatchWeights
              },
              cards: inputCards
          };

          // 4. Call LLM
          const llmOutput = await this.llm.screenVacancyCardsBatch(llmInput);

          // 5. Artifact
          const decisions: LLMDecisionV1[] = llmOutput.results.map(r => ({
              cardId: r.cardId,
              decision: r.decision,
              confidence: r.confidence,
              reasons: r.reasons
          }));
          
          // Populate Queues
          const read_queue = decisions.filter(d => d.decision === 'READ').map(d => d.cardId);
          const defer_queue = decisions.filter(d => d.decision === 'DEFER').map(d => d.cardId);
          const ignore_queue = decisions.filter(d => d.decision === 'IGNORE').map(d => d.cardId);

          const llmBatch: LLMDecisionBatchV1 = {
              id: crypto.randomUUID(),
              siteId,
              inputPrefilterBatchId: prefilterBatch.id,
              decidedAt: Date.now(),
              modelId: 'mock-llm', 
              decisions,
              summary: {
                  read: read_queue.length,
                  defer: defer_queue.length,
                  ignore: ignore_queue.length
              },
              tokenUsage: llmOutput.tokenUsage,
              read_queue,
              defer_queue,
              ignore_queue
          };

          await this.storage.saveLLMDecisionBatch(siteId, llmBatch);

          // 6. Update State
          const finalLog = `LLM Screened ${decisions.length} cards. READ: ${llmBatch.summary.read}, DEFER: ${llmBatch.summary.defer}, IGNORE: ${llmBatch.summary.ignore}.`;
          
          return this.updateState({
              ...currentState,
              status: AgentStatus.LLM_SCREENING_DONE,
              activeLLMBatch: llmBatch,
              logs: [...currentState.logs, finalLog]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `LLM Screening Failed: ${e.message}`);
      }
  }

  // --- Phase D1: Vacancy Extraction ---
  async runVacancyExtraction(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activeLLMBatch) {
          return this.failSession(state, "No LLM decision batch found to extract from.");
      }

      const readQueue = state.activeLLMBatch.read_queue || [];
      if (readQueue.length === 0) {
          return this.updateState({
              ...state,
              status: AgentStatus.VACANCIES_EXTRACTED,
              logs: [...state.logs, "Extraction Skipped: No vacancies in READ queue."]
          });
      }

      let currentState = await this.updateState({ 
          ...state, 
          status: AgentStatus.EXTRACTING_VACANCIES,
          logs: [...state.logs, `Starting Extraction for ${readQueue.length} vacancies...`] 
      });

      const extractedResults: VacancyExtractV1[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const cardId of readQueue) {
           const card = state.activeVacancyBatch?.cards.find(c => c.id === cardId);
           if (!card) {
               console.warn(`Card ${cardId} not found in active batch.`);
               continue;
           }

           // Log step
           currentState = await this.updateState({
               ...currentState,
               logs: [...currentState.logs, `Extracting details for: ${card.title} ...`]
           });

           // 2. Open Page & Extract
           try {
               await this.browser.navigateTo(card.url);
               const parsedPage = await this.browser.extractVacancyPage();

               // 3. Map to Entity
               const extract: VacancyExtractV1 = {
                   vacancyId: card.id,
                   siteId,
                   url: card.url,
                   extractedAt: Date.now(),
                   sections: {
                       requirements: parsedPage.requirements,
                       responsibilities: parsedPage.responsibilities,
                       conditions: parsedPage.conditions,
                       salary: parsedPage.salary,
                       workMode: parsedPage.workMode
                   },
                   extractionStatus: 'COMPLETE'
               };

               extractedResults.push(extract);
               successCount++;
               
               // Small delay to simulate human-like reading/loading
               await new Promise(r => setTimeout(r, 500));

           } catch (e: any) {
               console.error(`Failed to extract ${card.url}`, e);
               // Push failed record
               extractedResults.push({
                   vacancyId: card.id,
                   siteId,
                   url: card.url,
                   extractedAt: Date.now(),
                   sections: { requirements: [], responsibilities: [], conditions: [] },
                   extractionStatus: 'FAILED'
               });
               failedCount++;
               
               currentState = await this.updateState({
                   ...currentState,
                   logs: [...currentState.logs, `Failed to extract ${card.title}: ${e.message}`]
               });
           }
      }

      // 4. Save Batch
      const extractionBatch: VacancyExtractionBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputLLMBatchId: state.activeLLMBatch.id,
          processedAt: Date.now(),
          results: extractedResults,
          summary: {
              total: extractedResults.length,
              success: successCount,
              failed: failedCount
          }
      };

      await this.storage.saveVacancyExtractionBatch(siteId, extractionBatch);

      // 5. Update State
      return this.updateState({
          ...currentState,
          status: AgentStatus.VACANCIES_EXTRACTED,
          activeExtractionBatch: extractionBatch,
          logs: [...currentState.logs, `Extraction Complete. Success: ${successCount}, Failed: ${failedCount}.`]
      });
  }

  // --- Phase D2: LLM Batch Evaluation ---
  async runLLMEvalBatch(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      const extractionBatch = state.activeExtractionBatch;
      const targeting = await this.storage.getTargetingSpec(siteId);
      const profile = await this.storage.getProfile(siteId);

      if (!extractionBatch || !targeting || !profile) {
           return this.failSession(state, "Missing Context for Evaluation (ExtractionBatch, Targeting, or Profile).");
      }

      // 2. Select Items to Evaluate (Only Successfully Extracted)
      // Limit to 15 max per rule D2.1
      const candidatesToEval = extractionBatch.results
          .filter(r => r.extractionStatus === 'COMPLETE')
          .slice(0, 15); // Batch rule

      if (candidatesToEval.length === 0) {
           return this.updateState({
              ...state,
              status: AgentStatus.EVALUATION_DONE,
              logs: [...state.logs, "No successfully extracted candidates to evaluate. Skipping phase."]
           });
      }

      let currentState = await this.updateState({
          ...state,
          logs: [...state.logs, `Preparing LLM evaluation for ${candidatesToEval.length} candidates...`]
      });

      // 3. Construct Input Payload
      const evalCandidates: EvalCandidate[] = [];
      for (const extract of candidatesToEval) {
           const originalCard = state.activeVacancyBatch?.cards.find(c => c.id === extract.vacancyId);
           if (!originalCard) continue;

           evalCandidates.push({
               id: extract.vacancyId,
               title: originalCard.title,
               sections: {
                   requirements: extract.sections.requirements,
                   responsibilities: extract.sections.responsibilities,
                   conditions: extract.sections.conditions
               },
               derived: {
                   salary: extract.sections.salary,
                   workMode: extract.sections.workMode
               }
           });
      }
      
      const input: EvaluateExtractsInputV1 = {
          profileSummary: profile.rawContent, // Full text normalized
          targetingRules: {
              targetRoles: [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles],
              workModeRules: { strictMode: targeting.workModeRules.strictMode },
              minSalary: state.activeSearchPrefs?.minSalary
          },
          candidates: evalCandidates
      };

      try {
          // 4. Call LLM
          currentState = await this.updateState({
              ...currentState,
              logs: [...currentState.logs, `Calling LLM (Batch Size: ${evalCandidates.length})...`]
          });

          const output = await this.llm.evaluateVacancyExtractsBatch(input);

          // 5. Transform to Artifact
          const results: LLMVacancyEvalResult[] = output.results.map(r => ({
              vacancyId: r.id,
              decision: r.decision,
              confidence: r.confidence,
              reasons: r.reasons,
              risks: r.risks,
              factsUsed: r.factsUsed
          }));

          const evalBatch: LLMVacancyEvalBatchV1 = {
              id: crypto.randomUUID(),
              siteId,
              inputExtractionBatchId: extractionBatch.id,
              decidedAt: Date.now(),
              modelId: 'mock-llm-pro',
              results,
              summary: {
                  apply: results.filter(r => r.decision === 'APPLY').length,
                  skip: results.filter(r => r.decision === 'SKIP').length,
                  needsHuman: results.filter(r => r.decision === 'NEEDS_HUMAN').length
              },
              tokenUsage: output.tokenUsage,
              status: 'OK'
          };

          // 6. Save
          await this.storage.saveLLMVacancyEvalBatch(siteId, evalBatch);

          // 7. Update State
          return this.updateState({
              ...currentState,
              status: AgentStatus.EVALUATION_DONE,
              activeEvalBatch: evalBatch,
              logs: [...currentState.logs, `Evaluation Done. APPLY: ${evalBatch.summary.apply}, SKIP: ${evalBatch.summary.skip}, HUMAN: ${evalBatch.summary.needsHuman}`]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `LLM Evaluation Failed: ${e.message}`);
      }
  }

  // --- Phase D2.2: Build Apply Queue ---
  async buildApplyQueue(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activeEvalBatch) {
          return this.failSession(state, "No evaluation batch found to build queue from.");
      }

      const logs = [...state.logs, "Building Application Queue..."];
      let currentState = await this.updateState({ ...state, logs });

      try {
          // 2. Filter Candidates (Only APPLY)
          const applyCandidates = state.activeEvalBatch.results.filter(r => r.decision === 'APPLY');
          
          if (applyCandidates.length === 0) {
               return this.updateState({
                   ...currentState,
                   status: AgentStatus.APPLY_QUEUE_READY,
                   logs: [...currentState.logs, "No candidates suitable for AUTO-APPLY. Queue is empty."]
               });
          }

          // 3. Construct Queue Items
          const items: ApplyQueueItem[] = [];
          
          for (const cand of applyCandidates) {
               const card = state.activeVacancyBatch?.cards.find(c => c.id === cand.vacancyId);
               if (!card) continue;

               items.push({
                   vacancyId: card.id,
                   url: card.url,
                   decision: cand.decision,
                   status: 'PENDING'
               });
          }

          // 4. Create Queue Entity
          const queue: ApplyQueueV1 = {
              id: crypto.randomUUID(),
              siteId,
              inputEvalBatchId: state.activeEvalBatch.id,
              createdAt: Date.now(),
              items,
              summary: {
                  total: items.length,
                  pending: items.length,
                  applied: 0,
                  failed: 0
              }
          };

          // 5. Save
          await this.storage.saveApplyQueue(siteId, queue);

          // 6. Update State
          return this.updateState({
              ...currentState,
              status: AgentStatus.APPLY_QUEUE_READY,
              activeApplyQueue: queue,
              logs: [...currentState.logs, `Queue Built: ${items.length} vacancies ready for auto-apply.`]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `Build Queue Failed: ${e.message}`);
      }
  }
  
  // --- Phase E1.1: Probe Apply Entrypoint ---
  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> {
      // 1. Context Check
      if (!state.activeApplyQueue) {
          return this.failSession(state, "No Apply Queue to process.");
      }

      // 2. Find Next Pending
      const nextItem = state.activeApplyQueue.items.find(i => i.status === 'PENDING');
      if (!nextItem) {
          return this.updateState({
              ...state,
              logs: [...state.logs, "Apply Queue finished. No PENDING items found."]
          });
      }

      let currentState = await this.updateState({
          ...state,
          status: AgentStatus.FINDING_APPLY_BUTTON,
          logs: [...state.logs, `Probing Apply Entrypoint for ${nextItem.url}...`]
      });

      try {
          // 3. Navigate
          await this.browser.navigateTo(nextItem.url);

          // 4. Scan
          const controls = await this.browser.scanApplyEntrypoints();
          
          // 5. Create Probe Artifact (Transient)
          const probe: ApplyEntrypointProbeV1 = {
              taskId: nextItem.vacancyId,
              vacancyUrl: nextItem.url,
              foundControls: controls,
              blockers: {
                  requiresLogin: false, // In a real app, detect login wall
                  applyNotAvailable: controls.length === 0,
                  unknownLayout: false
              },
              probedAt: Date.now()
          };

          // 6. Update State
          const logMsg = controls.length > 0 
              ? `Found ${controls.length} potential apply controls.` 
              : `WARNING: No apply controls found.`;

          return this.updateState({
              ...currentState,
              status: AgentStatus.APPLY_BUTTON_FOUND,
              activeApplyProbe: probe,
              logs: [...currentState.logs, logMsg]
          });

      } catch (e: any) {
          console.error(e);
          return this.failSession(currentState, `Apply Probe Failed: ${e.message}`);
      }
  }


  private parseSalaryString(text?: string): VacancySalary | null {
      if (!text) return null;
      // Very basic parser for demo: "100 000 - 150 000 руб."
      const clean = text.replace(/\s/g, '').toLowerCase();
      // Extract numbers
      const numbers = clean.match(/\d+/g);
      if (!numbers) return null;

      const vals = numbers.map(n => parseInt(n, 10));
      const min = vals.length > 0 ? vals[0] : null;
      const max = vals.length > 1 ? vals[1] : null;

      let currency = 'RUB';
      if (clean.includes('usd') || clean.includes('$')) currency = 'USD';
      if (clean.includes('eur') || clean.includes('€')) currency = 'EUR';
      if (clean.includes('kzt')) currency = 'KZT';

      return { min, max, currency };
  }


  // Helper for Comparison
  private looseEquals(expected: any, actual: any): boolean {
      if (expected === actual) return true;
      if (expected === null || actual === null || expected === undefined || actual === undefined) return false;

      // String vs Number
      if (String(expected) === String(actual)) return true;

      // Boolean "true" vs true
      if (typeof expected === 'boolean' || typeof actual === 'boolean') {
          return String(expected).toLowerCase() === String(actual).toLowerCase();
      }

      return false;
  }

  private getSemanticPriority(type: SemanticFieldType): number {
      switch (type) {
          case 'LOCATION': return 10;
          case 'WORK_MODE': return 20;
          case 'SALARY': return 30;
          case 'KEYWORD': return 40;
          case 'SUBMIT': return 100;
          default: return 50;
      }
  }

  private mapControlTypeToAction(uiType: SearchFieldType): ApplyActionType {
      switch (uiType) {
          case 'CHECKBOX': return 'TOGGLE_CHECKBOX';
          case 'SELECT': return 'SELECT_OPTION';
          case 'TEXT': 
          case 'RANGE':
             return 'FILL_TEXT';
          case 'BUTTON': return 'CLICK';
          default: return 'UNKNOWN';
      }
  }

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.resetProfile(siteId);
      await this.storage.deleteTargetingSpec(siteId); 
      await this.storage.deleteSearchUISpec(siteId); // Cascade 
      await this.storage.deleteUserSearchPrefs(siteId); // Cascade
      await this.storage.deleteSearchApplyPlan(siteId); // Cascade
      await this.storage.deleteAppliedFiltersSnapshot(siteId); // Cascade
      await this.storage.deleteFiltersAppliedVerification(siteId); // Cascade

      const logs = [...state.logs, `Profile data, targeting rules, search prefs, and plans for ${siteId} cleared.`];
      return this.updateState({ 
        ...state, 
        activeTargetingSpec: null, 
        activeSearchUISpec: null,
        activeSearchPrefs: null,
        activeSearchApplyPlan: null,
        activeAppliedFilters: null,
        activeVerification: null,
        logs 
      });
  }

  async completeSession(state: AgentState): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, 'Sequence completed successfully.'] };
      return this.updateState(newState);
  }

  async failSession(state: AgentState, error: string): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.FAILED, logs: [...state.logs, `Sequence failed: ${error}`] };
      return this.updateState(newState);
  }
  
  async abortSession(state: AgentState): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.IDLE, logs: [...state.logs, 'Aborted by user.'] };
      return this.updateState(newState);
  }

  async resetSession(state: AgentState): Promise<AgentState> {
      const newState = createInitialAgentState();
      newState.logs = ['Session reset by user.'];
      await this.browser.close();
      return this.updateState(newState);
  }
}