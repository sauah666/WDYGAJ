
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
- [x] H6: Input Validation & Auto-Cover Letter.
- [x] H7: Steampunk Toggle & Joke Expansion.
- [x] H8: Final Integrity Re-Audit.

### Phase I: Visual Immersion (DONE)
- [x] I1: Vertical "Steampunk Tablet" Layout.
- [x] I2: Diegetic UI Elements (Vacuum Tubes, Analog Gauges, LED Counters).
- [x] I3: Cinematic Transitions ("Code Rain" Intro).
- [x] I4: Dieselpunk Button Styling (Convex Glass & Brass).

### Phase J: Infrastructure (DONE)
- [x] J1: Electron Wrapper & IPC Adapter.
- [x] J2: MCP (Model Context Protocol) Client Adapter.
- [x] J3: Runtime Capability Detection.

### Phase K: Stability & Logic Hardening (DONE)
- [x] K1: Resume Selection Logic.
- [x] K2: Universal Cover Letter Reset.
- [x] K3: Pipeline Continuity Fixes (Hydration).
- [x] K4: UI Visibility Fixes (Orb Race Condition).

### Phase L: Documentation & Handover (DONE)
- [x] L1: Design Decision Log (Accepted/Rejected patterns).
- [x] L2: User Preference Mapping.
- [x] L3: Skill/Invariant Updates (Diegetic UI).

## Runtime Governance
- **Adapter Safety**: Browser bundles use Mock/Remote/MCP adapters.
- **Native Support**: Electron runtime detected via `window.electronAPI`.

## Batch Enforcement Policy
- **Strict 50 item window** for Vacancy Batches to support realistic scrolling visualization and LLM context efficiency.
- Execution blocked if batch size < 5 (soft limit), unless `endOfResults` is flagged.

## Current Status
**Release Candidate 1.5 (Documentation & Stability)**
- **Architecture**: Hybrid (Web/Electron/MCP).
- **UX**: Fully realized Industrial Cyberpunk aesthetic.
- **Logic**: Robust against refresh/restart thanks to hydration fixes.
- **Documentation**: Fully synchronized with codebase (Step 126).
