# Developer Context (Save Game)

**Last Updated**: Phase E1.2 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE E1.2: CLICK APPLY ENTRYPOINT (READ-ONLY)**.

### Что сделано:
1.  **Queue & Entrypoint**: Очередь построена, кнопка отклика найдена (E1.1).
2.  **Interaction**: Агент выполнил клик по кнопке "Откликнуться".
3.  **Form Analysis**: Агент просканировал открывшуюся форму (Модал/Страница) на наличие:
    *   Поля для сопроводительного письма.
    *   Селектора резюме.
    *   Кнопки отправки.
    *   Признаков анкеты (questionnaire detection).
4.  **Artifact**: `ApplyFormProbeV1` сохранён в state (activeApplyFormProbe).

### Текущее техническое состояние:
*   `AgentStatus` переходит в `APPLY_FORM_OPENED`.
*   В стейте доступен `activeApplyFormProbe`.
*   Поля `detectedFields` показывают, можно ли отправлять сопроводительное письмо.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1.3 — INSERT COVER LETTER (NO SUBMIT)**:
1.  Сгенерировать (или взять заглушку) сопроводительное письмо для текущей вакансии.
    *   *Примечание: Пока можно использовать простой шаблон, чтобы не тратить токены, или простой LLM вызов.*
2.  Вставить текст в найденное поле `coverLetterTextarea` (через BrowserPort).
3.  Проверить, что значение в поле изменилось (Read back verification).
4.  Убедиться, что кнопка Submit активна (или хотя бы присутствует).
5.  **НЕ НАЖИМАТЬ SUBMIT**.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.