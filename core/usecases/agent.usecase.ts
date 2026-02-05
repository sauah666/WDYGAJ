// Layer: USE CASES
// Purpose: Application logic and orchestration.

import { AgentStatus, AgentConfig } from '../../types';
import { 
  AgentState, 
  createInitialAgentState, 
  ProfileSnapshot, 
  SearchDOMSnapshotV1, 
  UserSearchPrefsV1, 
  SearchApplyPlanV1, 
  AppliedFiltersSnapshotV1,
  FiltersAppliedVerificationV1,
  VacancyCardBatchV1,
  DedupedVacancyBatchV1,
  SeenVacancyIndexV1,
  PreFilterResultBatchV1,
  LLMDecisionBatchV1,
  VacancyExtractionBatchV1,
  LLMVacancyEvalBatchV1,
  ApplyQueueV1,
  ApplyEntrypointProbeV1,
  ApplyFormProbeV1,
  ApplyDraftSnapshotV1,
  ApplySubmitReceiptV1
} from '../domain/entities';
import { BrowserPort } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { 
  ProfileSummaryV1, 
  SearchUIAnalysisInputV1, 
  LLMScreeningInputV1, 
  EvaluateExtractsInputV1 
} from '../domain/llm_contracts';

export class AgentUseCase {
  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private llm: LLMProviderPort
  ) {}

  // --- Helper: State Management ---
  private async updateState(newState: AgentState): Promise<AgentState> {
    await this.storage.saveAgentState(newState);
    this.ui.renderState(newState);
    return newState;
  }

  async failSession(state: AgentState, reason: string): Promise<AgentState> {
    const failedState = {
      ...state,
      status: AgentStatus.FAILED,
      logs: [...state.logs, `ERROR: ${reason}`]
    };
    return this.updateState(failedState);
  }

  async abortSession(state: AgentState): Promise<AgentState> {
    return this.updateState({
        ...state,
        status: AgentStatus.IDLE,
        logs: [...state.logs, "Session aborted by user."]
    });
  }

  async resetSession(state: AgentState): Promise<AgentState> {
    await this.browser.close();
    const cleanState = createInitialAgentState();
    return this.updateState(cleanState);
  }

  // --- Step 1: Initialization ---
  async startLoginFlow(state: AgentState, targetSite: string): Promise<AgentState> {
    const startingState = await this.updateState({
      ...state,
      status: AgentStatus.STARTING,
      logs: [...state.logs, `Starting session for ${targetSite}...`]
    });

    try {
      await this.browser.launch();
      
      // Navigate to site root
      const url = `https://${targetSite}`;
      await this.browser.navigateTo(url);

      return this.updateState({
        ...startingState,
        status: AgentStatus.WAITING_FOR_HUMAN,
        currentUrl: url,
        logs: [...startingState.logs, "Navigated to root. Waiting for manual login..."]
      });
    } catch (e: any) {
      return this.failSession(startingState, `Launch failed: ${e.message}`);
    }
  }

  // --- Step 2: Confirm Login ---
  async confirmLogin(state: AgentState): Promise<AgentState> {
    return this.updateState({
      ...state,
      status: AgentStatus.LOGGED_IN_CONFIRMED,
      logs: [...state.logs, "User confirmed login."]
    });
  }

  // --- Step 3: Profile Capture ---
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
    // 1. Check if we already have a profile
    const existingProfile = await this.storage.getProfile(siteId);
    if (existingProfile) {
      return this.updateState({
        ...state,
        status: AgentStatus.PROFILE_CAPTURED,
        logs: [...state.logs, "Found existing profile. Skipping capture."]
      });
    }

    // 2. If not, ask user to navigate
    return this.updateState({
      ...state,
      status: AgentStatus.WAITING_FOR_PROFILE_PAGE,
      logs: [...state.logs, "No profile found. Please navigate to your Resume/Profile page."]
    });
  }

  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> {
    const capturingState = await this.updateState({
      ...state,
      status: AgentStatus.EXTRACTING,
      logs: [...state.logs, "Capturing profile page..."]
    });

    try {
      const url = await this.browser.getCurrentUrl();
      const rawText = await this.browser.getPageTextMinimal();
      
      // Simple hash for change detection
      const hash = btoa(unescape(encodeURIComponent(rawText.substring(0, 100) + rawText.length)));

      const profile: ProfileSnapshot = {
        siteId,
        capturedAt: Date.now(),
        sourceUrl: url,
        rawContent: rawText,
        contentHash: hash
      };

      await this.storage.saveProfile(profile);

      return this.updateState({
        ...capturingState,
        status: AgentStatus.PROFILE_CAPTURED,
        logs: [...capturingState.logs, "Profile captured successfully."]
      });

    } catch (e: any) {
      return this.failSession(capturingState, `Profile capture failed: ${e.message}`);
    }
  }

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.resetProfile(siteId);
      await this.storage.deleteTargetingSpec(siteId); // Cascade delete
      return this.updateState({
          ...state,
          activeTargetingSpec: null,
          status: AgentStatus.LOGGED_IN_CONFIRMED,
          logs: [...state.logs, "Profile data reset."]
      });
  }

  // --- Step 4: Targeting Strategy (LLM) ---
  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
      const processingState = await this.updateState({
          ...state,
          status: AgentStatus.TARGETING_PENDING,
          logs: [...state.logs, "Analyzing profile to generate targeting strategy..."]
      });

      try {
          const profile = await this.storage.getProfile(siteId);
          const config = await this.storage.getConfig();

          if (!profile || !config) {
              throw new Error("Missing profile or config data.");
          }

          // Construct LLM Input
          const input: ProfileSummaryV1 = {
              siteId,
              profileHash: profile.contentHash,
              profileTextNormalized: profile.rawContent,
              userConstraints: {
                  preferredWorkMode: config.workMode as any || 'ANY',
                  minSalary: config.minSalary || null,
                  currency: config.currency || 'RUB',
                  city: config.city || null,
                  targetLanguages: config.targetLanguages || ['ru']
              }
          };

          const spec = await this.llm.analyzeProfile(input);
          await this.storage.saveTargetingSpec(siteId, spec);

          return this.updateState({
              ...processingState,
              activeTargetingSpec: spec,
              status: AgentStatus.TARGETING_READY,
              logs: [...processingState.logs, "Targeting strategy generated."]
          });

      } catch (e: any) {
          return this.updateState({
             ...processingState,
             status: AgentStatus.TARGETING_ERROR,
             logs: [...processingState.logs, `Targeting generation failed: ${e.message}`]
          });
      }
  }

  // --- Stage 5: Search Configuration ---

  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
      let currentState = await this.updateState({
          ...state,
          status: AgentStatus.NAVIGATING_TO_SEARCH,
          logs: [...state.logs, "Navigating to Advanced Search..."]
      });

      try {
          // 1. Try known direct link
          const searchUrl = siteId === 'hh.ru' ? 'https://hh.ru/search/vacancy/advanced' : null;
          if (searchUrl) {
              await this.browser.navigateTo(searchUrl);
          } else {
              // 2. Try to find link on page
              const links = await this.browser.findLinksByTextKeywords(['advanced search', 'расширенный поиск']);
              if (links.length > 0) {
                  await this.browser.clickLink(links[0].href);
              } else {
                  throw new Error("Could not find Advanced Search link.");
              }
          }

          return this.updateState({
              ...currentState,
              status: AgentStatus.SEARCH_PAGE_READY,
              logs: [...currentState.logs, "Arrived at Search Page."]
          });
      } catch (e: any) {
          return this.failSession(currentState, `Search navigation failed: ${e.message}`);
      }
  }

  async scanSearchPageDOM(state: AgentState, siteId: string): Promise<AgentState> {
      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.EXTRACTING_SEARCH_UI,
          logs: [...state.logs, "Scanning search form elements..."]
      });

      try {
          const elements = await this.browser.scanPageInteractionElements();
          const currentUrl = await this.browser.getCurrentUrl();

          const snapshot: SearchDOMSnapshotV1 = {
              siteId,
              capturedAt: Date.now(),
              pageUrl: currentUrl,
              domVersion: 1,
              fields: elements
          };

          await this.storage.saveSearchDOMSnapshot(siteId, snapshot);

          return this.updateState({
              ...workingState,
              activeSearchDOMSnapshot: snapshot,
              status: AgentStatus.SEARCH_DOM_READY,
              logs: [...workingState.logs, `DOM Scanned: Found ${elements.length} interactive elements.`]
          });

      } catch (e: any) {
          return this.failSession(workingState, `DOM Scan failed: ${e.message}`);
      }
  }

  async performSearchUIAnalysis(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeSearchDOMSnapshot || !state.activeTargetingSpec) {
          return this.failSession(state, "Missing DOM Snapshot or Targeting Spec.");
      }

      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.ANALYZING_SEARCH_UI,
          logs: [...state.logs, "LLM is analyzing Search UI semantics..."]
      });

      try {
          const input: SearchUIAnalysisInputV1 = {
              siteId,
              domSnapshot: {
                  pageUrl: state.activeSearchDOMSnapshot.pageUrl,
                  fields: state.activeSearchDOMSnapshot.fields
              },
              targetingContext: {
                  targetRoles: [
                      ...state.activeTargetingSpec.targetRoles.ruTitles,
                      ...state.activeTargetingSpec.targetRoles.enTitles
                  ],
                  workModeRules: state.activeTargetingSpec.workModeRules,
                  salaryRules: state.activeTargetingSpec.salaryRules
              }
          };

          const uiSpec = await this.llm.analyzeSearchDOM(input);
          await this.storage.saveSearchUISpec(siteId, uiSpec);

          return this.updateState({
              ...workingState,
              activeSearchUISpec: uiSpec,
              status: AgentStatus.WAITING_FOR_SEARCH_PREFS,
              logs: [...workingState.logs, `Analysis Complete. Identified ${uiSpec.fields.length} relevant fields.`]
          });

      } catch (e: any) {
          return this.failSession(workingState, `UI Analysis failed: ${e.message}`);
      }
  }

  async submitSearchPrefs(state: AgentState, prefs: UserSearchPrefsV1): Promise<AgentState> {
      await this.storage.saveUserSearchPrefs(prefs.siteId, prefs);
      return this.updateState({
          ...state,
          activeSearchPrefs: prefs,
          status: AgentStatus.SEARCH_PREFS_SAVED,
          logs: [...state.logs, "Search preferences saved."]
      });
  }

  async buildSearchApplyPlan(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeSearchUISpec || !state.activeSearchPrefs || !state.activeTargetingSpec) {
          return this.failSession(state, "Missing data for planning.");
      }

      // Simple Logic: Map Prefs -> UI Fields -> Steps
      const steps: any[] = [];
      const uiFields = state.activeSearchUISpec.fields;
      const prefs = state.activeSearchPrefs;
      const targeting = state.activeTargetingSpec;

      // 1. Keywords
      const keywordField = uiFields.find(f => f.semanticType === 'KEYWORD');
      if (keywordField) {
          // Combine top roles
          const value = targeting.targetRoles.ruTitles.slice(0, 2).join(' OR ');
          steps.push({
              stepId: crypto.randomUUID(),
              fieldKey: keywordField.key,
              actionType: 'FILL_TEXT',
              value: value,
              rationale: 'Primary Role Keywords',
              priority: 1
          });
      }

      // 2. Salary
      const salaryField = uiFields.find(f => f.semanticType === 'SALARY');
      if (salaryField && prefs.minSalary) {
           steps.push({
              stepId: crypto.randomUUID(),
              fieldKey: salaryField.key,
              actionType: 'FILL_TEXT',
              value: prefs.minSalary.toString(),
              rationale: 'Minimum Salary Constraint',
              priority: 2
          });
      }

      // 3. Work Mode (e.g. Remote)
      const workModeField = uiFields.find(f => f.semanticType === 'WORK_MODE');
      if (workModeField && prefs.workMode === 'REMOTE') {
           steps.push({
              stepId: crypto.randomUUID(),
              fieldKey: workModeField.key,
              actionType: 'TOGGLE_CHECKBOX',
              value: true,
              rationale: 'Remote Work Only',
              priority: 3
          });
      }

      // 4. Region
      const regionField = uiFields.find(f => f.semanticType === 'LOCATION');
      if (regionField && regionField.options && prefs.city) {
           // Simple match
           const opt = regionField.options.find(o => o.label.toLowerCase().includes(prefs.city!.toLowerCase()));
           if (opt) {
               steps.push({
                   stepId: crypto.randomUUID(),
                   fieldKey: regionField.key,
                   actionType: 'SELECT_OPTION',
                   value: opt.value,
                   rationale: `City: ${opt.label}`,
                   priority: 4
               });
           }
      }

      // 5. Submit
      const submitBtn = uiFields.find(f => f.semanticType === 'SUBMIT');
      if (submitBtn) {
          steps.push({
              stepId: crypto.randomUUID(),
              fieldKey: submitBtn.key,
              actionType: 'CLICK',
              value: 'click',
              rationale: 'Start Search',
              priority: 10
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
          activeSearchApplyPlan: plan,
          status: AgentStatus.APPLY_PLAN_READY,
          logs: [...state.logs, `Plan created with ${steps.length} steps.`]
      });
  }

  // --- Phase A1.1: Execution ---

  async executeSearchPlanStep(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeSearchApplyPlan || !state.activeSearchUISpec) {
           return this.failSession(state, "No plan to execute.");
      }

      // Initialize Snapshot if null
      let snapshot = state.activeAppliedFilters;
      if (!snapshot) {
          snapshot = {
              siteId,
              createdAt: Date.now(),
              lastUpdatedAt: Date.now(),
              overallStatus: 'IN_PROGRESS',
              results: []
          };
      }

      // Find next pending step
      const executedIds = new Set(snapshot.results.map(r => r.stepId));
      const nextStep = state.activeSearchApplyPlan.steps
          .sort((a, b) => a.priority - b.priority)
          .find(s => !executedIds.has(s.stepId));

      if (!nextStep) {
          // All done
           snapshot.overallStatus = 'COMPLETED';
           await this.storage.saveAppliedFiltersSnapshot(siteId, snapshot);
           return this.updateState({
               ...state,
               activeAppliedFilters: snapshot,
               status: AgentStatus.SEARCH_READY,
               logs: [...state.logs, "All filters applied."]
           });
      }

      // Execute Step
      const workingState = await this.updateState({
          ...state,
          activeAppliedFilters: snapshot,
          status: AgentStatus.APPLYING_FILTERS,
          logs: [...state.logs, `Executing: ${nextStep.rationale}...`]
      });

      try {
          const fieldDef = state.activeSearchUISpec.fields.find(f => f.key === nextStep.fieldKey);
          if (!fieldDef) throw new Error(`Field definition not found for ${nextStep.fieldKey}`);

          const result = await this.browser.applyControlAction(fieldDef, nextStep.actionType, nextStep.value);

          snapshot.results.push({
              stepId: nextStep.stepId,
              fieldKey: nextStep.fieldKey,
              timestamp: Date.now(),
              actionType: nextStep.actionType,
              intendedValue: nextStep.value,
              success: result.success,
              observedValue: result.observedValue,
              error: result.error
          });
          snapshot.lastUpdatedAt = Date.now();
          
          await this.storage.saveAppliedFiltersSnapshot(siteId, snapshot);

          return this.updateState({
              ...workingState,
              activeAppliedFilters: snapshot,
              status: result.success ? AgentStatus.APPLY_STEP_DONE : AgentStatus.APPLY_STEP_FAILED,
              logs: [...workingState.logs, `Step finished: ${result.success ? 'OK' : 'FAIL'}`]
          });

      } catch (e: any) {
          return this.failSession(workingState, `Step Execution Failed: ${e.message}`);
      }
  }

  async executeApplyPlanCycle(state: AgentState, siteId: string): Promise<AgentState> {
      let currentState = state;
      // Max 10 steps to prevent loops
      for (let i = 0; i < 10; i++) {
          currentState = await this.executeSearchPlanStep(currentState, siteId);
          if (currentState.status === AgentStatus.SEARCH_READY || currentState.status === AgentStatus.FAILED) {
              break;
          }
          if (currentState.status === AgentStatus.APPLY_STEP_FAILED) {
              // Decide: abort or continue? For now, continue best effort.
          }
          await new Promise(r => setTimeout(r, 500)); // Pacing
      }
      return currentState;
  }

  // --- Phase A2.1: Verification ---
  async verifyAppliedFilters(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeSearchApplyPlan || !state.activeSearchUISpec) {
          return this.failSession(state, "Missing plan/spec for verification.");
      }

      const results = [];
      const mismatches = [];

      // Only verify steps that are not clicks
      const stepsToVerify = state.activeSearchApplyPlan.steps.filter(s => s.actionType !== 'CLICK');

      for (const step of stepsToVerify) {
          const fieldDef = state.activeSearchUISpec.fields.find(f => f.key === step.fieldKey);
          if (fieldDef) {
              const readResult = await this.browser.readControlValue(fieldDef);
              // Simple check: loosely equal
              const isMatch = String(readResult.value) == String(step.value); 
              
              const verification = {
                  fieldKey: step.fieldKey,
                  expectedValue: step.value,
                  actualValue: readResult.value,
                  source: readResult.source,
                  status: isMatch ? 'MATCH' : 'MISMATCH'
              } as const; // Cast to satisfy strict union if needed

              results.push(verification);
              if (!isMatch) mismatches.push(verification);
          }
      }

      const verifSnapshot: FiltersAppliedVerificationV1 = {
          siteId,
          verifiedAt: Date.now(),
          verified: mismatches.length === 0,
          results,
          mismatches
      };

      await this.storage.saveFiltersAppliedVerification(siteId, verifSnapshot);

      return this.updateState({
          ...state,
          activeVerification: verifSnapshot,
          logs: [...state.logs, `Verification: ${mismatches.length} mismatches found.`]
      });
  }

  // --- Phase B1: Capture Vacancy Batch ---
  async collectVacancyCardsBatch(state: AgentState, siteId: string): Promise<AgentState> {
      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.EXTRACTING,
          logs: [...state.logs, "Scanning vacancy list..."]
      });

      try {
          // 1. Scan from Browser
          const result = await this.browser.scanVacancyCards(15); // limit 15

          // 2. Map to Domain Entities
          const cards = result.cards.map(raw => ({
              id: crypto.randomUUID(),
              siteId,
              externalId: raw.externalId || null,
              url: raw.url,
              title: raw.title,
              company: raw.company || null,
              city: raw.city || null,
              workMode: (raw.workModeText?.toLowerCase().includes('удален') ? 'remote' : 'office') as any, // Simple heuristic
              salary: null, // Parsing raw string is complex, leaving null for now or simple mock
              publishedAt: raw.publishedAtText || null,
              cardHash: btoa(raw.url + raw.title)
          }));

          // 3. Create Batch
          const batch: VacancyCardBatchV1 = {
              batchId: crypto.randomUUID(),
              siteId,
              capturedAt: Date.now(),
              queryFingerprint: 'mock-query-hash',
              cards,
              pageCursor: result.nextPageCursor || null
          };

          await this.storage.saveVacancyCardBatch(siteId, batch);

          return this.updateState({
              ...workingState,
              activeVacancyBatch: batch,
              status: AgentStatus.VACANCIES_CAPTURED,
              logs: [...workingState.logs, `Captured ${cards.length} vacancies.`]
          });

      } catch (e: any) {
          return this.failSession(workingState, `Vacancy Scan failed: ${e.message}`);
      }
  }

  // --- Phase B2: Dedup ---
  async dedupAndSelectVacancyBatch(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeVacancyBatch) return this.failSession(state, "No active batch to dedup.");

      // 1. Load Index
      let index = await this.storage.getSeenVacancyIndex(siteId);
      if (!index) {
          index = { siteId, lastUpdatedAt: Date.now(), seenKeys: [] };
      }
      const seenSet = new Set(index.seenKeys);

      const results = [];
      let duplicates = 0;
      let seenCount = 0;
      let selected = 0;

      for (const card of state.activeVacancyBatch.cards) {
          // Key = URL (usually sufficient) or ID
          const key = card.externalId || card.url;
          
          if (seenSet.has(key)) {
              results.push({ cardId: card.id, decision: 'SKIP_SEEN', dedupKey: key });
              seenCount++;
          } else {
              // For now, we assume no duplicates within the same batch for simplicity
              results.push({ cardId: card.id, decision: 'SELECTED', dedupKey: key });
              seenSet.add(key);
              selected++;
          }
      }

      // Save updated index
      index.seenKeys = Array.from(seenSet);
      index.lastUpdatedAt = Date.now();
      await this.storage.saveSeenVacancyIndex(siteId, index);

      const dedupBatch: DedupedVacancyBatchV1 = {
          id: crypto.randomUUID(),
          batchId: state.activeVacancyBatch.batchId,
          siteId,
          processedAt: Date.now(),
          userCity: state.activeSearchPrefs?.city || null,
          results: results as any,
          summary: { total: state.activeVacancyBatch.cards.length, selected, duplicates, seen: seenCount }
      };

      await this.storage.saveDedupedVacancyBatch(siteId, dedupBatch);

      return this.updateState({
          ...state,
          activeDedupedBatch: dedupBatch,
          status: AgentStatus.VACANCIES_DEDUPED,
          logs: [...state.logs, `Deduped: ${selected} new, ${seenCount} seen.`]
      });
  }

  // --- Phase C1: Script Prefilter ---
  async runScriptPrefilter(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeDedupedBatch || !state.activeVacancyBatch) return this.failSession(state, "No batch to prefilter.");

      const selectedIds = new Set(
          state.activeDedupedBatch.results
              .filter(r => r.decision === 'SELECTED')
              .map(r => r.cardId)
      );

      const cards = state.activeVacancyBatch.cards.filter(c => selectedIds.has(c.id));
      const results: any[] = [];

      for (const card of cards) {
          // Mock Script Logic: Reject if title contains "Manager" (as example of negative keyword not covered by targeting)
          // In reality, this checks basic constraints
          let decision: 'READ_CANDIDATE' | 'REJECT' = 'READ_CANDIDATE';
          const reasons = [];

          if (card.title.toLowerCase().includes('marketing')) {
               decision = 'REJECT';
               reasons.push('bad_keyword');
          }

          results.push({
              cardId: card.id,
              decision,
              reasons,
              score: 1,
              gates: { salary: 'UNKNOWN', workMode: 'UNKNOWN' }
          });
      }

      const batch: PreFilterResultBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputBatchId: state.activeDedupedBatch.id,
          processedAt: Date.now(),
          thresholds: { read: 0, defer: 0 },
          results,
          summary: {
              read: results.filter(r => r.decision === 'READ_CANDIDATE').length,
              defer: 0,
              reject: results.filter(r => r.decision === 'REJECT').length
          }
      };

      await this.storage.savePreFilterResultBatch(siteId, batch);

      return this.updateState({
          ...state,
          activePrefilterBatch: batch,
          status: AgentStatus.PREFILTER_DONE,
          logs: [...state.logs, `Prefilter: ${batch.summary.read} passed.`]
      });
  }

  // --- Phase C2: LLM Batch Screening ---
  async runLLMBatchScreening(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activePrefilterBatch || !state.activeVacancyBatch || !state.activeTargetingSpec) return this.failSession(state, "Missing data for LLM Screening.");

      const passedIds = new Set(
          state.activePrefilterBatch.results
              .filter(r => r.decision === 'READ_CANDIDATE')
              .map(r => r.cardId)
      );
      const cards = state.activeVacancyBatch.cards.filter(c => passedIds.has(c.id));

      if (cards.length === 0) {
          return this.updateState({
              ...state,
              status: AgentStatus.LLM_SCREENING_DONE,
              logs: [...state.logs, "No cards passed prefilter. Skipping LLM."]
          });
      }

      const input: LLMScreeningInputV1 = {
          siteId,
          targetingSpec: {
              targetRoles: state.activeTargetingSpec.targetRoles.ruTitles,
              seniority: state.activeTargetingSpec.seniorityLevels,
              matchWeights: state.activeTargetingSpec.titleMatchWeights
          },
          cards: cards.map(c => ({
              id: c.id,
              title: c.title,
              company: c.company,
              salary: null,
              workMode: c.workMode,
              url: c.url
          }))
      };

      const output = await this.llm.screenVacancyCardsBatch(input);

      const batch: LLMDecisionBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputPrefilterBatchId: state.activePrefilterBatch.id,
          decidedAt: Date.now(),
          modelId: 'mock-llm',
          decisions: output.results,
          summary: {
              read: output.results.filter(r => r.decision === 'READ').length,
              defer: output.results.filter(r => r.decision === 'DEFER').length,
              ignore: output.results.filter(r => r.decision === 'IGNORE').length
          },
          tokenUsage: output.tokenUsage,
          read_queue: output.results.filter(r => r.decision === 'READ').map(r => r.cardId)
      };

      await this.storage.saveLLMDecisionBatch(siteId, batch);

      return this.updateState({
          ...state,
          activeLLMBatch: batch,
          status: AgentStatus.LLM_SCREENING_DONE,
          logs: [...state.logs, `LLM Screened: ${batch.summary.read} to read.`]
      });
  }

  // --- Phase D1: Extraction ---
  async runVacancyExtraction(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeLLMBatch || !state.activeVacancyBatch) return this.failSession(state, "No LLM batch to extract.");

      const toReadIds = state.activeLLMBatch.read_queue || [];
      if (toReadIds.length === 0) return this.updateState({ ...state, status: AgentStatus.VACANCIES_EXTRACTED });

      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.EXTRACTING_VACANCIES,
          logs: [...state.logs, `Extracting ${toReadIds.length} vacancies...`]
      });

      const extracted = [];
      
      // Loop through queue (mocking parallel or sequential)
      for (const id of toReadIds) {
          const card = state.activeVacancyBatch.cards.find(c => c.id === id);
          if (!card) continue;

          await this.browser.navigateTo(card.url);
          const parsed = await this.browser.extractVacancyPage();

          extracted.push({
              vacancyId: id,
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

      const batch: VacancyExtractionBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputLLMBatchId: state.activeLLMBatch.id,
          processedAt: Date.now(),
          results: extracted as any,
          summary: { total: extracted.length, success: extracted.length, failed: 0 }
      };

      await this.storage.saveVacancyExtractionBatch(siteId, batch);

      return this.updateState({
          ...workingState,
          activeExtractionBatch: batch,
          status: AgentStatus.VACANCIES_EXTRACTED,
          logs: [...workingState.logs, `Extracted ${extracted.length} pages.`]
      });
  }

  // --- Phase D2: LLM Evaluation ---
  async runLLMEvalBatch(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeExtractionBatch || !state.activeTargetingSpec || !state.activeSearchPrefs) return this.failSession(state, "No extraction batch.");

      const profile = await this.storage.getProfile(siteId);

      const input: EvaluateExtractsInputV1 = {
          profileSummary: profile?.rawContent || "",
          targetingRules: {
              targetRoles: state.activeTargetingSpec.targetRoles.ruTitles,
              workModeRules: state.activeTargetingSpec.workModeRules,
              minSalary: state.activeSearchPrefs.minSalary
          },
          candidates: state.activeExtractionBatch.results.map(r => ({
              id: r.vacancyId,
              title: "Unknown", // Metadata lost in extraction entity, simplified for now
              sections: r.sections,
              derived: {
                  salary: r.sections.salary,
                  workMode: r.sections.workMode
              }
          }))
      };

      const output = await this.llm.evaluateVacancyExtractsBatch(input);

      const batch: LLMVacancyEvalBatchV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputExtractionBatchId: state.activeExtractionBatch.id,
          decidedAt: Date.now(),
          modelId: 'mock-llm',
          results: output.results,
          summary: {
              apply: output.results.filter(r => r.decision === 'APPLY').length,
              skip: output.results.filter(r => r.decision === 'SKIP').length,
              needsHuman: output.results.filter(r => r.decision === 'NEEDS_HUMAN').length
          },
          tokenUsage: output.tokenUsage,
          status: 'OK'
      };

      await this.storage.saveLLMVacancyEvalBatch(siteId, batch);

      return this.updateState({
          ...state,
          activeEvalBatch: batch,
          status: AgentStatus.EVALUATION_DONE,
          logs: [...state.logs, `Evaluated: ${batch.summary.apply} to apply.`]
      });
  }

  // --- Phase D2.2: Apply Queue ---
  async buildApplyQueue(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeEvalBatch || !state.activeVacancyBatch) return this.failSession(state, "Missing data.");

      const applyIds = new Set(state.activeEvalBatch.results.filter(r => r.decision === 'APPLY').map(r => r.id));
      
      const items = state.activeVacancyBatch.cards
          .filter(c => applyIds.has(c.id))
          .map(c => ({
              vacancyId: c.id,
              url: c.url,
              decision: 'APPLY',
              status: 'PENDING'
          }));

      const queue: ApplyQueueV1 = {
          id: crypto.randomUUID(),
          siteId,
          inputEvalBatchId: state.activeEvalBatch.id,
          createdAt: Date.now(),
          items: items as any,
          summary: {
              total: items.length,
              pending: items.length,
              applied: 0,
              failed: 0
          }
      };

      await this.storage.saveApplyQueue(siteId, queue);

      return this.updateState({
          ...state,
          activeApplyQueue: queue,
          status: AgentStatus.APPLY_QUEUE_READY,
          logs: [...state.logs, `Queue ready: ${items.length} vacancies.`]
      });
  }

  // --- Phase E1.1: Probe Apply Entrypoint ---
  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeApplyQueue) {
          return this.failSession(state, "No Apply Queue to process.");
      }

      // Priority 1: Resume IN_PROGRESS item (interrupted or loop continue)
      let nextItem = state.activeApplyQueue.items.find(i => i.status === 'IN_PROGRESS');
      
      // Priority 2: Pick next PENDING item
      if (!nextItem) {
          nextItem = state.activeApplyQueue.items.find(i => i.status === 'PENDING');
      }

      // Termination Condition: No items left
      if (!nextItem) {
          const finishedState = {
              ...state,
              status: AgentStatus.APPLY_QUEUE_COMPLETED,
              logs: [...state.logs, "Apply Queue Cycle Finished. No more items to process."]
          };
          return this.updateState(finishedState);
      }

      // --- Transition: Mark IN_PROGRESS ---
      if (nextItem.status !== 'IN_PROGRESS') {
          nextItem.status = 'IN_PROGRESS';
          // Recalculate summary
          const queue = state.activeApplyQueue;
          queue.summary.pending = queue.items.filter(i => i.status === 'PENDING').length;
          await this.storage.saveApplyQueue(siteId, queue);
      }

      let currentState = await this.updateState({
          ...state,
          activeApplyQueue: state.activeApplyQueue, // Ensure UI updates with new status
          status: AgentStatus.FINDING_APPLY_BUTTON,
          logs: [...state.logs, `Loop: Processing vacancy ${nextItem.vacancyId}. Navigating to ${nextItem.url}...`]
      });

      try {
          await this.browser.navigateTo(nextItem.url);

          const controls = await this.browser.scanApplyEntrypoints();
          
          const probe: ApplyEntrypointProbeV1 = {
              taskId: nextItem.vacancyId,
              vacancyUrl: nextItem.url,
              foundControls: controls,
              blockers: {
                  requiresLogin: false, 
                  applyNotAvailable: controls.length === 0,
                  unknownLayout: false
              },
              probedAt: Date.now()
          };

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
          // If navigation fails, we might want to mark as FAILED to avoid infinite loop on broken URL
          return this.failSession(currentState, `Apply Probe Failed: ${e.message}`);
      }
  }

  // --- Phase E1.2: Open and Scan Apply Form ---
  async openAndScanApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeApplyProbe || state.activeApplyProbe.foundControls.length === 0) {
          return this.failSession(state, "Cannot open apply form: No entrypoint.");
      }
      
      // Assume we use the first control
      const control = state.activeApplyProbe.foundControls[0];
      
      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.APPLY_FORM_OPENED, // Tentative
          logs: [...state.logs, `Clicking apply control: ${control.label}...`]
      });
      
      try {
          // 1. Click
          await this.browser.clickElement(control.selector);
          
          // 2. Scan Form
          const formSnapshot = await this.browser.scanApplyForm();
          
          const formProbe: ApplyFormProbeV1 = {
              taskId: state.activeApplyProbe.taskId,
              vacancyUrl: state.activeApplyProbe.vacancyUrl,
              entrypointUsed: control.label,
              applyUiKind: formSnapshot.isModal ? 'MODAL' : 'PAGE',
              detectedFields: {
                  coverLetterTextarea: formSnapshot.hasCoverLetter,
                  resumeSelector: formSnapshot.hasResumeSelect,
                  submitButtonPresent: formSnapshot.hasSubmit,
                  extraQuestionnaireDetected: formSnapshot.hasQuestionnaire
              },
              safeLocators: {
                  coverLetterHint: formSnapshot.coverLetterSelector || null,
                  submitHint: formSnapshot.submitSelector || null
              },
              blockers: {
                  requiresLogin: false,
                  captchaOrAntibot: false,
                  applyNotAvailable: false,
                  unknownLayout: !formSnapshot.hasSubmit
              },
              scannedAt: Date.now()
          };
          
          return this.updateState({
              ...workingState,
              activeApplyFormProbe: formProbe,
              logs: [...workingState.logs, `Form Scanned. CL: ${formProbe.detectedFields.coverLetterTextarea}, Submit: ${formProbe.detectedFields.submitButtonPresent}`]
          });
          
      } catch (e: any) {
           return this.failSession(workingState, `Open Form Failed: ${e.message}`);
      }
  }

  // --- Phase E1.3: Fill Draft ---
  async fillApplyFormDraft(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeApplyFormProbe) return this.failSession(state, "No form probe.");
      
      const config = await this.storage.getConfig();
      const clText = config?.coverLetterTemplate || "Здравствуйте! Прошу рассмотреть мою кандидатуру.";
      
      const workingState = await this.updateState({
          ...state,
          logs: [...state.logs, "Filling form draft..."]
      });
      
      try {
          let filled = false;
          if (state.activeApplyFormProbe.safeLocators.coverLetterHint) {
              await this.browser.inputText(state.activeApplyFormProbe.safeLocators.coverLetterHint, clText);
              filled = true;
          }
          
          const draft: ApplyDraftSnapshotV1 = {
              vacancyId: state.activeApplyFormProbe.taskId,
              siteId,
              createdAt: Date.now(),
              coverLetterFieldFound: !!state.activeApplyFormProbe.safeLocators.coverLetterHint,
              coverLetterFilled: filled,
              coverLetterReadbackHash: null,
              coverLetterSource: 'TEMPLATE',
              formStateSummary: "Draft Filled",
              blockedReason: null
          };
          
          await this.storage.saveApplyDraftSnapshot(siteId, draft);
          
          return this.updateState({
              ...workingState,
              activeApplyDraft: draft,
              status: AgentStatus.APPLY_DRAFT_FILLED,
              logs: [...workingState.logs, `Draft Filled.`]
          });
      } catch (e: any) {
           return this.failSession(workingState, `Fill Draft Failed: ${e.message}`);
      }
  }

  // --- Phase E1.4: Submit Application ---
  async submitApplication(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeApplyFormProbe || !state.activeApplyDraft) return this.failSession(state, "Not ready to submit.");
      
      const workingState = await this.updateState({
          ...state,
          status: AgentStatus.SUBMITTING_APPLICATION,
          logs: [...state.logs, "Clicking Submit..."]
      });
      
      try {
          if (!state.activeApplyFormProbe.safeLocators.submitHint) {
              throw new Error("No submit button locator.");
          }
          
          await this.browser.clickElement(state.activeApplyFormProbe.safeLocators.submitHint);
          
          // Wait and check for success marker
          await new Promise(resolve => setTimeout(resolve, 2000));
          const pageText = await this.browser.getPageTextMinimal();
          const success = pageText.includes("отправлен") || pageText.includes("success") || pageText.includes("sent");
          
          const receipt: ApplySubmitReceiptV1 = {
              receiptId: crypto.randomUUID(),
              vacancyId: state.activeApplyDraft.vacancyId,
              siteId,
              submittedAt: Date.now(),
              successConfirmed: success,
              confirmationSource: 'TEXT_HINT',
              confirmationEvidence: success ? "Found 'sent' keyword" : "None",
              failureReason: success ? null : 'NO_CONFIRMATION'
          };
          
          await this.storage.saveApplySubmitReceipt(siteId, receipt);

          // Update Queue Item status
          if (state.activeApplyQueue) {
              const queue = state.activeApplyQueue;
              const item = queue.items.find(i => i.vacancyId === receipt.vacancyId);
              if (item) {
                  item.status = success ? 'APPLIED' : 'FAILED';
                  queue.summary.applied += success ? 1 : 0;
                  queue.summary.failed += success ? 0 : 1;
                  await this.storage.saveApplyQueue(siteId, queue);
              }
          }

          return this.updateState({
              ...workingState,
              activeSubmitReceipt: receipt,
              activeApplyQueue: state.activeApplyQueue, // Force refresh
              status: success ? AgentStatus.APPLICATION_SUBMITTED : AgentStatus.APPLICATION_FAILED,
              logs: [...workingState.logs, `Submit Result: ${success ? 'SUCCESS' : 'UNKNOWN'}`]
          });
          
      } catch (e: any) {
           return this.failSession(workingState, `Submit Failed: ${e.message}`);
      }
  }
}