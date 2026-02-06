# Architecture Guidelines

## Core Principles

1.  **Dependency Rule**: Зависимости направлены только ВНУТРЬ.
    *   `Domain` ничего не знает о `UseCases`.
    *   `UseCases` ничего не знают о `Adapters` или `React`.
    *   `Adapters` реализуют `Ports`.
2.  **Strict Scope**: Каждый шаг разработки решает ровно одну задачу.
3.  **State-Driven**: Все изменения UI происходят ТОЛЬКО через реакцию на изменение `AgentState`.

## Layers

### 1. Domain (`core/domain/`)
*   **Entities**:
    *   **Core**: `AgentState`, `SiteDefinition`, `SearchEntryStrategy`.
    *   **Search**: `SearchDOMSnapshotV1`, `SearchUISpecV1`, `UserSearchPrefsV1`, `SearchApplyPlanV1`.
    *   **Pipeline**: `VacancyCardV1`, `VacancyCardBatchV1`, `DedupedVacancyBatchV1`, `PreFilterResultBatchV1`.
    *   **LLM Processing**: `LLMDecisionBatchV1`, `VacancyExtractionBatchV1`, `LLMVacancyEvalBatchV1`.
    *   **Apply**: `ApplyQueueV1`, `ApplyEntrypointProbeV1`, `ApplyFormProbeV1`, `ApplyDraftSnapshotV1`, `ApplySubmitReceiptV1`, `QuestionnaireSnapshotV1`, `QuestionnaireAnswerSetV1`.
    *   **Resilience**: `ApplyAttemptState`.
*   **Contracts**: `TargetingSpecV1`, `ProfileSummaryV1`, `SearchUIAnalysisInputV1`, `LLMScreeningInputV1`, `EvaluateExtractsInputV1`, `QuestionnaireAnswerInputV1`, `QuestionnaireAnswerOutputV1`.
*   **Запрещено**: Импорты из `react`, `fs`, браузерных API (кроме тех, что в полифилах).

### 2. Use Cases (`core/usecases/`)
*   **AgentUseCase**: Оркестратор. Содержит бизнес-логику переходов между статусами.
*   Управляет: `BrowserPort`, `StoragePort`, `LLMPort`, `UIPort`.

### 3. Ports (`core/ports/`)
*   Интерфейсы. Определяют, ЧТО нужно системе, но не КАК это делать.

### 4. Adapters (`adapters/`)
*   **BrowserAdapter**: Управляет Puppeteer/Selenium (сейчас Mock).
*   **StorageAdapter**: LocalStorage / IndexedDB.
*   **LLMAdapter**: API Gemini/OpenAI (сейчас Mock).
*   **Presenter**: Связывает React и UseCase.

## State Machine (`AgentStatus`)

Поток выполнения линеен, но с возможностью "Human Gate" (ожидание человека).

1.  `IDLE` -> `STARTING` -> `NAVIGATING`
2.  `WAITING_FOR_HUMAN` (Логин) -> `LOGGED_IN_CONFIRMED`
3.  `CHECK_PROFILE`:
    *   Если есть -> `TARGETING_READY`
    *   Если нет -> `WAITING_FOR_PROFILE_PAGE` -> `EXTRACTING` -> `PROFILE_CAPTURED`
4.  `TARGETING`: `PROFILE_CAPTURED` -> `TARGETING_PENDING` -> `TARGETING_READY` (или `TARGETING_ERROR`)
5.  `SEARCH_NAV`: `TARGETING_READY` -> `NAVIGATING_TO_SEARCH` -> `SEARCH_PAGE_READY`
6.  `SEARCH_EXEC`: `SEARCH_PAGE_READY` -> `SEARCH_DOM_READY` -> `ANALYZING_SEARCH_UI` -> `WAITING_FOR_SEARCH_PREFS` -> `SEARCH_PREFS_SAVED` -> `APPLY_PLAN_READY`
7.  `APPLY_FLOW` (Cycle):
    *   Preparation: `APPLY_QUEUE_READY`
    *   Entry: `FINDING_APPLY_BUTTON` -> `APPLY_BUTTON_FOUND`
    *   Form: `APPLY_FORM_OPENED` -> `FILLING_QUESTIONNAIRE` (if needed) -> `APPLY_DRAFT_FILLED`
    *   Submission: `SUBMITTING_APPLICATION` -> `APPLY_SUBMIT_SUCCESS` (Terminal Success) or `APPLY_SUBMIT_FAILED`
    *   Retry/Failover: `APPLY_RETRYING` -> `APPLY_FAILED_HIDDEN` or `APPLY_FAILED_SKIPPED` (Terminal Failures)

## Common Pitfalls & Errors

*   **UI Logic Leak**: Не пишите логику (`if status === ...`) внутри React-компонентов, если это влияет на бизнес-процесс. Все переходы — через Presenter -> UseCase.
*   **Serialization**: Все, что попадает в `StoragePort`, должно быть JSON-serializable. Никаких функций или классов в State.
*   **Race Conditions**: `Presenter` должен корректно отписываться от View при unmount.