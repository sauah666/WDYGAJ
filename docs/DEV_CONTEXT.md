# Developer Context (Save Game)

**Last Updated**: Phase C2 Execution
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE C2: LLM Batch Screening**.

### Что сделано:
1.  **Deduplication** (Phase B2): Вакансии дедуплицированы.
2.  **Script Filtering** (Phase C1): Отсеяны явные несовпадения.
3.  **LLM Screening** (Phase C2):
    *   Берем лучших из C1 (READ > DEFER).
    *   Отправляем батч (макс 15) в LLM.
    *   LLM возвращает READ/DEFER/IGNORE + confidence + reasons.
    *   Сохраняем `LLMDecisionBatchV1`.

### Текущее техническое состояние:
*   `AgentStatus` переходит в `LLM_SCREENING_DONE`.
*   В стейте доступен `activeLLMBatch`.
*   UI показывает результаты LLM с уверенностью (Purple/Indigo/Gray) и статистикой токенов.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE D1 — OPEN & EXTRACT**:
1.  Взять очередь `READ` из `activeLLMBatch`.
2.  Для каждой вакансии:
    *   Открыть страницу.
    *   **Скриптом** (без LLM) извлечь только релевантный текст (Описание, Требования, Ключевые слова).
    *   Обрезать "воду" (О компании, плюшки).
3.  Сохранить "Pure Content" для D2.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (C2)
*   **Input**: ~150-200 токенов на карточку (Title + Context).
*   **Output**: JSON Structure, ~20 токенов на решение.
*   **Batch**: 15 карточек = ~3000 input tokens / ~300 output tokens.
