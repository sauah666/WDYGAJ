
# Developer Context (Save Game)

**Last Updated**: Step 51 Completed (Final Audit & Fixes)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE H (Polish & UX)** и провели **финальный аудит** (Step 51).
Проект находится в состоянии **Release Candidate 1.0**.

### Последние Изменения (Step 51):
1.  **UX Repair**: Исправлена навигация в `ModeSelectionScreen`. Добавлена кнопка "Сменить Платформу", открывающая доступ к экранам `SiteSelection` и `JobPreferences`. Теперь пользователю доступны два сценария: "Quick Start" и "Advanced Setup".
2.  **Doc Synchronization**: 
    *   Обновлен `ARCHITECTURE.md` (добавлены пропущенные статусы и сущности).
    *   Обновлен `DESIGN_AND_UX.md` (актуализированы пользовательские сценарии).

### Текущее Техническое Состояние:
*   **Limits**: Soft = 30k, Hard = 36k tokens (Governance active).
*   **Pipeline**: Full Loop (Profile -> Search -> Screen -> Apply -> Rotate).
*   **Adapters**:
    *   Browser: Mock, Remote, Playwright.
    *   LLM: Mock, Gemini, OpenAI, DeepSeek, Local.

### Известные Ограничения:
*   `RemoteBrowserAdapter` требует запущенного Node.js сервера (код адаптера есть, серверной части в этом скелете нет).
*   `GeminiLLMAdapter` и другие Cloud LLM требуют реальный API Key.

### Следующий шаг:
Проект готов к передаче (Handover). 
Для реального использования необходимо развернуть серверную часть (Node Runner) или использовать Playwright в локальной Node-среде.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
