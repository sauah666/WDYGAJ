# 📘 PROJECT DOCUMENTATION — v1.23

**Проект:** Agent-based Job Search Automation  
**Аудитория:** LLM-агент-разработчик (Gemini / GPT / Claude)  
**Статус:** Активная разработка  
**Поддерживаемый режим:** slow-iteration, 1 step = 1 prompt  

---

## CANONICAL MASTER PLAN v1.0

MASTER PLAN v1.0 — JobSearch Agent (Mode 1: HH.ru, затем мультисайт)

0) Инварианты проекта
0.1 Цель продукта (конечный результат)
Агент с режимами. Режим 1: поиск работы на сайте (тестовый: hh.ru) с UI-выбором сайта, после ручного логина — полная автоматизация:
- профиль читается и запоминается один раз (с reset),
- LLM один раз формирует таргетинг (RU/EN титулы, уровни, типы ролей, веса матчей),
- агент снимает DOM поиска, LLM один раз строит семантику фильтров,
- агент один раз спрашивает пользователя уточнения и сам заполняет расширенный поиск,
- вакансии собираются батчами 10–15 и оцениваются LLM батчами,
- текст вакансий читается частично: только условия/требования/формат работы,
- при прохождении фильтров агент сам откликается, вставляя сопроводительное письмо (cover Letter),
- если анкеты/вопросы — DOM-скан → LLM генерит ответы строго по профилю → автозаполнение → отправка,
- ретраи 3×, иначе скрыть вакансию,
- память: сайты, DOM-снимки, обработанные вакансии, dedup по городам (выбираем город пользователя),
- конфиг LLM: cloud API / local LLM, ключи в env, хранение выбора, reset,
- лог после сессии: input tokens, cache hit/miss, output tokens, агрессивный pruning/compaction, адаптивное окно контекста.

0.2 Процессные правила (без них проект развалится после reset)
- 1 этап = 1 задача = EXECUTE + VERIFY
- После PASS: обновить документацию (иначе PASS считается невалидным)
- Иммутабельность: ProfileSnapshot, TargetingSpec, SearchUISpec, SearchApplyPlan
- ResetSession ≠ ResetProfile ≠ ResetPrefs ≠ ResetLLMConfig
- LLM — редкий эксперт: никаких запросов “по одной вакансии”
- Батчи: 10–15 элементов (карточки / извлечённые фрагменты)

