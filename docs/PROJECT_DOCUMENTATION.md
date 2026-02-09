
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

### Phase E: Application Execution (PARTIAL)
- [x] Apply Entrypoint Probing.
- [x] Form Filling (Drafts).
- [x] Questionnaire Handling.
- [x] Submit & Receipt.
- *Note*: Fully implemented for `MockBrowserAdapter`. For `ElectronIPCAdapter` (Real Mode), the Apply logic currently contains stubs (`scanApplyEntrypoints` returns empty) and requires further implementation in `main.js`.

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

### Phase K: Stability & Logic Hardening (IN PROGRESS)
- [~] K1: Resume Selection Logic (Detection Implemented, UI/Selection Pending).
- [x] K2: Universal Cover Letter Reset.
- [x] K3: Pipeline Continuity Fixes (Hydration).
- [x] K4: UI Visibility Fixes (Orb Race Condition).
- [x] K5: JSON Schema Hardening (Gemini Fix).
- [x] K6: Cycle Limit Slider & Settings Refinement.

### Phase L: Documentation & Handover (DONE)
- [x] L1: Design Decision Log (Accepted/Rejected patterns).
- [x] L2: User Preference Mapping.
- [x] L3: Skill/Invariant Updates (Diegetic UI).

## Runtime Governance
- **Primary Desktop Adapter**: `ElectronIPCAdapter` (prioritized for real browsing).
- **Web Simulation**: `MockBrowserAdapter` (default for dev/demo).
- **Legacy/Experimental**: `McpBrowserAdapter` (via Protocol) and `RemoteBrowserAdapter` (Deprecated).
- **Native Support**: Electron runtime detected via `window.electronAPI`.

## Batch Enforcement Policy
- **Strict 15 item window** for Vacancy Batches.
- *Correction (Step 128)*: While the UI design supports a visual "matrix" of 50 items, the Core Logic enforces a limit of 15 (`DEFAULT_PRUNING_POLICY`) to prevent LLM context overflow and network timeouts.

## Current Status
**Release Candidate 1.6 (UI Refinement & Logic Hardening)**
- **Architecture**: Hybrid (Web/Electron/MCP).
- **UX**: Fully realized Industrial Cyberpunk aesthetic with refined limit controls.
- **Logic**: Hardened against LLM hallucinations and runtime crashes.
- **Documentation**: Fully synchronized with codebase (Step 128).
