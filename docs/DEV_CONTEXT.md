
# Developer Context (Save Game)

**Last Updated**: Step 128 (Audit Correction)
**Role**: Senior Agent Architect
**Status**: Release Candidate 1.6 (UI Refinement & Logic Hardening)

## 1. System Overview
**AgentSeeker** (Project "Кузница Кадров") is an autonomous job search agent with a high-fidelity "Industrial Cyberpunk" interface. It runs in a hybrid mode:
*   **Web Mode**: Fully simulated (Mock) for UI/UX development.
*   **Electron Mode**: Capable of driving a real `Playwright` browser instance via IPC.

## 2. Recent Critical Fixes & Features (v1.5 -> v1.6)
*   **JSON Schema Hardening**: `GeminiLLMAdapter` now injects a strict JSON schema and performs runtime validation to ensure `targetRoles.ruTitles` is always an array, preventing "not iterable" crashes.
*   **Cycle Limit Control**: Added a generic "Range Slider" to `ModeSelectionScreen` allowing 1-100 applications per run, or "Infinity" (0). Includes visual warning for infinite mode.
*   **Settings UX**: Renamed browser modes to "Симуляция" (Simulation) vs "Real (Electron)" to clarify intent. Added a "Reset Key" button for easier API key management.
*   **Orb Visibility**: Fixed the issue where the status Orb (Valera) would disappear or misalign after the "Wake Up" sequence in `AgentStatusScreen`.
*   **Pipeline Stall**: Fixed a logic bug where `activeProfileSnapshot` was missing from `AgentState` after rehydration.

## 3. Architecture & Adapters

### Factory Pattern (`App.tsx`)
The app dynamically selects adapters based on `config` and `runtimeCaps`:
*   **ElectronIPCAdapter**: Priority if `window.electronAPI` is present.
*   **MockBrowserAdapter**: Default fallback or explicit config override.
*   **McpBrowserAdapter**: Experimental support for Model Context Protocol.

### Core Logic (`AgentUseCase`)
*   **State Machine**: Strictly typed in `types.ts` (`AgentStatus`).
*   **Batching**: Processing happens in **safe batches of 15 items** (Code Limit) to ensure LLM stability, although the UI is capable of displaying larger lists.
*   **Context Governance**: `monitorContextHealth` checks JSON size and triggers `compactSession` if limits are exceeded.
*   **Execution Limit**: `submitApplyForm` checks `runAppliesCount` against `maxApplications`. If reached, transitions to `COMPLETED`.

## 4. UI Components & Aesthetics
*   **Steampunk Tablet**: Vertical layout with leather/bronze textures.
*   **Inputs**: Custom "Slot" styling. Range Slider for limits.
*   **Vacuum Tubes**: Orange/Green tubes in footer indicate readiness.
*   **Three.js Background**: `SteamEngineBackground` runs outside React render cycle.
*   **Scanner Mode**: `BrowserViewport` renders a scrolling list with a "laser line" effect when status is `VACANCIES_CAPTURED`.

## 5. Next Steps for Development
1.  **Infrastructure**: The `Electron` main process (`electron/main.js`) needs robust implementation of `scanApplyEntrypoints` and `fillApplyForm` using specific selectors for `hh.ru`.
2.  **LinkedIn**: The `SiteRegistry` has a placeholder for LinkedIn. The `MockBrowserAdapter` needs a specific mock scenario for it.
3.  **Resume Upload**: The `ApplyFormProbe` logic detects resume selectors, but file upload logic is still pending.

## 6. Known Issues
*   **Code Rain Accessibility**: The flashing effect might be too intense for some users. Needs a `prefers-reduced-motion` check.
*   **Performance**: The `AgentPresenter` triggers React updates frequently during fast logs. Throttling is recommended for production.
*   **Asset Dependency**: Video assets for the Orb (Valera) are hotlinked from an external GitHub repo. If these URLs break, the UI will degrade.
