
# Developer Context (Save Game)

**Last Updated**: Phase E1.4 Verified
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы завершили **PHASE E1.4: SUBMIT APPLICATION & VERIFY**.
Агент умеет проходить полный цикл отклика для **одной** вакансии в ручном режиме: открытие, драфт, отправка, подтверждение.

### Что сделано:
1.  **Submission**: Реализован метод `submitApplication` с однократным кликом по кнопке.
2.  **Verification**: Внедрен поллинг (polling) текстовых маркеров успеха (`successTextHints`) для подтверждения отправки.
3.  **Receipts**: Создается артефакт `ApplySubmitReceiptV1` с доказательствами успеха или причиной провала.
4.  **Queue Management**: Статус элемента очереди корректно переходит `PENDING` -> `IN_PROGRESS` -> `APPLIED` (или `FAILED`).
5.  **Error Handling**: Обработаны сценарии отсутствия кнопки Submit или таймаута подтверждения — сессия не падает, элемент помечается как failed.

### Текущее техническое состояние:
*   State Machine поддерживает статусы `SUBMITTING_APPLICATION`, `APPLICATION_SUBMITTED`, `APPLICATION_FAILED`.
*   В `AgentStatusScreen` отображается чек (Receipt) с результатом последнего отклика.
*   Кнопка "PROBE APPLY ENTRYPOINT" доступна после завершения (успешного или нет) предыдущего цикла, что позволяет вручную запустить следующий элемент.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1.5 — APPLY QUEUE AUTOMATION (LOOP)**:
1.  Реализовать автоматический цикл обработки всей очереди (`ApplyQueueV1`).
2.  Агент должен сам переходить к следующему элементу после завершения текущего (`APPLIED`/`FAILED`).
3.  Добавить задержки (throttling) между откликами.
4.  Остановка при пустой очереди или критических ошибках.

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.
