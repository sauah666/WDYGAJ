// ... (imports)
import { BrowserPort, RawVacancyCard } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult, FiltersAppliedVerificationV1, ControlVerificationResult, VerificationStatus, VerificationSource, VacancyCardV1, VacancyCardBatchV1, VacancySalary, SeenVacancyIndexV1, DedupedVacancyBatchV1, DedupedCardResult, VacancyDecision, PreFilterResultBatchV1, PreFilterDecisionV1, PrefilterDecisionType, LLMDecisionBatchV1, LLMDecisionV1, VacancyExtractV1, VacancyExtractionBatchV1, VacancyExtractionStatus, LLMVacancyEvalBatchV1, LLMVacancyEvalResult, ApplyQueueV1, ApplyQueueItem, ApplyEntrypointProbeV1, ApplyFormProbeV1, ApplyDraftSnapshotV1, ApplyBlockedReason, CoverLetterSource, ApplySubmitReceiptV1, ApplyFailureReason, QuestionnaireSnapshotV1, QuestionnaireAnswerSetV1, QuestionnaireAnswer, ApplyAttemptState } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, WorkMode, LLMScreeningInputV1, ScreeningCard, EvaluateExtractsInputV1, EvalCandidate, QuestionnaireAnswerInputV1 } from '../domain/llm_contracts';

export class AgentUseCase {
  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private lllm: LLMProviderPort
  ) {}

  // ... (previous methods)

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

  // ... (Login, Capture, Targeting, Search methods remain same) ...
  async startLoginFlow(state: AgentState, url: string): Promise<AgentState> { /* ... */ return state; }
  async confirmLogin(state: AgentState): Promise<AgentState> { /* ... */ return state; }
  async captureContext(state: AgentState): Promise<AgentState> { /* ... */ return state; }
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  private validateTargetingSpec(spec: TargetingSpecV1): void { /* ... */ }
  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async scanSearchPageDOM(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async performSearchUIAnalysis(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  private createDraftPrefs(siteId: string, spec: SearchUISpecV1, targeting: TargetingSpecV1, config: Partial<AgentConfig>): UserSearchPrefsV1 { /* ... */ return {} as any; }
  async submitSearchPrefs(state: AgentState, prefs: UserSearchPrefsV1): Promise<AgentState> { /* ... */ return state; }
  async buildSearchApplyPlan(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async executeSearchPlanStep(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async executeApplyPlanCycle(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async verifyAppliedFilters(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async collectVacancyCardsBatch(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async dedupAndSelectVacancyBatch(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async runScriptPrefilter(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async runLLMBatchScreening(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async runVacancyExtraction(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async runLLMEvalBatch(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async buildApplyQueue(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async openAndScanApplyForm(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async fillApplyFormDraft(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }

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
              const clickSuccess = await this.browser.clickElement(entrypointSelector);
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

  private parseSalaryString(text?: string): VacancySalary | null { /* ... */ return null; }
  private looseEquals(expected: any, actual: any): boolean { /* ... */ return false; }
  private getSemanticPriority(type: SemanticFieldType): number { /* ... */ return 0; }
  private mapControlTypeToAction(uiType: SearchFieldType): ApplyActionType { /* ... */ return 'UNKNOWN'; }
  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> { /* ... */ return state; }
  async completeSession(state: AgentState): Promise<AgentState> { /* ... */ return state; }
  async failSession(state: AgentState, error: string): Promise<AgentState> { /* ... */ return state; }
  async abortSession(state: AgentState): Promise<AgentState> { /* ... */ return state; }
  async resetSession(state: AgentState): Promise<AgentState> { /* ... */ return state; }
}
