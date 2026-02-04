# Developer Context (Save Game)

**Last Updated**: Stage 5.2.2 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы закончили **Этап 5.2: DOM Snapshot Capture**.

### Что сделано (Stage 5.2.2):
1.  **SearchDOMSnapshotV1**: Реализована сущность для хранения "сырой" структуры формы поиска.
2.  **BrowserPort**: Добавлен метод `scanPageInteractionElements` (возвращает `RawFormField[]`).
3.  **AgentUseCase**: Реализован метод `scanSearchPageDOM`.
    *   Проверяет наличие снапшота в Storage.
    *   Если нет -> сканирует -> сохраняет -> статус `SEARCH_DOM_READY`.
4.  **UI**: Добавлены кнопки навигации и сканирования, визуализация JSON снапшота.

### Текущее техническое состояние:
*   Агент умеет находить страницу поиска.
*   Агент умеет "видеть" поля ввода (inputs, selects, buttons).
*   Агент **НЕ ПОНИМАЕТ**, что эти поля значат (для него это просто набор тегов и атрибутов).

### Следующий шаг (IMMEDIATE NEXT):
**Этап 5.3 — Search UI Spec (LLM Analysis)**:
1.  Отправить `SearchDOMSnapshot` в LLM.
2.  LLM должна вернуть `SearchUISpec` — семантическую карту (где поле зарплаты, где чекбокс удаленки).
3.  Сохранить `SearchUISpec`.
4.  Статус: `WAITING_FOR_SEARCH_PREFS`.

## Известные ограничения (Stub/Mock)
*   **Browser**: `MockBrowserAdapter` возвращает хардкод полей (эмуляция hh.ru).
*   **LLM**: Пока не реализован метод анализа DOM (нужен новый метод в порту).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`
