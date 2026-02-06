# Developer Context (Save Game)

**Last Updated**: Phase G2 Implemented (Token Ledger & Telemetry)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE G2** (Token Ledger & Telemetry).
Теперь агент ведет точный подсчет токенов (input/output) и количества вызовов LLM.

### Что сделано:
1.  **Ledger**: `TokenLedger` теперь включает поле `calls`.
2.  **Contracts**: `TargetingSpecV1`, `SearchUISpecV1`, `QuestionnaireAnswerOutputV1` получили поле `tokenUsage`.
3.  **Use Case**: `addTokenUsage` инкрементирует счетчик вызовов.
4.  **UI**: Панель логов показывает `CALLS: X`.
5.  **Adapters**: Mock и Gemini адаптеры возвращают реальную (или мок) статистику токенов.
6.  **G2.1 HOTFIX**: Fixed bug where telemetry from Questionnaire Generation was ignored.

### Текущее техническое состояние:
*   Telemetry: Покрыты все 5 основных вызовов LLM (Profile, DOM, Screening, Evaluation, Questionnaire).
*   Mock Adapter: Возвращает жестко заданные значения использования токенов (например, 1000/500 для профиля).
*   Gemini Adapter: Прокидывает `usageMetadata` от Google API.

### Mock Fidelity & Testing Guide (G2 Specifics)
*   **Token Increments**: Run the agent. After each step (Targeting, UI Analysis, etc.), verify the "CALLS", "IN", and "OUT" counters in the log panel increase monotonically.
*   **Calls**: Should increment by 1 for single calls, or batch count for looped calls (though currently LLM calls are batched inside the adapter usually as single request).
*   **Behavior**: Verify NO changes in agent logic. It should successfully build plans and apply filters just as before.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE G3 — PRUNING & COMPACTION**:
1.  Optimize context window usage.
2.  Implement `compactProfile` logic to reduce tokens sent to LLM.
3.  Truncate long DOM snapshots before sending.
4.  Implement adaptive batch sizing based on remaining context window (optional, but good for stability).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Questionnaire**: 1 call per vacancy (if questionnaire detected).
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
