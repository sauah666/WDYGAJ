// Layer: USE CASES
// Purpose: Application specific business rules. Orchestrates flow between Domain and Ports.

import { BrowserPort } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, WorkMode } from '../domain/llm_contracts';

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

      const logs = [...state.logs, `Profile data, targeting rules, search prefs, and plans for ${siteId} cleared.`];
      return this.updateState({ 
        ...state, 
        activeTargetingSpec: null, 
        activeSearchUISpec: null,
        activeSearchPrefs: null,
        activeSearchApplyPlan: null,
        activeAppliedFilters: null,
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