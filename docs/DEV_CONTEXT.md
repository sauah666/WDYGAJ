# Developer Context (Save Game)

**Last Updated**: Phase G1 Implemented (LLM Provider Registry)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE G1** (LLM Provider Registry).
Агент теперь поддерживает конфигурацию LLM провайдера через UI.
Реализована валидация наличия API ключей и визуализация ошибок конфигурации.

### Что сделано:
1.  **LLM Registry**: `core/domain/llm_registry.ts` с определениями Mock, Gemini, OpenAI.
2.  **Configuration**: `activeLLMProviderId` в `AgentConfig`.
3.  **UI Controls**: Селектор провайдера и ввод ключа в `SettingsScreen`.
4.  **Error Handling**: Статус `LLM_CONFIG_ERROR` блокирует запуск при невалидном конфиге.

### Текущее техническое состояние:
*   State Machine: Добавлен `LLM_CONFIG_ERROR`.
*   Adapters: `App.tsx` фабрика адаптеров теперь читает `activeLLMProviderId` и валидирует ключи.
*   Validation: Проверка происходит при загрузке (`useEffect`), при сохранении конфига и при нажатии "Run".

### Mock Fidelity & Testing Guide (G1 Specifics)
*   **Provider Switch**: Go to Settings, select "Google Gemini".
*   **Key Validation**: Leave API Key empty and click "Confirm". Should trigger error status or visual warning.
*   **Reset**: Click "Reset" icon next to LLM Governance title. Should revert to Mock and clear key.
*   **Persistence**: Reload page. Selected provider should persist.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE G2 — TOKEN LEDGER (Telemetry)**:
1.  Refine `TokenLedger` domain entity (already exists, but check usage).
2.  Ensure all LLM calls correctly report usage.
3.  Add cost estimation logic (USD) based on provider pricing.
4.  Visualizing detailed telemetry in Runner.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Questionnaire**: 1 call per vacancy (if questionnaire detected).
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
