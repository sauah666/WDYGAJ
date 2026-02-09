
# Architecture Guidelines

## Core Principles

1.  **Dependency Rule**: Зависимости направлены только ВНУТРЬ.
    *   `Shared` (types) -> `Domain` -> `UseCases` -> `Adapters` -> `UI`.
    *   `UseCases` ничего не знают о `Adapters` или `React`.
    *   `Adapters` реализуют `Ports`.
2.  **Strict Scope**: Каждый шаг разработки решает ровно одну задачу.
3.  **State-Driven**: Все изменения UI происходят ТОЛЬКО через реакцию на изменение `AgentState`.

## Layers

### 0. Shared Kernel (`types.ts`)
*   Общие типы, Enums (`WorkMode`, `AgentStatus`, `AgentConfig`, `AppRoute`).
*   Отсутствие зависимостей от других слоев.

### 1. Domain (`core/domain/`)
*   **Entities**:
    *   **Core**: `AgentState` (includes `TokenLedger`, `AppliedVacancyRecord`, `ContextHealth`), `SiteDefinition`, `ContextBudgetV1`.
    *   **Search**: `SearchDOMSnapshotV1`, `SearchUISpecV1`, `UserSearchPrefsV1`, `SearchApplyPlanV1`.
    *   **Pipeline**: `VacancyCardV1`, `VacancyCardBatchV1`, `DedupedVacancyBatchV1`, `PreFilterResultBatchV1`.
    *   **LLM Processing**: `LLMDecisionBatchV1`, `VacancyExtractionBatchV1`, `LLMVacancyEvalBatchV1`.
    *   **Apply**: `ApplyQueueV1`, `ApplyEntrypointProbeV1`, `ApplyFormProbeV1`, `ApplyDraftSnapshotV1`, `ApplySubmitReceiptV1`, `QuestionnaireSnapshotV1`, `QuestionnaireAnswerSetV1`.
    *   **Resilience & Ops**: `ApplyAttemptState`, `DOMFingerprintV1`, `CompactionSummaryV1`, `PruningPolicyV1`.
*   **Contracts**: `TargetingSpecV1`, `ProfileSummaryV1`, `SearchUIAnalysisInputV1`, `LLMScreeningInputV1`, `EvaluateExtractsInputV1`.
*   **Logic**:
    *   `runtime.ts`: Detection of execution environment (Node vs Browser vs Electron).
    *   `llm_registry.ts`: Definitions of supported AI providers and their configuration requirements.
*   **Config**: `AgentConfig` includes `autoCoverLetter`, `targetResumeTitle`, `maxApplications` (0 = Infinity).
*   **Запрещено**: Импорты из `react`, `fs`, браузерных API.

### 2. Use Cases (`core/usecases/`)
*   **AgentUseCase**: Оркестратор. Содержит бизнес-логику переходов между статусами.
*   Реализует: Governance (Context Health), Deduplication, Telemetry, Retry Policies, Rotation Logic, Amnesia.
*   **Limit Enforcement**: `submitApplyForm` checks `state.runAppliesCount` against `config.maxApplications`. If limit reached, status -> `COMPLETED`.
*   **Invariant Fix (v1.4)**: Ensures `activeProfileSnapshot` is populated in `AgentState` immediately after capture/load to prevent pipeline stalls during LLM evaluation phases.

### 3. Ports (`core/ports/`)
*   Интерфейсы. Определяют, ЧТО нужно системе, но не КАК это делать.
*   Updated: `BrowserPort` now includes `selectOption` for handling dropdowns (e.g. Resume Selector).

### 4. Adapters (`adapters/`)
*   **BrowserAdapter**:
    *   `MockBrowserAdapter`: Fully simulated browser environment. Supports `selectOption` mock logic.
    *   `ElectronIPCAdapter` (Active): Bridges Renderer process to Main process via `window.electronAPI`. Allows `Playwright` execution in a desktop context. **Primary Implementation for Real Mode.**
    *   `McpBrowserAdapter` (Active): Connects to a Model Context Protocol server via SSE/HTTP to control external browsers.
    *   `RemoteBrowserAdapter` (**[DEPRECATED]**): A client-side stub for HTTP-controlled remote browsers. Superseded by Electron IPC for desktop, but kept for legacy web-server scenarios.
    *   `PlaywrightBrowserAdapter` (Node-only): Direct control of Chromium via Playwright (used by Electron Main).
