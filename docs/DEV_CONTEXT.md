
# Developer Context (Save Game)

**Last Updated**: Step 125 (Documentation Sync)
**Role**: Senior Agent Architect
**Status**: Release Candidate 1.5 (Documentation & Stability)

## 1. System Overview
**AgentSeeker** (Project "Кузница Кадров") is an autonomous job search agent with a high-fidelity "Industrial Cyberpunk" interface. It runs in a hybrid mode:
*   **Web Mode**: Fully simulated (Mock) for UI/UX development.
*   **Electron Mode**: Capable of driving a real `Playwright` browser instance via IPC.

## 2. Recent Critical Fixes (v1.4 -> v1.5)
*   **Orb Visibility**: Fixed the issue where the status Orb (Valera) would disappear or misalign after the "Wake Up" sequence in `AgentStatusScreen`.
*   **Pipeline Stall**: Fixed a logic bug where `activeProfileSnapshot` was missing from `AgentState` after rehydration.
*   **Resume Selection**: Implemented `targetResumeTitle` config and `selectOption` port method.
*   **Universal Cover Letter**: Added reset mechanism (`clearUniversalLetter`).

## 3. Architecture & Adapters

### Factory Pattern (`App.tsx`)
The app dynamically selects adapters based on `config` and `runtimeCaps`:
*   **ElectronIPCAdapter**: Priority if `window.electronAPI` is present.
*   **MockBrowserAdapter**: Default fallback or explicit config override.
*   **McpBrowserAdapter**: Experimental support for Model Context Protocol.

### Core Logic (`AgentUseCase`)
*   **State Machine**: Strictly typed in `types.ts` (`AgentStatus`).
*   **Batching**: Processing happens in batches of 15-50 items to support the "Visual Scanner" effect (`BrowserViewport.tsx`).
*   **Context Governance**: `monitorContextHealth` checks JSON size and triggers `compactSession` if limits are exceeded.

## 4. UI Components & Aesthetics
*   **Steampunk Tablet**: Vertical layout with leather/bronze textures.
*   **Inputs**: Custom "Slot" styling for Resume Title, Salary, etc.
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
