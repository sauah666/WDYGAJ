# Developer Context (Save Game)

**Last Updated**: Phase E1.3 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE E1.3: DRAFT APPLICATION FILL (NO SUBMIT)**.

### Что сделано:
1.  **Drafting**: Агент научился открывать форму отклика, находить поле сопроводительного письма и заполнять его текстом (заглушка).
2.  **Safety**: Реализован механизм "Read-Back" — проверка, что текст реально попал в поле ввода.
3.  **Artifact**: `ApplyDraftSnapshotV1` сохраняется. Содержит хеш текста и статус заполнения.
4.  **No Submit**: Кнопка отправки найдена, но намеренно не нажимается.

### Текущее техническое состояние:
*   `AgentStatus` переходит в `APPLY_DRAFT_FILLED`.
*   В стейте доступен `activeApplyDraft`.
*   Очередь (`activeApplyQueue`) не двигается (статус `PENDING`).

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1.4 — SUBMIT APPLICATION & VERIFY**:
1.  Выполнить клик по кнопке Submit (используя `submitHint` из `ApplyFormProbeV1`).
2.  Ожидать появления подтверждения (UI change / modal close / success message).
3.  Обновить статус элемента в `ApplyQueueV1` (`APPLIED` или `FAILED`).
4.  Зафиксировать результат отклика.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.