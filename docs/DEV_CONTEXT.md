# Developer Context (Save Game)

**Last Updated**: Phase A2.1 Execution
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE A2.1: Verify Filters Applied**.

### Что сделано:
1.  **Verification Logic**: Агент читает состояние DOM после применения фильтров.
2.  **Reporting**: UI показывает таблицу (Expected vs Actual) и статус (MATCH/MISMATCH).
3.  **Persistence**: Отчет сохраняется в LocalStorage.

### Текущее техническое состояние:
*   `FiltersAppliedVerificationV1` создается после нажатия "VERIFY FILTERS".
*   `AgentStatus` остается `SEARCH_READY`, но в стейте появляется `activeVerification`.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE B1 — COLLECT VACANCY CARDS**:
1.  Начать сбор карточек вакансий со страницы результатов.
2.  Извлекать базовые данные: Title, Company, Salary, Link.
3.  Сохранять в `VacancyListSnapshotV1`.

## Известные ограничения (Stub/Mock)
*   **Browser**: `MockBrowserAdapter` использует `formState` для симуляции памяти страницы.
*   **Verification**: Сейчас только `CONTROL_VALUE`. В будущем можно добавить проверку URL параметров.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
