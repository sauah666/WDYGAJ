# Developer Context (Save Game)

**Last Updated**: Patch Fix Verified (Reset & Transparency)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE E3** и применили **PATCH FIX** (Reset Semantics).
Система стабильна, поддерживает ретраи, failover, и корректно очищает данные при смене профиля.

### Что сделано:
1.  **Drafting (E1.3)**: Агент открывает форму, находит поле CV, заполняет его.
2.  **Submit & Verify (E1.4)**:
    *   Клик по Submit + Верификация результата.
    *   Создание `ApplySubmitReceipt`.
3.  **Questionnaire Handling (E2)**:
    *   Детекция и заполнение анкет (LLM 1 call).
    *   Кэширование ответов по хешу вопросов.
4.  **Retry & Failover (E3)**:
    *   Политика 3-х попыток.
    *   Failover (скрытие вакансии).
5.  **Patch Fix (Reset & UI)**:
    *   **ResetProfile**: Теперь удаляет не только `ProfileSnapshot`, но и `TargetingSpec`, `SearchUISpec`, `QuestionnaireAnswerSet`, `SearchApplyPlan`. Гарантия "Fresh Start".
    *   **UI**: Отображение `facts_used` в статусе агента для прозрачности решений LLM.

### Текущее техническое состояние:
*   State Machine: Полный цикл, включая failover.
*   Storage: `removeByPrefix` реализован для массовой очистки артефактов сайта.
*   UI: Детальная визуализация (Status, Draft, Questionnaire Answers, Logs).

### Mock Fidelity & Testing Guide (E3 Specifics)
Critical context for Phase F1 (Resilience):
*   **Questionnaire Trigger**: The Mock Adapter simulates a questionnaire *only* if the "Apply" modal is open.
*   **Submit Success**: Triggered by clicking `mock://apply-form/submit`. Sets internal flag `isSuccessState`.
*   **Retry Loop Test**: To test retries, you must modify `MockBrowserAdapter.clickElement` to return `false` or throw an error for the submit selector conditionally.
*   **Failover Test**: `hideVacancy` currently always returns `true`.
*   **DOM Static Nature**: The mock returns *static* HTML snapshots. For Phase F1 (Drift Detection), you must manually alter the string returned by `getDomSnapshot` to simulate layout changes.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE F1 — DOM DRIFT DETECTION (Resilience)**:
1.  Реализовать механизм сравнения DOM-снимков (`SearchDOMSnapshotV1`).
2.  Детектировать изменения верстки (Drift) по сравнению с сохраненным `SearchUISpec`.
3.  Если Drift обнаружен -> инвалидировать `SearchUISpec` и запустить реанализ (Stage 5.3).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Questionnaire**: 1 call per vacancy (if questionnaire detected).
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