1) Зафиксированная точка “что уже сделано” (DONE)
Ниже — строго факт, без “планируем”.
✅ Done-1: Skeleton (Clean Architecture)
Слои: Domain / UseCases / Ports / Adapters / Frameworks.
Порты: BrowserPort, StoragePort, UIPort, LLMProviderPort.
✅ Done-2: Human Login Gate + Session Persist
- Ручной логин пользователя
- Состояния сессии
- Восстановление после перезапуска
- ResetSession
✅ Done-3: CaptureProfileOnce
- ProfileSnapshot: нормализация текста → hash
- “Читаем профиль один раз” + ResetProfile
✅ Done-4: DeriveTargetingFromProfile (1× LLM)
- Строгие LLM-контракты
- Единственный вызов LLM → TargetingSpec (иммутабельный)
- Исправлен баг: при ResetSession не вызывать LLM повторно, если TargetingSpec уже сохранён
✅ Done-5: Search UI Discovery & Configuration (без поиска вакансий)
- 5.2.1 AutoNavigateToSearch — после логина агент сам идёт к поиску
- 5.2.2 SearchDOMSnapshotV1 — снятие DOM-структуры формы поиска
- 5.2.3 (1× LLM) DOM → SearchUISpecV1 (семантика фильтров)
- 5.3 AskUserExtraFiltersOnce — вопросы один раз → UserSearchPrefs
- 5.4 BuildApplySearchPlan — план применения фильтров как данные
✅ Done-A1.1: ExecuteApplyPlan Step-by-Step
- Ручное выполнение шагов плана
- AppliedFiltersSnapshotV1 для трекинга
✅ Done-A1.2: ExecuteApplyPlan Auto-Cycle
- Автоматический цикл выполнения плана
- Retry logic
- Overall Status
✅ Done-A2.1: VerifyFiltersApplied
- Проверка, что фильтры реально применены (читаем DOM)
- FiltersAppliedVerificationV1 (match/mismatch)
✅ Done-B1: CollectVacancyCardsBatch
- Собрать 10–15 карточек: title, company, city, work_mode, salary, url
- Сохранить батч VacancyCardBatchV1
✅ Done-B2: Dedup & City Preference
- Дедупликация (ExternalId, Hash)
- Выбор карточки в группе по городу (UserPrefs)
- Seen Index (исключение ранее просмотренных)
- DedupedVacancyBatchV1
✅ Done-C1: Script PreFilter (без LLM)
- Salary & WorkMode Gates
- Title Scoring (fuzzy/exact)
- PreFilterResultBatchV1
✅ Done-C2: LLM Batch Screening (10–15 карточек → 1 запрос)
- Выбор лучших кандидатов из C1
- LLM screening на основе листинга (Title, Salary, Company)
- LLMDecisionBatchV1 (READ/DEFER/IGNORE)
- Token Telemetry
✅ Done-D1: OpenVacancy & ExtractRelevantSections (script)
- Только условия/требования/обязанности/ограничения
- Игнорирование "воды" (О компании)
✅ Done-D2: LLM Batch Evaluation
- LLMVacancyEvalBatchV1 (APPLY/SKIP/NEEDS_HUMAN)
✅ Done-D2.2: Build Apply Queue
- ApplyQueueV1 (Только APPLY)
✅ Done-E1.1: Probe Apply Entrypoint (No Click)
- Открытие страницы вакансии из очереди
- Поиск кнопок "Откликнуться" (scanApplyEntrypoints)
- Формирование ApplyEntrypointProbeV1 (transient)
✅ Done-E1.2: Click Apply & Scan Form (No Submit)
- Клик по найденному контролу
- Определение типа формы (Modal/Inline)
- Детекция полей: Cover Letter, Resume Select, Submit
- Формирование ApplyFormProbeV1
✅ Done-E1.2-P1.1: UI Settings - Cover Letter Template (Editable)
- Добавлено поле редактирования шаблона сопроводительного письма в SettingsScreen.
- Значение сохраняется в AgentConfig и используется при заполнении формы.
✅ Done-E1.3: Draft Application Fill (No Submit)
- Открытие формы заново (через entrypoint)
- Заполнение поля Cover Letter (input)
- Verification Read-Back (проверка вставки)
- ApplyDraftSnapshotV1 (blocked_reason / filled boolean)
- Safety: Submit НЕ нажат
✅ Done-E1.2-P1.2: UI Status - Apply Draft Filled Control Deck
- Добавлено UI-состояние для `APPLY_DRAFT_FILLED` с заблокированной кнопкой Submit.
- Пользователь видит, что отправка будет доступна в Phase E1.4.
✅ Done-E1.2-P1.3: UI Control - Waiting For Human (Confirm Login)
- Исправлен Dead End в статусе `WAITING_FOR_HUMAN`.
- Добавлена кнопка "CONFIRM LOGIN SUCCESS".
✅ Done-E1.2-P1.4: UI Control - Waiting For Profile Page (Confirm Profile)
- Исправлен Dead End в статусе `WAITING_FOR_PROFILE_PAGE`.
- Добавлена кнопка "PROFILE PAGE OPENED".
✅ Done-E1.2-P1.5: UI Control - Waiting For Search Prefs (Search Prefs Form)
- Исправлен Dead End в статусе `WAITING_FOR_SEARCH_PREFS`.
- Добавлена динамическая форма (Inputs/Selects/Checkboxes) для настройки фильтров поиска перед стартом.
✅ Done-E1.2-P1.6: Connect Cover Letter Template (Logic)
- UseCase теперь читает `coverLetterTemplate` из конфига и использует его при заполнении драфта.
✅ Done-E1.2-P1.7: Presenter Config Rehydration (Reliability)
- При старте приложения Presenter восстанавливает конфиг из storage.
- F5 не сбрасывает контекст сайта/шаблона, даже если не вызван startLoginSequence.
✅ Done-E1.2-P1.8: Apply Queue Cover Letter Priority
- `generatedCoverLetter` из очереди имеет приоритет над глобальным шаблоном.
- Источник текста (`GENERATED`/`TEMPLATE`/`DEFAULT`) фиксируется в снепшоте драфта.
✅ Done-E1.2-P1.9: Mock Adapter Contract Fidelity
- Из `MockBrowserAdapter` удалены хардкодные селекторы hh.ru.
- Внедрены абстрактные mock-идентификаторы (`mock://...`) и сценарное состояние (`isApplyModalOpen`, `applyFormInputs`).
✅ Done-E1.2-P1.11: E1.4 Readiness Fix Pack
- MockBrowserAdapter симулирует состояние успеха после Submit.
- ApplyQueueItem получает статус IN_PROGRESS при обработке.
- ApplyFormProbeV1 содержит текстовые маркеры успеха (Success Hints) вместо селекторов.
✅ Done-E2: Questionnaire Handling
- WHAT ADDED: `QuestionnaireSnapshotV1`, `QuestionnaireAnswerSetV1`, `BrowserPort` methods (`submitApplyForm`, `detectApplyOutcome`).
- WHY: Обработка динамических анкет (опыт, виза, вопросы работодателя) между Apply и Submit.
- CONSTRAINTS:
  - No hallucination: если факта нет в профиле -> "UNKNOWN" + Risk.
  - 1 LLM call на всю анкету.
  - Reuse answers при повторной попытке.
- KNOWN RISKS: Unsupported controls (file uploads).

2) MASTER PLAN — от “сейчас” до “финиша”
PHASE E — Auto Apply (отклики)
E1. Apply With Cover Letter (script)
- E1.4: Submit & Verify (Click Submit -> Check Confirmation UI)
E3. Retry & Failover
- 3 ретрая, иначе hide vacancy

PHASE F — Memory, Resilience, DOM Drift
F1. DOM Drift Detection (diff snapshots) + обновление mappings
F2. Site Memory (multi-site ready) + UI выбор сайта

PHASE G — LLM Config, Token Telemetry, Compaction
G1. LLM Provider Registry (cloud/local) + env keys + reset
G2. Token Ledger per Session (input/output/cache hit/miss)
G3. Pruning/Compaction + адаптивный контекст + батчинг 10–15

3) Конец проекта (Definition of Done)
Проект “сделан”, когда на hh.ru агент после ручного логина:
- применяет фильтры,
- ищет вакансии,
- отбирает батчами,
- читает фрагменты,
- отправляет отклики,
- заполняет анкеты,
- ведёт память seen/dedup/city,
- не вызывает LLM лишний раз,
- даёт телеметрию токенов.
UI: выбор режима/сайта/настроек и reset’ов.
Документация: позволяет новому агенту продолжить без истории.

4) Текущая точка
Последний завершённый этап: PHASE E2 — QUESTIONNAIRE HANDLING
Текущий этап: PHASE E1.4 — SUBMIT APPLICATION & VERIFY (Re-verify required due to overlaps) + E3