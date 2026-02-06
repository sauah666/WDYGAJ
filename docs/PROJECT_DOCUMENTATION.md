
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
- [x] Vacancy Collection Batching (Updated to 50 items).
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
- [x] H4: Documentation Audit (Complete).
- [x] H5: Videophone Interface & Visual Scanning.

## Runtime Governance
- **Adapter Safety**: Browser bundles use Mock/Remote adapters. Playwright is Node-only.
- **Env Detection**: `RuntimeCapabilities` logic automatically detects Browser vs Node Runner environment.

## Batch Enforcement Policy
- **Strict 50 item window** for Vacancy Batches to support realistic scrolling visualization and LLM context efficiency.
- Execution blocked if batch size < 5 (soft limit), unless `endOfResults` is flagged.

## Current Status
**Release Candidate 1.1**
- Architecture is fully audited.
- UI/UX implements the "Retrofuturistic Videophone" concept.
- Documentation is 100% compliant with the codebase.
