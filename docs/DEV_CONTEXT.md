
# Developer Context (Save Game)

**Last Updated**: Phase G3 Implemented (Pruning, Compaction, Adaptive Context)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE G3** + **G3.0.1 FIX PACK**.
Теперь агент защищен от переполнения контекста, отправки сырого HTML, и соблюдает строгую дисциплину батчинга.

### Что сделано (G3 + Fixes):
1.  **Pruning**: `pruneInput` очищает данные (проверка на HTML теги).
2.  **Context Health**: `monitorContextHealth` проверяет размер стейта.
3.  **Compaction**: Soft Limit (30k) сворачивает логи в `CompactionSummary` (используя константы политики).
4.  **Batch Discipline**:
    *   `runLLMBatchScreening` строго ограничивает батч до 15.
    *   Пропускает вызов LLM, если кандидатов < 10, **кроме случая**, когда достигнут конец списка (`endOfResults` flag).
5.  **UI**: Виджет памяти, статусы `NEAR_LIMIT`, `OVER_LIMIT`.

### Текущее техническое состояние:
*   Limits: Soft = 30k, Hard = 36k tokens.
*   Policy: `DEFAULT_PRUNING_POLICY` (10-15 items), `DEFAULT_COMPACTION_POLICY` (5 head/5 tail logs).

### Troubleshooting
*   **PRUNING_VIOLATION**: Input contains raw HTML. Check DTOs.
*   **CONTEXT_OVER_LIMIT**: Execution blocked. User must Reset Session.
*   **Batch Deferred**: Если лог пишет "Batch deferred", значит накопилось < 10 вакансий и это не конец списка. Нужно собрать больше вакансий (или ждать авто-цикла).

### Следующий шаг (IMMEDIATE NEXT):
**MAINTENANCE / RELEASE PREP**:
1.  Verify end-to-end flow with real Gemini key (optional).
2.  Polish UI logic.
3.  Freeze feature set.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
