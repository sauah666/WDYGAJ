# Developer Context (Save Game)

**Last Updated**: Phase F1 Verified (DOM Drift Detection)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE F1** (DOM Drift Detection).
Система теперь умеет определять изменение верстки и блокировать выполнение до подтверждения пользователя.

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
6.  **Resilience (F1)**:
    *   **Fingerprinting**: Снятие структурного хэша страницы (`BrowserPort.getPageFingerprint`).
    *   **Drift Check**: Сравнение текущего хэша с сохраненным (`as_dom_fp_...`).
    *   **Intervention**: Статус `DOM_DRIFT_DETECTED` останавливает работу.
    *   **Resolution**: Кнопка "ACKNOWLEDGE & RE-ANALYZE" сбрасывает устаревшие `SearchUISpec` и обновляет хэш.

### Текущее техническое состояние:
*   State Machine: Полный цикл, включая failover и блокировку дрейфа.
*   Storage: `removeByPrefix` реализован для массовой очистки артефактов сайта.
*   UI: Детальная визуализация (Status, Draft, Questionnaire Answers, Logs) + Drift Warning Banner.

### Mock Fidelity & Testing Guide (F1 Specifics)
*   **Drift Simulation**: `MockBrowserAdapter.getPageFingerprint` returns a stable hash for 'search'. To test drift, you would need to modify this method code temporarily to return a different hash, or clear local storage key `as_dom_fp_hh.ru_search` to force a new baseline capture.
*   **Submit Success**: Triggered by clicking `mock://apply-form/submit`. Sets internal flag `isSuccessState`.
*   **Failover Test**: `hideVacancy` currently always returns `true`.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE F2 — SITE MEMORY & MULTI-SITE**:
1.  Подготовить `SiteDefinition` registry для поддержки нескольких сайтов (не только hh.ru).
2.  Добавить UI селектор сайта в `AgentStatusScreen` (если нужно переключение на лету) или улучшить `SiteSelectionScreen`.
3.  Изолировать хранилище (уже сделано через префиксы, проверить полноту).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Questionnaire**: 1 call per vacancy (if questionnaire detected).
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
