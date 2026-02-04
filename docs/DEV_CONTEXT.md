# Developer Context (Save Game)

**Last Updated**: Phase D1 Execution
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE D1: OPEN & EXTRACT**.

### Что сделано:
1.  **Deduplication** (Phase B2): Вакансии дедуплицированы.
2.  **Script Filtering** (Phase C1): Отсеяны явные несовпадения.
3.  **LLM Screening** (Phase C2): Отобраны кандидаты по заголовкам.
4.  **Extraction** (Phase D1): 
    *   Агент открыл страницы из очереди `read_queue`.
    *   Извлек структурированные данные (Requirements, Responsibilities, Conditions).
    *   Сохранил `VacancyExtractionBatchV1`.

### Текущее техническое состояние:
*   `AgentStatus` переходит в `VACANCIES_EXTRACTED`.
*   В стейте доступен `activeExtractionBatch`.
*   UI показывает карточки с количеством извлеченных пунктов.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE D2 — LLM BATCH EVALUATION**:
1.  Взять `activeExtractionBatch`.
2.  Сформировать промпт для LLM, содержащий ТОЛЬКО извлеченные секции (без воды).
3.  LLM должен принять финальное решение: `APPLY` или `REJECT`.
4.  Если `APPLY`, сгенерировать короткую причину для Cover Letter.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
