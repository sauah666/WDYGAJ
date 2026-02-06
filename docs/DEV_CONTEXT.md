# Developer Context (Save Game)

**Last Updated**: Phase E3 Verified (Retry & Failover)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE E3: RETRY & FAILOVER**.
Система теперь умеет не только откликаться и заполнять анкеты, но и обрабатывать сбои, делать повторные попытки (до 3 раз) и скрывать вакансии при неудачах.

### Что сделано:
1.  **Drafting (E1.3)**: Агент открывает форму, находит поле CV, заполняет его (с учетом шаблона из конфига или сгенерированного текста).
2.  **Submit & Verify (E1.4)**:
    *   Реализован клик по Submit.
    *   Внедрена логика верификации успеха через `BrowserPort.detectApplyOutcome` (поиск текста успеха или изменение URL).
    *   Создание `ApplySubmitReceipt` для истории.
3.  **Questionnaire Handling (E2)**:
    *   Агент детектирует дополнительные вопросы (опыт, виза, ссылки).
    *   LLM генерирует ответы на основе профиля (1 вызов на анкету).
    *   Ответы кэшируются и переиспользуются при ретраях.
4.  **Retry & Failover (E3)**:
    *   Единая политика ретраев: 3 попытки с экспоненциальной паузой.
    *   Failover: Если 3 раза не удалось — вакансия скрывается (`hideVacancy`) или пропускается.
    *   Состояние `ApplyAttemptState` сохраняется в Storage, переживает перезагрузку.
    *   Новые UI статусы: `APPLY_RETRYING`, `APPLY_FAILED_HIDDEN`, `APPLY_SUBMIT_SUCCESS`.

### Текущее техническое состояние:
*   State Machine: Полный цикл от поиска до финального статуса отклика (`APPLY_SUBMIT_SUCCESS` / `APPLY_FAILED_HIDDEN`).
*   Storage: Сохраняет все промежуточные артефакты (Drafts, Receipts, Attempts, Questionnaire Answers).
*   UI: Отображает статус попыток, ошибки и результаты.

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