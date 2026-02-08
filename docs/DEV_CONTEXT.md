
# Developer Context (Save Game)

**Last Updated**: Step 110 (Final Consolidation)
**Role**: Senior Agent Architect
**Status**: Release Candidate 1.4 (Visual Immersion & Electron Ready)

## 1. System Overview
**AgentSeeker** (Project "Кузница Кадров") is an autonomous job search agent with a high-fidelity "Industrial Cyberpunk" interface. It runs in a hybrid mode:
*   **Web Mode**: Fully simulated (Mock) for UI/UX development.
*   **Electron Mode**: Capable of driving a real `Playwright` browser instance via IPC.

## 2. The Cinematic Interface (Fragile Logic)
The `ModeSelectionScreen.tsx` implements a complex state machine for the "Wake Up" sequence.

### Video Assets (Hardcoded)
*   **INTRO**: `valera_merged.mp4` (The Agent waking up/talking).
*   **LOOP**: `valera_idle_merged.mp4` (The Agent breathing/looking around).
*   **STANDBY**: `please_standby.mp4` (Static noise/CRT effect).
*   **CODE**: `code.mp4` (Matrix-like code rain).

### The Wake-Up Sequence
1.  **State**: User clicks "Call Button" (`handleWakeUp`).
2.  **Action**: 
    *   `videoPhase` sets to `INTRO`.
    *   `introVideoRef` plays (Avatar).
    *   `codeVideoRef` plays (Overlay at bottom).
3.  **Transition**: 
    *   `onTimeUpdate` detects when `introVideo` is > 50%.
    *   `isRelocated` sets to `true`.
    *   Avatar moves to top-left dock.
    *   Main Chassis (`showPanel`) fades in.
    *   Code Rain fades out.
4.  **Loop**: When `introVideo` ends, `videoPhase` sets to `LOOP`.

**Warning**: Do not refactor `handleIntroTimeUpdate` or the video refs without testing the transition timing.

## 3. Architecture & Adapters

### Factory Pattern (`App.tsx`)
The app dynamically selects adapters based on `config` and `runtimeCaps`:
*   **MockBrowserAdapter**: Default. Simulates data.
*   **ElectronIPCAdapter**: Selected if `window.electronAPI` is present.
*   **RemoteBrowserAdapter**: Selected if configured for remote node runner.
*   **McpBrowserAdapter**: Experimental support for Model Context Protocol.

### Core Logic (`AgentUseCase`)
*   **State Machine**: Strictly typed in `types.ts` (`AgentStatus`).
*   **Batching**: Processing happens in batches of 15-50 items to support the "Visual Scanner" effect (`BrowserViewport.tsx`).
*   **Context Governance**: `monitorContextHealth` checks JSON size and triggers `compactSession` if limits are exceeded.

## 4. UI Components & Aesthetics
*   **Steampunk Tablet**: Vertical layout with leather/bronze textures.
*   **Vacuum Tubes**: Orange/Green tubes in footer indicate readiness.
*   **Three.js Background**: `SteamEngineBackground` runs outside React render cycle.
*   **Scanner Mode**: `BrowserViewport` renders a scrolling list with a "laser line" effect when status is `VACANCIES_CAPTURED`.

## 5. Next Steps for Development
1.  **Infrastructure**: The `Electron` main process (`electron/main.js`) is basic. It needs full implementation of all `BrowserPort` methods (currently some are stubs).
2.  **LinkedIn**: The `SiteRegistry` has a placeholder for LinkedIn. The `MockBrowserAdapter` needs a specific mock scenario for it.
3.  **Resume Upload**: The `ApplyFormProbe` logic detects resume selectors, but the UI for selecting a local file to upload is missing.

## 6. Known Issues
*   **Code Rain Accessibility**: The flashing effect might be too intense for some users. Needs a `prefers-reduced-motion` check.
*   **Mobile Layout**: The vertical tablet is optimized for mobile, but the "Scanner" view in `AgentStatusScreen` might need better padding on small screens.
