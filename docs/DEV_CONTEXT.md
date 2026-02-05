# Developer Context (Save Game)

**Last Updated**: Phase E1.1 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE E1.1: PROBE APPLY ENTRYPOINT (READ-ONLY)**.

### Что сделано:
1.  **Extraction** (Phase D1): Данные извлечены.
2.  **Evaluation** (Phase D2.1): 
    *   Создан `LLMVacancyEvalBatchV1`.
    *   Реализован метод `runLLMEvalBatch`.
3.  **Queue Building** (Phase D2.2):
    *   Создан `ApplyQueueV1` из `activeEvalBatch`.
4.  **Entrypoint Probe** (Phase E1.1):
    *   Реализован метод `probeNextApplyEntrypoint`.
    *   Сканирование страницы вакансии на наличие кнопок "Откликнуться" (без кликов).
    *   Артефакт `ApplyEntrypointProbeV1` сохраняется в стейте (transient).
    *   UI отображает найденные контролы и блокираторы.

### Текущее техническое состояние:
*   `AgentStatus` переходит в `APPLY_BUTTON_FOUND`.
*   В стейте доступен `activeApplyProbe`.
*   MockBrowser возвращает эмуляцию кнопки отклика.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1.2 — CLICK APPLY & ANALYZE FORM**:
1.  Взять текущую задачу (из `activeApplyProbe` или снова через очередь).
2.  Выполнить клик по найденному контролу.
3.  Определить результат клика:
    *   **Instant Apply**: Успешный отклик сразу.
    *   **Modal Form**: Открылось окно с вопросами/сопроводительным.
    *   **Redirect**: Переход на внешний сайт.
4.  Зафиксировать статус в `ApplyQueueItem` (если успех) или перейти к заполнению формы.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.