# Developer Context (Save Game)

**Last Updated**: Phase C1 Execution
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE C1: Script Prefilter**.

### Что сделано:
1.  **Deduplication** (Phase B2): Вакансии дедуплицированы и выбраны по городу.
2.  **Script Filtering** (Phase C1): Применены жесткие фильтры (Salary, WorkMode) и скоринг заголовков.
3.  **Artifact**: Результат сохранен как `PreFilterResultBatchV1`.
4.  **UI**: Отображает результаты фильтрации (Candidates, Deferred, Rejected).

### Текущее техническое состояние:
*   `AgentStatus` переходит в `PREFILTER_DONE`.
*   В стейте доступен `activePrefilterBatch`.
*   UI показывает карточки с цветовой кодировкой решений (Emerald for Read, Blue for Defer, Red for Reject).

### Следующий шаг (IMMEDIATE NEXT):
**PHASE C2 — LLM BATCH SCREENING**:
1.  Взять `READ_CANDIDATE` и `DEFER` карточки из `activePrefilterBatch`.
2.  Сформировать батч-промпт для LLM (10-15 шт).
3.  LLM должна оценить релевантность на основе Title + Company + Snippets (если есть).
4.  Получить вердикт: `PROCEED` (открыть) или `IGNORE`.

## Известные ограничения (Stub/Mock)
*   **Browser**: `scanVacancyCards` возвращает моковые данные.
*   **Seen Index**: Хранится в LocalStorage.
*   **Scoring**: Title Scoring очень простой (fuzzy token overlap), в будущем можно улучшить.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
