
# Developer Context (Save Game)

**Last Updated**: Phase G3 Implemented (Pruning, Compaction, Adaptive Context) + Runtime Governance
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE G3** + **G3.0.1 FIX PACK** + **Runtime/Manual Fixes**.
Теперь агент защищен от переполнения контекста, отправки сырого HTML, и соблюдает строгую дисциплину батчинга.
Также исправлены проблемы совместимости браузера с Node-модулями (Playwright).

### Что сделано (G3 + Fixes):
1.  **Pruning**: `pruneInput` очищает данные (проверка на HTML теги).
2.  **Context Health**: `monitorContextHealth` проверяет размер стейта.
3.  **Compaction**: Soft Limit (30k) сворачивает логи в `CompactionSummary`.
4.  **Batch Discipline**: Strict 10-15 items window.
5.  **Runtime Safety**: 
    - Playwright adapter moved to `adapters/browser/node/`.
    - `App.tsx` dynamically selects adapters based on runtime caps.
    - Settings screen gates impossible options.

### Текущее техническое состояние:
*   Limits: Soft = 30k, Hard = 36k tokens.
*   Policy: `DEFAULT_PRUNING_POLICY` (10-15 items).
*   Env: Browser UI + Optional Remote Node Runner.

### Troubleshooting
*   **PRUNING_VIOLATION**: Input contains raw HTML. Check DTOs.
*   **CONTEXT_OVER_LIMIT**: Execution blocked. User must Reset Session.
*   **RUNTIME_CONFIG_ERROR**: User tried to use Playwright in Browser without Node Runner. Check Settings.

### Следующий шаг (IMMEDIATE NEXT):
**MAINTENANCE / RELEASE PREP**:
1.  Verify end-to-end flow with real Gemini key (optional).
2.  Polish UI logic.
3.  Freeze feature set.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
