
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
    *   **Core**: `AgentState` (includes `TokenLedger`, `AppliedVacancyRecord`), `SiteDefinition`, `ContextBudgetV1`.
    *   **Search**: `SearchDOMSnapshotV1`, `SearchUISpecV1`, `UserSearchPrefsV1`, `SearchApplyPlanV1`.
    *   **Pipeline**: `VacancyCardV1`, `VacancyCardBatchV1`, `DedupedVacancyBatchV1`, `PreFilterResultBatchV1`.
    *   **LLM Processing**: `LLMDecisionBatchV1`, `VacancyExtractionBatchV1`, `LLMVacancyEvalBatchV1`.
    *   **Apply**: `ApplyQueueV1`, `ApplyEntrypointProbeV1`, `ApplyFormProbeV1`, `ApplyDraftSnapshotV1`, `ApplySubmitReceiptV1`, `QuestionnaireSnapshotV1`, `QuestionnaireAnswerSetV1`.
    *   **Resilience & Ops**: `ApplyAttemptState`, `DOMFingerprintV1`, `CompactionSummaryV1`, `PruningPolicyV1`.
*   **Contracts**: `TargetingSpecV1`, `ProfileSummaryV1`, `SearchUIAnalysisInputV1`, `LLMScreeningInputV1`, `EvaluateExtractsInputV1`.
*   **Logic**:
    *   `runtime.ts`: Detection of execution environment (Node vs Browser) and capability validation.
    *   `llm_registry.ts`: Definitions of supported AI providers and their configuration requirements.
*   **Запрещено**: Импорты из `react`, `fs`, браузерных API.

### 2. Use Cases (`core/usecases/`)
*   **AgentUseCase**: Оркестратор. Содержит бизнес-логику переходов между статусами.
*   Реализует: Governance (Context Health), Deduplication, Telemetry, Retry Policies, Rotation Logic, Amnesia.
*   Управляет: `BrowserPort`, `StoragePort`, `LLMPort`, `UIPort`.

### 3. Ports (`core/ports/`)
*   Интерфейсы. Определяют, ЧТО нужно системе, но не КАК это делать.

### 4. Adapters (`adapters/`)
*   **BrowserAdapter**:
    *   `MockBrowserAdapter`: Fully simulated browser environment for development/demo.
    *   `RemoteBrowserAdapter`: Client for connecting to a remote Node.js runner (HTTP/WebSocket).
    *   `PlaywrightBrowserAdapter` (Node-only): Direct control of Chromium via Playwright.
*   **StorageAdapter**: `LocalStorageAdapter` with namespace isolation and legacy fallback support.
*   **LLMAdapter**:
    *   `MockLLMAdapter`: Simulated deterministic AI responses.
    *   `GeminiLLMAdapter`: Native Google GenAI integration.
    *   `OpenAILLMAdapter`: Generic client supporting OpenAI, DeepSeek, and Local LLMs (Ollama/LM Studio).
*   **Presenter**: `AgentPresenter` - Bridges React UI events to UseCase logic and drives the "Automation Loop".

## Runtime Governance (Factory Pattern)

The application uses a dynamic factory in `App.tsx` backed by `core/domain/runtime.ts` to select the correct adapters:

1.  **Runtime Capability Analysis**: Detects if running in a Browser or Node.js environment.
2.  **Config Validation**: Checks if `apiKey` or `localGatewayUrl` are present for the selected LLM provider.
3.  **Adapter Instantiation**:
    *   If `browserProvider='playwright'` but runtime is Browser -> Fallback to `Remote` or `Mock`.
    *   If `activeLLMProviderId='local_llm'` -> Configures `OpenAILLMAdapter` with custom `baseUrl`.

## Routing vs State Machine

*   **AppRoute (UI Router)**: Controls which *Screen* is visible to the user.
    *   `MODE_SELECTION` -> `SITE_SELECTION` -> `JOB_PREFERENCES` -> `AGENT_RUNNER`.
    *   Managed by React State (`route`).
*   **AgentStatus (Business Logic)**: Controls what the *Agent* is doing.
    *   `IDLE` -> `STARTING` -> `SEARCH...` -> `APPLY...`.
    *   Managed by `AgentState` (Redux-like).
    *   *Interaction*: The `AGENT_RUNNER` route is the only screen that visualizes the active `AgentStatus`. All other routes are for configuration while the agent is `IDLE`.

## Reset & Memory Matrix

| Action | Clears State | Clears Config | Clears Profile | Clears Cache (Targeting/UI) | Reset Seen Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reset Session** | YES (New Object) | NO | NO | NO | NO |
| **Reset Profile** | YES | NO | YES | YES (Targeting) | NO |
| **Reset Config** | NO | YES | NO | NO | NO |
| **Amnesia Mode** | YES (History Only) | NO | NO | YES (Batches) | **YES** |
| **Full Wipe** | YES | YES | YES | YES | YES |

## State Machine (`AgentStatus`)

1.  **Initialization**: `IDLE` -> `STARTING` -> `NAVIGATING`.
2.  **Login**: `WAITING_FOR_HUMAN` (Login) -> `LOGGED_IN_CONFIRMED`.
3.  **Profile**: `CHECK_PROFILE` -> `WAITING_FOR_PROFILE_PAGE` -> `EXTRACTING` -> `PROFILE_CAPTURED` -> `TARGETING_READY`.
4.  **Search Prep**: `TARGETING_READY` -> `NAVIGATING_TO_SEARCH` -> `SEARCH_PAGE_READY`.
5.  **Search Config**: `SEARCH_PAGE_READY` -> `SEARCH_DOM_READY` -> `ANALYZING_SEARCH_UI` -> `WAITING_FOR_SEARCH_PREFS` -> `SEARCH_PREFS_SAVED` -> `APPLY_PLAN_READY`.
6.  **Pipeline Loop**:
    *   `SEARCH_READY` -> `VACANCIES_CAPTURED` -> `VACANCIES_DEDUPED`.
    *   `PREFILTER_DONE` -> `LLM_SCREENING_DONE`.
    *   `EXTRACTING_VACANCIES` -> `VACANCIES_EXTRACTED` -> `EVALUATION_DONE`.
7.  **Apply Cycle**:
    *   `APPLY_QUEUE_READY`.
    *   `FINDING_APPLY_BUTTON` -> `APPLY_BUTTON_FOUND`.
    *   `APPLY_FORM_OPENED` -> `FILLING_QUESTIONNAIRE` (if needed) -> `APPLY_DRAFT_FILLED`.
    *   `SUBMITTING_APPLICATION` -> `APPLY_SUBMIT_SUCCESS` or `APPLY_SUBMIT_FAILED`.
    *   *Retry/Failover*: `APPLY_RETRYING`, `APPLY_FAILED_HIDDEN`, `APPLY_FAILED_SKIPPED`.
8.  **Rotation & End**:
    *   `COMPLETED` -> `TARGETING_READY` (Next Role) OR `IDLE` (Finished).
    *   `FAILED`, `PAUSED`, `RUNTIME_CONFIG_ERROR`, `LLM_CONFIG_ERROR`, `CONTEXT_OVER_LIMIT`.

## Context Governance (Phase G3)

*   **Token Ledger**: Tracks input/output tokens per session.
*   **Pruning**: `pruneInput()` recursivley removes raw HTML tags from LLM payloads to save context window.
*   **Compaction**: When `AgentState` size > `softTokenLimit` (30k chars), older logs are compressed into a `CompactionSummary` entry, keeping only the head and tail of the session log.
