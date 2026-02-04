# 📘 PROJECT DOCUMENTATION — v1.12

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
- при прохождении фильтров агент сам откликается, вставляя сопроводительное,
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

2) MASTER PLAN — от “сейчас” до “финиша”
PHASE D — Deep Read (извлечь только важные куски текста)
D1. OpenVacancy & ExtractRelevantSections (script) (DONE)
- Только условия/требования/обязанности/ограничения
- Игнорирование "воды" (О компании)
D2. LLM Batch Evaluation (10–15 извлечений → 1 запрос)
- apply_yes/apply_no + red flags

PHASE E — Auto Apply (отклики)
E1. Apply With Cover Letter (script)
- Нажать “Откликнуться”, вставить сопроводительное, отправить
E2. Questionnaire Handling (DOM → LLM → Fill)
- Ответы строго по ProfileSnapshot, без выдумок
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
Последний завершённый этап: PHASE D1 — OPEN & EXTRACT
Текущий этап: PHASE D2 — LLM BATCH EVALUATION

---

## Progress Update — PHASE D1

### WHAT WAS ADDED
*   **Entity:** `VacancyExtractV1`, `VacancyExtractionBatchV1`.
*   **UseCase:** `runVacancyExtraction` — opens pages from `read_queue` via browser port.
*   **Port:** `extractVacancyPage` in BrowserPort.
*   **UI:** Visualization of extracted details (Requirements, Responsibilities, Conditions counts).

### WHY
We need detailed information (tech stack specifics, exact conditions) to make a final decision, but we cannot feed the entire HTML of 15 pages to an LLM (too expensive/slow). We use a script-based extractor to distill the page down to just the "meat" before the D2 LLM pass.

### RULES
*   **No LLM**: Extraction is pure DOM parsing/regex.
*   **Strict Sectioning**: Discard "About Company" or generic marketing text.
*   **Iterative**: Process the read queue sequentially with delays to be polite to the site.