*   **StorageAdapter**: `LocalStorageAdapter` with namespace isolation and legacy fallback support.
*   **LLMAdapter**:
    *   `MockLLMAdapter`: Simulated deterministic AI responses.
    *   `GeminiLLMAdapter`: Native Google GenAI integration. **Hardened**: Includes runtime validation to ensure JSON arrays (`ruTitles`) are iterable, preventing crashes on malformed LLM output.
    *   `OpenAILLMAdapter`: Generic client supporting OpenAI, DeepSeek, and Local LLMs (Ollama/LM Studio).
*   **Presenter**: `AgentPresenter` - Bridges React UI events to UseCase logic and drives the "Automation Loop".

## Runtime Governance (Factory Pattern)

The application uses a dynamic factory in `App.tsx` backed by `core/domain/runtime.ts`:

1.  **Runtime Capability Analysis**: Detects Browser vs Electron (`window.electronAPI`).
2.  **Adapter Instantiation**:
    *   Priority: Config Force Mock -> Electron IPC -> Native Node -> Fallback Mock.
    *   **Strict Mode**: If the configuration requests `REAL` mode but the environment lacks the necessary capabilities (Electron API), the app will **throw an error** rather than silently falling back to Mock. This ensures the user is aware of the environment mismatch.

## Configuration & Defaults Strategy (UX Layer)

To improve User Experience, the UI layer (`SettingsScreen.tsx`) implements "Smart Defaults" logic that sits above the Domain configuration:

*   **Macro Regime Switch**: The UI provides a high-level toggle between "Mock" and "Real" regimes.
*   **Auto-Configuration**:
    *   **Switching to Real Mode**: Automatically attempts to switch the `activeLLMProviderId` to `local_llm` (if the current one is `mock`), assuming a user enabling Real Browser likely wants Real AI.
    *   **Switching to Mock Mode**: Forces both Browser and LLM configs to `mock` to ensure a safe, offline, cost-free demonstration environment.
*   This logic ensures that users don't accidentally run a Real Browser with a Mock LLM (useless) or vice-versa, unless they explicitly override it in the detailed settings.

## Resilience & Safety Nets

### LLM Output Hardening
To prevent crashes due to malformed JSON from stochastic LLMs, Adapters must implement the following safety nets:
*   **Schema Enforcement**: Prompts must include strict JSON schemas.
*   **Runtime Patching**: If an expected array (e.g., `targetRoles.ruTitles`) is missing or null, the Adapter must inject a default empty array `[]` before passing data to the Domain.
*   **Default Fallback**: If critical fields are entirely missing (e.g., no roles extracted), the Adapter should inject a generic safe fallback (e.g., `["Specialist"]`) to allow the pipeline to continue rather than crashing.

### Context Governance Limits (Phase G3)
*   **Soft Limit**: 30,000 tokens. Triggers "Compact Session" (summarizing logs).
*   **Hard Limit**: 36,000 tokens. Triggers `CONTEXT_OVER_LIMIT` status, pausing the agent to prevent context window overflow errors.

## Reset & Memory Matrix

| Action | Clears State | Clears Config | Clears Profile | Clears Cache (Targeting/UI) | Reset Seen Index | Reset Universal Letter |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Reset Session** | YES (New Object) | NO | NO | NO | NO | NO |
| **Reset Profile** | YES | NO | YES | YES (Targeting) | NO | NO |
| **Reset Config** | NO | YES | NO | NO | NO | NO |
| **Amnesia Mode** | YES (History Only) | NO | NO | YES (Batches/Specs) | **YES** | NO |
| **Clear Letter** | NO | NO | NO | NO | NO | **YES** |
| **Full Wipe** | YES | YES | YES | YES | YES | YES |

## State Machine (`AgentStatus`)

