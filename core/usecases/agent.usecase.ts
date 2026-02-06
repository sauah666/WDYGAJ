

// ... existing imports ...
import { BrowserPort, RawVacancyCard } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus, AgentConfig, WorkMode, SeniorityLevel, RoleCategory } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SearchDOMSnapshotV1, SiteDefinition, SearchUISpecV1, UserSearchPrefsV1, SearchApplyPlanV1, SearchApplyStep, SemanticFieldType, ApplyActionType, SearchFieldType, AppliedFiltersSnapshotV1, AppliedStepResult, FiltersAppliedVerificationV1, ControlVerificationResult, VerificationStatus, VerificationSource, VacancyCardV1, VacancyCardBatchV1, VacancySalary, SeenVacancyIndexV1, DedupedVacancyBatchV1, DedupedCardResult, VacancyDecision, PreFilterResultBatchV1, PreFilterDecisionV1, PrefilterDecisionType, LLMDecisionBatchV1, LLMDecisionV1, VacancyExtractV1, VacancyExtractionBatchV1, VacancyExtractionStatus, LLMVacancyEvalBatchV1, LLMVacancyEvalResult, ApplyQueueV1, ApplyQueueItem, ApplyEntrypointProbeV1, ApplyFormProbeV1, ApplyDraftSnapshotV1, ApplyBlockedReason, CoverLetterSource, ApplySubmitReceiptV1, ApplyFailureReason, QuestionnaireSnapshotV1, QuestionnaireAnswerSetV1, QuestionnaireAnswer, ApplyAttemptState, SearchFieldDefinition, TokenLedger, ExecutionStatus, DOMFingerprintV1, DomDriftEventV1, PruningPolicyV1, DEFAULT_PRUNING_POLICY, ContextBudgetV1, CompactionSummaryV1, DEFAULT_COMPACTION_POLICY, AppliedVacancyRecord } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, LLMScreeningInputV1, ScreeningCard, EvaluateExtractsInputV1, EvalCandidate, QuestionnaireAnswerInputV1 } from '../domain/llm_contracts';
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

  // ... (unchanged methods omitted) ...
  
  // Private Helper
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
    const timestampedState = { ...state, updatedAt: Date.now() };
    // 1. Monitor Context Health
    let nextState = this.monitorContextHealth(timestampedState);
    
    // 2. Persist
    await this.storage.saveAgentState(nextState);
    this.ui.renderState(nextState);
    return nextState;
  }

  // ... (omitted compaction logic, same as before) ...
  private monitorContextHealth(state: AgentState): AgentState {
      const jsonStr = JSON.stringify(state);
      const estimatedTokens = Math.ceil(jsonStr.length / 4);
      let status: 'OK' | 'NEAR_LIMIT' | 'OVER_LIMIT' = 'OK';
      let agentStatus = state.status;
      if (estimatedTokens >= this.CONTEXT_BUDGET.hardTokenLimit) {
          status = 'OVER_LIMIT';
          agentStatus = AgentStatus.CONTEXT_OVER_LIMIT;
      } else if (estimatedTokens >= this.CONTEXT_BUDGET.softTokenLimit) {
          status = 'NEAR_LIMIT';
          if (state.contextHealth?.status !== 'NEAR_LIMIT') {
             return this.compactSession(state, estimatedTokens, status);
          }
          if (state.status !== AgentStatus.CONTEXT_NEAR_LIMIT) {
              agentStatus = AgentStatus.CONTEXT_NEAR_LIMIT;
          }
      }
      return {
          ...state,
          status: agentStatus,
          contextHealth: { estimatedTokens, softLimit: this.CONTEXT_BUDGET.softTokenLimit, hardLimit: this.CONTEXT_BUDGET.hardTokenLimit, status }
      };
  }

  private compactSession(state: AgentState, currentEstimate: number, healthStatus: 'NEAR_LIMIT' | 'OVER_LIMIT'): AgentState {
      const POLICY = DEFAULT_COMPACTION_POLICY;
      if (state.logs.length < (POLICY.keptLogHead + POLICY.keptLogTail + 5)) return state;
      const keptLogs = [
          ...state.logs.slice(0, POLICY.keptLogHead), 
          `... [СЖАТО ${state.logs.length - (POLICY.keptLogHead + POLICY.keptLogTail)} ЗАПИСЕЙ] ...`,
          ...state.logs.slice(-POLICY.keptLogTail)
      ];
      const summaryId = crypto.randomUUID();
      const summary: CompactionSummaryV1 = {
          id: summaryId,
          createdAt: Date.now(),
          scope: 'session',
          source: ['logs'],
          summary: { logCountBefore: state.logs.length, lastStatus: state.status, notes: `Сжатие при ${currentEstimate} токенов.` }
      };
      this.storage.saveCompactionSummary(summary).catch(console.error);
      return { ...state, logs: keptLogs, lastCompaction: { summaryId, timestamp: Date.now() }, status: AgentStatus.CONTEXT_NEAR_LIMIT };
  }

  private pruneInput<T>(input: T, policy: PruningPolicyV1 = DEFAULT_PRUNING_POLICY): T {
      const json = JSON.stringify(input);
      if (policy.forbidRawHtml) {
          if (/<[a-z][\s\S]*>/i.test(json) || /<\/[a-z]+>/i.test(json)) {
              if (json.length > 5000 && (json.match(/<div/g) || []).length > 5) {
                   throw new Error("PRUNING_VIOLATION: Обнаружен сырой HTML во входе LLM.");
              }
          }
      }
      return input;
  }

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
    const fromRegistry = getSite(siteId);
    if (fromRegistry) return fromRegistry;
    return { id: siteId, label: siteId, baseUrl: `https://${siteId}`, enabled: true, storageNamespace: siteId, searchEntrypoint: { kind: 'url', url: `https://${siteId}/search` } };
  }

  // ... (failSession, abortSession, resetSession, setPauseState, resetProfileData - UNCHANGED)
  async failSession(state: AgentState, reason: string): Promise<AgentState> {
      return this.updateState({ ...state, status: AgentStatus.FAILED, logs: [...state.logs, `❌ ОШИБКА: ${reason}`] });
  }

  async abortSession(state: AgentState): Promise<AgentState> {
      return this.updateState({ ...state, status: AgentStatus.IDLE, logs: [...state.logs, "Сессия остановлена пользователем."] });
  }

  async resetSession(state: AgentState): Promise<AgentState> {
      const newState = createInitialAgentState();
      return this.updateState(newState);
  }

  async setPauseState(state: AgentState, isPaused: boolean): Promise<AgentState> {
      const msg = isPaused ? "Агент приостановлен пользователем." : "Агент возобновил работу.";
      return this.updateState({ ...state, isPaused, logs: [...state.logs, msg] });
  }

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.resetProfile(siteId);
      return this.updateState({ ...state, logs: [...state.logs, "Данные профиля сброшены."] });
  }

  // NEW: AMNESIA MODE
  async forgetSearchHistory(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.saveSeenVacancyIndex(siteId, { siteId, lastUpdatedAt: Date.now(), seenKeys: [] });
      const nextState = {
          ...state,
          appliedHistory: [],
          activeVacancyBatch: undefined,
          activeDedupedBatch: undefined,
          logs: [...state.logs, "🧹 ПАМЯТЬ ОЧИЩЕНА. Агент забыл все предыдущие вакансии и отклики."]
      };
      return this.updateState(nextState);
  }

  // ... (Drift Detection methods - UNCHANGED) ...
  async checkDomDrift(state: AgentState, siteId: string, pageType: 'search' | 'vacancy' | 'apply_form' | 'unknown'): Promise<{ drifted: boolean; event?: DomDriftEventV1 }> {
        const fingerprint = await this.browser.getPageFingerprint(pageType);
        if (pageType === 'unknown') return { drifted: false };
        const stored = await this.storage.getDomFingerprint(siteId, pageType);
        if (!stored) {
            const newFp: DOMFingerprintV1 = { siteId, pageType, capturedAt: Date.now(), domVersion: 1, structuralHash: fingerprint.structuralHash };
            await this.storage.saveDomFingerprint(siteId, newFp);
            return { drifted: false };
        }
        if (stored.structuralHash !== fingerprint.structuralHash) {
            const event: DomDriftEventV1 = { siteId, pageType, detectedAt: Date.now(), expectedHash: stored.structuralHash, observedHash: fingerprint.structuralHash, severity: 'HIGH', actionRequired: 'HUMAN_CHECK' };
            return { drifted: true, event };
        }
        return { drifted: false };
  }

  async resolveDomDrift(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeDriftEvent) return state;
      const event = state.activeDriftEvent;
      const newFp: DOMFingerprintV1 = { siteId, pageType: event.pageType as any, capturedAt: Date.now(), domVersion: Date.now(), structuralHash: event.observedHash };
      await this.storage.saveDomFingerprint(siteId, newFp);
      return this.updateState({ ...state, status: AgentStatus.IDLE, activeDriftEvent: null, logs: [...state.logs, "Дрифт устранен. Пожалуйста, повторите попытку."] });
  }

  async signalLLMConfigError(state: AgentState, message: string): Promise<AgentState> {
      return this.updateState({ ...state, status: AgentStatus.LLM_CONFIG_ERROR, logs: [...state.logs, `Ошибка конфигурации LLM: ${message}`] });
  }

  // ... (methods - startLoginFlow, selectActiveSite, etc. - UNCHANGED) ...
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
             return this.updateState({ ...state, status: AgentStatus.WAITING_FOR_SITE_SELECTION, logs: [...state.logs, "Необходим выбор сайта."] });
          }
      }
      if (config && config.activeSiteId !== activeSiteId) {
          config.activeSiteId = activeSiteId;
          await this.storage.saveConfig(config);
      }
      const validDef = getSite(activeSiteId)!; 
      let newState = await this.updateState({ ...state, status: AgentStatus.STARTING, logs: [...state.logs, `Запуск агента для ${validDef.label} (ID: ${validDef.id})...`] });
      try {
          await this.browser.launch();
          await this.browser.navigateTo(validDef.baseUrl);
          newState = await this.updateState({ ...newState, status: AgentStatus.WAITING_FOR_HUMAN, currentUrl: await this.browser.getCurrentUrl(), logs: [...newState.logs, "Ожидание ручного входа пользователя..."] });
          return newState;
      } catch (e: any) {
          return this.failSession(newState, `Ошибка запуска браузера: ${e.message}`);
      }
  }

  async selectActiveSite(state: AgentState, siteId: string): Promise<AgentState> {
      const siteDef = getSite(siteId);
      if (!siteDef || !siteDef.enabled) {
          return this.updateState({ ...state, logs: [...state.logs, `Ошибка: Сайт ${siteId} недоступен.`] });
      }
      const config = await this.storage.getConfig() || { mode: 'JOB_SEARCH', targetSite: siteId };
      config.activeSiteId = siteId;
      config.targetSite = siteId; 
      await this.storage.saveConfig(config);
      return this.startLoginFlow(state, siteId);
  }

  async confirmLogin(state: AgentState): Promise<AgentState> {
      return this.updateState({ ...state, status: AgentStatus.LOGGED_IN_CONFIRMED, logs: [...state.logs, "Вход подтвержден пользователем."] });
  }
  
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
      const savedProfile = await this.storage.getProfile(siteId);
      if (savedProfile) {
          return this.updateState({ ...state, status: AgentStatus.PROFILE_CAPTURED, logs: [...state.logs, "Найден сохраненный профиль. Пропуск захвата."] });
      }
      return this.updateState({ ...state, status: AgentStatus.WAITING_FOR_PROFILE_PAGE, logs: [...state.logs, "Профиль не найден. Поиск страницы резюме..."] });
  }

  async scanAndNavigateToProfile(state: AgentState, siteId: string): Promise<AgentState> {
      let nextState = await this.updateState({ ...state, status: AgentStatus.NAVIGATING, logs: [...state.logs, "Агент ищет ссылку на профиль..."] });
      try {
          const links = await this.browser.findLinksByTextKeywords(['резюме', 'мои резюме', 'profile', 'cv']);
          if (links.length > 0) {
              const bestLink = links[0];
              await this.updateState({ ...nextState, logs: [...nextState.logs, `Найдена ссылка: "${bestLink.text}". Переход...`] });
              await this.browser.clickLink(bestLink.href);
              await new Promise(r => setTimeout(r, 2000));
              return await this.executeProfileCapture(nextState, siteId);
          } else {
              return this.updateState({ ...nextState, status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE, logs: [...nextState.logs, "Ссылка на профиль не найдена. Пожалуйста, перейдите в раздел 'Мои резюме' вручную."] });
          }
      } catch (e: any) {
          console.error(e);
          return this.updateState({ ...nextState, status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE, logs: [...nextState.logs, `Ошибка навигации: ${e.message}`] });
      }
  }

  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> {
      const url = await this.browser.getCurrentUrl();
      const rawText = await this.browser.getPageTextMinimal();
      const normalized = this.normalizeText(rawText);
      const hash = await this.computeHash(normalized);
      const snapshot: ProfileSnapshot = { siteId, capturedAt: Date.now(), sourceUrl: url, rawContent: rawText, contentHash: hash };
      await this.storage.saveProfile(snapshot);
      return this.updateState({ ...state, status: AgentStatus.PROFILE_CAPTURED, logs: [...state.logs, `Профиль захвачен! Хеш: ${hash.substring(0, 8)}`] });
  }

  // ... (generateTargetingSpec, navigateToSearchPage, scanSearchPageDOM, performSearchUIAnalysis, submitSearchPrefs, buildSearchApplyPlan, executeSearchPlanStep, executeApplyPlanCycle, verifyAppliedFilters, collectVacancyCardsBatch, dedupAndSelectVacancyBatch, runScriptPrefilter, runLLMBatchScreening, runVacancyExtraction - UNCHANGED) ...
  
  // Omitted for brevity: These methods are unchanged. 
  
  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
      const profile = await this.storage.getProfile(siteId);
      if (!profile) return this.failSession(state, "Профиль не найден для таргетинга.");
      const config = await this.storage.getConfig();
      const summary: ProfileSummaryV1 = {
          siteId,
          profileHash: profile.contentHash,
          profileTextNormalized: profile.rawContent.substring(0, 5000), 
          userConstraints: {
              preferredWorkModes: config?.targetWorkModes || [WorkMode.REMOTE],
              minSalary: config?.minSalary || null,
              currency: config?.currency || 'RUB',
              city: config?.city || null,
              targetLanguages: config?.targetLanguages || ['ru']
          }
      };
      const roleIndex = state.currentRoleIndex || 0;
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
              currentRoleIndex: roleIndex, 
              logs: [...nextState.logs, `Стратегия поиска сгенерирована. Ролей: ${spec.targetRoles.ruTitles.length + spec.targetRoles.enTitles.length}.`] 
          });
      } catch (e: any) {
          return this.updateState({ ...state, status: AgentStatus.TARGETING_ERROR, logs: [...state.logs, `Ошибка LLM: ${e.message}`] });
      }
  }

  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
      const def = this.getSiteDefinition(siteId);
      const searchUrl = (def.searchEntrypoint && 'url' in def.searchEntrypoint) ? def.searchEntrypoint.url : `https://${siteId}/search/vacancy/advanced`;
      let nextState = await this.updateState({ ...state, status: AgentStatus.NAVIGATING_TO_SEARCH, logs: [...state.logs, `Переход к поиску: ${searchUrl}`] });
      await this.browser.navigateTo(searchUrl);
      return this.updateState({ ...nextState, status: AgentStatus.SEARCH_PAGE_READY, logs: [...nextState.logs, "Страница поиска открыта."] });
  }

  async scanSearchPageDOM(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const driftCheck = await this.checkDomDrift(state, siteId, 'search');
      if (driftCheck.drifted) {
          return this.updateState({ ...state, status: AgentStatus.DOM_DRIFT_DETECTED, activeDriftEvent: driftCheck.event, logs: [...state.logs, `⚠️ ОБНАРУЖЕН ДРЕЙФ DOM. Требуется: ${driftCheck.event?.actionRequired}`] });
      }
      const rawFields = await this.browser.scanPageInteractionElements();
      const url = await this.browser.getCurrentUrl();
      const hashStr = JSON.stringify(rawFields.map(f => f.id + f.tag));
      const hash = await this.computeHash(hashStr);
      const snapshot: SearchDOMSnapshotV1 = { siteId, capturedAt: Date.now(), pageUrl: url, domVersion: 1, domHash: hash, fields: rawFields };
      await this.storage.saveSearchDOMSnapshot(siteId, snapshot);
      return this.updateState({ ...state, status: AgentStatus.SEARCH_DOM_READY, activeSearchDOMSnapshot: snapshot, logs: [...state.logs, `DOM Сканирован. Элементов: ${rawFields.length}.`] });
  }

  async performSearchUIAnalysis(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      if (!state.activeSearchDOMSnapshot || !state.activeTargetingSpec) {
          return this.failSession(state, "Нет снимка DOM или стратегии таргетинга.");
      }
      const cachedSpec = await this.storage.getSearchUISpec(siteId);
      if (cachedSpec) {
           const initialPrefs = this.createDraftPrefs(siteId, cachedSpec, state.activeTargetingSpec, await this.storage.getConfig() || {}, state.currentRoleIndex);
           return this.updateState({ ...state, status: AgentStatus.WAITING_FOR_SEARCH_PREFS, activeSearchUISpec: cachedSpec, activeSearchPrefs: initialPrefs, logs: [...state.logs, "Спецификация UI загружена из кеша."] });
      }
      const input: SearchUIAnalysisInputV1 = {
          siteId,
          domSnapshot: { pageUrl: state.activeSearchDOMSnapshot.pageUrl, fields: state.activeSearchDOMSnapshot.fields },
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
      const initialPrefs = this.createDraftPrefs(siteId, uiSpec, state.activeTargetingSpec, config || {}, state.currentRoleIndex);
      return this.updateState({ ...nextState, status: AgentStatus.WAITING_FOR_SEARCH_PREFS, activeSearchUISpec: uiSpec, activeSearchPrefs: initialPrefs, logs: [...nextState.logs, "UI проанализирован. Подготовка фильтров..."] });
  }

  private createDraftPrefs(siteId: string, spec: SearchUISpecV1, targeting: TargetingSpecV1, config: Partial<AgentConfig>, roleIndex: number): UserSearchPrefsV1 {
      const prefs: UserSearchPrefsV1 = { siteId, updatedAt: Date.now(), additionalFilters: {} };
      const allRoles = [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles];
      const targetRole = allRoles[roleIndex % allRoles.length];
      spec.fields.forEach(field => {
          if (field.semanticType === 'KEYWORD') {
              if (targetRole) {
                  prefs.additionalFilters[field.key] = targetRole;
              }
          }
          if (field.semanticType === 'SALARY' && config.minSalary) {
              prefs.additionalFilters[field.key] = config.minSalary;
          }
          if (field.semanticType === 'LOCATION' && config.city) {
              if (field.options && config.city) {
                  const opt = field.options.find(o => o.label.toLowerCase().includes(config.city!.toLowerCase()));
                  if (opt) prefs.additionalFilters[field.key] = opt.value;
              } else {
                  if (field.uiControlType === 'TEXT') prefs.additionalFilters[field.key] = config.city;
              }
          }
          if (field.semanticType === 'WORK_MODE' && field.uiControlType === 'CHECKBOX') {
              if (config.targetWorkModes?.includes(WorkMode.REMOTE)) {
                  prefs.additionalFilters[field.key] = true;
              }
          }
      });
      return prefs;
  }

  async submitSearchPrefs(currentState: AgentState, prefs: UserSearchPrefsV1): Promise<AgentState> {
      await this.storage.saveUserSearchPrefs(prefs.siteId, prefs);
      const keyword = Object.values(prefs.additionalFilters).find(v => typeof v === 'string' && v.length > 2); 
      return this.updateState({ ...currentState, status: AgentStatus.SEARCH_PREFS_SAVED, activeSearchPrefs: prefs, logs: [...currentState.logs, `Настройки поиска применены: ${keyword || 'Фильтры'}`] });
  }

  async buildSearchApplyPlan(state: AgentState, siteId: string): Promise<AgentState> {
      const uiSpec = state.activeSearchUISpec;
      const prefs = state.activeSearchPrefs;
      if (!uiSpec || !prefs) return this.failSession(state, "Нет UI Spec или Prefs");
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
                   rationale: `Applying ${field.label}`,
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
      const plan: SearchApplyPlanV1 = { siteId, createdAt: Date.now(), steps };
      await this.storage.saveSearchApplyPlan(siteId, plan);
      return this.updateState({ ...state, status: AgentStatus.APPLY_PLAN_READY, activeSearchApplyPlan: plan, logs: [...state.logs, `План поиска создан: ${steps.length} шагов.`] });
  }

  async executeSearchPlanStep(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const plan = state.activeSearchApplyPlan;
      const uiSpec = state.activeSearchUISpec;
      if (!plan || !uiSpec) return state;
      let appliedSnapshot = state.activeAppliedFilters;
      if (!appliedSnapshot) {
          appliedSnapshot = { siteId, createdAt: Date.now(), lastUpdatedAt: Date.now(), overallStatus: 'IN_PROGRESS', results: [] };
      }
      const nextStepIndex = appliedSnapshot.results.length;
      if (nextStepIndex >= plan.steps.length) {
          return this.updateState({ ...state, status: AgentStatus.SEARCH_READY, logs: [...state.logs, "Все шаги выполнены."] });
      }
      const step = plan.steps[nextStepIndex];
      const fieldDef = uiSpec.fields.find(f => f.key === step.fieldKey);
      if (!fieldDef) {
           return this.failSession(state, `Поле не найдено: ${step.fieldKey}`);
      }
      const result = await this.browser.applyControlAction(fieldDef, step.actionType, step.value);
      const stepResult: AppliedStepResult = { ...result, stepId: step.stepId, fieldKey: step.fieldKey, timestamp: Date.now(), actionType: step.actionType, intendedValue: step.value };
      const newResults = [...appliedSnapshot.results, stepResult];
      const overallStatus: ExecutionStatus = newResults.length === plan.steps.length ? 'COMPLETED' : 'IN_PROGRESS';
      const newSnapshot = { ...appliedSnapshot, lastUpdatedAt: Date.now(), overallStatus, results: newResults };
      await this.storage.saveAppliedFiltersSnapshot(siteId, newSnapshot);
      const nextStatus = overallStatus === 'COMPLETED' ? AgentStatus.SEARCH_READY : AgentStatus.APPLY_STEP_DONE;
      return this.updateState({ ...state, status: nextStatus, activeAppliedFilters: newSnapshot, activeSearchApplyPlan: plan, logs: [...state.logs, `Шаг ${step.stepId}: ${result.success ? 'OK' : 'FAIL'}`] });
  }

  async executeApplyPlanCycle(state: AgentState, siteId: string): Promise<AgentState> {
      let currentState = state;
      const plan = state.activeSearchApplyPlan;
      if (!plan) return state;
      while (currentState.status !== AgentStatus.SEARCH_READY && currentState.status !== AgentStatus.FAILED && !currentState.isPaused) {
          currentState = await this.executeSearchPlanStep(currentState, siteId);
          await new Promise(r => setTimeout(r, 500));
      }
      return currentState;
  }

  async verifyAppliedFilters(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const plan = state.activeSearchApplyPlan;
      const uiSpec = state.activeSearchUISpec;
      if (!plan || !uiSpec) return state;
      const results: ControlVerificationResult[] = [];
      const mismatches: ControlVerificationResult[] = [];
      for (const step of plan.steps) {
          const fieldDef = uiSpec.fields.find(f => f.key === step.fieldKey);
          if (!fieldDef || step.actionType === 'CLICK') continue;
          const { value, source } = await this.browser.readControlValue(fieldDef);
          const status: VerificationStatus = this.looseEquals(value, step.value) ? 'MATCH' : 'MISMATCH';
          const record: ControlVerificationResult = { fieldKey: step.fieldKey, expectedValue: step.value, actualValue: value, source, status };
          results.push(record);
          if (status === 'MISMATCH') mismatches.push(record);
      }
      const verification: FiltersAppliedVerificationV1 = { siteId, verifiedAt: Date.now(), verified: mismatches.length === 0, results, mismatches };
      await this.storage.saveFiltersAppliedVerification(siteId, verification);
      return this.updateState({ ...state, activeVerification: verification, logs: [...state.logs, `Верификация: ${verification.verified ? 'OK' : 'MISMATCH (' + mismatches.length + ')'}`] });
  }

  async collectVacancyCardsBatch(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
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
            salaryText: c.salaryText, 
            publishedAt: c.publishedAtText || null, 
            cardHash: 'hash' 
        })), 
        pageCursor: nextPageCursor || null 
      };
      await this.storage.saveVacancyCardBatch(siteId, batch);
      return this.updateState({ ...state, status: AgentStatus.VACANCIES_CAPTURED, activeVacancyBatch: batch, logs: [...state.logs, `Собрано ${batch.cards.length} вакансий.`] });
  }

  async dedupAndSelectVacancyBatch(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const inputBatch = state.activeVacancyBatch;
      if (!inputBatch) return this.failSession(state, "Нет батча вакансий для дедупликации.");
      const seenIndex = await this.storage.getSeenVacancyIndex(siteId) || { siteId, lastUpdatedAt: Date.now(), seenKeys: [] };
      const results: DedupedCardResult[] = [];
      const newSeenKeys: string[] = [];
      let duplicates = 0;
      let selected = 0;
      for (const card of inputBatch.cards) {
          const key = `${siteId}_${card.externalId}`;
          if (seenIndex.seenKeys.includes(key)) {
              results.push({ cardId: card.id, decision: VacancyDecision.SKIP_SEEN, dedupKey: key });
              duplicates++;
          } else {
              results.push({ cardId: card.id, decision: VacancyDecision.SELECTED, dedupKey: key });
              newSeenKeys.push(key);
              selected++;
          }
      }
      seenIndex.seenKeys = [...seenIndex.seenKeys, ...newSeenKeys];
      seenIndex.lastUpdatedAt = Date.now();
      await this.storage.saveSeenVacancyIndex(siteId, seenIndex);
      const outputBatch: DedupedVacancyBatchV1 = { id: crypto.randomUUID(), batchId: inputBatch.batchId, siteId, processedAt: Date.now(), userCity: state.activeTargetingSpec?.userConstraints?.city || null, results, summary: { total: inputBatch.cards.length, selected, duplicates, seen: seenIndex.seenKeys.length } };
      await this.storage.saveDedupedVacancyBatch(siteId, outputBatch);
      const logs = [...state.logs, `Дедупликация: ${selected} новых, ${duplicates} дублей.`];
      if (selected === 0) logs.push("⚠️ Нет новых вакансий в этой выдаче.");
      return this.updateState({ ...state, status: AgentStatus.VACANCIES_DEDUPED, activeDedupedBatch: outputBatch, logs });
  }

  async runScriptPrefilter(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const dedupBatch = state.activeDedupedBatch;
      const sourceBatch = state.activeVacancyBatch;
      const targeting = state.activeTargetingSpec;
      if (!dedupBatch || !sourceBatch || !targeting) return this.failSession(state, "Данные для префильтра отсутствуют.");
      const decisions: PreFilterDecisionV1[] = [];
      let readCount = 0;
      let deferCount = 0;
      let rejectCount = 0;
      for (const res of dedupBatch.results) {
          if (res.decision !== VacancyDecision.SELECTED) continue;
          const card = sourceBatch.cards.find(c => c.id === res.cardId);
          if (!card) continue;
          let decision: PrefilterDecisionType = 'READ_CANDIDATE';
          const reasons: string[] = [];
          if (card.salary && card.salary.max && targeting.userConstraints.minSalary) {
              if (card.salary.max < targeting.userConstraints.minSalary) {
                  decision = 'REJECT';
                  reasons.push('salary_below_threshold');
              }
          }
          if (decision === 'READ_CANDIDATE') readCount++;
          else rejectCount++;
          decisions.push({ cardId: card.id, decision, reasons, score: 0, gates: { salary: 'UNKNOWN', workMode: 'UNKNOWN' } });
      }
      const outputBatch: PreFilterResultBatchV1 = { id: crypto.randomUUID(), siteId, inputBatchId: dedupBatch.id, processedAt: Date.now(), thresholds: { read: 0, defer: 0 }, results: decisions, summary: { read: readCount, defer: deferCount, reject: rejectCount } };
      await this.storage.savePreFilterResultBatch(siteId, outputBatch);
      return this.updateState({ ...state, status: AgentStatus.PREFILTER_DONE, activePrefilterBatch: outputBatch, logs: [...state.logs, `Префильтр: ${readCount} к чтению, ${rejectCount} отклонено.`] });
  }

  async runLLMBatchScreening(state: AgentState, siteId: string): Promise<AgentState> {
      const prefilter = state.activePrefilterBatch;
      if (!prefilter) return state;
      const MAX_BATCH_SIZE = DEFAULT_PRUNING_POLICY.maxItemsPerBatch;
      
      const batch = state.activeVacancyBatch!;
      const candidates = prefilter.results.filter(r => r.decision === 'READ_CANDIDATE').map(r => batch.cards.find(c => c.id === r.cardId)!).filter(Boolean).slice(0, MAX_BATCH_SIZE);
      
      if (candidates.length === 0) {
          const emptyLLMBatch: LLMDecisionBatchV1 = { id: crypto.randomUUID(), siteId, inputPrefilterBatchId: prefilter.id, decidedAt: Date.now(), modelId: 'none', decisions: [], summary: { read: 0, defer: 0, ignore: 0 }, tokenUsage: { input: 0, output: 0 } };
          await this.storage.saveLLMDecisionBatch(siteId, emptyLLMBatch);
          return this.updateState({ ...state, status: AgentStatus.LLM_SCREENING_DONE, activeLLMBatch: emptyLLMBatch, logs: [...state.logs, `Батч пуст. Пропуск LLM.`] });
      }

      // FIX: DEADLOCK PREVENTION
      // Previously, this blocked if length < MIN_BATCH_SIZE (10). 
      // Now we just log and proceed, ensuring the loop continues even with small batches.
      if (candidates.length < 5) { // Lowered warning threshold
          // Just a log, no return
          // console.log(`Small batch: ${candidates.length} candidates. Processing anyway.`);
      }

      const targeting = state.activeTargetingSpec!;
      const input: LLMScreeningInputV1 = { siteId, targetingSpec: { targetRoles: [...targeting.targetRoles.ruTitles, ...targeting.targetRoles.enTitles], seniority: targeting.seniorityLevels, matchWeights: targeting.titleMatchWeights }, cards: candidates.map(c => ({ id: c.id, title: c.title, company: c.company, salary: c.salary ? `${c.salary.min}-${c.salary.max}` : null, workMode: c.workMode, url: c.url })) };
      const output = await this.llm.screenVacancyCardsBatch(this.pruneInput(input));
      let nextState = this.addTokenUsage(state, output.tokenUsage.input, output.tokenUsage.output, false);
      const llmBatch: LLMDecisionBatchV1 = { id: crypto.randomUUID(), siteId, inputPrefilterBatchId: prefilter.id, decidedAt: Date.now(), modelId: 'mock', decisions: output.results, summary: { read: output.results.filter(r => r.decision === 'READ').length, defer: output.results.filter(r => r.decision === 'DEFER').length, ignore: output.results.filter(r => r.decision === 'IGNORE').length }, tokenUsage: output.tokenUsage };
      await this.storage.saveLLMDecisionBatch(siteId, llmBatch);
      const logs = [...nextState.logs, `LLM скрининг завершен. К чтению: ${llmBatch.summary.read}`];
      return this.updateState({ ...nextState, status: AgentStatus.LLM_SCREENING_DONE, activeLLMBatch: llmBatch, logs });
  }

  async runVacancyExtraction(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const llmBatch = state.activeLLMBatch;
      const vacBatch = state.activeVacancyBatch;
      if (!llmBatch || !vacBatch) return state;
      const toExtract = llmBatch.decisions.filter(d => d.decision === 'READ').map(d => vacBatch.cards.find(c => c.id === d.cardId)).filter(Boolean) as VacancyCardV1[];
      if (toExtract.length === 0) {
           const emptyExtractBatch: VacancyExtractionBatchV1 = { id: crypto.randomUUID(), siteId, inputLLMBatchId: llmBatch.id, processedAt: Date.now(), results: [], summary: { total: 0, success: 0, failed: 0 } };
           await this.storage.saveVacancyExtractionBatch(siteId, emptyExtractBatch);
           return this.updateState({ ...state, status: AgentStatus.VACANCIES_EXTRACTED, activeExtractionBatch: emptyExtractBatch, logs: [...state.logs, "Нет вакансий для извлечения."] });
      }
      const extracts: VacancyExtractV1[] = [];
      for (const card of toExtract) {
          if (state.isPaused) break;
          await this.updateState({ ...state, currentUrl: card.url, status: AgentStatus.EXTRACTING_VACANCIES });
          await this.browser.navigateTo(card.url);
          const parsed = await this.browser.extractVacancyPage();
          extracts.push({ vacancyId: card.id, siteId, url: card.url, extractedAt: Date.now(), sections: { requirements: parsed.requirements, responsibilities: parsed.responsibilities, conditions: parsed.conditions, salary: parsed.salary, workMode: parsed.workMode }, extractionStatus: 'COMPLETE' });
      }
      const outputBatch: VacancyExtractionBatchV1 = { id: crypto.randomUUID(), siteId, inputLLMBatchId: llmBatch.id, processedAt: Date.now(), results: extracts, summary: { total: extracts.length, success: extracts.length, failed: 0 } };
      await this.storage.saveVacancyExtractionBatch(siteId, outputBatch);
      return this.updateState({ ...state, status: AgentStatus.VACANCIES_EXTRACTED, activeExtractionBatch: outputBatch, logs: [...state.logs, `Извлечено ${extracts.length} описаний.`] });
  }

  // --- UPDATED: runLLMEvalBatch to populate history with URL ---
  async runLLMEvalBatch(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const extractBatch = state.activeExtractionBatch;
      const profile = await this.storage.getProfile(siteId);
      const targeting = state.activeTargetingSpec;
      if (!extractBatch || !profile || !targeting) return this.failSession(state, "Данные для оценки отсутствуют.");
      if (extractBatch.results.length === 0) {
           const emptyEvalBatch: LLMVacancyEvalBatchV1 = { id: crypto.randomUUID(), siteId, inputExtractionBatchId: extractBatch.id, decidedAt: Date.now(), modelId: 'none', results: [], summary: { apply: 0, skip: 0, needsHuman: 0 }, tokenUsage: { input: 0, output: 0 }, status: 'OK' };
           await this.storage.saveLLMVacancyEvalBatch(siteId, emptyEvalBatch);
           return this.updateState({ ...state, status: AgentStatus.EVALUATION_DONE, activeEvalBatch: emptyEvalBatch, logs: [...state.logs, "Нет данных для оценки."] });
      }
      const input: EvaluateExtractsInputV1 = { profileSummary: profile.rawContent.substring(0, 3000), targetingRules: { targetRoles: targeting.targetRoles.enTitles, workModeRules: targeting.workModeRules, minSalary: targeting.userConstraints.minSalary }, candidates: extractBatch.results.map(e => ({ id: e.vacancyId, title: "Unknown", sections: e.sections, derived: { salary: e.sections.salary, workMode: e.sections.workMode } })) };
      const output = await this.llm.evaluateVacancyExtractsBatch(this.pruneInput(input));
      let nextState = this.addTokenUsage(state, output.tokenUsage.input, output.tokenUsage.output, false);
      const mappedResults: LLMVacancyEvalResult[] = output.results.map(r => ({ vacancyId: r.id, decision: r.decision, confidence: r.confidence, reasons: r.reasons, risks: r.risks, factsUsed: r.factsUsed }));
      
      const newHistory: AppliedVacancyRecord[] = [];
      const logs: string[] = [];
      mappedResults.forEach(res => {
          const card = state.activeVacancyBatch?.cards.find(c => c.id === res.vacancyId);
          if (card) {
              const status = res.decision === 'APPLY' ? 'APPLIED' : 'SKIPPED';
              const reason = res.reasons.join(', ');
              if (status === 'SKIPPED') {
                  newHistory.push({ 
                      id: res.vacancyId, 
                      title: card.title, 
                      company: card.company || 'Unknown', 
                      url: card.url, // ADDED
                      timestamp: Date.now(), 
                      status: 'SKIPPED', 
                      reason 
                  });
                  logs.push(`⚠️ Пропуск "${card.title}": ${reason}`);
              } else {
                  logs.push(`✅ Одобрено "${card.title}": ${reason}`);
              }
          }
      });
      const updatedHistory = [...state.appliedHistory, ...newHistory];
      const evalBatch: LLMVacancyEvalBatchV1 = { id: crypto.randomUUID(), siteId, inputExtractionBatchId: extractBatch.id, decidedAt: Date.now(), modelId: 'mock', results: mappedResults, summary: { apply: mappedResults.filter(r => r.decision === 'APPLY').length, skip: mappedResults.filter(r => r.decision === 'SKIP').length, needsHuman: mappedResults.filter(r => r.decision === 'NEEDS_HUMAN').length }, tokenUsage: output.tokenUsage, status: 'OK' };
      await this.storage.saveLLMVacancyEvalBatch(siteId, evalBatch);
      return this.updateState({ ...nextState, status: AgentStatus.EVALUATION_DONE, activeEvalBatch: evalBatch, appliedHistory: updatedHistory, logs: [...nextState.logs, ...logs, `Оценка завершена. Apply: ${evalBatch.summary.apply}, Skip: ${evalBatch.summary.skip}`] });
  }

  async buildApplyQueue(state: AgentState, siteId: string): Promise<AgentState> {
      const evalBatch = state.activeEvalBatch;
      if (!evalBatch) return state;
      const items: ApplyQueueItem[] = evalBatch.results.filter(r => r.decision === 'APPLY' || r.decision === 'NEEDS_HUMAN').map(r => ({ vacancyId: r.vacancyId, url: `https://${siteId}/vacancy/${r.vacancyId}`, decision: r.decision as any, status: 'PENDING' }));
      const queue: ApplyQueueV1 = { id: crypto.randomUUID(), siteId, inputEvalBatchId: evalBatch.id, createdAt: Date.now(), items, summary: { total: items.length, pending: items.length, applied: 0, failed: 0 } };
      await this.storage.saveApplyQueue(siteId, queue);
      return this.updateState({ ...state, status: AgentStatus.APPLY_QUEUE_READY, activeApplyQueue: queue, logs: [...state.logs, `Очередь откликов создана: ${items.length} вакансий.`] });
  }

  async probeNextApplyEntrypoint(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const queue = state.activeApplyQueue;
      if (!queue) return state;
      const nextItem = queue.items.find(i => i.status === 'PENDING');
      if (!nextItem) {
          // Changed to COMPLETED to trigger next rotation
          return this.updateState({ ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, "Все отклики обработаны."] });
      }
      await this.browser.navigateTo(nextItem.url);
      const controls = await this.browser.scanApplyEntrypoints();
      const probe: ApplyEntrypointProbeV1 = { taskId: crypto.randomUUID(), vacancyUrl: nextItem.url, foundControls: controls, blockers: { requiresLogin: false, applyNotAvailable: controls.length === 0, unknownLayout: false }, probedAt: Date.now() };
      return this.updateState({ ...state, status: controls.length > 0 ? AgentStatus.APPLY_BUTTON_FOUND : AgentStatus.FAILED, activeApplyProbe: probe, logs: [...state.logs, `Вакансия ${nextItem.vacancyId}: Найдены кнопки отклика (${controls.length}).`] });
  }

  async openAndScanApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const probe = state.activeApplyProbe;
      if (!probe || probe.foundControls.length === 0) return state;
      await this.browser.clickElement(probe.foundControls[0].selector);
      await new Promise(r => setTimeout(r, 2000)); 
      const formSnapshot = await this.browser.scanApplyForm();
      const formProbe: ApplyFormProbeV1 = { taskId: probe.taskId, vacancyUrl: probe.vacancyUrl, entrypointUsed: probe.foundControls[0].selector, applyUiKind: formSnapshot.isModal ? 'MODAL' : 'PAGE', detectedFields: { coverLetterTextarea: formSnapshot.hasCoverLetter, resumeSelector: formSnapshot.hasResumeSelect, submitButtonPresent: formSnapshot.hasSubmit, extraQuestionnaireDetected: formSnapshot.hasQuestionnaire }, safeLocators: { coverLetterHint: formSnapshot.coverLetterSelector || null, submitHint: formSnapshot.submitSelector || null }, successTextHints: [], blockers: { requiresLogin: false, captchaOrAntibot: false, applyNotAvailable: !formSnapshot.hasSubmit, unknownLayout: false }, scannedAt: Date.now() };
      return this.updateState({ ...state, status: AgentStatus.APPLY_FORM_OPENED, activeApplyFormProbe: formProbe, logs: [...state.logs, "Форма отклика открыта и сканирована."] });
  }

  async fillApplyFormDraft(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const formProbe = state.activeApplyFormProbe;
      if (!formProbe) return state;
      const config = await this.storage.getConfig();
      let letter = "Здравствуйте! Меня очень заинтересовала ваша вакансия. У меня есть релевантный опыт работы с указанным стеком технологий. Буду рад обсудить детали на собеседовании.";
      if (config?.coverLetterTemplate && config.coverLetterTemplate.length > 20) {
          letter = config.coverLetterTemplate;
      }
      if (formProbe.detectedFields.coverLetterTextarea && formProbe.safeLocators.coverLetterHint) {
          await this.browser.inputText(formProbe.safeLocators.coverLetterHint, letter);
      }
      const draft: ApplyDraftSnapshotV1 = { vacancyId: "current", siteId, createdAt: Date.now(), coverLetterFieldFound: formProbe.detectedFields.coverLetterTextarea, coverLetterFilled: true, coverLetterReadbackHash: null, coverLetterSource: 'TEMPLATE', questionnaireFound: formProbe.detectedFields.extraQuestionnaireDetected, questionnaireFilled: false, formStateSummary: "Filled cover letter", blockedReason: null };
      await this.storage.saveApplyDraftSnapshot(siteId, draft);
      return this.updateState({ ...state, status: AgentStatus.APPLY_DRAFT_FILLED, activeApplyDraft: draft, logs: [...state.logs, "Черновик отклика заполнен."] });
  }

  // --- UPDATED: submitApplyForm to populate history with URL ---
  async submitApplyForm(state: AgentState, siteId: string): Promise<AgentState> {
      if (state.isPaused) return state;
      const formProbe = state.activeApplyFormProbe;
      if (!formProbe || !formProbe.safeLocators.submitHint) return state;
      await this.browser.clickElement(formProbe.safeLocators.submitHint);
      await new Promise(r => setTimeout(r, 2000));
      const outcome = await this.browser.detectApplyOutcome();
      const queue = state.activeApplyQueue;
      let nextState = state;
      if (queue) {
          const item = queue.items.find(i => i.status === 'PENDING');
          if (item) {
              item.status = outcome === 'SUCCESS' ? 'APPLIED' : 'FAILED';
              await this.storage.saveApplyQueue(siteId, queue);
              if (outcome === 'SUCCESS') {
                  const card = state.activeVacancyBatch?.cards.find(c => c.id === item.vacancyId);
                  if (card) {
                      const record: AppliedVacancyRecord = { 
                          id: card.id, 
                          title: card.title, 
                          company: card.company || 'Unknown', 
                          url: card.url, // ADDED
                          timestamp: Date.now(), 
                          status: 'APPLIED', 
                          reason: 'Full Cycle Success' 
                      };
                      nextState = { ...nextState, appliedHistory: [...nextState.appliedHistory, record] };
                  }
              }
          }
      }
      return this.updateState({ ...nextState, status: outcome === 'SUCCESS' ? AgentStatus.APPLY_SUBMIT_SUCCESS : AgentStatus.APPLY_SUBMIT_FAILED, logs: [...nextState.logs, `Результат отправки: ${outcome}`] });
  }

  async rotateSearchContext(state: AgentState, siteId: string): Promise<AgentState> {
      if (!state.activeTargetingSpec) return state;
      const allRoles = [...state.activeTargetingSpec.targetRoles.ruTitles, ...state.activeTargetingSpec.targetRoles.enTitles];
      const nextIndex = state.currentRoleIndex + 1;
      if (nextIndex >= allRoles.length) {
          // FIX: Return COMPLETED instead of IDLE to trigger Summary Overlay
          return this.updateState({ ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, "🏁 Цикл завершен. Все роли обработаны."] });
      }
      return this.updateState({ ...state, currentRoleIndex: nextIndex, status: AgentStatus.TARGETING_READY, activeSearchDOMSnapshot: undefined, activeSearchUISpec: undefined, activeSearchPrefs: undefined, activeVacancyBatch: undefined, activeDedupedBatch: undefined, activePrefilterBatch: undefined, activeLLMBatch: undefined, activeExtractionBatch: undefined, activeEvalBatch: undefined, activeApplyQueue: undefined, logs: [...state.logs, `🔄 Переход к следующей роли: ${allRoles[nextIndex]}.`] });
  }

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