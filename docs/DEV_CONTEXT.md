# Developer Context (Save Game)

**Last Updated**: Phase E1.3 Verified (with UI/Logic Patches for P1.1 - P1.11)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Где мы сейчас?
Мы находимся в **PHASE E1.3: DRAFT APPLICATION FILL (NO SUBMIT)**.
Параллельно закрыты критические пробелы в UI и логике (Patches E1.2-P1.x).

### Что сделано:
1.  **Drafting**: Агент научился открывать форму отклика, находить поле сопроводительного письма и заполнять его текстом.
2.  **Configuration**: В UI (Settings) добавлено поле для редактирования шаблона сопроводительного письма.
3.  **Safety**: Реализован механизм "Read-Back" — проверка, что текст реально попал в поле ввода.
4.  **UI Fixes (Patches)**:
    *   Все "тупиковые" состояния (`WAITING_FOR_...`) теперь имеют кнопки управления в `AgentStatusScreen`.
    *   В `WAITING_FOR_SEARCH_PREFS` реализована полноценная форма настройки фильтров.
5.  **Logic Fixes (Patch P1.6)**:
    *   `AgentUseCase.fillApplyFormDraft` теперь подключен к конфигу. Если пользователь задал шаблон сопроводительного письма в Settings, агент использует его вместо заглушки.
6.  **Reliability (Patch P1.7)**:
    *   `AgentPresenter` восстанавливает конфиг (`rehydration`) при старте приложения. Это позволяет продолжать работу после F5 без потери контекста (targetSite, template).
7.  **Priority Logic (Patch P1.8)**:
    *   `AgentUseCase.fillApplyFormDraft` теперь проверяет наличие `generatedCoverLetter` в очереди. Если оно есть, оно имеет приоритет над глобальным шаблоном.
8.  **Mock Fidelity (Patch P1.9)**:
    *   `MockBrowserAdapter` отвязан от реальных селекторов hh.ru. Теперь он использует сценарное состояние (`isApplyModalOpen`) и абстрактные идентификаторы (`mock://apply-form/submit`).
9.  **E1.4 Readiness (Patch P1.11)**:
    *   **Mock Submit**: `MockBrowserAdapter` при клике на submit теперь закрывает модалку и переводит состояние страницы в "Success", инжектируя текст успеха в `getPageTextMinimal`.
    *   **Queue Status**: При обработке элемента очереди (`probeNextApplyEntrypoint`) его статус меняется с `PENDING` на `IN_PROGRESS` (визуализируется в UI).
    *   **Success Hints**: В `ApplyFormProbeV1` добавлены текстовые маркеры (например, "Отклик отправлен") для будущей проверки успеха без привязки к селекторам.

### Текущее техническое состояние:
*   State Machine теперь полностью проходима в ручном режиме от старта до драфта отклика.
*   Данные конфига (Settings) корректно влияют на поведение агента (Drafting).
*   В стейте доступен `activeApplyDraft`.
*   Активный элемент очереди имеет статус `IN_PROGRESS`.

### Следующий шаг (IMMEDIATE NEXT):
**PHASE E1.4 — SUBMIT APPLICATION & VERIFY**:
1.  Выполнить клик по кнопке Submit (используя `submitHint` из `ApplyFormProbeV1`).
2.  Ожидать (wait loop) появления подтверждения успеха (используя `successTextHints`).
3.  Обновить статус элемента в `ApplyQueueV1` (`APPLIED` или `FAILED`).
4.  Зафиксировать результат отклика.
5.  Вернуться к очереди (цикл).

## Правила разработки (Strict)
См. `docs/PROJECT_DOCUMENTATION.md`

## Token Policy (D2)
*   **Input**: ~300-500 токенов на вакансию (Clean Text).
*   **Batch**: 15 вакансий.
*   **Constraint**: Не скармливать полный HTML. Только JSON из D1.