1.  **Initialization**: `IDLE` -> `STARTING` -> `NAVIGATING`.
2.  **Login**: `WAITING_FOR_HUMAN` (Login) -> `LOGGED_IN_CONFIRMED`.
3.  **Profile**: `CHECK_PROFILE` -> `WAITING_FOR_PROFILE_PAGE` -> `EXTRACTING` -> `PROFILE_CAPTURED` -> `TARGETING_READY`.
4.  **Search Prep**: `TARGETING_READY` -> `NAVIGATING_TO_SEARCH` -> `SEARCH_PAGE_READY`.
5.  **Search Config**: `SEARCH_PAGE_READY` -> `SEARCH_DOM_READY` -> `ANALYZING_SEARCH_UI` -> `WAITING_FOR_SEARCH_PREFS` -> `SEARCH_PREFS_SAVED` -> `APPLY_PLAN_READY`.
6.  **Pipeline Loop**:
    *   `SEARCH_READY` -> `VACANCIES_CAPTURED` (Batch 15) -> `VACANCIES_DEDUPED`.
    *   `VACANCIES_DEDUPED` -> `PREFILTER_DONE`.
    *   `PREFILTER_DONE` -> `LLM_SCREENING_DONE`.
    *   `LLM_SCREENING_DONE` -> `EXTRACTING_VACANCIES` -> `VACANCIES_EXTRACTED`.
    *   `VACANCIES_EXTRACTED` -> `EVALUATION_DONE`.
7.  **Apply Cycle**:
    *   `APPLY_QUEUE_READY`.
    *   `FINDING_APPLY_BUTTON` -> `APPLY_BUTTON_FOUND`.
    *   `APPLY_FORM_OPENED` -> `FILLING_QUESTIONNAIRE` (if needed) -> `APPLY_DRAFT_FILLED`.
    *   `SUBMITTING_APPLICATION` -> `APPLY_SUBMIT_SUCCESS` or `APPLY_SUBMIT_FAILED`.
    *   *Check Limit*: If `runAppliesCount` >= `maxApplications` -> `COMPLETED`.
    *   *Retry/Failover*: `APPLY_RETRYING`, `APPLY_FAILED_HIDDEN`, `APPLY_FAILED_SKIPPED`.
8.  **Rotation & End**:
    *   `COMPLETED` -> `TARGETING_READY` (Next Role) OR `IDLE` (Finished).
    *   `FAILED`, `PAUSED`, `RUNTIME_CONFIG_ERROR`, `LLM_CONFIG_ERROR`, `CONTEXT_OVER_LIMIT`.

## Batch Enforcement Policy
*   **Batch Size**: 15 items (Safe Default) to ensure LLM stability.
*   **Dedup**: Strictly filters out previously seen external IDs.

## Technical Deviations & Debt

1.  **JokeService Persistence**: Directly accesses `localStorage`.
2.  **Remote Runner Stub**: `RemoteBrowserAdapter` expects an external server (deprecated pattern). The preferred path is now **Electron**.
3.  **External Asset Dependency**: The "Valera" Orb videos (`valera_merged.mp4`, etc.) are hotlinked from a raw GitHub repository. This is a fragility risk (CORS/Uptime). Production builds should bundle these assets.
4.  **Selector Strategy**:
    *   `MockBrowserAdapter` uses synthetic selectors (e.g., `mock://vacancy/apply-button`).
    *   `PlaywrightBrowserAdapter` uses real CSS/XPath selectors.
    *   *Implication*: LLM-generated `SearchUISpec` must be aware of the context, or the Adapter must handle translation. Currently, logic favors the specific implementation of the active adapter.
5.  **Electron Apply Handlers**: The `ElectronIPCAdapter` currently uses **stubs** (empty arrays or no-ops) for the Apply flow (`scanApplyEntrypoints`, `submitApplyForm`).
    *   *Impact*: While `Mock` mode simulates the full cycle, `Real` mode (Electron) can only Search and Extract. It cannot yet click "Apply" or fill forms on `hh.ru` without updating `electron/main.js` with site-specific selectors.
