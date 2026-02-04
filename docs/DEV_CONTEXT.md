# Developer Context (Save Game)

**Last Updated**: Phase D2.2 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE D2.2: BUILD APPLY QUEUE**.

### Что сделано:
1.  **Extraction** (Phase D1): Данные извлечены.
2.  **Evaluation** (Phase D2.1): 
    *   Создан `LLMVacancyEvalBatchV1`.
    *   Реализован метод `runLLMEvalBatch`.
3.  **Queue Building** (Phase D2.2):
    *   Создан `ApplyQueueV1` из `activeEvalBatch`.
    *   Реализован метод `buildApplyQueue`.
    *   **VERIFIED**: Очередь содержит только APPLY, NEEDS_HUMAN остались доступны в EvalBatch View, идемпотентность соблюдена.

### Текущее техническое состояние:
*   `AgentStatus` переходит в `APPLY_QUEUE_READY`.
*   В стейте доступен `activeApplyQueue`.
*   В UI отображаются и результаты оценки, и сформированная очередь.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1 — AUTO APPLY (SIMPLE)**:
1.  Брать задачи из `activeApplyQueue` (статус PENDING).
2.  Переходить по URL.
3.  Нажимать "Откликнуться" (простой сценарий без анкеты).
4.  Обновлять статус задачи в очереди (APPLIED / FAILED).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.