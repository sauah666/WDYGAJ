
# Project Documentation

## Phases & Progress

### Phase A: Foundation (DONE)
- [x] State Management (Redux-like immutable state).
- [x] DI System (Ports & Adapters).
- [x] Basic UI Shell.

### Phase B: Browser Interface (DONE)
- [x] Browser Port Definition.
- [x] Mock Adapter Implementation.
- [x] Vacancy Extraction Logic.

### Phase C: Intelligence (DONE)
- [x] LLM Port Definition.
- [x] Mock LLM Adapter.
- [x] Targeting Spec Generation.
- [x] Vacancy Screening Logic.

### Phase D: Automation Pipeline (DONE)
- [x] Search Page Navigation.
- [x] DOM Analysis & Filter Application.
- [x] Vacancy Collection Batching.
- [x] Apply Queue & Execution.

### Phase E: Application Execution (DONE)
- [x] Apply Entrypoint Probing.
- [x] Form Filling (Drafts).
- [x] Questionnaire Handling.
- [x] Submit & Receipt.

### Phase F: Resilience & Ops (DONE)
- [x] DOM Drift Detection.
- [x] Site Selection Logic.
- [x] Retry Policies.

### Phase G: Governance & Limits (DONE)
- [x] G1: LLM Configuration & Safety.
- [x] G2: Token Ledger & Telemetry.
- [x] G3: Context Pruning & Compaction.
- [x] G3.0.1: Fix Pack (Runtime Safety).

### Phase H: Polish & UX (DONE)
- [x] H1: Design System Update (Industrial/Cyberpunk).
- [x] H2: User Feedback (Joke Service, Logs).
- [x] H3: Advanced Flow Control (Pause, Stop, Amnesia).
- [x] H4: Documentation Audit.

## Runtime Governance
- **Adapter Safety**: Browser bundles use Mock/Remote adapters. Playwright is Node-only.
- **Env Detection**: `RuntimeCapabilities` logic automatically detects Browser vs Node Runner environment.

## Batch Enforcement Policy
- Strict 10-15 item window for LLM batches.
- Execution blocked if batch size < 10, unless `endOfResults` is flagged.
