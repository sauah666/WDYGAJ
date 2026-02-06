
# Design & User Experience Guide

## Design Philosophy: "Industrial Cyberpunk"

The interface of **AgentSeeker** (aka "Кузница Кадров") is designed not as a generic SaaS application, but as a specialized, tactical tool for an operator. It draws inspiration from:
*   Old Operating Systems (retro-futurism).
*   Industrial Machinery (gauges, bolts, heavy switches).
*   Noir & Cyberpunk aesthetics (Shadows, Neon on Rust, CRT effects).
*   **The Videophone**: The main entry point resembles a physical communication device from an alternate timeline.

### Color Palette
*   **Backgrounds**: `#0a0503` (Deep Void), `#140c08` (Dark Iron), `#2a2420` (Leather/Rust).
*   **Accents**: `#d97706` (Amber/Signal Orange), `#b45309` (Bronze).
*   **Text**: `#e7e5e4` (Old Paper), `#78716c` (Faded Ink).
*   **Status**: `#22c55e` (Terminal Green), `#ef4444` (Crisis Red).

### Typography
*   **Headings**: `Inter` (Sans-serif) - Strict, legible, functional.
*   **Data/Logs**: `JetBrains Mono` - Terminal output, raw data.
*   **Flavor**: Occasional `Serif` accents for "Legacy" feel.

---

## Key UI Components

### 1. The Videophone (Mode Selection)
*   **Concept**: A heavy, physical chassis housing the AI Agent.
*   **Visuals**: 
    *   **Chassis**: Dark leather texture, reinforced borders, industrial screws.
    *   **Speaker Grille**: Top section suggesting audio output capability.
    *   **Dashboard**: A control panel with knobs (simulated inputs) and switches.
*   **Inputs**: Consolidated "Quick Start" controls for Salary, Location, Work Mode, and Cover Letter directly on the device.

### 2. The Orb ("Valera")
*   **Role**: The personification of the Agent.
*   **Behavior**:
    *   **Idle**: Pulses gently inside the Videophone screen.
    *   **Active (Call)**: Transitions (relocates) to the top-left corner (Picture-in-Picture style) to oversee the browser work.
    *   **Relocated**: Transitions smoothly between "Intro Mode" (large) and "Dashboard Mode" (small).
*   **UX Note**: Users should feel like they are issuing commands to a distinct entity, not just clicking buttons.

### 3. The Browser Viewport
*   **Visuals**: Styled like an old OS window (`Win95` meets `Fallout`).
*   **Modes**:
    *   **Standby**: CRT noise and "WAITING FOR SIGNAL" pulse when the agent is IDLE.
    *   **Mock/Remote**: Displays the simulated or actual web content.
    *   **Scanner/Terminal**: A special visual mode during `VACANCIES_CAPTURED` status. It renders the batch of 50 found vacancies as a scrolling list with a "laser scan" effect, showing real-time decisions (Green/Red indicators) as the agent processes them.

### 4. The Log/Message Module
*   **Visuals**: Typewriter effect (`typedMessage`) on a cardboard-textured panel.
*   **Content**: Dark humor provided by `JokeService`. The agent complains about salary, location, and the futility of existence, adding personality to boring waiting times.

### 5. Atmospherics (Three.js)
*   **Component**: `SteamEngineBackground` in `Layout.tsx`.
*   **Effect**: A 3D wireframe steam engine rotates slowly in the background, overlaid with fog and ambient lighting.
*   **Interaction**: Reacts subtly to mouse movement/window resize.
*   **Tech**: Renders to a dedicated canvas layer behind the main UI, ensuring the "industrial" feel permeates every screen.

---

## User Flows

### Flow A: Quick Start (Videophone)
1.  **Launch**: User opens the app. The "Videophone" is presented.
2.  **Parameters**: User adjusts the "Control Panel" directly on the device:
    *   **Salary**: Numeric input with joke feedback.
    *   **Location**: Dropdown selector.
    *   **Mode**: Toggles for Remote/Hybrid/Office.
    *   **Details**: Expandable section for Cover Letter.
3.  **Call**: User presses the large **"СВЯЗЬ"** (Call) button or **"Начать Поиск"**.
    *   *Result*: "Valera" transitions to the corner, the Browser Viewport opens, and the agent begins the `hh.ru` loop.

### Flow B: Advanced Setup
1.  **Access**: User clicks the **Sliders Icon** in the Videophone header.
2.  **Job Preferences Screen**: A dedicated full-screen configuration view for deeper settings (if needed beyond the main dashboard).
3.  **Site Selection**: Accessible via the **Globe Icon** (currently locked/disabled for single-site mode).

### Flow C: The Autonomous Loop
1.  **Login**: If credentials missing, Agent pauses. User enters them in the simulated browser.
2.  **Profiling**: Agent scans user profile to build `TargetingSpec`.
3.  **Search**: Agent navigates, filters, and scrapes vacancies (Batch of 50).
4.  **Scanning**: The list auto-scrolls, visually indicating "Processing".
5.  **Screening**: De-duplication -> Prefilter -> LLM Screen -> Extraction -> Evaluation.
6.  **Apply**: Agent fills form, checks for questionnaires, submits.
7.  **Rotation**: If batch finished, switches to next Role Keyword.

### Flow D: Post-Run & Amnesia
1.  **Stop**: User interrupts the session via the "Stop" button in `AgentStatusScreen`.
2.  **Report**: Summary Overlay shows applied/skipped stats.
3.  **Archive**: User can view history via the **Archive** button on the Videophone.
4.  **Amnesia**: User clicks **Brain Icon** (in Agent Runner) or **Trash Icon** (in Archive) to wipe session memory (seen vacancies + history) to start fresh.

---

## Future UX Considerations for Agents

*   **Blind Spots**: Currently, the "Retry" logic for failed applications is basic. Future agents should implement a "Draft Recovery" mode.
*   **Expansion**: The `SiteRegistry` is designed for `LinkedIn`, but UI selectors for it are disabled.
*   **Accessibility**: The high-contrast dark mode is good, but screen reader support on the custom "Browser Viewport" needs verification.
